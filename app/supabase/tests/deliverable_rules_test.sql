-- Κανόνες Παραδοτέων (#141): πρόσβαση, επικυρώσεις, εσωτερικός έλεγχος, προθεσμία και όριο ανά είδος.
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή. Ημερομηνίες 2027, ώστε οι προθεσμίες να είναι σταθερές.
-- να περνά οποιαδήποτε μέρα τρέξει. Οι προθεσμίες από «σήμερα» ελέγχονται με την ίδια συνάρτηση, όχι με σταθερή ημερομηνία.
begin;
select plan(49);

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης · e2 Παραγωγή (Υπεύθυνος της Παραγωγής της Περιόδου 1) · e3 Πωλήσεις (χωρίς Παραδοτέα)
-- e5 Διαχείριση (ελέγχει, κάνει χρέωση) · e6 χωρίς ομάδα και χωρίς σύνδεση Πελάτη
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'manager@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'client@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'Νίκος', 'manager@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e2', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000e3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000e5', 'Διαχείριση')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Πελάτης f1 (της Άννας) και μία ευκαιρία c1 για τη μηνιαία Συμφωνία.
insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'Κυψέλη Καφέ', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000e3');
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'Μηνιαίο δημόσιο',
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000e3', 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3;

-- Κατάλογος: μηνιαίο πακέτο (shoot 2, reel 8). Η Περίοδος 1 δίνει 8 reel.
insert into public.catalogue_items (id, kind, billing, name, name_en, unit, retired_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'package', 'monthly', 'Μηνιαίο πακέτο (τεστ)', 'Monthly (test)', '', null);
insert into public.catalogue_item_amounts (item_id, price) values ('00000000-0000-0000-0000-0000000000d1', 1000);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost) values ('00000000-0000-0000-0000-0000000000d1', 6, 14, 0);
insert into public.catalogue_item_provisions (item_id, kind_id, quantity)
select '00000000-0000-0000-0000-0000000000d1', k.id, p.qty
  from (values ('shoot', 2), ('reel', 8)) as p (code, qty)
  join public.provision_kinds k on k.code = p.code;
insert into public.cost_months (month, expenses_total, productive_hours)
values (date_trunc('month', now() at time zone 'Europe/Athens')::date, 8800, 220);

-- Βοηθητικά των τεστ: ο κωδικός ενός είδους Παροχής.
create function public.t_pk(p_code text) returns uuid
language sql stable
as $$ select k.id from public.provision_kinds k where k.code = p_code; $$;


-- Το Δικαίωμα: Ιδιοκτήτης ρυθμίζει· Παραγωγή βλέπει (deliverables.work) αλλά δεν αποθηκεύει· Πωλήσεις και Πελάτης τίποτα.
select set_config('t.reel', public.t_pk('reel')::text, true);
select set_config('t.video', public.t_pk('video')::text, true);
select set_config('t.photo', public.t_pk('photo')::text, true);
select set_config('t.shoot', public.t_pk('shoot')::text, true);

set local role anon;
select throws_ok($$ select public.deliverable_settings_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τους Κανόνες Παραδοτέων');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok($$ select public.deliverable_settings_view() $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν βλέπουν τους Κανόνες Παραδοτέων');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select throws_ok($$ select public.deliverable_settings_view() $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Πελάτης δεν βλέπει τους Κανόνες Παραδοτέων');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select lives_ok($$ select public.deliverable_settings_view() $$, 'Η Παραγωγή βλέπει τους Κανόνες (έχει deliverables.work)');
select throws_ok($$ select public.deliverable_settings_save('{"changesDays": 3}'::jsonb) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Παραγωγή δεν αποθηκεύει τους Κανόνες');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok($$ select public.deliverable_settings_save('{"changesDays": 3}'::jsonb) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν αποθηκεύουν τους Κανόνες');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select count(*) from public.deliverable_settings $$, '42501', 'permission denied for table deliverable_settings', 'Ο πίνακας των Κανόνων δεν διαβάζεται από την εφαρμογή');
reset role;

-- Σύμβαση, Περίοδος και Παραγωγές (όπως το #140).
select set_config('t.a', public.agreement_create('00000000-0000-0000-0000-0000000000c1', 'monthly', 'Μηνιαίο τεστ')::text, true);
select public.agreement_update_basics(current_setting('t.a')::uuid, 'Μηνιαίο τεστ', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, 6);
select public.agreement_add_catalogue_line(current_setting('t.a')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_set_recipients(current_setting('t.a')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a')::uuid, (now() at time zone 'Europe/Athens')::date, 'Μαρία Παπαδάκη', date '2027-03-01', 'contract.pdf');
select set_config('t.p1', (select pe.id::text from public.agreement_periods pe where pe.agreement_id = current_setting('t.a')::uuid and pe.n = 1), true);
select set_config('t.pa1', (select pr.id::text from public.productions pr where pr.period_id = current_setting('t.p1')::uuid), true);
select public.production_transfer(current_setting('t.pa1')::uuid, '00000000-0000-0000-0000-0000000000e2');
select set_config('t.pi', public.production_create_internal('Εσωτερική κανόνων', '00000000-0000-0000-0000-0000000000e1')::text, true);

-- Αποθήκευση και επικυρώσεις.
select lives_ok($$ select public.deliverable_settings_save('{"changesDays": 0, "reminderDays": [2, 5, 9]}'::jsonb) $$, 'Οι Κανόνες αποθηκεύονται (0 μέρες αλλαγών, υπενθυμίσεις 2, 5, 9)');
select set_config('t.audit0', (select count(*)::text from public.audit_log where entity = 'deliverable_settings'), true);
select lives_ok($$ select public.deliverable_settings_save('{"changesDays": 0}'::jsonb) $$, 'Αποθήκευση χωρίς αλλαγή περνά');
select is((select count(*)::text from public.audit_log where entity = 'deliverable_settings'), current_setting('t.audit0'), 'Αποθήκευση χωρίς αλλαγή δεν γράφει Ίχνος');
select lives_ok($$ select public.deliverable_settings_save('{"changesDays": 1}'::jsonb) $$, 'Αλλαγή μίας μέρας αποθηκεύεται');
select is((select count(*)::int from public.audit_log where entity = 'deliverable_settings') - current_setting('t.audit0')::int, 1, 'Η αλλαγή γράφει ένα Ίχνος');
select lives_ok($$ select public.deliverable_settings_save('{"changesDays": 0}'::jsonb) $$, 'Η μέρα αλλαγών επιστρέφει στο 0');
select is(authz.deliverable_changes_days(), 0, 'Η μέρα αλλαγών διαβάζεται από τη ρύθμιση');
select is(authz.deliverable_reminder_days(), '{2,5,9}'::integer[], 'Οι υπενθυμίσεις διαβάζονται από τη ρύθμιση');
select throws_ok($$ select public.deliverable_settings_save('{"changesDays": 31}'::jsonb) $$, 'P0001', 'Η τιμή είναι εκτός ορίων στους Κανόνες Παραδοτέων', 'Μέρες αλλαγών πάνω από 30 απορρίπτονται');
select throws_ok($$ select public.deliverable_settings_save('{"changesDays": 2.5}'::jsonb) $$, 'P0001', 'Η τιμή πρέπει να είναι ακέραιος αριθμός στους Κανόνες Παραδοτέων', 'Δεκαδικές μέρες αλλαγών απορρίπτονται');
select throws_ok($$ select public.deliverable_settings_save('{"internalReview": "ναι"}'::jsonb) $$, 'P0001', 'Μη έγκυρη τιμή στους Κανόνες Παραδοτέων', 'Ο εσωτερικός έλεγχος θέλει ναι ή όχι');
select throws_ok($$ select public.deliverable_settings_save('{"reminderDays": [7, 3]}'::jsonb) $$, 'P0001', 'Οι υπενθυμίσεις θέλουν αύξουσα σειρά, χωρίς διπλότυπα, έως 5 τιμές', 'Οι υπενθυμίσεις πρέπει να είναι αύξουσες');
select throws_ok($$ select public.deliverable_settings_save('{"reminderDays": [3, 3]}'::jsonb) $$, 'P0001', 'Οι υπενθυμίσεις θέλουν αύξουσα σειρά, χωρίς διπλότυπα, έως 5 τιμές', 'Διπλότυπες υπενθυμίσεις απορρίπτονται');
select throws_ok($$ select public.deliverable_settings_save('{"reminderDays": [0]}'::jsonb) $$, 'P0001', 'Οι υπενθυμίσεις είναι από 1 έως 60 μέρες', 'Υπενθύμιση 0 μέρες απορρίπτεται');
select throws_ok($$ select public.deliverable_settings_save('{"reminderDays": [61]}'::jsonb) $$, 'P0001', 'Οι υπενθυμίσεις είναι από 1 έως 60 μέρες', 'Υπενθύμιση πάνω από 60 μέρες απορρίπτεται');
select throws_ok($$ select public.deliverable_settings_save('{"reminderDays": [1, 2, 3, 4, 5, 6]}'::jsonb) $$, 'P0001', 'Οι υπενθυμίσεις θέλουν αύξουσα σειρά, χωρίς διπλότυπα, έως 5 τιμές', 'Πάνω από πέντε υπενθυμίσεις απορρίπτονται');
select throws_ok($$ select public.deliverable_settings_save('{"reminderDays": "3"}'::jsonb) $$, 'P0001', 'Οι υπενθυμίσεις θέλουν λίστα αριθμών', 'Οι υπενθυμίσεις θέλουν λίστα');
select throws_ok($$ select public.deliverable_settings_save('{"reminderDays": [3, "7"]}'::jsonb) $$, 'P0001', 'Οι υπενθυμίσεις θέλουν λίστα αριθμών', 'Μη αριθμητική υπενθύμιση απορρίπτεται');
select throws_ok($$ select public.deliverable_settings_save('{"reminderDays": [3.5]}'::jsonb) $$, 'P0001', 'Οι υπενθυμίσεις θέλουν ακέραιες μέρες', 'Δεκαδική υπενθύμιση απορρίπτεται');
select throws_ok($$ update public.deliverable_settings set reminder_days = '{7,3}' $$, '23514', null, 'Η σειρά των υπενθυμίσεων ελέγχεται και στη βάση');
select throws_ok($$ delete from public.deliverable_settings $$, 'P0001', 'Οι Κανόνες Παραδοτέων δεν σβήνονται', 'Οι Κανόνες δεν σβήνονται');
select ok(authz.audit_entity_allowed('deliverable_settings'), 'Το Ίχνος καταγράφει τους Κανόνες Παραδοτέων');
select is(public.deliverable_settings_view() -> 'defaults' ->> 'changesDays', '2', 'Οι προεπιλογές αλλαγών είναι 2 μέρες');
select is(public.deliverable_settings_view() -> 'defaults' -> 'reminderDays', '[3, 7]'::jsonb, 'Οι προεπιλογές υπενθυμίσεων είναι 3 και 7');

-- Προθεσμία και όριο ανά είδος.
select lives_ok($$ select public.deliverable_settings_save(jsonb_build_object('kinds', jsonb_build_array(
  jsonb_build_object('id', current_setting('t.reel'), 'deadlineDays', 3)))) $$, 'Το reel παίρνει 3 εργάσιμες');
select is((select k ->> 'deadlineDays' from jsonb_array_elements(public.deliverable_settings_view() -> 'kinds') k where k ->> 'id' = current_setting('t.reel')), '3', 'Η προθεσμία του reel αποθηκεύεται');
select is((select k ->> 'revisionLimit' from jsonb_array_elements(public.deliverable_settings_view() -> 'kinds') k where k ->> 'id' = current_setting('t.reel')), '2', 'Το όριο του reel μένει του Συμφωνιών (η οθόνη το δείχνει μόνο)');
select is((select k ->> 'deadlineDays' from jsonb_array_elements(public.deliverable_settings_view() -> 'kinds') k where k ->> 'id' = current_setting('t.video')), '10', 'Η αποθήκευση του reel δεν αλλάζει το βίντεο');
select throws_ok($$ select public.deliverable_settings_save('{"kinds":[{"id":"00000000-0000-0000-0000-00000000ffff","deadlineDays":3}]}'::jsonb) $$, 'P0001', 'Το είδος δεν μετράει σε πλήθος ή έχει αποσυρθεί', 'Άγνωστο είδος απορρίπτεται');
select throws_ok($$ select public.deliverable_settings_save(jsonb_build_object('kinds', jsonb_build_array(jsonb_build_object('id', current_setting('t.reel'), 'deadlineDays', 0)))) $$, 'P0001', 'Η τιμή είναι εκτός ορίων στους Κανόνες Παραδοτέων', 'Προθεσμία 0 μέρες απορρίπτεται');
select is(authz.deliverable_kind_days(current_setting('t.video')::uuid), 10, 'Η προθεσμία βίντεο διαβάζεται από το είδος');

-- Εσωτερικός έλεγχος κλειστός: πελάτη πάει κατευθείαν, εσωτερική Παραγωγή περνά από έλεγχο.
select lives_ok($$ select public.deliverable_settings_save('{"internalReview": false}'::jsonb) $$, 'Ο εσωτερικός έλεγχος κλείνει');
select ok(not authz.deliverable_rule_internal_review(), 'Ο εσωτερικός έλεγχος είναι κλειστός');
select set_config('t.d1', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid,
  'Κυψέλη Καφέ — Μάρτιος', null, null, null, null)::text, true);
select is((select d.deadline from public.deliverables d where d.id = current_setting('t.d1')::uuid), authz.add_working_days(public.sales_today(), 3), 'Νέο Παραδοτέο ακολουθεί τη νέα προθεσμία του είδους');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select is(public.deliverable_version_add(current_setting('t.d1')::uuid, 'https://drive.google.com/file/d/abc', null), 1, 'Η Παραγωγή ανεβάζει την Έκδοση 1');
select is(authz.deliverable_state(current_setting('t.d1')::uuid), 'awaiting_client', 'Με κλειστό έλεγχο, η Έκδοση του πελάτη πάει κατευθείαν στον πελάτη');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select set_config('t.di', public.deliverable_create(current_setting('t.pi')::uuid, current_setting('t.reel')::uuid,
  'Εσωτερικό reel', null, null, null, null)::text, true);
select is(public.deliverable_version_add(current_setting('t.di')::uuid, 'https://drive.google.com/file/d/xyz', null), 1, 'Ο Ιδιοκτήτης ανεβάζει Έκδοση στην εσωτερική Παραγωγή');
select is(authz.deliverable_state(current_setting('t.di')::uuid), 'in_review', 'Η εσωτερική Παραγωγή μένει σε έλεγχο ακόμα και με κλειστό εσωτερικό έλεγχο');

-- Νέες ημέρες είδους σε Γύρισμα που ακυρώνεται: Δευτέρα 22 Μαρτίου 2027 + 3 εργάσιμες (25 Μαρτίου αργία) = Παρασκευή 26 Μαρτίου 2027.
with ins as (
  insert into public.filmings (production_id, period_id, client_id, kind_id, starts_at, hours, origin, state)
  values (current_setting('t.pa1')::uuid, current_setting('t.p1')::uuid, '00000000-0000-0000-0000-0000000000f1',
          current_setting('t.shoot')::uuid, timestamptz '2027-03-24 10:00:00+02', 2, 'team', 'scheduled')
  returning id
)
select set_config('t.f2', (select id::text from ins), true);
select set_config('t.d5', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid,
  'Reel με γύρισμα που ακυρώνεται', null, current_setting('t.f2')::uuid, null, null)::text, true);
select is((select d.deadline from public.deliverables d where d.id = current_setting('t.d5')::uuid), null::date, 'Με Γύρισμα που δεν έγινε, η προθεσμία περιμένει');
alter table public.deliverables disable trigger deliverables_stamp;
update public.deliverables set created_at = timestamptz '2027-03-22 12:00:00+02' where id = current_setting('t.d5')::uuid;
alter table public.deliverables enable trigger deliverables_stamp;
update public.filmings set state = 'cancelled', cancelled_at = now(), cancelled_side = 'team', cancelled_reason = 'Αλλαγή πελάτη' where id = current_setting('t.f2')::uuid;
select is((select d.deadline from public.deliverables d where d.id = current_setting('t.d5')::uuid), date '2027-03-26', 'Γύρισμα που ακυρώνεται: 3 εργάσιμες από τη δημιουργία');

-- Όριο: νέα Συμφωνία παίρνει το νέο όριο· η υπάρχουσα κρατά το δικό της.
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000f1', 'Δεύτερη ευκαιρία',
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000e3', 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3;
update public.provision_kinds set revision_limit = 4 where id = current_setting('t.reel')::uuid;
select set_config('t.a2', public.agreement_create('00000000-0000-0000-0000-0000000000c2', 'monthly', 'Νέα τεστ')::text, true);
select is((select r.rounds::integer from public.agreement_revision_limits r where r.agreement_id = current_setting('t.a2')::uuid and r.kind_id = current_setting('t.reel')::uuid), 4, 'Η νέα Συμφωνία παίρνει το όριο των Συμφωνιών');
select is((select r.rounds::integer from public.agreement_revision_limits r where r.agreement_id = current_setting('t.a')::uuid and r.kind_id = current_setting('t.reel')::uuid), 2, 'Η υπάρχουσα Συμφωνία κρατά το δικό της όριο');

select * from finish();
rollback;
