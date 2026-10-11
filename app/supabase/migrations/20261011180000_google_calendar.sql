-- Google Calendar (C2δ, #138): κατάσταση, ουρά εγγραφών προς το Google, αντιστοιχίσεις και αλλαγές από το Google.
-- Η βάση δεν μιλά με το Google· την κλήση την κάνει ο worker (service role) μέσω των RPC εδώ.
--
-- Αρχές:
--  • Ουρά: κάθε αλλαγή Γυρίσματος ή DMS-Κλεισμένου χρόνου βάζει μία γραμμή· νέα γραμμή για το ίδιο αντικείμενο κλείνει τις ανοιχτές.
--  • Αλλαγή που ήρθε από το Google δεν ξαναγράφεται στο Google (σημαία «dms.google_apply» μόνο για τη συναλλαγή)· εξαίρεση η επαναφορά.
--  • Διαγραφή από το Google δεν είναι ακύρωση: μπαίνει σε προθεσμία και ο Χρήστης αποφασίζει.
--  • Πίνακες κλειστοί (RLS χωρίς policies, χωρίς grants)· όλα περνούν από RPC.

-- ───────────── Κανόνες Γυρισμάτων για Google (Ρυθμίσεις › Γυρίσματα, ADR 0015) ─────────────

alter table public.filming_settings
  add column google_new_event text not null default 'blocked' check (google_new_event in ('blocked', 'none')),
  add column google_delete_hours smallint not null default 24 check (google_delete_hours in (12, 24, 48)),
  add column google_write_pending boolean not null default true;

-- Κλεισμένος χρόνος: από πού ήρθε. Ο τίτλος του Google δεν αποθηκεύεται (κόβεται ή αγνοείται στον worker).
alter table public.blocked_times
  add column source text not null default 'dms' check (source in ('dms', 'google'));

-- ───────────── Πίνακες ─────────────

-- Μία γραμμή: ημερολόγιο, κατάσταση συγχρονισμού και κανάλι ειδοποιήσεων.
create table public.google_calendar (
  id boolean primary key default true check (id),
  calendar_id text check (length(trim(calendar_id)) > 0),
  shared_with text check (length(trim(shared_with)) > 0),
  sync_token text,
  channel_id text,
  -- sha256 hex του token του καναλιού· το ίδιο το token δεν αποθηκεύεται.
  channel_token_hash text,
  channel_resource_id text,
  channel_expires_at timestamptz,
  last_sync_at timestamptz,
  last_error text check (last_error is null or length(last_error) <= 500),
  last_error_at timestamptz
);

insert into public.google_calendar (id) values (true);

-- Αντιστοίχιση DMS ↔ Google. Ένα γεγονός μπορεί να αντιστοιχεί σε πολλούς Κλεισμένους χρόνους (καλεσμένα μέλη).
create table public.google_links (
  entity text not null check (entity in ('filming', 'blocked')),
  entity_id uuid not null,
  event_id text not null check (length(event_id) > 0),
  etag text,
  written_at timestamptz not null default now(),
  primary key (entity, entity_id)
);

create index google_links_event_idx on public.google_links (event_id);

-- Ουρά εγγραφών προς το Google. Ο worker την παίρνει με google_outbox_claim.
create table public.google_outbox (
  id bigserial primary key,
  entity text not null check (entity in ('filming', 'blocked')),
  entity_id uuid not null,
  op text not null check (op in ('upsert', 'delete')),
  created_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text not null default '' check (length(last_error) <= 500),
  done_at timestamptz
);

create index google_outbox_open_idx on public.google_outbox (next_attempt_at, id) where done_at is null;
create index google_outbox_entity_open_idx on public.google_outbox (entity, entity_id) where done_at is null;

-- Γύρισμα που διαγράφηκε από το Google και περιμένει απόφαση. Μία γραμμή ανά Γύρισμα.
create table public.google_deletions (
  filming_id uuid primary key references public.filmings (id),
  event_id text not null,
  detected_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  resolved_at timestamptz,
  resolution text check (resolution in ('restored', 'confirmed', 'expired')),
  resolved_by uuid,
  reason text check (reason is null or length(trim(reason)) > 0),
  check ((resolved_at is null) = (resolution is null))
);

create index google_deletions_open_idx on public.google_deletions (deadline_at) where resolved_at is null;

-- «Πρόσφατα από το Google». Η ανάγνωση κρατά τις τελευταίες 30 μέρες.
create table public.google_activity (
  id bigserial primary key,
  at timestamptz not null default now(),
  kind text not null check (kind in ('move_applied', 'move_rejected', 'new_event', 'blocked_changed', 'deletion_detected', 'restored')),
  filming_id uuid,
  blocked_id uuid,
  message text not null default '' check (length(message) <= 500)
);

create index google_activity_at_idx on public.google_activity (at desc);

alter table public.google_calendar enable row level security;
alter table public.google_links enable row level security;
alter table public.google_outbox enable row level security;
alter table public.google_deletions enable row level security;
alter table public.google_activity enable row level security;

revoke all on table public.google_calendar, public.google_links, public.google_outbox,
  public.google_deletions, public.google_activity from anon, authenticated;

-- ───────────── Βοηθητικά ─────────────

-- Η σημαία της συναλλαγής: αλλαγή που ήρθε από το Google δεν ξαναγράφεται στο Google.
create function authz.google_applying() returns boolean
language sql stable set search_path = ''
as $$ select coalesce(current_setting('dms.google_apply', true), '') = 'on'; $$;

-- Ώρα ISO με Ώρα Ελλάδας (π.χ. 2027-01-05T10:00:00+02:00).
create function authz.google_iso(p_at timestamptz) returns text
language sql stable set search_path = ''
as $$
  select to_char(timezone('Europe/Athens', p_at), 'YYYY-MM-DD"T"HH24:MI:SS')
      || '+' || lpad((extract(epoch from (timezone('Europe/Athens', p_at) - timezone('UTC', p_at))) / 3600)::int::text, 2, '0')
      || ':00';
$$;

-- Αρχή και τέλος ενός γεγονότος του Google. Ολοήμερο: ημερομηνίες, που γίνονται μέρες Ώρας Ελλάδας.
create function authz.google_event_start(p_event jsonb) returns timestamptz
language sql stable set search_path = ''
as $$
  select case when coalesce((p_event ->> 'allDay')::boolean, false)
              then (p_event ->> 'start')::date::timestamp at time zone 'Europe/Athens'
              else (p_event ->> 'start')::timestamptz end;
$$;

create function authz.google_event_end(p_event jsonb) returns timestamptz
language sql stable set search_path = ''
as $$
  select case when coalesce((p_event ->> 'allDay')::boolean, false)
              then (p_event ->> 'end')::date::timestamp at time zone 'Europe/Athens'
              else (p_event ->> 'end')::timestamptz end;
$$;

create function authz.google_backoff_minutes(p_attempts integer) returns integer
language sql immutable set search_path = ''
as $$
  select case when p_attempts <= 1 then 1 when p_attempts = 2 then 5 when p_attempts = 3 then 15 else 60 end;
$$;

create function authz.google_log(p_kind text, p_message text, p_filming uuid, p_blocked uuid) returns void
language sql security definer set search_path = ''
as $$
  insert into public.google_activity (kind, message, filming_id, blocked_id) values (p_kind, p_message, p_filming, p_blocked);
$$;

-- Μέλη της ομάδας με αυτά τα email (ενεργά).
create function authz.google_members_by_email(p_emails text[]) returns uuid[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(t.user_id order by t.user_id), '{}'::uuid[])
    from public.team_users t
   where t.is_active and lower(t.email) = any (p_emails);
$$;

-- Καλεσμένα μέλη της ομάδας· αν δεν υπάρχει κανένα, ο δημιουργός αν είναι μέλος (Ν4).
create function authz.google_event_members(p_event jsonb) returns uuid[]
language sql stable security definer set search_path = ''
as $$
  select case when cardinality(a.attendees) > 0 then a.attendees
              else authz.google_members_by_email(array[lower(coalesce(p_event ->> 'organizer', ''))]) end
    from (
      select authz.google_members_by_email(array(
               select lower(x) from jsonb_array_elements_text(coalesce(p_event -> 'attendees', '[]'::jsonb)) as x
             )) as attendees
    ) a;
$$;

-- Συνεργείο ελεύθερο στο [p_starts, p_ends): ούτε κλεισμένος χρόνος, ούτε άλλο ανοιχτό Γύρισμα.
create function authz.google_crew_free(p_filming uuid, p_starts timestamptz, p_ends timestamptz) returns boolean
language sql stable security definer set search_path = ''
as $$
  select not exists (
    select 1
      from public.filming_crew c
     where c.filming_id = p_filming
       and (
         authz.user_blocked_at(c.user_id, p_starts, p_ends)
         or exists (
           select 1
             from public.filming_crew c2
             join public.filmings g on g.id = c2.filming_id
            where c2.user_id = c.user_id and g.id <> p_filming and g.state in ('pending', 'scheduled')
              and g.starts_at < p_ends and p_starts < authz.filming_end(g.starts_at, g.hours)
         )
       )
  );
$$;

-- Τίτλος Γυρισμάτος όπως φαίνεται στο Google: Πελάτης ή Παραγωγή · Είδος.
create function authz.google_filming_title(p_filming uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select concat_ws(' · ', coalesce(c.name, pr.title), k.label)
    from public.filmings f
    join public.productions pr on pr.id = f.production_id
    left join public.clients c on c.id = f.client_id
    left join public.provision_kinds k on k.id = f.kind_id
   where f.id = p_filming;
$$;

-- Γεγονός Γυρισμάτος για το Google. Χωρίς εσωτερικές σημειώσεις· η περιγραφή έχει μόνο τη διαδρομή.
create function authz.google_event_for_filming(p_filming uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'summary', case when f.state = 'pending' then '(αναμένει) ' else '' end
               || concat_ws(' · ', authz.google_filming_title(f.id),
                    case f.state when 'done' then 'έγινε' when 'no_show' then 'δεν έγινε' end),
    'description', '/app/filming/' || f.id::text,
    'location', coalesce(f.location, ''),
    'start', authz.google_iso(f.starts_at),
    'end', authz.google_iso(f.starts_at + make_interval(mins => (f.hours * 60)::integer)),
    'allDay', false)
    from public.filmings f
   where f.id = p_filming;
$$;

-- Γεγονός Κλεισμένου χρόνου για το Google: «<Όνομα>: Απασχολημένος», χωρίς τίτλο.
create function authz.google_event_for_blocked(p_blocked uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'summary', u.name || ': Απασχολημένος',
    'description', '',
    'location', '',
    'start', case when b.all_day then to_char(timezone('Europe/Athens', b.starts_at), 'YYYY-MM-DD')
                  else authz.google_iso(b.starts_at) end,
    'end', case when b.all_day then to_char(timezone('Europe/Athens', b.ends_at), 'YYYY-MM-DD')
                else authz.google_iso(b.ends_at) end,
    'allDay', b.all_day)
    from public.blocked_times b
    join public.team_users u on u.user_id = b.user_id
   where b.id = p_blocked;
$$;

-- Η ουρά: νέα γραμμή κλείνει τις ανοιχτές του ίδιου αντικειμένου. Μόνο όταν υπάρχει ημερολόγιο.
create function authz.google_queue(p_entity text, p_id uuid, p_op text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.google_calendar g where g.id and g.calendar_id is not null) then
    return;
  end if;
  update public.google_outbox set done_at = now()
   where entity = p_entity and entity_id = p_id and done_at is null;
  insert into public.google_outbox (entity, entity_id, op) values (p_entity, p_id, p_op);
end;
$$;

-- Γύρισμα: ακυρωμένο/απορριφθέν σβήνεται· αναμένει με «χωρίς αναμονή στο Google» σβήνεται αν υπάρχει· αλλιώς γράφεται.
create function authz.google_queue_filming(p_filming uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_write_pending boolean;
  v_op text;
begin
  select x.* into f from public.filmings x where x.id = p_filming;
  if not found then
    return;
  end if;
  select s.google_write_pending into v_write_pending from public.filming_settings s where s.id;
  v_op := case
    when f.state in ('cancelled', 'rejected') then 'delete'
    when f.state = 'pending' and not coalesce(v_write_pending, false) then 'delete'
    else 'upsert' end;
  if v_op = 'delete' and f.state = 'pending'
     and not exists (select 1 from public.google_links l where l.entity = 'filming' and l.entity_id = p_filming) then
    return;
  end if;
  perform authz.google_queue('filming', p_filming, v_op);
end;
$$;

-- Ο ίδιος ο έλεγχος Δικαιώματος για ανάγνωση: Ημερολόγιο Google ή Ρυθμίσεις.
create function authz.require_google_view() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (authz.has('calendar.google') or authz.has('settings.manage')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Η περίληψη για την Οθόνη Ημερολογίου (μόνο όσοι έχουν calendar.google).
create function authz.google_view_summary() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when authz.has('calendar.google') then jsonb_build_object(
      'connected', g.calendar_id is not null,
      'pendingWrites', (select count(*) from public.google_outbox o where o.done_at is null),
      'lastSyncAt', g.last_sync_at,
      'stale', exists (select 1 from public.google_outbox o where o.done_at is null and o.created_at < now() - interval '1 hour')
    ) end
    from public.google_calendar g
   where g.id;
$$;

-- Οι αλλαγές των Κανόνων και των ενεργειών: ο τίτλος του Google δεν μπαίνει στην ουρά.
create function authz.google_filming_changed() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if (old.starts_at, old.hours, old.location, old.state) is not distinct from (new.starts_at, new.hours, new.location, new.state) then
      return null;
    end if;
  end if;
  if not authz.google_applying() then
    perform authz.google_queue_filming(new.id);
  end if;
  return null;
end;
$$;

create function authz.google_blocked_changed() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.source = 'google' then
      delete from public.google_links where entity = 'blocked' and entity_id = old.id;
    elsif not authz.google_applying() then
      perform authz.google_queue('blocked', old.id, 'delete');
    end if;
    return null;
  end if;
  if new.source <> 'dms' or authz.google_applying() then
    return null;
  end if;
  if tg_op = 'INSERT' then
    perform authz.google_queue('blocked', new.id, 'upsert');
  elsif (old.starts_at, old.ends_at, old.all_day) is distinct from (new.starts_at, new.ends_at, new.all_day) then
    perform authz.google_queue('blocked', new.id, 'upsert');
  end if;
  return null;
end;
$$;

create trigger filmings_google_enqueue after insert or update on public.filmings
  for each row execute function authz.google_filming_changed();

create trigger blocked_times_google_enqueue after insert or update or delete on public.blocked_times
  for each row execute function authz.google_blocked_changed();

create trigger google_calendar_audit after insert or update on public.google_calendar
  for each row execute function authz.audit_row('id');

create trigger google_deletions_audit after insert or update on public.google_deletions
  for each row execute function authz.audit_row('filming_id');

-- ───────────── Ίχνος ─────────────

-- Ξαναγράφεται ΟΛΟΚΛΗΡΗ η λίστα (default deny). Η «calendar.google» βλέπει τις αλλαγές του ημερολογίου και τις διαγραφές.
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
    when 'google_calendar' then authz.has('calendar.google')
    when 'google_deletions' then authz.has('calendar.google')
    else false
  end;
$$;

-- ───────────── Αλλαγές από το Google (Ν4, Ν5) ─────────────

-- Γύρισμα που διαγράφηκε στο Google: μπαίνει σε προθεσμία (το πολύ ως την έναρξη). Η αντιστοίχιση σβήνει, το γεγονός δεν υπάρχει πια.
create function authz.google_detect_deletion(f public.filmings, p_event jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_hours integer;
  v_rows integer;
begin
  if f.state not in ('pending', 'scheduled') then
    return jsonb_build_object('action', 'noop');
  end if;
  select s.google_delete_hours into v_hours from public.filming_settings s where s.id;
  delete from public.google_links where entity = 'filming' and entity_id = f.id;
  insert into public.google_deletions (filming_id, event_id, detected_at, deadline_at)
  values (f.id, p_event ->> 'id', now(), least(now() + make_interval(hours => v_hours), f.starts_at))
  on conflict (filming_id) do update
     set event_id = excluded.event_id, detected_at = excluded.detected_at, deadline_at = excluded.deadline_at,
         resolved_at = null, resolution = null, resolved_by = null, reason = null
   where public.google_deletions.resolved_at is not null;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return jsonb_build_object('action', 'noop');
  end if;
  perform authz.google_log('deletion_detected', 'Γύρισμα διαγράφηκε από το Google', f.id, null);
  return jsonb_build_object('action', 'deletion_detected');
end;
$$;

-- Λόγος που δεν περνά η μετακίνηση: ελέγχεται στη διάρκεια, την Περίοδο και το Συνεργείο.
create function authz.google_move_problem(f public.filmings, p_starts timestamptz, p_hours numeric) returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_agreement uuid;
  v_place record;
begin
  if p_hours is null or p_hours < 0.5 or p_hours > 12 or p_hours * 2 <> trunc(p_hours * 2) then
    return 'η διάρκεια είναι από 0,5 έως 12 ώρες, ανά μισή ώρα';
  end if;
  select pr.agreement_id into v_agreement from public.productions pr where pr.id = f.production_id;
  if f.period_id is not null and v_agreement is not null then
    select * into v_place from authz.filming_place(v_agreement, p_starts);
    if not found or v_place.r_period is distinct from f.period_id then
      return 'η νέα ώρα δεν είναι στην ίδια Περίοδο';
    end if;
  end if;
  if not authz.google_crew_free(f.id, p_starts, authz.filming_end(p_starts, p_hours)) then
    return 'το Συνεργείο είναι απασχολημένο αυτή την ώρα';
  end if;
  return null;
end;
$$;

-- Επαναφορά στο Google (ρητά, ακόμα κι όταν η αλλαγή προήλθε από αυτό) και γεγονός.
create function authz.google_reject_move(f public.filmings, p_reason text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.google_queue_filming(f.id);
  perform authz.google_log('move_rejected', 'Μετακίνηση από το Google δεν πέρασε: ' || p_reason, f.id, null);
  return jsonb_build_object('action', 'move_rejected', 'reason', p_reason);
end;
$$;

-- Η μετακίνηση περνά μέσω της κοινής authz.filming_move, υπό τη σημαία. Αν εκείνη απορρίψει (P0001), γίνεται επαναφορά.
create function authz.google_apply_move(f public.filmings, p_starts timestamptz, p_hours numeric) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform set_config('dms.google_apply', 'on', true);
  perform authz.filming_move(f.id, p_starts, p_hours);
  perform authz.google_log('move_applied', 'Γύρισμα μετακινήθηκε από το Google', f.id, null);
  return jsonb_build_object('action', 'move_applied');
exception when sqlstate 'P0001' then
  return authz.google_reject_move(f, sqlerrm);
end;
$$;

-- Γνωστό Γύρισμα: ακύρωση στο Google → διαγραφή σε προθεσμία· άλλη ώρα → μετακίνηση ή επαναφορά.
create function authz.google_apply_filming(p_event jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_starts timestamptz;
  v_ends timestamptz;
  v_hours numeric;
  v_problem text;
begin
  select x.* into f
    from public.filmings x
    join public.google_links l on l.entity = 'filming' and l.entity_id = x.id
   where l.event_id = p_event ->> 'id';
  if not found then
    return jsonb_build_object('action', 'noop');
  end if;
  if p_event ->> 'status' = 'cancelled' then
    return authz.google_detect_deletion(f, p_event);
  end if;
  if f.state not in ('pending', 'scheduled') then
    return jsonb_build_object('action', 'noop');
  end if;
  if coalesce((p_event ->> 'allDay')::boolean, false) then
    return authz.google_reject_move(f, 'ολοήμερο γεγονός δεν γίνεται Γύρισμα');
  end if;
  v_starts := authz.google_event_start(p_event);
  v_ends := authz.google_event_end(p_event);
  v_hours := extract(epoch from (v_ends - v_starts)) / 3600;
  if v_starts = f.starts_at and v_hours = f.hours then
    return jsonb_build_object('action', 'noop');
  end if;
  v_problem := authz.google_move_problem(f, v_starts, v_hours);
  if v_problem is not null then
    return authz.google_reject_move(f, v_problem);
  end if;
  return authz.google_apply_move(f, v_starts, v_hours);
end;
$$;

-- Γνωστός Κλεισμένος χρόνος: διαγραφή στο Google → σβήνεται· άλλη ώρα → ενημερώνεται χωρίς επαναγραφή.
create function authz.google_apply_blocked(p_event jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_ids uuid[];
  v_starts timestamptz := authz.google_event_start(p_event);
  v_ends timestamptz := authz.google_event_end(p_event);
  v_rows integer;
begin
  select coalesce(array_agg(l.entity_id), '{}'::uuid[]) into v_ids
    from public.google_links l
   where l.entity = 'blocked' and l.event_id = p_event ->> 'id';
  perform set_config('dms.google_apply', 'on', true);
  if p_event ->> 'status' = 'cancelled' then
    delete from public.google_links where entity = 'blocked' and event_id = p_event ->> 'id';
    delete from public.blocked_times where id = any (v_ids);
    perform authz.google_log('blocked_changed', 'Κλεισμένος χρόνος διαγράφηκε από το Google', null, v_ids[1]);
    return jsonb_build_object('action', 'blocked_deleted');
  end if;
  if v_ends is null or v_starts is null or v_ends <= v_starts or v_ends - v_starts > interval '60 days' then
    return jsonb_build_object('action', 'ignored_invalid');
  end if;
  update public.blocked_times
     set starts_at = v_starts, ends_at = v_ends, all_day = coalesce((p_event ->> 'allDay')::boolean, false)
   where id = any (v_ids) and (starts_at, ends_at) is distinct from (v_starts, v_ends);
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return jsonb_build_object('action', 'noop');
  end if;
  perform authz.google_log('blocked_changed', 'Κλεισμένος χρόνος άλλαξε ώρα από το Google', null, v_ids[1]);
  return jsonb_build_object('action', 'blocked_updated');
end;
$$;

-- Άγνωστο γεγονός: νέος Κλεισμένος χρόνος για τα μέλη που καλεί, αν ο Κανόνας το θέλει.
create function authz.google_apply_unknown(p_event jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_starts timestamptz := authz.google_event_start(p_event);
  v_ends timestamptz := authz.google_event_end(p_event);
  v_members uuid[];
  v_count integer;
begin
  if p_event ->> 'status' = 'cancelled' then
    return jsonb_build_object('action', 'ignored_cancelled');
  end if;
  if coalesce((p_event ->> 'recurring')::boolean, false) then
    return jsonb_build_object('action', 'ignored_recurring');
  end if;
  if not exists (select 1 from public.filming_settings s where s.id and s.google_new_event = 'blocked') then
    return jsonb_build_object('action', 'ignored_setting');
  end if;
  if v_starts is null or v_ends is null or v_ends <= v_starts or v_ends - v_starts > interval '60 days' then
    return jsonb_build_object('action', 'ignored_invalid');
  end if;
  v_members := authz.google_event_members(p_event);
  if cardinality(v_members) = 0 then
    return jsonb_build_object('action', 'ignored_no_member');
  end if;
  with created as (
    insert into public.blocked_times (user_id, starts_at, ends_at, all_day, source)
    select m, v_starts, v_ends, coalesce((p_event ->> 'allDay')::boolean, false), 'google'
      from unnest(v_members) as m
    returning id
  ), linked as (
    insert into public.google_links (entity, entity_id, event_id, etag, written_at)
    select 'blocked', c.id, p_event ->> 'id', p_event ->> 'etag', now() from created c
    returning entity_id
  )
  select count(*)::integer into v_count from linked;
  perform authz.google_log('new_event', 'Νέος κλεισμένος χρόνος από το Google', null, null);
  return jsonb_build_object('action', 'blocked_created', 'count', v_count);
end;
$$;

-- Είσοδος του worker: ένα γεγονός του Google. Το ίδιο etag δεν κάνει τίποτα.
create function public.google_apply_change(p_event jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_event_id text := p_event ->> 'id';
  v_known text;
  v_result jsonb;
begin
  if coalesce(v_event_id, '') = '' then
    raise exception 'Το γεγονός δεν έχει αναγνωριστικό' using errcode = 'P0001';
  end if;
  select l.entity into v_known from public.google_links l where l.event_id = v_event_id limit 1;
  if v_known is null then
    return authz.google_apply_unknown(p_event);
  end if;
  if exists (select 1 from public.google_links l where l.event_id = v_event_id and l.etag = p_event ->> 'etag') then
    return jsonb_build_object('action', 'noop');
  end if;
  v_result := case when v_known = 'filming'
                   then authz.google_apply_filming(p_event)
                   else authz.google_apply_blocked(p_event) end;
  update public.google_links set etag = p_event ->> 'etag' where event_id = v_event_id;
  return v_result;
end;
$$;

-- ───────────── RPC του worker (service role) ─────────────

create function public.google_state() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'calendarId', g.calendar_id, 'sharedWith', g.shared_with, 'syncToken', g.sync_token,
    'channelId', g.channel_id, 'channelResourceId', g.channel_resource_id, 'channelExpiresAt', g.channel_expires_at,
    'lastSyncAt', g.last_sync_at, 'lastError', g.last_error, 'lastErrorAt', g.last_error_at,
    'newEvent', s.google_new_event, 'deleteHours', s.google_delete_hours, 'writePending', s.google_write_pending)
    from public.google_calendar g, public.filming_settings s
   where g.id and s.id;
$$;

-- Ορίζει το ημερολόγιο· αν αλλάξει, οι αντιστοιχίσεις και ο δείκτης συγχρονισμού δεν ισχύουν πια.
create function public.google_set_calendar(p_calendar_id text, p_shared_with text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_changed boolean := p_calendar_id is distinct from (select g.calendar_id from public.google_calendar g where g.id);
begin
  if v_changed then
    delete from public.google_links;
  end if;
  update public.google_calendar
     set calendar_id = p_calendar_id, shared_with = p_shared_with,
         sync_token = case when v_changed then null else sync_token end,
         channel_id = case when v_changed then null else channel_id end,
         channel_token_hash = case when v_changed then null else channel_token_hash end,
         channel_resource_id = case when v_changed then null else channel_resource_id end,
         channel_expires_at = case when v_changed then null else channel_expires_at end
   where id;
end;
$$;

create function public.google_set_channel(p_channel_id text, p_token_hash text, p_resource_id text, p_expires_at timestamptz)
returns void
language sql security definer set search_path = ''
as $$
  update public.google_calendar
     set channel_id = p_channel_id, channel_token_hash = p_token_hash,
         channel_resource_id = p_resource_id, channel_expires_at = p_expires_at
   where id;
$$;

create function public.google_set_sync_token(p_token text) returns void
language sql security definer set search_path = ''
as $$ update public.google_calendar set sync_token = p_token where id; $$;

-- Αποτέλεσμα συγχρονισμού: επιτυχία καθαρίζει το σφάλμα· αποτυχία κρατά το τελευταίο.
create function public.google_mark_sync(p_ok boolean, p_error text) returns void
language sql security definer set search_path = ''
as $$
  update public.google_calendar
     set last_sync_at = case when p_ok then now() else last_sync_at end,
         last_error = case when p_ok then null else left(coalesce(p_error, ''), 500) end,
         last_error_at = case when p_ok then null else now() end
   where id;
$$;

-- Ελέγχει το token του καναλιού ειδοποιήσεων (sha256 hex, όπως ο σύνδεσμος ημερολογίου).
create function public.google_channel_check(p_channel_id text, p_token text) returns boolean
language sql security definer set search_path = ''
as $$
  select exists (
    select 1 from public.google_calendar g
     where g.id and g.channel_id = p_channel_id and g.channel_token_hash = authz.calendar_token_hash(p_token)
  );
$$;

-- Παραλαβή της ουράς: κλειδώνει τις ανοιχτές για 5 λεπτά και επιστρέφει ό,τι χρειάζεται για την κλήση στο Google.
create function public.google_outbox_claim(p_limit integer default 20) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_items jsonb;
begin
  with picked as (
    select o.id from public.google_outbox o
     where o.done_at is null and o.next_attempt_at <= now()
     order by o.id
     limit greatest(1, least(coalesce(p_limit, 20), 100))
     for update skip locked
  ), claimed as (
    update public.google_outbox o set next_attempt_at = now() + interval '5 minutes'
      from picked where o.id = picked.id
    returning o.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c.id, 'entity', c.entity, 'entityId', c.entity_id, 'op', c.op,
           'eventId', (select l.event_id from public.google_links l where l.entity = c.entity and l.entity_id = c.entity_id limit 1),
           'event', case when c.op = 'upsert' and c.entity = 'filming' then authz.google_event_for_filming(c.entity_id)
                         when c.op = 'upsert' then authz.google_event_for_blocked(c.entity_id) end
         ) order by c.id), '[]'::jsonb)
    into v_items
    from claimed c;
  return v_items;
end;
$$;

-- Αποτέλεσμα της κλήσης. Επιτυχία γράφει ή σβήνει την αντιστοίχιση (ακόμα κι αν η γραμμή έχει ήδη κλείσει)· αποτυχία κάνει οπισθοχώρηση.
create function public.google_outbox_done(p_id bigint, p_event_id text, p_etag text, p_error text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  o public.google_outbox;
  v_error text := left(coalesce(p_error, ''), 500);
begin
  select x.* into o from public.google_outbox x where x.id = p_id for update;
  if not found then
    return;
  end if;
  if v_error = '' then
    if o.op = 'delete' then
      delete from public.google_links where entity = o.entity and entity_id = o.entity_id;
    elsif p_event_id is not null then
      insert into public.google_links (entity, entity_id, event_id, etag, written_at)
      values (o.entity, o.entity_id, p_event_id, p_etag, now())
      on conflict (entity, entity_id) do update
         set event_id = excluded.event_id, etag = excluded.etag, written_at = excluded.written_at;
    end if;
    update public.google_outbox set done_at = coalesce(done_at, now()), last_error = '' where id = p_id;
    return;
  end if;
  if o.done_at is not null then
    return;
  end if;
  update public.google_outbox
     set attempts = attempts + 1, last_error = v_error,
         next_attempt_at = now() + make_interval(mins => authz.google_backoff_minutes(o.attempts + 1))
   where id = p_id;
end;
$$;

-- Γυρίσματα που διαγράφηκαν και έληξε η προθεσμία: ξαναγράφονται στο Google.
create function public.google_expire_deletions() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_deletion record;
  v_count integer := 0;
begin
  for v_deletion in
    select d.filming_id from public.google_deletions d
     where d.resolved_at is null and d.deadline_at <= now()
     for update
  loop
    update public.google_deletions set resolved_at = now(), resolution = 'expired'
     where filming_id = v_deletion.filming_id;
    perform authz.google_queue_filming(v_deletion.filming_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ───────────── RPC της εφαρμογής (Δικαίωμα πρώτα) ─────────────

create function public.google_view() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  g public.google_calendar;
  v_pending integer;
  v_oldest timestamptz;
  v_open integer;
begin
  perform authz.require_google_view();
  select x.* into g from public.google_calendar x where x.id;
  select count(*)::integer, min(o.created_at) into v_pending, v_oldest
    from public.google_outbox o where o.done_at is null;
  select count(*)::integer into v_open from public.google_deletions d where d.resolved_at is null;
  return jsonb_build_object(
    'connected', g.calendar_id is not null,
    'sharedWith', g.shared_with,
    'lastSyncAt', g.last_sync_at,
    'lastError', g.last_error,
    'lastErrorAt', g.last_error_at,
    'pendingWrites', v_pending,
    'oldestPendingAt', v_oldest,
    'pendingDeletions', v_open,
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object('at', a.at, 'kind', a.kind, 'message', a.message, 'filmingId', a.filming_id)
                       order by a.at desc, a.id desc)
        from (
          select x.* from public.google_activity x
           where x.at > now() - interval '30 days'
           order by x.at desc, x.id desc
           limit 20
        ) a
    ), '[]'::jsonb));
end;
$$;

create function public.google_deletions_view() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require('calendar.google');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'filmingId', d.filming_id, 'title', authz.google_filming_title(d.filming_id),
             'startsAt', f.starts_at, 'state', f.state,
             'detectedAt', d.detected_at, 'deadlineAt', d.deadline_at)
           order by d.deadline_at)
      from public.google_deletions d
      join public.filmings f on f.id = d.filming_id
     where d.resolved_at is null
  ), '[]'::jsonb);
end;
$$;

-- Επαναφορά: ξαναγράφεται στο Google. Επιβεβαίωση με λόγο: ακύρωση (ή απόρριψη αν αναμένει) μέσω των υπαρχουσών λειτουργιών.
create function public.google_deletion_resolve(p_filming uuid, p_restore boolean, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_state text;
begin
  perform authz.require('calendar.google');
  perform 1 from public.google_deletions d where d.filming_id = p_filming and d.resolved_at is null for update;
  if not found then
    raise exception 'Δεν υπάρχει εκκρεμής διαγραφή για αυτό το Γύρισμα' using errcode = 'P0001';
  end if;
  if p_restore then
    update public.google_deletions set resolved_at = now(), resolution = 'restored', resolved_by = auth.uid()
     where filming_id = p_filming;
    perform authz.google_queue_filming(p_filming);
    perform authz.google_log('restored', 'Γύρισμα επαναφέρθηκε στο Google', p_filming, null);
    return;
  end if;
  if v_reason is null then
    raise exception 'Η επιβεβαίωση θέλει λόγο' using errcode = 'P0001';
  end if;
  select f.state into v_state from public.filmings f where f.id = p_filming;
  if v_state = 'pending' then
    perform public.filming_reject(p_filming, v_reason);
  elsif v_state = 'scheduled' then
    perform public.filming_cancel(p_filming, v_reason);
  end if;
  update public.google_deletions
     set resolved_at = now(), resolution = 'confirmed', resolved_by = auth.uid(), reason = v_reason
   where filming_id = p_filming;
end;
$$;

-- Κανόνες Γυρισμάτων για Google. Αλλαγή του «αναμένει στο Google» ξαναγράφει τα εκκρεμή.
create function public.google_settings_save(p_new_event text, p_delete_hours integer, p_write_pending boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_old_write_pending boolean;
  v_filming record;
begin
  perform authz.require('settings.manage');
  if p_new_event is null or p_new_event not in ('blocked', 'none') then
    raise exception 'Ο κανόνας νέου γεγονότος δεν είναι έγκυρος' using errcode = 'P0001';
  end if;
  if p_delete_hours is null or p_delete_hours not in (12, 24, 48) then
    raise exception 'Η προθεσμία διαγραφής είναι 12, 24 ή 48 ώρες' using errcode = 'P0001';
  end if;
  if p_write_pending is null then
    raise exception 'Γράψε αν τα αναμένοντα γυρίσματα πάνε στο Google' using errcode = 'P0001';
  end if;
  select s.google_write_pending into v_old_write_pending from public.filming_settings s where s.id;
  update public.filming_settings
     set google_new_event = p_new_event, google_delete_hours = p_delete_hours, google_write_pending = p_write_pending
   where id;
  if v_old_write_pending is distinct from p_write_pending then
    for v_filming in select x.id from public.filmings x where x.state = 'pending' loop
      perform authz.google_queue_filming(v_filming.id);
    end loop;
  end if;
end;
$$;

-- Ξαναγράφει όλα τα ανοιχτά και τα πρόσφατα Γυρίσματα και τον Κλεισμένο χρόνο της ομάδας (60 μέρες πίσω και μπροστά).
create function public.google_resync_all() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_filming record;
  v_block record;
  v_count integer := 0;
begin
  perform authz.require('settings.manage');
  for v_filming in
    select x.id from public.filmings x
     where x.state in ('pending', 'scheduled')
        or (x.state in ('done', 'no_show') and x.starts_at between now() - interval '60 days' and now() + interval '60 days')
  loop
    perform authz.google_queue_filming(v_filming.id);
    v_count := v_count + 1;
  end loop;
  for v_block in
    select x.id from public.blocked_times x
     where x.source = 'dms' and x.starts_at between now() - interval '60 days' and now() + interval '60 days'
  loop
    perform authz.google_queue('blocked', v_block.id, 'upsert');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ───────────── Οθόνη Ημερολογίου: κατάσταση Google (μόνο για calendar.google) ─────────────

create or replace function public.calendar_view(p_from date, p_to date) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_from timestamptz;
  v_to timestamptz;
  v_view jsonb;
begin
  if not authz.is_team_user() then
    v_client := authz.calendar_client_id();
  end if;
  perform authz.calendar_check_range(p_from, p_to);
  v_from := (p_from::timestamp) at time zone 'Europe/Athens';
  v_to := ((p_to + 1)::timestamp) at time zone 'Europe/Athens';
  if authz.is_team_user() then
    v_view := authz.calendar_team_view(p_from, p_to, v_from, v_to);
  else
    v_view := authz.calendar_client_view(p_from, p_to, v_from, v_to, v_client);
  end if;
  return v_view || jsonb_build_object('google', authz.google_view_summary());
end;
$$;

-- ───────────── Δικαιώματα ─────────────

-- Όλα τα κλειστά· τα triggers τρέχουν με τα δικά τους δικαιώματα εκτέλεσης.
revoke all on function
  authz.google_applying(), authz.google_iso(timestamptz), authz.google_event_start(jsonb), authz.google_event_end(jsonb),
  authz.google_backoff_minutes(integer), authz.google_log(text, text, uuid, uuid),
  authz.google_members_by_email(text[]), authz.google_event_members(jsonb),
  authz.google_crew_free(uuid, timestamptz, timestamptz), authz.google_filming_title(uuid),
  authz.google_event_for_filming(uuid), authz.google_event_for_blocked(uuid),
  authz.google_queue(text, uuid, text), authz.google_queue_filming(uuid), authz.require_google_view(),
  authz.google_view_summary(), authz.google_detect_deletion(public.filmings, jsonb),
  authz.google_move_problem(public.filmings, timestamptz, numeric), authz.google_reject_move(public.filmings, text),
  authz.google_apply_move(public.filmings, timestamptz, numeric), authz.google_apply_filming(jsonb),
  authz.google_apply_blocked(jsonb), authz.google_apply_unknown(jsonb)
  from public, anon, authenticated;

revoke all on function authz.google_filming_changed(), authz.google_blocked_changed() from public, anon, authenticated;

-- Συναρτήσεις του worker: μόνο service role.
revoke all on function
  public.google_apply_change(jsonb), public.google_state(), public.google_set_calendar(text, text),
  public.google_set_channel(text, text, text, timestamptz), public.google_set_sync_token(text),
  public.google_mark_sync(boolean, text), public.google_channel_check(text, text),
  public.google_outbox_claim(integer), public.google_outbox_done(bigint, text, text, text),
  public.google_expire_deletions()
  from public, anon, authenticated;
grant execute on function
  public.google_apply_change(jsonb), public.google_state(), public.google_set_calendar(text, text),
  public.google_set_channel(text, text, text, timestamptz), public.google_set_sync_token(text),
  public.google_mark_sync(boolean, text), public.google_channel_check(text, text),
  public.google_outbox_claim(integer), public.google_outbox_done(bigint, text, text, text),
  public.google_expire_deletions()
  to service_role;

-- Συναρτήσεις της εφαρμογής: ο έλεγχος Δικαιώματος γίνεται μέσα τους.
revoke all on function
  public.google_view(), public.google_deletions_view(), public.google_deletion_resolve(uuid, boolean, text),
  public.google_settings_save(text, integer, boolean), public.google_resync_all()
  from public, anon;
grant execute on function
  public.google_view(), public.google_deletions_view(), public.google_deletion_resolve(uuid, boolean, text),
  public.google_settings_save(text, integer, boolean), public.google_resync_all()
  to authenticated;
