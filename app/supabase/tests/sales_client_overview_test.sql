-- Πλούσια λίστα Πελατών (B1): public.sales_client_overview. Γραμμή μόνο για Πελάτη που ανοίγεις, Κατάσταση για όλους
-- όσοι τον ανοίγουν, κάθε άλλο πεδίο με το Δικαίωμα του module του (Συμφωνίες, Γυρίσματα, Οικονομικά, Ευκαιρίες).
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Όλες οι ημερομηνίες είναι σταθερές και η ώρα περνά ως p_now,
-- άρα το τεστ δεν εξαρτάται από τη μέρα εκτέλεσης. Οι κλειστοί πίνακες δεν διαβάζονται ποτέ ως authenticated.
begin;
select plan(42);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Λογιστής · a3 Πωλήσεις (Υπεύθυνος c1, c2, c3) · a4 Πωλήσεις (Υπεύθυνος c4)
-- a5 «Μόνο Πελάτες (τεστ)»: βλέπει όλους τους Πελάτες, τίποτα άλλο
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'sales2@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'viewer@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ελένη', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Δημήτρης', 'sales2@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'Μαρίνα', 'viewer@example.com');
insert into public.roles (name, description, kind, is_owner, is_builtin)
values ('Μόνο Πελάτες (τεστ)', 'Τεστ: βλέπει μόνο Πελάτες.', 'team', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'clients.view', 'all' from public.roles r where r.name = 'Μόνο Πελάτες (τεστ)';
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a4', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a5', 'Μόνο Πελάτες (τεστ)')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- c1 ενεργός · c2 ανενεργός (Συμφωνία που έληξε) · c3 υποψήφιος (καμία Συμφωνία) · c4 άλλου πωλητή
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Ένα', 'Μαρία Παπαδάκη', 'one@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Δύο', 'Νίκος Κίνης', 'two@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c3', 'Πελάτης Τρία', 'Ελένη Τρίτη', 'three@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c4', 'Πελάτης Τέσσερα', 'Πέτρος Δ', 'four@example.com', '00000000-0000-0000-0000-0000000000a4');

-- ───────────── Δεδομένα (άμεσες εγγραφές, χωρίς triggers, άρα χωρίς γραμμές με το πραγματικό now()) ─────────────
-- Συμφωνία f1 του c1: μηνιαία, ενεργή, «στην επόμενη Περίοδο». Περίοδοι Φεβρουάριος και Μάρτιος 2026, Γύρισμα 2 + reel 4.
-- Μάρτιος: 1 Γύρισμα έγινε, 2 κλεισμένα (αναμένει έγκριση 15/3, προγραμματισμένο 20/3), 1 ακυρωμένο 12/3.
-- Καρτέλα c1: Τιμολόγιο 1.612 − πιστωτικό 124 − Είσπραξη 500 = 988 € (ένα ακυρωμένο Τιμολόγιο και μία διαγραμμένη Είσπραξη δεν μετρούν).
set local session_replication_role = replica;
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select x.id::uuid, x.client_id::uuid, x.title,
       (select s.id from public.sales_stages s where s.code = 'proposal'), (select s.id from public.sales_sources s where s.code = 'phone'),
       x.manager_id::uuid, 'Επόμενο', date '2027-06-01'
  from (values
    ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο Ένα', '00000000-0000-0000-0000-0000000000a3'),
    ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c2', 'Μηνιαίο Δύο', '00000000-0000-0000-0000-0000000000a3'),
    ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000c3', 'Πρώτη επαφή', '00000000-0000-0000-0000-0000000000a3'),
    ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000c4', 'Άλλου πωλητή', '00000000-0000-0000-0000-0000000000a4')
  ) as x (id, client_id, title, manager_id);
insert into public.opportunity_activities (opportunity_id, client_id, occurred_at, actor_id, kind_id, event, body) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', timestamptz '2026-02-01 10:00+00',
   '00000000-0000-0000-0000-0000000000a3', (select k.id from public.sales_activity_kinds k where k.code = 'call'), null, 'Κλήση'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', timestamptz '2026-03-01 10:00+00',
   '00000000-0000-0000-0000-0000000000a3', null, 'stage_changed', '');

insert into public.catalogue_items (id, kind, billing, name, name_en, unit) values
  ('00000000-0000-0000-0000-0000000000d9', 'package', 'monthly', 'Πακέτο Τεστ', 'Test package', '');
insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, start_on, duration_months, end_on,
                               payment_days, unused_provisions, renewal, filming_notice_hours, filming_cancel_hours,
                               late_cancel_burns, no_show_burns, signed_at)
values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'monthly', 'Μηνιαίο Ένα', 'active', 'signed',
   date '2026-01-01', date '2026-02-01', 12, date '2027-01-31', 15, 'next_period', 'new_opportunity', 48, 48, false, false,
   timestamptz '2026-01-20 10:00+00'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e2', 'monthly', 'Μηνιαίο Δύο', 'expired', 'signed',
   date '2024-12-01', date '2025-01-01', 12, date '2025-12-31', 15, 'lost', 'new_opportunity', 48, 48, false, false,
   timestamptz '2024-12-20 10:00+00');
insert into public.agreement_lines (id, agreement_id, position, line_kind, item_id, description, quantity, catalog_provisions) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 1, 'package',
   '00000000-0000-0000-0000-0000000000d9', 'Πακέτο Τεστ', 1, '[]'::jsonb),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000f2', 1, 'package',
   '00000000-0000-0000-0000-0000000000d9', 'Πακέτο Τεστ', 1, '[]'::jsonb);
insert into public.agreement_line_provisions (line_id, kind_id, quantity)
select x.id::uuid, k.id, x.qty
  from (values ('00000000-0000-0000-0000-0000000000b1', 'shoot', 2), ('00000000-0000-0000-0000-0000000000b1', 'reel', 4),
               ('00000000-0000-0000-0000-0000000000b2', 'shoot', 2)) as x (id, code, qty)
  join public.provision_kinds k on k.code = x.code;
insert into public.agreement_periods (id, agreement_id, n, starts, ends, is_partial, gives_provisions) values
  ('00000000-0000-0000-0000-000000000a11', '00000000-0000-0000-0000-0000000000f1', 1, date '2026-02-01', date '2026-02-28', false, true),
  ('00000000-0000-0000-0000-000000000a12', '00000000-0000-0000-0000-0000000000f1', 2, date '2026-03-01', date '2026-03-31', false, true);
insert into public.agreement_period_provisions (period_id, kind_id, given)
select p.id::uuid, k.id, x.qty
  from (values ('shoot', 2), ('reel', 4)) as x (code, qty)
  join public.provision_kinds k on k.code = x.code
  cross join (values ('00000000-0000-0000-0000-000000000a11'), ('00000000-0000-0000-0000-000000000a12')) as p (id);
insert into public.productions (id, title, client_id, agreement_id, period_id, owner_id, state) values
  ('00000000-0000-0000-0000-0000000000d1', 'Μηνιαίο Μάρτιος', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000a12', '00000000-0000-0000-0000-0000000000a1', 'open');
insert into public.filmings (id, production_id, period_id, client_id, kind_id, starts_at, hours, actual_hours, origin, state,
                             approved_at, done_at, cancelled_at, cancelled_side)
select x.id::uuid, '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000a12',
       '00000000-0000-0000-0000-0000000000c1', (select k.id from public.provision_kinds k where k.code = 'shoot'),
       x.starts_at, 2, x.actual_hours, 'team', x.state, x.approved_at, x.done_at, x.cancelled_at, x.cancelled_side
  from (values
    ('00000000-0000-0000-0000-00000000f001', timestamptz '2026-03-03 10:00 Europe/Athens', 2::numeric, 'done',
     timestamptz '2026-02-25 10:00+00', timestamptz '2026-03-03 14:00+00', null::timestamptz, null),
    ('00000000-0000-0000-0000-00000000f002', timestamptz '2026-03-15 10:00 Europe/Athens', null, 'pending',
     null, null, null, null),
    ('00000000-0000-0000-0000-00000000f003', timestamptz '2026-03-20 10:00 Europe/Athens', null, 'scheduled',
     timestamptz '2026-03-01 10:00+00', null, null, null),
    ('00000000-0000-0000-0000-00000000f004', timestamptz '2026-03-12 10:00 Europe/Athens', null, 'cancelled',
     null, null, timestamptz '2026-03-02 10:00+00', 'team')
  ) as x (id, starts_at, actual_hours, state, approved_at, done_at, cancelled_at, cancelled_side);

insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, credit_for, pdf_path,
                             voided_at, void_reason) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'T-1', date '2026-02-05',
   date '2026-02-20', 1300, 312, 1612, null, 'test/overview-1.pdf', null, null),
  ('00000000-0000-0000-0000-0000000001a2', '00000000-0000-0000-0000-0000000000c1', 'credit', 'T-2', date '2026-02-10',
   null, 100, 24, 124, '00000000-0000-0000-0000-0000000001a1', 'test/overview-2.pdf', null, null),
  ('00000000-0000-0000-0000-0000000001a3', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'T-3', date '2026-02-11',
   date '2026-02-25', 100, 0, 100, null, 'test/overview-3.pdf', timestamptz '2026-02-12 10:00+00', 'Λάθος καταχώριση');
insert into public.receipts (client_id, received_on, amount, method_id, note, deleted_at, delete_reason)
select '00000000-0000-0000-0000-0000000000c1', x.received_on, x.amount,
       (select m.id from public.payment_methods m where m.label = 'Τραπεζική κατάθεση'), '', x.deleted_at, x.delete_reason
  from (values (date '2026-02-15', 500::numeric, null::timestamptz, null),
               (date '2026-02-16', 300::numeric, timestamptz '2026-02-17 10:00+00', 'Λάθος ποσό'))
       as x (received_on, amount, deleted_at, delete_reason);
set local session_replication_role = origin;

-- ───────────── Βοηθητικά (ως postgres, ποτέ ως authenticated) ─────────────
create function public.t_ov(p_user text) returns setof jsonb
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_user), true);
  return query
    select to_jsonb(o)
      from public.sales_client_overview(
             array['00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2',
                   '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c4',
                   '00000000-0000-0000-0000-00000000ffff']::uuid[],
             timestamptz '2026-03-10 12:00 Europe/Athens') o;
end;
$$;

create function public.t_row(p_user text, p_client text) returns jsonb
language sql
as $$
  select r from public.t_ov(p_user) r where r ->> 'client_id' = '00000000-0000-0000-0000-0000000000' || p_client;
$$;

-- Η Παροχή ενός είδους, χωρίς το id (για σύγκριση με το αναμενόμενο).
create function public.t_prov(p_user text, p_client text, p_code text) returns jsonb
language sql
as $$
  select e - 'kind_id' from jsonb_array_elements(public.t_row(p_user, p_client) -> 'provisions') e where e ->> 'code' = p_code;
$$;

create function public.t_expected(p_code text, p_given numeric, p_carried numeric, p_used numeric, p_reserved numeric)
returns jsonb
language sql
as $$
  select jsonb_build_object('code', k.code, 'unit', k.unit, 'is_shoot', k.measure is not null,
                            'given', p_given, 'carried', p_carried, 'used', p_used, 'reserved', p_reserved)
    from public.provision_kinds k where k.code = p_code;
$$;

-- ───────────── Άρνηση και δικαιώματα εκτέλεσης ─────────────
set local role anon;
select throws_ok($$ select * from public.sales_client_overview(array[]::uuid[]) $$, '42501', null, 'Ο ανώνυμος δεν καλεί τη λίστα');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select * from public.sales_client_overview(array['00000000-0000-0000-0000-0000000000c1']::uuid[]) $$,
  'Η εφαρμογή (authenticated) καλεί τη λίστα');
select throws_ok(
  $$ select * from public.sales_client_overview(array(select gen_random_uuid() from generate_series(1, 101))) $$,
  'P0001', null, 'Πάνω από 100 Πελάτες τη φορά απορρίπτονται'
);
reset role;

select is(
  (select count(*)::int from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'authz' and p.proname in ('client_overview_provisions', 'client_overview_balance_cents')
      and (pg_catalog.has_function_privilege('anon', p.oid, 'execute')
           or pg_catalog.has_function_privilege('authenticated', p.oid, 'execute'))),
  0, 'Οι βοηθητικές authz.* δεν εκτελούνται από anon ή authenticated'
);

-- ───────────── Ιδιοκτήτης: όλα ─────────────
select is((select count(*)::int from public.t_ov('a1')), 4, 'Ιδιοκτήτης: τέσσερις γραμμές, καμία για ανύπαρκτο Πελάτη');
select is(public.t_row('a1', 'c1') ->> 'status', 'active', 'Ενεργή Συμφωνία ή ανοιχτή Παραγωγή → ενεργός');
select is(public.t_row('a1', 'c2') ->> 'status', 'inactive', 'Υπογεγραμμένη στο παρελθόν, τίποτα τώρα → ανενεργός');
select is(public.t_row('a1', 'c3') ->> 'status', 'candidate', 'Καμία υπογεγραμμένη Συμφωνία → υποψήφιος');
select is((public.t_row('a1', 'c1') ->> 'active_agreements')::int, 1, 'Μία ενεργή Συμφωνία');
select is((public.t_row('a1', 'c2') ->> 'active_agreements')::int, 0, 'Η Συμφωνία που έληξε δεν μετράει');
select is(public.t_row('a1', 'c1') ->> 'package_name', 'Πακέτο Τεστ', 'Το Πακέτο της ενεργής Συμφωνίας');
select is(public.t_row('a1', 'c2') ->> 'package_name', null, 'Χωρίς ενεργή Συμφωνία δεν υπάρχει Πακέτο');
select is(jsonb_array_length(public.t_row('a1', 'c1') -> 'provisions'), 2, 'Δύο είδη Παροχής στην τρέχουσα Περίοδο');
select is(public.t_prov('a1', 'c1', 'shoot'), public.t_expected('shoot', 2, 2, 1, 2),
  'Γύρισμα: 2 δόθηκαν, 2 μεταφέρθηκαν, 1 έγινε, 2 κλεισμένα (το ακυρωμένο δεν μετράει)');
select is(public.t_prov('a1', 'c1', 'reel'), public.t_expected('reel', 4, 4, 0, 0), 'reel: 4 δόθηκαν, 4 μεταφέρθηκαν');
select is(public.t_row('a1', 'c2') -> 'provisions', '[]'::jsonb, 'Χωρίς ενεργή μηνιαία Συμφωνία δεν υπάρχουν Παροχές');
select is((public.t_row('a1', 'c1') ->> 'next_filming')::timestamptz, timestamptz '2026-03-15 10:00 Europe/Athens',
  'Επόμενο Γύρισμα: το πρώτο μελλοντικό που αναμένει έγκριση ή είναι προγραμματισμένο');
select is(public.t_row('a1', 'c3') ->> 'next_filming', null, 'Χωρίς Γυρίσματα δεν υπάρχει επόμενο');
select is((public.t_row('a1', 'c1') ->> 'balance_cents')::bigint, 98800::bigint, 'Υπόλοιπο Καρτέλας 988 €');
select is((public.t_row('a1', 'c3') ->> 'balance_cents')::bigint, 0::bigint, 'Χωρίς κινήσεις το υπόλοιπο είναι 0');
select is((public.t_row('a1', 'c1') ->> 'last_contact')::timestamptz, timestamptz '2026-02-01 10:00+00',
  'Τελευταία επαφή: η πιο πρόσφατη Δραστηριότητα με το χέρι (όχι γεγονός του συστήματος)');
select is(public.t_row('a1', 'c3') ->> 'last_contact', null, 'Χωρίς Δραστηριότητες δεν υπάρχει επαφή');

-- ───────────── Λογιστής: Πελάτες, Συμφωνίες, Οικονομικά· όχι Ευκαιρίες, όχι Γυρίσματα ─────────────
select is((select count(*)::int from public.t_ov('a2')), 4, 'Λογιστής: βλέπει όλους τους Πελάτες');
select is(public.t_row('a2', 'c1') ->> 'status', 'active', 'Λογιστής: η Κατάσταση φαίνεται');
select is((public.t_row('a2', 'c1') ->> 'active_agreements')::int, 1, 'Λογιστής: βλέπει τις Συμφωνίες');
select is((public.t_row('a2', 'c1') ->> 'balance_cents')::bigint, 98800::bigint, 'Λογιστής: βλέπει το υπόλοιπο');
select is(public.t_row('a2', 'c1') ->> 'last_contact', null, 'Λογιστής: χωρίς Ευκαιρίες δεν βλέπει επαφές');
select is(public.t_row('a2', 'c1') ->> 'next_filming', null, 'Λογιστής: χωρίς Γυρίσματα δεν βλέπει το επόμενο');

-- ───────────── Πωλήσεις: μόνο οι δικοί του Πελάτες, χωρίς Καρτέλα ─────────────
select is((select count(*)::int from public.t_ov('a3')), 3, 'Πωλήσεις: τρεις γραμμές, οι δικοί του Πελάτες');
select ok(public.t_row('a3', 'c4') is null, 'Πωλήσεις: καμία γραμμή για Πελάτη άλλου πωλητή');
select is(public.t_row('a3', 'c1') ->> 'balance_cents', null, 'Πωλήσεις: χωρίς «Βλέπει Οικονομικά» το υπόλοιπο είναι null');
select is((public.t_row('a3', 'c1') ->> 'last_contact')::timestamptz, timestamptz '2026-02-01 10:00+00',
  'Πωλήσεις: βλέπει την επαφή της δικής του Ευκαιρίας');
select is((public.t_row('a3', 'c1') ->> 'next_filming')::timestamptz, timestamptz '2026-03-15 10:00 Europe/Athens',
  'Πωλήσεις: βλέπει το επόμενο Γύρισμα του δικού του Πελάτη');
select is((public.t_row('a3', 'c1') ->> 'active_agreements')::int, 1, 'Πωλήσεις: βλέπει τη Συμφωνία του δικού του Πελάτη');
select is(jsonb_array_length(public.t_row('a3', 'c1') -> 'provisions'), 2, 'Πωλήσεις: βλέπει τις Παροχές');

-- ───────────── Μόνο Πελάτες: η Κατάσταση σωστή χωρίς Δικαίωμα Συμφωνιών ─────────────
select is(public.t_row('a5', 'c1') ->> 'status', 'active', 'Χωρίς Συμφωνίες: ο Πελάτης φαίνεται ενεργός');
select is(public.t_row('a5', 'c2') ->> 'status', 'inactive', 'Χωρίς Συμφωνίες: ο Πελάτης φαίνεται ανενεργός');
select is(public.t_row('a5', 'c1') ->> 'active_agreements', null, 'Χωρίς Συμφωνίες: το πλήθος είναι null');
select is(public.t_row('a5', 'c1') ->> 'package_name', null, 'Χωρίς Συμφωνίες: κανένα Πακέτο');
select is(public.t_row('a5', 'c1') -> 'provisions', '[]'::jsonb, 'Χωρίς Συμφωνίες: καμία Παροχή');
select is(public.t_row('a5', 'c1') ->> 'balance_cents', null, 'Χωρίς Οικονομικά: το υπόλοιπο είναι null');

-- ───────────── Κενή είσοδος ─────────────
select is(
  (select count(*)::int from public.sales_client_overview(null, timestamptz '2026-03-10 12:00 Europe/Athens')), 0,
  'Χωρίς Πελάτες καμία γραμμή'
);

select * from finish();
rollback;
