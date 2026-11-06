-- Επόμενο βήμα σε κλειστή μέρα (MIG 20261112110000_day_closed_reason.sql). Φανταστικά δεδομένα· όλα ζουν μέσα στη
-- συναλλαγή. Μέρες: 2027-01-04 Δευτέρα … 2027-01-10 Κυριακή· 2027-03-25 και 2027-10-28 Πέμπτες με αργία.
begin;
select plan(12);

-- a1 Ιδιοκτήτης · a3 Άννα (Πωλήσεις) · a9 λογαριασμός χωρίς θέση στην ομάδα
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000a9', 'outsider@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'anna@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- ───────────── Άρνηση ─────────────

set local role anon;
select throws_ok($$ select public.day_closed_reason(date '2027-01-10') $$, '42501', null,
  'Ο ανώνυμος δεν ρωτά για κλειστές μέρες');
set local role authenticated;
select public.t_as('a9');
select throws_ok($$ select public.day_closed_reason(date '2027-01-10') $$, '42501', null,
  'Λογαριασμός έξω από την ομάδα δεν ρωτά');
select throws_ok($$ select authz.day_closed_reason(date '2027-01-10') $$, '42501', null,
  'Η εσωτερική συνάρτηση δεν καλείται από την εφαρμογή');

-- ───────────── Χωρίς Ωράριο: μόνο οι αργίες ─────────────

select public.t_as('a3');
select is(public.day_closed_reason(date '2027-01-10') ->> 'closed', 'false',
  'Χωρίς αποθηκευμένο Ωράριο η Κυριακή δεν προειδοποιεί');
select is(public.day_closed_reason(date '2027-10-28'),
  jsonb_build_object('closed', true, 'reason', 'αργία: 28η Οκτωβρίου', 'next_open', '2027-10-29'),
  'Χωρίς αποθηκευμένο Ωράριο η αργία είναι κλειστή');

-- ───────────── Με Ωράριο: Δευτέρα–Σάββατο ανοιχτά, Κυριακή κλειστά ─────────────

reset role;
set local session_replication_role = replica;
update public.filming_settings set booking_hours_set_at = now() where id;
insert into public.booking_week (dow, is_open, opens, closes)
select d, d < 7, case when d < 7 then time '09:00' end, case when d < 7 then time '18:00' end
  from generate_series(1, 7) d
on conflict (dow) do update set is_open = excluded.is_open, opens = excluded.opens, closes = excluded.closes;
-- Η 25η Μαρτίου ανοίγει με εξαίρεση· η Πέμπτη 2027-01-07 κλείνει με εξαίρεση.
insert into public.booking_exceptions (day, is_closed, opens, closes) values
  (date '2027-03-25', false, time '10:00', time '14:00'),
  (date '2027-01-07', true, null, null);
set local session_replication_role = origin;

set local role authenticated;
select public.t_as('a3');
select is(public.day_closed_reason(date '2027-01-05'),
  jsonb_build_object('closed', false, 'reason', null, 'next_open', null), 'Ανοιχτή μέρα: τίποτα να πει');
select is(public.day_closed_reason(date '2027-01-10'),
  jsonb_build_object('closed', true, 'reason', 'Κυριακή — κλειστά', 'next_open', '2027-01-11'),
  'Κλειστή μέρα του εβδομαδιαίου Ωραρίου, με την επόμενη ανοιχτή');
select is(public.day_closed_reason(date '2027-10-28') ->> 'reason', 'αργία: 28η Οκτωβρίου',
  'Αργία σε μέρα που το Ωράριο έχει ανοιχτή');
select is(public.day_closed_reason(date '2027-03-25') ->> 'closed', 'false',
  'Αργία που άνοιξε με εξαίρεση δεν προειδοποιεί');
select is(public.day_closed_reason(date '2027-01-07'),
  jsonb_build_object('closed', true, 'reason', 'κλειστή μέρα στο Ωράριο', 'next_open', '2027-01-08'),
  'Ανοιχτή μέρα που κλείνει με εξαίρεση');
select is(public.day_closed_reason(date '2027-01-09') ->> 'closed', 'false', 'Το Σάββατο είναι ανοιχτό εδώ');

select public.t_as('a1');
select throws_ok($$ select public.day_closed_reason(null) $$, 'P0001', 'Διάλεξε ημερομηνία',
  'Χωρίς ημερομηνία: σφάλμα');

select * from finish();
rollback;
