-- Αργίες στις Ρυθμίσεις: το «Άνοιγμα» αργίας που πέφτει σε κλειστή μέρα του Ωραρίου γράφει εξαίρεση,
-- αλλά η μέρα μένει κλειστή, οπότε η οθόνη έδειχνε ξανά «Άνοιγμα» και δεν υπήρχε «Κλείσιμο».
-- Η οθόνη μαθαίνει πλέον αν η αργία έχει ανοιχτεί (isOpened) και αν πέρασε (isPast).

create or replace function public.booking_hours_view() returns jsonb
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
          'day', h.day, 'name', h.name, 'movable', h.movable, 'isOpen', x.is_open,
          'isOpened', exists (select 1 from public.booking_exceptions e where e.day = h.day and not e.is_closed),
          'isPast', h.day < public.sales_today()
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
