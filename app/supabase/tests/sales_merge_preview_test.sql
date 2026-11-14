-- Προεπισκόπηση συγχώνευσης (b6): κάθε πλευρά δείχνει τις Συμφωνίες της και πόσες Παραγωγές, Τιμολόγια, Χρήστες πελάτη έχει.
-- MIG 20261114142000_sales_merge_preview.sql. Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(7);

-- a1 Ιδιοκτήτης (Συγχωνεύει Πελάτες) · a3 Άννα (Πωλήσεις, χωρίς Συγχώνευση) · b1, b2 Χρήστες πελάτη
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'pelatis@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'proin@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'anna@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- c1 υπάρχων (δύο Συμφωνίες, μία Παραγωγή, ένας ενεργός και ένας πρώην Χρήστης πελάτη) · c2 νέος με σήμα «μοιάζει με τον c1»
set local session_replication_role = replica;
insert into public.clients (id, name, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Φούρνος Δοκιμής', 'Επαφή', 'c1@example.com', '2310 000 901', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000c2', 'Φούρνος Δοκιμής ΙΚΕ', 'Επαφή', 'c2@example.com', '2310 000 901', null);
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select x.id::uuid, '00000000-0000-0000-0000-0000000000c1', x.title,
       (select s.id from public.sales_stages s where s.code = 'proposal'), (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a1', 'Επόμενο', date '2099-06-01'
  from (values ('00000000-0000-0000-0000-0000000000e1', 'Μηνιαίο'), ('00000000-0000-0000-0000-0000000000e2', 'Σποτ')) as x (id, title);
insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, start_on, duration_months, end_on,
                               payment_days, unused_provisions, renewal, filming_notice_hours, filming_cancel_hours,
                               late_cancel_burns, no_show_burns, signed_at)
values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'monthly', 'Μηνιαίο Social', 'active', 'signed',
        date '2026-01-01', date '2026-01-05', 12, date '2027-01-04', 15, 'lost', 'new_opportunity', 48, 48, false, false,
        timestamptz '2026-01-02 10:00+00');
insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, payment_days, unused_provisions,
                               filming_notice_hours, filming_cancel_hours, late_cancel_burns, no_show_burns)
values ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e2', 'one_off', 'Σποτ Πάσχα', 'proposal',
        'draft', date '2099-03-01', 15, 'lost', 48, 48, false, false);
insert into public.productions (id, title, client_id, agreement_id, owner_id, state) values
  ('00000000-0000-0000-0000-0000000000d1', 'Μηνιαίο Ιανουάριος', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'open');
insert into public.client_users (client_id, user_id, name, role_id, removed_at)
select '00000000-0000-0000-0000-0000000000c1', x.id::uuid, x.name, r.id, x.removed::timestamptz
  from (values ('00000000-0000-0000-0000-0000000000b1', 'Κώστας', null),
               ('00000000-0000-0000-0000-0000000000b2', 'Πρώην', '2026-02-01 10:00+00')) as x (id, name, removed)
  join public.roles r on r.name = 'Πλήρης' and r.kind = 'client';
insert into public.client_duplicate_flags (id, client_id, matches_client_id, reason) values
  ('00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c1', 'phone');
set local session_replication_role = origin;

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.sales_duplicate_pairs() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Πιθανά διπλά');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok($$ select public.sales_client_side('00000000-0000-0000-0000-0000000000c1') $$, '42501', null,
  'Κανένας Χρήστης δεν καλεί απευθείας την πλευρά Πελάτη');
select is(public.sales_duplicate_pairs(), '[]'::jsonb,
  'Χωρίς «Συγχωνεύει Πελάτες» δεν φαίνεται ούτε το ζευγάρι ούτε οι Συμφωνίες του');

-- ───────────── Ο Ιδιοκτήτης βλέπει τι μεταφέρεται ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select is(
  (select jsonb_agg(a order by a ->> 'title')
     from jsonb_array_elements(public.sales_duplicate_pairs() -> 0 -> 'existing' -> 'agreements') a),
  '[{"kind":"monthly","state":"active","title":"Μηνιαίο Social"},{"kind":"one_off","state":"proposal","title":"Σποτ Πάσχα"}]'::jsonb,
  'Ο υπάρχων δείχνει τις δύο Συμφωνίες του με είδος και κατάσταση');
select is(
  (select concat_ws('|', s ->> 'opportunities', s ->> 'productions', s ->> 'invoices', s ->> 'client_users')
     from (select public.sales_duplicate_pairs() -> 0 -> 'existing' as s) x),
  '2|1|0|1', 'Μετρά Ευκαιρίες, Παραγωγές, Τιμολόγια και μόνο τους ενεργούς Χρήστες πελάτη');
select is(
  (select concat_ws('|', s ->> 'agreements', s ->> 'productions', s ->> 'invoices', s ->> 'client_users')
     from (select public.sales_duplicate_pairs() -> 0 -> 'candidate' as s) x),
  '[]|0|0|0', 'Ο νέος χωρίς Συμφωνίες δείχνει κενή λίστα και μηδενικά');
select is(public.sales_duplicate_pairs() -> 0 -> 'existing' ->> 'name', 'Φούρνος Δοκιμής', 'Τα παλιά πεδία της πλευράς μένουν');

select * from finish();
rollback;
