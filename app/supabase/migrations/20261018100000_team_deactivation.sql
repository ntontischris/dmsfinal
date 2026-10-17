-- Ομάδα Να (#207, PRD #206, δέσμη Ν1–Ν5): πλήρης απενεργοποίηση με προεπισκόπηση, Γεγονός 58 και για αλλαγή Ρόλων,
-- Επανενεργοποίηση από την πρόσκληση, αποθήκευση Ρόλου σε δύο βήματα.
--
--  • Ν1: οι ανοιχτές αναθέσεις ενός Χρήστη ομάδας ορίζονται ΜΙΑ φορά, στο authz.deactivation_items. Από εκεί διαβάζουν
--    και η προεπισκόπηση (public.team_deactivation_preview) και η ίδια η απενεργοποίηση (trigger στο team_users), άρα η
--    οθόνη δεν λέει ποτέ άλλα από τη βάση. Οι λόγοι «δεν γίνεται» ορίζονται επίσης μία φορά (authz.deactivation_block).
--    Ανοιχτή ανάθεση: Πελάτης μη αρχειοθετημένος, Ευκαιρία ανοιχτή, Παραγωγή ανοιχτή, Εργασία που δεν έγινε και
--    Παραδοτέο ούτε ακυρωμένο ούτε εγκεκριμένο σε ανοιχτή Παραγωγή, θέση σε Συνεργείο Γυρίσματος που δεν έχει γίνει
--    (αναμένει ή προγραμματισμένο, με έναρξη μετά από τώρα). Τα περασμένα Γυρίσματα κρατούν το Συνεργείο τους.
--  • Η θέση που αδειάζει γράφεται στο filming_crew_vacancies (σήμα «άδειασε θέση» στο E3) και φεύγει Γεγονός 60
--    (filming.crew_vacated) προς τον Υπεύθυνο της Παραγωγής. Το σήμα σβήνει όταν μπει νέο μέλος στο Συνεργείο.
--  • Η επανενεργοποίηση δεν επιστρέφει τίποτα: τα triggers τρέχουν μόνο στο ενεργός → απενεργοποιημένος.
--  • Ν2: η αλλαγή Ρόλων γίνεται από το public.team_user_set_roles (ίδιοι κανόνες με τις policies του team_user_roles) και
--    γράφει «team_roles_changed» στο Ίχνος → Γεγονός 58. Το 58 πάει μόνο στους Ιδιοκτήτες· ο ίδιος ο actor αποκλείεται
--    ήδη από το authz.ev_recipients, και το «actor» φεύγει από τους παραλήπτες του.
--  • Ν3: public.invitation_team_email_check: δομημένο αποτέλεσμα για email απενεργοποιημένου Χρήστη ομάδας.
--  • Ν5: public.role_affected_users: έως 10 ονόματα και το υπόλοιπο πλήθος, πριν από την αποθήκευση.

-- ───────────── Σήμα «άδειασε θέση» ─────────────

create table public.filming_crew_vacancies (
  filming_id uuid not null references public.filmings (id),
  user_id uuid not null references public.team_users (user_id),
  vacated_at timestamptz not null default now(),
  primary key (filming_id, user_id)
);

alter table public.filming_crew_vacancies enable row level security;
revoke all on table public.filming_crew_vacancies from anon, authenticated;

-- ───────────── Ο ένας ορισμός των ανοιχτών αναθέσεων ─────────────

-- kind: client, opportunity, production, task, deliverable, crew (id = το Γύρισμα). Σειρά: kind_sort, όνομα.
create function authz.deactivation_items(p_user uuid, p_now timestamptz)
returns table (kind text, kind_sort integer, id uuid, label text, detail text)
language sql stable security definer set search_path = ''
as $$
  select 'client', 1, c.id, c.name, coalesce(c.city, '')
    from public.clients c
   where c.manager_id = p_user and c.archived_at is null
  union all
  select 'opportunity', 2, o.id, o.title, coalesce(c.name, '')
    from public.opportunities o left join public.clients c on c.id = o.client_id
   where o.manager_id = p_user and o.outcome = 'open'
  union all
  select 'production', 3, p.id, p.title, coalesce(c.name, 'Εσωτερική')
    from public.productions p left join public.clients c on c.id = p.client_id
   where p.owner_id = p_user and p.state = 'open'
  union all
  select 'task', 4, t.id, t.title, p.title
    from public.production_tasks t join public.productions p on p.id = t.production_id
   where t.assignee_id = p_user and t.done_at is null and p.state = 'open'
  union all
  select 'deliverable', 5, d.id, d.title, p.title
    from public.deliverables d join public.productions p on p.id = d.production_id
   where d.assignee_id = p_user and d.cancelled_at is null and d.approved_at is null and p.state = 'open'
  union all
  select 'crew', 6, f.id, p.title, to_char(f.starts_at at time zone 'Europe/Athens', 'DD/MM/YYYY HH24:MI')
    from public.filming_crew fc
    join public.filmings f on f.id = fc.filming_id
    join public.productions p on p.id = f.production_id
   where fc.user_id = p_user and f.state in ('pending', 'scheduled') and f.starts_at > p_now;
$$;

-- Γιατί δεν γίνεται η απενεργοποίηση: 'self', 'owner_by_non_owner', 'last_owner' ή null. p_actor null = service role.
create function authz.deactivation_block(p_actor uuid, p_target uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when p_actor is not null and p_actor = p_target then 'self'
    when p_actor is not null and authz.user_is_owner(p_target) and not authz.user_is_owner(p_actor) then 'owner_by_non_owner'
    when authz.user_is_owner(p_target) and not exists (
      select 1
        from public.team_user_roles ur
        join public.roles r on r.id = ur.role_id
        join public.team_users u on u.user_id = ur.user_id
       where r.is_owner and u.is_active and u.user_id <> p_target
    ) then 'last_owner'
  end;
$$;

-- Όπως το 20261007165854, με τους λόγους από το authz.deactivation_block. Ο τελευταίος Ιδιοκτήτης μένει στο
-- authz.guard_last_owner (με το κλείδωμα συναλλαγής του).
create or replace function authz.guard_deactivation() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_block text;
begin
  if old.is_active and not new.is_active then
    v_block := authz.deactivation_block(auth.uid(), old.user_id);
    if v_block = 'self' then
      raise exception 'Δεν απενεργοποιείς τον εαυτό σου' using errcode = 'P0001';
    end if;
    if v_block = 'owner_by_non_owner' then
      raise exception 'Έναν Ιδιοκτήτη τον απενεργοποιεί μόνο Ιδιοκτήτης' using errcode = 'P0001';
    end if;
    new.deactivated_at := now();
  elsif not old.is_active and new.is_active then
    new.deactivated_at := null;
  end if;
  return new;
end;
$$;

-- ───────────── Η απενεργοποίηση επιστρέφει τις αναθέσεις (μία συναλλαγή) ─────────────

-- Αντικαθιστά το authz.release_sales_on_deactivation (20261008120000): ίδιοι Πελάτες, Ευκαιρίες και Αιτήματα πρόσβασης,
-- και επιπλέον Παραγωγές, Εργασίες, Παραδοτέα και θέσεις Συνεργείου, όλα από το authz.deactivation_items.
create function authz.release_on_deactivation() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_items jsonb;
  v_filming uuid;
begin
  select coalesce(jsonb_agg(jsonb_build_object('kind', i.kind, 'id', i.id)), '[]'::jsonb) into v_items
    from authz.deactivation_items(old.user_id, now()) i;
  update public.opportunities set manager_id = null
   where id in (select (x ->> 'id')::uuid from jsonb_array_elements(v_items) x where x ->> 'kind' = 'opportunity');
  update public.clients set manager_id = null
   where id in (select (x ->> 'id')::uuid from jsonb_array_elements(v_items) x where x ->> 'kind' = 'client');
  update public.productions set owner_id = null
   where id in (select (x ->> 'id')::uuid from jsonb_array_elements(v_items) x where x ->> 'kind' = 'production');
  update public.production_tasks set assignee_id = null
   where id in (select (x ->> 'id')::uuid from jsonb_array_elements(v_items) x where x ->> 'kind' = 'task');
  update public.deliverables set assignee_id = null
   where id in (select (x ->> 'id')::uuid from jsonb_array_elements(v_items) x where x ->> 'kind' = 'deliverable');
  for v_filming in
    delete from public.filming_crew fc
     where fc.user_id = old.user_id
       and fc.filming_id in (select (x ->> 'id')::uuid from jsonb_array_elements(v_items) x where x ->> 'kind' = 'crew')
    returning fc.filming_id
  loop
    insert into public.filming_crew_vacancies (filming_id, user_id) values (v_filming, old.user_id)
    on conflict (filming_id, user_id) do update set vacated_at = excluded.vacated_at;
    perform authz.filming_event(v_filming, 'crew_vacated', jsonb_build_object('user_id', old.user_id, 'reason', 'deactivated'));
  end loop;
  update public.access_requests set status = 'cancelled', decided_at = now()
   where requester_id = old.user_id and status = 'pending';
  return null;
end;
$$;

drop trigger team_users_release_sales on public.team_users;
drop function authz.release_sales_on_deactivation();

create trigger team_users_release_assignments after update of is_active on public.team_users
  for each row when (old.is_active and not new.is_active)
  execute function authz.release_on_deactivation();

-- Νέο μέλος στο Συνεργείο: σβήνει ένα σήμα «άδειασε θέση» του Γυρίσματος (πρώτα του ίδιου Χρήστη, μετά το παλαιότερο).
create function authz.fill_crew_vacancy() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.filming_crew_vacancies v
   where (v.filming_id, v.user_id) = (
     select x.filming_id, x.user_id from public.filming_crew_vacancies x
      where x.filming_id = new.filming_id
      order by (x.user_id = new.user_id) desc, x.vacated_at, x.user_id
      limit 1);
  return null;
end;
$$;

create trigger filming_crew_fill_vacancy after insert on public.filming_crew
  for each row execute function authz.fill_crew_vacancy();

-- ───────────── Προεπισκόπηση (Ν1) ─────────────

-- { isActive, block, items: [{ kind, id, label, detail }] }. Ο Χρήστης που δεν υπάρχει: ίδιο σφάλμα με το team_user_set_active.
-- p_now (null = τώρα) υπάρχει για τα τεστ· η απενεργοποίηση χρησιμοποιεί πάντα το τώρα.
create function public.team_deactivation_preview(p_user_id uuid, p_now timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_active boolean;
begin
  perform authz.require('access.team');
  select t.is_active into v_active from public.team_users t where t.user_id = p_user_id;
  if not found then
    raise exception 'Ο Χρήστης ομάδας δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if not v_active then
    return jsonb_build_object('isActive', false, 'block', null, 'items', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'isActive', true,
    'block', authz.deactivation_block(auth.uid(), p_user_id),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('kind', i.kind, 'id', i.id, 'label', i.label, 'detail', i.detail)
                       order by i.kind_sort, lower(i.label), i.detail, i.id)
        from authz.deactivation_items(p_user_id, coalesce(p_now, now())) i), '[]'::jsonb));
end;
$$;

-- ───────────── Αλλαγή Ρόλων Χρήστη ομάδας (Ν2) ─────────────

create function authz.team_role_names(p_user uuid) returns text[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(r.name order by r.name), '{}')
    from public.team_user_roles ur join public.roles r on r.id = ur.role_id
   where ur.user_id = p_user;
$$;

-- Οι κανόνες των policies του team_user_roles (χωρίς κλιμάκωση· τους Ρόλους Ιδιοκτήτη τους αλλάζει μόνο Ιδιοκτήτης),
-- για κάθε Ρόλο που μπαίνει ή φεύγει. Χωρίς αλλαγή, τίποτα (ούτε Γεγονός).
create function public.team_user_set_roles(p_user_id uuid, p_role_ids uuid[]) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_added uuid[];
  v_removed uuid[];
  v_before text[];
begin
  perform authz.require('access.team');
  if p_user_id is null or not exists (select 1 from public.team_users t where t.user_id = p_user_id) then
    raise exception 'Ο Χρήστης ομάδας δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if p_role_ids is null or cardinality(p_role_ids) = 0 then
    raise exception 'Ένας Χρήστης ομάδας θέλει τουλάχιστον έναν Ρόλο' using errcode = 'P0001';
  end if;
  if exists (select 1 from unnest(p_role_ids) x where x is null)
     or (select count(distinct x) from unnest(p_role_ids) x) <> cardinality(p_role_ids) then
    raise exception 'Ο ίδιος Ρόλος μπήκε δύο φορές' using errcode = 'P0001';
  end if;
  if (select count(*) from public.roles r where r.id = any (p_role_ids) and r.kind = 'team') <> cardinality(p_role_ids) then
    raise exception 'Ο Ρόλος δεν υπάρχει ή δεν είναι Ρόλος ομάδας' using errcode = 'P0001';
  end if;
  select array_agg(x) into v_added from unnest(p_role_ids) x
   where not exists (select 1 from public.team_user_roles ur where ur.user_id = p_user_id and ur.role_id = x);
  select array_agg(ur.role_id) into v_removed from public.team_user_roles ur
   where ur.user_id = p_user_id and not (ur.role_id = any (p_role_ids));
  if v_added is null and v_removed is null then
    return;
  end if;
  if (not authz.is_owner() and authz.user_is_owner(p_user_id))
     or exists (select 1 from unnest(coalesce(v_added, '{}') || coalesce(v_removed, '{}')) x where not authz.can_grant_role(x)) then
    raise exception 'Δεν μπορείς να δώσεις ή να αφαιρέσεις έναν από αυτούς τους Ρόλους' using errcode = '42501';
  end if;
  v_before := authz.team_role_names(p_user_id);
  insert into public.team_user_roles (user_id, role_id) select p_user_id, x from unnest(coalesce(v_added, '{}')) x;
  delete from public.team_user_roles ur where ur.user_id = p_user_id and ur.role_id = any (coalesce(v_removed, '{}'));
  perform authz.access_event('team_roles_changed', p_user_id::text,
    jsonb_build_object('before', to_jsonb(v_before), 'after', to_jsonb(authz.team_role_names(p_user_id))));
end;
$$;

-- ───────────── Πρόσκληση: email απενεργοποιημένου Χρήστη ομάδας (Ν3) ─────────────

-- { deactivatedUser: { userId, name } | null }. Με το ίδιο Δικαίωμα με την πρόσκληση και την Επανενεργοποίηση.
create function public.invitation_team_email_check(p_email text) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require('access.team');
  return jsonb_build_object('deactivatedUser', (
    select jsonb_build_object('userId', t.user_id, 'name', t.name)
      from public.team_users t
     where lower(t.email) = lower(trim(coalesce(p_email, ''))) and not t.is_active));
end;
$$;

-- ───────────── Αποθήκευση Ρόλου σε δύο βήματα (Ν5) ─────────────

-- { names: [έως 10], more, total }: οι ενεργοί Χρήστες ομάδας ή οι Χρήστες πελάτη (μη αφαιρεμένοι) που έχουν τον Ρόλο.
-- Μόνο ο Ιδιοκτήτης (μόνο αυτός αλλάζει Ρόλους).
create function public.role_affected_users(p_role_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_total integer;
  v_names jsonb;
begin
  if not authz.is_owner() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_role_id is null or not exists (select 1 from public.roles r where r.id = p_role_id) then
    raise exception 'Ο Ρόλος δεν βρέθηκε' using errcode = 'P0001';
  end if;
  with people as (
    select t.user_id, t.name
      from public.team_user_roles ur join public.team_users t on t.user_id = ur.user_id
     where ur.role_id = p_role_id and t.is_active
    union
    select cu.user_id, min(cu.name)
      from public.client_users cu
     where cu.role_id = p_role_id and cu.removed_at is null
     group by cu.user_id
  )
  select count(*)::integer,
         coalesce((select jsonb_agg(x.name order by lower(x.name), x.user_id)
                     from (select p.* from people p order by lower(p.name), p.user_id limit 10) x), '[]'::jsonb)
    into v_total, v_names
    from people;
  return jsonb_build_object('names', v_names, 'total', v_total, 'more', greatest(v_total - 10, 0));
end;
$$;

-- ───────────── Γεγονότα: 58 και για Ρόλους, 60 για θέση που άδειασε ─────────────

-- Το 58 πάει στους Ιδιοκτήτες, ποτέ σε όποιον έκανε την ενέργεια.
delete from public.automations where event_type = 'team.access_changed' and recipient_relative = 'actor';
update public.event_types set relatives = '{owner}' where code = 'team.access_changed';
update public.automations
   set body_el = 'Ο/Η {by} άλλαξε την πρόσβαση του/της {user}. Ρόλοι: {roles}.',
       body_en = '{by} changed the access of {user}. Roles: {roles}.'
 where event_type = 'team.access_changed' and is_initial
   and body_el = 'Ο/Η {by} προσκάλεσε τον/την {user} με τους Ρόλους {roles}.';

-- Γεγονός 60 (το 59 είναι των συνδρομών, Νγ), αμέσως μετά το 23 «δεν μπορώ» στην ομάδα Β.
update public.event_types set sort = sort + 1
 where sort > (select t.sort from public.event_types t where t.code = 'filming.crew_declined');
insert into public.event_types
  (number, code, grp, kind, label_el, label_en, case_of, variables, relatives, has_visitor, is_cost_only, is_client_facing, is_wired, sort)
select 60, 'filming.crew_vacated', 'Β', 'instant',
       'Άδειασε θέση στο Συνεργείο (απενεργοποίηση μέλους)', 'A crew seat was emptied (member deactivated)',
       'το μέλος στο Γύρισμα', authz.ev_vars('filming', 'filmingDate', 'filmingTime', 'location', 'crew', 'member'),
       '{production_owner}', false, false, false, true, t.sort + 1
  from public.event_types t where t.code = 'filming.crew_declined';

insert into public.automations (event_type, channel, recipient_kind, recipient_relative, body_el, body_en,
                                is_essential, is_enabled, is_initial, sort)
values ('filming.crew_vacated', 'notification', 'relative', 'production_owner',
        'Άδειασε θέση στο Συνεργείο: {filming}. Ο/Η {member} απενεργοποιήθηκε· βρες αντικαταστάτη.',
        'A crew seat is empty: {filming}. {member} was deactivated; find a replacement.',
        false, true, true, 1);

-- Όπως το 20261015130000, και: «team_roles_changed» → 58, «crew_vacated» → 60.
create or replace function authz.audit_event_code(p_entity text, p_event text, p_detail jsonb, p_actor uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select case p_entity
    when 'agreements' then case p_event
      when 'link_opened' then 'proposal.link_opened'
      when 'agreement_signed' then 'agreement.signed'
      when 'approval_requested' then 'proposal.approval_requested'
      when 'approval_granted' then 'proposal.approval_decided'
      when 'approval_rejected' then 'proposal.approval_decided'
      when 'changes_requested' then 'proposal.changes_requested'
      when 'proposal_declined' then 'proposal.declined'
    end
    when 'agreement_costs' then case p_event when 'low_margin' then 'proposal.low_margin' end
    when 'filmings' then case p_event
      when 'booked' then case when p_detail ->> 'state' = 'pending' then 'filming.booked' end
      when 'approved' then 'filming.decided'
      when 'rejected' then 'filming.decided'
      when 'sheet_issued' then 'filming.sheet_issued'
      when 'rescheduled' then case when p_actor is not null then 'filming.rescheduled' end
      when 'cancelled' then 'filming.cancelled'
      when 'cancel_requested' then 'filming.cancel_requested'
      -- Αποδοχή: μετάθεση (περνά και από το filming_move, ίδια περίπτωση). Απόρριψη: απόφαση για το Γύρισμα.
      when 'reschedule_decided' then case when (p_detail ->> 'accepted')::boolean then 'filming.rescheduled' else 'filming.decided' end
      when 'cancel_request_decided' then case when (p_detail ->> 'accepted')::boolean then 'filming.cancelled' end
      when 'crew_declined' then 'filming.crew_declined'
      when 'crew_vacated' then 'filming.crew_vacated'
    end
    when 'productions' then case p_event when 'delivered' then 'production.delivered' end
    when 'access' then case p_event
      when 'team_invited' then 'team.access_changed'
      when 'team_roles_changed' then 'team.access_changed'
      when 'client_invited' then case
        when not coalesce((p_detail ->> 'auto')::boolean, false) and p_actor is not null and not authz.user_is_team(p_actor)
          then 'client.colleagues_changed' end
      when 'client_user_removed' then case
        when p_actor is not null and not authz.user_is_team(p_actor) then 'client.colleagues_changed' end
    end
  end;
$$;

-- Όπως το 20261015130000, και: κάθε θέση που αδειάζει είναι η περίπτωση «μέλος στο Γύρισμα».
create or replace function authz.audit_case_suffix(p_entity text, p_event text, p_entity_id uuid, p_detail jsonb, p_audit bigint) returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when p_entity in ('agreements', 'agreement_costs') then
      'r' || coalesce(p_detail ->> 'revision', (select a.revision::text from public.agreements a where a.id = p_entity_id), '')
    when p_event = 'sheet_issued' then 'v' || coalesce(p_detail ->> 'version', '')
    when p_event = 'rescheduled' then coalesce(p_detail ->> 'to', p_audit::text)
    -- Κάθε απόρριψη αιτήματος μετάθεσης είναι δική της περίπτωση.
    when p_event = 'reschedule_decided' and not coalesce((p_detail ->> 'accepted')::boolean, false) then
      'reschedule:' || p_audit::text
    when p_event = 'reschedule_decided' then
      coalesce((select to_jsonb(f.starts_at) #>> '{}' from public.filmings f where f.id = p_entity_id), p_audit::text)
    when p_event = 'crew_declined' then coalesce(p_detail ->> 'user_id', '')
    when p_event = 'crew_vacated' then 'vacated:' || coalesce(p_detail ->> 'user_id', '') || ':' || p_audit::text
    when p_entity = 'productions' then p_audit::text
    when p_entity = 'access' then coalesce(p_detail ->> 'invitationId', p_detail ->> 'userId', p_audit::text)
  end;
$$;

-- Όπως το 20261015130000, και το όνομα του μέλους που έφυγε από το Συνεργείο.
create or replace function authz.audit_payload(p_code text, p_event text, p_detail jsonb) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case p_code
    when 'filming.decided' then jsonb_strip_nulls(jsonb_build_object(
      'decision', case p_event when 'reschedule_decided' then 'reschedule_rejected' else p_event end,
      'reason', p_detail ->> 'reason', 'filming_requester_id', p_detail ->> 'requested_by'))
    when 'filming.crew_declined' then jsonb_strip_nulls(jsonb_build_object(
      'member', authz.ev_team_name(nullif(p_detail ->> 'user_id', '')::uuid), 'reason', p_detail ->> 'reason'))
    when 'filming.crew_vacated' then jsonb_strip_nulls(jsonb_build_object(
      'member', authz.ev_team_name(nullif(p_detail ->> 'user_id', '')::uuid)))
    when 'filming.sheet_issued' then jsonb_strip_nulls(jsonb_build_object(
      'sheetVersion', p_detail -> 'version', 'change', p_detail ->> 'change'))
    -- txAt: η αρχή της συναλλαγής, για να φανεί αν η ίδια μετακίνηση έβγαλε και νέα έκδοση Δελτίου.
    when 'filming.rescheduled' then jsonb_strip_nulls(jsonb_build_object(
      'previousStartsAt', p_detail ->> 'from', 'filming_requester_id', p_detail ->> 'requested_by', 'txAt', now()))
    else '{}'::jsonb
  end;
$$;

-- Όπως το 20261015120000, και η αλλαγή Ρόλων: ο Χρήστης, ποιος, και οι Ρόλοι του μετά την αλλαγή.
create or replace function authz.ev_access_payload(p_event text, p_entity_id uuid, p_detail jsonb, p_actor uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case p_event
    when 'team_invited' then (
      select jsonb_strip_nulls(jsonb_build_object(
        'user', i.name, 'by', authz.ev_team_name(p_actor), 'link', '/app/team',
        'roles', (select string_agg(r.name, ', ' order by r.name) from public.roles r where r.id = any (i.role_ids))))
        from public.invitations i where i.id = p_entity_id)
    when 'team_roles_changed' then (
      select jsonb_strip_nulls(jsonb_build_object(
        'user', t.name, 'by', authz.ev_team_name(p_actor), 'link', '/app/team/' || t.user_id,
        'roles', array_to_string(authz.team_role_names(t.user_id), ', ')))
        from public.team_users t where t.user_id = p_entity_id)
    else jsonb_strip_nulls(jsonb_build_object(
      'client_id', p_entity_id,
      'clientName', (select c.name from public.clients c where c.id = p_entity_id),
      'colleague', coalesce(
        (select i.name from public.invitations i where i.id = nullif(p_detail ->> 'invitationId', '')::uuid),
        (select cu.name from public.client_users cu
          where cu.client_id = p_entity_id and cu.user_id = nullif(p_detail ->> 'userId', '')::uuid)),
      'link', '/app/clients/' || p_entity_id))
  end;
$$;

-- ───────────── E3: το σήμα «άδειασε θέση» (μόνο ομάδα) ─────────────

create function authz.filming_vacancies_json(p_filming uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('userId', v.user_id, 'name', u.name, 'vacatedAt', v.vacated_at)
                            order by v.vacated_at, v.user_id), '[]'::jsonb)
    from public.filming_crew_vacancies v join public.team_users u on u.user_id = v.user_id
   where v.filming_id = p_filming;
$$;

-- Όπως το 20261011140000, με τα σήματα «άδειασε θέση» για την ομάδα.
create or replace function public.filming_view(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_filming_viewer();
  perform authz.filming_gate(p_id, authz.can_see_filming(p_id), 'filming.view');
  return authz.filming_card(p_id) || jsonb_build_object(
    'sheet', authz.filming_sheet_summary(p_id),
    'vacancies', case when authz.is_team_user() then authz.filming_vacancies_json(p_id) else '[]'::jsonb end);
end;
$$;

-- ───────────── Σήμερα: οι Παραγωγές χωρίς Υπεύθυνο στην κάρτα «Χωρίς υπεύθυνο» ─────────────

-- Όσα δείχνει το today_unassigned_rows, και οι ανοιχτές Παραγωγές χωρίς Υπεύθυνο για όποιον έχει Παραγωγές «όλα».
create function authz.today_unassigned_rows_for(p_uid uuid)
returns table (id text, title text, subtitle text, at timestamptz, link text)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.title, r.subtitle, r.at, '/app/unassigned' from authz.today_unassigned_rows() r
  union all
  select 'production:' || p.id::text, p.title, coalesce(c.name, 'Εσωτερική'), p.updated_at, '/app/productions/' || p.id
    from public.productions p left join public.clients c on c.id = p.client_id
   where p.owner_id is null and p.state = 'open' and authz.user_scope(p_uid, 'productions.manage') = 'all';
$$;

create or replace function authz.today_count_unassigned(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_unassigned_open(p_uid, p_client) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_unassigned_rows_for(p_uid));
end;
$$;

create or replace function authz.today_items_unassigned(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_unassigned_open(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', x.id, 'title', coalesce(x.title, '—'), 'subtitle', x.subtitle, 'at', x.at,
             'urgent', false, 'link', x.link)
           order by x.at, x.id)
      from (select * from authz.today_unassigned_rows_for(p_uid) r order by r.at, r.id limit 3) x),
    '[]'::jsonb);
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.deactivation_items(uuid, timestamptz), authz.deactivation_block(uuid, uuid), authz.release_on_deactivation(),
  authz.fill_crew_vacancy(), authz.team_role_names(uuid), authz.filming_vacancies_json(uuid),
  authz.today_unassigned_rows_for(uuid)
  from public, anon, authenticated;

revoke all on function
  public.team_deactivation_preview(uuid, timestamptz), public.team_user_set_roles(uuid, uuid[]),
  public.invitation_team_email_check(text), public.role_affected_users(uuid)
  from public, anon;
grant execute on function
  public.team_deactivation_preview(uuid, timestamptz), public.team_user_set_roles(uuid, uuid[]),
  public.invitation_team_email_check(text), public.role_affected_users(uuid)
  to authenticated;
