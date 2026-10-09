-- Περίοδοι και Παραγωγές (G1, G2): γέννηση σε δύο διαδρομές υπογραφής, υπόλοιπα Περιόδου, RPC με άρνηση ανά ρόλο,
-- μεταβάσεις, Μέλη, Πελάτης, Ίχνος (κεφ. 3, ADR 0007). Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(160);

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης · e2 Παραγωγή (productions.manage «mine») · e3 Πωλήσεις · e4 «Ελεγκτής» (audit.view)
-- e5 «Παραγωγός όλων» (productions.manage «all») · e6 Πελάτης χωρίς σύνδεση με ομάδα (μόνο auth)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'auditor@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'producer@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'client@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'Κώστας', 'auditor@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'Νίκος', 'producer@example.com');

insert into public.roles (name, kind) values ('Ελεγκτής', 'team'), ('Παραγωγός όλων', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, g.permission, g.scope
  from (values ('Ελεγκτής', 'audit.view', 'all'), ('Παραγωγός όλων', 'productions.manage', 'all'), ('Παραγωγός όλων', 'clients.manage', 'all')) as g (role_name, permission, scope)
  join public.roles r on r.name = g.role_name and r.kind = 'team';
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e2', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000e2', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000e3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000e4', 'Ελεγκτής'),
    ('00000000-0000-0000-0000-0000000000e5', 'Παραγωγός όλων')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Πελάτες: f1 (της Άννας), f2 (άλλος Πελάτης).
insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'Κυψέλη Καφέ', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-0000000000f2', 'Ταβέρνα Αρμύρα', '', 'Ναύπλιο', null, 'Κώστας Αρμύρας', 'armyra@example.com', '27520 33333', '00000000-0000-0000-0000-0000000000e3');

-- Ευκαιρίες: c1 μηνιαία δημόσια (Άννα) · c2 μηνιαία εκτός (Πέτρος) · c3 εφάπαξ (Νίκος) · c4 πρόχειρη (Άννα) · c5 του f2
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select o.id::uuid, o.client::uuid, o.title, (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'), o.manager::uuid, 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3
  from (values
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'Μηνιαίο δημόσιο', '00000000-0000-0000-0000-0000000000e3'),
    ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000f1', 'Μηνιαίο εκτός', '00000000-0000-0000-0000-0000000000e2'),
    ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000f1', 'Εγκαίνια', '00000000-0000-0000-0000-0000000000e5'),
    ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000f1', 'Πρόχειρο', '00000000-0000-0000-0000-0000000000e3'),
    ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000f2', 'Άλλος πελάτης', '00000000-0000-0000-0000-0000000000e3')
  ) as o (id, client, title, manager);

-- Κατάλογος: μηνιαίο πακέτο (shoot 2, reel 8), εφάπαξ πακέτο (shoot 1), Υπηρεσία reel (reel 1). Κόστος ώρας του μήνα: 40 €.
insert into public.catalogue_items (id, kind, billing, name, name_en, unit, retired_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'package', 'monthly', 'Μηνιαίο πακέτο (τεστ)', 'Monthly (test)', '', null),
  ('00000000-0000-0000-0000-0000000000d2', 'package', 'one_off', 'Εφάπαξ πακέτο (τεστ)', 'One-off (test)', '', null),
  ('00000000-0000-0000-0000-0000000000d3', 'service', null, 'Reel (τεστ)', 'Reel (test)', 'ανά reel', null);
insert into public.catalogue_item_amounts (item_id, price) values
  ('00000000-0000-0000-0000-0000000000d1', 1000), ('00000000-0000-0000-0000-0000000000d2', 500), ('00000000-0000-0000-0000-0000000000d3', 100);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost) values
  ('00000000-0000-0000-0000-0000000000d1', 6, 14, 0), ('00000000-0000-0000-0000-0000000000d2', 4, 6, 0), ('00000000-0000-0000-0000-0000000000d3', 1, 3, 0);
insert into public.catalogue_item_provisions (item_id, kind_id, quantity)
select p.item::uuid, k.id, p.qty
  from (values
    ('00000000-0000-0000-0000-0000000000d1', 'shoot', 2), ('00000000-0000-0000-0000-0000000000d1', 'reel', 8),
    ('00000000-0000-0000-0000-0000000000d2', 'shoot', 1), ('00000000-0000-0000-0000-0000000000d3', 'reel', 1)
  ) as p (item, code, qty)
  join public.provision_kinds k on k.code = p.code;
insert into public.cost_months (month, expenses_total, productive_hours)
values (date_trunc('month', now() at time zone 'Europe/Athens')::date, 8800, 220);

-- Βοηθητικά των τεστ (ζουν μόνο μέσα στη συναλλαγή): το token ενός Συνδέσμου και ο κωδικός υπογραφής από τα εξερχόμενα.
create function public.t_token(p_agreement uuid) returns text
language sql stable
as $$
  select substr(v.link_path, 4) from public.agreement_outbox_view(p_agreement) v
   where v.kind = 'proposal_link' and v.status = 'pending' order by v.created_at desc limit 1;
$$;
create function public.t_code(p_agreement uuid) returns text
language sql stable
as $$
  select v.code from public.agreement_outbox_view(p_agreement) v
   where v.kind = 'signing_code' and v.status = 'pending' order by v.created_at desc limit 1;
$$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

-- ───────────── Δομή και προεπιλογές (πριν από κάθε δεδομένο) ─────────────
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname in ('agreement_periods', 'agreement_period_provisions', 'productions', 'production_members')),
  4, 'RLS ενεργό στους τέσσερις νέους πίνακες'
);
select is(
  (select count(*)::int from pg_policies where schemaname = 'public'
     and tablename in ('agreement_periods', 'agreement_period_provisions', 'productions', 'production_members')),
  0, 'Κανένα policy: οι πίνακες είναι κλειστοί'
);
select ok(authz.audit_entity_allowed('agreement_periods'), 'Το Ίχνος καταγράφει τις Περιόδους');
select ok(authz.audit_entity_allowed('agreement_period_provisions'), 'Το Ίχνος καταγράφει τις Παροχές Περιόδου');
select ok(authz.audit_entity_allowed('productions'), 'Το Ίχνος καταγράφει τις Παραγωγές');
select ok(authz.audit_entity_allowed('production_members'), 'Το Ίχνος καταγράφει τα Μέλη Παραγωγής');
select is(authz.period_provision_used(gen_random_uuid(), gen_random_uuid()), 0, 'Χωρίς Γυρίσματα καμία Παροχή δεν έχει καταναλωθεί');
select is(authz.period_provision_reserved(gen_random_uuid(), gen_random_uuid()), 0, 'Χωρίς Γυρίσματα καμία Παροχή δεν είναι δεσμευμένη');
select is(authz.production_has_work(gen_random_uuid()), false, 'Χωρίς Εργασίες και Παραδοτέα καμία Παραγωγή δεν έχει δουλειά');
select is(authz.client_user_client_id(), null::uuid, 'Κανένας Χρήστης δεν συνδέεται ακόμα με Πελάτη');

-- ───────────── Συμφωνίες: δύο διαδρομές υπογραφής ─────────────
select set_config('t.reel', (select k.id::text from public.provision_kinds k where k.code = 'reel'), true);
select set_config('t.shoot', (select k.id::text from public.provision_kinds k where k.code = 'shoot'), true);

-- a1: μηνιαία, υπογραφή από τον Σύνδεσμο πρότασης (έναρξη με την υπογραφή).
select set_config('t.a1', public.agreement_create('00000000-0000-0000-0000-0000000000c1', 'monthly', 'Μηνιαίο δημόσιο')::text, true);
select public.agreement_update_basics(current_setting('t.a1')::uuid, 'Μηνιαίο δημόσιο', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, 6);
select public.agreement_add_catalogue_line(current_setting('t.a1')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_set_recipients(current_setting('t.a1')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_send(current_setting('t.a1')::uuid);
select set_config('t.tok1', public.t_token(current_setting('t.a1')::uuid), true);

set local role anon;
select is(
  public.agreement_public_request_code(current_setting('t.tok1'), 'Μαρία Παπαδάκη', true, '1.2.3.4') ->> 'status', 'sent',
  'Ο Σύνδεσμος στέλνει κωδικό υπογραφής'
);
reset role;
select set_config('t.code1', public.t_code(current_setting('t.a1')::uuid), true);
set local role anon;
select is(
  public.agreement_public_sign(current_setting('t.tok1'), current_setting('t.code1'), '1.2.3.4', 'test') ->> 'status', 'signed',
  'Ο Σύνδεσμος υπογράφει τη μηνιαία Συμφωνία'
);
reset role;

-- a2: μηνιαία, εκτός συστήματος, έναρξη 15 Οκτωβρίου 2026 (6 μήνες: 7 Περίοδοι, η 7η μερική χωρίς Παροχές).
select set_config('t.a2', public.agreement_create('00000000-0000-0000-0000-0000000000c2', 'monthly', 'Μηνιαίο εκτός')::text, true);
select public.agreement_update_basics(current_setting('t.a2')::uuid, 'Μηνιαίο εκτός', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, 6);
select public.agreement_add_catalogue_line(current_setting('t.a2')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_add_catalogue_line(current_setting('t.a2')::uuid, '00000000-0000-0000-0000-0000000000d3', 4);
select public.agreement_set_recipients(current_setting('t.a2')::uuid, '[{"name":"Πέτρος Νικολάου","email":"petros@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a2')::uuid, (now() at time zone 'Europe/Athens')::date, 'Πέτρος Νικολάου', date '2026-10-15', 'contract.pdf');

-- a3: εφάπαξ, εκτός συστήματος.
select set_config('t.a3', public.agreement_create('00000000-0000-0000-0000-0000000000c3', 'one_off', 'Εγκαίνια')::text, true);
select public.agreement_update_basics(current_setting('t.a3')::uuid, 'Εγκαίνια', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, null);
select public.agreement_add_catalogue_line(current_setting('t.a3')::uuid, '00000000-0000-0000-0000-0000000000d2', 1);
select public.agreement_set_recipients(current_setting('t.a3')::uuid, '[{"name":"Νικόλαος","email":"nikos@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a3')::uuid, (now() at time zone 'Europe/Athens')::date, 'Νικόλαος', (now() at time zone 'Europe/Athens')::date, 'file.pdf');

-- a4: πρόχειρη μηνιαία, δεν υπογράφεται.
select set_config('t.a4', public.agreement_create('00000000-0000-0000-0000-0000000000c4', 'monthly', 'Πρόχειρο')::text, true);
select public.agreement_update_basics(current_setting('t.a4')::uuid, 'Πρόχειρο', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, 6);
select public.agreement_add_catalogue_line(current_setting('t.a4')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);

-- a5: εφάπαξ του f2, εκτός συστήματος.
select set_config('t.a5', public.agreement_create('00000000-0000-0000-0000-0000000000c5', 'one_off', 'Άλλος πελάτης')::text, true);
select public.agreement_update_basics(current_setting('t.a5')::uuid, 'Άλλος πελάτης', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, null);
select public.agreement_add_catalogue_line(current_setting('t.a5')::uuid, '00000000-0000-0000-0000-0000000000d2', 1);
select public.agreement_set_recipients(current_setting('t.a5')::uuid, '[{"name":"Κώστας Αρμύρας","email":"armyra@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a5')::uuid, (now() at time zone 'Europe/Athens')::date, 'Κώστας Αρμύρας', (now() at time zone 'Europe/Athens')::date, 'x.pdf');

-- ───────────── Γέννηση Περιόδων και Παραγωγών ─────────────
select set_config('t.m1', (select count(*)::text from public.agreement_periods where agreement_id = current_setting('t.a1')::uuid), true);
select is((select state from public.agreements where id = current_setting('t.a1')::uuid), 'active', 'Η υπογραφή από τον Σύνδεσμο ενεργοποιεί τη Συμφωνία με έναρξη σήμερα');
select is(
  (select count(*)::int from public.agreement_periods where agreement_id = current_setting('t.a1')::uuid),
  (select count(*)::int from authz.agreement_period_rows((select start_on from public.agreements where id = current_setting('t.a1')::uuid), 6)),
  'Η υπογραφή από τον Σύνδεσμο γεννά μία Περίοδο ανά μήνα της Συμφωνίας'
);
select is(
  (select count(*)::int from public.productions where agreement_id = current_setting('t.a1')::uuid),
  current_setting('t.m1')::int, 'Η υπογραφή από τον Σύνδεσμο γεννά μία Παραγωγή ανά Περίοδο'
);
select is(
  (select count(*)::int from public.productions p where p.agreement_id = current_setting('t.a1')::uuid and p.period_id is not null),
  current_setting('t.m1')::int, 'Κάθε Παραγωγή της μηνιαίας Συμφωνίας έχει Περίοδο'
);
select is(
  (select owner_id from public.productions where agreement_id = current_setting('t.a1')::uuid limit 1), null::uuid,
  'Ο Υπεύθυνος της Ευκαιρίας χωρίς Δικαίωμα Παραγωγών δεν γίνεται Υπεύθυνος (κανείς)'
);
select is(
  (select count(*)::int from public.agreement_periods where agreement_id = current_setting('t.a2')::uuid), 7,
  'Έξι μήνες από μέσα του μήνα είναι επτά Περίοδοι'
);
select is((select starts from public.agreement_periods where agreement_id = current_setting('t.a2')::uuid and n = 1), date '2026-10-15', 'Η πρώτη Περίοδος αρχίζει με την Έναρξη');
select ok(
  (select not gives_provisions and is_partial from public.agreement_periods where agreement_id = current_setting('t.a2')::uuid and n = 7),
  'Η τελευταία μερική Περίοδος δεν δίνει Παροχές'
);
select is(
  (select count(*)::int from public.agreement_periods where agreement_id = current_setting('t.a2')::uuid and gives_provisions), 6,
  'Οι έξι πρώτες Περίοδοι δίνουν Παροχές'
);
select is(
  (select count(*)::int from public.productions where agreement_id = current_setting('t.a2')::uuid), 7,
  'Η μηνιαία Συμφωνία των έξι μηνών γεννά επτά Παραγωγές'
);
select is(
  (select title from public.productions p join public.agreement_periods pe on pe.id = p.period_id
    where pe.agreement_id = current_setting('t.a2')::uuid and pe.n = 1),
  'Μηνιαίο εκτός — Οκτώβριος 2026', 'Ο τίτλος μηνιαίας Παραγωγής έχει τον μήνα'
);
select is(
  (select count(*)::int from public.productions where agreement_id = current_setting('t.a2')::uuid and owner_id = '00000000-0000-0000-0000-0000000000e2'),
  7, 'Ο Υπεύθυνος της Ευκαιρίας με Δικαίωμα Παραγωγών γίνεται Υπεύθυνος όλων των Παραγωγών της'
);
select is(
  (select pp.given from public.agreement_period_provisions pp join public.agreement_periods pe on pe.id = pp.period_id
    where pe.agreement_id = current_setting('t.a2')::uuid and pe.n = 1 and pp.kind_id = current_setting('t.reel')::uuid),
  12, 'Η Περίοδος παίρνει τις Παροχές των γραμμών: 8 reel του πακέτου και 4 της Υπηρεσίας'
);
select is(
  (select pp.given from public.agreement_period_provisions pp join public.agreement_periods pe on pe.id = pp.period_id
    where pe.agreement_id = current_setting('t.a2')::uuid and pe.n = 1 and pp.kind_id = current_setting('t.shoot')::uuid),
  2, 'Η Περίοδος παίρνει και τα shoot του πακέτου'
);
select is(
  (select count(*)::int from public.agreement_period_provisions pp join public.agreement_periods pe on pe.id = pp.period_id
    where pe.agreement_id = current_setting('t.a2')::uuid and pe.n = 7), 0,
  'Η μερική τελευταία Περίοδος δεν παίρνει Παροχές'
);
select is((select count(*)::int from public.agreement_periods where agreement_id = current_setting('t.a3')::uuid), 0, 'Η εφάπαξ Συμφωνία δεν έχει Περιόδους');
select is(
  (select count(*)::int from public.productions where agreement_id = current_setting('t.a3')::uuid and period_id is null), 1,
  'Η εφάπαξ Συμφωνία έχει μία Παραγωγή χωρίς Περίοδο'
);
select is((select title from public.productions where agreement_id = current_setting('t.a3')::uuid), 'Εγκαίνια', 'Η εφάπαξ Παραγωγή παίρνει τον τίτλο της Συμφωνίας');
select is(
  (select owner_id from public.productions where agreement_id = current_setting('t.a3')::uuid), '00000000-0000-0000-0000-0000000000e5'::uuid,
  'Ο Υπεύθυνος της εφάπαξ Ευκαιρίας γίνεται Υπεύθυνος της Παραγωγής'
);
select is((select count(*)::int from public.productions where agreement_id = current_setting('t.a4')::uuid), 0, 'Η πρόχειρη Συμφωνία δεν γεννά Παραγωγές');
select is(
  (select client_id from public.productions where agreement_id = current_setting('t.a5')::uuid), '00000000-0000-0000-0000-0000000000f2'::uuid,
  'Η Παραγωγή παίρνει τον Πελάτη της Συμφωνίας'
);
select lives_ok(
  $$ select authz.agreement_materialize(current_setting('t.a2')::uuid) $$, 'Η γέννηση ξανατρέχει χωρίς σφάλμα'
);
select is((select count(*)::int from public.agreement_periods where agreement_id = current_setting('t.a2')::uuid), 7, 'Η ξανατρεχούμενη γέννηση δεν διπλασιάζει Περιόδους');
select is((select count(*)::int from public.productions where agreement_id = current_setting('t.a2')::uuid), 7, 'Η ξανατρεχούμενη γέννηση δεν διπλασιάζει Παραγωγές');
select is((select count(*)::int from public.productions), current_setting('t.m1')::int + 9, 'Συνολικά: Παραγωγή ανά Περίοδο και μία ανά εφάπαξ Συμφωνία');

-- Δείκτες για τα τεστ που ακολουθούν.
select set_config('t.pm1', (select p.id::text from public.productions p where p.agreement_id = current_setting('t.a1')::uuid limit 1), true);
select set_config('t.pm2', (select p.id::text from public.productions p join public.agreement_periods pe on pe.id = p.period_id
  where pe.agreement_id = current_setting('t.a2')::uuid and pe.n = 1), true);
select set_config('t.p2', (select pe.id::text from public.agreement_periods pe where pe.agreement_id = current_setting('t.a2')::uuid and pe.n = 2), true);
select set_config('t.p3', (select pe.id::text from public.agreement_periods pe where pe.agreement_id = current_setting('t.a2')::uuid and pe.n = 3), true);
select set_config('t.p1', (select pe.id::text from public.agreement_periods pe where pe.agreement_id = current_setting('t.a2')::uuid and pe.n = 1), true);
select set_config('t.p7', (select pe.id::text from public.agreement_periods pe where pe.agreement_id = current_setting('t.a2')::uuid and pe.n = 7), true);
select set_config('t.pa3', (select p.id::text from public.productions p where p.agreement_id = current_setting('t.a3')::uuid), true);
select set_config('t.pa5', (select p.id::text from public.productions p where p.agreement_id = current_setting('t.a5')::uuid), true);

-- ───────────── Υπόλοιπο Περιόδου (Π3) ─────────────
select is(
  (select b.balance from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.reel')::uuid) b), 12,
  'Η πρώτη Περίοδος έχει ολόκληρες τις Παροχές της'
);
select is(
  (select b.given from authz.period_balance(current_setting('t.p7')::uuid, current_setting('t.reel')::uuid) b), 0,
  'Η μερική τελευταία Περίοδος έχει μηδέν Παροχές'
);
select is(
  (select b.balance from authz.period_balance(current_setting('t.p7')::uuid, current_setting('t.reel')::uuid) b), 12,
  'Η μερική τελευταία Περίοδος μεταφέρει ό,τι δεν χρησιμοποιήθηκε'
);
select is((select unused_provisions from public.agreements where id = current_setting('t.a2')::uuid), 'next_period', 'Οι Όροι της Συμφωνίας: επόμενη Περίοδος');

-- Προσομοίωση κατανάλωσης: 2 reel στην πρώτη Περίοδο (με το χέρι μέσα στη συναλλαγή, όπως θα κάνει το Γύρισμα).
create or replace function authz.period_provision_used(p_period uuid, p_kind uuid) returns integer
language sql stable security definer set search_path = ''
as $$ select case when p_period = current_setting('t.p1')::uuid and p_kind = current_setting('t.reel')::uuid then 2 else 0 end; $$;

select is(
  (select b.balance from authz.period_balance(current_setting('t.p1')::uuid, current_setting('t.reel')::uuid) b), 10,
  'Τα καταναλωμένα αφαιρούνται από το υπόλοιπο της Περιόδου'
);
select is(
  (select b.balance from authz.period_balance(current_setting('t.p2')::uuid, current_setting('t.reel')::uuid) b), 22,
  'Με επόμενη Περίοδο μεταφέρεται το υπόλοιπο της προηγούμενης'
);
select is(
  (select b.balance from authz.period_balance(current_setting('t.p3')::uuid, current_setting('t.reel')::uuid) b), 24,
  'Με επόμενη Περίοδο δεν μεταφέρεται το μεταφερόμενο παλαιότερο'
);

-- Αλλαγή Όρου μετά την υπογραφή: μόνο για το τεστ (χωρίς triggers του Κανόνα).
set local session_replication_role = 'replica';
update public.agreements set unused_provisions = 'accumulate' where id = current_setting('t.a2')::uuid;
set local session_replication_role = 'origin';
select is(
  (select b.balance from authz.period_balance(current_setting('t.p2')::uuid, current_setting('t.reel')::uuid) b), 22,
  'Με σώρευση η δεύτερη Περίοδος έχει το ίδιο υπόλοιπο με την επόμενη Περίοδο'
);
select is(
  (select b.balance from authz.period_balance(current_setting('t.p3')::uuid, current_setting('t.reel')::uuid) b), 34,
  'Με σώρευση μεταφέρονται όλα τα αχρησιμοποίητα των προηγούμενων Περιόδων'
);
set local session_replication_role = 'replica';
update public.agreements set unused_provisions = 'lost' where id = current_setting('t.a2')::uuid;
set local session_replication_role = 'origin';
select is(
  (select b.balance from authz.period_balance(current_setting('t.p2')::uuid, current_setting('t.reel')::uuid) b), 12,
  'Με απώλεια δεν μεταφέρεται τίποτα'
);
select is(
  (select b.balance from authz.period_balance(current_setting('t.p3')::uuid, current_setting('t.reel')::uuid) b), 12,
  'Με απώλεια η τρίτη Περίοδος έχει μόνο τις δικές της Παροχές'
);
set local session_replication_role = 'replica';
update public.agreements set unused_provisions = 'next_period' where id = current_setting('t.a2')::uuid;
set local session_replication_role = 'origin';
select is(
  (select b.balance from authz.period_balance(current_setting('t.p7')::uuid, current_setting('t.reel')::uuid) b), 12,
  'Η μερική τελευταία Περίοδος μεταφέρει και χωρίς Παροχές'
);
select is(
  (select (x ->> 'balance')::integer from jsonb_array_elements(public.production_view(current_setting('t.pm2')::uuid) -> 'balances') x where x ->> 'code' = 'reel'),
  10, 'Η σελίδα Παραγωγής δείχνει το υπόλοιπο της Περιόδου ανά είδος'
);

-- ───────────── Άρνηση: ανώνυμος ─────────────
set local role anon;
select throws_ok($$ select public.productions_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Παραγωγές');
select throws_ok($$ select public.production_view(current_setting('t.pm1')::uuid) $$, '42501', null, 'Ο ανώνυμος δεν βλέπει σελίδα Παραγωγής');
select throws_ok($$ select public.production_create_internal('Νέα', null) $$, '42501', null, 'Ο ανώνυμος δεν φτιάχνει Εσωτερική Παραγωγή');
select throws_ok($$ select public.production_deliver(current_setting('t.pm1')::uuid, 'Σχόλιο') $$, '42501', null, 'Ο ανώνυμος δεν παραδίδει');
select throws_ok($$ select public.production_reopen(current_setting('t.pm1')::uuid, 'Λόγος') $$, '42501', null, 'Ο ανώνυμος δεν ξανανοίγει');
select throws_ok($$ select public.production_cancel(current_setting('t.pm1')::uuid, 'Λόγος') $$, '42501', null, 'Ο ανώνυμος δεν ακυρώνει');
select throws_ok($$ select public.production_transfer(current_setting('t.pm1')::uuid, '00000000-0000-0000-0000-0000000000e2') $$, '42501', null, 'Ο ανώνυμος δεν μεταβιβάζει');
select throws_ok($$ select public.production_member_add(current_setting('t.pm1')::uuid, '00000000-0000-0000-0000-0000000000e2') $$, '42501', null, 'Ο ανώνυμος δεν προσθέτει Μέλος');
select throws_ok($$ select public.production_member_remove(current_setting('t.pm1')::uuid, '00000000-0000-0000-0000-0000000000e2') $$, '42501', null, 'Ο ανώνυμος δεν αφαιρεί Μέλος');
reset role;

-- ───────────── Άρνηση: Πωλήσεις (e3) ─────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok($$ select public.productions_view() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν Παραγωγές');
select throws_ok($$ select public.production_view(current_setting('t.pm1')::uuid) $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν σελίδα Παραγωγής');
select throws_ok($$ select public.production_create_internal('Νέα', null) $$, '42501', null, 'Οι Πωλήσεις δεν φτιάχνουν Εσωτερική Παραγωγή');
select throws_ok($$ select public.production_deliver(current_setting('t.pm1')::uuid, 'Σχόλιο') $$, '42501', null, 'Οι Πωλήσεις δεν παραδίδουν');
select throws_ok($$ select public.production_reopen(current_setting('t.pm1')::uuid, 'Λόγος') $$, '42501', null, 'Οι Πωλήσεις δεν ξανανοίγουν');
select throws_ok($$ select public.production_cancel(current_setting('t.pm1')::uuid, 'Λόγος') $$, '42501', null, 'Οι Πωλήσεις δεν ακυρώνουν');
select throws_ok($$ select public.production_transfer(current_setting('t.pm1')::uuid, '00000000-0000-0000-0000-0000000000e2') $$, '42501', null, 'Οι Πωλήσεις δεν μεταβιβάζουν');
select throws_ok($$ select public.production_member_add(current_setting('t.pm1')::uuid, '00000000-0000-0000-0000-0000000000e2') $$, '42501', null, 'Οι Πωλήσεις δεν προσθέτουν Μέλος');
select throws_ok($$ select public.production_member_remove(current_setting('t.pm1')::uuid, '00000000-0000-0000-0000-0000000000e2') $$, '42501', null, 'Οι Πωλήσεις δεν αφαιρούν Μέλος');

-- ───────────── Άρνηση: Παραγωγή (e2, «όσα με αφορούν») σε ξένη Παραγωγή ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select throws_ok($$ select public.production_view(current_setting('t.pm1')::uuid) $$, '42501', null, 'Η Παραγωγή δεν βλέπει ξένη Παραγωγή');
select throws_ok($$ select public.production_create_internal('Νέα', null) $$, '42501', null, 'Η Παραγωγή με Εύρος «όσα με αφορούν» δεν φτιάχνει Εσωτερική');
select throws_ok($$ select public.production_deliver(current_setting('t.pm1')::uuid, 'Σχόλιο') $$, '42501', null, 'Η Παραγωγή δεν παραδίδει ξένη Παραγωγή');
select throws_ok($$ select public.production_reopen(current_setting('t.pm1')::uuid, 'Λόγος') $$, '42501', null, 'Η Παραγωγή δεν ξανανοίγει ξένη Παραγωγή');
select throws_ok($$ select public.production_cancel(current_setting('t.pm1')::uuid, 'Λόγος') $$, '42501', null, 'Η Παραγωγή δεν ακυρώνει ξένη Παραγωγή');
select throws_ok($$ select public.production_transfer(current_setting('t.pm1')::uuid, '00000000-0000-0000-0000-0000000000e2') $$, '42501', null, 'Η Παραγωγή με Εύρος «όσα με αφορούν» δεν μεταβιβάζει');
select throws_ok($$ select public.production_member_add(current_setting('t.pm1')::uuid, '00000000-0000-0000-0000-0000000000e2') $$, '42501', null, 'Η Παραγωγή δεν προσθέτει Μέλος σε ξένη Παραγωγή');
select throws_ok($$ select public.production_member_remove(current_setting('t.pm1')::uuid, '00000000-0000-0000-0000-0000000000e2') $$, '42501', null, 'Η Παραγωγή δεν αφαιρεί Μέλος από ξένη Παραγωγή');

-- ───────────── Άρνηση: Πελάτης χωρίς σύνδεση με ομάδα (e6) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select throws_ok($$ select public.productions_view() $$, '42501', null, 'Ο Πελάτης χωρίς σύνδεση δεν βλέπει Παραγωγές');
select throws_ok($$ select public.production_view(current_setting('t.pm1')::uuid) $$, '42501', null, 'Ο Πελάτης χωρίς σύνδεση δεν βλέπει σελίδα');
select throws_ok($$ select public.production_create_internal('Νέα', null) $$, '42501', null, 'Ο Πελάτης δεν φτιάχνει Εσωτερική Παραγωγή');
select throws_ok($$ select public.production_deliver(current_setting('t.pm1')::uuid, 'Σχόλιο') $$, '42501', null, 'Ο Πελάτης δεν παραδίδει');
select throws_ok($$ select public.production_reopen(current_setting('t.pm1')::uuid, 'Λόγος') $$, '42501', null, 'Ο Πελάτης δεν ξανανοίγει');
select throws_ok($$ select public.production_cancel(current_setting('t.pm1')::uuid, 'Λόγος') $$, '42501', null, 'Ο Πελάτης δεν ακυρώνει');
select throws_ok($$ select public.production_transfer(current_setting('t.pm1')::uuid, '00000000-0000-0000-0000-0000000000e2') $$, '42501', null, 'Ο Πελάτης δεν μεταβιβάζει');
select throws_ok($$ select public.production_member_add(current_setting('t.pm1')::uuid, '00000000-0000-0000-0000-0000000000e2') $$, '42501', null, 'Ο Πελάτης δεν προσθέτει Μέλος');
select throws_ok($$ select public.production_member_remove(current_setting('t.pm1')::uuid, '00000000-0000-0000-0000-0000000000e2') $$, '42501', null, 'Ο Πελάτης δεν αφαιρεί Μέλος');

-- ───────────── Ιδιοκτήτης: Εσωτερικές και λίστα ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select is(jsonb_array_length(public.productions_view()), current_setting('t.m1')::int + 9, 'Ο Ιδιοκτήτης βλέπει όλες τις Παραγωγές');
select throws_ok($$ select public.productions_view('παράξενο') $$, 'P0001', 'Άγνωστη κατάσταση Παραγωγής', 'Άγνωστη κατάσταση στη λίστα');
select throws_ok($$ select public.production_view(null) $$, 'P0001', 'Η Παραγωγή δεν βρέθηκε', 'Η σελίδα χωρίς Παραγωγή (null)');
select throws_ok($$ select public.production_view(gen_random_uuid()) $$, 'P0001', 'Η Παραγωγή δεν βρέθηκε', 'Η σελίδα ανύπαρκτης Παραγωγής');
select set_config('t.pi1', public.production_create_internal('Showreel 2026', '00000000-0000-0000-0000-0000000000e2')::text, true);
select set_config('t.pi2', public.production_create_internal('Παλιό υλικό', null)::text, true);
select is(jsonb_array_length(public.productions_view(null, true)), 2, 'Οι Εσωτερικές φαίνονται στη λίστα του Ιδιοκτήτη');
select is(public.production_view(current_setting('t.pi2')::uuid) -> 'owner' ->> 'id', null, 'Η Εσωτερική Παραγωγή μπορεί να μείνει χωρίς υπεύθυνο');
select throws_ok($$ select public.production_create_internal('   ', null) $$, 'P0001', 'Η Παραγωγή θέλει τίτλο', 'Η Εσωτερική Παραγωγή θέλει τίτλο');
select throws_ok(
  $$ select public.production_create_internal('Νέα', gen_random_uuid()) $$, 'P0001', 'Ο Υπεύθυνος δεν βρέθηκε', 'Ο Υπεύθυνος ανύπαρκτος'
);
select throws_ok(
  $$ select public.production_create_internal('Νέα', '00000000-0000-0000-0000-0000000000e3') $$, 'P0001',
  'Ο Υπεύθυνος δεν έχει Δικαίωμα Παραγωγών', 'Ο Υπεύθυνος χωρίς Δικαίωμα Παραγωγών'
);
select is(
  (select count(*)::int from jsonb_array_elements(public.production_view(current_setting('t.pm2')::uuid) -> 'balances') x),
  2, 'Η κάρτα δείχνει ένα υπόλοιπο ανά είδος της Συμφωνίας'
);
select ok(public.production_view(current_setting('t.pm2')::uuid) -> 'viewerCan' ->> 'deliver' = 'true', 'Ο Ιδιοκτήτης βλέπει ότι μπορεί να παραδώσει ανοιχτή Παραγωγή');
select is(
  public.production_view(current_setting('t.pm1')::uuid) ->> 'owner', null,
  'Η Παραγωγή χωρίς υπεύθυνο δείχνει κενό Υπεύθυνο'
);

-- ───────────── Μεταβάσεις: παράδοση, επανάνοιγμα, ακύρωση ─────────────
select throws_ok($$ select public.production_deliver(current_setting('t.pm2')::uuid, '') $$, 'P0001', 'Η παράδοση θέλει σχόλιο: τι παραδόθηκε και πού', 'Η παράδοση χωρίς σχόλιο απορρίπτεται');
select throws_ok($$ select public.production_deliver(current_setting('t.pm2')::uuid, null) $$, 'P0001', 'Η παράδοση θέλει σχόλιο: τι παραδόθηκε και πού', 'Η παράδοση με κενό σχόλιο απορρίπτεται');
select lives_ok($$ select public.production_deliver(current_setting('t.pm2')::uuid, 'Παραδόθηκε στο drive') $$, 'Ο Ιδιοκτήτης παραδίδει με σχόλιο');
select is(public.production_view(current_setting('t.pm2')::uuid) ->> 'state', 'delivered', 'Η παραδομένη Παραγωγή έχει κατάσταση «παραδομένη»');
select throws_ok($$ select public.production_deliver(current_setting('t.pm2')::uuid, 'Ξανά') $$, 'P0001', 'Η Παραγωγή δεν είναι ανοιχτή', 'Δεν παραδίδεται δεύτερη φορά');
select throws_ok($$ select public.production_cancel(current_setting('t.pm2')::uuid, 'Λόγος') $$, 'P0001', 'Μόνο ανοιχτή Παραγωγή ακυρώνεται', 'Η παραδομένη Παραγωγή δεν ακυρώνεται');
select throws_ok($$ select public.production_reopen(current_setting('t.pm2')::uuid, '') $$, 'P0001', 'Η επανάνοιξη θέλει λόγο', 'Η επανάνοιξη χωρίς λόγο απορρίπτεται');
select lives_ok($$ select public.production_reopen(current_setting('t.pm2')::uuid, 'Αίτημα αλλαγής') $$, 'Ο Ιδιοκτήτης ξανανοίγει με λόγο');
select is(public.production_view(current_setting('t.pm2')::uuid) ->> 'state', 'open', 'Η ξανανοιγμένη Παραγωγή είναι ανοιχτή');
select throws_ok($$ select public.production_reopen(current_setting('t.pm2')::uuid, 'Λόγος') $$, 'P0001', 'Η Παραγωγή δεν είναι παραδομένη', 'Μόνο παραδομένη Παραγωγή ξανανοίγει');
select throws_ok($$ select public.production_cancel(current_setting('t.pm2')::uuid, '') $$, 'P0001', 'Η ακύρωση θέλει λόγο', 'Η ακύρωση χωρίς λόγο απορρίπτεται');
select lives_ok($$ select public.production_cancel(current_setting('t.pi2')::uuid, 'Δεν χρειάζεται πια') $$, 'Η ανοιχτή Παραγωγή χωρίς δουλειά ακυρώνεται');
select is(public.production_view(current_setting('t.pi2')::uuid) ->> 'state', 'cancelled', 'Η ακυρωμένη Παραγωγή έχει κατάσταση «ακυρωμένη»');
select throws_ok($$ select public.production_deliver(current_setting('t.pi2')::uuid, 'Σχόλιο') $$, 'P0001', 'Η Παραγωγή δεν είναι ανοιχτή', 'Η ακυρωμένη Παραγωγή δεν παραδίδεται');
select is(jsonb_array_length(public.productions_view('cancelled')), 1, 'Η λίστα «Όλες» δείχνει και τις ακυρωμένες');

-- Δουλειά: η Παραγωγή με δουλειά δεν ακυρώνεται.
reset role;
create or replace function authz.production_has_work(p_production uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select true; $$;
set local role authenticated;
select throws_ok($$ select public.production_cancel(current_setting('t.pm1')::uuid, 'Λόγος') $$, 'P0001', 'Η Παραγωγή έχει δουλειά και δεν ακυρώνεται', 'Η Παραγωγή με δουλειά δεν ακυρώνεται');
select ok(public.production_view(current_setting('t.pm1')::uuid) -> 'viewerCan' ->> 'cancel' = 'false', 'Με δουλειά το κουμπί ακύρωσης κλείνει');

-- ───────────── Μεταβίβαση Υπευθύνου (Π5) ─────────────
select lives_ok(
  $$ select public.production_transfer(current_setting('t.pm2')::uuid, '00000000-0000-0000-0000-0000000000e5') $$,
  'Ο Ιδιοκτήτης μεταβιβάζει σε Χρήστη με Δικαίωμα Παραγωγών'
);
select is(public.production_view(current_setting('t.pm2')::uuid) -> 'owner' ->> 'id', '00000000-0000-0000-0000-0000000000e5', 'Ο νέος Υπεύθυνος αποθηκεύεται');
select throws_ok($$ select public.production_transfer(current_setting('t.pm2')::uuid, '00000000-0000-0000-0000-0000000000e3') $$, 'P0001', 'Ο Υπεύθυνος δεν έχει Δικαίωμα Παραγωγών', 'Μεταβίβαση σε χωρίς Δικαίωμα απορρίπτεται');
select throws_ok($$ select public.production_transfer(current_setting('t.pm2')::uuid, null) $$, 'P0001', 'Η μεταβίβαση θέλει Υπεύθυνο', 'Η μεταβίβαση χωρίς Υπεύθυνο απορρίπτεται');
select throws_ok($$ select public.production_transfer(current_setting('t.pm2')::uuid, gen_random_uuid()) $$, 'P0001', 'Ο Υπεύθυνος δεν βρέθηκε', 'Μεταβίβαση σε ανύπαρκτο Χρήστη απορρίπτεται');
select throws_ok($$ select public.production_transfer(current_setting('t.pm2')::uuid, '00000000-0000-0000-0000-0000000000e5') $$, 'P0001', 'Η Παραγωγή έχει ήδη αυτόν τον Υπεύθυνο', 'Ο ίδιος Υπεύθυνος δεν μεταβιβάζεται ξανά');
select throws_ok($$ select public.production_transfer(gen_random_uuid(), '00000000-0000-0000-0000-0000000000e5') $$, 'P0001', 'Η Παραγωγή δεν βρέθηκε', 'Μεταβίβαση ανύπαρκτης Παραγωγής');
select throws_ok($$ select public.production_transfer(null, '00000000-0000-0000-0000-0000000000e5') $$, 'P0001', 'Η Παραγωγή δεν βρέθηκε', 'Μεταβίβαση χωρίς Παραγωγή');

-- ───────────── Μέλη (Π6) ─────────────
select lives_ok($$ select public.production_member_add(current_setting('t.pm2')::uuid, '00000000-0000-0000-0000-0000000000e2') $$, 'Ο Ιδιοκτήτης προσθέτει Μέλος');
select throws_ok($$ select public.production_member_add(current_setting('t.pm2')::uuid, '00000000-0000-0000-0000-0000000000e5') $$, 'P0001', 'Ο Υπεύθυνος είναι ήδη μέλος της Παραγωγής', 'Ο Υπεύθυνος δεν προστίθεται ως Μέλος');
select throws_ok($$ select public.production_member_add(current_setting('t.pm2')::uuid, '00000000-0000-0000-0000-0000000000e2') $$, 'P0001', 'Ο Χρήστης είναι ήδη μέλος της Παραγωγής', 'Το ίδιο Μέλος δεν μπαίνει δύο φορές');
select throws_ok($$ select public.production_member_add(current_setting('t.pm2')::uuid, null) $$, 'P0001', 'Ο Χρήστης δεν βρέθηκε', 'Μέλος χωρίς Χρήστη απορρίπτεται');
select throws_ok($$ select public.production_member_add(current_setting('t.pm2')::uuid, gen_random_uuid()) $$, 'P0001', 'Ο Χρήστης δεν βρέθηκε', 'Μέλος ανύπαρκτος Χρήστης απορρίπτεται');
select throws_ok($$ select public.production_member_add(gen_random_uuid(), '00000000-0000-0000-0000-0000000000e2') $$, 'P0001', 'Η Παραγωγή δεν βρέθηκε', 'Μέλος σε ανύπαρκτη Παραγωγή απορρίπτεται');
select throws_ok($$ select public.production_member_remove(current_setting('t.pm2')::uuid, '00000000-0000-0000-0000-0000000000e5') $$, 'P0001', 'Ο Υπεύθυνος δεν αφαιρείται· μεταβίβασε πρώτα την Παραγωγή', 'Ο Υπεύθυνος δεν αφαιρείται');
select throws_ok($$ select public.production_member_remove(current_setting('t.pm2')::uuid, '00000000-0000-0000-0000-0000000000e4') $$, 'P0001', 'Ο Χρήστης δεν είναι μέλος της Παραγωγής', 'Αφαίρεση μη μέλους απορρίπτεται');

-- Το Μέλος βλέπει τη Μέλος Παραγωγή· μετά την αφαίρεση δεν τη βλέπει.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select is(jsonb_array_length(public.productions_view()), 8, 'Το Μέλος βλέπει όσες του αφορούν: 6 με Υπεύθυνο, την Εσωτερική και την Παραγωγή που μέλος');
select ok(public.production_view(current_setting('t.pm2')::uuid) -> 'viewerCan' ->> 'deliver' = 'true', 'Το Μέλος μπορεί να παραδώσει Παραγωγή που μέλος');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select lives_ok($$ select public.production_member_remove(current_setting('t.pm2')::uuid, '00000000-0000-0000-0000-0000000000e2') $$, 'Ο Ιδιοκτήτης αφαιρεί Μέλος');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select is(jsonb_array_length(public.productions_view()), 7, 'Η αφαίρεση κόβει αμέσως την πρόσβαση');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

-- ───────────── Πελάτης με σύνδεση (υπάρχει μόνο στο τεστ) ─────────────
reset role;
create or replace function authz.client_user_client_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select current_setting('t.client_f1')::uuid; $$;
set local role authenticated;
select set_config('t.client_f1', '00000000-0000-0000-0000-0000000000f1', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select is(jsonb_array_length(public.productions_view()), current_setting('t.m1')::int + 8, 'Ο Πελάτης βλέπει μόνο τις Παραγωγές του');
select is(jsonb_array_length(public.productions_view(null, true)), 0, 'Ο Πελάτης δεν βλέπει Εσωτερικές');
select throws_ok($$ select public.production_view(current_setting('t.pi1')::uuid) $$, '42501', null, 'Ο Πελάτης δεν βλέπει Εσωτερική Παραγωγή');
select throws_ok($$ select public.production_view(current_setting('t.pa5')::uuid) $$, '42501', null, 'Ο Πελάτης δεν βλέπει Παραγωγή άλλου Πελάτη');
select is(public.production_view(current_setting('t.pa3')::uuid) ->> 'members', '[]', 'Ο Πελάτης δεν βλέπει Μέλη');
select is(public.production_view(current_setting('t.pa3')::uuid) -> 'history', '[]'::jsonb, 'Ο Πελάτης δεν βλέπει Ιστορικό');
select is(public.production_view(current_setting('t.pa3')::uuid) -> 'owner' ->> 'id', null, 'Ο Πελάτης βλέπει μόνο το όνομα του Υπευθύνου');
select is(public.production_view(current_setting('t.pa3')::uuid) -> 'owner' ->> 'name', 'Νίκος', 'Ο Πελάτης βλέπει το όνομα του Υπευθύνου');
select throws_ok($$ select public.production_deliver(current_setting('t.pa3')::uuid, 'Σχόλιο') $$, '42501', null, 'Ο Πελάτης δεν παραδίδει ακόμα και με σύνδεση');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

-- ───────────── Ίχνος και γεγονότα ─────────────
select ok(jsonb_array_length(public.production_view(current_setting('t.pm2')::uuid) -> 'history') > 0, 'Η σελίδα δείχνει το ιστορικό από το Ίχνος');
reset role;
select is((select count(*)::int from public.audit_log where entity = 'productions' and entity_id = current_setting('t.pm2') and after ->> 'event' = 'delivered'), 1, 'Η παράδοση γράφει γεγονός');
select is((select count(*)::int from public.audit_log where entity = 'productions' and entity_id = current_setting('t.pm2') and after ->> 'event' = 'reopened'), 1, 'Η επανάνοιξη γράφει γεγονός με λόγο');
select is((select count(*)::int from public.audit_log where entity = 'productions' and entity_id = current_setting('t.pm2') and after ->> 'event' = 'owner_transferred'), 1, 'Η μεταβίβαση γράφει γεγονός');
select is((select count(*)::int from public.audit_log where entity = 'productions' and entity_id = current_setting('t.pm2') and after ->> 'event' = 'member_added'), 1, 'Η προσθήκη Μέλους γράφει γεγονός');
select is((select count(*)::int from public.audit_log where entity = 'productions' and entity_id = current_setting('t.pm2') and after ->> 'event' = 'member_removed'), 1, 'Η αφαίρεση Μέλους γράφει γεγονός');
select is((select count(*)::int from public.audit_log where entity = 'productions' and entity_id = current_setting('t.pi2') and after ->> 'event' = 'cancelled'), 1, 'Η ακύρωση γράφει γεγονός');
select is(
  (select count(*)::int from public.audit_log where entity = 'productions' and action = 'event' and after ->> 'event' = 'created'),
  current_setting('t.m1')::int + 11, 'Κάθε Παραγωγή γράφει γεγονός «δημιουργήθηκε»'
);
select is(
  (select count(*)::int from public.audit_log where entity = 'agreement_periods' and action = 'insert'),
  (select count(*)::int from public.agreement_periods), 'Κάθε Περίοδος γράφει εγγραφή στο Ίχνος'
);

-- ───────────── Κλειστοί πίνακες και κανόνες ─────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select throws_ok($$ select * from public.productions $$, '42501', null, 'Ο πίνακας Παραγωγών δεν διαβάζεται απευθείας');
select throws_ok($$ select * from public.agreement_periods $$, '42501', null, 'Ο πίνακας Περιόδων δεν διαβάζεται απευθείας');
select throws_ok($$ select * from public.production_members $$, '42501', null, 'Ο πίνακας Μελών δεν διαβάζεται απευθείας');
reset role;
select throws_ok(
  format($$ delete from public.productions where id = %L $$, current_setting('t.pm2')), 'P0001', 'Οι Παραγωγές δεν σβήνονται, ακυρώνονται', 'Η Παραγωγή δεν σβήνεται'
);
select throws_ok(
  format($$ update public.agreement_periods set n = 99 where id = %L $$, current_setting('t.p1')), 'P0001', 'Οι Περίοδοι και οι Παροχές τους δεν αλλάζουν', 'Η Περίοδος δεν αλλάζει'
);
select throws_ok(
  format($$ insert into public.productions (title, client_id, agreement_id) values ('Χ', %L, %L) $$,
    '00000000-0000-0000-0000-0000000000f2', current_setting('t.a3')), 'P0001',
  'Ο Πελάτης της Παραγωγής δεν είναι της Συμφωνίας της', 'Η Παραγωγή παίρνει Πελάτη της Συμφωνίας της'
);
select throws_ok(
  format($$ insert into public.productions (title, client_id, agreement_id) values ('Χ', %L, %L) $$,
    '00000000-0000-0000-0000-0000000000f1', current_setting('t.a2')), 'P0001',
  'Η μηνιαία Συμφωνία θέλει Περίοδο για κάθε Παραγωγή', 'Η μηνιαία Παραγωγή χωρίς Περίοδο απορρίπτεται'
);
select throws_ok(
  format($$ insert into public.productions (title, client_id) values ('Χ', %L) $$, '00000000-0000-0000-0000-0000000000f1'), '23514', null,
  'Η Παραγωγή με Πελάτη και χωρίς Συμφωνία απορρίπτεται'
);

select * from finish();
rollback;
