-- Κρατήσεις (C2α, #130): Ωράριο κρατήσεων, Χωρητικότητα, Αργίες, κράτηση πελάτη (E5) και μετάθεση από τον πελάτη
-- με επανέγκριση. Κεφ. 3 (Γυρίσματα), ADR 0010, 0015, 0016, 0018 και το ticket #130.
--
-- Αρχές:
--  • «Μέρα» είναι Ώρα Ελλάδας. Το Ωράριο μιας μέρας το λύνει μία συνάρτηση (authz.day_hours): εξαίρεση, αργία, εβδομάδα.
--  • Η Χωρητικότητα μετράει τη μέγιστη ταυτόχρονη φόρτωση μέσα στο διάστημα· οι εκκρεμείς μεταθέσεις πιάνουν θέση.
--  • Ωράριο, Χωρητικότητα και Κανόνας διάρκειας μπλοκάρουν μόνο τον πελάτη (Κ3). Η ομάδα παίρνει προειδοποίηση
--    (authz.slot_problem) και κλείνει κανονικά.
--  • Πίνακες κλειστοί (RLS χωρίς policies, χωρίς grants). Όλα περνούν από RPC που ελέγχουν Δικαίωμα πρώτα.

-- ───────────── Email και στήλες των υπαρχόντων πινάκων ─────────────

alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check
  check (kind in ('test', 'invite_resend', 'client_added', 'filming_decision', 'reschedule_decision'));

-- Μετάθεση από τον πελάτη: εκκρεμής μέχρι την απόφαση. Όλα ή κανένα.
alter table public.filmings
  add column reschedule_starts_at timestamptz,
  add column reschedule_hours numeric(4, 1) check (
    reschedule_hours is null or (reschedule_hours >= 0.5 and reschedule_hours <= 12 and reschedule_hours * 2 = trunc(reschedule_hours * 2))),
  add column reschedule_requested_at timestamptz,
  add column reschedule_requested_by uuid,
  add constraint filmings_reschedule_all_or_none check (
    (reschedule_starts_at is null and reschedule_hours is null and reschedule_requested_at is null and reschedule_requested_by is null)
    or (reschedule_starts_at is not null and reschedule_hours is not null and reschedule_requested_at is not null
        and reschedule_requested_by is not null));

-- Διάρκειες: 1–8 τιμές, κάθε μία από 0,5 έως 12 ώρες ανά μισή ώρα, χωρίς διπλά.
create function authz.durations_valid(p_durations numeric[]) returns boolean
language sql immutable set search_path = ''
as $$
  select cardinality(p_durations) between 1 and 8
     and not exists (
       select 1 from unnest(p_durations) x
        where x is null or x < 0.5 or x > 12 or x * 2 <> trunc(x * 2))
     and (select count(distinct x) from unnest(p_durations) x) = cardinality(p_durations);
$$;

alter table public.filming_settings
  add column capacity smallint not null default 2 check (capacity between 1 and 20),
  add column allowed_durations numeric(4, 1)[] not null default '{2,3,4}' check (authz.durations_valid(allowed_durations)),
  add column start_step_minutes smallint not null default 60 check (start_step_minutes in (15, 30, 60)),
  add column booking_hours_set_at timestamptz;

-- ───────────── Πίνακες ─────────────

-- Εβδομαδιαίο Ωράριο κρατήσεων. dow: ISO μέρα (1 = Δευτέρα). Άδειος στην αρχή (κανένα seed).
create table public.booking_week (
  dow smallint primary key check (dow between 1 and 7),
  is_open boolean not null,
  opens time,
  closes time,
  check ((is_open and opens is not null and closes is not null and opens < closes)
         or (not is_open and opens is null and closes is null)),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Εξαιρέσεις ανά ημερομηνία. Γραμμή με is_closed = false σε αργία = η αργία ανοίγει.
create table public.booking_exceptions (
  day date primary key,
  is_closed boolean not null,
  opens time,
  closes time,
  capacity smallint check (capacity is null or capacity between 1 and 20),
  note text check (note is null or length(trim(note)) > 0),
  check (not is_closed or (opens is null and closes is null and capacity is null)),
  check (is_closed or ((opens is null) = (closes is null))),
  check (opens is null or closes is null or opens < closes),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.booking_week enable row level security;
alter table public.booking_exceptions enable row level security;

create trigger booking_week_stamp before insert or update on public.booking_week
  for each row execute function authz.stamp_equipment_row();
create trigger booking_exceptions_stamp before insert or update on public.booking_exceptions
  for each row execute function authz.stamp_equipment_row();

create trigger booking_week_audit after insert or update or delete on public.booking_week
  for each row execute function authz.audit_row('dow');
create trigger booking_exceptions_audit after insert or update or delete on public.booking_exceptions
  for each row execute function authz.audit_row('day');

-- ───────────── Αργίες ─────────────

-- Ορθόδοξο Πάσχα (Meeus, Ιουλιανό + 13 μέρες). Έγκυρο 1900–2099.
create function authz.orthodox_easter(p_year integer) returns date
language plpgsql immutable set search_path = ''
as $$
declare
  v_a integer := p_year % 4;
  v_b integer := p_year % 7;
  v_c integer := p_year % 19;
  v_d integer := (19 * v_c + 15) % 30;
  v_e integer := (2 * v_a + 4 * v_b - v_d + 34) % 7;
  v_m integer := v_d + v_e + 114;
begin
  return make_date(p_year, v_m / 31, v_m % 31 + 1) + 13;
end;
$$;

-- Οι 13 επίσημες αργίες του έτους (ίδια ονόματα με το prototype).
create function authz.greek_holidays(p_year integer)
returns table (day date, name text, movable boolean)
language sql immutable set search_path = ''
as $$
  with e as (select authz.orthodox_easter(p_year) as easter)
  select make_date(p_year, 1, 1), 'Πρωτοχρονιά', false from e
  union all select make_date(p_year, 1, 6), 'Θεοφάνεια', false from e
  union all select e.easter - 48, 'Καθαρά Δευτέρα', true from e
  union all select make_date(p_year, 3, 25), '25η Μαρτίου', false from e
  union all select e.easter - 2, 'Μεγάλη Παρασκευή', true from e
  union all select e.easter, 'Πάσχα', true from e
  union all select e.easter + 1, 'Δευτέρα του Πάσχα', true from e
  union all select make_date(p_year, 5, 1), 'Πρωτομαγιά', false from e
  union all select e.easter + 50, 'Αγίου Πνεύματος', true from e
  union all select make_date(p_year, 8, 15), 'Δεκαπενταύγουστος', false from e
  union all select make_date(p_year, 10, 28), '28η Οκτωβρίου', false from e
  union all select make_date(p_year, 12, 25), 'Χριστούγεννα', false from e
  union all select make_date(p_year, 12, 26), 'Σύναξη Θεοτόκου', false from e;
$$;

create function authz.is_holiday(p_day date) returns boolean
language sql stable set search_path = ''
as $$
  select exists (
    select 1 from authz.greek_holidays(extract(year from p_day)::integer) h where h.day = p_day
  );
$$;

-- Εργάσιμη μέρα: Δευτέρα ως Παρασκευή και όχι αργία. Θα τη χρησιμοποιούν και οι προθεσμίες των Παραδοτέων.
create function public.is_working_day(p_day date) returns boolean
language sql stable security definer set search_path = ''
as $$
  select extract(isodow from p_day) between 1 and 5 and not authz.is_holiday(p_day);
$$;

-- ───────────── Ωράριο μιας μέρας ─────────────

-- Προτεραιότητα: χωρίς αποθηκευμένο Ωράριο → κλειστή («not_set»)· εξαίρεση· αργία· εβδομάδα.
-- Χωρητικότητα: της εξαίρεσης, αλλιώς της προεπιλογής. Πάντα μία γραμμή.
create function authz.day_hours(p_day date)
returns table (is_open boolean, opens time, closes time, capacity smallint, reason text)
language plpgsql stable security definer set search_path = ''
as $$
declare
  s public.filming_settings;
  e public.booking_exceptions;
  w public.booking_week;
begin
  select x.* into s from public.filming_settings x where x.id;
  select x.* into w from public.booking_week x where x.dow = extract(isodow from p_day)::smallint;
  select x.* into e from public.booking_exceptions x where x.day = p_day;
  if s.booking_hours_set_at is null then
    return query select false, null::time, null::time, s.capacity, 'not_set'::text;
    return;
  end if;
  if e.day is not null then
    if e.is_closed then
      return query select false, null::time, null::time, coalesce(e.capacity, s.capacity), 'closed'::text;
      return;
    end if;
    if e.opens is not null then
      return query select true, e.opens, e.closes, coalesce(e.capacity, s.capacity), null::text;
      return;
    end if;
    if w.is_open then
      return query select true, w.opens, w.closes, coalesce(e.capacity, s.capacity), null::text;
      return;
    end if;
    return query select false, null::time, null::time, coalesce(e.capacity, s.capacity), 'closed'::text;
    return;
  end if;
  if authz.is_holiday(p_day) then
    return query select false, null::time, null::time, s.capacity, 'holiday'::text;
    return;
  end if;
  if w.is_open then
    return query select true, w.opens, w.closes, s.capacity, null::text;
    return;
  end if;
  return query select false, null::time, null::time, s.capacity, 'closed'::text;
end;
$$;

-- Αρχές ώρας έναρξης της μέρας σε βήμα, ώστε όλο το Γύρισμα να χωράει στο Ωράριο.
create function authz.day_candidates(p_day date, p_hours numeric) returns setof timestamptz
language plpgsql stable security definer set search_path = ''
as $$
declare
  h record;
  v_step integer;
  v_first integer;
  v_last integer;
begin
  select * into h from authz.day_hours(p_day);
  if not h.is_open then
    return;
  end if;
  v_step := (select s.start_step_minutes * 60 from public.filming_settings s where s.id);
  v_first := ceil(extract(epoch from h.opens) / v_step)::integer * v_step;
  v_last := (extract(epoch from h.closes) - round(p_hours * 3600))::integer;
  -- Ώρες σε τοπικό ρολόι· τη μέρα της αλλαγής ώρας τα δευτερόλεπτα από τα μεσάνυχτα δεν ταιριάζουν.
  return query
    select (p_day + make_interval(secs => g.sec)) at time zone 'Europe/Athens'
      from generate_series(v_first, v_last, v_step) as g(sec);
end;
$$;

-- ───────────── Χωρητικότητα ─────────────

-- Η μέγιστη ταυτόχρονη φόρτωση μέσα στο [p_starts, p_ends). Σημεία ελέγχου: η αρχή και κάθε έναρξη μέσα στο διάστημα.
-- Μετρούν τα Γυρίσματα pending/scheduled και οι εκκρεμείς μεταθέσεις τους (ως επιπλέον φόρτωση). Η εσωτερική Παραγωγή μετράει.
create function authz.slot_load(p_starts timestamptz, p_ends timestamptz, p_exclude uuid) returns integer
language sql stable security definer set search_path = ''
as $$
  with spans as (
    select f.starts_at as span_start, authz.filming_end(f.starts_at, f.hours) as span_end
      from public.filmings f
     where f.state in ('pending', 'scheduled') and f.id is distinct from p_exclude
    union all
    select f.reschedule_starts_at, authz.filming_end(f.reschedule_starts_at, f.reschedule_hours)
      from public.filmings f
     where f.state in ('pending', 'scheduled') and f.reschedule_starts_at is not null
       and f.id is distinct from p_exclude
  ), points as (
    select p_starts as at_time
    union
    select sp.span_start from spans sp where sp.span_start >= p_starts and sp.span_start < p_ends
  )
  select coalesce(max((
      select count(*) from spans sp where sp.span_start <= pt.at_time and pt.at_time < sp.span_end
    )), 0)::integer
    from points pt;
$$;

-- Το πρόβλημα μιας ώρας, ή null αν χωράει. Ελληνικά μηνύματα, με τη σειρά που ελέγχονται.
-- Ωράριο και Χωρητικότητα ισχύουν για όλους· διάρκεια και βήμα μόνο για τον πελάτη (p_client).
create function authz.slot_problem(p_starts timestamptz, p_hours numeric, p_exclude uuid, p_client boolean)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  s public.filming_settings;
  h record;
  v_day date;
  v_opens timestamptz;
  v_closes timestamptz;
  v_end timestamptz;
  v_minutes integer;
begin
  if p_starts is null or p_hours is null then
    return 'Γράψε μέρα και ώρα';
  end if;
  select x.* into s from public.filming_settings x where x.id;
  v_day := (p_starts at time zone 'Europe/Athens')::date;
  v_end := authz.filming_end(p_starts, p_hours);
  select * into h from authz.day_hours(v_day);
  if not h.is_open then
    return case h.reason
      when 'holiday' then 'Η μέρα είναι αργία'
      when 'not_set' then 'Το Ωράριο κρατήσεων δεν έχει οριστεί'
      else 'Η μέρα είναι κλειστή για κρατήσεις' end;
  end if;
  v_opens := (v_day + h.opens) at time zone 'Europe/Athens';
  v_closes := (v_day + h.closes) at time zone 'Europe/Athens';
  if p_starts < v_opens or v_end > v_closes then
    return 'Η ώρα είναι εκτός Ωραρίου';
  end if;
  if p_client then
    if not (p_hours = any (s.allowed_durations)) then
      return 'Η διάρκεια δεν επιτρέπεται';
    end if;
    v_minutes := (extract(epoch from (p_starts at time zone 'Europe/Athens')::time) / 60)::integer;
    if v_minutes % s.start_step_minutes <> 0 then
      return 'Η ώρα έναρξης δεν ταιριάζει στο βήμα';
    end if;
  end if;
  if authz.slot_load(p_starts, v_end, p_exclude) >= h.capacity then
    return 'Η ώρα είναι γεμάτη';
  end if;
  return null;
end;
$$;

-- Ό,τι ήδη καταναλώνει το ίδιο Γύρισμα από το υπόλοιπο της Περιόδου p_period (ώστε η αλλαγή του να μην το διπλομετράει).
-- 0 αν δεν μετράει (έξτρα, χωρίς Παροχή, κλειστό, ή άλλη Περίοδος).
create function authz.filming_own_units(p_filming uuid, p_period uuid) returns numeric
language plpgsql stable security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_agreement uuid;
  v_measure text;
  v_day date;
begin
  select x.* into f from public.filmings x where x.id = p_filming;
  if not found or f.is_extra or f.kind_id is null or f.state not in ('pending', 'scheduled')
     or f.period_id is distinct from p_period then
    return 0;
  end if;
  v_measure := (select k.measure from public.provision_kinds k where k.id = f.kind_id);
  if v_measure = 'per_hour' then
    return f.hours;
  end if;
  if v_measure = 'per_day' then
    select pr.agreement_id into v_agreement from public.productions pr where pr.id = f.production_id;
    v_day := (f.starts_at at time zone 'Europe/Athens')::date;
    if exists (
         select 1 from authz.kind_filmings(v_agreement, f.period_id, f.kind_id, 'used') g
          where g.id <> f.id and (g.starts_at at time zone 'Europe/Athens')::date = v_day)
       or exists (
         select 1 from authz.kind_filmings(v_agreement, f.period_id, f.kind_id, 'reserved') g
          where g.id <> f.id and (g.starts_at at time zone 'Europe/Athens')::date = v_day) then
      return 0;
    end if;
  end if;
  return 1;
end;
$$;

-- Το πρόβλημα μιας κράτησης του πελάτη (ή της αλλαγής του, με p_exclude το ίδιο Γύρισμα), ή null.
-- Η σειρά: προειδοποίηση, ορίζοντας, Ωράριο/Χωρητικότητα/διάρκεια/βήμα, Περίοδος, Παραγωγή, Παροχή.
create function authz.booking_problem(
  p_agreement uuid, p_kind uuid, p_starts timestamptz, p_hours numeric, p_exclude uuid
) returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  a public.agreements;
  s public.filming_settings;
  v_place record;
  v_problem text;
begin
  select x.* into a from public.agreements x where x.id = p_agreement;
  select x.* into s from public.filming_settings x where x.id;
  if p_starts <= now() + make_interval(hours => a.filming_notice_hours) then
    return format('Η κράτηση θέλει προειδοποίηση τουλάχιστον %s ωρών', a.filming_notice_hours);
  end if;
  if (p_starts at time zone 'Europe/Athens')::date > public.sales_today() + s.horizon_days then
    return format('Η κράτηση γίνεται το πολύ %s μέρες μπροστά', s.horizon_days);
  end if;
  v_problem := authz.slot_problem(p_starts, p_hours, p_exclude, true);
  if v_problem is not null then
    return v_problem;
  end if;
  select * into v_place from authz.filming_place(a.id, p_starts);
  if not found then
    return 'Η μέρα δεν πέφτει σε Περίοδο της Συμφωνίας';
  end if;
  if v_place.r_period is not null and not authz.period_is_open(v_place.r_period) then
    return 'Η Περίοδος δεν άνοιξε';
  end if;
  if not exists (select 1 from public.productions pr where pr.id = v_place.r_production and pr.state = 'open') then
    return 'Η Παραγωγή δεν δέχεται νέα Γυρίσματα';
  end if;
  if not v_place.r_outside and authz.filming_available(a.id, v_place.r_period, p_kind)
       + authz.filming_own_units(p_exclude, v_place.r_period)
       < authz.filming_need(a.id, v_place.r_period, p_kind, p_hours, p_starts) then
    return 'Οι Παροχές της Περιόδου τελείωσαν· στείλε Αίτημα στην ομάδα';
  end if;
  return null;
end;
$$;

-- Η ώρα είναι ανοιχτή για τον πελάτη (C2). Κρατά τη σημερινή υπογραφή.
create or replace function authz.filming_slot_open(p_starts timestamptz, p_hours numeric) returns boolean
language sql stable set search_path = ''
as $$ select authz.slot_problem(p_starts, p_hours, null, true) is null; $$;

-- Ετικέτα κατάστασης μέρας για το E5 (ίδιες με το prototype).
create function authz.booking_day_label(p_status text, p_notice integer) returns text
language sql stable set search_path = ''
as $$
  select case p_status
    when 'free' then 'Ελεύθερη'
    when 'full' then 'Γεμάτο'
    when 'closed' then 'Κλειστά'
    when 'holiday' then 'Αργία'
    when 'not_set' then 'Το Ωράριο δεν έχει οριστεί'
    when 'too_soon' then format('Νωρίς (%s ώρες ειδοποίηση)', p_notice)
    when 'outside_agreement' then 'Εκτός Συμφωνίας'
    when 'period_not_open' then 'Η Περίοδος δεν άνοιξε'
    when 'no_provision' then 'Χωρίς Παροχή'
  end;
$$;

-- Κατάσταση μιας μέρας για τον πελάτη: κλειστή ή αργία πρώτα· μετά νωρίς, εκτός Συμφωνίας, Περίοδος, Παροχή, γεμάτο.
create function authz.booking_day_status(
  p_agreement public.agreements, p_kind uuid, p_day date, p_exclude uuid default null
) returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  s public.filming_settings;
  h record;
  v_last timestamptz;
  v_min numeric;
  v_place record;
begin
  select x.* into s from public.filming_settings x where x.id;
  select * into h from authz.day_hours(p_day);
  if not h.is_open then
    return case h.reason when 'holiday' then 'holiday' when 'not_set' then 'not_set' else 'closed' end;
  end if;
  select max(c.slot_start) into v_last
    from unnest(s.allowed_durations) as d(dur)
   cross join lateral authz.day_candidates(p_day, d.dur) as c(slot_start);
  if v_last is null then
    return 'closed';
  end if;
  if v_last <= now() + make_interval(hours => p_agreement.filming_notice_hours) then
    return 'too_soon';
  end if;
  select min(x) into v_min from unnest(s.allowed_durations) as x;
  select * into v_place from authz.filming_place(p_agreement.id, v_last);
  if not found then
    return 'outside_agreement';
  end if;
  if v_place.r_period is not null and not authz.period_is_open(v_place.r_period) then
    return 'period_not_open';
  end if;
  if not exists (select 1 from public.productions pr where pr.id = v_place.r_production and pr.state = 'open') then
    return 'period_not_open';
  end if;
  if not v_place.r_outside and authz.filming_available(p_agreement.id, v_place.r_period, p_kind)
       + authz.filming_own_units(p_exclude, v_place.r_period)
       < authz.filming_need(p_agreement.id, v_place.r_period, p_kind, v_min, v_last) then
    return 'no_provision';
  end if;
  if exists (
       select 1 from unnest(s.allowed_durations) as d(dur)
        cross join lateral authz.day_candidates(p_day, d.dur) as c(slot_start)
       where authz.booking_problem(p_agreement.id, p_kind, c.slot_start, d.dur, p_exclude) is null) then
    return 'free';
  end if;
  return 'full';
end;
$$;

-- ───────────── Ωράριο: αποθήκευση και έλεγχοι εισόδου ─────────────

create function authz.parse_clock(p_text text) returns time
language plpgsql immutable set search_path = ''
as $$
begin
  if p_text is null or not (p_text ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or p_text = '24:00') then
    raise exception 'Μη έγκυρη ώρα' using errcode = 'P0001';
  end if;
  return p_text::time;
end;
$$;

-- Αντικαθιστά ολόκληρο το εβδομαδιαίο πρόγραμμα: 7 μέρες, η καθεμία μία φορά.
create function authz.save_booking_week(p_week jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_row jsonb;
  v_open boolean;
  v_opens time;
  v_closes time;
begin
  if coalesce(jsonb_typeof(p_week), '') <> 'array' then
    raise exception 'Το Ωράριο θέλει και τις 7 μέρες της εβδομάδας' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_week) <> 7 or (
       select count(distinct (x ->> 'dow')::integer) from jsonb_array_elements(p_week) x
        where (x ->> 'dow')::integer between 1 and 7) <> 7 then
    raise exception 'Το Ωράριο θέλει και τις 7 μέρες της εβδομάδας' using errcode = 'P0001';
  end if;
  for v_row in select x.value from jsonb_array_elements(p_week) x loop
    v_open := coalesce((v_row ->> 'isOpen')::boolean, false);
    v_opens := null;
    v_closes := null;
    if v_open then
      v_opens := authz.parse_clock(v_row ->> 'opens');
      v_closes := authz.parse_clock(v_row ->> 'closes');
      if v_closes <= v_opens then
        raise exception 'Η ώρα κλεισίματος πρέπει να είναι μετά την ώρα ανοίγματος' using errcode = 'P0001';
      end if;
    end if;
    insert into public.booking_week (dow, is_open, opens, closes)
    values ((v_row ->> 'dow')::smallint, v_open, v_opens, v_closes)
    on conflict (dow) do update
      set is_open = excluded.is_open, opens = excluded.opens, closes = excluded.closes;
  end loop;
end;
$$;

-- Έλεγχος μιας εξαίρεσης πριν από την αποθήκευση (ελληνικά μηνύματα αντί για 23514).
create function authz.check_exception(p_closed boolean, p_opens time, p_closes time, p_capacity integer)
returns void
language plpgsql immutable set search_path = ''
as $$
begin
  if p_closed and (p_opens is not null or p_closes is not null or p_capacity is not null) then
    raise exception 'Κλεισμένη μέρα δεν έχει ώρες ούτε Χωρητικότητα' using errcode = 'P0001';
  end if;
  if not p_closed and ((p_opens is null) <> (p_closes is null)) then
    raise exception 'Η εξαίρεση θέλει και τις δύο ώρες ή καμία' using errcode = 'P0001';
  end if;
  if p_opens is not null and p_closes is not null and p_closes <= p_opens then
    raise exception 'Η ώρα κλεισίματος πρέπει να είναι μετά την ώρα ανοίγματος' using errcode = 'P0001';
  end if;
  if p_capacity is not null and p_capacity not between 1 and 20 then
    raise exception 'Η Χωρητικότητα είναι από 1 έως 20' using errcode = 'P0001';
  end if;
end;
$$;

-- ───────────── Κανόνες γυρισμάτων: Χωρητικότητα και ελέγχοι εισόδου ─────────────

-- Προειδοποίηση για την ομάδα πριν κλείσει: πρόβλημα ώρας, φόρτωση και Χωρητικότητα της ώρας.
create function public.filming_slot_check(p_starts_at timestamptz, p_hours numeric, p_exclude uuid default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_capacity smallint;
begin
  perform authz.require('filming.book');
  perform authz.require_filming_slot(p_starts_at, p_hours);
  select h.capacity into v_capacity from authz.day_hours((p_starts_at at time zone 'Europe/Athens')::date) h;
  return jsonb_build_object(
    'problem', authz.slot_problem(p_starts_at, p_hours, p_exclude, false),
    'load', authz.slot_load(p_starts_at, authz.filming_end(p_starts_at, p_hours), p_exclude),
    'capacity', v_capacity
  );
end;
$$;

-- Οθόνη Ωραρίου (Ρυθμίσεις): εβδομάδα, Χωρητικότητα, διάρκειες, εξαιρέσεις και αργίες του τρέχοντος και του επόμενου έτους.
create function public.booking_hours_view() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  s public.filming_settings;
  v_year integer := extract(year from (now() at time zone 'Europe/Athens'))::integer;
begin
  if not (authz.has('settings.manage') or authz.has('filming.book')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select x.* into s from public.filming_settings x where x.id;
  return jsonb_build_object(
    'isSet', s.booking_hours_set_at is not null,
    'week', (
      select jsonb_agg(jsonb_build_object(
          'dow', d.dow, 'isOpen', coalesce(w.is_open, false),
          'opens', left(w.opens::text, 5), 'closes', left(w.closes::text, 5)
        ) order by d.dow)
        from generate_series(1, 7) as d(dow)
        left join public.booking_week w on w.dow = d.dow
    ),
    'capacity', s.capacity,
    'durations', to_jsonb(array(select x from unnest(s.allowed_durations) x order by x)),
    'stepMinutes', s.start_step_minutes,
    'exceptions', coalesce((
      select jsonb_agg(jsonb_build_object(
          'day', e.day, 'isClosed', e.is_closed, 'opens', left(e.opens::text, 5),
          'closes', left(e.closes::text, 5), 'capacity', e.capacity, 'note', e.note
        ) order by e.day)
        from public.booking_exceptions e
       where e.day >= public.sales_today()
    ), '[]'::jsonb),
    'holidays', coalesce((
      select jsonb_agg(jsonb_build_object(
          'day', h.day, 'name', h.name, 'movable', h.movable, 'isOpen', x.is_open
        ) order by h.day)
        from (
          select * from authz.greek_holidays(v_year)
          union all
          select * from authz.greek_holidays(v_year + 1)
        ) h
        cross join lateral (select dh.is_open from authz.day_hours(h.day) dh) x
    ), '[]'::jsonb)
  );
end;
$$;

-- ───────────── Εγγραφή: Ωράριο, Χωρητικότητα, Αργίες ─────────────

-- Χωρητικότητα και Ωράριο μπλοκάρουν μόνο τον πελάτη: η ομάδα κλείνει κανονικά (Κ3).
-- Η ομάδα ξέρει τη διαθέσιμη ώρα από το filming_slot_check.

create function public.booking_hours_save(p_settings jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v jsonb := coalesce(p_settings, '{}'::jsonb);
  v_durations numeric[];
  v_capacity integer;
  v_step integer;
begin
  perform authz.require('settings.manage');
  if jsonb_typeof(v) <> 'object' then
    raise exception 'Το Ωράριο θέλει αντικείμενο' using errcode = 'P0001';
  end if;
  v_durations := array(select (x.value #>> '{}')::numeric from jsonb_array_elements(coalesce(v -> 'durations', '[]'::jsonb)) x);
  if cardinality(v_durations) = 0 then
    raise exception 'Διάλεξε τουλάχιστον μία διάρκεια' using errcode = 'P0001';
  end if;
  if not authz.durations_valid(v_durations) then
    raise exception 'Οι διάρκειες είναι από 0,5 έως 12 ώρες, ανά μισή ώρα, χωρίς διπλά' using errcode = 'P0001';
  end if;
  v_capacity := (v ->> 'capacity')::integer;
  if v_capacity is null or v_capacity not between 1 and 20 then
    raise exception 'Η Χωρητικότητα είναι από 1 έως 20' using errcode = 'P0001';
  end if;
  v_step := (v ->> 'stepMinutes')::integer;
  if v_step is null or v_step not in (15, 30, 60) then
    raise exception 'Το βήμα ώρας έναρξης είναι 15, 30 ή 60 λεπτά' using errcode = 'P0001';
  end if;
  perform authz.save_booking_week(v -> 'week');
  update public.filming_settings x
     set capacity = v_capacity::smallint,
         allowed_durations = v_durations,
         start_step_minutes = v_step::smallint,
         booking_hours_set_at = coalesce(x.booking_hours_set_at, now())
   where x.id;
end;
$$;

create function public.booking_exception_save(
  p_day date, p_is_closed boolean, p_opens time, p_closes time, p_capacity integer, p_note text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_closed boolean := coalesce(p_is_closed, false);
begin
  perform authz.require('settings.manage');
  if p_day is null then
    raise exception 'Γράψε ημερομηνία' using errcode = 'P0001';
  end if;
  if p_day < public.sales_today() then
    raise exception 'Η εξαίρεση δεν μπορεί να είναι στο παρελθόν' using errcode = 'P0001';
  end if;
  perform authz.check_exception(v_closed, p_opens, p_closes, p_capacity);
  insert into public.booking_exceptions (day, is_closed, opens, closes, capacity, note)
  values (p_day, v_closed, p_opens, p_closes, p_capacity::smallint, nullif(trim(coalesce(p_note, '')), ''))
  on conflict (day) do update
    set is_closed = excluded.is_closed, opens = excluded.opens, closes = excluded.closes,
        capacity = excluded.capacity, note = excluded.note;
end;
$$;

create function public.booking_exception_delete(p_day date) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('settings.manage');
  delete from public.booking_exceptions e where e.day = p_day;
  if not found then
    raise exception 'Η εξαίρεση δεν βρέθηκε' using errcode = 'P0001';
  end if;
end;
$$;

-- ───────────── Πελάτης: E5 ─────────────

create function public.booking_options() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  s public.filming_settings;
begin
  perform authz.require_client_permission('c.book');
  select x.* into s from public.filming_settings x where x.id;
  return jsonb_build_object(
    'isSet', s.booking_hours_set_at is not null,
    'durations', to_jsonb(array(select x from unnest(s.allowed_durations) x order by x)),
    'stepMinutes', s.start_step_minutes,
    'horizonDays', s.horizon_days,
    'agreements', public.filming_new_options()
  );
end;
$$;

-- Η αλλαγή Γυρίσματος από τον πελάτη: το Γύρισμα πρέπει να είναι δικό του και της ίδιας Συμφωνίας. Αλλιώς 42501.
create function authz.require_reschedule_filming(p_agreement uuid, p_filming uuid) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_filming is null then
    return;
  end if;
  if not authz.is_client_of_filming(p_filming) or not exists (
       select 1 from public.filmings f
         join public.productions pr on pr.id = f.production_id
        where f.id = p_filming and pr.agreement_id = p_agreement) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

create function public.booking_days(p_agreement uuid, p_kind uuid, p_exclude uuid default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_today date := public.sales_today();
  v_horizon integer;
begin
  perform authz.require_client_permission('c.book');
  a := authz.client_agreement(p_agreement);
  perform authz.require_agreement_bookable(a);
  perform authz.filming_check_kind(a.id, p_kind);
  perform authz.require_reschedule_filming(a.id, p_exclude);
  select s.horizon_days into v_horizon from public.filming_settings s where s.id;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'day', g.day, 'status', st.status,
        'label', authz.booking_day_label(st.status, a.filming_notice_hours)
      ) order by g.day)
      from (
        select x.ts::date as day
          from generate_series(v_today::timestamp, (v_today + v_horizon)::timestamp, interval '1 day') as x(ts)
      ) g
     cross join lateral (select authz.booking_day_status(a, p_kind, g.day, p_exclude) as status) st
  ), '[]'::jsonb);
end;
$$;

create function public.booking_slots(
  p_agreement uuid, p_kind uuid, p_day date, p_hours numeric, p_exclude uuid default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
begin
  perform authz.require_client_permission('c.book');
  a := authz.client_agreement(p_agreement);
  perform authz.require_agreement_bookable(a);
  perform authz.filming_check_kind(a.id, p_kind);
  perform authz.require_reschedule_filming(a.id, p_exclude);
  return coalesce((
    select jsonb_agg(to_jsonb(c.slot_start) order by c.slot_start)
      from authz.day_candidates(p_day, p_hours) as c(slot_start)
     where authz.booking_problem(a.id, p_kind, c.slot_start, p_hours, p_exclude) is null
  ), '[]'::jsonb);
end;
$$;

-- ───────────── Email προς τον πελάτη ─────────────

-- Γράφει γραμμή στην ουρά email_outbox για τον Χρήστη πελάτη του Γυρίσματος (κράτηση: δημιουργός· μετάθεση: αιτών).
-- Καλείται μέσα στη συναλλαγή της απόφασης. Χωρίς παραλήπτη ή email δεν γράφει τίποτα.
create function authz.email_client_about(p_filming uuid, p_kind text, p_payload jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_user uuid;
  v_email text;
  v_name text;
  v_locale text;
begin
  select x.* into f from public.filmings x where x.id = p_filming;
  v_user := case when p_kind = 'reschedule_decision' then f.reschedule_requested_by else f.created_by end;
  if v_user is null then
    return;
  end if;
  select u.email into v_email from auth.users u where u.id = v_user;
  if coalesce(v_email, '') = '' then
    return;
  end if;
  select cu.name into v_name from public.client_users cu
   where cu.user_id = v_user and cu.removed_at is null
   order by cu.is_current desc, cu.joined_at limit 1;
  select t.language into v_locale from public.team_users t where t.user_id = v_user;
  insert into public.email_outbox (kind, to_name, to_email, locale, payload, created_by)
  values (p_kind, coalesce(v_name, ''), lower(trim(v_email)), coalesce(v_locale, 'el'), p_payload, auth.uid());
end;
$$;

-- ───────────── Κράτηση πελάτη και ομάδα ─────────────

-- Κλείσιμο από τον πελάτη (c.book). Οι έλεγχοι είναι ίδιοι με το E5· το μήνυμα είναι το συγκεκριμένο της ώρας.
create or replace function public.filming_book(
  p_agreement uuid, p_starts_at timestamptz, p_hours numeric, p_kind uuid, p_location text, p_note text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  s public.filming_settings;
  v_problem text;
  v_place record;
  v_state text;
  v_id uuid;
begin
  perform authz.require_client_permission('c.book');
  perform pg_advisory_xact_lock(hashtext('dms.booking'));
  a := authz.client_agreement(p_agreement);
  perform authz.require_agreement_bookable(a);
  perform authz.require_filming_slot(p_starts_at, p_hours);
  perform authz.filming_check_kind(a.id, p_kind);
  v_problem := authz.booking_problem(a.id, p_kind, p_starts_at, p_hours, null);
  if v_problem is not null then
    raise exception '%', v_problem using errcode = 'P0001';
  end if;
  select x.* into s from public.filming_settings x where x.id;
  select * into v_place from authz.filming_place(a.id, p_starts_at);
  v_state := case when s.booking_needs_approval or v_place.r_outside then 'pending' else 'scheduled' end;
  insert into public.filmings (
    production_id, period_id, client_id, kind_id, starts_at, hours, location, origin, state, is_extra, client_note
  ) values (
    v_place.r_production, v_place.r_period, authz.client_user_client_id(), p_kind, p_starts_at, p_hours,
    nullif(trim(coalesce(p_location, '')), ''), 'client', v_state, v_place.r_outside,
    nullif(trim(coalesce(p_note, '')), '')
  )
  returning id into v_id;
  perform authz.filming_event(v_id, 'booked', jsonb_build_object('state', v_state, 'extra', v_place.r_outside));
  return v_id;
end;
$$;

-- Η ομάδα κλείνει χωρίς να μπλοκάρεται από Ωράριο ή Χωρητικότητα (Κ3). Ο έλεγχος είναι στο filming_slot_check.
create or replace function public.filming_create(
  p_agreement uuid, p_starts_at timestamptz, p_hours numeric, p_kind uuid, p_location text, p_note text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_client uuid;
  v_place record;
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
  insert into public.filmings (
    production_id, period_id, client_id, kind_id, starts_at, hours, location, origin, state, is_extra, internal_note
  ) values (
    v_place.r_production, v_place.r_period, v_client, p_kind, p_starts_at, p_hours,
    nullif(trim(coalesce(p_location, '')), ''), 'team', 'scheduled',
    v_place.r_outside or p_kind is null
      or authz.filming_available(a.id, v_place.r_period, p_kind)
         < authz.filming_need(a.id, v_place.r_period, p_kind, p_hours, p_starts_at),
    nullif(trim(coalesce(p_note, '')), '')
  )
  returning id into v_id;
  perform authz.filming_event(v_id, 'created', jsonb_build_object('origin', 'team'));
  return v_id;
end;
$$;

-- Η σύνοψη της ουράς και ο Χρήστης: το πρόβλημα της ώρας και το αίτημα μετάθεσης φαίνονται στο Γύρισμα.
create or replace function authz.filming_signals(p_filming uuid, p_internal boolean) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'equipmentConflict', p_internal and authz.filming_has_conflict(f.id),
    'isExtra', f.is_extra,
    'cancelRequest', f.cancel_request_at is not null,
    'crewDeclined', p_internal and exists (select 1 from public.filming_crew c where c.filming_id = f.id and c.response = 'declined'),
    'slotProblem', case when authz.is_team_user() and f.state in ('pending', 'scheduled')
                        then authz.slot_problem(f.starts_at, f.hours, f.id, false) end,
    'pendingReschedule', case when f.reschedule_starts_at is null then null else jsonb_build_object(
        'startsAt', f.reschedule_starts_at, 'hours', f.reschedule_hours, 'requestedAt', f.reschedule_requested_at) end
  )
  from public.filmings f
  where f.id = p_filming;
$$;

-- Τι μπορεί να κάνει ο Χρήστης στο Γύρισμα, με την κατάστασή του τώρα (και οι τρεις μετατάσεις της μετάθεσης).
create or replace function authz.filming_viewer_can(p_filming uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_team boolean := authz.is_team_user();
  v_open boolean;
  v_approve boolean;
  v_book boolean;
  v_crew boolean;
  v_equipment boolean;
begin
  select x.* into f from public.filmings x where x.id = p_filming;
  if not found then
    return '{}'::jsonb;
  end if;
  v_open := f.state in ('pending', 'scheduled');
  v_approve := v_team and authz.can_approve_filming();
  v_book := v_team and v_open and authz.can_book_filming(f.id);
  v_crew := v_team and v_open and authz.can_crew_filming(f.id);
  v_equipment := v_team and v_open and authz.can_reserve_for_filming(f.id);
  return jsonb_build_object(
    'approve', v_approve and f.state = 'pending',
    'reject', v_approve and f.state = 'pending',
    'cancel', v_book,
    'reschedule', v_book,
    'markDone', v_crew and f.state = 'scheduled',
    'markNoShow', v_crew and f.state = 'scheduled',
    'undo', v_approve and f.state in ('done', 'no_show'),
    'crew', v_crew,
    'equipment', v_equipment,
    'decideCancel', v_approve and f.state = 'scheduled' and f.cancel_request_at is not null,
    'decideReschedule', v_approve and f.reschedule_starts_at is not null,
    'clientCancel', authz.is_client_of_filming(f.id) and v_open and (f.state = 'pending' or authz.before_cancel_limit(f.id)),
    'requestCancel', authz.is_client_of_filming(f.id) and f.state = 'scheduled'
                     and f.cancel_request_at is null and not authz.before_cancel_limit(f.id),
    'clientReschedule', authz.is_client_of_filming(f.id) and f.state = 'scheduled' and f.reschedule_starts_at is null
                        and f.cancel_request_at is null and authz.before_cancel_limit(f.id),
    'clientWithdrawReschedule', authz.is_client_of_filming(f.id) and f.reschedule_starts_at is not null
  );
end;
$$;

-- Καθαρίζει την εκκρεμή μετάθεση όταν το Γύρισμα κλείνει ή ζητείται ακύρωση (κανείς δεν την αποφασίζει πια).
create function authz.clear_reschedule_on_close() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.state not in ('pending', 'scheduled') or new.cancel_request_at is not null then
    new.reschedule_starts_at := null;
    new.reschedule_hours := null;
    new.reschedule_requested_at := null;
    new.reschedule_requested_by := null;
  end if;
  return new;
end;
$$;

create trigger filmings_reschedule_close before update on public.filmings
  for each row execute function authz.clear_reschedule_on_close();

-- Η λίστα αιτημάτων της ουράς (τρίτο κλειδί): η νέα ώρα και αν χωράει τώρα.
create or replace function public.filming_queue_view() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_no_answer integer := (select s.no_answer_hours from public.filming_settings s where s.id);
  v_pending jsonb;
  v_requests jsonb;
  v_reschedules jsonb;
begin
  perform authz.require('filming.approve');
  if not authz.can_approve_filming() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(x.entry order by x.created_at, x.id), '[]'::jsonb) into v_pending
    from (
      select f.id, f.created_at, jsonb_build_object(
          'id', f.id, 'startsAt', f.starts_at, 'hours', f.hours, 'createdAt', f.created_at,
          'waitingHours', round((extract(epoch from (now() - f.created_at)) / 3600)::numeric, 1),
          'waitingLong', (now() - f.created_at) > make_interval(hours => v_no_answer),
          'client', (select jsonb_build_object('id', c.id, 'name', c.name) from public.clients c where c.id = f.client_id),
          'production', (select jsonb_build_object('id', pr.id, 'title', pr.title) from public.productions pr where pr.id = f.production_id),
          'provision', authz.filming_balance_json(f.id)
        ) as entry
        from public.filmings f
       where f.state = 'pending'
    ) x;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', f.id, 'startsAt', f.starts_at, 'hours', f.hours,
           'requestedAt', f.cancel_request_at, 'reason', f.cancel_request_reason,
           'client', (select jsonb_build_object('id', c.id, 'name', c.name) from public.clients c where c.id = f.client_id),
           'production', (select jsonb_build_object('id', pr.id, 'title', pr.title) from public.productions pr where pr.id = f.production_id),
           'willBurn', a.late_cancel_burns
         ) order by f.cancel_request_at, f.id), '[]'::jsonb)
    into v_requests
    from public.filmings f
    join public.productions pr on pr.id = f.production_id
    join public.agreements a on a.id = pr.agreement_id
   where f.state = 'scheduled' and f.cancel_request_at is not null;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', f.id, 'startsAt', f.starts_at, 'hours', f.hours,
           'newStartsAt', f.reschedule_starts_at, 'newHours', f.reschedule_hours, 'requestedAt', f.reschedule_requested_at,
           'client', (select jsonb_build_object('id', c.id, 'name', c.name) from public.clients c where c.id = f.client_id),
           'production', (select jsonb_build_object('id', pr.id, 'title', pr.title) from public.productions pr where pr.id = f.production_id),
           'slotProblem', case when f.reschedule_starts_at <= now() then 'Η νέα ώρα πέρασε'
                               else authz.slot_problem(f.reschedule_starts_at, f.reschedule_hours, f.id, true) end
         ) order by f.reschedule_requested_at, f.id), '[]'::jsonb)
    into v_reschedules
    from public.filmings f
   where f.state = 'scheduled' and f.reschedule_starts_at is not null;
  return jsonb_build_object('pending', v_pending, 'cancelRequests', v_requests, 'rescheduleRequests', v_reschedules);
end;
$$;

-- Αποφάσεις έγκρισης και απόρριψης: για κράτηση πελάτη γράφεται και email (ουρά).
create or replace function public.filming_approve(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
begin
  perform authz.require('filming.approve');
  perform authz.filming_gate(p_id, authz.can_approve_filming(), 'filming.approve');
  select x.* into f from public.filmings x where x.id = p_id for update;
  if f.state <> 'pending' then
    raise exception 'Μόνο γύρισμα που αναμένει έγκριση εγκρίνεται' using errcode = 'P0001';
  end if;
  update public.filmings x set state = 'scheduled', approved_at = now(), approved_by = auth.uid() where x.id = p_id;
  perform authz.filming_event(p_id, 'approved', '{}'::jsonb);
  if f.origin = 'client' then
    perform authz.email_client_about(p_id, 'filming_decision', jsonb_build_object(
      'filmingId', p_id, 'decision', 'approved', 'startsAt', f.starts_at, 'hours', f.hours, 'reason', null));
  end if;
end;
$$;

create or replace function public.filming_reject(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  perform authz.require('filming.approve');
  perform authz.filming_gate(p_id, authz.can_approve_filming(), 'filming.approve');
  if v_reason is null then
    raise exception 'Η απόρριψη θέλει λόγο' using errcode = 'P0001';
  end if;
  select x.* into f from public.filmings x where x.id = p_id for update;
  if f.state <> 'pending' then
    raise exception 'Μόνο γύρισμα που αναμένει έγκριση απορρίπτεται' using errcode = 'P0001';
  end if;
  update public.filmings x
     set state = 'rejected', rejected_at = now(), rejected_by = auth.uid(), rejected_reason = v_reason
   where x.id = p_id;
  perform authz.filming_event(p_id, 'rejected', jsonb_build_object('reason', v_reason));
  if f.origin = 'client' then
    perform authz.email_client_about(p_id, 'filming_decision', jsonb_build_object(
      'filmingId', p_id, 'decision', 'rejected', 'startsAt', f.starts_at, 'hours', f.hours, 'reason', v_reason));
  end if;
end;
$$;

-- ───────────── Μετάθεση ─────────────

-- Η κοινή μετακίνηση: Παραγωγή/Περίοδος, έξτρα, Συνεργείο, απαντήσεις, καθαρισμός εκκρεμούς μετάθεσης, γεγονός.
-- Η ομάδα δεν μπλοκάρεται από Ωράριο ή Χωρητικότητα (Κ3).
create function authz.filming_move(p_id uuid, p_starts timestamptz, p_hours numeric) returns void
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
  select coalesce(s.change_resets_confirmations, false) into v_reset from public.filming_settings s where s.id;
  if v_reset then
    update public.filming_crew c set response = 'pending', reason = null, responded_at = null where c.filming_id = p_id;
  end if;
  update public.filmings x
     set reschedule_starts_at = null, reschedule_hours = null, reschedule_requested_at = null, reschedule_requested_by = null
   where x.id = p_id and x.reschedule_starts_at is not null;
  perform authz.filming_event(p_id, 'rescheduled', jsonb_build_object('from', f.starts_at, 'to', p_starts, 'hours', p_hours));
end;
$$;

-- Μετάθεση από την ομάδα (filming.book). Ίδια συμπεριφορά με πριν, τώρα μέσω της κοινής authz.filming_move.
create or replace function public.filming_reschedule(p_id uuid, p_starts_at timestamptz, p_hours numeric) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('filming.book');
  perform authz.filming_gate(p_id, authz.can_book_filming(p_id), 'filming.book');
  perform authz.filming_move(p_id, p_starts_at, p_hours);
end;
$$;

-- Μετάθεση από τον πελάτη (c.book). Με Κανόνα επανέγκρισης: γράφει το αίτημα. Αλλιώς μετακινεί αμέσως.
create function public.filming_client_reschedule(p_id uuid, p_starts_at timestamptz, p_hours numeric) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
  a public.agreements;
  s public.filming_settings;
  v_agreement uuid;
  v_place record;
  v_problem text;
begin
  perform authz.require_client_permission('c.book');
  perform authz.filming_gate(p_id, authz.is_client_of_filming(p_id), 'c.book');
  perform pg_advisory_xact_lock(hashtext('dms.booking'));
  select x.* into f from public.filmings x where x.id = p_id for update;
  if f.state <> 'scheduled' then
    raise exception 'Μόνο προγραμματισμένο Γύρισμα μετατίθεται από τον πελάτη' using errcode = 'P0001';
  end if;
  if not authz.before_cancel_limit(p_id) then
    raise exception 'Μετά το Όριο ακύρωσης η μετάθεση γίνεται μόνο από την ομάδα' using errcode = 'P0001';
  end if;
  if f.cancel_request_at is not null then
    raise exception 'Υπάρχει ήδη αίτημα ακύρωσης για αυτό το Γύρισμα' using errcode = 'P0001';
  end if;
  if f.reschedule_starts_at is not null then
    raise exception 'Υπάρχει ήδη αίτημα μετάθεσης για αυτό το Γύρισμα' using errcode = 'P0001';
  end if;
  perform authz.require_filming_slot(p_starts_at, p_hours);
  select pr.agreement_id into v_agreement from public.productions pr where pr.id = f.production_id;
  a := authz.client_agreement(v_agreement);
  perform authz.require_agreement_bookable(a);
  v_problem := authz.booking_problem(a.id, f.kind_id, p_starts_at, p_hours, p_id);
  if v_problem is not null then
    raise exception '%', v_problem using errcode = 'P0001';
  end if;
  select * into v_place from authz.filming_place(a.id, p_starts_at);
  select x.* into s from public.filming_settings x where x.id;
  if s.reschedule_needs_approval or v_place.r_outside then
    update public.filmings x
       set reschedule_starts_at = p_starts_at, reschedule_hours = p_hours,
           reschedule_requested_at = now(), reschedule_requested_by = auth.uid()
     where x.id = p_id;
    perform authz.filming_event(p_id, 'reschedule_requested', jsonb_build_object(
      'from', f.starts_at, 'to', p_starts_at, 'hours', p_hours));
  else
    perform authz.filming_move(p_id, p_starts_at, p_hours);
  end if;
end;
$$;

-- Ο πελάτης αποσύρει το αίτημα μετάθεσης· το Γύρισμα μένει στην παλιά ώρα.
create function public.filming_client_reschedule_withdraw(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
begin
  perform authz.require_client_permission('c.book');
  perform authz.filming_gate(p_id, authz.is_client_of_filming(p_id), 'c.book');
  select x.* into f from public.filmings x where x.id = p_id for update;
  if f.reschedule_starts_at is null then
    raise exception 'Δεν υπάρχει αίτημα μετάθεσης για αυτό το Γύρισμα' using errcode = 'P0001';
  end if;
  update public.filmings x
     set reschedule_starts_at = null, reschedule_hours = null, reschedule_requested_at = null, reschedule_requested_by = null
   where x.id = p_id;
  perform authz.filming_event(p_id, 'reschedule_withdrawn', '{}'::jsonb);
end;
$$;

-- Απόφαση της ομάδας στο αίτημα μετάθεσης (filming.approve). Αποδοχή: ξαναελέγχει την ώρα και μετακινεί.
-- Απόρριψη (με λόγο): το Γύρισμα μένει στην παλιά ώρα, δεν ακυρώνεται.
create function public.filming_decide_reschedule(p_id uuid, p_accept boolean, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_problem text;
begin
  perform authz.require('filming.approve');
  perform authz.filming_gate(p_id, authz.can_approve_filming(), 'filming.approve');
  perform pg_advisory_xact_lock(hashtext('dms.booking'));
  select x.* into f from public.filmings x where x.id = p_id for update;
  if f.reschedule_starts_at is null then
    raise exception 'Δεν υπάρχει αίτημα μετάθεσης για αυτό το Γύρισμα' using errcode = 'P0001';
  end if;
  if coalesce(p_accept, false) then
    if f.reschedule_starts_at <= now() then
      raise exception 'Η νέα ώρα πέρασε' using errcode = 'P0001';
    end if;
    v_problem := authz.slot_problem(f.reschedule_starts_at, f.reschedule_hours, p_id, true);
    if v_problem is not null then
      raise exception '%', v_problem using errcode = 'P0001';
    end if;
    perform authz.email_client_about(p_id, 'reschedule_decision', jsonb_build_object(
      'filmingId', p_id, 'decision', 'approved', 'startsAt', f.reschedule_starts_at, 'hours', f.reschedule_hours,
      'previousStartsAt', f.starts_at, 'reason', null));
    perform authz.filming_move(p_id, f.reschedule_starts_at, f.reschedule_hours);
    perform authz.filming_event(p_id, 'reschedule_decided', jsonb_build_object('accepted', true));
    return;
  end if;
  if v_reason is null then
    raise exception 'Η απόρριψη θέλει λόγο' using errcode = 'P0001';
  end if;
  perform authz.email_client_about(p_id, 'reschedule_decision', jsonb_build_object(
    'filmingId', p_id, 'decision', 'rejected', 'startsAt', f.starts_at, 'hours', f.hours, 'reason', v_reason));
  update public.filmings x
     set reschedule_starts_at = null, reschedule_hours = null, reschedule_requested_at = null, reschedule_requested_by = null
   where x.id = p_id;
  perform authz.filming_event(p_id, 'reschedule_decided', jsonb_build_object('accepted', false, 'reason', v_reason));
end;
$$;

-- ───────────── Ίχνος ─────────────

-- Ξαναγράφεται ΟΛΟΚΛΗΡΗ η λίστα (default deny)· προστέθηκαν οι δύο πίνακες του Ωραρίου, μόνο για Ρυθμίσεις.
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
    else false
  end;
$$;

-- ───────────── Ετοιμότητα ─────────────

-- Το «Ωράριο κρατήσεων» είναι έτοιμο μόνο όταν αποθηκεύτηκε έστω μία φορά (γραμμή του Ελέγχου ετοιμότητας).
create or replace function authz.readiness_items()
returns table (item text, done boolean, note text)
language sql stable security definer set search_path = ''
as $$
  with c as (select * from public.company_settings where id)
  select 'company_details', (
           c.legal_name <> '' and c.trade_name <> '' and c.address <> '' and c.phone <> ''
           and c.email <> '' and c.signatory_name <> '' and c.signatory_title <> ''), null::text
    from c
  union all
  select 'tax_details', (c.tax_id <> '' and c.tax_office <> '' and c.gemi <> ''), null from c
  union all
  select 'bank_account', exists (select 1 from public.bank_accounts b where b.is_default and b.retired_at is null), null
  union all
  select 'logo', false, 'module:files'
  union all
  select 'booking_hours', exists (select 1 from public.filming_settings s where s.id and s.booking_hours_set_at is not null), 'module:filming'
  union all
  select 'catalogue', (
           exists (select 1 from public.catalogue_items i where i.retired_at is null)
           and not exists (
             select 1
               from public.catalogue_items i
               join public.catalogue_item_amounts a on a.item_id = i.id
              where i.retired_at is null and a.price <= 0)), null
  union all
  select 'costs', coalesce((
           select m.expenses_total > 0 from public.cost_months m
            where m.month <= authz.athens_month_start()
            order by m.month desc limit 1), false), null
  union all
  select 'knowledge', false, 'module:knowledge'
  union all
  select 'legal_texts', exists (select 1 from public.readiness_confirmations r where r.item = 'legal_texts'), 'confirm'
  union all
  select 'identity_values', exists (select 1 from public.readiness_confirmations r where r.item = 'identity_values'), 'confirm'
  union all
  select 'automation_texts', false, 'module:automations';
$$;

-- ───────────── Δικαιώματα ─────────────

-- Οι βοηθητικές συναρτήσεις δεν καλούνται από κανέναν έξω από τα δικά τους RPC.
revoke all on function
  authz.durations_valid(numeric[]), authz.orthodox_easter(integer), authz.greek_holidays(integer),
  authz.is_holiday(date), authz.day_hours(date), authz.day_candidates(date, numeric),
  authz.slot_load(timestamptz, timestamptz, uuid), authz.slot_problem(timestamptz, numeric, uuid, boolean),
  authz.filming_own_units(uuid, uuid), authz.booking_problem(uuid, uuid, timestamptz, numeric, uuid),
  authz.booking_day_label(text, integer), authz.booking_day_status(public.agreements, uuid, date, uuid),
  authz.require_reschedule_filming(uuid, uuid),
  authz.parse_clock(text), authz.save_booking_week(jsonb), authz.check_exception(boolean, time, time, integer),
  authz.email_client_about(uuid, text, jsonb), authz.filming_move(uuid, timestamptz, numeric),
  authz.clear_reschedule_on_close(), authz.filming_slot_open(timestamptz, numeric)
  from public, anon, authenticated;

revoke all on function public.is_working_day(date) from public, anon;
grant execute on function public.is_working_day(date) to authenticated;

revoke all on table public.booking_week, public.booking_exceptions from anon, authenticated;

revoke all on function
  public.filming_slot_check(timestamptz, numeric, uuid), public.booking_hours_view(), public.booking_hours_save(jsonb),
  public.booking_exception_save(date, boolean, time, time, integer, text), public.booking_exception_delete(date),
  public.booking_options(), public.booking_days(uuid, uuid, uuid), public.booking_slots(uuid, uuid, date, numeric, uuid),
  public.filming_client_reschedule(uuid, timestamptz, numeric), public.filming_client_reschedule_withdraw(uuid),
  public.filming_decide_reschedule(uuid, boolean, text)
  from public, anon;

grant execute on function
  public.filming_slot_check(timestamptz, numeric, uuid), public.booking_hours_view(), public.booking_hours_save(jsonb),
  public.booking_exception_save(date, boolean, time, time, integer, text), public.booking_exception_delete(date),
  public.booking_options(), public.booking_days(uuid, uuid, uuid), public.booking_slots(uuid, uuid, date, numeric, uuid),
  public.filming_client_reschedule(uuid, timestamptz, numeric), public.filming_client_reschedule_withdraw(uuid),
  public.filming_decide_reschedule(uuid, boolean, text)
  to authenticated;
