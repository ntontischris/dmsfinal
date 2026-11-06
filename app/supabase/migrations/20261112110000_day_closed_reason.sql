-- Επόμενο βήμα σε κλειστή μέρα (walkthrough Ιδιοκτήτη, 2026-11-06).
--
-- Η «κλειστή μέρα» είναι αυτή που ορίζει ήδη το Ωράριο των Γυρισμάτων (authz.day_hours): εξαίρεση ημερομηνίας,
-- αργία (που μπορεί να ανοίξει με εξαίρεση), εβδομαδιαίο πρόγραμμα. Όσο το Ωράριο δεν έχει αποθηκευτεί, κλειστές
-- μετράνε μόνο οι αργίες. Η εφαρμογή απλώς προειδοποιεί πριν γραφτεί Επόμενο βήμα σε τέτοια μέρα· δεν εμποδίζει.

-- Γιατί είναι κλειστή η μέρα, σε λέξεις για την πρόταση «Η <ημερομηνία> είναι …». null = ανοιχτή.
create function authz.day_closed_reason(p_day date) returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_reason text;
begin
  select dh.reason into v_reason from authz.day_hours(p_day) dh;
  if v_reason = 'not_set' then
    v_reason := case when authz.is_holiday(p_day) then 'holiday' end;
  end if;
  if v_reason is null then
    return null;
  end if;
  if v_reason = 'holiday' then
    return 'αργία: ' || (
      select h.name from authz.greek_holidays(extract(year from p_day)::integer) h where h.day = p_day limit 1
    );
  end if;
  if exists (select 1 from public.booking_exceptions e where e.day = p_day and e.is_closed) then
    return 'κλειστή μέρα στο Ωράριο';
  end if;
  return (array['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'])[
    extract(isodow from p_day)::integer] || ' — κλειστά';
end;
$$;

-- { closed, reason, next_open }: η πρώτη ανοιχτή μέρα μέσα σε 60 μέρες (null αν δεν υπάρχει).
create function public.day_closed_reason(p_day date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_reason text;
  v_next date;
begin
  if not authz.is_team_user() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_day is null then
    raise exception 'Διάλεξε ημερομηνία' using errcode = 'P0001';
  end if;
  v_reason := authz.day_closed_reason(p_day);
  if v_reason is not null then
    select d.day into v_next
      from (select (p_day + n) as day from generate_series(1, 60) n) d
     where authz.day_closed_reason(d.day) is null
     order by d.day
     limit 1;
  end if;
  return jsonb_build_object('closed', v_reason is not null, 'reason', v_reason, 'next_open', v_next);
end;
$$;

revoke all on function authz.day_closed_reason(date) from public, anon, authenticated;
revoke all on function public.day_closed_reason(date) from public, anon;
grant execute on function public.day_closed_reason(date) to authenticated;
