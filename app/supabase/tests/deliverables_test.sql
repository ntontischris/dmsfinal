-- Παραδοτέα, πλευρά ομάδας (H1, H2): δομή, προθεσμίες, Παροχές, Εκδόσεις, σχόλια, χρέωση, ακύρωση, πρόσβαση (κεφ. 3, ADR 0007).
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή. Ημερομηνίες Γυρισμάτων και Περιόδων το 2027, ώστε το τεστ
-- να περνά οποιαδήποτε μέρα τρέξει. Οι προθεσμίες από «σήμερα» ελέγχονται με την ίδια συνάρτηση, όχι με σταθερή ημερομηνία.
begin;
select plan(83);

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

-- ───────────── Δομή και βοηθητικές (πριν από κάθε δεδομένο) ─────────────
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname in ('deliverables', 'deliverable_versions', 'deliverable_comments')),
  3, 'RLS ενεργό στους τρεις πίνακες Παραδοτέων'
);
select is(
  (select count(*)::int from pg_policies where schemaname = 'public'
     and tablename in ('deliverables', 'deliverable_versions', 'deliverable_comments')),
  0, 'Κανένα policy: οι πίνακες είναι κλειστοί'
);
select ok(authz.audit_entity_allowed('deliverables'), 'Το Ίχνος καταγράφει τα Παραδοτέα');
select ok(authz.audit_entity_allowed('deliverable_versions'), 'Το Ίχνος καταγράφει τις Εκδόσεις');
select ok(authz.audit_entity_allowed('deliverable_comments'), 'Το Ίχνος καταγράφει τα σχόλια');
select ok(authz.deliverable_rule_internal_review(), 'Ο εσωτερικός έλεγχος είναι ενεργός από προεπιλογή');
select is(authz.add_working_days(date '2027-03-24', 1), date '2027-03-26', 'Η Πέμπτη 25 Μαρτίου (αργία) παραλείπεται');
select is(authz.add_working_days(date '2027-03-24', 2), date '2027-03-29', 'Δύο εργάσιμες από Τετάρτη με αργία και Σαββατοκύριακο');
select is(authz.add_working_days(date '2027-03-26', 1), date '2027-03-29', 'Μία εργάσιμη από Παρασκευή είναι Δευτέρα');
select is(authz.deliverable_kind_days(public.t_pk('reel')), 5, 'Το reel έχει προθεσμία 5 εργάσιμων');
select is(authz.deliverable_kind_days(public.t_pk('video')), 10, 'Το βίντεο έχει προθεσμία 10 εργάσιμων');
select is(authz.deliverable_host('https://www.youtube.com/watch?v=abc'), 'youtube.com', 'Το YouTube είναι επιτρεπτό host');
select throws_ok($$ select authz.deliverable_host('http://drive.google.com/file/d/abc') $$, 'P0001', 'Χωρίς https το link απορρίπτεται');
select throws_ok($$ select authz.deliverable_host('https://example.com/video') $$, 'P0001', 'Άγνωστο host απορρίπτεται');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

-- ───────────── Σύμβαση, Περίοδος και Παραγωγές ─────────────
select set_config('t.a', public.agreement_create('00000000-0000-0000-0000-0000000000c1', 'monthly', 'Μηνιαίο τεστ')::text, true);
select public.agreement_update_basics(current_setting('t.a')::uuid, 'Μηνιαίο τεστ', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, 6);
select public.agreement_add_catalogue_line(current_setting('t.a')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_set_recipients(current_setting('t.a')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a')::uuid, (now() at time zone 'Europe/Athens')::date, 'Μαρία Παπαδάκη', date '2027-03-01', 'contract.pdf');

select set_config('t.reel', public.t_pk('reel')::text, true);
select set_config('t.video', public.t_pk('video')::text, true);
select set_config('t.photo', public.t_pk('photo')::text, true);
select set_config('t.shoot', public.t_pk('shoot')::text, true);
select set_config('t.p1', (select pe.id::text from public.agreement_periods pe where pe.agreement_id = current_setting('t.a')::uuid and pe.n = 1), true);
select set_config('t.pa1', (select pr.id::text from public.productions pr where pr.period_id = current_setting('t.p1')::uuid), true);
select set_config('t.pa2', (select pr.id::text from public.productions pr join public.agreement_periods pe on pe.id = pr.period_id
                             where pe.agreement_id = current_setting('t.a')::uuid and pe.n = 2), true);

-- Η Παραγωγή 1 περνά στον Πέτρο (Παραγωγή, «όσα με αφορούν»). Η Παραγωγή 2 μένει χωρίς Υπεύθυνο.
select public.production_transfer(current_setting('t.pa1')::uuid, '00000000-0000-0000-0000-0000000000e2');
-- Εσωτερική Παραγωγή: χωρίς Πελάτη, Συμφωνία και Περίοδο.
select set_config('t.pi', public.production_create_internal('Εσωτερική τεστ', '00000000-0000-0000-0000-0000000000e1')::text, true);

-- Γύρισμα της Παραγωγής 1 (ακόμα προγραμματισμένο). Η προθεσμία του Βίντεο περιμένει να γίνει «έγινε».
insert into public.filmings (production_id, period_id, client_id, kind_id, starts_at, hours, origin, state)
values (current_setting('t.pa1')::uuid, current_setting('t.p1')::uuid, '00000000-0000-0000-0000-0000000000f1',
        current_setting('t.shoot')::uuid, timestamptz '2027-03-10 10:00:00+02', 2, 'team', 'scheduled')
;
select set_config('t.f', (select f.id::text from public.filmings f where f.production_id = current_setting('t.pa1')::uuid), true);

-- ───────────── Πρόσβαση πριν από κάθε δημιουργία ─────────────
select is(
  (select b.balance from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.reel')::uuid) b), 8::numeric,
  'Η Περίοδος 1 δίνει 8 reel πριν από κάθε Παραδοτέο'
);
set local role anon;
select throws_ok(
  $$ select public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid, 'Ανώνυμο', null, null, null, null) $$,
  '42501', 'Ο ανώνυμος χρήστης δεν δημιουργεί Παραδοτέο'
);
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok(
  $$ select public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid, 'Πωλήσεις', null, null, null, null) $$,
  '42501', 'Χρήστης χωρίς deliverables.work δεν δημιουργεί Παραδοτέο'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select throws_ok(
  $$ select public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid, 'Πελάτης', null, null, null, null) $$,
  '42501', 'Πελάτης δεν δημιουργεί Παραδοτέο'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select throws_ok(
  $$ select public.deliverable_create(current_setting('t.pa2')::uuid, current_setting('t.reel')::uuid, 'Ξένη Παραγωγή', null, null, null, null) $$,
  '42501', 'Η Παραγωγή «mine» δεν δέχεται Παραδοτέο σε ξένη Παραγωγή'
);
set local role authenticated;
select throws_ok($$ select count(*) from public.deliverables $$, '42501', 'Ο πίνακας Παραδοτέων δεν διαβάζεται από την εφαρμογή');
reset role;

-- ───────────── Δημιουργία και Παροχές ─────────────
select set_config('t.d1', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid,
  'Κυψέλη Καφέ — Μάρτιος', null, null, null, null)::text, true);
select is((select d.charge from public.deliverables d where d.id = current_setting('t.d1')::uuid), 'included', 'Το Παραδοτέο παίρνει Παροχή της Περιόδου');
select is(
  (select b.balance from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.reel')::uuid) b), 7::numeric,
  'Το Παραδοτέο μειώνει το υπόλοιπο της Περιόδου'
);
select set_config('t.d4', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid,
  'Δεύτερο reel', null, null, null, null)::text, true);
select is(
  (select b.balance from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.reel')::uuid) b), 6::numeric,
  'Δεύτερο Παραδοτέο μειώνει ξανά το υπόλοιπο'
);
select throws_ok(
  $$ select public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.photo')::uuid, 'Φωτογραφίες', null, null, null, null) $$,
  'P0001', 'Χωρίς υπόλοιπο και χωρίς χρέωση δεν δημιουργείται Παραδοτέο'
);
select throws_ok(
  $$ select public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.photo')::uuid, 'Φωτογραφίες', null, null, 'free', null) $$,
  'P0001', '«Χωρίς χρέωση» θέλει λόγο'
);
select set_config('t.d2', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.photo')::uuid,
  'Φωτογραφίες', null, null, 'pending', null)::text, true);
select is((select d.charge from public.deliverables d where d.id = current_setting('t.d2')::uuid), 'pending', 'Χωρίς υπόλοιπο, «χρεώνεται» μένει σε απόφαση');
select set_config('t.d3', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.photo')::uuid,
  'Δωρεάν φωτογραφίες', null, null, 'free', 'Δώρο προς τον πελάτη')::text, true);
select is((select d.charge from public.deliverables d where d.id = current_setting('t.d3')::uuid), 'free', '«Χωρίς χρέωση» με λόγο δημιουργείται');
select is(
  (select d.deadline from public.deliverables d where d.id = current_setting('t.d1')::uuid),
  authz.add_working_days(public.sales_today(), 5), 'Χωρίς Γύρισμα, η προθεσμία του reel είναι 5 εργάσιμες από σήμερα'
);
select set_config('t.d5', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.video')::uuid,
  'Βίντεο γυρίσματος', null, current_setting('t.f')::uuid, 'pending', null)::text, true);
select is(
  (select d.deadline from public.deliverables d where d.id = current_setting('t.d5')::uuid), null::date,
  'Με Γύρισμα που δεν έγινε, η προθεσμία περιμένει'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select throws_ok(
  $$ select public.deliverable_create(current_setting('t.pa2')::uuid, current_setting('t.video')::uuid, 'Άλλη Παραγωγή', null, current_setting('t.f')::uuid, 'pending', null) $$,
  'P0001', 'Το Γύρισμα πρέπει να είναι της ίδιας Παραγωγής'
);
select throws_ok(
  $$ select public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.shoot')::uuid, 'Γύρισμα', null, null, null, null) $$,
  'P0001', 'Το γύρισμα (ανά Γύρισμα) δεν είναι είδος Παραδοτέου'
);
select throws_ok(
  $$ select public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.photo')::uuid, '   ', null, null, 'pending', null) $$,
  'P0001', 'Το Παραδοτέο θέλει τίτλο'
);
update public.filmings set state = 'done', actual_hours = 2, done_at = now()
 where id = current_setting('t.f')::uuid;
select is(
  (select d.deadline from public.deliverables d where d.id = current_setting('t.d5')::uuid),
  authz.add_working_days(public.sales_today(), 10), 'Το «έγινε» του Γυρίσματος γεμίζει την προθεσμία του βίντεο'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select set_config('t.di', public.deliverable_create(current_setting('t.pi')::uuid, current_setting('t.photo')::uuid,
  'Εσωτερικό υλικό', null, null, null, null)::text, true);
select is((select d.charge from public.deliverables d where d.id = current_setting('t.di')::uuid), 'free', 'Εσωτερική Παραγωγή: χωρίς χρέωση χωρίς λόγο');
select throws_ok(
  $$ select public.deliverable_create(current_setting('t.pa2')::uuid, current_setting('t.video')::uuid, 'Γύρισμα αλλού', null, current_setting('t.f')::uuid, 'pending', null) $$,
  'P0001', 'Γύρισμα άλλης Παραγωγής δεν δεσμεύεται'
);

-- ───────────── Ενημέρωση ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select public.deliverable_update(current_setting('t.d1')::uuid, 'Νέος τίτλος', null, null);
select is((select d.title from public.deliverables d where d.id = current_setting('t.d1')::uuid), 'Νέος τίτλος', 'Ο τίτλος ενημερώνεται');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok(
  $$ select public.deliverable_update(current_setting('t.d1')::uuid, 'Κλοπή', null, null) $$,
  '42501', 'Χρήστης χωρίς Δικαίωμα δεν ενημερώνει Παραδοτέο'
);

-- ───────────── Εκδόσεις: μη ελεγκτής, ελεγκτής, επιστροφή ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select is(public.deliverable_version_add(current_setting('t.d1')::uuid, 'https://drive.google.com/file/d/one', 'Πρώτη'), 1, 'Η πρώτη Έκδοση παίρνει αριθμό 1');
select is(authz.deliverable_state(current_setting('t.d1')::uuid), 'in_review', 'Έκδοση από μη ελεγκτή πάει σε εσωτερικό έλεγχο');
select throws_ok(
  $$ select public.deliverable_version_send(current_setting('t.d1')::uuid) $$,
  '42501', 'Ο μη ελεγκτής δεν στέλνει στον πελάτη'
);
select throws_ok(
  $$ select public.deliverable_version_add(current_setting('t.d1')::uuid, 'https://example.com/x', null) $$,
  'P0001', 'Άγνωστο host δεν γίνεται Έκδοση'
);
select throws_ok(
  $$ select public.deliverable_version_add(current_setting('t.d1')::uuid, 'http://drive.google.com/x', null) $$,
  'P0001', 'Χωρίς https δεν γίνεται Έκδοση'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select public.deliverable_version_send(current_setting('t.d1')::uuid);
select is(authz.deliverable_state(current_setting('t.d1')::uuid), 'awaiting_client', 'Ο ελεγκτής στέλνει στον πελάτη');
select is(public.deliverable_version_add(current_setting('t.d1')::uuid, 'https://vimeo.com/two', 'Δεύτερη'), 2, 'Η Έκδοση του ελεγκτή παίρνει τον επόμενο αριθμό');
select is(
  (select v.state from public.deliverable_versions v where v.deliverable_id = current_setting('t.d1')::uuid and v.number = 1),
  'superseded', 'Η Έκδοση που περίμενε πελάτη γίνεται αντικαταστάθηκε'
);
select is(authz.deliverable_state(current_setting('t.d1')::uuid), 'awaiting_client', 'Έκδοση ελεγκτή πάει κατευθείαν στον πελάτη');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select is(public.deliverable_version_add(current_setting('t.d1')::uuid, 'https://drive.google.com/file/d/three', null), 3, 'Νέα Έκδοση μη ελεγκτή');
select is(authz.deliverable_state(current_setting('t.d1')::uuid), 'in_review', 'Η νέα Έκδοση μη ελεγκτή ξαναμπαίνει σε έλεγχο');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select throws_ok(
  $$ select public.deliverable_version_return(current_setting('t.d1')::uuid, '   ') $$,
  'P0001', 'Η επιστροφή θέλει σημείωση'
);
select public.deliverable_version_return(current_setting('t.d1')::uuid, 'Λείπει ο ήχος');
select is(authz.deliverable_state(current_setting('t.d1')::uuid), 'returned', 'Η επιστροφή με σημείωση βγάζει Έκδοση από τον έλεγχο');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select public.deliverable_link_fix(current_setting('t.d1')::uuid, 'https://youtu.be/xyz');
select is(
  (select v.host from public.deliverable_versions v where v.deliverable_id = current_setting('t.d1')::uuid and v.number = 3),
  'youtu.be', 'Η διόρθωση link αλλάζει το host της τρέχουσας Έκδοσης'
);
select is(public.deliverable_version_add(current_setting('t.d1')::uuid, 'https://drive.google.com/file/d/four', null), 4, 'Μετά την επιστροφή, νέα Έκδοση');
select is(authz.deliverable_state(current_setting('t.d1')::uuid), 'in_review', 'Η νέα Έκδοση μετά την επιστροφή ξαναμπαίνει σε έλεγχο');

-- ───────────── Σχόλια και έγκριση σε Παραγωγή πελάτη ─────────────
select is(
  public.deliverable_comment_add(current_setting('t.d1')::uuid, 4, 'Ο ήχος στο 1:15', 75, false) is not null, true,
  'Σχόλιο με χρόνο σε υπάρχουσα Έκδοση'
);
select throws_ok(
  $$ select public.deliverable_comment_add(current_setting('t.d1')::uuid, 4, 'Εκτός ορίων', 90000, false) $$,
  'P0001', 'Ο χρόνος σχολίου έξω από τις 24 ώρες απορρίπτεται'
);
select throws_ok(
  $$ select public.deliverable_comment_add(current_setting('t.d1')::uuid, 9, 'Ανύπαρκτη Έκδοση', null, false) $$,
  'P0001', 'Σχόλιο σε ανύπαρκτη Έκδοση απορρίπτεται'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select throws_ok(
  $$ select public.deliverable_approve_internal(current_setting('t.d1')::uuid) $$,
  'P0001', 'Η εσωτερική έγκριση μόνο σε Εσωτερική Παραγωγή'
);

-- ───────────── Χρέωση ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select throws_ok(
  $$ select public.deliverable_charge_decide(current_setting('t.d2')::uuid, 'charged', null) $$,
  '42501', 'Χωρίς finance.cost δεν αποφασίζεται χρέωση'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select throws_ok(
  $$ select public.deliverable_charge_decide(current_setting('t.d2')::uuid, 'free', null) $$,
  'P0001', '«Χωρίς χρέωση» θέλει λόγο στην απόφαση'
);
select public.deliverable_charge_decide(current_setting('t.d2')::uuid, 'charged', null);
select is((select d.charge from public.deliverables d where d.id = current_setting('t.d2')::uuid), 'charged', 'Η απόφαση «χρεώνεται» καταγράφεται');
select throws_ok(
  $$ select public.deliverable_charge_decide(current_setting('t.d3')::uuid, 'charged', null) $$,
  'P0001', 'Η χρέωση που έχει αποφασιστεί δεν αλλάζει ξανά'
);

-- ───────────── Ακύρωση ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select throws_ok(
  $$ select public.deliverable_cancel(current_setting('t.d4')::uuid, '   ', 'returned') $$,
  'P0001', 'Η ακύρωση θέλει λόγο'
);
select throws_ok(
  $$ select public.deliverable_cancel(current_setting('t.d4')::uuid, 'Λάθος', 'χάθηκε') $$,
  'P0001', 'Η ακύρωση θέλει έγκυρο outcome'
);
select public.deliverable_cancel(current_setting('t.d4')::uuid, 'Αλλαγή σχεδίου', 'returned');
select is(
  (select b.balance from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.reel')::uuid) b), 7::numeric,
  'Ακύρωση με «επιστρέφει» επιστρέφει την Παροχή στην Περίοδο'
);
select throws_ok(
  $$ select public.deliverable_update(current_setting('t.d4')::uuid, 'Ακυρωμένο', null, null) $$,
  'P0001', 'Ακυρωμένο Παραδοτέο δεν ενημερώνεται'
);

-- ───────────── Ουρές, σελίδα, Παραγωγή ─────────────
select throws_ok($$ select public.deliverables_queue_view('review') $$, '42501', 'Η ουρά ελέγχου θέλει deliverables.review');
select throws_ok($$ select public.deliverables_queue_view('άγνωστη') $$, 'P0001', 'Άγνωστη ουρά απορρίπτεται');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select ok(
  exists (select 1 from jsonb_array_elements(public.deliverables_queue_view('mine')) x where x->>'id' = current_setting('t.d2')),
  'Η ουρά «Για μένα» του Πέτρου έχει το δικό του Παραδοτέο'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select throws_ok($$ select public.deliverable_view(current_setting('t.d1')::uuid) $$, '42501', 'Ο πελάτης δεν βλέπει τη σελίδα Παραδοτέου');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select is(
  jsonb_array_length(public.deliverable_view(current_setting('t.d1')::uuid)->'versions'), 4,
  'Η σελίδα Παραδοτέου δείχνει όλες τις Εκδόσεις'
);
select is(
  (public.deliverable_view(current_setting('t.d1')::uuid)->'can'->>'send')::boolean, false,
  'Ο μη ελεγκτής δεν βλέπει «Στείλε»'
);
select throws_ok(
  $$ select public.deliverable_candidates(current_setting('t.pa2')::uuid) $$, '42501', 'Χωρίς Δικαίωμα σε Παραγωγή δεν ζητάμε υποψηφίους'
);
select is(jsonb_array_length(public.deliverable_candidates(current_setting('t.pa1')::uuid)->'kinds'), 4, 'Οι υποψήφιοι είδη είναι τα είδη πλήθους');
select is(authz.production_has_work(current_setting('t.pa2')::uuid), false, 'Η Παραγωγή 2 δεν έχει δουλειά');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select ok(
  exists (select 1 from jsonb_array_elements(public.production_view(current_setting('t.pa1')::uuid)->'deliverables') x where x->>'id' = current_setting('t.d1')),
  'Η σελίδα Παραγωγής δείχνει τα Παραδοτέα της'
);

-- ───────────── Εσωτερική Παραγωγή: έγκριση και δουλειά ─────────────
select set_config('t.i1', public.deliverable_create(current_setting('t.pi')::uuid, current_setting('t.photo')::uuid,
  'Εσωτερικό υλικό ομάδας', null, null, null, null)::text, true);
select is(public.deliverable_version_add(current_setting('t.i1')::uuid, 'https://drive.google.com/file/d/int', null), 1, 'Η Έκδοση του Ιδιοκτήτη πάει κατευθείαν στον πελάτη');
select public.deliverable_approve_internal(current_setting('t.i1')::uuid);
select is(authz.deliverable_state(current_setting('t.i1')::uuid), 'approved', 'Η εσωτερική έγκριση βγάζει το Παραδοτέο εγκεκριμένο');
select throws_ok(
  $$ select public.deliverable_cancel(current_setting('t.i1')::uuid, 'Λόγος', 'returned') $$,
  'P0001', 'Το εγκεκριμένο Παραδοτέο δεν ακυρώνεται'
);
select throws_ok(
  $$ select public.deliverable_version_add(current_setting('t.i1')::uuid, 'https://drive.google.com/file/d/late', null) $$,
  'P0001', 'Το εγκεκριμένο Παραδοτέο δεν δέχεται νέα Έκδοση'
);
select is(authz.production_has_work(current_setting('t.pi')::uuid), true, 'Εγκεκριμένο Παραδοτέο κάνει την Παραγωγή να έχει δουλειά');
select throws_ok(
  $$ select public.production_cancel(current_setting('t.pi')::uuid, 'Λόγος') $$,
  'P0001', 'Παραγωγή με εγκεκριμένο Παραδοτέο δεν ακυρώνεται'
);

-- ───────────── Κλείσιμο: ακύρωση με «καταναλώθηκε» ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select public.deliverable_cancel(current_setting('t.d1')::uuid, 'Έγινε αντικατάσταση', 'consumed');
select is(
  (select b.used from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.reel')::uuid) b), 1::numeric,
  'Ακύρωση με «καταναλώθηκε» μένει ως καταναλωμένη Παροχή'
);
select is(
  (select b.reserved from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.reel')::uuid) b), 0::numeric,
  'Ακυρωμένο Παραδοτέο δεν μένει δεσμευμένο'
);

select * from finish();
rollback;
