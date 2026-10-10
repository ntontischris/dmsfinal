-- Κρατήσεις (C2α, #130): Ωράριο, Χωρητικότητα, Αργίες, κράτηση πελάτη (E5), μετάθεση από τον πελάτη με επανέγκριση.
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή.
-- Ημερομηνίες: οι μέρες του Ωραρίου είναι 2027-01-04 (Δευτέρα) για τα σημεία του Ωραρίου, και «σήμερα + n» για την
-- κατάσταση των ημερών (booking_days). Ώρα Ελλάδας (+02:00 τον Ιανουάριο).
begin;
select plan(177);

-- ───────────── Βοηθητικά ─────────────
-- Ώρα Ελλάδας: η μέρα «σήμερα + n» στις «hh:mm».
create function public.t_day(p_days integer, p_time time) returns timestamptz
language sql stable
as $$ select (((now() at time zone 'Europe/Athens')::date + p_days) + p_time) at time zone 'Europe/Athens'; $$;

-- Εβδομαδιαίο Ωράριο: όλες οι μέρες ανοιχτές από p_opens έως p_closes.
create function public.t_week_all(p_opens text, p_closes text) returns jsonb
language sql stable
as $$
  select jsonb_agg(jsonb_build_object('dow', d, 'isOpen', true, 'opens', p_opens, 'closes', p_closes) order by d)
    from generate_series(1, 7) d;
$$;

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης · e4 Λογιστής (χωρίς Κράτηση) · e6 Πελάτης f1 («Κράτηση») · e8 Πελάτης f2 («Κράτηση»)
-- e9 Πελάτης f1 («Χωρίς δικαιώματα»)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'client@example.com'),
  ('00000000-0000-0000-0000-0000000000e8', 'other-client@example.com'),
  ('00000000-0000-0000-0000-0000000000e9', 'no-rights@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'Κώστας', 'accountant@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e4', 'Λογιστής')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

insert into public.roles (name, kind) values ('Κράτηση', 'client'), ('Χωρίς δικαιώματα', 'client');
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.book', 'all' from public.roles r where r.name = 'Κράτηση' and r.kind = 'client';

insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'Κυψέλη Καφέ', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-0000000000f2', 'Ταβέρνα Αρμύρα', '', 'Ναύπλιο', null, 'Κώστας Αρμύρας', 'armyra@example.com', '27520 33333', '00000000-0000-0000-0000-0000000000e1');

insert into public.client_users (client_id, user_id, name, role_id, is_current)
select c.client_id::uuid, c.user_id::uuid, c.name, r.id, true
  from (values
    ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e6', 'Μαρία Παπαδάκη', 'Κράτηση'),
    ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e8', 'Νίκος Αρμύρας', 'Κράτηση'),
    ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e9', 'Χωρίς Δικαίωμα', 'Χωρίς δικαιώματα')
  ) as c (client_id, user_id, name, role_name)
  join public.roles r on r.name = c.role_name and r.kind = 'client';

insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select o.id::uuid, o.client::uuid, o.title, (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'), '00000000-0000-0000-0000-0000000000e1', 'Πρόταση',
       (now() at time zone 'Europe/Athens')::date + 3
  from (values
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'Εφάπαξ Α'),
    ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000f2', 'Εφάπαξ Β')
  ) as o (id, client, title);

insert into public.catalogue_items (id, kind, billing, name, name_en, unit, retired_at) values
  ('00000000-0000-0000-0000-0000000000d2', 'package', 'one_off', 'Εφάπαξ πακέτο (τεστ)', 'One-off (test)', '', null);
insert into public.catalogue_item_amounts (item_id, price) values ('00000000-0000-0000-0000-0000000000d2', 500);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost) values
  ('00000000-0000-0000-0000-0000000000d2', 4, 6, 0);
insert into public.catalogue_item_provisions (item_id, kind_id, quantity)
select '00000000-0000-0000-0000-0000000000d2', k.id, 1 from public.provision_kinds k where k.code = 'shoot';
insert into public.cost_months (month, expenses_total, productive_hours)
values (date_trunc('month', now() at time zone 'Europe/Athens')::date, 8800, 220);

create function public.t_pk(p_code text) returns uuid
language sql stable
as $$ select k.id from public.provision_kinds k where k.code = p_code; $$;

-- Συμφωνία Α (μία Παροχή shoot × 20, ειδοποίηση 24 ώρες, ακύρωση 0 ώρες μέχρι να την αλλάξει το τεστ).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select set_config('t.shoot', public.t_pk('shoot')::text, true);
select set_config('t.a', public.agreement_create('00000000-0000-0000-0000-0000000000c1', 'one_off', 'Εφάπαξ Α')::text, true);
update public.agreements set filming_notice_hours = 24, filming_cancel_hours = 0 where id = current_setting('t.a')::uuid;
select public.agreement_update_basics(current_setting('t.a')::uuid, 'Εφάπαξ Α', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, null);
select public.agreement_add_catalogue_line(current_setting('t.a')::uuid, '00000000-0000-0000-0000-0000000000d2', 20);
select public.agreement_set_recipients(current_setting('t.a')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a')::uuid, (now() at time zone 'Europe/Athens')::date, 'Μαρία Παπαδάκη', (now() at time zone 'Europe/Athens')::date, 'a.pdf');
select set_config('t.b', public.agreement_create('00000000-0000-0000-0000-0000000000c2', 'one_off', 'Εφάπαξ Β')::text, true);
update public.agreements set filming_notice_hours = 24, filming_cancel_hours = 720 where id = current_setting('t.b')::uuid;
select public.agreement_update_basics(current_setting('t.b')::uuid, 'Εφάπαξ Β', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, null);
select public.agreement_add_catalogue_line(current_setting('t.b')::uuid, '00000000-0000-0000-0000-0000000000d2', 5);
select public.agreement_set_recipients(current_setting('t.b')::uuid, '[{"name":"Νίκος Αρμύρας","email":"other-client@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.b')::uuid, (now() at time zone 'Europe/Athens')::date, 'Νίκος Αρμύρας', (now() at time zone 'Europe/Athens')::date, 'b.pdf');

-- ───────────── Εορτές και εργάσιμες (χωρίς σύνδεση) ─────────────
select is(authz.orthodox_easter(2026), date '2026-04-12', 'Το Πάσχα 2026 πέφτει 12 Απριλίου');
select is(authz.orthodox_easter(2027), date '2027-05-02', 'Το Πάσχα 2027 πέφτει 2 Μαΐου');
select is(authz.orthodox_easter(2025), date '2025-04-20', 'Το Πάσχα 2025 πέφτει 20 Απριλίου');
select is((select count(*)::integer from authz.greek_holidays(2026)), 13, 'Το 2026 έχει 13 επίσημες αργίες');
select is((select count(*)::integer from authz.greek_holidays(2027)), 13, 'Το 2027 έχει 13 επίσημες αργίες');
select is((select name from authz.greek_holidays(2026) where day = date '2026-02-23'), 'Καθαρά Δευτέρα', 'Η Καθαρά Δευτέρα 2026 είναι 23 Φεβρουαρίου');
select is((select day from authz.greek_holidays(2027) where name = 'Αγίου Πνεύματος'), date '2027-06-21', 'Το Αγίου Πνεύματος 2027 είναι 21 Ιουνίου');
select ok(authz.is_holiday(date '2027-03-25'), 'Η 25η Μαρτίου 2027 είναι αργία');
set local role authenticated;
select ok(public.is_working_day(date '2027-01-04'), 'Η Δευτέρα 4 Ιανουαρίου 2027 είναι εργάσιμη');
select ok(not public.is_working_day(date '2027-01-02'), 'Το Σάββατο δεν είναι εργάσιμη μέρα');
select ok(not public.is_working_day(date '2027-01-01'), 'Η Πρωτοχρονιά δεν είναι εργάσιμη μέρα');
reset role;

-- ───────────── Δικαιώματα (42501 πριν από κάθε ανάγνωση) ─────────────
set local role anon;
select throws_ok($$ select public.booking_hours_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει το Ωράριο');
select throws_ok($$ select public.booking_hours_save('{}'::jsonb) $$, '42501', null, 'Ο ανώνυμος δεν αποθηκεύει το Ωράριο');
select throws_ok($$ select public.booking_exception_save(date '2027-02-01', true, null, null, null, null) $$, '42501', null, 'Ο ανώνυμος δεν γράφει εξαίρεση');
select throws_ok($$ select public.booking_exception_delete(date '2027-02-01') $$, '42501', null, 'Ο ανώνυμος δεν σβήνει εξαίρεση');
select throws_ok($$ select public.booking_options() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει επιλογές κράτησης');
select throws_ok($$ select public.booking_days(gen_random_uuid(), gen_random_uuid()) $$, '42501', null, 'Ο ανώνυμος δεν βλέπει ημέρες');
select throws_ok($$ select public.booking_slots(gen_random_uuid(), gen_random_uuid(), date '2027-01-04', 1) $$, '42501', null, 'Ο ανώνυμος δεν βλέπει ώρες');
select throws_ok($$ select public.filming_slot_check(now(), 1, null) $$, '42501', null, 'Ο ανώνυμος δεν βλέπει προειδοποίηση ώρας');
select throws_ok($$ select public.filming_client_reschedule(gen_random_uuid(), now(), 1) $$, '42501', null, 'Ο ανώνυμος δεν μετατίθεται');
select throws_ok($$ select public.filming_client_reschedule_withdraw(gen_random_uuid()) $$, '42501', null, 'Ο ανώνυμος δεν αποσύρει μετάθεση');
select throws_ok($$ select public.filming_decide_reschedule(gen_random_uuid(), true, null) $$, '42501', null, 'Ο ανώνυμος δεν αποφασίζει μετάθεση');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
select throws_ok($$ select public.booking_hours_view() $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Λογιστής δεν βλέπει το Ωράριο');
select throws_ok($$ select public.booking_hours_save('{}'::jsonb) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Λογιστής δεν αποθηκεύει το Ωράριο');
select throws_ok($$ select public.booking_exception_save(date '2027-02-01', true, null, null, null, null) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Λογιστής δεν γράφει εξαίρεση');
select throws_ok($$ select public.booking_exception_delete(date '2027-02-01') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Λογιστής δεν σβήνει εξαίρεση');
select throws_ok($$ select public.filming_slot_check(now(), 1, null) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Λογιστής δεν βλέπει προειδοποίηση ώρας');
select throws_ok($$ select public.filming_decide_reschedule(gen_random_uuid(), true, null) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Λογιστής δεν αποφασίζει μετάθεση');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e9","role":"authenticated"}', true);
select throws_ok($$ select public.booking_options() $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Πελάτης χωρίς c.book δεν βλέπει επιλογές');
select throws_ok($$ select public.booking_days(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Πελάτης χωρίς c.book δεν βλέπει ημέρες');
select throws_ok($$ select public.booking_slots(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid, date '2027-01-04', 1) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Πελάτης χωρίς c.book δεν βλέπει ώρες');
select throws_ok($$ select public.filming_client_reschedule(gen_random_uuid(), now(), 1) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Πελάτης χωρίς c.book δεν μετατίθεται');
select throws_ok($$ select public.filming_client_reschedule_withdraw(gen_random_uuid()) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Πελάτης χωρίς c.book δεν αποσύρει');

-- ───────────── Ωράριο: όρια και αποθήκευση (Ιδιοκτήτης) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select is(public.booking_hours_view() ->> 'isSet', 'false', 'Πριν την αποθήκευση το Ωράριο δεν έχει οριστεί');
select is((select done::text from authz.readiness_items() where item = 'booking_hours'), 'false', 'Ο Έλεγχος ετοιμότητας δείχνει εκκρεμές το Ωράριο');
select is((select reason from authz.day_hours(date '2027-01-04')), 'not_set', 'Χωρίς Ωράριο κάθε μέρα είναι «δεν έχει οριστεί»');
select is(authz.slot_problem(timestamptz '2027-01-04 10:00:00+02', 1, null, true), 'Το Ωράριο κρατήσεων δεν έχει οριστεί', 'Χωρίς Ωράριο η ώρα δεν κλείνει');
select throws_ok($$ select public.booking_hours_save(jsonb_build_object('week', public.t_week_all('09:00', '19:00'), 'capacity', 2, 'durations', '[]'::jsonb, 'stepMinutes', 60)) $$, 'P0001', 'Διάλεξε τουλάχιστον μία διάρκεια', 'Το Ωράριο θέλει τουλάχιστον μία διάρκεια');
select throws_ok($$ select public.booking_hours_save(jsonb_build_object('week', public.t_week_all('09:00', '19:00'), 'capacity', 2, 'durations', '[0.3]'::jsonb, 'stepMinutes', 60)) $$, 'P0001', 'Οι διάρκειες είναι από 0,5 έως 12 ώρες, ανά μισή ώρα, χωρίς διπλά', 'Διάρκεια που δεν είναι μισή ώρα απορρίπτεται');
select throws_ok($$ select public.booking_hours_save(jsonb_build_object('week', public.t_week_all('09:00', '19:00'), 'capacity', 0, 'durations', '[1,2,3]'::jsonb, 'stepMinutes', 60)) $$, 'P0001', 'Η Χωρητικότητα είναι από 1 έως 20', 'Χωρητικότητα εκτός ορίων απορρίπτεται');
select throws_ok($$ select public.booking_hours_save(jsonb_build_object('week', public.t_week_all('09:00', '19:00'), 'capacity', 2, 'durations', '[1,2,3]'::jsonb, 'stepMinutes', 20)) $$, 'P0001', 'Το βήμα ώρας έναρξης είναι 15, 30 ή 60 λεπτά', 'Βήμα που δεν είναι 15, 30 ή 60 απορρίπτεται');
select throws_ok($$ select public.booking_hours_save(jsonb_build_object('week', public.t_week_all('19:00', '09:00'), 'capacity', 2, 'durations', '[1,2,3]'::jsonb, 'stepMinutes', 60)) $$, 'P0001', 'Η ώρα κλεισίματος πρέπει να είναι μετά την ώρα ανοίγματος', 'Κλείσιμο πριν το άνοιγμα απορρίπτεται');
select throws_ok($$ select public.booking_hours_save(jsonb_build_object('week', (select jsonb_agg(x) from jsonb_array_elements(public.t_week_all('09:00', '19:00')) x where (x ->> 'dow')::integer < 7), 'capacity', 2, 'durations', '[1,2,3]'::jsonb, 'stepMinutes', 60)) $$, 'P0001', 'Το Ωράριο θέλει και τις 7 μέρες της εβδομάδας', 'Εβδομάδα με λιγότερες από 7 μέρες απορρίπτεται');
select lives_ok($$ select public.booking_hours_save(jsonb_build_object('week', public.t_week_all('09:00', '19:00'), 'capacity', 2, 'durations', '[1,2,3]'::jsonb, 'stepMinutes', 60)) $$, 'Ο Ιδιοκτήτης αποθηκεύει το Ωράριο');
select is(public.booking_hours_view() ->> 'isSet', 'true', 'Μετά την αποθήκευση το Ωράριο είναι ορισμένο');
select is((public.booking_hours_view() -> 'durations' ->> 0)::numeric, 1::numeric, 'Οι διάρκειες αποθηκεύονται');
select is(jsonb_array_length(public.booking_hours_view() -> 'week'), 7, 'Η οθόνη δείχνει και τις 7 μέρες');
select is((select done::text from authz.readiness_items() where item = 'booking_hours'), 'true', 'Μετά την αποθήκευση ο Έλεγχος ετοιμότητας είναι έτοιμος');
select is((select capacity from public.filming_settings where id), 2::smallint, 'Η προεπιλογή Χωρητικότητας είναι 2');
select ok((select count(*) from public.audit_log where entity = 'booking_week') >= 7, 'Το Ωράριο γράφει Ίχνος για κάθε μέρα');

-- ───────────── Εξαιρέσεις και ώρες μιας μέρας (Ιδιοκτήτης) ─────────────
select throws_ok($$ select public.booking_exception_save(date '2020-01-01', true, null, null, null, null) $$, 'P0001', 'Η εξαίρεση δεν μπορεί να είναι στο παρελθόν', 'Εξαίρεση στο παρελθόν απορρίπτεται');
select throws_ok($$ select public.booking_exception_save(date '2027-01-06', true, time '10:00', null, null, null) $$, 'P0001', 'Κλεισμένη μέρα δεν έχει ώρες ούτε Χωρητικότητα', 'Κλεισμένη μέρα με ώρες απορρίπτεται');
select throws_ok($$ select public.booking_exception_save(date '2027-01-06', false, time '12:00', null, null, null) $$, 'P0001', 'Η εξαίρεση θέλει και τις δύο ώρες ή καμία', 'Μία ώρα μόνο απορρίπτεται');
select throws_ok($$ select public.booking_exception_save(date '2027-01-06', false, time '14:00', time '12:00', null, null) $$, 'P0001', 'Η ώρα κλεισίματος πρέπει να είναι μετά την ώρα ανοίγματος', 'Κλείσιμο πριν το άνοιγμα στην εξαίρεση απορρίπτεται');
select throws_ok($$ select public.booking_exception_save(date '2027-01-06', false, null, null, 21, null) $$, 'P0001', 'Η Χωρητικότητα είναι από 1 έως 20', 'Χωρητικότητα εξαίρεσης εκτός ορίων απορρίπτεται');
select lives_ok($$ select public.booking_exception_save(date '2027-01-04', true, null, null, null, 'Κλειστά') $$, 'Η Δευτέρα 4 Ιανουαρίου κλείνει ως εξαίρεση');
select is((select reason from authz.day_hours(date '2027-01-04')), 'closed', 'Η κλεισμένη εξαίρεση δίνει «κλειστή»');
select is(authz.slot_problem(timestamptz '2027-01-04 10:00:00+02', 1, null, true), 'Η μέρα είναι κλειστή για κρατήσεις', 'Κλειστή μέρα δεν κλείνει');
select lives_ok($$ select public.booking_exception_delete(date '2027-01-04') $$, 'Η εξαίρεση της 4ης σβήνεται');
select is((select is_open::text from authz.day_hours(date '2027-01-04')), 'true', 'Χωρίς εξαίρεση η μέρα ξανανοίγει με την εβδομάδα');
select lives_ok($$ select public.booking_exception_save(date '2027-01-05', false, time '12:00', time '14:00', 5, null) $$, 'Η 5η Ιανουαρίου έχει δικές της ώρες');
select is((select opens::text from authz.day_hours(date '2027-01-05')), '12:00:00', 'Η εξαίρεση με ώρες υπερισχύει της εβδομάδας');
select is((select capacity::integer from authz.day_hours(date '2027-01-05')), 5, 'Η εξαίρεση με Χωρητικότητα υπερισχύει της προεπιλογής');
select lives_ok($$ select public.booking_exception_save(date '2027-01-01', false, null, null, null, 'Ανοιχτά') $$, 'Η Πρωτοχρονιά ανοίγει ως εξαίρεση');
select is((select is_open::text from authz.day_hours(date '2027-01-01')), 'true', 'Η αργία που ανοίγει δίνει ανοιχτή μέρα');
select is((select reason from authz.day_hours(date '2027-03-25')), 'holiday', 'Η αργία χωρίς εξαίρεση είναι κλειστή ως αργία');
select lives_ok($$ select public.booking_exception_save((now() at time zone 'Europe/Athens')::date, false, null, null, null, null) $$, 'Σήμερα ανοίγει ως εξαίρεση (για τις ημέρες του E5)');
select lives_ok($$ select public.booking_exception_save((now() at time zone 'Europe/Athens')::date + 2, false, null, null, null, null) $$, 'Η μέρα +2 ανοίγει ως εξαίρεση');
select lives_ok($$ select public.booking_exception_save((now() at time zone 'Europe/Athens')::date + 3, true, null, null, null, null) $$, 'Η μέρα +3 κλείνει ως εξαίρεση');
select lives_ok($$ select public.booking_exception_save((now() at time zone 'Europe/Athens')::date + 4, false, null, null, null, null) $$, 'Η μέρα +4 ανοίγει ως εξαίρεση');
select is(jsonb_array_length(public.booking_hours_view() -> 'exceptions'), 6, 'Η οθόνη δείχνει τις εξαιρέσεις από σήμερα και μετά');
select is(jsonb_array_length(public.booking_hours_view() -> 'holidays'), 26, 'Η οθόνη δείχνει τις αργίες φέτος και του χρόνου');

-- ───────────── Ώρα: προβλήματα και χωρητικότητα (ομάδα και πελάτης) ─────────────
select is(authz.slot_problem(timestamptz '2027-01-04 08:00:00+02', 1, null, true), 'Η ώρα είναι εκτός Ωραρίου', 'Έναρξη πριν το άνοιγμα είναι εκτός Ωραρίου');
select is(authz.slot_problem(timestamptz '2027-01-04 18:30:00+02', 2, null, true), 'Η ώρα είναι εκτός Ωραρίου', 'Λήξη μετά το κλείσιμο είναι εκτός Ωραρίου');
select is(authz.slot_problem(timestamptz '2027-03-25 10:00:00+02', 1, null, true), 'Η μέρα είναι αργία', 'Η αργία δεν κλείνει');
select is(authz.slot_problem(timestamptz '2027-01-04 10:00:00+02', 1.5, null, true), 'Η διάρκεια δεν επιτρέπεται', 'Η διάρκεια εκτός λίστας απορρίπτεται για τον πελάτη');
select is(authz.slot_problem(timestamptz '2027-01-04 10:15:00+02', 1, null, true), 'Η ώρα έναρξης δεν ταιριάζει στο βήμα', 'Η ώρα εκτός βήματος απορρίπτεται για τον πελάτη');
select ok(authz.slot_problem(timestamptz '2027-01-04 10:00:00+02', 1.5, null, false) is null, 'Η ομάδα παίρνει οποιαδήποτε διάρκεια');
select lives_ok($$ select public.filming_create(current_setting('t.a')::uuid, timestamptz '2027-01-04 10:00:00+02', 1, current_setting('t.shoot')::uuid, null, null) $$, 'Πρώτο Γύρισμα της ομάδας στις 10:00');
select set_config('t.f1', (select id::text from public.filmings where starts_at = timestamptz '2027-01-04 10:00:00+02' order by created_at limit 1), true);
select lives_ok($$ select public.filming_create(current_setting('t.a')::uuid, timestamptz '2027-01-04 10:00:00+02', 1, current_setting('t.shoot')::uuid, null, null) $$, 'Δεύτερο Γύρισμα της ομάδας στις 10:00');
select is(authz.slot_problem(timestamptz '2027-01-04 10:00:00+02', 1, null, true), 'Η ώρα είναι γεμάτη', 'Με Χωρητικότητα 2 δύο Γυρίσματα γεμίζουν την ώρα');
select ok(authz.slot_problem(timestamptz '2027-01-04 11:00:00+02', 1, null, true) is null, 'Δύο διαδοχικά Γυρίσματα δεν γεμίζουν την Χωρητικότητα 2');
select is(authz.slot_problem(timestamptz '2027-01-04 10:00:00+02', 1, null, false), 'Η ώρα είναι γεμάτη', 'Η ομάδα βλέπει ότι η ώρα είναι γεμάτη');
select lives_ok($$ select public.filming_create(current_setting('t.a')::uuid, timestamptz '2027-01-04 10:00:00+02', 1, current_setting('t.shoot')::uuid, null, null) $$, 'Η ομάδα κλείνει και σε γεμάτη ώρα (Κ3)');
select is(public.filming_slot_check(timestamptz '2027-01-04 10:00:00+02', 1, null) ->> 'problem', 'Η ώρα είναι γεμάτη', 'Η προειδοποίηση της ομάδας λέει ότι η ώρα είναι γεμάτη');
select is(public.filming_slot_check(timestamptz '2027-01-04 10:00:00+02', 1, null) ->> 'load', '3', 'Η προειδοποίηση δείχνει τη φόρτωση');
select lives_ok($$ select public.filming_create(current_setting('t.a')::uuid, timestamptz '2027-01-04 19:30:00+02', 1, current_setting('t.shoot')::uuid, null, null) $$, 'Η ομάδα κλείνει και εκτός Ωραρίου (Κ3)');
select set_config('t.f4', (select id::text from public.filmings where starts_at = timestamptz '2027-01-04 19:30:00+02' limit 1), true);
select is(authz.filming_viewer_can(current_setting('t.f4')::uuid) ->> 'reschedule', 'true', 'Η ομάδα μπορεί να μετατάξει Γύρισμα εκτός Ωραρίου');
select is(public.filming_view(current_setting('t.f4')::uuid) -> 'signals' ->> 'slotProblem', 'Η ώρα είναι εκτός Ωραρίου', 'Η σελίδα Γυρίσματος δείχνει το πρόβλημα ώρας');
select is(public.filming_view(current_setting('t.f1')::uuid) -> 'signals' ->> 'slotProblem', 'Η ώρα είναι γεμάτη', 'Η σελίδα Γυρίσματος δείχνει τη γεμάτη ώρα');
select is(authz.slot_load(timestamptz '2027-01-04 09:00:00+02', timestamptz '2027-01-04 12:00:00+02', null), 3, 'Η φόρτωση είναι η μέγιστη ταυτόχρονη');
select is(authz.slot_load(timestamptz '2027-01-04 10:00:00+02', timestamptz '2027-01-04 11:00:00+02', current_setting('t.f1')::uuid), 2, 'Το Γύρισμα εξαιρείται από τη φόρτωση του εαυτού του');
select is(authz.slot_load(timestamptz '2027-01-04 11:00:00+02', timestamptz '2027-01-04 12:00:00+02', null), 0, 'Μετά τις 11:00 η ώρα είναι ελεύθερη');

-- Γεμάτη μέρα του E5: δύο Γυρίσματα όλη μέρα (09–19) στη μέρα +4.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select lives_ok($$ select public.filming_create(current_setting('t.a')::uuid, public.t_day(4, time '09:00'), 10, current_setting('t.shoot')::uuid, null, null) $$, 'Πρώτο Γύρισμα όλη τη μέρα +4');
select lives_ok($$ select public.filming_create(current_setting('t.a')::uuid, public.t_day(4, time '09:00'), 10, current_setting('t.shoot')::uuid, null, null) $$, 'Δεύτερο Γύρισμα όλη τη μέρα +4');

-- ───────────── E5: ημέρες, ώρες και επιλογές (πελάτης e6) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select is(jsonb_array_length(public.booking_days(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid)), 61, 'Ο πλέγμα έχει μία γραμμή για κάθε μέρα του ορίζοντα');
select is((select x ->> 'status' from jsonb_array_elements(public.booking_days(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid)) x where (x ->> 'day')::date = (now() at time zone 'Europe/Athens')::date), 'too_soon', 'Σήμερα είναι νωρίς (ειδοποίηση 24 ώρες)');
select is((select x ->> 'status' from jsonb_array_elements(public.booking_days(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid)) x where (x ->> 'day')::date = (now() at time zone 'Europe/Athens')::date + 2), 'free', 'Η μέρα +2 είναι ελεύθερη');
select is((select x ->> 'status' from jsonb_array_elements(public.booking_days(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid)) x where (x ->> 'day')::date = (now() at time zone 'Europe/Athens')::date + 3), 'closed', 'Η μέρα +3 είναι κλειστή');
select is((select x ->> 'label' from jsonb_array_elements(public.booking_days(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid)) x where (x ->> 'day')::date = (now() at time zone 'Europe/Athens')::date + 3), 'Κλειστά', 'Η κλειστή μέρα έχει την ελληνική ετικέτα');
select is((select x ->> 'status' from jsonb_array_elements(public.booking_days(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid)) x where (x ->> 'day')::date = (now() at time zone 'Europe/Athens')::date + 4), 'full', 'Η μέρα +4 είναι γεμάτη');
select is(jsonb_array_length(public.booking_slots(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid, (now() at time zone 'Europe/Athens')::date + 2, 2)), 9, 'Διάρκεια 2 ώρες σε ελεύθερη μέρα δίνει 9 ώρες έναρξης');
select is(jsonb_array_length(public.booking_slots(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid, (now() at time zone 'Europe/Athens')::date + 4, 1)), 0, 'Γεμάτη μέρα δεν δίνει ώρες');
select is(jsonb_array_length(public.booking_slots(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid, (now() at time zone 'Europe/Athens')::date + 2, 1.5)), 0, 'Διάρκεια εκτός λίστας δεν δίνει ώρες');
select is(public.booking_options() ->> 'isSet', 'true', 'Οι επιλογές κράτησης ξέρουν ότι το Ωράριο είναι ορισμένο');
select is(jsonb_array_length(public.booking_options() -> 'agreements'), 1, 'Ο Πελάτης βλέπει τη δική του Συμφωνία');
select throws_ok($$ select public.filming_book(current_setting('t.a')::uuid, public.t_day(0, time '18:00'), 1, current_setting('t.shoot')::uuid, null, null) $$, 'P0001', 'Η κράτηση θέλει προειδοποίηση τουλάχιστον 24 ωρών', 'Κράτηση χωρίς την ελάχιστη προειδοποίηση απορρίπτεται');
select throws_ok($$ select public.filming_book(current_setting('t.a')::uuid, public.t_day(2, time '10:20'), 1, current_setting('t.shoot')::uuid, null, null) $$, 'P0001', 'Η ώρα έναρξης δεν ταιριάζει στο βήμα', 'Ώρα εκτός βήματος απορρίπτεται');
select throws_ok($$ select public.filming_book(current_setting('t.a')::uuid, public.t_day(2, time '11:00'), 1.5, current_setting('t.shoot')::uuid, null, null) $$, 'P0001', 'Η διάρκεια δεν επιτρέπεται', 'Διάρκεια εκτός λίστας απορρίπτεται');
select throws_ok($$ select public.filming_book(current_setting('t.a')::uuid, public.t_day(2, time '18:00'), 2, current_setting('t.shoot')::uuid, null, null) $$, 'P0001', 'Η ώρα είναι εκτός Ωραρίου', 'Κράτηση που περνά το κλείσιμο απορρίπτεται');
select throws_ok($$ select public.filming_book(current_setting('t.a')::uuid, public.t_day(3, time '10:00'), 1, current_setting('t.shoot')::uuid, null, null) $$, 'P0001', 'Η μέρα είναι κλειστή για κρατήσεις', 'Κλειστή μέρα απορρίπτεται');
select throws_ok($$ select public.filming_book(current_setting('t.a')::uuid, public.t_day(4, time '10:00'), 1, current_setting('t.shoot')::uuid, null, null) $$, 'P0001', 'Η ώρα είναι γεμάτη', 'Γεμάτη ώρα απορρίπτεται για τον πελάτη');
select set_config('t.k1', public.filming_book(current_setting('t.a')::uuid, public.t_day(2, time '10:00'), 2, current_setting('t.shoot')::uuid, 'Αθήνα', 'Κάλυψη εκδήλωσης')::text, true);
select set_config('t.k2', public.filming_book(current_setting('t.a')::uuid, public.t_day(2, time '14:00'), 1, current_setting('t.shoot')::uuid, null, null)::text, true);

-- Έγκριση και απόρριψη κράτησης πελάτη (ουρά email).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select lives_ok($$ select public.filming_approve(current_setting('t.k1')::uuid) $$, 'Η ομάδα εγκρίνει την κράτηση του πελάτη');
select lives_ok($$ select public.filming_reject(current_setting('t.k2')::uuid, 'Δεν χωράμε') $$, 'Η ομάδα απορρίπτει την άλλη κράτηση με λόγο');
select is((select count(*)::integer from public.email_outbox where kind = 'filming_decision' and to_email = 'client@example.com'), 2, 'Κάθε απόφαση κράτησης πελάτη γράφει email στην ουρά');
select is((select payload ->> 'decision' from public.email_outbox where kind = 'filming_decision' and payload ->> 'filmingId' = current_setting('t.k2')), 'rejected', 'Το email απόρριψης λέει «rejected»');
select is((select state from public.filmings where id = current_setting('t.k1')::uuid), 'scheduled', 'Η εγκεκριμένη κράτηση είναι προγραμματισμένη');

-- ───────────── Μετάθεση από τον πελάτη ─────────────
select set_config('t.bal0', (select r_balance::text from authz.one_off_balance_row(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid)), true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select lives_ok($$ select public.filming_client_reschedule(current_setting('t.k1')::uuid, public.t_day(2, time '14:00'), 1) $$, 'Ο πελάτης ζητά μετάθεση με επανέγκριση');
select ok((select starts_at = public.t_day(2, time '10:00') and reschedule_starts_at = public.t_day(2, time '14:00') from public.filmings where id = current_setting('t.k1')::uuid), 'Η παλιά ώρα μένει και η νέα μπαίνει στο αίτημα');
select is((select r_balance::text from authz.one_off_balance_row(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid)), current_setting('t.bal0'), 'Η μετάθεση δεν διπλομετράει την Παροχή');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select throws_ok($$ select public.filming_client_reschedule(current_setting('t.k1')::uuid, public.t_day(2, time '15:00'), 1) $$, 'P0001', 'Υπάρχει ήδη αίτημα μετάθεσης για αυτό το Γύρισμα', 'Δεύτερο αίτημα μετάθεσης απορρίπτεται');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select lives_ok($$ select public.filming_create(current_setting('t.a')::uuid, public.t_day(2, time '14:00'), 1, current_setting('t.shoot')::uuid, null, null) $$, 'Η ομάδα κλείνει Γύρισμα στη νέα ώρα του αιτήματος');
select is(authz.slot_problem(public.t_day(2, time '14:00'), 1, null, true), 'Η ώρα είναι γεμάτη', 'Η εκκρεμής μετάθεση πιάνει θέση στη νέα ώρα');
select lives_ok($$ select public.filming_decide_reschedule(current_setting('t.k1')::uuid, true, null) $$, 'Η ομάδα εγκρίνει τη μετάθεση (χωράει)');
select ok((select starts_at = public.t_day(2, time '14:00') and reschedule_starts_at is null from public.filmings where id = current_setting('t.k1')::uuid), 'Μετά την αποδοχή το Γύρισμα μετακινείται και το αίτημα καθαρίζει');
select is((select count(*)::integer from public.email_outbox where kind = 'reschedule_decision' and to_email = 'client@example.com'), 1, 'Η αποδοχή μετάθεσης γράφει email');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select lives_ok($$ select public.filming_client_reschedule(current_setting('t.k1')::uuid, public.t_day(2, time '16:00'), 1) $$, 'Νέο αίτημα μετάθεσης στις 16:00');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select is((public.filming_view(current_setting('t.k1')::uuid) -> 'signals' -> 'pendingReschedule' ->> 'hours')::numeric, 1::numeric, 'Η σελίδα του Γυρίσματος δείχνει το εκκρεμές αίτημα');
select throws_ok($$ select public.filming_decide_reschedule(current_setting('t.k1')::uuid, false, null) $$, 'P0001', 'Η απόρριψη θέλει λόγο', 'Απόρριψη μετάθεσης χωρίς λόγο απορρίπτεται');
select lives_ok($$ select public.filming_decide_reschedule(current_setting('t.k1')::uuid, false, 'Δεν μας βολεύει') $$, 'Η ομάδα απορρίπτει τη μετάθεση με λόγο');
select ok((select starts_at = public.t_day(2, time '14:00') and reschedule_starts_at is null from public.filmings where id = current_setting('t.k1')::uuid), 'Η απόρριψη κρατά την παλιά ώρα');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select lives_ok($$ select public.filming_client_reschedule(current_setting('t.k1')::uuid, public.t_day(2, time '15:00'), 1) $$, 'Νέο αίτημα μετάθεσης στις 15:00');
select lives_ok($$ select public.filming_client_reschedule_withdraw(current_setting('t.k1')::uuid) $$, 'Ο πελάτης αποσύρει το αίτημα');
select throws_ok($$ select public.filming_client_reschedule_withdraw(current_setting('t.k1')::uuid) $$, 'P0001', 'Δεν υπάρχει αίτημα μετάθεσης για αυτό το Γύρισμα', 'Απόσυρση χωρίς αίτημα απορρίπτεται');
select lives_ok($$ select public.filming_client_reschedule(current_setting('t.k1')::uuid, public.t_day(2, time '16:00'), 1) $$, 'Αίτημα στις 16:00 για τον έλεγχο γεμάτης ώρας');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select lives_ok($$ select public.filming_create(current_setting('t.a')::uuid, public.t_day(2, time '16:00'), 1, current_setting('t.shoot')::uuid, null, null) $$, 'Πρώτο Γύρισμα της ομάδας στις 16:00');
select lives_ok($$ select public.filming_create(current_setting('t.a')::uuid, public.t_day(2, time '16:00'), 1, current_setting('t.shoot')::uuid, null, null) $$, 'Δεύτερο Γύρισμα της ομάδας στις 16:00');
select is(jsonb_array_length(public.filming_queue_view() -> 'rescheduleRequests'), 1, 'Η ουρά δείχνει το αίτημα μετάθεσης');
select is(public.filming_queue_view() -> 'rescheduleRequests' -> 0 ->> 'slotProblem', 'Η ώρα είναι γεμάτη', 'Η ουρά δείχνει ότι η νέα ώρα δεν χωράει');
select throws_ok($$ select public.filming_decide_reschedule(current_setting('t.k1')::uuid, true, null) $$, 'P0001', 'Η ώρα είναι γεμάτη', 'Αποδοχή που δεν χωράει πια απορρίπτεται');
select lives_ok($$ select public.filming_decide_reschedule(current_setting('t.k1')::uuid, false, 'Γεμάτη ώρα') $$, 'Η ομάδα απορρίπτει το αίτημα που δεν χωράει');
select lives_ok($$ select public.filming_settings_save('{"rescheduleNeedsApproval": false}'::jsonb) $$, 'Ο Κανόνας δίνει άμεση μετάθεση');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select lives_ok($$ select public.filming_client_reschedule(current_setting('t.k1')::uuid, public.t_day(2, time '13:00'), 1) $$, 'Χωρίς τον Κανόνα η μετάθεση γίνεται αμέσως');
select ok((select starts_at = public.t_day(2, time '13:00') and reschedule_starts_at is null from public.filmings where id = current_setting('t.k1')::uuid), 'Η άμεση μετάθεση μετακινεί το Γύρισμα');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select lives_ok($$ select public.filming_settings_save('{"rescheduleNeedsApproval": true}'::jsonb) $$, 'Ο Κανόνας επανέγκρισης επιστρέφει');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e8","role":"authenticated"}', true);
select lives_ok($$ select set_config('t.k3', public.filming_book(current_setting('t.b')::uuid, public.t_day(2, time '09:00'), 1, current_setting('t.shoot')::uuid, null, null)::text, true) $$, 'Ο δεύτερος Πελάτης κλείνει στη Συμφωνία Β (ακύρωση 720 ώρες)');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select lives_ok($$ select public.filming_approve(current_setting('t.k3')::uuid) $$, 'Η ομάδα εγκρίνει την κράτηση της Συμφωνίας Β');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e8","role":"authenticated"}', true);
select throws_ok($$ select public.filming_client_reschedule(current_setting('t.k3')::uuid, public.t_day(2, time '11:00'), 1) $$, 'P0001', 'Μετά το Όριο ακύρωσης η μετάθεση γίνεται μόνο από την ομάδα', 'Μετά το Όριο ακύρωσης ο πελάτης δεν μετατίθεται');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e8","role":"authenticated"}', true);
select throws_ok($$ select public.filming_client_reschedule(current_setting('t.k1')::uuid, public.t_day(2, time '12:00'), 1) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Άλλος Πελάτης δεν μετατίθεται Γύρισμα που δεν είναι δικό του');
select throws_ok($$ select public.booking_days(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Άλλος Πελάτης δεν βλέπει ημέρες της Συμφωνίας');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e9","role":"authenticated"}', true);
select throws_ok($$ select public.filming_client_reschedule(current_setting('t.k1')::uuid, public.t_day(2, time '12:00'), 1) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Πελάτης χωρίς c.book δεν μετατίθεται');

-- ───────────── Αλλαγή Γυρίσματος από τον πελάτη με Παροχή τελειωμένη, λήξη, κλειστή μέρα και αλλαγή ώρας ─────────────
-- Η Παροχή της Συμφωνίας Α τελειώνει με Γυρίσματα της ομάδας σε μέρα +8· το Γύρισμα k1 του πελάτη μένει μέσα της.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select is(authz.filming_own_units(current_setting('t.k1')::uuid, null), 1::numeric, 'Το Γύρισμα του πελάτη μετράει μία Παροχή');
do $$
declare
  v_left numeric;
begin
  loop
    v_left := authz.filming_available(current_setting('t.a')::uuid, null, current_setting('t.shoot')::uuid);
    exit when v_left <= 0;
    perform public.filming_create(current_setting('t.a')::uuid, public.t_day(8, time '09:00'), 1, current_setting('t.shoot')::uuid, null, null);
  end loop;
end $$;
select is(authz.filming_available(current_setting('t.a')::uuid, null, current_setting('t.shoot')::uuid), 0::numeric, 'Η Παροχή της Συμφωνίας Α τελείωσε');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select is((select x ->> 'status' from jsonb_array_elements(public.booking_days(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid, current_setting('t.k1')::uuid)) x where (x ->> 'day')::date = (now() at time zone 'Europe/Athens')::date + 2), 'free', 'Η αλλαγή του δικού μου Γυρίσματος βλέπει ελεύθερη μέρα όταν η Παροχή έχει τελειώσει');
select is((select x ->> 'label' from jsonb_array_elements(public.booking_days(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid, current_setting('t.k1')::uuid)) x where (x ->> 'day')::date = (now() at time zone 'Europe/Athens')::date + 2), 'Ελεύθερη', 'Η ίδια μέρα έχει την ετικέτα «Ελεύθερη» στην αλλαγή');
select is((select x ->> 'status' from jsonb_array_elements(public.booking_days(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid)) x where (x ->> 'day')::date = (now() at time zone 'Europe/Athens')::date + 2), 'no_provision', 'Η κράτηση χωρίς αλλαγή βλέπει «Χωρίς Παροχή»');
select is((select x ->> 'label' from jsonb_array_elements(public.booking_days(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid)) x where (x ->> 'day')::date = (now() at time zone 'Europe/Athens')::date + 2), 'Χωρίς Παροχή', 'Η ετικέτα «Χωρίς Παροχή» μένει χωρίς αλλαγή');
select ok(jsonb_array_length(public.booking_slots(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid, (now() at time zone 'Europe/Athens')::date + 2, 1, current_setting('t.k1')::uuid)) > 0, 'Η αλλαγή βλέπει ώρες στη μέρα της');
select is(jsonb_array_length(public.booking_slots(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid, (now() at time zone 'Europe/Athens')::date + 2, 1)), 0, 'Χωρίς αλλαγή η ίδια μέρα δεν έχει ώρες');
select throws_ok($$ select public.booking_days(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid, current_setting('t.k3')::uuid) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Αλλαγή με Γύρισμα άλλου πελάτη δεν βλέπει ημέρες');
select throws_ok($$ select public.booking_slots(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid, (now() at time zone 'Europe/Athens')::date + 2, 1, current_setting('t.k3')::uuid) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Αλλαγή με Γύρισμα άλλου πελάτη δεν βλέπει ώρες');
select throws_ok($$ select public.filming_client_reschedule(current_setting('t.k1')::uuid, now() - interval '1 hour', 1) $$, 'P0001', 'Η κράτηση θέλει προειδοποίηση τουλάχιστον 24 ωρών', 'Αλλαγή σε ώρα που πέρασε απορρίπτεται');
select lives_ok($$ select public.filming_client_reschedule(current_setting('t.k1')::uuid, public.t_day(2, time '09:00'), 1) $$, 'Ο πελάτης ζητά αλλαγή στις 09:00 με την Παροχή που ελευθερώνει το ίδιο Γύρισμα');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
update public.filmings set reschedule_starts_at = now() - interval '1 hour' where id = current_setting('t.k1')::uuid;
select throws_ok($$ select public.filming_decide_reschedule(current_setting('t.k1')::uuid, true, null) $$, 'P0001', 'Η νέα ώρα πέρασε', 'Η αποδοχή αλλαγής με ώρα που πέρασε απορρίπτεται');
select is((select x ->> 'slotProblem' from jsonb_array_elements(public.filming_queue_view() -> 'rescheduleRequests') x where x ->> 'id' = current_setting('t.k1')), 'Η νέα ώρα πέρασε', 'Η ουρά δείχνει ότι η αλλαγή έχει περάσει');
select lives_ok($$ select public.filming_decide_reschedule(current_setting('t.k1')::uuid, false, 'Πέρασε η ώρα') $$, 'Η απόρριψη της ληγμένης αλλαγής επιτρέπεται');

-- Μέρα που χωράει μισή ώρα κλείνει για διάρκεια 1 ώρα: «Κλειστά», όχι «Γεμάτο».
select lives_ok($$ select public.booking_exception_save((now() at time zone 'Europe/Athens')::date + 9, false, time '09:00', time '09:30', null, null) $$, 'Η μέρα +9 ανοίγει μόνο μισή ώρα');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select is((select x ->> 'status' from jsonb_array_elements(public.booking_days(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid)) x where (x ->> 'day')::date = (now() at time zone 'Europe/Athens')::date + 9), 'closed', 'Μέρα που δεν χωράει καμία διάρκεια είναι κλειστή');
select is((select x ->> 'label' from jsonb_array_elements(public.booking_days(current_setting('t.a')::uuid, current_setting('t.shoot')::uuid)) x where (x ->> 'day')::date = (now() at time zone 'Europe/Athens')::date + 9), 'Κλειστά', 'Η κλειστή μέρα έχει την ετικέτα «Κλειστά»');

-- Αλλαγή ώρας (DST): 2026-10-25 λήγει η θερινή ώρα. Το Ωράριο 08–20 μένει 08–20 τοπικά.
insert into public.booking_exceptions (day, is_closed, opens, closes) values (date '2026-10-25', false, time '08:00', time '20:00');
select is((select (min(c) at time zone 'Europe/Athens')::time from authz.day_candidates(date '2026-10-25', 1) c), time '08:00', 'Τη μέρα της αλλαγής ώρας η πρώτη ώρα είναι 08:00 τοπικά');
select is((select (max(c) at time zone 'Europe/Athens')::time from authz.day_candidates(date '2026-10-25', 1) c), time '19:00', 'Τη μέρα της αλλαγής ώρας η τελευταία ώρα για 1 ώρα είναι 19:00 τοπικά');
select ok(authz.slot_problem(timestamptz '2026-10-25 06:00:00+00', 1, null, true) is null, 'Τη μέρα της αλλαγής ώρας η 08:00 τοπικά χωράει');
select is(authz.slot_problem(timestamptz '2026-10-25 05:30:00+00', 1, null, true), 'Η ώρα είναι εκτός Ωραρίου', 'Τη μέρα της αλλαγής ώρας η 07:30 τοπικά είναι εκτός Ωραρίου');

-- ───────────── Κλειστοί πίνακες και βοηθητικές συναρτήσεις ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select count(*) from public.booking_week $$, '42501', null, 'Ο πίνακας Ωραρίου είναι κλειστός για την εφαρμογή');
select throws_ok($$ insert into public.booking_week (dow, is_open) values (1, false) $$, '42501', null, 'Το Ωράριο γράφεται μόνο από τα RPC');
select throws_ok($$ select count(*) from public.booking_exceptions $$, '42501', null, 'Οι εξαιρέσεις είναι κλειστές για την εφαρμογή');
select throws_ok($$ select * from authz.day_hours(date '2027-01-04') $$, '42501', null, 'Η βοηθητική συνάρτηση ωραρίου δεν καλείται απευθείας');
reset role;


select * from finish();
rollback;
