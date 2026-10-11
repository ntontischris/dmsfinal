-- Τιμολογητέα (Iβ, #151): γεννήτρια (μηνιαία, δόσεις, έξτρα, ρήτρα λύσης), δικαιώματα και «Προς τιμολόγηση».
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή. Οι ημερομηνίες είναι σχετικές με το «σήμερα» της Αθήνας:
-- η μηνιαία Συμφωνία αρχίζει στις 15 του προηγούμενου μήνα, οπότε η 2η Περίοδος είναι ο τρέχων μήνας.
begin;
select plan(26);

-- ───────────── Χρήστες, Πελάτες, Κατάλογος ─────────────
-- e1 Ιδιοκτήτης · e2 Παραγωγή (χωρίς ποσά) · e3 Πωλήσεις (χωρίς Οικονομικά) · e4 Λογιστής (ανάγνωση) · e6 χωρίς ομάδα
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'client@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'Ελένη', 'accountant@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e2', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000e3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000e4', 'Λογιστής')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

select set_config('t.today', (now() at time zone 'Europe/Athens')::date::text, true);

insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'Καφέ Αθηνά', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@athina.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-0000000000f2', 'Γυμναστήριο Κίνηση', '', 'Αθήνα', null, 'Νίκος Κίνης', 'nikos@kinisi.example.gr', '210 2222222', '00000000-0000-0000-0000-0000000000e3');

insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select o.id, o.client_id, o.title,
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000e3', 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3
  from (values
    ('00000000-0000-0000-0000-0000000000c1'::uuid, '00000000-0000-0000-0000-0000000000f1'::uuid, 'Μηνιαίο Αθηνά'),
    ('00000000-0000-0000-0000-0000000000c2'::uuid, '00000000-0000-0000-0000-0000000000f1'::uuid, 'Εφάπαξ Αθηνά'),
    ('00000000-0000-0000-0000-0000000000c3'::uuid, '00000000-0000-0000-0000-0000000000f2'::uuid, 'Μηνιαίο Κίνηση'),
    ('00000000-0000-0000-0000-0000000000c4'::uuid, '00000000-0000-0000-0000-0000000000f2'::uuid, 'Λυμένο Κίνηση')
  ) as o (id, client_id, title);

-- Μηνιαίο πακέτο 1.000 €, εφάπαξ πακέτο 2.400 €, και Υπηρεσία «έξτρα reel» 150 € που δίνει μόνο reel.
insert into public.catalogue_items (id, kind, billing, name, name_en, unit, retired_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'package', 'monthly', 'Μηνιαίο πακέτο (τεστ)', 'Monthly (test)', '', null),
  ('00000000-0000-0000-0000-0000000000d9', 'package', 'one_off', 'Εφάπαξ πακέτο (τεστ)', 'One-off (test)', '', null),
  ('00000000-0000-0000-0000-0000000000d8', 'service', null, 'Έξτρα reel (τεστ)', 'Extra reel (test)', '', null);
insert into public.catalogue_item_amounts (item_id, price) values
  ('00000000-0000-0000-0000-0000000000d1', 1000),
  ('00000000-0000-0000-0000-0000000000d9', 2400),
  ('00000000-0000-0000-0000-0000000000d8', 150);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost) values
  ('00000000-0000-0000-0000-0000000000d1', 6, 14, 0),
  ('00000000-0000-0000-0000-0000000000d9', 6, 14, 0),
  ('00000000-0000-0000-0000-0000000000d8', 0, 0, 0);
insert into public.catalogue_item_provisions (item_id, kind_id, quantity)
select p.item_id::uuid, k.id, p.qty
  from (values
    ('00000000-0000-0000-0000-0000000000d1', 'shoot', 2),
    ('00000000-0000-0000-0000-0000000000d9', 'shoot', 2),
    ('00000000-0000-0000-0000-0000000000d8', 'reel', 1)
  ) as p (item_id, code, qty)
  join public.provision_kinds k on k.code = p.code;
insert into public.cost_months (month, expenses_total, productive_hours)
values (date_trunc('month', now() at time zone 'Europe/Athens')::date, 8800, 220);

create function public.t_pk(p_code text) returns uuid
language sql stable
as $$ select k.id from public.provision_kinds k where k.code = p_code; $$;

-- ───────────── Μηνιαία Συμφωνία Αθηνά: δύο Περίοδοι γράφονται ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);

select set_config('t.a', public.agreement_create('00000000-0000-0000-0000-0000000000c1', 'monthly', 'Μηνιαίο Αθηνά')::text, true);
select public.agreement_update_basics(current_setting('t.a')::uuid, 'Μηνιαίο Αθηνά', 'el', current_setting('t.today')::date + 5, null, 2);
select public.agreement_set_money_terms(current_setting('t.a')::uuid, 10, 2, 0);
select public.agreement_add_catalogue_line(current_setting('t.a')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_set_recipients(current_setting('t.a')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a')::uuid, current_setting('t.today')::date, 'Μαρία Παπαδάκη',
  (date_trunc('month', current_setting('t.today')::date) - interval '1 month' + interval '14 days')::date, 'contract-a.pdf');

select is(public.billables_generate(), 2, 'Μηνιαία με 3 Περιόδους, με τον τρέχοντα μήνα τη 2η: η γεννήτρια γράφει 2');
select is(public.billables_generate(), 0, 'Η δεύτερη κλήση δεν γράφει τίποτα');
select is(
  (select min(b.net) from public.billables b where b.agreement_id = current_setting('t.a')::uuid),
  round(900 * (extract(day from (date_trunc('month', current_setting('t.today')::date) - interval '1 day')) - 14)
        / extract(day from (date_trunc('month', current_setting('t.today')::date) - interval '1 day')), 2),
  'Η σπασμένη πρώτη Περίοδος είναι αναλογική (17/31 της εκπτωμένης τιμής στον Μάρτιο)'
);
select is(
  (select max(b.net) from public.billables b where b.agreement_id = current_setting('t.a')::uuid),
  900::numeric, 'Η έκπτωση πρώτων μηνών εφαρμόζεται (900 € αντί για 1.000 €)'
);

-- ───────────── Μηνιαία με μηνύματα «τιμολογήθηκε εκτός» ─────────────
select set_config('t.b', public.agreement_create('00000000-0000-0000-0000-0000000000c3', 'monthly', 'Μηνιαίο Κίνηση')::text, true);
select public.agreement_update_basics(current_setting('t.b')::uuid, 'Μηνιαίο Κίνηση', 'el', current_setting('t.today')::date + 5, null, 2);
select public.agreement_add_catalogue_line(current_setting('t.b')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_set_recipients(current_setting('t.b')::uuid, '[{"name":"Νίκος Κίνης","email":"nikos@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.b')::uuid, current_setting('t.today')::date, 'Νίκος Κίνης',
  (date_trunc('month', current_setting('t.today')::date) - interval '1 month' + interval '14 days')::date, 'contract-b.pdf', '[]'::jsonb, true);
select is(public.billables_generate(), 1, 'Τον τρέχοντα μήνα «τιμολογήθηκε εκτός»: η Περίοδος δεν γεννά Τιμολογητέο, η προηγούμενη ναι');
select is(
  (select count(*)::int from public.billables b where b.agreement_id = current_setting('t.b')::uuid), 1,
  'Η Συμφωνία με τιμολογημένο μήνα έχει μόνο το Τιμολογητέο του προηγούμενου μήνα'
);

-- ───────────── Εφάπαξ Συμφωνία: δόση υπογραφής, έξτρα, δόση παράδοσης ─────────────
select set_config('t.ao', public.agreement_create('00000000-0000-0000-0000-0000000000c2', 'one_off', 'Εφάπαξ Αθηνά')::text, true);
select public.agreement_update_basics(current_setting('t.ao')::uuid, 'Εφάπαξ Αθηνά', 'el', current_setting('t.today')::date + 5, null, null);
select public.agreement_add_catalogue_line(current_setting('t.ao')::uuid, '00000000-0000-0000-0000-0000000000d9', 1);
select public.agreement_set_milestones(current_setting('t.ao')::uuid,
  '[{"trigger":"signature","percent":50},{"trigger":"delivered","percent":50}]'::jsonb);
select public.agreement_set_recipients(current_setting('t.ao')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.ao')::uuid, current_setting('t.today')::date, 'Μαρία Παπαδάκη',
  current_setting('t.today')::date, 'one-off.pdf');
select set_config('t.pao', (select pr.id::text from public.productions pr
                             where pr.agreement_id = current_setting('t.ao')::uuid and pr.period_id is null), true);

select public.deliverable_create(current_setting('t.pao')::uuid, public.t_pk('reel'), 'Έξτρα reel', null, null, 'pending', null);
select set_config('t.dx', (select d.id::text from public.deliverables d where d.production_id = current_setting('t.pao')::uuid and d.title = 'Έξτρα reel'), true);
select is((select d.charge from public.deliverables d where d.id = current_setting('t.dx')::uuid), 'pending', 'Χωρίς υπόλοιπο Παροχής το Παραδοτέο μένει σε απόφαση');
select public.deliverable_charge_decide(current_setting('t.dx')::uuid, 'charged', null);

select is(public.billables_generate(), 2, 'Η υπογραφή γεννά τη δόση 50% και η χρέωση του έξτρα γεννά Τιμολογητέο');
select is(
  (select b.net from public.billables b where b.reason = 'milestone' and b.agreement_id = current_setting('t.ao')::uuid),
  1200::numeric, 'Η δόση υπογραφής είναι 50% του συνόλου της Συμφωνίας (1.200 €)'
);
select is(
  (select b.net from public.billables b where b.reason = 'extra_deliverable' and b.source_id = current_setting('t.dx')::uuid),
  150::numeric, 'Το έξτρα Παραδοτέο παίρνει την τιμή της Υπηρεσίας Καταλόγου (150 €)'
);

select public.production_deliver(current_setting('t.pao')::uuid, 'Παραδόθηκε στον πελάτη');
select is(public.billables_generate(), 1, 'Η παράδοση της Παραγωγής γεννά τη δεύτερη δόση');
select is(
  (select b.label from public.billables b where b.reason = 'milestone' and b.agreement_id = current_setting('t.ao')::uuid
     and b.label like '%παράδοσης%'),
  'Δόση παράδοσης 50%', 'Η δεύτερη δόση έχει ετικέτα «Δόση παράδοσης 50%»'
);

-- ───────────── Εσωτερική Παραγωγή: τίποτα ─────────────
select set_config('t.pi', public.production_create_internal('Εσωτερική τεστ', '00000000-0000-0000-0000-0000000000e1')::text, true);
set session_replication_role = replica;
insert into public.deliverables (production_id, kind_id, title, charge)
values (current_setting('t.pi')::uuid, public.t_pk('reel'), 'Εσωτερικό reel', 'charged');
reset session_replication_role;
select is(public.billables_generate(), 0, 'Η Εσωτερική Παραγωγή με χρέωση δεν γεννά Τιμολογητέο');
select is(
  (select count(*)::int from public.billables b join public.deliverables d on d.id = b.source_id
    where d.production_id = current_setting('t.pi')::uuid), 0,
  'Καμία γραμμή Τιμολογητέου για την Εσωτερική Παραγωγή'
);

-- ───────────── Ρήτρα λύσης ─────────────
select set_config('t.d', public.agreement_create('00000000-0000-0000-0000-0000000000c4', 'monthly', 'Λυμένο Κίνηση')::text, true);
select public.agreement_update_basics(current_setting('t.d')::uuid, 'Λυμένο Κίνηση', 'el', current_setting('t.today')::date + 5, null, 2);
select public.agreement_set_money_terms(current_setting('t.d')::uuid, 0, 0, 150);
select public.agreement_add_catalogue_line(current_setting('t.d')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_set_recipients(current_setting('t.d')::uuid, '[{"name":"Νίκος Κίνης","email":"nikos@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.d')::uuid, current_setting('t.today')::date, 'Νίκος Κίνης',
  current_setting('t.today')::date, 'contract-d.pdf');
set session_replication_role = replica;
update public.agreements set state = 'dissolved' where id = current_setting('t.d')::uuid;
reset session_replication_role;
select is(public.billables_generate(), 1, 'Λυμένη Συμφωνία με ρήτρα γεννά μόνο τη ρήτρα λύσης');
select is(
  (select b.net from public.billables b where b.reason = 'dissolution_fee' and b.agreement_id = current_setting('t.d')::uuid),
  150::numeric, 'Η ρήτρα λύσης είναι 150 €'
);

-- ───────────── Δικαιώματα: γεννήτρια μόνο service_role ─────────────
set local role anon;
select throws_ok($$ select public.billables_generate() $$, '42501', null, 'Ο ανώνυμος δεν τρέχει τη γεννήτρια');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.billables_generate() $$, '42501', null, 'Ο πελάτης δεν τρέχει τη γεννήτρια');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.billables_generate() $$, '42501', null, 'Οι Πωλήσεις δεν τρέχουν τη γεννήτρια');
reset role;

-- ───────────── Δικαιώματα: «Προς τιμολόγηση» ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.billables_view() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν το «Προς τιμολόγηση»');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.billables_view() $$, '42501', null, 'Η Παραγωγή δεν βλέπει το «Προς τιμολόγηση»');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.billables_view() $$, '42501', null, 'Ο πελάτης δεν βλέπει το «Προς τιμολόγηση»');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select count(*) from public.billables $$, '42501', null, 'Ο πίνακας Τιμολογητέων δεν διαβάζεται από την εφαρμογή');
reset role;

-- ───────────── Ο Λογιστής διαβάζει τα σωστά αθροίσματα ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
set local role authenticated;
select is(
  (public.billables_view()->>'total')::numeric, (select sum(b.net) from public.billables b),
  'Ο Λογιστής βλέπει σύνολο ανοιχτών Τιμολογητέων ίσο με το άθροισμα (καμία κάλυψη)'
);
select is(
  (public.billables_view()->>'count')::int, (select count(*)::int from public.billables b),
  'Το πλήθος του «Προς τιμολόγηση» ταιριάζει με τις γραμμές'
);
select ok(
  (public.billables_view()->'clients'->0->>'oldestDays')::int >= (public.billables_view()->'clients'->1->>'oldestDays')::int,
  'Οι Πελάτες ταξινομούνται κατά τις παλαιότερες μέρες, φθίνουσα'
);
reset role;

select * from finish();
rollback;
