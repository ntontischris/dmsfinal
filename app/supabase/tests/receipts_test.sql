-- Εισπράξεις και Τρόποι είσπραξης (I4, #150): άρνηση ανά ρόλο, καταχώρηση, διόρθωση και διαγραφή με λόγο, Ίχνος,
-- αποσυρμένος Τρόπος, προεπισκόπηση χωρίς Τιμολόγια, Τρόποι (Δικαίωμα κόστους), κλειστοί πίνακες.
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή. Ημερομηνίες σταθερές.
begin;
select plan(31);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης (γράφει) · a2 Λογιστής (μόνο ανάγνωση) · a3 Πωλήσεις (χωρίς Εισπράξεις)
-- a4 Διαχείριση (καταχωρεί Εισπράξεις, δεν αλλάζει Τρόπους) · a6 Πελάτης χωρίς ομάδα
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'client@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ελένη', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Δημήτρης', 'admin@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a4', 'Διαχείριση')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Πελάτης c1 με στοιχεία φανταστικά.
insert into public.clients (id, name, contact_name, contact_email) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Εισπράξεων', 'Μαρία Παπαδάκη', 'receipts@example.com');

select set_config('t.client', '00000000-0000-0000-0000-0000000000c1', true);
select set_config('t.bank', (select m.id::text from public.payment_methods m where m.label = 'Τραπεζική κατάθεση'), true);
select set_config('t.cash', (select m.id::text from public.payment_methods m where m.label = 'Μετρητά'), true);

-- ───────────── Τρόποι: τα τέσσερα της αρχής ─────────────
select is(
  (select count(*)::int from public.payment_methods where retired_at is null), 4,
  'Οι τέσσερις τρόποι είσπραξης είναι ενεργοί στην αρχή'
);

-- ───────────── Άρνηση ανά ρόλο ─────────────
set local role anon;
select throws_ok($$ select public.payment_methods_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τους Τρόπους');
select throws_ok($$ select public.receipts_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τις Εισπράξεις');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a6","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.receipts_view() $$, '42501', null, 'Ο Πελάτης δεν βλέπει τις Εισπράξεις');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok($$ select public.receipts_view() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν τις Εισπράξεις');
select throws_ok(
  $$ select public.receipt_register(current_setting('t.client')::uuid, date '2026-10-05', 100, current_setting('t.bank')::uuid, '') $$,
  '42501', null, 'Οι Πωλήσεις δεν καταχωρούν Εισπράξεις'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok(
  $$ select public.receipt_register(current_setting('t.client')::uuid, date '2026-10-05', 100, current_setting('t.bank')::uuid, '') $$,
  '42501', null, 'Ο Λογιστής δεν καταχωρεί Εισπράξεις'
);
select lives_ok($$ select public.receipts_view(current_setting('t.client')::uuid) $$, 'Ο Λογιστής διαβάζει τις Εισπράξεις');

-- Ο κλειστός πίνακας δεν διαβάζεται από authenticated.
set local role authenticated;
select throws_ok($$ select * from public.receipts $$, '42501', null, 'Ο κλειστός πίνακας των Εισπράξεων δεν διαβάζεται');
reset role;

-- ───────────── Καταχώρηση, λίστα και Τρόποι ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('t.r1', public.receipt_register(
  current_setting('t.client')::uuid, date '2026-10-05', 300, current_setting('t.bank')::uuid, 'Προκαταβολή'
)::text, true);
select set_config('t.r2', public.receipt_register(
  current_setting('t.client')::uuid, date '2026-10-06', 150.50, current_setting('t.cash')::uuid, ''
)::text, true);

select is(
  jsonb_array_length(public.receipts_view(current_setting('t.client')::uuid)), 2,
  'Ο Ιδιοκτήτης βλέπει τις δύο Εισπράξεις του Πελάτη'
);
select is(
  (select (x->>'amount')::numeric from jsonb_array_elements(public.receipts_view(current_setting('t.client')::uuid)) x
    where x->>'id' = current_setting('t.r2')),
  150.50::numeric, 'Το ποσό αποθηκεύεται με δύο δεκαδικά'
);

select lives_ok($$ select public.payment_method_retire(current_setting('t.cash')::uuid) $$, 'Ο Ιδιοκτήτης αποσύρει τον τρόπο «Μετρητά»');
select throws_ok(
  $$ select public.receipt_register(current_setting('t.client')::uuid, date '2026-10-07', 20, current_setting('t.cash')::uuid, '') $$,
  'P0001', null, 'Αποσυρμένος τρόπος δεν δέχεται νέα Είσπραξη'
);
select is(
  (select x->>'methodLabel' from jsonb_array_elements(public.receipts_view(current_setting('t.client')::uuid)) x
    where x->>'id' = current_setting('t.r2')),
  'Μετρητά', 'Η παλιά Είσπραξη κρατά τον αποσυρμένο τρόπο της'
);
select lives_ok($$ select public.payment_method_restore(current_setting('t.cash')::uuid) $$, 'Ο Ιδιοκτήτης επαναφέρει τον τρόπο «Μετρητά»');

-- ───────────── Προεπισκόπηση χωρίς Τιμολόγια ─────────────
select is(
  (public.receipt_preview(current_setting('t.client')::uuid, 120)->>'surplus')::numeric, 120::numeric,
  'Χωρίς Τιμολόγια όλο το ποσό είναι υπέρ του Πελάτη'
);
select is(
  jsonb_array_length(public.receipt_preview(current_setting('t.client')::uuid, 120)->'settles'), 0,
  'Χωρίς Τιμολόγια δεν εξοφλείται τίποτα'
);
select throws_ok(
  $$ select public.receipt_register(current_setting('t.client')::uuid, date '2026-10-07', 0, current_setting('t.bank')::uuid, '') $$,
  'P0001', null, 'Μηδενικό ποσό δεν καταχωρείται'
);

-- ───────────── Διόρθωση με λόγο και Ίχνος ─────────────
select throws_ok(
  $$ select public.receipt_correct(current_setting('t.r1')::uuid, date '2026-10-05', 320, current_setting('t.bank')::uuid, 'Προκαταβολή', '   ') $$,
  'P0001', null, 'Η διόρθωση χωρίς λόγο δεν γίνεται'
);
select lives_ok(
  $$ select public.receipt_correct(current_setting('t.r1')::uuid, date '2026-10-05', 320, current_setting('t.bank')::uuid, 'Προκαταβολή', 'Λάθος ποσό') $$,
  'Η διόρθωση με λόγο γίνεται'
);
select is(
  (select (x->>'amount')::numeric from jsonb_array_elements(public.receipts_view(current_setting('t.client')::uuid)) x
    where x->>'id' = current_setting('t.r1')),
  320::numeric, 'Η διόρθωση αλλάζει το ποσό'
);
select ok(
  exists (
    select 1 from public.audit_log a
     where a.entity = 'receipts' and a.entity_id = current_setting('t.r1') and a.action = 'event'
       and a.after->>'reason' = 'Λάθος ποσό'
  ),
  'Η διόρθωση μπαίνει στο Ίχνος με τον λόγο'
);

-- ───────────── Διαγραφή με λόγο ─────────────
select throws_ok(
  $$ select public.receipt_delete(current_setting('t.r2')::uuid, '') $$,
  'P0001', null, 'Η διαγραφή χωρίς λόγο δεν γίνεται'
);
select lives_ok(
  $$ select public.receipt_delete(current_setting('t.r2')::uuid, 'Καταχωρήθηκε δύο φορές') $$,
  'Η διαγραφή με λόγο γίνεται'
);
select is(
  (select (x->>'deleted')::boolean from jsonb_array_elements(public.receipts_view(current_setting('t.client')::uuid)) x
    where x->>'id' = current_setting('t.r2')),
  true, 'Ο Ιδιοκτήτης βλέπει τη διαγραφή στο Ίχνος'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is(
  jsonb_array_length(public.receipts_view(current_setting('t.client')::uuid)), 1,
  'Ο Λογιστής δεν βλέπει τις διαγραφές'
);

-- ───────────── Τρόποι: ποιος αλλάζει ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select throws_ok(
  $$ select public.payment_method_save(null, 'Επιταγή') $$,
  '42501', null, 'Η Διαχείριση δεν προσθέτει τρόπους (μόνο όσοι διαχειρίζονται κόστος)'
);
select lives_ok($$ select public.payment_methods_view() $$, 'Η Διαχείριση βλέπει τους Τρόπους');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$ select public.payment_method_save(null, 'Επιταγή') $$, 'Ο Ιδιοκτήτης προσθέτει τρόπο');
select throws_ok(
  $$ select public.payment_method_save(null, 'μετρητά') $$,
  'P0001', null, 'Δεν υπάρχουν δύο ενεργοί τρόποι με το ίδιο όνομα'
);
select is(
  jsonb_array_length(public.payment_methods_view()), 5,
  'Με την προσθήκη οι τρόποι γίνονται πέντε'
);

select * from finish();
rollback;
