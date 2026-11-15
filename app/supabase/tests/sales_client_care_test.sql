-- Φροντίδα Πελάτη (b7): Διεύθυνση και Χώρος γυρίσματος, «Υπενθύμισέ με» με κάρτα στο Σήμερα, το βήμα «Ανανέωση».
-- MIG 20261114144000_sales_client_care.sql. Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(26);

-- a1 Ιδιοκτήτης · a3 Άννα (Πωλήσεις, Υπεύθυνη του c1) · a4 Νίκος (Πωλήσεις, δεν βλέπει το c1)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'nikos@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Νίκος', 'nikos@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
               ('00000000-0000-0000-0000-0000000000a4', 'Πωλήσεις')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

select set_config('t.today', (now() at time zone 'Europe/Athens')::date::text, true);

set local session_replication_role = replica;
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Καφέ Τεστ', 'Μαρία Τεστ', 'maria@test.example.com', '00000000-0000-0000-0000-0000000000a3');
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο Τεστ',
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a3', 'Πρόταση', current_setting('t.today')::date + 3;
set local session_replication_role = origin;

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select * from public.client_reminders $$, '42501', null, 'Ο ανώνυμος δεν βλέπει υπενθυμίσεις');
select throws_ok($$ select public.sales_client_renewal_due('00000000-0000-0000-0000-0000000000c1') $$, '42501', null,
  'Ο ανώνυμος δεν ρωτά για Ανανέωση');
select throws_ok($$ select public.sales_update_client_place('00000000-0000-0000-0000-0000000000c1', 'x', 'y') $$, '42501', null,
  'Ο ανώνυμος δεν αλλάζει Διεύθυνση');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select throws_ok($$ insert into public.client_reminders (client_id, remind_on, note)
                    values ('00000000-0000-0000-0000-0000000000c1', current_date, 'Τηλέφωνο') $$,
  '42501', null, 'Υπενθύμιση μόνο σε Πελάτη που βλέπω');
select throws_ok($$ select public.sales_update_client_place('00000000-0000-0000-0000-0000000000c1', 'x', 'y') $$, '42501', null,
  'Τη Διεύθυνση την αλλάζει ο Υπεύθυνος');
select throws_ok($$ select public.sales_client_renewal_due('00000000-0000-0000-0000-0000000000c1') $$, '42501', null,
  'Την Ανανέωση τη βλέπει όποιος βλέπει τον Πελάτη');

-- ───────────── Διεύθυνση και Χώρος γυρίσματος ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select lives_ok($$ select public.sales_update_client_place('00000000-0000-0000-0000-0000000000c1',
                    '  Οδός Τεστ 1, Αθήνα ', 'Στούντιο Τεστ') $$, 'Η Υπεύθυνη γράφει Διεύθυνση και Χώρο γυρίσματος');
select is((select address || ' | ' || filming_location from public.clients where id = '00000000-0000-0000-0000-0000000000c1'),
  'Οδός Τεστ 1, Αθήνα | Στούντιο Τεστ', 'Αποθηκεύονται χωρίς κενά στις άκρες');

-- ───────────── «Υπενθύμισέ με» ─────────────
select lives_ok($$ insert into public.client_reminders (id, client_id, remind_on, note) values
                    ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', current_setting('t.today')::date - 1, 'Χθεσινή'),
                    ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', current_setting('t.today')::date, 'Σημερινή'),
                    ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c1', current_setting('t.today')::date + 1, 'Αυριανή') $$,
  'Η Υπεύθυνη γράφει υπενθυμίσεις');
select throws_ok($$ insert into public.client_reminders (client_id, user_id, remind_on, note)
                    values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a4', current_date, 'Για άλλον') $$,
  '42501', null, 'Υπενθύμιση μόνο για τον εαυτό μου');
select is((select count(*)::integer from public.client_reminders), 3, 'Βλέπω τις δικές μου');
select is(public.today_card('client_reminders', now()) ->> 'count', '2', 'Στο Σήμερα: όσες ήρθε η μέρα τους');
select is(public.today_card('client_reminders', now()) -> 'items' -> 0 ->> 'title', 'Χθεσινή', 'Πρώτα η παλαιότερη');
select is(public.today_card('client_reminders', now()) -> 'items' -> 0 ->> 'urgent', 'true', 'Η περασμένη είναι επείγουσα');
select is(public.today_card('client_reminders', now()) -> 'items' -> 0 ->> 'link',
  '/app/clients/00000000-0000-0000-0000-0000000000c1', 'Ανοίγει τη Σελίδα Πελάτη');
select lives_ok($$ update public.client_reminders set done_at = now() where id = '00000000-0000-0000-0000-0000000000b1' $$,
  '«Έγινε»');
select is(public.today_card('client_reminders', now()) ->> 'count', '1', 'Η ολοκληρωμένη φεύγει από το Σήμερα');
select throws_ok($$ update public.client_reminders set note = 'Άλλο' where id = '00000000-0000-0000-0000-0000000000b2' $$,
  '42501', null, 'Η σημείωση δεν αλλάζει μετά');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select is((select count(*)::integer from public.client_reminders), 0, 'Ο άλλος δεν βλέπει τις υπενθυμίσεις μου');
update public.client_reminders set done_at = now() where id = '00000000-0000-0000-0000-0000000000b2';
select is(public.today_card('client_reminders', now()) ->> 'count', '0', 'Ο άλλος έχει άδεια κάρτα');
reset role;
select is((select done_at from public.client_reminders where id = '00000000-0000-0000-0000-0000000000b2'), null,
  'Ο άλλος δεν κλείνει τη δική μου');

-- ───────────── «Ανανέωση» ─────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is(public.sales_client_renewal_due('00000000-0000-0000-0000-0000000000c1', current_setting('t.today')::date), false,
  'Χωρίς Συμφωνία δεν υπάρχει Ανανέωση');
reset role;

-- Μηνιαία ενεργή Συμφωνία που λήγει σε 20 μέρες (το παράθυρο είναι 30 από τις Ρυθμίσεις των Συμφωνιών).
set local session_replication_role = replica;
insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, start_on, duration_months, end_on,
                               payment_days, unused_provisions, renewal, filming_notice_hours, filming_cancel_hours,
                               late_cancel_burns, no_show_burns, signed_at)
values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', 'monthly', 'Μηνιαίο Τεστ', 'active',
        'signed', current_setting('t.today')::date, current_setting('t.today')::date - 100, 4,
        current_setting('t.today')::date + 20, 15, 'lost', 'new_opportunity', 48, 24, false, false, now());
update public.agreement_defaults set renewal_lead_days = 30 where id;
set local session_replication_role = origin;

set local role authenticated;
select is(public.sales_client_renewal_due('00000000-0000-0000-0000-0000000000c1', current_setting('t.today')::date), true,
  'Λήξη μέσα στο παράθυρο: Ανανέωση');
select is(public.sales_client_renewal_due('00000000-0000-0000-0000-0000000000c1', current_setting('t.today')::date - 20), false,
  'Λήξη μετά το παράθυρο: όχι ακόμα');
reset role;

set local session_replication_role = replica;
insert into public.agreement_endings (agreement_id, no_continuation_at) values ('00000000-0000-0000-0000-0000000000d1', now());
set local session_replication_role = origin;
set local role authenticated;
select is(public.sales_client_renewal_due('00000000-0000-0000-0000-0000000000c1', current_setting('t.today')::date), false,
  '«Χωρίς συνέχιση»: όχι Ανανέωση');
reset role;

-- Ανοιχτή Ευκαιρία ανανέωσης: Ανανέωση ό,τι κι αν λέει η ημερομηνία.
set local session_replication_role = replica;
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c1', 'Ανανέωση Τεστ',
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a3', 'Πρόταση', current_setting('t.today')::date + 3;
insert into public.agreement_renewals (agreement_id, term_end, opportunity_id, is_automatic)
values ('00000000-0000-0000-0000-0000000000d1', current_setting('t.today')::date + 20, '00000000-0000-0000-0000-0000000000e2', true);
set local session_replication_role = origin;
set local role authenticated;
select is(public.sales_client_renewal_due('00000000-0000-0000-0000-0000000000c1', current_setting('t.today')::date - 200), true,
  'Ανοιχτή Ευκαιρία ανανέωσης: Ανανέωση');
reset role;

select * from finish();
rollback;
