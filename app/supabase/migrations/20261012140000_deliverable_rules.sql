-- Κανόνες Παραδοτέων (#141): εσωτερικός έλεγχος, προθεσμία μετά από αλλαγές, υπενθυμίσεις, και ανά είδος Παροχής
-- η προθεσμία και το όριο αλλαγών. Κεφ. 3 (Παραδοτέα), 5 (Ρυθμίσεις), ADR 0015 (Κανόνες ως μία γραμμή).
--
-- Αρχές:
--  • Οι Κανόνες είναι μία γραμμή (deliverable_settings), όπως οι Κανόνες γυρισμάτων· κλειστή για την εφαρμογή.
--  • Η προθεσμία ανά είδος μπαίνει στο provision_kinds (όπως το όριο αλλαγών). Το όριο αλλαγών υπάρχει ήδη εκεί και
--    αντιγράφεται στη νέα Συμφωνία (agreement_create)· οι υπογεγραμμένες Συμφωνίες δεν αλλάζουν.
--  • Προβολή: deliverables.work ή deliverables.review ή settings.manage. Αποθήκευση: settings.manage (όπως τα Γυρίσματα).
--  • Ίχνος: deliverable_settings ελέγχεται από authz.audit_entity_allowed (χωρίς ποσά).

-- ───────────── Κανόνες (μία γραμμή) ─────────────

-- Ακέραιες μέρες υπενθύμισης αύξουσα σειρά, 1 έως 60, έως 5 τιμές (χωρίς διπλότυπα).
create function authz.reminder_days_valid(p_days integer[]) returns boolean
language sql immutable set search_path = ''
as $$
  select cardinality(p_days) <= 5
     and not exists (select 1 from unnest(p_days) d where d < 1 or d > 60)
     and not exists (select 1 from generate_subscripts(p_days, 1) i where i > 1 and p_days[i] <= p_days[i - 1]);
$$;

create table public.deliverable_settings (
  id boolean primary key default true check (id),
  internal_review boolean not null default true,
  changes_days integer not null default 2 check (changes_days between 0 and 30),
  reminder_days integer[] not null default '{3,7}' check (authz.reminder_days_valid(reminder_days)),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into public.deliverable_settings default values;

alter table public.deliverable_settings enable row level security;

-- ───────────── Προθεσμία ανά είδος Παροχής ─────────────

-- Η προθεσμία ορίζεται μόνο για είδη πλήθους (measure is null)· το κρατά η deliverable_settings_save. Το όριο αλλαγών (revision_limit) υπάρχει ήδη.
alter table public.provision_kinds add column deadline_days smallint check (deadline_days between 1 and 90);

-- Αρχικές τιμές χωρίς Ίχνος για την αρχική ρύθμιση (όπως τα υπόλοιπα seeds).
alter table public.provision_kinds disable trigger provision_kinds_audit;
update public.provision_kinds set deadline_days = case code
    when 'reel' then 5 when 'video' then 10 when 'photo' then 3 when 'podcast_episode' then 5 else 5 end
 where measure is null;
alter table public.provision_kinds enable trigger provision_kinds_audit;

-- ───────────── Αντικατάσταση σταθερών (hooks του #140) ─────────────

create or replace function authz.deliverable_rule_internal_review() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select s.internal_review from public.deliverable_settings s where s.id), true);
$$;

create or replace function authz.deliverable_kind_days(p_kind uuid) returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce((select k.deadline_days from public.provision_kinds k where k.id = p_kind), 5)::integer;
$$;

create function authz.deliverable_changes_days() returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce((select s.changes_days from public.deliverable_settings s where s.id), 2);
$$;

create function authz.deliverable_reminder_days() returns integer[]
language sql stable security definer set search_path = ''
as $$
  select coalesce((select s.reminder_days from public.deliverable_settings s where s.id), '{3,7}'::integer[]);
$$;

-- ───────────── Ανάγνωση και αποθήκευση (validators με δικό τους μήνυμα) ─────────────

create function authz.deliverable_bool(p_json jsonb, p_key text, p_current boolean) returns boolean
language plpgsql immutable set search_path = ''
as $$
begin
  if not (p_json ? p_key) then
    return p_current;
  end if;
  if jsonb_typeof(p_json -> p_key) <> 'boolean' then
    raise exception 'Μη έγκυρη τιμή στους Κανόνες Παραδοτέων' using errcode = 'P0001';
  end if;
  return (p_json ->> p_key)::boolean;
end;
$$;

create function authz.deliverable_int(p_json jsonb, p_key text, p_current integer, p_min integer, p_max integer) returns integer
language plpgsql immutable set search_path = ''
as $$
declare
  v_value numeric;
begin
  if not (p_json ? p_key) then
    return p_current;
  end if;
  if jsonb_typeof(p_json -> p_key) <> 'number' then
    raise exception 'Μη έγκυρη τιμή στους Κανόνες Παραδοτέων' using errcode = 'P0001';
  end if;
  v_value := (p_json ->> p_key)::numeric;
  if v_value <> trunc(v_value) then
    raise exception 'Η τιμή πρέπει να είναι ακέραιος αριθμός στους Κανόνες Παραδοτέων' using errcode = 'P0001';
  end if;
  if v_value < p_min or v_value > p_max then
    raise exception 'Η τιμή είναι εκτός ορίων στους Κανόνες Παραδοτέων' using errcode = 'P0001';
  end if;
  return v_value::integer;
end;
$$;

create function authz.deliverable_days(p_json jsonb, p_key text, p_current integer[]) returns integer[]
language plpgsql immutable set search_path = ''
as $$
declare
  v_days integer[];
begin
  if not (p_json ? p_key) then
    return p_current;
  end if;
  if jsonb_typeof(p_json -> p_key) <> 'array' then
    raise exception 'Οι υπενθυμίσεις θέλουν λίστα αριθμών' using errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_array_elements(p_json -> p_key) e where jsonb_typeof(e) <> 'number') then
    raise exception 'Οι υπενθυμίσεις θέλουν λίστα αριθμών' using errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_array_elements(p_json -> p_key) e where (e #>> '{}')::numeric <> trunc((e #>> '{}')::numeric)) then
    raise exception 'Οι υπενθυμίσεις θέλουν ακέραιες μέρες' using errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_array_elements(p_json -> p_key) e where (e #>> '{}')::numeric not between 1 and 60) then
    raise exception 'Οι υπενθυμίσεις είναι από 1 έως 60 μέρες' using errcode = 'P0001';
  end if;
  select coalesce(array_agg((e #>> '{}')::integer order by o), '{}'::integer[]) into v_days
    from jsonb_array_elements(p_json -> p_key) with ordinality as x (e, o);
  if not authz.reminder_days_valid(v_days) then
    raise exception 'Οι υπενθυμίσεις θέλουν αύξουσα σειρά, χωρίς διπλότυπα, έως 5 τιμές' using errcode = 'P0001';
  end if;
  return v_days;
end;
$$;

-- Ένα είδος Παροχής πλήθους: προθεσμία 1–90 μέρες και όριο αλλαγών 1–20 (ή κανένα, null).
create function authz.save_deliverable_kind(p_kind jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  k public.provision_kinds;
begin
  if coalesce(jsonb_typeof(p_kind), '') <> 'object' or coalesce(jsonb_typeof(p_kind -> 'id'), '') <> 'string' then
    raise exception 'Μη έγκυρο είδος Παροχής στους Κανόνες Παραδοτέων' using errcode = 'P0001';
  end if;
  select x.* into k from public.provision_kinds x
   where x.id::text = p_kind ->> 'id' and x.retired_at is null and x.measure is null;
  if not found then
    raise exception 'Το είδος δεν μετράει σε πλήθος ή έχει αποσυρθεί' using errcode = 'P0001';
  end if;
  update public.provision_kinds x set
    deadline_days = authz.deliverable_int(p_kind, 'deadlineDays', coalesce(k.deadline_days, 5)::integer, 1, 90)::smallint,
    revision_limit = case when jsonb_typeof(p_kind -> 'revisionLimit') = 'null' then null
                          else authz.deliverable_int(p_kind, 'revisionLimit', k.revision_limit::integer, 1, 20)::smallint end
   where x.id = k.id;
end;
$$;

create function authz.save_deliverable_kinds(p_kinds jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_kind jsonb;
begin
  if jsonb_typeof(p_kinds) <> 'array' then
    raise exception 'Τα είδη Παροχής θέλουν λίστα' using errcode = 'P0001';
  end if;
  for v_kind in select e from jsonb_array_elements(p_kinds) e loop
    perform authz.save_deliverable_kind(v_kind);
  end loop;
end;
$$;

-- Οι προεπιλογές του συστήματος (η αρχική ρύθμιση των seeds). Ίδιες τιμές με τα seeds παραπάνω.
create function authz.deliverable_defaults_json() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'internalReview', true,
    'changesDays', 2,
    'reminderDays', '[3, 7]'::jsonb,
    'kinds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', k.id,
        'deadlineDays', case k.code when 'reel' then 5 when 'video' then 10 when 'photo' then 3 when 'podcast_episode' then 5 else 5 end,
        'revisionLimit', case k.code when 'reel' then 2 when 'video' then 2 when 'photo' then 1 when 'podcast_episode' then 1 end
      ) order by k.sort, k.id)
        from public.provision_kinds k where k.measure is null and k.retired_at is null
    ), '[]'::jsonb)
  );
$$;

-- Όσα δεν λείπουν από το αντικείμενο μένουν όπως είναι.
create function authz.deliverable_settings_json() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'internalReview', s.internal_review,
    'changesDays', s.changes_days,
    'reminderDays', to_jsonb(s.reminder_days),
    'kinds', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', k.id, 'label', k.label, 'deadlineDays', coalesce(k.deadline_days, 5), 'revisionLimit', k.revision_limit
      ) order by k.sort, k.id), '[]'::jsonb)
        from public.provision_kinds k where k.measure is null and k.retired_at is null
    ),
    'defaults', authz.deliverable_defaults_json()
  )
  from public.deliverable_settings s where s.id;
$$;

create function authz.can_view_deliverable_rules() returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.has('deliverables.work') or authz.has('deliverables.review') or authz.has('settings.manage');
$$;

-- ───────────── RPC (ο έλεγχος Δικαιώματος πρώτα) ─────────────

create function public.deliverable_settings_view() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.can_view_deliverable_rules() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.deliverable_settings_json();
end;
$$;

-- Μερική ενημέρωση. Οι Κανόνες Παραδοτέων αποθηκεύονται μαζί με τα είδη Παροχής τους (kinds).
create function public.deliverable_settings_save(p_settings jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s public.deliverable_settings;
  v jsonb := coalesce(p_settings, '{}'::jsonb);
begin
  perform authz.require('settings.manage');
  if jsonb_typeof(v) <> 'object' then
    raise exception 'Οι Κανόνες Παραδοτέων θέλουν αντικείμενο' using errcode = 'P0001';
  end if;
  select x.* into s from public.deliverable_settings x where x.id;
  update public.deliverable_settings x set
    internal_review = authz.deliverable_bool(v, 'internalReview', s.internal_review),
    changes_days = authz.deliverable_int(v, 'changesDays', s.changes_days, 0, 30),
    reminder_days = authz.deliverable_days(v, 'reminderDays', s.reminder_days)
   where x.id;
  if v ? 'kinds' then
    perform authz.save_deliverable_kinds(v -> 'kinds');
  end if;
end;
$$;

-- ───────────── Κανόνες (triggers) ─────────────

create trigger deliverable_settings_stamp before insert or update on public.deliverable_settings
  for each row execute function authz.stamp_equipment_row();

create function authz.guard_deliverable_settings() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  raise exception 'Οι Κανόνες Παραδοτέων δεν σβήνονται' using errcode = 'P0001';
  return null;
end;
$$;

create trigger deliverable_settings_guard before delete on public.deliverable_settings
  for each row execute function authz.guard_deliverable_settings();

-- ───────────── Ίχνος ─────────────

create trigger deliverable_settings_audit after insert or delete on public.deliverable_settings
  for each row execute function authz.audit_row('id');
create trigger deliverable_settings_audit_update after update on public.deliverable_settings
  for each row when (old.* is distinct from new.*) execute function authz.audit_row('id');

-- ───────────── Δικαιώματα ─────────────

-- Όλα τα νέα authz κλειστά· οι RPC τρέχουν ως ιδιοκτήτης και τα καλούν μέσα τους. Τα hooks ξαναδηλώνονται ίδια.
revoke all on function
  authz.deliverable_rule_internal_review(), authz.deliverable_kind_days(uuid),
  authz.reminder_days_valid(integer[]), authz.deliverable_changes_days(), authz.deliverable_reminder_days(),
  authz.deliverable_bool(jsonb, text, boolean), authz.deliverable_int(jsonb, text, integer, integer, integer),
  authz.deliverable_days(jsonb, text, integer[]), authz.save_deliverable_kind(jsonb), authz.save_deliverable_kinds(jsonb),
  authz.deliverable_settings_json(), authz.deliverable_defaults_json(), authz.can_view_deliverable_rules(),
  authz.guard_deliverable_settings()
  from public, anon, authenticated;

revoke all on function public.deliverable_settings_view(), public.deliverable_settings_save(jsonb) from public, anon;
grant execute on function public.deliverable_settings_view(), public.deliverable_settings_save(jsonb) to authenticated;

revoke all on table public.deliverable_settings from anon, authenticated;

-- ───────────── Ίχνος: ολόκληρη η λίστα (από το #140) με το deliverable_settings ─────────────

create or replace function authz.audit_entity_allowed(p_entity text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_entity
    -- Κατάλογος: ποσά και κόστος
    when 'catalogue_item_costs' then authz.has('finance.cost')
    when 'cost_months' then authz.has('finance.cost')
    when 'cost_settings' then authz.has('finance.cost')
    when 'production_costs' then authz.has('finance.cost')
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
    when 'filming_sheets' then true
    when 'filming_sheet_versions' then true
    when 'google_calendar' then authz.has('calendar.google')
    when 'google_deletions' then authz.has('calendar.google')
    -- Παραδοτέα (#140): χωρίς ποσά
    when 'deliverables' then true
    when 'deliverable_versions' then true
    when 'deliverable_comments' then true
    -- Κανόνες Παραδοτέων (#141): χωρίς ποσά
    when 'deliverable_settings' then true
    else false
  end;
$$;
