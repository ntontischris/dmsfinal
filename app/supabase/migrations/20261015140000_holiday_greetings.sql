-- Ειδοποιήσεις Kγ (#172), μέρος 1: Ευχές Αργιών (δέσμη Α12).
--
--  • Οι αργίες της χρονιάς = οι 13 επίσημες (authz.greek_holidays) μείον όσες έσβησε ο admin (με το όνομά τους), συν όσες
--    πρόσθεσε (μία ημερομηνία, ή μήνας-μέρα για κάθε χρόνο).
--  • Πίνακας κλειστός (RLS χωρίς policies, revoke). Ανάγνωση και αλλαγή μόνο με automations.manage (το UI έρχεται στο Kδ).
--  • Αρχικά σβησμένες: όσες είναι κλειστές στο prototype (HOLIDAYS_2026), ώστε να μη φύγουν ευχές για Μεγάλη Παρασκευή κ.λπ.

create table public.holiday_greetings (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('added', 'removed')),
  name text not null check (length(trim(name)) between 1 and 80),
  -- Προσθήκη μίας φοράς.
  on_date date,
  -- Προσθήκη κάθε χρόνο.
  month smallint check (month between 1 and 12),
  day smallint check (day between 1 and 31),
  created_at timestamptz not null default now(),
  created_by uuid,
  check ((month is null) = (day is null)),
  check (kind = 'added' or (on_date is null and month is null)),
  check (kind = 'removed' or ((on_date is not null) <> (month is not null)))
);

create unique index holiday_greetings_removed_idx on public.holiday_greetings (name) where kind = 'removed';

alter table public.holiday_greetings enable row level security;

insert into public.holiday_greetings (kind, name)
values ('removed', 'Καθαρά Δευτέρα'), ('removed', 'Μεγάλη Παρασκευή'), ('removed', 'Δευτέρα του Πάσχα'),
       ('removed', 'Αγίου Πνεύματος'), ('removed', 'Σύναξη Θεοτόκου');

create trigger holiday_greetings_audit after insert or delete on public.holiday_greetings
  for each row execute function authz.audit_row('id');

-- ───────────── Οι αργίες ενός διαστήματος ─────────────

-- Οι αργίες ανάμεσα σε δύο ημερομηνίες (μαζί και οι δύο): επίσημες μη σβησμένες, προσθήκες μίας φοράς και κάθε χρόνο.
create function authz.holidays_between(p_from date, p_to date) returns table (day date, name text)
language sql stable security definer set search_path = ''
as $$
  with years as (
    select y::integer as y from generate_series(extract(year from p_from)::integer, extract(year from p_to)::integer) y
  ), all_days as (
    select h.day, h.name from years cross join lateral authz.greek_holidays(years.y) h
     where not exists (select 1 from public.holiday_greetings g where g.kind = 'removed' and g.name = h.name)
    union all
    select g.on_date, g.name from public.holiday_greetings g where g.kind = 'added' and g.on_date is not null
    union all
    select make_date(years.y, g.month, g.day), g.name
      from years cross join public.holiday_greetings g
     where g.kind = 'added' and g.month is not null
       and g.day <= extract(day from (make_date(years.y, g.month, 1) + interval '1 month - 1 day'))
  )
  select distinct on (a.day, a.name) a.day, a.name from all_days a
   where a.day between p_from and p_to
   order by a.day, a.name;
$$;

-- ───────────── RPC (automations.manage) ─────────────

-- { year, holidays: [{ date, name, isOfficial, isOn }], added: [{ id, name, onDate, month, day }], removed: [name] }
create function public.holiday_greetings_get(p_year integer default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_year integer := coalesce(p_year, extract(year from public.sales_today())::integer);
begin
  perform authz.require('automations.manage');
  if v_year not between 2000 and 2100 then
    raise exception 'Η χρονιά είναι από 2000 έως 2100' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'year', v_year,
    'holidays', coalesce((
      select jsonb_agg(jsonb_build_object('date', x.day, 'name', x.name, 'isOfficial', x.is_official, 'isOn', x.is_on)
                       order by x.day, x.name)
        from (select h.day, h.name, true as is_official,
                     not exists (select 1 from public.holiday_greetings g where g.kind = 'removed' and g.name = h.name) as is_on
                from authz.greek_holidays(v_year) h
              union all
              select b.day, b.name, false, true
                from authz.holidays_between(make_date(v_year, 1, 1), make_date(v_year, 12, 31)) b
               where not exists (select 1 from authz.greek_holidays(v_year) h where h.day = b.day and h.name = b.name)) x
    ), '[]'::jsonb),
    'added', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'onDate', g.on_date, 'month', g.month, 'day', g.day)
                       order by coalesce(g.month, extract(month from g.on_date)), coalesce(g.day, extract(day from g.on_date)), g.name)
        from public.holiday_greetings g where g.kind = 'added'
    ), '[]'::jsonb),
    'removed', coalesce((
      select jsonb_agg(g.name order by g.name) from public.holiday_greetings g where g.kind = 'removed'
    ), '[]'::jsonb));
end;
$$;

-- Μία προσθήκη από το JSON: { name, onDate } ή { name, month, day }. Λάθος → P0001.
create function authz.holiday_added_row(p jsonb)
returns table (name text, on_date date, month smallint, day smallint)
language plpgsql immutable set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p ->> 'name', ''));
  v_month numeric;
  v_day numeric;
  v_date date;
begin
  if jsonb_typeof(p) <> 'object' or length(v_name) not between 1 and 80 then
    raise exception 'Κάθε αργία θέλει όνομα έως 80 χαρακτήρες' using errcode = 'P0001';
  end if;
  if p ? 'onDate' and not (p ? 'month') and not (p ? 'day') then
    begin
      v_date := case when coalesce(p ->> 'onDate', '') ~ '^\d{4}-\d{2}-\d{2}$' then (p ->> 'onDate')::date end;
    exception when others then
      v_date := null;
    end;
    if v_date is null then
      raise exception 'Η ημερομηνία της αργίας «%» δεν είναι έγκυρη', v_name using errcode = 'P0001';
    end if;
    return query select v_name, v_date, null::smallint, null::smallint;
    return;
  end if;
  if not (p ? 'onDate') and jsonb_typeof(p -> 'month') = 'number' and jsonb_typeof(p -> 'day') = 'number' then
    v_month := (p ->> 'month')::numeric;
    v_day := (p ->> 'day')::numeric;
    if v_month = trunc(v_month) and v_day = trunc(v_day) and v_month between 1 and 12
       and v_day between 1 and extract(day from (make_date(2024, v_month::integer, 1) + interval '1 month - 1 day')) then
      return query select v_name, null::date, v_month::smallint, v_day::smallint;
      return;
    end if;
  end if;
  raise exception 'Η αργία «%» θέλει ημερομηνία ή μήνα και μέρα', v_name using errcode = 'P0001';
end;
$$;

-- Οι προσθήκες ως σύνολο (για σύγκριση): ταξινομημένος πίνακας JSON.
create function authz.holiday_added_set(p jsonb) returns jsonb
language sql immutable set search_path = ''
as $$
  select coalesce(jsonb_agg(distinct jsonb_build_object('name', r.name, 'on_date', r.on_date, 'month', r.month, 'day', r.day)), '[]'::jsonb)
    from jsonb_array_elements(p) e cross join lateral authz.holiday_added_row(e) r;
$$;

-- Αντικατάσταση: { removed?: [όνομα επίσημης], added?: [{ name, onDate } | { name, month, day }] }. Λείπον κλειδί = ως έχει.
-- Γράφει (και Ίχνος) μόνο όταν μια λίστα αλλάζει. Έως 50 προσθήκες.
create function public.holiday_greetings_update(p jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v jsonb := coalesce(p, '{}'::jsonb);
  v_removed text[];
  v_bad text;
  v_new jsonb;
begin
  perform authz.require('automations.manage');
  if jsonb_typeof(v) <> 'object' then
    raise exception 'Οι Αργίες θέλουν αντικείμενο' using errcode = 'P0001';
  end if;
  if v ? 'removed' then
    if jsonb_typeof(v -> 'removed') <> 'array'
       or exists (select 1 from jsonb_array_elements(v -> 'removed') e where jsonb_typeof(e) <> 'string') then
      raise exception 'Οι σβησμένες αργίες θέλουν λίστα ονομάτων' using errcode = 'P0001';
    end if;
    select coalesce(array_agg(distinct trim(e) order by trim(e)), '{}') into v_removed from jsonb_array_elements_text(v -> 'removed') e;
    select r into v_bad from unnest(v_removed) r
     where not exists (select 1 from authz.greek_holidays(2026) h where h.name = r) limit 1;
    if v_bad is not null then
      raise exception 'Η «%» δεν είναι επίσημη αργία', v_bad using errcode = 'P0001';
    end if;
    if v_removed is distinct from (select coalesce(array_agg(g.name order by g.name), '{}') from public.holiday_greetings g where g.kind = 'removed') then
      delete from public.holiday_greetings g where g.kind = 'removed';
      insert into public.holiday_greetings (kind, name, created_by) select 'removed', r, auth.uid() from unnest(v_removed) r;
    end if;
  end if;
  if v ? 'added' then
    if jsonb_typeof(v -> 'added') <> 'array' then
      raise exception 'Οι προσθήκες αργιών θέλουν λίστα' using errcode = 'P0001';
    end if;
    if jsonb_array_length(v -> 'added') > 50 then
      raise exception 'Έως 50 προσθήκες αργιών' using errcode = 'P0001';
    end if;
    v_new := authz.holiday_added_set(v -> 'added');
    if v_new is distinct from (select coalesce(jsonb_agg(distinct jsonb_build_object('name', g.name, 'on_date', g.on_date, 'month', g.month, 'day', g.day)), '[]'::jsonb)
                                 from public.holiday_greetings g where g.kind = 'added') then
      delete from public.holiday_greetings g where g.kind = 'added';
      insert into public.holiday_greetings (kind, name, on_date, month, day, created_by)
      select 'added', x.name, x.on_date, x.month, x.day, auth.uid()
        from jsonb_to_recordset(v_new) as x (name text, on_date date, month smallint, day smallint);
    end if;
  end if;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.holidays_between(date, date), authz.holiday_added_row(jsonb), authz.holiday_added_set(jsonb)
  from public, anon, authenticated;

revoke all on function public.holiday_greetings_get(integer), public.holiday_greetings_update(jsonb) from public, anon;
grant execute on function public.holiday_greetings_get(integer), public.holiday_greetings_update(jsonb) to authenticated;

revoke all on table public.holiday_greetings from anon, authenticated;
