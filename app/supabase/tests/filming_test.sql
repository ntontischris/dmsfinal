-- Γυρίσματα (E1–E4, E6, E7): μεταβάσεις, Παροχές ανά τρόπο μέτρησης, καύση, Συνεργείο, Εξοπλισμός, Κανόνες, Εύρος,
-- Ίχνος (κεφ. 3, ADR 0007, 0010, 0015). Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή.
-- Ώρες: όλα σχετικά με τη σημερινή μέρα (Ώρα Ελλάδας), ώστε το τεστ να περνά οποιαδήποτε μέρα τρέξει.
begin;
select plan(208);

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης · e2 Παραγωγή (Υπεύθυνος των Παραγωγών της Συμφωνίας Α) · e3 Πωλήσεις (Υπεύθυνος του Πελάτη f1)
-- e4 Λογιστής (χωρίς Γυρίσματα) · e5 Διαχείριση (όλα) · e6 Πελάτης f1 (σύνδεση με τον Πελάτη μέσω της αντικατάστασης παρακάτω)
-- e7 Παραγωγή (Μέλος του Συνεργείου)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'manager@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'client@example.com'),
  ('00000000-0000-0000-0000-0000000000e7', 'crew@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'Κώστας', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'Νίκος', 'manager@example.com'),
  ('00000000-0000-0000-0000-0000000000e7', 'Μαρία', 'crew@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e2', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000e3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000e4', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000e5', 'Διαχείριση'),
    ('00000000-0000-0000-0000-0000000000e7', 'Παραγωγή')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Αντικατάσταση σύνδεσης Πελάτη (μόνο μέσα στη συναλλαγή): ο e6 είναι Πελάτης f1, οι υπόλοιποι δεν έχουν σύνδεση.
create or replace function authz.client_user_client_id() returns uuid
language sql stable security definer set search_path = ''
as $$
  select case when (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub') = '00000000-0000-0000-0000-0000000000e6'
              then '00000000-0000-0000-0000-0000000000f1'::uuid end;
$$;

-- Πελάτες: f1 (Υπεύθυνος η Άννα, e3), f2 (Υπεύθυνος ο Νίκος, e5).
insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'Κυψέλη Καφέ', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-0000000000f2', 'Ταβέρνα Αρμύρα', '', 'Ναύπλιο', null, 'Κώστας Αρμύρας', 'armyra@example.com', '27520 33333', '00000000-0000-0000-0000-0000000000e5');

-- Ευκαιρίες: c1 (A, μηνιαία, f1) · c2 (B, εφάπαξ, f1) · c3 (C, εφάπαξ, f2) · c4 (D, μηνιαία με παλιά έναρξη, f1)
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select o.id::uuid, o.client::uuid, o.title, (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'), o.manager::uuid, 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3
  from (values
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'Μηνιαίο Α', '00000000-0000-0000-0000-0000000000e3'),
    ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000f1', 'Εφάπαξ Β', '00000000-0000-0000-0000-0000000000e3'),
    ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000f2', 'Εφάπαξ Γ', '00000000-0000-0000-0000-0000000000e5'),
    ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000f1', 'Παλιό Δ', '00000000-0000-0000-0000-0000000000e3')
  ) as o (id, client, title, manager);

-- Κατάλογος: μηνιαίο πακέτο (shoot 2, reel 8), εφάπαξ πακέτο (shoot 1), Υπηρεσία reel (reel 1), Υπηρεσία βίντεο (video 3).
insert into public.catalogue_items (id, kind, billing, name, name_en, unit, retired_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'package', 'monthly', 'Μηνιαίο πακέτο (τεστ)', 'Monthly (test)', '', null),
  ('00000000-0000-0000-0000-0000000000d2', 'package', 'one_off', 'Εφάπαξ πακέτο (τεστ)', 'One-off (test)', '', null),
  ('00000000-0000-0000-0000-0000000000d3', 'service', null, 'Reel (τεστ)', 'Reel (test)', 'ανά reel', null),
  ('00000000-0000-0000-0000-0000000000d4', 'service', null, 'Βίντεο (τεστ)', 'Video (test)', 'ανά βίντεο', null);
insert into public.catalogue_item_amounts (item_id, price) values
  ('00000000-0000-0000-0000-0000000000d1', 1000), ('00000000-0000-0000-0000-0000000000d2', 500),
  ('00000000-0000-0000-0000-0000000000d3', 100), ('00000000-0000-0000-0000-0000000000d4', 100);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost) values
  ('00000000-0000-0000-0000-0000000000d1', 6, 14, 0), ('00000000-0000-0000-0000-0000000000d2', 4, 6, 0),
  ('00000000-0000-0000-0000-0000000000d3', 1, 3, 0), ('00000000-0000-0000-0000-0000000000d4', 1, 3, 0);
insert into public.catalogue_item_provisions (item_id, kind_id, quantity)
select p.item::uuid, k.id, p.qty
  from (values
    ('00000000-0000-0000-0000-0000000000d1', 'shoot', 2), ('00000000-0000-0000-0000-0000000000d1', 'reel', 8),
    ('00000000-0000-0000-0000-0000000000d2', 'shoot', 1), ('00000000-0000-0000-0000-0000000000d3', 'reel', 1),
    ('00000000-0000-0000-0000-0000000000d4', 'video', 3)
  ) as p (item, code, qty)
  join public.provision_kinds k on k.code = p.code;
insert into public.cost_months (month, expenses_total, productive_hours)
values (date_trunc('month', now() at time zone 'Europe/Athens')::date, 8800, 220);

-- Τρόποι μέτρησης: shoot = ανά Γύρισμα (seed), reel = ανά ώρα, video = ανά μέρα.
update public.provision_kinds set measure = 'per_hour', default_hours = null where code = 'reel';
update public.provision_kinds set measure = 'per_day', default_hours = null where code = 'video';

-- Βοηθητικά των τεστ (ζουν μόνο μέσα στη συναλλαγή).
-- Ώρα Ελλάδας: η μέρα «σήμερα + n» στις «hh:mm».
create function public.t_at(p_days integer, p_time time) returns timestamptz
language sql stable
as $$ select (((now() at time zone 'Europe/Athens')::date + p_days) + p_time) at time zone 'Europe/Athens'; $$;
-- Η δεύτερη μέρα της Περιόδου n της Συμφωνίας, στις 10:00.
create function public.t_period_day(p_agreement uuid, p_n integer) returns timestamptz
language sql stable security definer
as $$
  select ((pe.starts + 1) + time '10:00') at time zone 'Europe/Athens'
    from public.agreement_periods pe where pe.agreement_id = p_agreement and pe.n = p_n;
$$;
-- Κωδικός υπογραφής από τα εξερχόμενα (για Σύνδεσμο)· δεν χρησιμοποιείται εδώ, μένει για ομοιομορφία.
create function public.t_pk(p_code text) returns uuid
language sql stable
as $$ select k.id from public.provision_kinds k where k.code = p_code; $$;

-- Συμφωνίες (ως διαχειριστής, για τα RPC υπογραφής)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select set_config('t.shoot', public.t_pk('shoot')::text, true);
select set_config('t.reel', public.t_pk('reel')::text, true);
select set_config('t.video', public.t_pk('video')::text, true);
select set_config('t.podcast', public.t_pk('podcast_episode')::text, true);

-- A: μηνιαία, f1, τρεις μήνες, υπογραφή εκτός συστήματος με έναρξη σήμερα. Όροι: ειδοποίηση 24 ώρες, ακύρωση 48 ώρες.
select set_config('t.a', public.agreement_create('00000000-0000-0000-0000-0000000000c1', 'monthly', 'Μηνιαίο Α')::text, true);
select public.agreement_update_basics(current_setting('t.a')::uuid, 'Μηνιαίο Α', 'el', (now() at time zone 'Europe/Athens')::date + 5, (now() at time zone 'Europe/Athens')::date + 5, 3);
select public.agreement_update_terms(current_setting('t.a')::uuid, 30, 'next_period', 0, 'new_opportunity', 0, 24, 48, true, true);
select public.agreement_add_catalogue_line(current_setting('t.a')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_add_catalogue_line(current_setting('t.a')::uuid, '00000000-0000-0000-0000-0000000000d3', 4);
select public.agreement_add_catalogue_line(current_setting('t.a')::uuid, '00000000-0000-0000-0000-0000000000d4', 1);
select public.agreement_set_recipients(current_setting('t.a')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a')::uuid, (now() at time zone 'Europe/Athens')::date, 'Μαρία Παπαδάκη', (now() at time zone 'Europe/Athens')::date, 'contract-a.pdf');

-- B: εφάπαξ, f1, με μόνο shoot 1 (δεν έχει βίντεο). C: εφάπαξ, f2 (άλλος Πελάτης). D: μηνιαία με έναρξη πριν τον μήνα (used_provisions).
select set_config('t.b', public.agreement_create('00000000-0000-0000-0000-0000000000c2', 'one_off', 'Εφάπαξ Β')::text, true);
select public.agreement_update_basics(current_setting('t.b')::uuid, 'Εφάπαξ Β', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, null);
select public.agreement_add_catalogue_line(current_setting('t.b')::uuid, '00000000-0000-0000-0000-0000000000d2', 1);
select public.agreement_add_catalogue_line(current_setting('t.b')::uuid, '00000000-0000-0000-0000-0000000000d3', 4);
select public.agreement_set_recipients(current_setting('t.b')::uuid, '[{"name":"Νικόλαος","email":"nikos@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.b')::uuid, (now() at time zone 'Europe/Athens')::date, 'Νικόλαος', (now() at time zone 'Europe/Athens')::date, 'b.pdf');

select set_config('t.c', public.agreement_create('00000000-0000-0000-0000-0000000000c3', 'one_off', 'Εφάπαξ Γ')::text, true);
select public.agreement_update_basics(current_setting('t.c')::uuid, 'Εφάπαξ Γ', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, null);
select public.agreement_add_catalogue_line(current_setting('t.c')::uuid, '00000000-0000-0000-0000-0000000000d2', 1);
select public.agreement_set_recipients(current_setting('t.c')::uuid, '[{"name":"Κώστας Αρμύρας","email":"armyra@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.c')::uuid, (now() at time zone 'Europe/Athens')::date, 'Κώστας Αρμύρας', (now() at time zone 'Europe/Athens')::date, 'c.pdf');

select set_config('t.d', public.agreement_create('00000000-0000-0000-0000-0000000000c4', 'monthly', 'Παλιό Δ')::text, true);
select public.agreement_update_basics(current_setting('t.d')::uuid, 'Παλιό Δ', 'el', (now() at time zone 'Europe/Athens')::date + 5, (now() at time zone 'Europe/Athens')::date + 5, 3);
select public.agreement_add_catalogue_line(current_setting('t.d')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_set_recipients(current_setting('t.d')::uuid, '[{"name":"Χρήστος","email":"christos@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(
  current_setting('t.d')::uuid, (now() at time zone 'Europe/Athens')::date, 'Χρήστος', date_trunc('month', now() at time zone 'Europe/Athens')::date - 10,
  'd.pdf', jsonb_build_array(jsonb_build_object('kind_id', current_setting('t.shoot'), 'used', 1))
);

-- Παραγωγές και Περίοδοι της Α (η Άννα δεν έχει Δικαίωμα Παραγωγών, άρα ο Υπεύθυνος είναι κενός· τον ορίζουμε εδώ).
update public.productions set owner_id = '00000000-0000-0000-0000-0000000000e2' where agreement_id = current_setting('t.a')::uuid;
select set_config('t.p1', (select pe.id::text from public.agreement_periods pe where pe.agreement_id = current_setting('t.a')::uuid and pe.n = 1), true);
select set_config('t.p2', (select pe.id::text from public.agreement_periods pe where pe.agreement_id = current_setting('t.a')::uuid and pe.n = 2), true);
select set_config('t.p3', (select pe.id::text from public.agreement_periods pe where pe.agreement_id = current_setting('t.a')::uuid and pe.n = 3), true);
select set_config('t.pa1', (select pr.id::text from public.productions pr where pr.period_id = current_setting('t.p1')::uuid), true);
select set_config('t.pa2', (select pr.id::text from public.productions pr where pr.period_id = current_setting('t.p2')::uuid), true);
select set_config('t.pa_last', (select pr.id::text from public.productions pr join public.agreement_periods pe on pe.id = pr.period_id
  where pe.agreement_id = current_setting('t.a')::uuid order by pe.n desc limit 1), true);
select set_config('t.pb', (select pr.id::text from public.productions pr where pr.agreement_id = current_setting('t.b')::uuid), true);
select set_config('t.pc', (select pr.id::text from public.productions pr where pr.agreement_id = current_setting('t.c')::uuid), true);
select set_config('t.last_end', (select max(pe.ends)::text from public.agreement_periods pe where pe.agreement_id = current_setting('t.a')::uuid), true);

-- Εσωτερική Παραγωγή για τα τεστ της λίστας (ο Ιδιοκτήτης φτιάχνει).
select set_config('t.pi', public.production_create_internal('Εσωτερική τεστ', null)::text, true);

-- Κατηγορία Κάμερες (seed) για τον Εξοπλισμό.
select set_config('t.cat_cam', (select c.id::text from public.equipment_categories c where c.name = 'Κάμερες'), true);

-- ───────────── Δομή, κλειστοί πίνακες και Ίχνος ─────────────
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname in ('filmings', 'filming_crew', 'filming_equipment', 'crew_templates', 'crew_template_members', 'filming_settings')),
  6, 'RLS ενεργό στους έξι νέους πίνακες'
);
select is(
  (select count(*)::int from pg_policies where schemaname = 'public'
     and tablename in ('filmings', 'filming_crew', 'filming_equipment', 'crew_templates', 'crew_template_members', 'filming_settings')),
  0, 'Κανένα policy: οι πίνακες είναι κλειστοί'
);
select ok(
  authz.audit_entity_allowed('filmings') and authz.audit_entity_allowed('filming_crew') and authz.audit_entity_allowed('filming_equipment')
  and authz.audit_entity_allowed('crew_templates') and authz.audit_entity_allowed('crew_template_members') and authz.audit_entity_allowed('filming_settings'),
  'Το Ίχνος καταγράφει τα έξι νέα Γυρίσματα'
);
select ok(not authz.audit_entity_allowed('filming_money'), 'Η άγνωστη οντότητα δεν καταγράφεται (default deny)');
select is(authz.filming_slot_open(now(), 1), true, 'Το σημείο σύνδεσης ωραρίου (C2) είναι ανοιχτό για τώρα');
select is(authz.user_blocked_at(gen_random_uuid(), now(), now()), false, 'Το σημείο σύνδεσης κλεισμένου χρόνου (C2) δεν μπλοκάρει ακόμα');
select is(authz.production_has_work(current_setting('t.pb')::uuid), false, 'Η Παραγωγή χωρίς Γυρίσματα δεν έχει δουλειά');
select is(authz.equipment_item_reserved(gen_random_uuid()), false, 'Χωρίς Γυρίσματα κανένα αντικείμενο δεν είναι δεσμευμένο');
select is(authz.period_provision_used(gen_random_uuid(), gen_random_uuid()), 0::numeric, 'Ανύπαρκτη Περίοδος: μηδέν καταναλωμένες Παροχές');
select is(authz.period_provision_reserved(gen_random_uuid(), gen_random_uuid()), 0::numeric, 'Ανύπαρκτη Περίοδος: μηδέν δεσμευμένες Παροχές');

-- ───────────── Κράτηση Πελάτη (E4, c.book) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
set local role authenticated;

select throws_ok(
  $$ select public.filming_book(current_setting('t.a')::uuid, now() + interval '3 hours', 2, current_setting('t.shoot')::uuid, null, null) $$,
  'P0001', null, 'Η κράτηση χωρίς την ελάχιστη προειδοποίηση απορρίπτεται'
);
select throws_ok(
  $$ select public.filming_book(current_setting('t.a')::uuid, public.t_at(20, time '10:00'), 0.3, current_setting('t.shoot')::uuid, null, null) $$,
  'P0001', null, 'Διάρκεια που δεν είναι μισή ώρα απορρίπτεται'
);
select throws_ok(
  $$ select public.filming_book(current_setting('t.a')::uuid, public.t_at(20, time '10:00'), 13, current_setting('t.shoot')::uuid, null, null) $$,
  'P0001', null, 'Διάρκεια πάνω από 12 ώρες απορρίπτεται'
);
select throws_ok(
  $$ select public.filming_book(current_setting('t.a')::uuid, public.t_at(61, time '10:00'), 2, current_setting('t.shoot')::uuid, null, null) $$,
  'P0001', null, 'Μέρα πέρα από τον ορίζοντα (60) απορρίπτεται'
);
select throws_ok(
  $$ select public.filming_book(current_setting('t.a')::uuid, public.t_at(20, time '10:00'), 2, null, null, null) $$,
  'P0001', null, 'Κράτηση χωρίς Παροχή απορρίπτεται'
);
select throws_ok(
  $$ select public.filming_book(current_setting('t.a')::uuid, public.t_at(20, time '10:00'), 2, current_setting('t.podcast')::uuid, null, null) $$,
  'P0001', null, 'Είδος που δεν μετράει Γυρίσματα απορρίπτεται'
);
select throws_ok(
  $$ select public.filming_book(current_setting('t.c')::uuid, public.t_at(20, time '10:00'), 2, current_setting('t.shoot')::uuid, null, null) $$,
  '42501', null, 'Ο Πελάτης δεν κλείνει σε Συμφωνία άλλου Πελάτη'
);
select throws_ok(
  $$ select public.filming_book(gen_random_uuid(), public.t_at(20, time '10:00'), 2, current_setting('t.shoot')::uuid, null, null) $$,
  '42501', null, 'Ο Πελάτης σε ανύπαρκτη Συμφωνία παίρνει 42501 (χωρίς διαρροή)'
);

select set_config('t.k1', public.filming_book(current_setting('t.a')::uuid, public.t_at(20, time '10:00'), 2, current_setting('t.shoot')::uuid, 'Αθήνα', 'Κάλυψη εκδήλωσης')::text, true);
select set_config('t.k2', public.filming_book(current_setting('t.a')::uuid, public.t_at(21, time '10:00'), 2, current_setting('t.shoot')::uuid, null, null)::text, true);
select throws_ok(
  $$ select public.filming_book(current_setting('t.a')::uuid, public.t_at(22, time '10:00'), 2, current_setting('t.shoot')::uuid, null, null) $$,
  'P0001', null, 'Τελείωσε η Παροχή της Περιόδου: ο Πελάτης δεν κλείνει μόνος του'
);
select is((select public.filmings_view('pending') -> 0 ->> 'state'), 'pending', 'Η κράτηση Πελάτη αναμένει έγκριση όταν το θέλει ο Κανόνας');
select set_config('t.k4', public.filming_book(current_setting('t.a')::uuid, public.t_period_day(current_setting('t.a')::uuid, 2), 2, current_setting('t.shoot')::uuid, null, null)::text, true);

-- Περίοδος που δεν άνοιξε: ο ορίζοντας προσωρινά 120 μέρες (μόνο για αυτό το τεστ).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select lives_ok($$ select public.filming_settings_save('{"horizonDays": 120}'::jsonb) $$, 'Ο Διαχειριστής ανεβάζει τον ορίζοντα για το τεστ της Περιόδου');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select throws_ok(
  $$ select public.filming_book(current_setting('t.a')::uuid, public.t_period_day(current_setting('t.a')::uuid, 3), 2, current_setting('t.shoot')::uuid, null, null) $$,
  'P0001', null, 'Περίοδος που δεν άνοιξε δεν κλείνεται (η τρίτη, πίσω από την επόμενη)'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select lives_ok($$ select public.filming_settings_save('{"horizonDays": 60}'::jsonb) $$, 'Ο ορίζοντας επιστρέφει στις 60 μέρες');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);

-- Εφάπαξ Β: μία Παροχή (shoot 1). Η δεύτερη κράτηση δεν γίνεται· είδος που η Συμφωνία δεν δίνει απορρίπτεται.
select set_config('t.bk1', public.filming_book(current_setting('t.b')::uuid, public.t_at(4, time '10:00'), 1, current_setting('t.shoot')::uuid, null, null)::text, true);
select throws_ok(
  $$ select public.filming_book(current_setting('t.b')::uuid, public.t_at(5, time '10:00'), 1, current_setting('t.shoot')::uuid, null, null) $$,
  'P0001', null, 'Εφάπαξ: η Παροχή που τελείωσε δεν ξανακλείνει'
);
select throws_ok(
  $$ select public.filming_book(current_setting('t.b')::uuid, public.t_at(6, time '10:00'), 1, current_setting('t.video')::uuid, null, null) $$,
  'P0001', null, 'Εφάπαξ: είδος που η Συμφωνία δεν δίνει απορρίπτεται'
);
select is((select jsonb_array_length(public.filming_new_options())), 3, 'Ο Πελάτης βλέπει τις τρεις Συμφωνίες του (Α, Β, Δ) και καμία άλλη');

-- ───────────── Κράτηση από την ομάδα και εξουσιοδοτήσεις ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select set_config('t.x_extra', public.filming_create(current_setting('t.a')::uuid, public.t_at(6, time '10:00'), 1, current_setting('t.shoot')::uuid, null, 'Κλείσιμο ομάδας')::text, true);
select is((select public.filming_view(current_setting('t.x_extra')::uuid) ->> 'isExtra'), 'true', 'Γύρισμα της ομάδας μετά τη λήξη της Παροχής είναι έξτρα (προειδοποίηση, όχι μπλοκ)');
select set_config('t.x1', public.filming_create(current_setting('t.a')::uuid, public.t_at(5, time '10:00'), 2, current_setting('t.reel')::uuid, 'Θεσσαλονίκη', 'Σύνοψη')::text, true);
select is((select public.filming_view(current_setting('t.x1')::uuid) ->> 'isExtra'), 'false', 'Γύρισμα με Παροχή που υπάρχει δεν είναι έξτρα');
select set_config('t.x2', public.filming_create(current_setting('t.a')::uuid, public.t_at(7, time '10:00'), 1, current_setting('t.reel')::uuid, null, null)::text, true);
select set_config('t.y1', public.filming_create(current_setting('t.c')::uuid, public.t_at(4, time '10:00'), 1, current_setting('t.shoot')::uuid, null, null)::text, true);
select set_config('t.bx1', public.filming_create(current_setting('t.b')::uuid, public.t_at(4, time '15:00'), 1, current_setting('t.shoot')::uuid, null, null)::text, true);
select is((select public.filming_view(current_setting('t.bx1')::uuid) ->> 'isExtra'), 'true', 'Εφάπαξ: η ομάδα κλείνει πάνω από την Παροχή και το Γύρισμα είναι έξτρα');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok(
  $$ select public.filming_create(current_setting('t.c')::uuid, public.t_at(9, time '10:00'), 1, current_setting('t.shoot')::uuid, null, null) $$,
  '42501', null, 'Οι Πωλήσεις δεν κλείνουν σε Πελάτη άλλου Υπευθύνου'
);
select throws_ok(
  $$ select public.filming_create_internal(current_setting('t.pi')::uuid, public.t_at(9, time '10:00'), 1, null, null) $$,
  '42501', null, 'Οι Πωλήσεις δεν κλείνουν Γύρισμα εσωτερικής Παραγωγής'
);
select set_config('t.x9', public.filming_create(current_setting('t.a')::uuid, public.t_at(9, time '11:00'), 1, current_setting('t.reel')::uuid, null, null)::text, true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select throws_ok(
  $$ select public.filming_create(current_setting('t.a')::uuid, public.t_at(9, time '10:00'), 1, current_setting('t.reel')::uuid, null, null) $$,
  '42501', null, 'Η Παραγωγή δεν φτιάχνει Γύρισμα'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
select throws_ok($$ select public.filmings_view('open') $$, '42501', null, 'Ο Λογιστής δεν βλέπει Γυρίσματα');

-- ───────────── Έγκριση, απόρριψη, ακύρωση ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok($$ select public.filming_approve(current_setting('t.k4')::uuid) $$, '42501', null, 'Οι Πωλήσεις δεν εγκρίνουν');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select lives_ok($$ select public.filming_approve(current_setting('t.k1')::uuid) $$, 'Η ομάδα εγκρίνει την κράτηση του Πελάτη');
select is((select public.filming_view(current_setting('t.k1')::uuid) ->> 'state'), 'scheduled', 'Η εγκεκριμένη κράτηση είναι προγραμματισμένη');
select throws_ok($$ select public.filming_approve(current_setting('t.k1')::uuid) $$, 'P0001', null, 'Δεν εγκρίνεται δεύτερη φορά');
select throws_ok($$ select public.filming_reject(current_setting('t.k2')::uuid, '   ') $$, 'P0001', null, 'Η απόρριψη χωρίς λόγο απορρίπτεται');
select lives_ok($$ select public.filming_reject(current_setting('t.k2')::uuid, 'Δεν χωράει στο πρόγραμμα') $$, 'Η απόρριψη με λόγο ελευθερώνει την Παροχή');
select throws_ok($$ select public.filming_reject(current_setting('t.k1')::uuid, 'Λάθος') $$, 'P0001', null, 'Προγραμματισμένη κράτηση δεν απορρίπτεται');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select set_config('t.k3', public.filming_book(current_setting('t.a')::uuid, public.t_at(22, time '10:00'), 2, current_setting('t.shoot')::uuid, null, null)::text, true);
select lives_ok($$ select public.filming_client_cancel(current_setting('t.k3')::uuid, null) $$, 'Ο Πελάτης ακυρώνει κράτηση που αναμένει έγκριση, όποτε θέλει');
select is((select public.filming_view(current_setting('t.k3')::uuid) ->> 'state'), 'cancelled', 'Η ακυρωμένη κράτηση είναι ακυρωμένη');
select is((select public.filming_view(current_setting('t.k3')::uuid) ->> 'burned'), 'false', 'Η ακύρωση του Πελάτη πριν την έγκριση δεν καίει Παροχή');
select throws_ok($$ select public.filming_client_cancel(current_setting('t.k3')::uuid, null) $$, 'P0001', null, 'Ο Πελάτης δεν ακυρώνει δύο φορές το ίδιο Γύρισμα');
select lives_ok($$ select public.filming_client_cancel(current_setting('t.x2')::uuid, 'Δεν χρειάζεται') $$, 'Ο Πελάτης ακυρώνει προγραμματισμένο Γύρισμα πριν από το Όριο ακύρωσης');
select throws_ok($$ select public.filming_request_cancel(current_setting('t.k1')::uuid, 'Θέλω ακύρωση') $$, 'P0001', null, 'Πριν από το Όριο ο Πελάτης ακυρώνει μόνος του, χωρίς αίτημα');
select throws_ok($$ select public.filming_client_cancel(current_setting('t.y1')::uuid, null) $$, '42501', null, 'Ο Πελάτης δεν ακυρώνει Γύρισμα άλλου Πελάτη');

-- Γύρισμα μέσα στις επόμενες 10 ώρες: μετά το Όριο (48 ώρες).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select set_config('t.x3', public.filming_create(current_setting('t.a')::uuid, now() + interval '10 hours', 1, current_setting('t.reel')::uuid, null, null)::text, true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select throws_ok($$ select public.filming_client_cancel(current_setting('t.x3')::uuid, null) $$, 'P0001', null, 'Μετά το Όριο ο Πελάτης δεν ακυρώνει μόνος του');
select lives_ok($$ select public.filming_request_cancel(current_setting('t.x3')::uuid, 'Αλλαγή ημερομηνίας') $$, 'Μετά το Όριο ο Πελάτης στέλνει αίτημα ακύρωσης');
select throws_ok($$ select public.filming_request_cancel(current_setting('t.x3')::uuid, null) $$, 'P0001', null, 'Ένα αίτημα ακύρωσης κάθε φορά');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select throws_ok($$ select public.filming_decide_cancel_request(current_setting('t.k1')::uuid, true, null) $$, 'P0001', null, 'Δεν αποφασίζεται αίτημα που δεν υπάρχει');
select lives_ok($$ select public.filming_decide_cancel_request(current_setting('t.x3')::uuid, true, null) $$, 'Η ομάδα δέχεται το αίτημα: ακύρωση του Πελάτη');
select is((select public.filming_view(current_setting('t.x3')::uuid) ->> 'burned'), 'true', 'Αίτημα μετά το Όριο καίει Παροχή όταν το ορίζουν οι Όροι');
select throws_ok($$ select public.filming_decide_cancel_request(current_setting('t.x3')::uuid, true, null) $$, 'P0001', null, 'Κλεισμένο αίτημα δεν αποφασίζεται ξανά');

select set_config('t.x5', public.filming_create(current_setting('t.a')::uuid, now() + interval '12 hours', 1, current_setting('t.reel')::uuid, null, null)::text, true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select lives_ok($$ select public.filming_request_cancel(current_setting('t.x5')::uuid, null) $$, 'Δεύτερο αίτημα μετά το Όριο, για τη σειρά της απόρριψης');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select lives_ok($$ select public.filming_decide_cancel_request(current_setting('t.x5')::uuid, false, 'Θα γίνει κανονικά') $$, 'Η απόρριψη του αιτήματος αφήνει το Γύρισμα προγραμματισμένο');
select is((select public.filming_view(current_setting('t.x5')::uuid) ->> 'state'), 'scheduled', 'Μετά την απόρριψη του αιτήματος το Γύρισμα παραμένει προγραμματισμένο');

-- Η αργή ακύρωση δεν καίει Παροχή όταν οι Όροι το λένε αλλιώς (ορίζεται με αντικατάσταση μόνο για το τεστ).
reset role;
set local session_replication_role = 'replica';
update public.agreements set late_cancel_burns = false where id = current_setting('t.a')::uuid;
set local session_replication_role = 'origin';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select set_config('t.x6', public.filming_create(current_setting('t.a')::uuid, now() + interval '14 hours', 1, current_setting('t.reel')::uuid, null, null)::text, true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select lives_ok($$ select public.filming_request_cancel(current_setting('t.x6')::uuid, null) $$, 'Αίτημα για Γύρισμα όταν οι Όροι δεν καίνε στην αργή ακύρωση');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select lives_ok($$ select public.filming_decide_cancel_request(current_setting('t.x6')::uuid, true, null) $$, 'Η ομάδα δέχεται το αίτημα χωρίς καύση');
select is((select public.filming_view(current_setting('t.x6')::uuid) ->> 'burned'), 'false', 'Με τους Όρους που δεν καίνε, η αποδοχή δεν καίει Παροχή');

-- Ακύρωση από την ομάδα: πάντα επιστρέφει η Παροχή. Ο λόγος είναι υποχρεωτικός.
select set_config('t.x8', public.filming_create(current_setting('t.a')::uuid, public.t_at(8, time '10:00'), 1, current_setting('t.reel')::uuid, null, null)::text, true);
select throws_ok($$ select public.filming_cancel(current_setting('t.x8')::uuid, '') $$, 'P0001', null, 'Η ακύρωση από την ομάδα χωρίς λόγο απορρίπτεται');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select throws_ok($$ select public.filming_cancel(current_setting('t.x8')::uuid, 'Δεν θέλω') $$, '42501', null, 'Η Παραγωγή δεν ακυρώνει (δεν έχει δικαίωμα κράτησης)');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select lives_ok($$ select public.filming_cancel(current_setting('t.x8')::uuid, 'Αλλαγή προγράμματος') $$, 'Η ομάδα ακυρώνει με λόγο');
select is((select public.filming_view(current_setting('t.x8')::uuid) ->> 'cancelledSide'), 'team', 'Η ακύρωση της ομάδας έχει πλευρά «ομάδα»');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select lives_ok($$ select public.filming_cancel(current_setting('t.x9')::uuid, 'Ακύρωση από τον πελάτη') $$, 'Οι Πωλήσεις ακυρώνουν Γύρισμα του Πελάτη τους');

-- ───────────── Υπόλοιπο και Τρόποι μέτρησης (Π3, Γ4) ─────────────
reset role;
select is(
  (select b.used from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.shoot')::uuid) b), 0::numeric,
  'Ανά Γύρισμα: τα ακυρωμένα και τα έξτρα δεν καταναλώνουν'
);
select is(
  (select b.reserved from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.shoot')::uuid) b), 1::numeric,
  'Ανά Γύρισμα: η κράτηση που αναμένει ή είναι προγραμματισμένη δεσμεύει ένα'
);
select is(
  (select b.balance from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.shoot')::uuid) b), 1::numeric,
  'Ανά Γύρισμα: το υπόλοιπο είναι δοσμένες μείον δεσμευμένες'
);
select is(
  (select b.reserved from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.reel')::uuid) b), 3::numeric,
  'Ανά ώρα: δεσμευμένες ώρες (X1 2 ώρες, X5 1 ώρα)'
);
set local role authenticated;

-- ───────────── Μετάθεση, εκτός Περιόδου ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select lives_ok($$ select public.filming_reschedule(current_setting('t.k1')::uuid, public.t_period_day(current_setting('t.a')::uuid, 2), 2) $$, 'Η ομάδα μετατίθεται Γύρισμα στην επόμενη Περίοδο');
select is((select public.filming_view(current_setting('t.k1')::uuid) -> 'period' ->> 'n'), '2', 'Μετά τη μετάθεση το Γύρισμα είναι στην Περίοδο 2');
select is((select public.filming_view(current_setting('t.k1')::uuid) ->> 'isExtra'), 'false', 'Η μετάθεση σε Περίοδο με Παροχή δεν το κάνει έξτρα');
select throws_ok($$ select public.filming_reschedule(current_setting('t.k1')::uuid, public.t_at(400, time '10:00'), 2) $$, 'P0001', null, 'Μετάθεση σε μέρα εκτός Περιόδων απορρίπτεται');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select lives_ok($$ select public.filming_reschedule(current_setting('t.x1')::uuid, public.t_at(5, time '11:00'), 2) $$, 'Οι Πωλήσεις μετατίθεται Γύρισμα του Πελάτη τους');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select throws_ok($$ select public.filming_reschedule(current_setting('t.x1')::uuid, public.t_at(5, time '12:00'), 2) $$, '42501', null, 'Η Παραγωγή δεν μετατίθεται Γύρισμα χωρίς δικαίωμα κράτησης');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select throws_ok(
  $$ select public.filming_create(current_setting('t.a')::uuid, ((current_setting('t.last_end')::date + 5) + time '10:00') at time zone 'Europe/Athens', 1, current_setting('t.shoot')::uuid, null, null) $$,
  'P0001', null, 'Γύρισμα εκτός Περιόδου δεν κλείνεται όταν ο Κανόνας το απαγορεύει'
);
select lives_ok($$ select public.filming_settings_save('{"allowOutsidePeriod": true}'::jsonb) $$, 'Ο Διαχειριστής επιτρέπει κράτηση εκτός Περιόδου');
select set_config('t.z1', public.filming_create(current_setting('t.a')::uuid, ((current_setting('t.last_end')::date + 5) + time '10:00') at time zone 'Europe/Athens', 1, current_setting('t.shoot')::uuid, null, null)::text, true);
select is((select public.filming_view(current_setting('t.z1')::uuid) ->> 'isExtra'), 'true', 'Γύρισμα εκτός Περιόδου είναι έξτρα');
select is((select public.filming_view(current_setting('t.z1')::uuid) ->> 'period'), null, 'Γύρισμα εκτός Περιόδου δεν έχει Περίοδο');
select lives_ok($$ select public.filming_settings_save('{"allowOutsidePeriod": false}'::jsonb) $$, 'Ο Κανόνας «εκτός Περιόδου» επιστρέφει στο «όχι»');

-- ───────────── Έκβαση: έγινε, δεν έγινε, αναίρεση (Γ3, Γ4) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select throws_ok($$ select public.filming_mark_done(current_setting('t.k1')::uuid, 0) $$, 'P0001', null, 'Το «έγινε» θέλει πραγματικές ώρες μεγαλύτερες από μηδέν');
select lives_ok($$ select public.filming_mark_done(current_setting('t.k1')::uuid, 1.5) $$, 'Η Παραγωγή της Περιόδου σημειώνει «έγινε» με πραγματικές ώρες');
select is((select public.filming_view(current_setting('t.k1')::uuid) ->> 'actualHours'), '1.5', 'Το «έγινε» καταγράφει τις πραγματικές ώρες');
select throws_ok($$ select public.filming_mark_done(current_setting('t.k1')::uuid, 1.5) $$, 'P0001', null, 'Το «έγινε» δεν σημειώνεται δεύτερη φορά');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
select throws_ok($$ select public.filming_mark_done(current_setting('t.x1')::uuid, 1) $$, '42501', null, 'Ο Λογιστής δεν σημειώνει έκβαση');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select throws_ok($$ select public.filming_mark_done(current_setting('t.y1')::uuid, 1) $$, '42501', null, 'Η Παραγωγή δεν σημειώνει Γύρισμα άλλου Υπευθύνου');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select lives_ok($$ select public.filming_mark_no_show(current_setting('t.x1')::uuid) $$, 'Η ομάδα σημειώνει «δεν έγινε»');
select is((select public.filming_view(current_setting('t.x1')::uuid) ->> 'burned'), 'true', 'Το «δεν έγινε» καίει Παροχή όταν το ορίζουν οι Όροι');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok($$ select public.filming_undo_outcome(current_setting('t.x1')::uuid, 'Λάθος') $$, '42501', null, 'Οι Πωλήσεις δεν αναιρούν έκβαση');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select throws_ok($$ select public.filming_undo_outcome(current_setting('t.x1')::uuid, '') $$, 'P0001', null, 'Η αναίρεση θέλει λόγο');
select lives_ok($$ select public.filming_undo_outcome(current_setting('t.x1')::uuid, 'Λάθος καταχώρηση') $$, 'Η αναίρεση με λόγο επαναφέρει το Γύρισμα σε προγραμματισμένο');
select is((select public.filming_view(current_setting('t.x1')::uuid) ->> 'state'), 'scheduled', 'Μετά την αναίρεση το Γύρισμα είναι προγραμματισμένο');
select is((select public.filming_view(current_setting('t.x1')::uuid) ->> 'burned'), 'false', 'Η αναίρεση «δεν έγινε» ξεκαίει την Παροχή');
select lives_ok($$ select public.filming_undo_outcome(current_setting('t.k1')::uuid, 'Λάθος ώρα') $$, 'Η αναίρεση «έγινε» επιτρέπεται με λόγο');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select lives_ok($$ select public.filming_mark_done(current_setting('t.k1')::uuid, 2) $$, 'Το ίδιο Γύρισμα ξαναγίνεται «έγινε» με τις σωστές ώρες');

-- Κλειστό Γύρισμα δεν αλλάζει (ακόμα και από τη βάση)· δεν σβήνεται.
reset role;
select throws_ok(
  format($$ update public.filmings set location = 'Αλλού' where id = %L $$, current_setting('t.k1')), 'P0001', null, 'Το κλειστό Γύρισμα δεν αλλάζει'
);
select throws_ok(
  format($$ delete from public.filmings where id = %L $$, current_setting('t.k1')), 'P0001', null, 'Το Γύρισμα δεν σβήνεται, ακυρώνεται'
);
set local role authenticated;

-- Πρώτο: έγινε ανά βίντεο (μέρα). Δύο Γυρίσματα την ίδια μέρα = μία μέρα.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select set_config('t.v1', public.filming_create(current_setting('t.a')::uuid, public.t_at(9, time '10:00'), 1, current_setting('t.video')::uuid, null, null)::text, true);
select is((select public.filming_view(current_setting('t.v1')::uuid) ->> 'isExtra'), 'false', 'Βίντεο της ημέρας δεν είναι έξτρα');
select set_config('t.v2', public.filming_create(current_setting('t.a')::uuid, public.t_at(9, time '15:00'), 2, current_setting('t.video')::uuid, null, null)::text, true);
select is((select public.filming_view(current_setting('t.v2')::uuid) ->> 'isExtra'), 'false', 'Δεύτερο βίντεο την ίδια μέρα δεν είναι έξτρα (η μέρα μετρά μία φορά)');
select lives_ok($$ select public.filming_mark_done(current_setting('t.v2')::uuid, 2) $$, 'Το δεύτερο βίντεο της μέρας σημειώνεται «έγινε»');
reset role;
select is(
  (select b.reserved from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.video')::uuid) b), 0::numeric,
  'Ανά μέρα: η μέρα που έχει ήδη «έγινε» δεν μετράει ξανά ως δεσμευμένη'
);
select is(
  (select b.used from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.video')::uuid) b), 1::numeric,
  'Ανά μέρα: μία μέρα καταναλώθηκε'
);
select is(
  (select b.balance from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.video')::uuid) b), 2::numeric,
  'Ανά μέρα: δοσμένες 3 μείον 1 μέρα'
);
select is(
  (select b.used from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.reel')::uuid) b), 1::numeric,
  'Ανά ώρα: καίγεται το «δεν έγινε» των 1 ώρας (X3)'
);
select is(
  (select b.balance from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.reel')::uuid) b), 8::numeric,
  'Ανά ώρα: 12 δοσμένες μείον 1 καταναλωμένη μείον 3 δεσμευμένες'
);
set local role authenticated;

-- ───────────── Συνεργείο (Γ5) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select lives_ok($$ select public.filming_crew_set(current_setting('t.x1')::uuid, array['00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000e2']::uuid[]) $$, 'Η ομάδα ορίζει Συνεργείο: δύο άτομα');
select is(jsonb_array_length(public.filming_view(current_setting('t.x1')::uuid) -> 'crew'), 2, 'Το Συνεργείο φαίνεται με τα δύο άτομά του');
select set_config('t.x13', public.filming_create(current_setting('t.a')::uuid, public.t_at(5, time '12:00'), 1, current_setting('t.reel')::uuid, null, null)::text, true);
select set_config('t.x15', public.filming_create(current_setting('t.a')::uuid, public.t_at(5, time '12:30'), 0.5, current_setting('t.reel')::uuid, null, null)::text, true);
select throws_ok(
  $$ select public.filming_crew_set(current_setting('t.x13')::uuid, array['00000000-0000-0000-0000-0000000000e7']::uuid[]) $$,
  'P0001', null, 'Άτομο με άλλο Γύρισμα την ίδια ώρα δεν μπαίνει στο Συνεργείο'
);
select throws_ok(
  $$ select public.filming_crew_set(current_setting('t.x13')::uuid, array[gen_random_uuid()]::uuid[]) $$,
  'P0001', null, 'Άτομο που δεν υπάρχει δεν μπαίνει στο Συνεργείο'
);
select throws_ok(
  $$ select public.filming_crew_set(current_setting('t.k1')::uuid, array['00000000-0000-0000-0000-0000000000e7']::uuid[]) $$,
  'P0001', null, 'Το Συνεργείο δεν αλλάζει σε κλεισμένο Γύρισμα'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e7","role":"authenticated"}', true);
select throws_ok(
  $$ select public.filming_crew_respond(current_setting('t.x1')::uuid, 'declined', null) $$,
  'P0001', null, 'Το «δεν μπορώ» θέλει λόγο'
);
select lives_ok(
  $$ select public.filming_crew_respond(current_setting('t.x1')::uuid, 'declined', 'Αρρώστησα') $$, 'Το μέλος του Συνεργείου λέει «δεν μπορώ» με λόγο'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select is(
  (select x ->> 'response' from jsonb_array_elements(public.filming_view(current_setting('t.x1')::uuid) -> 'crew') x where x ->> 'userId' = '00000000-0000-0000-0000-0000000000e7'),
  'declined', 'Η ομάδα βλέπει το «δεν μπορώ» του μέλους'
);
select is((select public.filming_view(current_setting('t.x1')::uuid) ->> 'state'), 'scheduled', 'Το «δεν μπορώ» δεν αλλάζει το Γύρισμα');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
select throws_ok(
  $$ select public.filming_crew_respond(current_setting('t.x1')::uuid, 'confirmed', null) $$,
  '42501', null, 'Όποιος δεν είναι στο Συνεργείο δεν απαντά'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e7","role":"authenticated"}', true);
select lives_ok($$ select public.filming_crew_respond(current_setting('t.x1')::uuid, 'confirmed', null) $$, 'Το μέλος επιβεβαιώνει');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select lives_ok(
  $$ select public.filming_crew_set(current_setting('t.x1')::uuid, array['00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e5']::uuid[]) $$,
  'Αλλαγή Συνεργείου μηδενίζει τις επιβεβαιώσεις'
);
select is(
  (select x ->> 'response' from jsonb_array_elements(public.filming_view(current_setting('t.x1')::uuid) -> 'crew') x where x ->> 'userId' = '00000000-0000-0000-0000-0000000000e7'),
  'pending', 'Μετά την αλλαγή η επιβεβαίωση είναι εκκρεμής'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e7","role":"authenticated"}', true);
select is(
  (select x ->> 'myResponse' from jsonb_array_elements(public.filming_mine_view()) x where x ->> 'id' = current_setting('t.x1')),
  'pending', 'Το μέλος βλέπει το Γύρισμα στα «Γυρίσματά μου» με την απάντησή του'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
select is(jsonb_array_length(public.filming_mine_view()), 0, 'Χωρίς Συνεργείο δεν έχει Γυρίσματα στα «Γυρίσματά μου»');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select throws_ok($$ select public.filming_mine_view() $$, '42501', null, 'Ο Πελάτης δεν έχει «Γυρίσματά μου»');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select set_config('t.tpl', public.crew_template_create('Κύριο συνεργείο', 'Βασικό', array['00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000e2']::uuid[])::text, true);
select throws_ok(
  $$ select public.crew_template_create('κύριο συνεργείο', null, array['00000000-0000-0000-0000-0000000000e7']::uuid[]) $$,
  'P0001', null, 'Δύο Πρότυπα συνεργείου δεν έχουν το ίδιο όνομα'
);
select throws_ok(
  $$ select public.crew_template_create('Κενό', null, '{}'::uuid[]) $$, 'P0001', null, 'Πρότυπο συνεργείου θέλει τουλάχιστον ένα άτομο'
);
select is(jsonb_array_length(public.crew_templates_view()), 1, 'Υπάρχει ένα Πρότυπο συνεργείου με τα δύο άτομά του');
select is(
  jsonb_array_length(public.filming_crew_apply_template(current_setting('t.x13')::uuid, current_setting('t.tpl')::uuid) -> 'skipped'),
  2, 'Εφαρμογή Προτύπου: όσοι είναι απασχολημένοι παραλείπονται και λέγονται'
);
select is(jsonb_array_length(public.filming_view(current_setting('t.x13')::uuid) -> 'crew'), 0, 'Μετά από παράλειψη όλων, το Συνεργείο μένει κενό');
select set_config('t.x14', public.filming_create(current_setting('t.a')::uuid, public.t_at(12, time '10:00'), 1, current_setting('t.reel')::uuid, null, null)::text, true);
select is(
  jsonb_array_length(public.filming_crew_apply_template(current_setting('t.x14')::uuid, current_setting('t.tpl')::uuid) -> 'skipped'),
  0, 'Εφαρμογή Προτύπου σε ελεύθερο Γύρισμα δεν παραλείπει κανέναν'
);
select is(jsonb_array_length(public.filming_view(current_setting('t.x14')::uuid) -> 'crew'), 2, 'Το Πρότυπο γεμίζει το Συνεργείο με τα δύο άτομα');
select lives_ok(
  $$ select public.crew_template_update(current_setting('t.tpl')::uuid, 'Κύριο 2', null, array['00000000-0000-0000-0000-0000000000e7']::uuid[]) $$,
  'Το Πρότυπο αλλάζει όνομα και μέλη'
);
select lives_ok($$ select public.crew_template_delete(current_setting('t.tpl')::uuid) $$, 'Το Πρότυπο διαγράφεται');
select is(jsonb_array_length(public.filming_view(current_setting('t.x14')::uuid) -> 'crew'), 2, 'Η διαγραφή του Προτύπου δεν αλλάζει το Συνεργείο του Γυρίσματος');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
select throws_ok($$ select public.crew_template_create('Χωρίς δικαίωμα', null, array['00000000-0000-0000-0000-0000000000e7']::uuid[]) $$, '42501', null, 'Ο Λογιστής δεν φτιάχνει Πρότυπα συνεργείου');
set local role authenticated;

-- ───────────── Εξοπλισμός (Γ6) ─────────────
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select set_config('t.cam1', public.equipment_item_create(current_setting('t.cat_cam')::uuid, 'Κάμερα τεστ 1', null, null)::text, true);
select set_config('t.cam2', public.equipment_item_create(current_setting('t.cat_cam')::uuid, 'Κάμερα τεστ 2', null, null)::text, true);
select set_config('t.lens', public.equipment_item_create(current_setting('t.cat_cam')::uuid, 'Φακός τεστ', null, null)::text, true);
select lives_ok($$ select public.equipment_item_set_status(current_setting('t.lens')::uuid, 'in_repair', 'Σέρβις') $$, 'Ο φακός πάει σε επισκευή με λόγο');
select set_config('t.mic', public.equipment_item_create(current_setting('t.cat_cam')::uuid, 'Μικρόφωνο τεστ', null, null)::text, true);
select set_config('t.tpl_eq', public.equipment_template_create('Πακέτο κάμερας', null, array[current_setting('t.cam1'), current_setting('t.cam2')]::uuid[])::text, true);
select is(jsonb_array_length(public.filming_equipment_set(current_setting('t.x1')::uuid, array[current_setting('t.cam1')]::uuid[]) -> 'added'), 1, 'Η κάμερα μπαίνει στο Γύρισμα');
select is(
  jsonb_array_length(public.filming_equipment_set(current_setting('t.x1')::uuid, array[current_setting('t.cam1'), current_setting('t.lens')]::uuid[]) -> 'skipped'),
  1, 'Ο φακός σε επισκευή παραλείπεται με αιτία «μη διαθέσιμο»'
);
select is(jsonb_array_length(public.filming_view(current_setting('t.x1')::uuid) -> 'equipment'), 1, 'Μετά το ξανά-ορισμό, ο εξοπλισμός είναι μόνο η κάμερα');
select is(
  jsonb_array_length(public.filming_equipment_set(current_setting('t.x13')::uuid, array[current_setting('t.cam1')]::uuid[]) -> 'conflicts'),
  1, 'Σύγκρουση εξοπλισμού προειδοποιεί όταν ο Κανόνας λέει «προειδοποιεί»'
);
select is((select public.filming_view(current_setting('t.x13')::uuid) -> 'signals' ->> 'equipmentConflict'), 'true', 'Η σύγκρουση φαίνεται ως σήμα στο Γύρισμα');
select lives_ok($$ select public.filming_settings_save('{"equipmentConflict": "block"}'::jsonb) $$, 'Ο Κανόνας σύγκρουσης γίνεται «μπλοκάρει»');
select throws_ok(
  $$ select public.filming_equipment_set(current_setting('t.x15')::uuid, array[current_setting('t.cam1')]::uuid[]) $$,
  'P0001', null, 'Με «μπλοκάρει» η σύγκρουση δεν μπαίνει σε Γύρισμα'
);
select is(
  jsonb_array_length(public.filming_equipment_apply_template(current_setting('t.x15')::uuid, current_setting('t.tpl_eq')::uuid) -> 'skipped'),
  1, 'Πρότυπο εξοπλισμού: η σύγκρουση παραλείπεται και λέγεται'
);
select lives_ok($$ select public.filming_settings_save('{"equipmentConflict": "warn"}'::jsonb) $$, 'Ο Κανόνας επιστρέφει στο «προειδοποιεί»');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select is(public.equipment_item_reserve(current_setting('t.mic')::uuid, current_setting('t.x14')::uuid), false, 'Η Παραγωγή δεσμεύει αντικείμενο σε Γύρισμα της Περιόδου της');
select throws_ok(
  $$ select public.equipment_item_reserve(current_setting('t.lens')::uuid, current_setting('t.x14')::uuid) $$,
  'P0001', null, 'Αντικείμενο σε επισκευή δεν δεσμεύεται'
);
select throws_ok(
  $$ select public.equipment_item_reserve(current_setting('t.mic')::uuid, current_setting('t.y1')::uuid) $$, '42501', null, 'Η Παραγωγή δεν δεσμεύει σε Γύρισμα ξένης Παραγωγής'
);
select lives_ok($$ select public.equipment_item_release(current_setting('t.mic')::uuid, current_setting('t.x14')::uuid) $$, 'Η αποδέσμευση αφαιρεί το αντικείμενο από το Γύρισμα');
select throws_ok(
  $$ select public.equipment_item_release(current_setting('t.mic')::uuid, current_setting('t.x14')::uuid) $$, 'P0001', null, 'Η αποδέσμευση δεύτερη φορά δεν βρίσκει δέσμευση'
);
select is(public.equipment_item_reserve(current_setting('t.mic')::uuid, current_setting('t.x14')::uuid), false, 'Το μικρόφωνο ξαναδεσμεύεται στο Γύρισμα');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select lives_ok($$ select public.equipment_item_set_status(current_setting('t.cam2')::uuid, 'retired', 'Πωλήθηκε') $$, 'Η αποσυρμένη κάμερα αποδεσμεύεται από τα μελλοντικά Γυρίσματα');
select is(jsonb_array_length(public.filming_view(current_setting('t.x15')::uuid) -> 'equipment'), 0, 'Μετά την απόσυρση η κάμερα δεν είναι στο Γύρισμα');
select throws_ok($$ select public.equipment_item_delete(current_setting('t.mic')::uuid) $$, 'P0001', null, 'Αντικείμενο με Δέσμευση δεν διαγράφεται');
select is(jsonb_array_length(public.equipment_item_view(current_setting('t.cam1')::uuid) -> 'reservations'), 2, 'Η σελίδα της κάμερας δείχνει τα δύο ανοιχτά Γυρίσματά της');
select ok(public.equipment_item_view(current_setting('t.cam1')::uuid) -> 'nextReservation' is not null, 'Η σελίδα της κάμερας δείχνει την επόμενη Δέσμευση');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select throws_ok($$ select public.equipment_item_view(current_setting('t.cam1')::uuid) $$, '42501', null, 'Ο Πελάτης δεν βλέπει τη σελίδα αντικειμένου');

-- ───────────── Κανόνες γυρισμάτων (E-ρυθμίσεις) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select is((select public.filming_settings_view() ->> 'horizonDays'), '60', 'Ο Κανόνας ορίζοντα είναι 60 μέρες');
select throws_ok($$ select public.filming_settings_save('{"horizonDays": 0}'::jsonb) $$, 'P0001', null, 'Ορίζοντας εκτός ορίων απορρίπτεται');
select throws_ok($$ select public.filming_settings_save('{"noAnswerAction": "boom"}'::jsonb) $$, 'P0001', null, 'Άγνωστη επιλογή απορρίπτεται');
select throws_ok($$ select public.filming_settings_save('{"bookingNeedsApproval": "yes"}'::jsonb) $$, 'P0001', null, 'Μη λογική τιμή για ναι/όχι απορρίπτεται');
select lives_ok($$ select public.filming_settings_save('{"sheetSending": "auto"}'::jsonb) $$, 'Η αποστολή Δελτίου αποθηκεύεται');
select is((select public.filming_settings_view() ->> 'sheetSending'), 'auto', 'Η αποθηκευμένη ρύθμιση φαίνεται');
select lives_ok($$ select public.filming_settings_save('{"sheetSending": "manual"}'::jsonb) $$, 'Η ρύθμιση επιστρέφει στο «με το χέρι»');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok($$ select public.filming_settings_save('{"horizonDays": 90}'::jsonb) $$, '42501', null, 'Οι Πωλήσεις δεν αλλάζουν Κανόνες');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
select throws_ok($$ select public.filming_settings_view() $$, '42501', null, 'Ο Λογιστής δεν βλέπει Κανόνες');

-- ───────────── Λίστες και σελίδες (E1, E2, E3, E6, E7) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select throws_ok($$ select public.filmings_view('άγνωστη') $$, 'P0001', null, 'Άγνωστη καρτέλα λίστας απορρίπτεται');
select throws_ok($$ select public.filmings_view('open', 0) $$, 'P0001', null, 'Σελίδα χωρίς γραμμές απορρίπτεται');
reset role;
insert into public.filmings (production_id, starts_at, hours, origin, state)
values (current_setting('t.pi')::uuid, now() - interval '2 days', 1, 'team', 'scheduled');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select is(jsonb_array_length(public.filmings_view('needs_outcome')), 1, 'Το «Θέλουν έγινε» δείχνει το Γύρισμα με έναρξη στο παρελθόν');
select set_config('t.v_open', jsonb_array_length(public.filmings_view('open'))::text, true);
select set_config('t.v_closed', jsonb_array_length(public.filmings_view('closed'))::text, true);
select set_config('t.v_all', jsonb_array_length(public.filmings_view('all'))::text, true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select set_config('t.v_client_all', jsonb_array_length(public.filmings_view('all'))::text, true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select set_config('t.v_sales_all', jsonb_array_length(public.filmings_view('all'))::text, true);
select is((select public.filmings_view('all') -> 0 -> 'crew'), 'null'::jsonb, 'Οι Πωλήσεις βλέπουν τη λίστα χωρίς Συνεργείο');
reset role;
select is(
  current_setting('t.v_open')::int,
  (select count(*)::int from public.filmings where state in ('pending', 'scheduled')),
  'Η ομάδα βλέπει όλα τα ανοιχτά Γυρίσματα'
);
select is(
  current_setting('t.v_all')::int, (select count(*)::int from public.filmings), 'Η καρτέλα «Όλα» έχει όλα τα Γυρίσματα για τη ομάδα'
);
select is(
  current_setting('t.v_client_all')::int,
  (select count(*)::int from public.filmings where client_id = '00000000-0000-0000-0000-0000000000f1'),
  'Ο Πελάτης βλέπει μόνο τα Γυρίσματα του'
);
select is(
  current_setting('t.v_sales_all')::int,
  (select count(*)::int from public.filmings where client_id = '00000000-0000-0000-0000-0000000000f1'),
  'Ο Υπεύθυνος του Πελάτη βλέπει τα Γυρίσματα του Πελάτη του'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select is((select public.filming_view(current_setting('t.k1')::uuid) -> 'crew'), '[]'::jsonb, 'Ο Πελάτης δεν βλέπει Συνεργείο');
select is((select public.filming_view(current_setting('t.k1')::uuid) ->> 'internalNote'), null, 'Ο Πελάτης δεν βλέπει εσωτερική σημείωση');
select is((select public.filming_view(current_setting('t.k1')::uuid) -> 'history'), '[]'::jsonb, 'Ο Πελάτης δεν βλέπει ιστορικό');
select is((select public.filming_view(current_setting('t.k4')::uuid) -> 'viewerCan' ->> 'clientCancel'), 'true', 'Ο Πελάτης βλέπει ότι μπορεί να ακυρώσει εκκρεμή κράτηση');
select throws_ok($$ select public.filming_view(gen_random_uuid()) $$, '42501', null, 'Ο Πελάτης σε ανύπαρκτο Γύρισμα παίρνει 42501');
select throws_ok($$ select public.filming_view(current_setting('t.y1')::uuid) $$, '42501', null, 'Ο Πελάτης δεν βλέπει Γύρισμα άλλου Πελάτη');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok($$ select public.filming_view(current_setting('t.y1')::uuid) $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν Γύρισμα άλλου Υπευθύνου');
select throws_ok($$ select public.filming_view(gen_random_uuid()) $$, '42501', null, 'Οι Πωλήσεις σε ανύπαρκτο Γύρισμα παίρνουν 42501');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select throws_ok($$ select public.filming_view(gen_random_uuid()) $$, 'P0001', null, 'Η ομάδα σε ανύπαρκτο Γύρισμα παίρνει «δεν βρέθηκε»');
select is(jsonb_array_length(public.filming_view(current_setting('t.x1')::uuid) -> 'crew'), 3, 'Η ομάδα βλέπει το Συνεργείο');
select ok(jsonb_array_length(public.filming_view(current_setting('t.x1')::uuid) -> 'history') > 0, 'Η ομάδα βλέπει το ιστορικό από το Ίχνος');
select is((select public.filming_view(current_setting('t.x1')::uuid) -> 'viewerCan' ->> 'approve'), 'false', 'Προγραμματισμένο Γύρισμα δεν εγκρίνεται ξανά');
select is((select public.filming_view(current_setting('t.x1')::uuid) -> 'viewerCan' ->> 'markDone'), 'true', 'Η ομάδα μπορεί να σημειώσει «έγινε»');

-- Ουρά έγκρισης (E2) και αίτημα με Όρους που καίνε/δεν καίνε.
select set_config('t.x16', public.filming_create(current_setting('t.a')::uuid, now() + interval '16 hours', 1, current_setting('t.reel')::uuid, null, null)::text, true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select lives_ok($$ select public.filming_request_cancel(current_setting('t.x16')::uuid, null) $$, 'Αίτημα ακύρωσης για την ουρά');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select is(jsonb_array_length(public.filming_queue_view() -> 'cancelRequests'), 1, 'Η ουρά δείχνει το αίτημα ακύρωσης');
select is((public.filming_queue_view() -> 'cancelRequests' -> 0 ->> 'willBurn'), 'false', 'Η ουρά δείχνει ότι δεν καίει Παροχή με τους Όρους της Συμφωνίας');
select ok(jsonb_array_length(public.filming_queue_view() -> 'pending') >= 1, 'Η ουρά δείχνει τις κρατήσεις που αναμένουν έγκριση');
select lives_ok($$ select public.filming_decide_cancel_request(current_setting('t.x16')::uuid, false, null) $$, 'Η ουρά καθαρίζει το αίτημα');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok($$ select public.filming_queue_view() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν την ουρά έγκρισης');

-- Επιλογές κράτησης και Παραγωγή (G2)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select throws_ok($$ select public.filming_new_options() $$, '42501', null, 'Η Παραγωγή δεν βλέπει επιλογές κράτησης');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select ok(jsonb_array_length(public.production_view(current_setting('t.pa1')::uuid) -> 'filmings') >= 1, 'Η σελίδα Παραγωγής δείχνει τα Γυρίσματά της');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select ok(jsonb_array_length(public.production_view(current_setting('t.pa1')::uuid) -> 'filmings') >= 1, 'Ο Πελάτης βλέπει τα Γυρίσματα της Παραγωγής του');
select throws_ok($$ select public.production_view(current_setting('t.pc')::uuid) $$, '42501', null, 'Ο Πελάτης δεν βλέπει Παραγωγή άλλου Πελάτη');

-- ───────────── Εφάπαξ, υπογραφή με καταναλωμένες Παροχές, Ίχνος και κλειστοί πίνακες ─────────────
reset role;
select is(
  (select b.used from authz.period_balance((select pe.id from public.agreement_periods pe where pe.agreement_id = current_setting('t.d')::uuid and pe.n = 1), current_setting('t.shoot')::uuid) b),
  1::numeric, 'Η υπογραφή εκτός συστήματος μετράει τα καταναλωμένα της πρώτης Περιόδου'
);
select is(
  (select b.balance from authz.period_balance((select pe.id from public.agreement_periods pe where pe.agreement_id = current_setting('t.d')::uuid and pe.n = 1), current_setting('t.shoot')::uuid) b),
  1::numeric, 'Με καταναλωμένα από την υπογραφή, το υπόλοιπο της πρώτης Περιόδου είναι 2 μείον 1'
);
select ok(authz.production_has_work(current_setting('t.pa1')::uuid), 'Η Παραγωγή με Γυρίσματα έχει δουλειά');
select ok(authz.equipment_item_reserved(current_setting('t.cam1')::uuid), 'Η κάμερα που είναι σε ανοιχτό Γύρισμα είναι δεσμευμένη');
select is(authz.equipment_item_reserved(current_setting('t.lens')::uuid), false, 'Ο φακός που δεν δεσμεύτηκε δεν είναι δεσμευμένος');
select is(authz.period_provision_used(current_setting('t.p2')::uuid, current_setting('t.shoot')::uuid), 1::numeric, 'Το «έγινε» καταναλώνει Παροχή της Περιόδου');
select is(authz.period_provision_reserved(current_setting('t.p2')::uuid, current_setting('t.shoot')::uuid), 1::numeric, 'Η κράτηση που αναμένει δεσμεύει Παροχή της Περιόδου');
select ok(
  not exists (
    select 1 from unnest(array['created', 'booked', 'approved', 'rejected', 'cancelled', 'cancel_requested', 'cancel_request_decided',
                               'rescheduled', 'done', 'no_show', 'outcome_undone', 'crew_changed', 'crew_declined',
                               'equipment_changed', 'equipment_conflict']) e
     where not exists (select 1 from public.audit_log a where a.entity = 'filmings' and a.action = 'event' and a.after ->> 'event' = e)
  ),
  'Κάθε γεγονός των Γυρισμάτων γράφεται στο Ίχνος'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select * from public.filmings $$, '42501', null, 'Ο πίνακας Γυρισμάτων δεν διαβάζεται απευθείας');
select throws_ok($$ select * from public.filming_settings $$, '42501', null, 'Ο πίνακας Κανόνων δεν διαβάζεται απευθείας');
reset role;

-- Υποψήφιοι Συνεργείου και Εξοπλισμού (E3, E7): μόνο όσοι έχουν το Δικαίωμα.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.filming_crew_candidates() $$, '42501', null, 'Ο Λογιστής δεν βλέπει υποψήφια μέλη Συνεργείου');
select throws_ok($$ select public.filming_equipment_candidates() $$, '42501', null, 'Ο Λογιστής δεν βλέπει υποψήφια αντικείμενα Εξοπλισμού');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
set local role authenticated;
select ok(jsonb_array_length(public.filming_crew_candidates()) >= 6, 'Ο Διαχειριστής βλέπει τους ενεργούς Χρήστες ομάδας για το Συνεργείο');
select ok(jsonb_typeof(public.filming_equipment_candidates()) = 'array', 'Ο Διαχειριστής παίρνει τη λίστα υποψήφιων αντικειμένων');
reset role;

select * from finish();
rollback;
