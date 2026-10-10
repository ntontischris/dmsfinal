-- Ημερολόγιο (C2β, #134): Κλεισμένος χρόνος, Ημερολόγιο, Σύνδεσμος ημερολογίου (ICS, μόνο ανάγνωση).
-- Κεφ. 3 (Γυρίσματα, Ημερολόγιο), ADR 0007, 0010, 0015, 0018 και το ticket #134.
--
-- Αρχές:
--  • Ο Κλεισμένος χρόνος δεν μπαίνει στη Χωρητικότητα ούτε στην Κράτηση πελάτη· στο Συνεργείο μόνο προειδοποιεί.
--  • Ο τίτλος του φαίνεται μόνο στον ίδιο και σε όσους έχουν calendar.block_others. Οι άλλοι βλέπουν «Απασχολημένος».
--  • Ο σύνδεσμος ημερολογίου αποθηκεύεται μόνο ως sha256. Το token φαίνεται μία φορά, στη δημιουργία ή ανανέωση.
--  • Πίνακες κλειστοί (RLS χωρίς policies, χωρίς grants)· όλα περνούν από RPC που ελέγχουν Δικαίωμα πρώτα.

-- ───────────── Δικαίωμα και seed ─────────────

-- Ο Ιδιοκτήτης το παίρνει αυτόματα (όλα τα Δικαιώματα ομάδας)· η Διαχείριση το παίρνει εδώ, όπως και τα υπόλοιπα.
insert into public.permissions (code, kind, area, label, scopes, sort) values
  ('calendar.block_others', 'team', 'Ημερολόγιο', 'Κλείνει χρόνο άλλων', '{all}', 62);

insert into public.role_permissions (role_id, permission, scope)
select r.id, 'calendar.block_others', 'all'
  from public.roles r
 where r.name = 'Διαχείριση' and r.kind = 'team';

-- ───────────── Πίνακες ─────────────

-- Κλεισμένος χρόνος: ο χρόνος που δεν είναι διαθέσιμος για Γύρισμα. Χωρίς επανάληψη.
create table public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.team_users (user_id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  title text check (title is null or (length(trim(title)) > 0 and length(title) <= 120)),
  created_at timestamptz not null default now(),
  created_by uuid,
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '60 days')
);

create index blocked_times_user_starts_idx on public.blocked_times (user_id, starts_at);

-- Ένα token ανά Χρήστη· μόνο το hash αποθηκεύεται. Η γραμμή σβήνει με τον λογαριασμό.
create table public.calendar_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);

alter table public.blocked_times enable row level security;
alter table public.calendar_links enable row level security;

revoke all on table public.blocked_times, public.calendar_links from anon, authenticated;

-- ───────────── Έλεγχοι Κλεισμένου χρόνου ─────────────

-- Μπορεί ο συνδεδεμένος Χρήστης να κλείνει χρόνο για αυτό το άτομο: ομάδα, και ο εαυτός του ή με «Κλείνει χρόνο άλλων».
create function authz.can_block_for(p_user uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.is_team_user() and (coalesce(p_user = auth.uid(), false) or authz.has('calendar.block_others'));
$$;

-- Βλέπει ο Χρήστης τον τίτλο του κλεισμένου χρόνου: δικός του, ή με «Κλείνει χρόνο άλλων».
create function authz.can_see_blocked_title(p_user uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(p_user = auth.uid(), false) or authz.has('calendar.block_others');
$$;

-- Το άτομο της αποθήκευσης: μπορεί ο Χρήστης να του κλείνει χρόνο, και είναι ενεργό μέλος ομάδας.
create function authz.require_block_target(p_user uuid) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.can_block_for(p_user) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if not exists (select 1 from public.team_users u where u.user_id = p_user and u.is_active) then
    raise exception 'Ο Χρήστης ομάδας δεν βρέθηκε' using errcode = 'P0001';
  end if;
end;
$$;

-- Η γραμμή που αλλάζει ή σβήνει ο Χρήστης. Ανύπαρκτη: «δεν βρέθηκε» μόνο για όσους βλέπουν τους άλλους· αλλιώς 42501.
create function authz.require_blocked_edit(p_id uuid) returns public.blocked_times
language plpgsql stable security definer set search_path = ''
as $$
declare
  b public.blocked_times;
begin
  select x.* into b from public.blocked_times x where x.id = p_id;
  if not found then
    if authz.has('calendar.block_others') then
      raise exception 'Ο κλεισμένος χρόνος δεν βρέθηκε' using errcode = 'P0001';
    end if;
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if not authz.can_block_for(b.user_id) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return b;
end;
$$;

-- Η γραμμή που βλέπει ο Χρήστης: ομάδα, και δικός του ή «Κλείνει χρόνο άλλων» (με τίτλο), ή «Βλέπει διαθεσιμότητα ομάδας» (χωρίς τίτλο).
create function authz.require_blocked_viewer(p_id uuid) returns public.blocked_times
language plpgsql stable security definer set search_path = ''
as $$
declare
  b public.blocked_times;
begin
  if not authz.is_team_user() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select x.* into b from public.blocked_times x where x.id = p_id;
  if not found then
    if authz.has('calendar.block_others') then
      raise exception 'Ο κλεισμένος χρόνος δεν βρέθηκε' using errcode = 'P0001';
    end if;
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if not (authz.can_see_blocked_title(b.user_id) or authz.has('calendar.availability')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return b;
end;
$$;

-- Μετατροπή σε Γύρισμα: ο κλεισμένος χρόνος υπάρχει και τον βλέπει ο Χρήστης. Αλλιώς 42501 (ίδιο για ανύπαρκτο και ξένο).
create function authz.require_blocked_convertible(p_from_blocked uuid) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_from_blocked is null then
    return;
  end if;
  if not exists (
       select 1 from public.blocked_times b
        where b.id = p_from_blocked and authz.can_see_blocked_title(b.user_id)) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Η ώρα του κλεισμένου χρόνου. Όλη μέρα: από τα μεσάνυχτα της πρώτης μέρας ως τα μεσάνυχτα μετά την τελευταία (Ώρα Ελλάδας).
create function authz.blocked_span(p_starts timestamptz, p_ends timestamptz, p_all_day boolean)
returns table (span_start timestamptz, span_end timestamptz)
language plpgsql stable set search_path = ''
as $$
begin
  if p_starts is null or p_ends is null then
    raise exception 'Γράψε αρχή και τέλος' using errcode = 'P0001';
  end if;
  if coalesce(p_all_day, false) then
    span_start := ((p_starts at time zone 'Europe/Athens')::date::timestamp) at time zone 'Europe/Athens';
    span_end := (((p_ends at time zone 'Europe/Athens')::date + 1)::timestamp) at time zone 'Europe/Athens';
  else
    span_start := p_starts;
    span_end := p_ends;
  end if;
  if span_end <= span_start then
    raise exception 'Η λήξη είναι μετά την αρχή' using errcode = 'P0001';
  end if;
  if span_end - span_start > interval '60 days' then
    raise exception 'Ο κλεισμένος χρόνος είναι έως 60 μέρες' using errcode = 'P0001';
  end if;
  return next;
end;
$$;

-- Αντικαθιστά το stub του 20261009210000: τέμνει ο κλεισμένος χρόνος του Χρήστη το [p_from, p_to).
create or replace function authz.user_blocked_at(p_user uuid, p_from timestamptz, p_to timestamptz) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.blocked_times b
     where b.user_id = p_user and b.starts_at < p_to and b.ends_at > p_from
  );
$$;

create trigger blocked_times_audit after insert or update or delete on public.blocked_times
  for each row execute function authz.audit_row('id');

-- ───────────── Ίχνος ─────────────

-- Ξαναγράφεται ΟΛΟΚΛΗΡΗ η λίστα (default deny, όπως στο #130). Ο κλεισμένος χρόνος φαίνεται μόνο σε «Κλείνει χρόνο άλλων».
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
    else false
  end;
$$;

-- ───────────── Κλεισμένος χρόνος: RPC (A6) ─────────────

-- Αποθήκευση: νέος (p_id null) ή αλλαγή υπάρχοντος. Ο καθένας για τον εαυτό του· για άλλον μόνο με «Κλείνει χρόνο άλλων».
-- Τα άτομα δεν αλλάζουν σε υπάρχοντα κλεισμένο χρόνο. Η μέρα ολόκληρη γίνεται Ώρα Ελλάδας στη βάση.
create function public.blocked_time_save(
  p_id uuid, p_user uuid, p_starts timestamptz, p_ends timestamptz, p_all_day boolean, p_title text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  b public.blocked_times;
  v_user uuid;
  v_span record;
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_id uuid;
begin
  if p_id is null then
    v_user := coalesce(p_user, auth.uid());
    perform authz.require_block_target(v_user);
  else
    b := authz.require_blocked_edit(p_id);
    if p_user is not null and p_user <> b.user_id then
      raise exception 'Ο κλεισμένος χρόνος δεν αλλάζει άτομο' using errcode = 'P0001';
    end if;
    v_user := b.user_id;
  end if;
  if v_title is not null and length(v_title) > 120 then
    raise exception 'Ο τίτλος έχει έως 120 χαρακτήρες' using errcode = 'P0001';
  end if;
  select * into v_span from authz.blocked_span(p_starts, p_ends, p_all_day);
  if p_id is null then
    insert into public.blocked_times (user_id, starts_at, ends_at, all_day, title, created_by)
    values (v_user, v_span.span_start, v_span.span_end, coalesce(p_all_day, false), v_title, auth.uid())
    returning id into v_id;
    return v_id;
  end if;
  update public.blocked_times
     set starts_at = v_span.span_start, ends_at = v_span.span_end,
         all_day = coalesce(p_all_day, false), title = v_title
   where id = p_id;
  return p_id;
end;
$$;

create function public.blocked_time_delete(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_blocked_edit(p_id);
  delete from public.blocked_times where id = p_id;
end;
$$;

-- Ο κλεισμένος χρόνος όπως τον βλέπει ο Χρήστης. Ο τίτλος φαίνεται μόνο σε όσους τον βλέπουν (δικός τους ή «Κλείνει χρόνο άλλων»).
create function public.blocked_time_view(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  b public.blocked_times;
  v_full boolean;
begin
  b := authz.require_blocked_viewer(p_id);
  v_full := authz.can_see_blocked_title(b.user_id);
  return jsonb_build_object(
    'id', b.id,
    'userId', b.user_id,
    'userName', (select u.name from public.team_users u where u.user_id = b.user_id),
    'startsAt', b.starts_at,
    'endsAt', b.ends_at,
    'allDay', b.all_day,
    'title', case when v_full then b.title end,
    'canEdit', v_full,
    'canConvert', v_full and authz.has('filming.book')
  );
end;
$$;

-- Προειδοποίηση στη φόρμα Γυρίσματος: ποια μέλη έχουν κλεισμένο χρόνο που τέμνει την ώρα. Η προσθήκη δεν μπλοκάρεται.
create function public.filming_crew_blocked(p_starts timestamptz, p_hours numeric) returns uuid[]
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('filming.crew');
  perform authz.require_filming_slot(p_starts, p_hours);
  return coalesce((
    select array_agg(distinct b.user_id)
      from public.blocked_times b
     where b.starts_at < authz.filming_end(p_starts, p_hours) and b.ends_at > p_starts
  ), '{}'::uuid[]);
end;
$$;

-- ───────────── Συνεργείο: κλεισμένος χρόνος ανά μέλος (A6) ─────────────

-- Αντικαθιστά το 20261009210000: κάθε μέλος παίρνει isBlocked για το διάστημα του Γυρίσματος.
create or replace function authz.filming_crew_json(p_filming uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'userId', c.user_id, 'name', u.name, 'response', c.response, 'reason', c.reason, 'respondedAt', c.responded_at,
           'isBlocked', authz.user_blocked_at(c.user_id, f.starts_at, authz.filming_end(f.starts_at, f.hours))
         ) order by lower(u.name), c.user_id), '[]'::jsonb)
    from public.filming_crew c
    join public.team_users u on u.user_id = c.user_id
    join public.filmings f on f.id = c.filming_id
   where c.filming_id = p_filming;
$$;

-- ───────────── Μετατροπή κλεισμένου χρόνου σε Γύρισμα (A6) ─────────────

-- Τα δύο παλιά στη σειρά: η υπογραφή αλλάζει (νέα τελευταία παράμετρος), γι' αυτό πέφτει και ξαναγίνεται.
drop function public.filming_create(uuid, timestamptz, numeric, uuid, text, text);

-- Η ομάδα κλείνει χωρίς να μπλοκάρεται από Ωράριο ή Χωρητικότητα (Κ3). Με p_from_blocked, ο κλεισμένος χρόνος σβήνεται
-- στην ίδια συναλλαγή και το Γύρισμα έχει origin 'blocked_time'.
create function public.filming_create(
  p_agreement uuid, p_starts_at timestamptz, p_hours numeric, p_kind uuid, p_location text, p_note text,
  p_from_blocked uuid default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_client uuid;
  v_place record;
  v_origin text := case when p_from_blocked is null then 'team' else 'blocked_time' end;
  v_id uuid;
begin
  perform authz.require('filming.book');
  a := authz.team_agreement_for_booking(p_agreement);
  perform authz.require_agreement_bookable(a);
  perform authz.require_filming_slot(p_starts_at, p_hours);
  if p_kind is not null then
    perform authz.filming_check_kind(a.id, p_kind);
  end if;
  select o.client_id into v_client from public.opportunities o where o.id = a.opportunity_id;
  select * into v_place from authz.filming_place(a.id, p_starts_at);
  if not found then
    raise exception 'Η μέρα δεν πέφτει σε Περίοδο της Συμφωνίας' using errcode = 'P0001';
  end if;
  perform authz.require_production_open(v_place.r_production);
  perform authz.require_blocked_convertible(p_from_blocked);
  insert into public.filmings (
    production_id, period_id, client_id, kind_id, starts_at, hours, location, origin, state, is_extra, internal_note
  ) values (
    v_place.r_production, v_place.r_period, v_client, p_kind, p_starts_at, p_hours,
    nullif(trim(coalesce(p_location, '')), ''), v_origin, 'scheduled',
    v_place.r_outside or p_kind is null
      or authz.filming_available(a.id, v_place.r_period, p_kind)
         < authz.filming_need(a.id, v_place.r_period, p_kind, p_hours, p_starts_at),
    nullif(trim(coalesce(p_note, '')), '')
  )
  returning id into v_id;
  perform authz.filming_event(v_id, 'created', jsonb_build_object('origin', v_origin));
  if p_from_blocked is not null then
    delete from public.blocked_times where id = p_from_blocked;
  end if;
  return v_id;
end;
$$;

-- Γύρισμα της εσωτερικής Παραγωγής (χωρίς Πελάτη, χωρίς Παροχή). Μόνο για Εύρος «όλα». Με p_from_blocked όπως το filming_create.
drop function public.filming_create_internal(uuid, timestamptz, numeric, text, text);

create function public.filming_create_internal(
  p_production uuid, p_starts_at timestamptz, p_hours numeric, p_location text, p_note text,
  p_from_blocked uuid default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_origin text := case when p_from_blocked is null then 'team' else 'blocked_time' end;
  v_id uuid;
begin
  perform authz.require('filming.book');
  if coalesce(authz.scope('filming.book') = 'all', false) is not true then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.require_production(p_production);
  if exists (select 1 from public.productions pr where pr.id = p_production and pr.client_id is not null) then
    raise exception 'Η Παραγωγή έχει Πελάτη· τα Γυρίσματά της κλείνονται από τη Συμφωνία' using errcode = 'P0001';
  end if;
  perform authz.require_production_open(p_production);
  perform authz.require_filming_slot(p_starts_at, p_hours);
  perform authz.require_blocked_convertible(p_from_blocked);
  insert into public.filmings (production_id, starts_at, hours, location, origin, state, internal_note)
  values (p_production, p_starts_at, p_hours, nullif(trim(coalesce(p_location, '')), ''), v_origin, 'scheduled',
          nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_id;
  perform authz.filming_event(v_id, 'created', jsonb_build_object('origin', v_origin, 'internal', true));
  if p_from_blocked is not null then
    delete from public.blocked_times where id = p_from_blocked;
  end if;
  return v_id;
end;
$$;

-- ───────────── Ημερολόγιο: ανάγνωση (A5) ─────────────

-- Η περίοδος είναι έως 62 μέρες· αλλιώς P0001.
create function authz.calendar_check_range(p_from date, p_to date) returns void
language plpgsql stable set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 61 then
    raise exception 'Το Ημερολόγιο δείχνει έως 62 μέρες' using errcode = 'P0001';
  end if;
end;
$$;

-- Ο Πελάτης του Χρήστη πελάτη, αν είναι ενεργός (δεν αρχειοθετημένος). Αλλιώς 42501.
create function authz.calendar_client_id() returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_client uuid := authz.client_user_client_id();
begin
  if v_client is null or not exists (select 1 from public.clients c where c.id = v_client and c.archived_at is null) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return v_client;
end;
$$;

-- Γυρίσματα που βλέπει η ομάδα στην περίοδο (ίδιος έλεγχος με τη λίστα). Ακυρωμένα και απορριφθέντα φεύγουν.
create function authz.calendar_team_filmings(p_from timestamptz, p_to timestamptz) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', f.id, 'startsAt', f.starts_at, 'hours', f.hours, 'state', f.state,
           'title', coalesce(cl.name, pr.title),
           'isMine', authz.is_filming_participant(f.id) or authz.is_client_manager(f.client_id)
         ) order by f.starts_at, f.id), '[]'::jsonb)
    from public.filmings f
    join public.productions pr on pr.id = f.production_id
    left join public.clients cl on cl.id = f.client_id
   where authz.can_see_filming(f.id)
     and f.state in ('pending', 'scheduled', 'done', 'no_show')
     and f.starts_at >= p_from and f.starts_at < p_to;
$$;

-- Κλεισμένος χρόνος που βλέπει η ομάδα: δικός της πάντα (με τίτλο)· των άλλων μόνο με «Κλείνει χρόνο άλλων».
create function authz.calendar_team_blocked(p_from timestamptz, p_to timestamptz) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', b.id, 'userId', b.user_id, 'userName', u.name, 'startsAt', b.starts_at, 'endsAt', b.ends_at,
           'allDay', b.all_day, 'title', b.title, 'isMine', b.user_id = auth.uid()
         ) order by b.starts_at, b.id), '[]'::jsonb)
    from public.blocked_times b
    join public.team_users u on u.user_id = b.user_id
   where b.starts_at < p_to and b.ends_at > p_from
     and authz.can_see_blocked_title(b.user_id);
$$;

-- «Απασχολημένος» για όσους έχουν διαθεσιμότητα ομάδας χωρίς «Κλείνει χρόνο άλλων»: κλεισμένος χρόνος άλλων και
-- Συνεργείο Γυρισμάτων, χωρίς τίτλο. Οι αποχωρήσεις (declined) δεν μετράνε.
create function authz.calendar_busy(p_from timestamptz, p_to timestamptz) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when authz.has('calendar.availability') and not authz.has('calendar.block_others') then (
    select coalesce(jsonb_agg(jsonb_build_object(
             'userId', x.user_id, 'userName', x.name, 'startsAt', x.span_start, 'endsAt', x.span_end
           ) order by x.span_start, x.user_id), '[]'::jsonb)
      from (
        select b.user_id, u.name, b.starts_at as span_start, b.ends_at as span_end
          from public.blocked_times b
          join public.team_users u on u.user_id = b.user_id
         where b.user_id <> auth.uid() and b.starts_at < p_to and b.ends_at > p_from
        union all
        select c.user_id, u.name, f.starts_at, authz.filming_end(f.starts_at, f.hours)
          from public.filming_crew c
          join public.filmings f on f.id = c.filming_id
          join public.team_users u on u.user_id = c.user_id
         where c.user_id <> auth.uid() and c.response <> 'declined' and f.state in ('pending', 'scheduled')
           and f.starts_at < p_to and authz.filming_end(f.starts_at, f.hours) > p_from
      ) x
  ) else '[]'::jsonb end;
$$;

-- Μέλη ομάδας για την επιλογή «Κλείνει χρόνο άλλου»· μόνο με «Κλείνει χρόνο άλλων».
create function authz.calendar_team_members() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when authz.has('calendar.block_others') then (
    select coalesce(jsonb_agg(jsonb_build_object('userId', u.user_id, 'name', u.name)
                              order by lower(u.name), u.user_id), '[]'::jsonb)
      from public.team_users u
     where u.is_active
  ) else '[]'::jsonb end;
$$;

-- Κατάσταση μιας μέρας για την ομάδα: το Ωράριο της μέρας και το όνομα της αργίας αν υπάρχει.
create function authz.calendar_team_days(p_from date, p_to date) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'day', d.day,
           'status', case when h.is_open then 'open' else h.reason end,
           'holidayName', (select g.name from authz.greek_holidays(extract(year from d.day)::integer) g where g.day = d.day)
         ) order by d.day), '[]'::jsonb)
    from (select p_from + n.i as day from generate_series(0, p_to - p_from) as n (i)) d
   cross join lateral (select * from authz.day_hours(d.day)) h;
$$;

-- Κατάσταση μιας μέρας για τον πελάτη: «Γεμάτη» όταν καμία έναρξη με την ελάχιστη διάρκεια δεν χωράει στη Χωρητικότητα.
-- Η Παροχή δεν μετράει εδώ.
create function authz.calendar_client_day_status(p_day date) returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  h record;
  s public.filming_settings;
  v_min numeric;
begin
  select * into h from authz.day_hours(p_day);
  if not h.is_open then
    return case h.reason when 'holiday' then 'holiday' when 'not_set' then 'not_set' else 'closed' end;
  end if;
  select x.* into s from public.filming_settings x where x.id;
  select min(x) into v_min from unnest(s.allowed_durations) as x;
  if exists (
       select 1 from authz.day_candidates(p_day, v_min) as c (slot_start)
        where authz.slot_load(c.slot_start, authz.filming_end(c.slot_start, v_min), null) < h.capacity) then
    return 'free';
  end if;
  return 'full';
end;
$$;

create function authz.calendar_client_days(p_from date, p_to date) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'day', d.day, 'status', authz.calendar_client_day_status(d.day)
         ) order by d.day), '[]'::jsonb)
    from (select p_from + n.i as day from generate_series(0, p_to - p_from) as n (i)) d;
$$;

-- Γυρίσματα του Πελάτη: χωρίς Συνεργείο και χωρίς εσωτερικές σημειώσεις.
create function authz.calendar_client_filmings(p_client uuid, p_from timestamptz, p_to timestamptz) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', f.id, 'startsAt', f.starts_at, 'hours', f.hours, 'state', f.state,
           'title', coalesce(cl.name, pr.title), 'isMine', true
         ) order by f.starts_at, f.id), '[]'::jsonb)
    from public.filmings f
    join public.productions pr on pr.id = f.production_id
    left join public.clients cl on cl.id = f.client_id
   where f.client_id = p_client
     and f.state in ('pending', 'scheduled', 'done', 'no_show')
     and f.starts_at >= p_from and f.starts_at < p_to;
$$;

create function authz.calendar_team_view(
  p_from date, p_to date, p_from_at timestamptz, p_to_at timestamptz
) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'filmings', authz.calendar_team_filmings(p_from_at, p_to_at),
    'blocked', authz.calendar_team_blocked(p_from_at, p_to_at),
    'busy', authz.calendar_busy(p_from_at, p_to_at),
    'days', authz.calendar_team_days(p_from, p_to),
    'canBlockOthers', authz.has('calendar.block_others'),
    'canBook', authz.has('filming.book'),
    'team', authz.calendar_team_members()
  );
$$;

create function authz.calendar_client_view(
  p_from date, p_to date, p_from_at timestamptz, p_to_at timestamptz, p_client uuid
) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'filmings', authz.calendar_client_filmings(p_client, p_from_at, p_to_at),
    'blocked', '[]'::jsonb,
    'busy', '[]'::jsonb,
    'days', authz.calendar_client_days(p_from, p_to),
    'canBlockOthers', false,
    'canBook', authz.client_user_has('c.book'),
    'team', '[]'::jsonb
  );
$$;

-- Το Ημερολόγιο: ομάδα ή Χρήστης πελάτη με ενεργό Πελάτη. Αλλιώς 42501.
create function public.calendar_view(p_from date, p_to date) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_from timestamptz;
  v_to timestamptz;
begin
  if not authz.is_team_user() then
    v_client := authz.calendar_client_id();
  end if;
  perform authz.calendar_check_range(p_from, p_to);
  v_from := (p_from::timestamp) at time zone 'Europe/Athens';
  v_to := ((p_to + 1)::timestamp) at time zone 'Europe/Athens';
  if authz.is_team_user() then
    return authz.calendar_team_view(p_from, p_to, v_from, v_to);
  end if;
  return authz.calendar_client_view(p_from, p_to, v_from, v_to, v_client);
end;
$$;

-- ───────────── Σύνδεσμος ημερολογίου (A7, Λ3) ─────────────

create function authz.require_signed_in() returns void
language plpgsql stable set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Ο Πελάτης ενός Χρήστη πελάτη με παράμετρο (ο επιλεγμένος, αλλιώς η μοναδική ενεργή συμμετοχή).
create function authz.client_id_of_user(p_user uuid) returns uuid
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select cu.client_id from public.client_users cu
      where cu.user_id = p_user and cu.removed_at is null and cu.is_current limit 1),
    (select min(cu.client_id::text)::uuid from public.client_users cu
      where cu.user_id = p_user and cu.removed_at is null
      having count(*) = 1)
  );
$$;

-- Μέλος ομάδας ενεργό, ή Χρήστης πελάτη με ενεργό Πελάτη: μόνο αυτοί έχουν Σύνδεσμο.
create function authz.calendar_user_active(p_user uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.user_is_team(p_user) or exists (
    select 1 from public.clients c
     where c.id = authz.client_id_of_user(p_user) and c.archived_at is null);
$$;

create function authz.require_calendar_user() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.calendar_user_active(auth.uid()) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

create function authz.calendar_user_name(p_user uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select u.name from public.team_users u where u.user_id = p_user),
    (select cu.name from public.client_users cu
      where cu.user_id = p_user and cu.removed_at is null and cu.client_id = authz.client_id_of_user(p_user)
      limit 1));
$$;

-- Βλέπει ο Χρήστης το Γύρισμα στο Σύνδεσμο (ίδιος κανόνας με τη λίστα, χωρίς auth.uid()).
-- Ομάδα: όλα, ή όσα με αφορούν, ή όπου είναι στο Συνεργείο. Πελάτης: τα δικά του.
create function authz.calendar_feed_sees_filming(p_user uuid, f public.filmings) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when authz.user_is_team(p_user) then
      exists (select 1 from public.filming_crew c where c.filming_id = f.id and c.user_id = p_user)
      or coalesce(authz.user_scope(p_user, 'filming.view') = 'all', false)
      or (coalesce(authz.user_scope(p_user, 'filming.view') = 'mine', false) and (
            exists (select 1 from public.productions pr
                     where pr.id = f.production_id
                       and (pr.owner_id = p_user or exists (
                             select 1 from public.production_members m
                              where m.production_id = pr.id and m.user_id = p_user)))
            or exists (select 1 from public.clients cl where cl.id = f.client_id and cl.manager_id = p_user)))
    else f.client_id is not null and f.client_id = authz.client_id_of_user(p_user)
  end;
$$;

-- Ενεργός και όχι μπλοκαρισμένος (banned): αλλιώς ο Σύνδεσμος δεν δίνει τίποτα.
create function authz.calendar_feed_allowed(p_user uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.calendar_user_active(p_user) and exists (
    select 1 from auth.users u
     where u.id = p_user and (u.banned_until is null or u.banned_until <= now()));
$$;

-- Γεγονότα για το .ics: 30 μέρες πίσω έως 180 μπροστά. Αναμένει → «(αναμένει)» στον τίτλο.
create function authz.calendar_events(p_user uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  with window_range as (
    select now() - interval '30 days' as from_at, now() + interval '180 days' as to_at
  ), rows_all as (
    select 'filming-' || f.id::text || '@dms' as uid, f.starts_at, authz.filming_end(f.starts_at, f.hours) as ends_at,
           (case when f.state = 'pending' then '(αναμένει) ' else '' end) || coalesce(cl.name, pr.title) as summary,
           f.location, f.client_note as description
      from public.filmings f
      join public.productions pr on pr.id = f.production_id
      left join public.clients cl on cl.id = f.client_id
      cross join window_range w
     where f.state in ('pending', 'scheduled', 'done', 'no_show')
       and f.starts_at >= w.from_at and f.starts_at <= w.to_at
       and authz.calendar_feed_sees_filming(p_user, f)
    union all
    select 'blocked-' || b.id::text || '@dms', b.starts_at, b.ends_at,
           coalesce(b.title, 'Κλεισμένος χρόνος'), null::text, null::text
      from public.blocked_times b
      cross join window_range w
     where b.user_id = p_user and b.starts_at >= w.from_at and b.starts_at <= w.to_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'uid', r.uid, 'startsAt', r.starts_at, 'endsAt', r.ends_at, 'summary', r.summary,
           'location', r.location, 'description', r.description
         ) order by r.starts_at, r.uid), '[]'::jsonb)
    from rows_all r;
$$;

create function authz.calendar_token_hash(p_token text) returns text
language sql immutable set search_path = ''
as $$ select encode(sha256(convert_to(p_token, 'UTF8')), 'hex'); $$;

-- 32 τυχαία bytes ως base64url. Δύο UUID v4 δίνουν 32 bytes (περίπου 244 τυχαία bits, πάνω από τα 128 που χρειάζεται).
create function authz.new_calendar_token() returns text
language sql volatile set search_path = ''
as $$
  select rtrim(translate(
    encode(decode(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'hex'), 'base64'),
    '+/', '-_'), '=');
$$;

-- Ο Σύνδεσμος του τρέχοντα Χρήστη: υπάρχει και πότε δημιουργήθηκε. Το token δεν ξαναφαίνεται.
create function public.calendar_link_status() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_created timestamptz;
begin
  perform authz.require_signed_in();
  select l.created_at into v_created from public.calendar_links l where l.user_id = auth.uid();
  return jsonb_build_object('exists', v_created is not null, 'createdAt', v_created);
end;
$$;

-- Νέο token. Ο παλιός σταματά αμέσως (το hash αντικαθίσταται). Επιστρέφει το token μία φορά.
create function public.calendar_link_renew() returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_token text := authz.new_calendar_token();
begin
  perform authz.require_calendar_user();
  insert into public.calendar_links (user_id, token_hash)
  values (auth.uid(), authz.calendar_token_hash(v_token))
  on conflict (user_id) do update
     set token_hash = excluded.token_hash, created_at = now();
  return v_token;
end;
$$;

create function public.calendar_link_revoke() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_signed_in();
  delete from public.calendar_links where user_id = auth.uid();
end;
$$;

-- Ανώνυμο και συνδεδεμένο: το token είναι η άδεια. Άκυρο, σταματημένο ή ανενεργό Χρήστη δίνουν null, χωρίς να ξεχωρίζουν.
create function public.calendar_feed(p_token text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
begin
  select l.user_id into v_user from public.calendar_links l
   where l.token_hash = authz.calendar_token_hash(coalesce(p_token, ''));
  if v_user is null or not authz.calendar_feed_allowed(v_user) then
    return null;
  end if;
  return jsonb_build_object('name', authz.calendar_user_name(v_user), 'events', authz.calendar_events(v_user));
end;
$$;

-- ───────────── Δικαιώματα ─────────────

-- Βοηθητικές: μόνο από τις security definer συναρτήσεις του module.
revoke all on function
  authz.can_block_for(uuid), authz.can_see_blocked_title(uuid), authz.require_block_target(uuid),
  authz.require_blocked_edit(uuid), authz.require_blocked_viewer(uuid), authz.require_blocked_convertible(uuid),
  authz.blocked_span(timestamptz, timestamptz, boolean), authz.user_blocked_at(uuid, timestamptz, timestamptz),
  authz.calendar_check_range(date, date), authz.calendar_client_id(), authz.calendar_team_filmings(timestamptz, timestamptz),
  authz.calendar_team_blocked(timestamptz, timestamptz), authz.calendar_busy(timestamptz, timestamptz),
  authz.calendar_team_members(), authz.calendar_team_days(date, date), authz.calendar_client_day_status(date),
  authz.calendar_client_days(date, date), authz.calendar_client_filmings(uuid, timestamptz, timestamptz),
  authz.calendar_team_view(date, date, timestamptz, timestamptz), authz.calendar_client_view(date, date, timestamptz, timestamptz, uuid),
  authz.require_signed_in(), authz.calendar_user_active(uuid), authz.require_calendar_user(), authz.client_id_of_user(uuid),
  authz.calendar_user_name(uuid), authz.calendar_feed_sees_filming(uuid, public.filmings), authz.calendar_feed_allowed(uuid),
  authz.calendar_events(uuid), authz.calendar_token_hash(text), authz.new_calendar_token()
  from public, anon, authenticated;

-- RPC του Χρήστη (ομάδα ή πελάτης), με έλεγχο στο σώμα τους.
revoke all on function
  public.blocked_time_save(uuid, uuid, timestamptz, timestamptz, boolean, text), public.blocked_time_delete(uuid),
  public.blocked_time_view(uuid), public.filming_crew_blocked(timestamptz, numeric),
  public.filming_create(uuid, timestamptz, numeric, uuid, text, text, uuid),
  public.filming_create_internal(uuid, timestamptz, numeric, text, text, uuid),
  public.calendar_view(date, date), public.calendar_link_status(), public.calendar_link_renew(), public.calendar_link_revoke()
  from public, anon;

grant execute on function
  public.blocked_time_save(uuid, uuid, timestamptz, timestamptz, boolean, text), public.blocked_time_delete(uuid),
  public.blocked_time_view(uuid), public.filming_crew_blocked(timestamptz, numeric),
  public.filming_create(uuid, timestamptz, numeric, uuid, text, text, uuid),
  public.filming_create_internal(uuid, timestamptz, numeric, text, text, uuid),
  public.calendar_view(date, date), public.calendar_link_status(), public.calendar_link_renew(), public.calendar_link_revoke()
  to authenticated;

-- Ο Σύνδεσμος ημερολογίου: ο ΜΟΝΟ ρόλος που παίρνει και ο ανώνυμος.
revoke all on function public.calendar_feed(text) from public;
grant execute on function public.calendar_feed(text) to anon, authenticated;
