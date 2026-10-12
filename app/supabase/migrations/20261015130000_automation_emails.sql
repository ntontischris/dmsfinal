-- Ειδοποιήσεις Kβ (#171), μέρος 1: τα στιγμιαία email μέσα από Αυτοματισμούς (δέσμη Α1, Α3, Α6, Α8, Α10).
--
--  • Αρχικοί Αυτοματισμοί email για τα Γεγονότα 14, 15, 17, 20, 21, 23, 27, 30, 36, 48. Το κείμενό τους (θέμα και εισαγωγή)
--    είναι η σημερινή εισαγωγή των templates. Κάτω από αυτό ο renderer του kind «automation» βάζει ένα σταθερό «μπλοκ
--    λεπτομερειών» ανά Γεγονός (authz.ev_email_details), από την τρέχουσα κατάσταση της οντότητας. Ποτέ εσωτερικά
--    σχόλια, κόστος ή link που δεν είδε ο πελάτης· ποσά Τιμολογίου μόνο σε πελάτη ή σε όποιον «Βλέπει ποσά».
--  • Ίδιοι παραλήπτες με τα σημερινά authz.email_*: Δικαίωμα πελάτη ανά Γεγονός (event_types.client_permission) και δύο
--    νέοι «σε σχέση» παραλήπτες: sheet_issuer (ο τελευταίος εκδότης του Δελτίου, αλλιώς ο Υπεύθυνος της Παραγωγής) και
--    request_client (ο πελάτης που δήλωσε το Αίτημα, αλλιώς όσοι διαβάζουν τη Συνομιλία).
--  • Η απόρριψη αιτήματος μετάθεσης είναι απόφαση για το Γύρισμα (Γεγονός 14, decision «reschedule_rejected»)· η αποδοχή
--    είναι μετάθεση (Γεγονός 20). Η αυτόματη παράδοση Παραγωγής δεν έχει actor (δεν είναι ενέργεια του πελάτη).
--  • Γλώσσα Χρήστη πελάτη ανά άνθρωπο (client_user_settings), αρχικά από την πρόσκληση.
--  • Σύνδεσμος διακοπής σε κάθε email μη απαραίτητου Αυτοματισμού: token ανά email, μόνο hash στη βάση
--    (automation_unsubscribes), δημόσιο RPC όπως ο Σύνδεσμος πρότασης. Ίδια απάντηση για κάθε token (χωρίς oracle).
--  • Πίνακες κλειστοί (RLS χωρίς policies, revoke). Ξαναγράφονται από τον ΤΕΛΕΥΤΑΙΟ ορισμό (Kα): audit_event_code,
--    audit_case_suffix, audit_emit, event_relative_users, ev_recipients, ev_deliver, automation_for_viewer.

-- ───────────── Κατάλογος ─────────────

-- Το Δικαίωμα πελάτη που χρειάζεται ο Χρήστης πελάτη για να λάβει οτιδήποτε από το Γεγονός (null = όποιος βλέπει την οντότητα).
alter table public.event_types add column client_permission text references public.permissions (code);

do $$
declare
  v_name text;
begin
  select c.conname into v_name from pg_constraint c
   where c.conrelid = 'public.event_types'::regclass and c.contype = 'c'
     and pg_get_constraintdef(c.oid) like '%approval_requester%';
  execute format('alter table public.event_types drop constraint %I', v_name);
end;
$$;

alter table public.event_types add constraint event_types_relatives_check
  check (relatives <@ array['client', 'crew', 'actor', 'owner', 'production_owner', 'production_members', 'client_owner',
                            'assignee', 'requester', 'mentioned', 'opportunity_owner', 'approval_requester',
                            'sheet_issuer', 'request_client']);

update public.event_types set relatives = relatives || '{sheet_issuer}' where code = 'filming.crew_declined';
update public.event_types set relatives = relatives || '{request_client}' where code = 'request.closed';
update public.event_types set is_wired = true where code = 'invoice.registered';
update public.event_types set client_permission = 'c.approve' where code = 'deliverable.version_sent';
update public.event_types set client_permission = 'c.productions' where code = 'production.delivered';
update public.event_types set client_permission = 'c.finance' where code = 'invoice.registered';
update public.event_types set client_permission = 'c.chatRead' where code = 'request.closed';

-- ───────────── Γλώσσα Χρήστη πελάτη (Α8) ─────────────

create table public.client_user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  language text not null default 'el' check (language in ('el', 'en')),
  updated_at timestamptz not null default now()
);

alter table public.client_user_settings enable row level security;

-- Όσοι υπάρχουν ήδη: η γλώσσα της τελευταίας αποδεκτής πρόσκλησής τους.
insert into public.client_user_settings (user_id, language)
select distinct on (i.user_id) i.user_id, i.locale
  from public.invitations i
 where i.kind = 'client' and i.status = 'accepted' and i.user_id is not null
 order by i.user_id, i.accepted_at desc nulls last
on conflict (user_id) do nothing;

-- Η πρόσκληση πελάτη αρχικοποιεί τη γλώσσα· ό,τι διάλεξε ήδη ο Χρήστης μένει.
create function authz.invitation_language_init() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.client_user_settings (user_id, language) values (new.user_id, new.locale)
  on conflict (user_id) do nothing;
  return null;
end;
$$;

create trigger invitations_language_init after update of status on public.invitations
  for each row when (new.kind = 'client' and new.status = 'accepted' and old.status is distinct from 'accepted'
                     and new.user_id is not null)
  execute function authz.invitation_language_init();

-- Ο συνδεδεμένος Χρήστης πελάτη (με ενεργό Πελάτη), αλλιώς 42501.
create function authz.require_client_person() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if authz.client_user_client_id() is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- 'el' | 'en'
create function public.my_language() returns text
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require_client_person();
  return coalesce((select s.language from public.client_user_settings s where s.user_id = auth.uid()), 'el');
end;
$$;

create function public.set_my_language(p_language text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_client_person();
  if coalesce(p_language, '') not in ('el', 'en') then
    raise exception 'Διάλεξε Ελληνικά ή English' using errcode = 'P0001';
  end if;
  insert into public.client_user_settings (user_id, language) values (auth.uid(), p_language)
  on conflict (user_id) do update set language = excluded.language, updated_at = now();
end;
$$;

-- ───────────── Σύνδεσμος διακοπής (Α10) ─────────────

-- Ένα token ανά email μη απαραίτητου Αυτοματισμού· δείχνει πάντα το ζεύγος (παραλήπτης, Αυτοματισμός). Μόνο το hash.
create table public.automation_unsubscribes (
  token_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  automation_id uuid not null references public.automations (id) on delete cascade,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index automation_unsubscribes_pair_idx on public.automation_unsubscribes (user_id, automation_id);

alter table public.automation_unsubscribes enable row level security;

-- Δημόσιο, χωρίς είσοδο: { status: 'done' } για ΚΑΘΕ token (έγκυρο, άκυρο, απαραίτητο), ώστε να μην αποκαλύπτει τίποτα.
-- Μόνο έγκυρο token μη απαραίτητου Αυτοματισμού γράφει «δεν το λαμβάνω».
create function public.automation_unsubscribe(p_token text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  u public.automation_unsubscribes;
begin
  if p_token is not null and p_token ~ '^[0-9a-f]{64}$' then
    select x.* into u from public.automation_unsubscribes x where x.token_hash = authz.token_hash(p_token);
    if found and exists (select 1 from public.automations a where a.id = u.automation_id and not a.is_essential) then
      insert into public.automation_optouts (user_id, automation_id) values (u.user_id, u.automation_id)
      on conflict do nothing;
      update public.automation_unsubscribes set used_at = coalesce(used_at, now()) where token_hash = u.token_hash;
    end if;
  end if;
  return jsonb_build_object('status', 'done');
end;
$$;

-- ───────────── Από το Ίχνος στην ουρά (ξαναγραφές του Kα) ─────────────

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
    end
    when 'productions' then case p_event when 'delivered' then 'production.delivered' end
    when 'access' then case p_event
      when 'team_invited' then 'team.access_changed'
      when 'client_invited' then case
        when not coalesce((p_detail ->> 'auto')::boolean, false) and p_actor is not null and not authz.user_is_team(p_actor)
          then 'client.colleagues_changed' end
      when 'client_user_removed' then case
        when p_actor is not null and not authz.user_is_team(p_actor) then 'client.colleagues_changed' end
    end
  end;
$$;

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
    when p_entity = 'productions' then p_audit::text
    when p_entity = 'access' then coalesce(p_detail ->> 'invitationId', p_detail ->> 'userId', p_audit::text)
  end;
$$;

-- Το πλαίσιο του Γεγονότος από το Ίχνος· ό,τι χρειάζεται το μπλοκ λεπτομερειών και δεν υπάρχει πια στην οντότητα.
create function authz.audit_payload(p_code text, p_event text, p_detail jsonb) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case p_code
    when 'filming.decided' then jsonb_strip_nulls(jsonb_build_object(
      'decision', case p_event when 'reschedule_decided' then 'reschedule_rejected' else p_event end,
      'reason', p_detail ->> 'reason'))
    when 'filming.crew_declined' then jsonb_strip_nulls(jsonb_build_object(
      'member', authz.ev_team_name(nullif(p_detail ->> 'user_id', '')::uuid), 'reason', p_detail ->> 'reason'))
    when 'filming.sheet_issued' then jsonb_strip_nulls(jsonb_build_object(
      'sheetVersion', p_detail -> 'version', 'change', p_detail ->> 'change'))
    when 'filming.rescheduled' then jsonb_strip_nulls(jsonb_build_object('previousStartsAt', p_detail ->> 'from'))
    else '{}'::jsonb
  end;
$$;

create or replace function authz.audit_emit() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_detail jsonb := coalesce(new.after, '{}'::jsonb);
  v_event text := v_detail ->> 'event';
  v_code text;
  v_id uuid;
  v_suffix text;
  v_payload jsonb := '{}'::jsonb;
  v_event_id bigint;
begin
  v_code := authz.audit_event_code(new.entity, v_event, v_detail, new.actor_id);
  if v_code is null or new.entity_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  v_id := new.entity_id::uuid;
  v_suffix := authz.audit_case_suffix(new.entity, v_event, v_id, v_detail, new.id);
  if new.entity = 'access' then
    v_payload := coalesce(authz.ev_access_payload(v_event, v_id, v_detail, new.actor_id), '{}'::jsonb);
  elsif v_code = 'proposal.approval_decided' then
    v_payload := jsonb_build_object('decision', case v_event when 'approval_granted' then 'granted' else 'rejected' end,
      'approval_requester_id', (select l.actor_id from public.audit_log l
                                  where l.entity = 'agreements' and l.entity_id = new.entity_id and l.action = 'event'
                                    and l.after ->> 'event' = 'approval_requested'
                                  order by l.id desc limit 1));
  else
    v_payload := authz.audit_payload(v_code, v_event, v_detail);
  end if;
  v_event_id := authz.emit_event(v_code, new.entity, v_id,
    v_code || ':' || v_id || coalesce(':' || nullif(v_suffix, ''), ''), null, v_payload);
  -- Η αυτόματη παράδοση είναι του συστήματος: χωρίς actor, ώστε να τη λάβει και ο πελάτης που ενέκρινε τελευταίος.
  if v_code = 'production.delivered' and coalesce((v_detail ->> 'auto')::boolean, false) and v_event_id is not null then
    update public.events set actor_id = null where id = v_event_id;
  end if;
  return null;
exception when others then
  -- Ένα λάθος της ουράς δεν ακυρώνει ποτέ την επιχειρησιακή ενέργεια (ούτε το Ίχνος).
  raise warning 'audit_emit %: %', new.entity, sqlerrm;
  return null;
end;
$$;

-- ───────────── Παραλήπτες (ξαναγραφές του Kα) ─────────────

-- Ο πελάτης του Αιτήματος: αυτός που το δήλωσε, αν είναι ακόμα ενεργός με c.chatRead· αλλιώς (Αίτημα της ομάδας ή ο
-- δηλώσας έφυγε) όσοι Χρήστες του Πελάτη διαβάζουν τη Συνομιλία. Όπως το email κλεισίματος του #164.
create function authz.ev_request_clients(e public.events) returns setof uuid
language sql stable security definer set search_path = ''
as $$
  with r as (
    select x.declared_by, x.declared_user from public.message_requests x where x.message_id = e.entity_id
  ), readers as (
    select cu.user_id from public.client_users cu
     where cu.client_id = e.client_id and cu.removed_at is null
       and authz.ev_client_has(cu.user_id, e.client_id, array['c.chatRead'])
  )
  select rd.user_id from readers rd
   where rd.user_id = (select r.declared_user from r where r.declared_by = 'client')
      or not exists (select 1 from readers d join r on r.declared_by = 'client' and d.user_id = r.declared_user);
$$;

-- Ο τελευταίος Χρήστης ομάδας που εξέδωσε το Δελτίο· αλλιώς ο Υπεύθυνος της Παραγωγής (ή όσοι «Μεταβιβάζουν Υπεύθυνο»).
create function authz.ev_sheet_issuer(e public.events) returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select * from authz.ev_owner_or_fallback(coalesce(
    (select v.issued_by from public.filming_sheet_versions v
      where v.filming_id = authz.ev_uuid(e.payload, 'filming_id') and authz.user_is_team(v.issued_by)
      order by v.version desc limit 1),
    (select p.owner_id from public.productions p where p.id = authz.ev_uuid(e.payload, 'production_id'))));
$$;

create or replace function authz.event_relative_users(e public.events, p_relative text) returns setof uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_production uuid := authz.ev_uuid(e.payload, 'production_id');
begin
  case p_relative
    when 'client' then
      return query select cu.user_id from public.client_users cu where cu.client_id = e.client_id and cu.removed_at is null;
    when 'actor' then
      return query select e.actor_id where e.actor_id is not null;
    when 'owner' then
      return query select u.user_id from public.team_users u where authz.user_is_owner(u.user_id);
    when 'crew' then
      return query select fc.user_id from public.filming_crew fc where fc.filming_id = authz.ev_uuid(e.payload, 'filming_id');
    when 'production_owner' then
      return query select * from authz.ev_owner_or_fallback((select p.owner_id from public.productions p where p.id = v_production));
    when 'production_members' then
      return query select p.owner_id from public.productions p where p.id = v_production and p.owner_id is not null
                   union select pm.user_id from public.production_members pm where pm.production_id = v_production;
    when 'client_owner' then
      return query select * from authz.ev_owner_or_fallback((select c.manager_id from public.clients c where c.id = e.client_id));
    when 'opportunity_owner' then
      return query select * from authz.ev_owner_or_fallback(
        (select o.manager_id from public.opportunities o where o.id = authz.ev_uuid(e.payload, 'opportunity_id')));
    when 'assignee' then
      return query select * from authz.ev_owner_or_fallback(authz.ev_assignee(e));
    when 'requester' then
      return query select authz.ev_uuid(e.payload, 'requester_id') where authz.ev_uuid(e.payload, 'requester_id') is not null;
    when 'approval_requester' then
      return query select authz.ev_uuid(e.payload, 'approval_requester_id')
                    where authz.ev_uuid(e.payload, 'approval_requester_id') is not null;
    when 'mentioned' then
      return query select x::uuid from jsonb_array_elements_text(coalesce(e.payload -> 'mentioned_ids', '[]'::jsonb)) x;
    when 'sheet_issuer' then
      return query select * from authz.ev_sheet_issuer(e);
    when 'request_client' then
      return query select * from authz.ev_request_clients(e);
    else
      return;
  end case;
end;
$$;

-- Όπως στο Kα, και: Δικαίωμα πελάτη ανά Γεγονός, γλώσσα του Χρήστη πελάτη (Α8), κανένα Γεγονός ακυρωμένου Τιμολογίου.
create or replace function authz.ev_recipients(a public.automations, e public.events)
returns setof authz.ev_recipient
language sql stable security definer set search_path = ''
as $$
  with cand as (
    select distinct c as uid from authz.ev_candidates(a, e) c where c is not null
  ), people as (
    select t.user_id, false as is_client, t.name, t.email, t.language as locale
      from public.team_users t join cand on cand.uid = t.user_id
     where t.is_active
    union all
    select cu.user_id, true, cu.name, u.email,
           coalesce((select s.language from public.client_user_settings s where s.user_id = cu.user_id),
                    (select t.language from public.team_users t where t.user_id = cu.user_id), 'el')
      from public.client_users cu join cand on cand.uid = cu.user_id join auth.users u on u.id = cu.user_id
     where cu.client_id = e.client_id and cu.removed_at is null
  )
  select row(p.user_id, p.is_client, p.name, p.email, p.locale)::authz.ev_recipient
    from people p join public.event_types et on et.code = e.type
   where (not et.is_cost_only or (not p.is_client and authz.user_scope(p.user_id, 'finance.cost') is not null))
     and (et.is_client_facing or not p.is_client)
     and (not p.is_client or et.client_permission is null
          or authz.ev_client_has(p.user_id, e.client_id, array[et.client_permission]))
     and authz.event_visible_to(e, p.user_id, p.is_client)
     and not (e.entity = 'invoices'
              and exists (select 1 from public.invoices i where i.id = e.entity_id and i.voided_at is not null))
     and ((a.recipient_kind = 'relative' and a.recipient_relative = 'actor') or p.user_id is distinct from e.actor_id)
     and not exists (select 1 from public.automation_optouts o
                      where o.user_id = p.user_id and o.automation_id = a.id and (not p.is_client or not a.is_essential));
$$;

-- Ο πελάτης βλέπει στις Προτιμήσεις όσους πάνε «στον πελάτη» (και «στον πελάτη του Αιτήματος»).
create or replace function authz.automation_for_viewer(a public.automations) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when authz.is_team_user() then
      a.recipient_kind not in ('visitor') and coalesce(a.recipient_relative, '') not in ('client', 'request_client')
    else a.recipient_kind = 'relative' and a.recipient_relative in ('client', 'request_client')
  end;
$$;

-- ───────────── Μπλοκ λεπτομερειών ανά Γεγονός (Α6) ─────────────

create function authz.ev_filming_details(e public.events) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_strip_nulls(case e.type
    when 'filming.decided' then jsonb_build_object(
      'kind', e.type, 'filmingId', f.id, 'decision', e.payload ->> 'decision', 'startsAt', f.starts_at, 'hours', f.hours,
      'reason', case when e.payload ->> 'decision' <> 'approved' then coalesce(e.payload ->> 'reason', f.rejected_reason) end)
    when 'filming.rescheduled' then jsonb_build_object(
      'kind', e.type, 'filmingId', f.id, 'startsAt', f.starts_at, 'hours', f.hours,
      'previousStartsAt', e.payload ->> 'previousStartsAt')
    when 'filming.crew_declined' then jsonb_build_object(
      'kind', e.type, 'filmingId', f.id, 'member', e.payload ->> 'member', 'reason', e.payload ->> 'reason',
      'startsAt', f.starts_at, 'production', p.title)
  end)
    from public.filmings f join public.productions p on p.id = f.production_id
   where f.id = e.entity_id;
$$;

create function authz.ev_sheet_details(e public.events) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
           'kind', e.type, 'filmingId', v.filming_id, 'version', v.version,
           'startsAt', v.snapshot -> 'startsAt', 'hours', v.snapshot -> 'hours',
           'location', v.snapshot ->> 'location', 'production', v.snapshot ->> 'production', 'change', v.change))
    from public.filming_sheet_versions v
   where v.filming_id = e.entity_id and v.version::text = e.payload ->> 'sheetVersion';
$$;

-- Η Έκδοση: τίτλος, Παραγωγή, γύροι· χωρίς το link (το βλέπει ο πελάτης μέσα στο DMS).
create function authz.ev_version_details(e public.events) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
           'kind', e.type, 'deliverableId', d.id, 'title', d.title, 'production', p.title,
           'version', nullif(e.payload ->> 'version', '')::integer,
           'roundsUsed', authz.deliverable_rounds_used(d.id),
           'roundsLimit', (select l.rounds from public.agreement_revision_limits l
                            where l.agreement_id = p.agreement_id and l.kind_id = d.kind_id)))
    from public.deliverables d join public.productions p on p.id = d.production_id
   where d.id = e.entity_id;
$$;

create function authz.ev_delivered_details(e public.events) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('kind', e.type, 'productionId', p.id, 'title', p.title,
                            'deliverables', authz.production_delivery_items(p.id))
    from public.productions p
   where p.id = e.entity_id;
$$;

-- Τα ποσά και το PDF μόνο για πελάτη ή για όποιον «Βλέπει ποσά».
create function authz.ev_invoice_details(e public.events, r authz.ev_recipient) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
           'kind', e.type, 'invoiceId', i.id, 'docKind', i.kind, 'number', i.number, 'issueDate', i.issue_date,
           'dueDate', i.due_date, 'total', i.total, 'pdfPath', i.pdf_path))
    from public.invoices i
   where i.id = e.entity_id and (r.is_client or authz.user_scope(r.user_id, 'finance.amounts') is not null);
$$;

-- Το κλείσιμο του Αιτήματος: απάντηση, σχόλιο, σύνδεσμος https και Παραδοτέο, όπως στο email του #164.
create function authz.ev_request_details(e public.events) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
           'kind', e.type, 'clientName', c.name, 'requestKind', x.kind, 'outcome', x.state,
           'reply', x.close_reply, 'comment', x.close_comment,
           'link', case when x.close_link ~ '^https://[^[:space:]]+$' then x.close_link end,
           'deliverableId', case when x.result_kind = 'deliverable' then x.result_id end))
    from public.message_requests x
    join public.messages m on m.id = x.message_id
    join public.clients c on c.id = m.client_id
   where x.message_id = e.entity_id;
$$;

-- Το μπλοκ λεπτομερειών του email για έναν παραλήπτη (null = κανένα μπλοκ).
create function authz.ev_email_details(e public.events, r authz.ev_recipient) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case
    when e.type in ('filming.decided', 'filming.rescheduled', 'filming.crew_declined') then authz.ev_filming_details(e)
    when e.type = 'filming.sheet_issued' then authz.ev_sheet_details(e)
    when e.type = 'deliverable.version_sent' then authz.ev_version_details(e)
    when e.type = 'production.delivered' then authz.ev_delivered_details(e)
    when e.type = 'invoice.registered' then authz.ev_invoice_details(e, r)
    when e.type = 'request.closed' then authz.ev_request_details(e)
  end;
$$;

-- ───────────── Αποστολή σε έναν παραλήπτη (ξαναγραφή του Kα) ─────────────
-- Ό,τι άλλαξε: το email παίρνει το μπλοκ λεπτομερειών και, σε μη απαραίτητο Αυτοματισμό, token διακοπής.

create or replace function authz.ev_deliver(
  a public.automations, e public.events, r authz.ev_recipient, p_now timestamptz
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_locale text := case when r.locale = 'en' and length(trim(a.body_en)) > 0 then 'en' else 'el' end;
  v_link text := case when r.is_client then coalesce(e.payload ->> 'client_link', e.payload ->> 'link') else e.payload ->> 'link' end;
  v_vars jsonb := e.payload || jsonb_build_object('recipientName', r.name, 'companyName', authz.ev_company(),
                                                  'link', coalesce(v_link, ''));
  v_label text := (select case v_locale when 'en' then t.label_en else t.label_el end from public.event_types t where t.code = e.type);
  v_allowed text[] := (select t.variables from public.event_types t where t.code = e.type);
  v_subject text;
  v_body text;
  v_send bigint;
  v_ref uuid;
  v_token text;
begin
  if a.channel = 'email' and coalesce(trim(r.email), '') = '' then
    return false;
  end if;
  insert into public.automation_sends (automation_id, event_id, case_key, recipient_key, channel, created_at)
  values (a.id, e.id, e.case_key, r.user_id::text, a.channel, p_now)
  on conflict (automation_id, case_key, recipient_key) do nothing
  returning id into v_send;
  if v_send is null then
    return false;
  end if;
  -- Το σημάδι γράφτηκε (μία φορά)· η Ειδοποίηση όμως μπαίνει μία ανά (Γεγονός, Χρήστη), όσοι Αυτοματισμοί κι αν τον βρουν.
  if a.channel = 'notification'
     and exists (select 1 from public.notifications n where n.event_id = e.id and n.user_id = r.user_id) then
    return false;
  end if;
  -- Το θέμα είναι μία γραμμή.
  v_subject := regexp_replace(
    authz.ev_render(coalesce(case v_locale when 'en' then nullif(trim(a.subject_en), '') end, a.subject_el, v_label),
                    v_vars, v_allowed),
    '\s*[\r\n]+\s*', ' ', 'g');
  v_body := authz.ev_render(case v_locale when 'en' then a.body_en else a.body_el end, v_vars, v_allowed);
  if a.channel = 'notification' then
    insert into public.notifications (user_id, client_id, automation_id, event_id, title, body, link, created_at)
    values (r.user_id, e.client_id, a.id, e.id, left(coalesce(nullif(v_subject, ''), v_label), 300), left(v_body, 2000),
            nullif(v_link, ''), p_now)
    returning id into v_ref;
    update public.automation_sends set notification_id = v_ref where id = v_send;
  else
    if not a.is_essential then
      v_token := authz.new_token();
      insert into public.automation_unsubscribes (token_hash, user_id, automation_id)
      values (authz.token_hash(v_token), r.user_id, a.id);
    end if;
    insert into public.email_outbox (kind, to_name, to_email, locale, payload)
    values ('automation', coalesce(r.name, ''), lower(trim(r.email)), v_locale,
            jsonb_strip_nulls(jsonb_build_object('subject', left(coalesce(nullif(v_subject, ''), v_label), 300),
              'body', left(v_body, 2000), 'link', nullif(v_link, ''), 'automationId', a.id,
              'details', authz.ev_email_details(e, r), 'unsubscribeToken', v_token)))
    returning id into v_ref;
    update public.automation_sends set email_outbox_id = v_ref where id = v_send;
  end if;
  return true;
end;
$$;

-- ───────────── Αρχικοί Αυτοματισμοί email (Α3) ─────────────

create function authz.seed_mail(
  p_type text, p_relative text, p_essential boolean, p_subject_el text, p_subject_en text, p_el text, p_en text, p_sort integer
) returns void
language sql set search_path = ''
as $$
  insert into public.automations (event_type, channel, recipient_kind, recipient_relative, subject_el, subject_en,
                                  body_el, body_en, is_essential, is_enabled, is_initial, sort)
  values (p_type, 'email', 'relative', p_relative, p_subject_el, p_subject_en, p_el, p_en, p_essential, true, true, p_sort);
$$;

select authz.seed_mail('filming.decided', 'client', true,
  'Devre Media · Το Γύρισμά σου στις {filmingDate}', 'Devre Media · Your filming on {filmingDate}',
  'Γεια σου {recipientName},', 'Hello {recipientName},', 10);
select authz.seed_mail('filming.sheet_issued', 'crew', false,
  'Δελτίο γυρίσματος · {filming}', 'Filming sheet · {filming}',
  'Γεια σου {recipientName},', 'Hello {recipientName},', 10);
select authz.seed_mail('filming.google_moved', 'client', false,
  'Νέα ώρα για το Γύρισμα {filming}', 'New time for the filming {filming}',
  E'Γεια σου {recipientName},\n\nΤο Γύρισμα {filming} μετακινήθηκε: {filmingDate} στις {filmingTime}.',
  E'Hello {recipientName},\n\nThe filming {filming} was moved: {filmingDate} at {filmingTime}.', 10);
select authz.seed_mail('filming.google_moved', 'crew', false,
  'Νέα ώρα για το Γύρισμα {filming}', 'New time for the filming {filming}',
  E'Γεια σου {recipientName},\n\nΤο Γύρισμα {filming} μετακινήθηκε: {filmingDate} στις {filmingTime}.',
  E'Hello {recipientName},\n\nThe filming {filming} was moved: {filmingDate} at {filmingTime}.', 11);
select authz.seed_mail('filming.rescheduled', 'client', true,
  'Devre Media · Το Γύρισμά σου μετατέθηκε', 'Devre Media · Your filming was rescheduled',
  'Γεια σου {recipientName},', 'Hello {recipientName},', 10);
select authz.seed_mail('filming.rescheduled', 'crew', true,
  'Νέα ώρα για το Γύρισμα {filming}', 'New time for the filming {filming}',
  'Γεια σου {recipientName},', 'Hello {recipientName},', 11);
select authz.seed_mail('filming.cancelled', 'client', true,
  'Devre Media · Ακύρωση Γυρίσματος', 'Devre Media · Filming cancelled',
  E'Γεια σου {recipientName},\n\nΤο Γύρισμα {filming} της {filmingDate} στις {filmingTime} ακυρώθηκε.',
  E'Hello {recipientName},\n\nThe filming {filming} on {filmingDate} at {filmingTime} was cancelled.', 10);
select authz.seed_mail('filming.cancelled', 'crew', true,
  'Ακύρωση Γυρίσματος · {filming}', 'Filming cancelled · {filming}',
  E'Γεια σου {recipientName},\n\nΤο Γύρισμα {filming} της {filmingDate} στις {filmingTime} ακυρώθηκε.',
  E'Hello {recipientName},\n\nThe filming {filming} on {filmingDate} at {filmingTime} was cancelled.', 11);
select authz.seed_mail('filming.crew_declined', 'sheet_issuer', false,
  '{member} δεν μπορεί στο Γύρισμα {filming}', '{member} cannot attend the filming {filming}',
  'Γεια σου {recipientName},', 'Hello {recipientName},', 10);
select authz.seed_mail('deliverable.version_sent', 'client', true,
  'Νέα Έκδοση για έγκριση · {deliverable}', 'New version for approval · {deliverable}',
  'Γεια σου {recipientName},', 'Hello {recipientName},', 10);
select authz.seed_mail('production.delivered', 'client', true,
  'Παραδόθηκε: {production}', 'Delivered: {production}',
  'Γεια σου {recipientName},', 'Hello {recipientName},', 10);
select authz.seed_mail('invoice.registered', 'client', true,
  'Νέο παραστατικό {invoice}', 'New document {invoice}',
  'Γεια σου {recipientName},', 'Hello {recipientName},', 10);
select authz.seed_mail('request.closed', 'request_client', true,
  'Το Αίτημά σας «{request}» έκλεισε', 'Your request “{request}” was closed',
  'Γεια σου {recipientName},', 'Hello {recipientName},', 10);

drop function authz.seed_mail(text, text, boolean, text, text, text, text, integer);

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.invitation_language_init(), authz.require_client_person(), authz.audit_payload(text, text, jsonb),
  authz.ev_request_clients(public.events), authz.ev_sheet_issuer(public.events),
  authz.ev_filming_details(public.events), authz.ev_sheet_details(public.events), authz.ev_version_details(public.events),
  authz.ev_delivered_details(public.events), authz.ev_invoice_details(public.events, authz.ev_recipient),
  authz.ev_request_details(public.events), authz.ev_email_details(public.events, authz.ev_recipient)
  from public, anon, authenticated;

revoke all on function public.my_language(), public.set_my_language(text) from public, anon;
grant execute on function public.my_language(), public.set_my_language(text) to authenticated;

-- Όπως ο Σύνδεσμος πρότασης: ανώνυμο, μόνο με token.
revoke all on function public.automation_unsubscribe(text) from public;
grant execute on function public.automation_unsubscribe(text) to anon, authenticated;

revoke all on table public.client_user_settings, public.automation_unsubscribes from anon, authenticated;
