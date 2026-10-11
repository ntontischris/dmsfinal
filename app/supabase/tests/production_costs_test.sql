-- Κόστος και ώρες Παραγωγής (G3): στιγμιότυπο εκτίμησης στην υπογραφή, προτεινόμενες ώρες, επιβεβαίωση, σήματα στα όρια,
-- ομάδες της λίστας, Εσωτερική Παραγωγή, άρνηση ανά ρόλο, κλειστός πίνακας, Ίχνος (#144). Φανταστικοί Χρήστες και στοιχεία·
-- όλα ζουν μέσα στη συναλλαγή. Ημερομηνίες σχετικές με τη σημερινή μέρα.
begin;
select plan(55);

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης (κόστος: βλέπει και γράφει) · e2 Παραγωγή (Συνεργείο) · e3 Πωλήσεις (χωρίς κόστος)
-- e6 Πελάτης χωρίς ομάδα · e7 Διαχείριση (βλέπει κόστος, δεν γράφει)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'client@example.com'),
  ('00000000-0000-0000-0000-0000000000e7', 'manager@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e7', 'Νίκος', 'manager@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e2', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000e3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000e7', 'Διαχείριση')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Πελάτης f1 και Ευκαιρίες c1 (μηνιαία) και c3 (εφάπαξ), και οι δύο της Άννας.
insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'Κυψέλη Καφέ', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000e3');
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select o.id::uuid, o.client::uuid, o.title, (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'), o.manager::uuid, 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3
  from (values
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'Μηνιαίο δημόσιο', '00000000-0000-0000-0000-0000000000e3'),
    ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000f1', 'Εγκαίνια', '00000000-0000-0000-0000-0000000000e3')
  ) as o (id, client, title, manager);

-- Κατάλογος: μηνιαίο πακέτο (ώρες 6 + 14, τιμή 1.000 €), εφάπαξ πακέτο (ώρες 4 + 6, τιμή 500 €). Κόστος ώρας του μήνα: 10 €.
insert into public.catalogue_items (id, kind, billing, name, name_en, unit, retired_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'package', 'monthly', 'Μηνιαίο πακέτο (τεστ)', 'Monthly (test)', '', null),
  ('00000000-0000-0000-0000-0000000000d2', 'package', 'one_off', 'Εφάπαξ πακέτο (τεστ)', 'One-off (test)', '', null);
insert into public.catalogue_item_amounts (item_id, price) values
  ('00000000-0000-0000-0000-0000000000d1', 1000), ('00000000-0000-0000-0000-0000000000d2', 500);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost) values
  ('00000000-0000-0000-0000-0000000000d1', 6, 14, 0), ('00000000-0000-0000-0000-0000000000d2', 4, 6, 0);
insert into public.cost_months (month, expenses_total, productive_hours)
values (date_trunc('month', now() at time zone 'Europe/Athens')::date, 2200, 220);

-- ───────────── Συμφωνίες: a1 μηνιαία, a3 εφάπαξ (υπογραφή εκτός συστήματος) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select set_config('t.a1', public.agreement_create('00000000-0000-0000-0000-0000000000c1', 'monthly', 'Μηνιαίο δημόσιο')::text, true);
select public.agreement_update_basics(current_setting('t.a1')::uuid, 'Μηνιαίο δημόσιο', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, 6);
select public.agreement_add_catalogue_line(current_setting('t.a1')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_set_recipients(current_setting('t.a1')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a1')::uuid, (now() at time zone 'Europe/Athens')::date, 'Μαρία Παπαδάκη', (now() at time zone 'Europe/Athens')::date + 5, 'contract-a1.pdf');

select set_config('t.a3', public.agreement_create('00000000-0000-0000-0000-0000000000c3', 'one_off', 'Εγκαίνια')::text, true);
select public.agreement_update_basics(current_setting('t.a3')::uuid, 'Εγκαίνια', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, null);
select public.agreement_add_catalogue_line(current_setting('t.a3')::uuid, '00000000-0000-0000-0000-0000000000d2', 1);
select public.agreement_set_recipients(current_setting('t.a3')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a3')::uuid, (now() at time zone 'Europe/Athens')::date, 'Μαρία Παπαδάκη', (now() at time zone 'Europe/Athens')::date, 'contract-a3.pdf');

-- Παραγωγές P1 (πρώτη Περίοδος του a1), P2 (δεύτερη Περίοδος) και η Εσωτερική PI.
select set_config('t.p1', (select p.id::text from public.productions p join public.agreement_periods ap on ap.id = p.period_id
  where p.agreement_id = current_setting('t.a1')::uuid and ap.n = 1), true);
select set_config('t.p2', (select p.id::text from public.productions p join public.agreement_periods ap on ap.id = p.period_id
  where p.agreement_id = current_setting('t.a1')::uuid and ap.n = 2), true);
select set_config('t.pa3', (select p.id::text from public.productions p where p.agreement_id = current_setting('t.a3')::uuid), true);
select set_config('t.pi', public.production_create_internal('Εσωτερική δοκιμή', '00000000-0000-0000-0000-0000000000e1')::text, true);

-- ───────────── Γύρισμα και Συνεργείο: F1, F2 «έγινε» στην P1, F3 ανοιχτό στην P2 ─────────────
insert into public.filmings (id, production_id, period_id, client_id, kind_id, starts_at, hours, origin, state)
select '00000000-0000-0000-0000-0000000000a1'::uuid, p.id, p.period_id, p.client_id,
       (select k.id from public.provision_kinds k where k.code = 'shoot'), now() - interval '3 days', 4, 'team', 'pending'
  from public.productions p where p.id = current_setting('t.p1')::uuid;
insert into public.filmings (id, production_id, period_id, client_id, kind_id, starts_at, hours, origin, state)
select '00000000-0000-0000-0000-0000000000a2'::uuid, p.id, p.period_id, p.client_id,
       (select k.id from public.provision_kinds k where k.code = 'shoot'), now() - interval '2 days', 2, 'team', 'pending'
  from public.productions p where p.id = current_setting('t.p1')::uuid;
insert into public.filmings (id, production_id, period_id, client_id, kind_id, starts_at, hours, origin, state)
select '00000000-0000-0000-0000-0000000000a3'::uuid, p.id, p.period_id, p.client_id,
       (select k.id from public.provision_kinds k where k.code = 'shoot'), now() + interval '10 days', 2, 'team', 'pending'
  from public.productions p where p.id = current_setting('t.p2')::uuid;
insert into public.filming_crew (filming_id, user_id, response, responded_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e2', 'confirmed', now()),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e3', 'confirmed', now());
update public.filmings set state = 'done', done_at = now(), done_by = '00000000-0000-0000-0000-0000000000e2', actual_hours = 3
 where id = '00000000-0000-0000-0000-0000000000a1';
update public.filmings set state = 'done', done_at = now(), done_by = '00000000-0000-0000-0000-0000000000e2', actual_hours = 2
 where id = '00000000-0000-0000-0000-0000000000a2';

-- ───────────── Δομή και στιγμιότυπο στην υπογραφή ─────────────
select ok(
  (select relrowsecurity from pg_class where oid = 'public.production_costs'::regclass),
  'RLS ενεργό στον πίνακα κόστους Παραγωγής'
);
select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'production_costs'),
  0, 'Κανένα policy: ο πίνακας είναι κλειστός'
);
select is((select overrun_percent from public.cost_hint()), 20.00::numeric, 'Το ποσοστό υπέρβασης ξεκινά από 20%');
select is(
  (select count(*)::int from public.productions p
     join public.production_costs pc on pc.production_id = p.id
    where p.agreement_id = current_setting('t.a1')::uuid
      and pc.estimate_shoot_hours = 6 and pc.estimate_edit_hours = 14 and pc.estimate_direct_cost = 0
      and pc.estimate_price = 1000 and pc.estimate_hour_cost = 10),
  (select count(*)::int from public.productions where agreement_id = current_setting('t.a1')::uuid),
  'Κάθε Παραγωγή μηνιαίας Συμφωνίας παίρνει την εκτίμηση της Περιόδου'
);
select ok(
  (select count(*) from public.productions where agreement_id = current_setting('t.a1')::uuid) > 0,
  'Η μηνιαία Συμφωνία γέννησε Παραγωγές'
);
select ok(
  (select pc.estimate_shoot_hours = 4 and pc.estimate_edit_hours = 6 and pc.estimate_price = 500 and pc.estimate_hour_cost = 10
     from public.production_costs pc where pc.production_id = current_setting('t.pa3')::uuid),
  'Εφάπαξ: η εκτίμηση είναι το σύνολο της Συμφωνίας'
);
select ok(
  (select pc.estimate_shoot_hours = 0 and pc.estimate_edit_hours = 0 and pc.estimate_price is null
     from public.production_costs pc where pc.production_id = current_setting('t.pi')::uuid),
  'Εσωτερική Παραγωγή: μηδενική εκτίμηση και χωρίς τιμή'
);

-- ───────────── Προτεινόμενες ώρες, γραμμή και ομάδα ─────────────
select is(
  (select (production_cost_view(current_setting('t.p1')::uuid) -> 'actual' ->> 'suggestedShootHours')::numeric),
  8::numeric, 'Προτείνονται Γύρισμα «έγινε» (3 + 2 ώρες) × Συνεργείο (2 + 1 επιβεβαιωμένο)'
);
select ok(
  (select exists (
     select 1 from jsonb_array_elements(public.production_costs_view('rest')) e
      where e ->> 'productionId' = current_setting('t.p1'))),
  'Η P1 είναι στις υπόλοιπες ενόσω δεν έχει παραδοθεί'
);
select is(
  (select (production_cost_view(current_setting('t.p1')::uuid) -> 'estimate' ->> 'cost')::numeric),
  200::numeric, 'Εκτιμώμενο κόστος: (6 + 14) × 10 €'
);

-- ───────────── Πρόσβαση ανά ρόλο και κλειστός πίνακας ─────────────
set local role anon;
select throws_ok($$ select public.production_costs_view('rest') $$, '42501', null, 'Ο ανώνυμος δεν διαβάζει το κόστος');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok($$ select public.production_costs_view('rest') $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν το κόστος');
select ok(not authz.audit_entity_allowed('production_costs'), 'Το Ίχνος κόστους κρύβεται από τις Πωλήσεις');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select throws_ok($$ select public.production_cost_view(current_setting('t.p1')::uuid) $$, '42501', null, 'Ο Πελάτης δεν βλέπει το κόστος');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e7","role":"authenticated"}', true);
select throws_ok(
  $$ select public.production_hours_set(current_setting('t.p1')::uuid, 8, 14, null, true, true) $$,
  '42501', null, 'Η Διαχείριση δεν γράφει ώρες (δεν «Διαχειρίζεται κόστος»)'
);
select throws_ok(
  $$ select public.production_estimate_set(current_setting('t.pi')::uuid, 1, 1, 1) $$,
  '42501', null, 'Η Διαχείριση δεν γράφει εκτίμηση'
);
select is(
  (select production_cost_view(current_setting('t.p1')::uuid) -> 'can' ->> 'edit'), 'false',
  'Η Διαχείριση βλέπει την Παραγωγή χωρίς δικαίωμα επεξεργασίας'
);
set local role authenticated;
select throws_ok($$ select * from public.production_costs $$, '42501', null, 'Ο κλειστός πίνακας δεν διαβάζεται από authenticated');
reset role;

-- ───────────── Ο Ιδιοκτήτης: Παράδοση, επιβεβαίωση και σήματα ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select lives_ok($$ select public.production_deliver(current_setting('t.p1')::uuid, 'Παραδόθηκε') $$, 'Ο Ιδιοκτήτης παραδίδει την P1');
select ok(
  (select exists (
     select 1 from jsonb_array_elements(public.production_costs_view('needs_hours')) e
      where e ->> 'productionId' = current_setting('t.p1'))),
  'Η παραδομένη P1 χωρίς ώρες είναι στο «Θέλουν πραγματικές ώρες»'
);
select is(public.production_needs_hours_count(), 1::bigint, 'Ο μετρητής «Θέλουν ώρες» μετράει την P1');
select lives_ok(
  $$ select public.production_hours_set(current_setting('t.p1')::uuid, 8, 14, null, true, false) $$,
  'Επιβεβαίωση μόνο των ωρών γυρίσματος'
);
select is(
  (select (production_cost_view(current_setting('t.p1')::uuid) ->> 'hoursComplete')::boolean), false,
  'Χωρίς το μοντάζ δεν είναι ολοκληρωμένες οι ώρες'
);
select lives_ok(
  $$ select public.production_hours_set(current_setting('t.p1')::uuid, 8, 14, null, true, true) $$,
  'Επιβεβαίωση γυρίσματος και μοντάζ'
);
select is(
  (select (production_cost_view(current_setting('t.p1')::uuid) ->> 'hoursComplete')::boolean), true,
  'Με τις δύο επιβεβαιώσεις οι ώρες είναι ολοκληρωμένες'
);
select is(
  (select (production_cost_view(current_setting('t.p1')::uuid) -> 'actual' ->> 'cost')::numeric),
  220::numeric, 'Πραγματικό κόστος: (8 + 14) × 10 €'
);
select is(public.production_needs_hours_count(), 0::bigint, 'Με ολοκληρωμένες ώρες η P1 φεύγει από το «Θέλουν ώρες»');

-- Υπέρβαση: 24 ώρες είναι ακριβώς 20% πάνω από 20 και δεν είναι υπέρβαση· 24,1 είναι.
select lives_ok(
  $$ select public.production_hours_set(current_setting('t.p1')::uuid, 8, 16, null, true, true) $$,
  'Ώρες στο όριο της υπέρβασης'
);
select is(
  (select (production_cost_view(current_setting('t.p1')::uuid) -> 'signals' ->> 'overrun')::boolean), false,
  'Ακριβώς 20% δεν είναι υπέρβαση'
);
select lives_ok(
  $$ select public.production_hours_set(current_setting('t.p1')::uuid, 8, 16.1, null, true, true) $$,
  'Ώρες πάνω από το όριο της υπέρβασης'
);
select ok(
  (select exists (
     select 1 from jsonb_array_elements(public.production_costs_view('overrun')) e
      where e ->> 'productionId' = current_setting('t.p1'))),
  'Πάνω από 20% είναι υπέρβαση και η P1 μπαίνει στην ομάδα της'
);

-- Χαμηλό περιθώριο: κόστος 200 και τιμή 1.000 €. Ακριβώς 5,00 δεν είναι χαμηλό· 5,01 είναι.
select lives_ok(
  $$ select public.production_hours_set(current_setting('t.p1')::uuid, 8, 12, null, true, true) $$,
  'Ώρες με κόστος 200 €'
);
select lives_ok(
  $$ select public.cost_save_multipliers(5.00, 5.50, 6.00) $$, 'Ελάχιστος πολλαπλασιαστής 5,00'
);
select is(
  (select (production_cost_view(current_setting('t.p1')::uuid) -> 'signals' ->> 'lowMargin')::boolean), false,
  'Τιμή ίση με κόστος × ελάχιστο δεν είναι χαμηλό περιθώριο'
);
select lives_ok(
  $$ select public.cost_save_multipliers(5.01, 5.50, 6.00) $$, 'Ελάχιστος πολλαπλασιαστής 5,01'
);
select is(
  (select (production_cost_view(current_setting('t.p1')::uuid) -> 'signals' ->> 'lowMargin')::boolean), true,
  'Κάτω από κόστος × ελάχιστο είναι χαμηλό περιθώριο'
);
select lives_ok(
  $$ select public.cost_save_multipliers(1.30, 1.60, 2.00) $$, 'Επιστροφή στους πολλαπλασιαστές 1,30 / 1,60 / 2,00'
);

-- Ποσοστό υπέρβασης: στο 50% τα 24,1 ώρες δεν είναι υπέρβαση.
select lives_ok(
  $$ select public.cost_save_multipliers(1.30, 1.60, 2.00, 50) $$, 'Ορισμός ποσοστού υπέρβασης 50%'
);
select is((select overrun_percent from public.cost_hint()), 50.00::numeric, 'Το ποσοστό υπέρβασης αποθηκεύεται');
select lives_ok(
  $$ select public.production_hours_set(current_setting('t.p1')::uuid, 8, 16.1, null, true, true) $$,
  'Ώρες 24,1 με όριο 50%'
);
select is(
  (select (production_cost_view(current_setting('t.p1')::uuid) -> 'signals' ->> 'overrun')::boolean), false,
  'Με όριο 50% η ίδια Παραγωγή δεν είναι υπέρβαση'
);

-- ───────────── Ανοιχτό Γύρισμα: επιβεβαίωση μπλοκάρεται ─────────────
select throws_ok(
  $$ select public.production_hours_set(current_setting('t.p2')::uuid, 6, 14, null, true, true) $$,
  'P0001', 'Υπάρχει Γύρισμα που δεν έγινε ακόμη', 'Επιβεβαίωση με ανοιχτό Γύρισμα μπλοκάρεται'
);
select throws_ok(
  $$ select public.production_hours_set(current_setting('t.p2')::uuid, null, 14, null, true, false) $$,
  'P0001', 'Γράψε τις ώρες πριν την επιβεβαίωση', 'Η επιβεβαίωση θέλει ώρες'
);
select lives_ok(
  $$ select public.production_hours_set(current_setting('t.p2')::uuid, 6, 14, null, false, false) $$,
  'Πρόχειρες ώρες αποθηκεύονται χωρίς επιβεβαίωση'
);
update public.filmings
   set state = 'cancelled', cancelled_at = now(), cancelled_side = 'team', cancelled_reason = 'Αλλαγή ημερομηνίας'
 where id = '00000000-0000-0000-0000-0000000000a3';
select lives_ok(
  $$ select public.production_hours_set(current_setting('t.p2')::uuid, 6, 14, null, true, true) $$,
  'Μετά το κλείσιμο του Γυρίσματος η επιβεβαίωση περνά'
);
select is(
  (select (production_cost_view(current_setting('t.p2')::uuid) ->> 'hoursComplete')::boolean), true,
  'Η P2 έχει ολοκληρωμένες ώρες'
);

-- ───────────── Εσωτερική Παραγωγή και ακυρώσεις ─────────────
select throws_ok(
  $$ select public.production_estimate_set(current_setting('t.p1')::uuid, 1, 1, 1) $$,
  'P0001', 'Η εκτίμηση γράφεται μόνο σε Εσωτερική Παραγωγή', 'Η εκτίμηση της Συμφωνίας είναι στιγμιότυπο'
);
select lives_ok(
  $$ select public.production_estimate_set(current_setting('t.pi')::uuid, 5, 3, 100) $$,
  'Η Εσωτερική Παραγωγή παίρνει εκτίμηση'
);
select is(
  (select (production_cost_view(current_setting('t.pi')::uuid) -> 'estimate' ->> 'cost')::numeric),
  180::numeric, 'Εσωτερική: (5 + 3) × 10 € + 100 € άμεσο'
);
select ok(
  (select production_cost_view(current_setting('t.pi')::uuid) -> 'estimate' ->> 'price') is null,
  'Εσωτερική: χωρίς τιμή, άρα χωρίς χαμηλό περιθώριο'
);
select lives_ok($$ select public.production_cancel(current_setting('t.pi')::uuid, 'Δοκιμή') $$, 'Ακύρωση της Εσωτερικής');
select ok(
  not (select exists (
     select 1 from jsonb_array_elements(public.production_costs_view('rest')) e
      where e ->> 'productionId' = current_setting('t.pi'))),
  'Οι ακυρωμένες Παραγωγές δεν μπαίνουν στις ομάδες'
);
select throws_ok(
  $$ select public.production_costs_view('άγνωστη') $$, 'P0001', 'Άγνωστη ομάδα κόστους', 'Άγνωστη ομάδα απορρίπτεται'
);

-- ───────────── Ίχνος ─────────────
select is(
  (select count(*)::int from public.audit_log where entity = 'production_costs' and entity_id = current_setting('t.p1') and action = 'insert'),
  1, 'Η γέννηση του στιγμιοτύπου γράφεται στο Ίχνος'
);
select ok(
  (select count(*) > 0 from public.audit_log where entity = 'production_costs' and entity_id = current_setting('t.p1') and action = 'update'),
  'Οι αλλαγές ωρών γράφονται στο Ίχνος'
);

select * from finish();
rollback;
