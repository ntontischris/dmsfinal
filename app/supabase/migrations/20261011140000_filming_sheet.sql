-- Δελτίο γυρίσματος (C2γ, #136): στιγμιότυπο, λήψεις, εκδόσεις (αμετάβλητο ιστορικό), Συνεργείο με έκδοση στις
-- απαντήσεις και email προς το Συνεργείο. Κεφ. 3 (Γυρίσματα), ADR 0006, 0010, 0016, 0018 και το ticket #136.
--
-- Αρχές:
--  • Έκδοση = στιγμιότυπο του Δελτίου τη στιγμή της έκδοσης. Δεν αλλάζει ποτέ (trigger).
--  • Η αλλαγή πού/πότε/ποιοι δεν μηδενίζει μόνη της τις απαντήσεις όταν υπάρχει έκδοση· μηδενίζει η επόμενη έκδοση
--    (Κανόνας change_resets_confirmations). Χωρίς έκδοση, η μετακίνηση και η αλλαγή Συνεργείου μηδενίζουν όπως πριν.
--  • Με sheet_sending = 'auto' η αλλαγή πού/πότε/ποιοι βγάζει νέα έκδοση μόνη της, μόνο αν άλλαξε το στιγμιότυπο.
--    Με 'manual' το Δελτίο δείχνει «Υπάρχουν αλλαγές από την έκδοση N».
--  • Ο πελάτης δεν βλέπει το Δελτίο. Πίνακες κλειστοί (RLS χωρίς policies, χωρίς grants)· όλα περνούν από RPC.

-- ───────────── Πίνακες και στήλες ─────────────

alter table public.filming_crew
  add column version integer check (version is null or version >= 1);

alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check
  check (kind in ('test', 'invite_resend', 'client_added', 'filming_decision', 'reschedule_decision',
                  'sheet_issued', 'crew_declined'));

create table public.filming_sheets (
  filming_id uuid primary key references public.filmings (id),
  shots jsonb not null default '[]'::jsonb check (jsonb_typeof(shots) = 'array' and jsonb_array_length(shots) <= 100),
  crew_note text check (crew_note is null or (length(trim(crew_note)) > 0 and length(crew_note) <= 2000)),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.filming_sheet_versions (
  filming_id uuid not null references public.filmings (id),
  version integer not null check (version >= 1),
  issued_at timestamptz not null default now(),
  issued_by uuid,
  change text check (change is null or length(trim(change)) between 1 and 300),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  primary key (filming_id, version),
  check ((version = 1) = (change is null))
);

alter table public.filming_sheets enable row level security;
alter table public.filming_sheet_versions enable row level security;

-- Η έκδοση δεν ενημερώνεται και δεν σβήνεται.
create function authz.guard_sheet_version() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  raise exception 'Η έκδοση του Δελτίου είναι αμετάβλητη' using errcode = 'P0001';
  return null;
end;
$$;

create trigger filming_sheet_versions_immutable before update or delete on public.filming_sheet_versions
  for each row execute function authz.guard_sheet_version();

create trigger filming_sheets_audit after insert or update or delete on public.filming_sheets
  for each row execute function authz.audit_row('filming_id');
create trigger filming_sheet_versions_audit after insert on public.filming_sheet_versions
  for each row execute function authz.audit_row('filming_id');

-- ───────────── Στιγμιότυπο και σύνοψη ─────────────

-- Όσα βλέπει το Συνεργείο για το Γύρισμα τη στιγμή αυτή: πού, πότε, ποιοι, εξοπλισμός, λήψεις και σημείωση.
create function authz.sheet_snapshot(p_filming uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'startsAt', f.starts_at,
    'hours', f.hours,
    'location', f.location,
    'production', pr.title,
    'client', c.name,
    'crew', (
      select coalesce(jsonb_agg(jsonb_build_object('userId', m.user_id, 'name', u.name)
                                order by lower(u.name), m.user_id), '[]'::jsonb)
        from public.filming_crew m
        join public.team_users u on u.user_id = m.user_id
       where m.filming_id = f.id
    ),
    'equipment', (
      select coalesce(jsonb_agg(jsonb_build_object('name', i.name) order by lower(i.name), i.id), '[]'::jsonb)
        from public.filming_equipment e
        join public.equipment_items i on i.id = e.item_id
       where e.filming_id = f.id
    ),
    'shots', coalesce(s.shots, '[]'::jsonb),
    'crewNote', s.crew_note
  )
  from public.filmings f
  join public.productions pr on pr.id = f.production_id
  left join public.clients c on c.id = f.client_id
  left join public.filming_sheets s on s.filming_id = f.id
  where f.id = p_filming;
$$;

-- Υπάρχει έκδοση και το τρέχον στιγμιότυπο διαφέρει από την τελευταία.
create function authz.sheet_has_changes(p_filming uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.filming_sheet_versions v where v.filming_id = p_filming)
     and authz.sheet_snapshot(p_filming) is distinct from (
       select v.snapshot from public.filming_sheet_versions v
        where v.filming_id = p_filming order by v.version desc limit 1
     );
$$;

-- Σύνοψη για το E3: έκδοση και «υπάρχουν αλλαγές». Μόνο για ομάδα με Συνεργείο ή μέλος του. Αλλιώς null.
create function authz.filming_sheet_summary(p_filming uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case
           when v.version is null then null
           when not (authz.is_team_user() and (authz.can_see_crew(p_filming) or authz.is_filming_crew(p_filming))) then null
           else jsonb_build_object('version', v.version, 'hasChanges', authz.sheet_has_changes(p_filming))
         end
    from (select max(x.version) as version from public.filming_sheet_versions x where x.filming_id = p_filming) v;
$$;

-- ───────────── Email προς Χρήστη ομάδας ─────────────

-- Γράφει γραμμή στην ουρά email_outbox για Χρήστη ομάδας. Γλώσσα και όνομα από το προφίλ. Χωρίς email δεν γράφει τίποτα.
create function authz.email_team_user(p_user uuid, p_kind text, p_payload jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text;
  v_email text;
  v_locale text;
begin
  select t.name, u.email, t.language into v_name, v_email, v_locale
    from public.team_users t
    join auth.users u on u.id = t.user_id
   where t.user_id = p_user;
  if coalesce(v_email, '') = '' then
    return;
  end if;
  insert into public.email_outbox (kind, to_name, to_email, locale, payload, created_by)
  values (p_kind, coalesce(v_name, ''), lower(trim(v_email)), coalesce(v_locale, 'el'), p_payload, auth.uid());
end;
$$;

-- ───────────── Λήψεις ─────────────

-- Έως 100 λήψεις, κείμενο 1 έως 300 χαρακτήρες, σειρά όπως δόθηκε. Άκυρο ή κενό id παίρνει νέο.
create function authz.normalize_shots(p_shots jsonb) returns jsonb
language plpgsql stable set search_path = ''
as $$
declare
  v_shots jsonb := coalesce(p_shots, '[]'::jsonb);
  v_out jsonb;
begin
  if jsonb_typeof(v_shots) <> 'array' then
    raise exception 'Η λίστα λήψεων δεν είναι έγκυρη' using errcode = 'P0001';
  end if;
  if jsonb_array_length(v_shots) > 100 then
    raise exception 'Έως 100 λήψεις στο Δελτίο' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_shots) as x
     where jsonb_typeof(x) <> 'object' or length(trim(coalesce(x ->> 'text', ''))) not between 1 and 300
  ) then
    raise exception 'Κάθε λήψη θέλει κείμενο από 1 έως 300 χαρακτήρες' using errcode = 'P0001';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'text', s.text) order by s.ord), '[]'::jsonb)
    into v_out
    from (
      select case when x ->> 'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                  then (x ->> 'id')::uuid else gen_random_uuid() end as id,
             trim(x ->> 'text') as text,
             o as ord
        from jsonb_array_elements(v_shots) with ordinality as e (x, o)
    ) s;
  perform authz.assert_distinct_ids(array(select (elem ->> 'id')::uuid from jsonb_array_elements(v_out) as elem));
  return v_out;
end;
$$;

-- ───────────── Έκδοση και αλλαγές ─────────────

-- Βγάζει νέα έκδοση. Από τη 2η θέλει περιγραφή αλλαγής. Μηδενίζει τις απαντήσεις αν ισχύει ο Κανόνας
-- (μόνο από τη 2η έκδοση), στέλνει email σε κάθε μέλος του Συνεργείου και γράφει γεγονός.
create function authz.sheet_issue(p_filming uuid, p_change text) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_version integer;
  v_change text := nullif(trim(coalesce(p_change, '')), '');
  v_snapshot jsonb;
  v_reset boolean;
  v_user uuid;
begin
  perform 1 from public.filmings f where f.id = p_filming for update;
  perform authz.require_open_filming(p_filming);
  if not exists (select 1 from public.filming_crew c where c.filming_id = p_filming) then
    raise exception 'Πρόσθεσε Συνεργείο πριν από την έκδοση' using errcode = 'P0001';
  end if;
  v_version := (select coalesce(max(v.version), 0) + 1 from public.filming_sheet_versions v where v.filming_id = p_filming);
  if v_version = 1 then
    v_change := null;
  elsif v_change is null then
    raise exception 'Γράψε τι άλλαξε' using errcode = 'P0001';
  elsif length(v_change) > 300 then
    raise exception 'Η περιγραφή αλλαγής έχει έως 300 χαρακτήρες' using errcode = 'P0001';
  end if;
  v_snapshot := authz.sheet_snapshot(p_filming);
  insert into public.filming_sheet_versions (filming_id, version, issued_by, change, snapshot)
  values (p_filming, v_version, auth.uid(), v_change, v_snapshot);
  select coalesce(s.change_resets_confirmations, false) and v_version > 1 into v_reset
    from public.filming_settings s where s.id;
  if v_reset then
    update public.filming_crew c set response = 'pending', reason = null, responded_at = null, version = null
     where c.filming_id = p_filming;
  end if;
  perform authz.filming_event(p_filming, 'sheet_issued', jsonb_build_object('version', v_version, 'change', v_change));
  for v_user in select c.user_id from public.filming_crew c where c.filming_id = p_filming loop
    perform authz.email_team_user(v_user, 'sheet_issued', jsonb_build_object(
      'filmingId', p_filming, 'version', v_version, 'startsAt', v_snapshot -> 'startsAt', 'hours', v_snapshot -> 'hours',
      'location', v_snapshot -> 'location', 'production', v_snapshot -> 'production', 'change', v_change
    ));
  end loop;
  return v_version;
end;
$$;

-- Καλείται μετά από αλλαγή πού, πότε ή ποιοι. Χωρίς έκδοση δεν κάνει τίποτα. Με 'auto' βγάζει νέα έκδοση αν άλλαξε το στιγμιότυπο.
create function authz.sheet_changed(p_filming uuid, p_change text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.sheet_has_changes(p_filming) then
    return;
  end if;
  if (select s.sheet_sending from public.filming_settings s where s.id) is distinct from 'auto' then
    return;
  end if;
  if not exists (select 1 from public.filming_crew c where c.filming_id = p_filming) then
    return;
  end if;
  perform authz.sheet_issue(p_filming, p_change);
end;
$$;

-- ───────────── Συνεργείο και Δελτίο ─────────────

-- Ορίζει το Συνεργείο και καλεί το Δελτίο. Ίδια συμπεριφορά με πριν, χωρίς έκδοση.
create or replace function public.filming_crew_set(p_id uuid, p_user_ids uuid[]) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('filming.crew');
  perform authz.filming_gate(p_id, authz.can_crew_filming(p_id), 'filming.crew');
  perform authz.require_open_filming(p_id);
  perform authz.filming_crew_write(p_id, p_user_ids, false);
  perform authz.sheet_changed(p_id, 'Άλλαξε το Συνεργείο');
end;
$$;

-- Εφαρμόζει Πρότυπο συνεργείου και καλεί το Δελτίο.
create or replace function public.filming_crew_apply_template(p_id uuid, p_template uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform authz.require('filming.crew');
  perform authz.filming_gate(p_id, authz.can_crew_filming(p_id), 'filming.crew');
  perform authz.require_open_filming(p_id);
  if not exists (select 1 from public.crew_templates t where t.id = p_template) then
    raise exception 'Το Πρότυπο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  v_result := authz.filming_crew_write(p_id, array(
    select m.user_id from public.crew_template_members m where m.template_id = p_template
  ), true);
  perform authz.sheet_changed(p_id, 'Άλλαξε το Συνεργείο');
  return v_result;
end;
$$;

-- Η απάντηση του μέλους γράφει και την τρέχουσα έκδοση. «Δεν μπορώ» στέλνει email στον εκδότη της τελευταίας έκδοσης
-- (ή στον δημιουργό του Γυρίσματος, αν δεν υπάρχει έκδοση). Το Γύρισμα δεν αλλάζει.
create or replace function public.filming_crew_respond(p_id uuid, p_response text, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_member text;
  v_starts timestamptz;
  v_production text;
  v_recipient uuid;
begin
  if not authz.is_team_user() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if not exists (select 1 from public.filming_crew c where c.filming_id = p_id and c.user_id = auth.uid()) then
    raise exception 'Δεν είσαι στο Συνεργείο αυτού του Γυρίσματος' using errcode = '42501';
  end if;
  if p_response not in ('confirmed', 'declined') then
    raise exception 'Άγνωστη απάντηση' using errcode = 'P0001';
  end if;
  if p_response = 'declined' and v_reason is null then
    raise exception 'Το «δεν μπορώ» θέλει λόγο' using errcode = 'P0001';
  end if;
  perform authz.require_open_filming(p_id);
  update public.filming_crew c
     set response = p_response,
         reason = case when p_response = 'declined' then v_reason else null end,
         responded_at = now(),
         version = (select max(v.version) from public.filming_sheet_versions v where v.filming_id = p_id)
   where c.filming_id = p_id and c.user_id = auth.uid();
  if p_response = 'declined' then
    perform authz.filming_event(p_id, 'crew_declined', jsonb_build_object('user_id', auth.uid(), 'reason', v_reason));
    select u.name into v_member from public.team_users u where u.user_id = auth.uid();
    select f.starts_at, pr.title into v_starts, v_production
      from public.filmings f join public.productions pr on pr.id = f.production_id
     where f.id = p_id;
    select coalesce(
             (select v.issued_by from public.filming_sheet_versions v where v.filming_id = p_id order by v.version desc limit 1),
             f.created_by)
      into v_recipient
      from public.filmings f where f.id = p_id;
    perform authz.email_team_user(v_recipient, 'crew_declined', jsonb_build_object(
      'filmingId', p_id, 'member', v_member, 'reason', v_reason, 'startsAt', v_starts, 'production', v_production
    ));
  end if;
end;
$$;

-- ───────────── RPC του Δελτίου ─────────────

-- Το Δελτίο (E3 και Συνεργείο). Μέλος του Συνεργείου βλέπει χωρίς Δικαίωμα «Συνεργείο»· πελάτης καθόλου.
create function public.filming_sheet_view(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_shots jsonb;
  v_note text;
  v_can boolean;
begin
  if not authz.is_team_user() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.filming_gate(p_id, authz.can_crew_filming(p_id) or authz.is_filming_crew(p_id), 'filming.crew');
  select s.shots, s.crew_note into v_shots, v_note from public.filming_sheets s where s.filming_id = p_id;
  v_can := authz.can_crew_filming(p_id)
           and exists (select 1 from public.filmings f where f.id = p_id and f.state in ('pending', 'scheduled'));
  return jsonb_build_object(
    'shots', coalesce(v_shots, '[]'::jsonb),
    'crewNote', v_note,
    'current', (
      select jsonb_build_object('version', v.version, 'issuedAt', v.issued_at, 'issuedBy', tu.name, 'change', v.change)
        from public.filming_sheet_versions v
        left join public.team_users tu on tu.user_id = v.issued_by
       where v.filming_id = p_id
       order by v.version desc limit 1
    ),
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object('version', v.version, 'issuedAt', v.issued_at,
                                          'issuedByName', tu.name, 'change', v.change)
                       order by v.version desc)
        from public.filming_sheet_versions v
        left join public.team_users tu on tu.user_id = v.issued_by
       where v.filming_id = p_id
    ), '[]'::jsonb),
    'hasChanges', authz.sheet_has_changes(p_id),
    'canEdit', v_can,
    'canIssue', v_can,
    'latest', (select v.snapshot from public.filming_sheet_versions v where v.filming_id = p_id order by v.version desc limit 1)
  );
end;
$$;

-- Αποθηκεύει λήψεις και σημείωση (μόνο ανοιχτό Γύρισμα). Ο Συνεργείος δεν αλλάζει το Γύρισμα με αυτό.
create function public.filming_sheet_save(p_id uuid, p_shots jsonb, p_crew_note text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_note text := nullif(trim(coalesce(p_crew_note, '')), '');
begin
  perform authz.require('filming.crew');
  perform authz.filming_gate(p_id, authz.can_crew_filming(p_id), 'filming.crew');
  perform authz.require_open_filming(p_id);
  if length(coalesce(v_note, '')) > 2000 then
    raise exception 'Η σημείωση για το Συνεργείο έχει έως 2000 χαρακτήρες' using errcode = 'P0001';
  end if;
  insert into public.filming_sheets (filming_id, shots, crew_note, updated_at, updated_by)
  values (p_id, authz.normalize_shots(p_shots), v_note, now(), auth.uid())
  on conflict (filming_id) do update
    set shots = excluded.shots, crew_note = excluded.crew_note, updated_at = now(), updated_by = auth.uid();
end;
$$;

-- Βγάζει νέα έκδοση του Δελτίου (μόνο ανοιχτό Γύρισμα, με Συνεργείο).
create function public.filming_sheet_issue(p_id uuid, p_change text) returns integer
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('filming.crew');
  perform authz.filming_gate(p_id, authz.can_crew_filming(p_id), 'filming.crew');
  perform authz.require_open_filming(p_id);
  return authz.sheet_issue(p_id, p_change);
end;
$$;

-- Το E3 δείχνει την έκδοση και αν υπάρχουν αλλαγές (μόνο για ομάδα με Συνεργείο ή μέλος του).
create or replace function public.filming_view(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_filming_viewer();
  perform authz.filming_gate(p_id, authz.can_see_filming(p_id), 'filming.view');
  return authz.filming_card(p_id) || jsonb_build_object('sheet', authz.filming_sheet_summary(p_id));
end;
$$;

-- ───────────── Δικαιώματα εκτέλεσης ─────────────

revoke all on function
  public.filming_sheet_view(uuid),
  public.filming_sheet_save(uuid, jsonb, text),
  public.filming_sheet_issue(uuid, text)
  from public, anon, authenticated;

grant execute on function
  public.filming_sheet_view(uuid),
  public.filming_sheet_save(uuid, jsonb, text),
  public.filming_sheet_issue(uuid, text)
  to authenticated;

revoke all on table public.filming_sheets, public.filming_sheet_versions from anon, authenticated;

-- ───────────── Ίχνος ─────────────

-- Ξαναγράφεται ΟΛΟΚΛΗΡΗ η λίστα (default deny). Προστέθηκαν τα δύο Δελτία, χωρίς ποσά.
create or replace function authz.audit_entity_allowed(p_entity text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_entity
    -- Κατάλογος: ποσά και κόστος
    when 'catalogue_item_costs' then authz.has('finance.cost')
    when 'cost_months' then authz.has('finance.cost')
    when 'cost_settings' then authz.has('finance.cost')
    when 'catalogue_item_amounts' then authz.has('finance.amounts')
    -- Πρόσβαση και Ρυθμίσεις
    when 'roles' then true
    when 'role_permissions' then true
    when 'team_users' then true
    when 'team_user_roles' then true
    when 'company_settings' then true
    when 'bank_accounts' then true
    when 'readiness_confirmations' then true
    when 'system_state' then true
    -- Πωλήσεις: λίστες και ρυθμίσεις
    when 'sales_stages' then true
    when 'sales_sources' then true
    when 'sales_loss_reasons' then true
    when 'sales_activity_kinds' then true
    when 'sales_settings' then true
    -- Πωλήσεις: Πελάτες και Ευκαιρίες (το Εύρος κρίνεται ανά εγγραφή στο authz.audit_row_allowed)
    when 'clients' then true
    when 'client_duplicate_flags' then true
    when 'opportunities' then true
    when 'access_requests' then true
    -- Κατάλογος
    when 'provision_kinds' then true
    when 'catalogue_items' then true
    when 'catalogue_item_provisions' then true
    -- Συμφωνίες: ποσά και κόστος
    when 'agreement_line_costs' then authz.has('finance.cost')
    when 'agreement_costs' then authz.has('finance.cost') and authz.has('finance.amounts')
    when 'agreement_amounts' then authz.has('finance.amounts')
    when 'agreement_line_amounts' then authz.has('finance.amounts')
    when 'agreement_defaults' then authz.has('finance.amounts')
    -- Συμφωνίες: χωρίς ποσά (Σύνδεσμοι, κωδικοί, εξερχόμενα, έγγραφα και αναθεωρήσεις δεν γράφονται ποτέ στο Ίχνος)
    when 'agreements' then true
    when 'agreement_revision_limits' then true
    when 'agreement_milestones' then true
    when 'agreement_lines' then true
    when 'agreement_line_provisions' then true
    when 'agreement_recipients' then true
    when 'agreement_signatures' then true
    -- Εξοπλισμός: χωρίς ποσά
    when 'equipment_categories' then true
    when 'equipment_items' then true
    when 'equipment_templates' then true
    when 'equipment_template_items' then true
    -- Περίοδοι και Παραγωγές: χωρίς ποσά
    when 'agreement_periods' then true
    when 'agreement_period_provisions' then true
    when 'productions' then true
    when 'production_members' then true
    -- Γυρίσματα: χωρίς ποσά
    when 'filmings' then true
    when 'filming_crew' then true
    when 'filming_equipment' then true
    when 'crew_templates' then true
    when 'crew_template_members' then true
    when 'filming_settings' then true
    when 'filming_sheets' then true
    when 'filming_sheet_versions' then true
    -- Ωράριο κρατήσεων: μόνο για όσους ορίζουν το Ωράριο
    when 'booking_week' then authz.has('settings.manage')
    when 'booking_exceptions' then authz.has('settings.manage')
    -- Προσκλήσεις, Χρήστες πελάτη και ουρά email (#107): χωρίς ποσά· το email μόνο για τον Ιδιοκτήτη
    when 'access' then true
    when 'invitations' then true
    when 'client_users' then true
    when 'email_outbox' then authz.is_owner()
    when 'email_log' then authz.is_owner()
    -- Κλεισμένος χρόνος: με τίτλο μόνο για όσους κλείνουν χρόνο άλλων
    when 'blocked_times' then authz.has('calendar.block_others')
    else false
  end;
$$;

-- ───────────── Συνεργείο: κλεισμένος χρόνος και έκδοση απάντησης ─────────────

-- Αντικαθιστά το 20261011100000: κάθε μέλος παίρνει και την έκδοση στην οποία απάντησε.
create or replace function authz.filming_crew_json(p_filming uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'userId', c.user_id, 'name', u.name, 'response', c.response, 'reason', c.reason, 'respondedAt', c.responded_at, 'version', c.version,
           'isBlocked', authz.user_blocked_at(c.user_id, f.starts_at, authz.filming_end(f.starts_at, f.hours))
         ) order by lower(u.name), c.user_id), '[]'::jsonb)
    from public.filming_crew c
    join public.team_users u on u.user_id = c.user_id
    join public.filmings f on f.id = c.filming_id
   where c.filming_id = p_filming;
$$;

-- ───────────── Μετακίνηση και Συνεργείο ─────────────

-- Αντικαθιστά το 20261010120000: με έκδοση, η μετακίνηση δεν μηδενίζει τις απαντήσεις· μηδενίζει η επόμενη έκδοση.
create or replace function authz.filming_move(p_id uuid, p_starts timestamptz, p_hours numeric) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_agreement uuid;
  v_place record;
  v_extra boolean;
  v_reset boolean;
  v_user uuid;
  v_name text;
begin
  select x.* into f from public.filmings x where x.id = p_id for update;
  if f.state not in ('pending', 'scheduled') then
    raise exception 'Μόνο ανοιχτό Γύρισμα μετατίθεται' using errcode = 'P0001';
  end if;
  perform authz.require_filming_slot(p_starts, p_hours);
  select pr.agreement_id into v_agreement from public.productions pr where pr.id = f.production_id;
  if v_agreement is null then
    update public.filmings x set starts_at = p_starts, hours = p_hours where x.id = p_id;
  else
    select * into v_place from authz.filming_place(v_agreement, p_starts);
    if not found then
      raise exception 'Η νέα μέρα δεν πέφτει σε Περίοδο της Συμφωνίας' using errcode = 'P0001';
    end if;
    perform authz.require_production_open(v_place.r_production);
    -- Το ίδιο το Γύρισμα εξαιρείται από το υπόλοιπο: σηκώνεται προσωρινά το is_extra, ώστε να μην μετράει η παλιά του ώρα.
    update public.filmings x
       set production_id = v_place.r_production, period_id = v_place.r_period, starts_at = p_starts,
           hours = p_hours, is_extra = true
     where x.id = p_id;
    v_extra := v_place.r_outside or f.kind_id is null
      or authz.filming_available(v_agreement, v_place.r_period, f.kind_id)
         < authz.filming_need(v_agreement, v_place.r_period, f.kind_id, p_hours, p_starts);
    update public.filmings x set is_extra = v_extra where x.id = p_id;
  end if;
  -- Κάθε μέλος του Συνεργείου ελέγχεται στη νέα ώρα (όπως στο ρητό Συνεργείο).
  for v_user in select c.user_id from public.filming_crew c where c.filming_id = p_id loop
    if authz.crew_clash(v_user, p_id) then
      select u.name into v_name from public.team_users u where u.user_id = v_user;
      raise exception 'Το άτομο % έχει άλλο Γύρισμα αυτή την ώρα', v_name using errcode = 'P0001';
    end if;
  end loop;
  select coalesce(s.change_resets_confirmations, false)
         and not exists (select 1 from public.filming_sheet_versions v where v.filming_id = p_id)
    into v_reset from public.filming_settings s where s.id;
  if v_reset then
    update public.filming_crew c set response = 'pending', reason = null, responded_at = null, version = null
     where c.filming_id = p_id;
  end if;
  update public.filmings x
     set reschedule_starts_at = null, reschedule_hours = null, reschedule_requested_at = null, reschedule_requested_by = null
   where x.id = p_id and x.reschedule_starts_at is not null;
  perform authz.filming_event(p_id, 'rescheduled', jsonb_build_object('from', f.starts_at, 'to', p_starts, 'hours', p_hours));
  perform authz.sheet_changed(p_id, 'Άλλαξε η μέρα ή η ώρα');
end;
$$;

-- Αντικαθιστά το 20261009210000: με έκδοση, η αλλαγή Συνεργείου δεν μηδενίζει τις απαντήσεις.
create or replace function authz.filming_crew_write(p_filming uuid, p_users uuid[], p_lenient boolean) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
  v_name text;
  v_valid uuid[] := '{}';
  v_skipped jsonb := '[]'::jsonb;
  v_added uuid[];
  v_removed uuid[];
  v_new uuid[];
  v_reset boolean := coalesce((select s.change_resets_confirmations from public.filming_settings s where s.id), false)
    and not exists (select 1 from public.filming_sheet_versions v where v.filming_id = p_filming);
begin
  perform authz.assert_distinct_ids(p_users);
  v_new := array(select x from unnest(coalesce(p_users, '{}'::uuid[])) x
                  where not exists (select 1 from public.filming_crew c where c.filming_id = p_filming and c.user_id = x));
  foreach v_user in array coalesce(p_users, '{}'::uuid[]) loop
    select u.name into v_name from public.team_users u where u.user_id = v_user and u.is_active;
    if not found then
      if p_lenient then
        v_skipped := v_skipped || jsonb_build_object('userId', v_user, 'reason', 'inactive');
        continue;
      end if;
      raise exception 'Ο Χρήστης δεν βρέθηκε' using errcode = 'P0001';
    end if;
    if authz.crew_clash(v_user, p_filming) and (p_lenient or v_user = any (v_new)) then
      if p_lenient then
        v_skipped := v_skipped || jsonb_build_object('userId', v_user, 'name', v_name, 'reason', 'busy');
        continue;
      end if;
      raise exception 'Το άτομο % έχει άλλο Γύρισμα αυτή την ώρα', v_name using errcode = 'P0001';
    end if;
    v_valid := v_valid || v_user;
  end loop;
  v_added := array(select x from unnest(v_valid) x
                    where not exists (select 1 from public.filming_crew c where c.filming_id = p_filming and c.user_id = x));
  v_removed := array(select c.user_id from public.filming_crew c
                      where c.filming_id = p_filming and c.user_id <> all (v_valid));
  delete from public.filming_crew c where c.filming_id = p_filming and c.user_id = any (v_removed);
  insert into public.filming_crew (filming_id, user_id, added_by)
  select p_filming, x, auth.uid() from unnest(v_added) x;
  insert into public.production_members (production_id, user_id, added_by)
  select f.production_id, x, auth.uid()
    from public.filmings f cross join unnest(v_added) x
   where f.id = p_filming
     and not exists (select 1 from public.productions pr where pr.id = f.production_id and pr.owner_id = x)
  on conflict (production_id, user_id) do nothing;
  if cardinality(v_added) > 0 or cardinality(v_removed) > 0 then
    if v_reset then
      update public.filming_crew c set response = 'pending', reason = null, responded_at = null, version = null
       where c.filming_id = p_filming;
    end if;
    perform authz.filming_event(p_filming, 'crew_changed',
      jsonb_build_object('added', to_jsonb(v_added), 'removed', to_jsonb(v_removed)));
  end if;
  return jsonb_build_object('skipped', v_skipped);
end;
$$;
