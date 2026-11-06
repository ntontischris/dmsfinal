-- Σήμερα ως ενημέρωση, κομμάτι 2 (#241): Χρήματα (today_money), Η ομάδα (today_team), Το πρόγραμμα (today_programme)
-- και το waiting_since / slot_free στις γραμμές απόφασης. Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
-- Σταθερό p_now: 2026-03-10 10:00 UTC (Αθήνα: Τρίτη 10/3, 12:00).
begin;
select plan(41);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Παραγωγή · a3 Πωλήσεις · a4 Λογιστής · a5 Παραγωγή · a6 ανενεργός · a7 μόνο Ευκαιρίες «όλα»
-- · b1 Χρήστης πελάτη του Πελάτη 1
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'editor@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'gone@example.com'),
  ('00000000-0000-0000-0000-0000000000a7', 'pipeline@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr');
insert into public.team_users (user_id, name, email, is_active, deactivated_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'production@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a4', 'Ελένη', 'accountant@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a5', 'Σοφία', 'editor@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a6', 'Νίκος', 'gone@example.com', false, timestamptz '2026-03-01 10:00+00'),
  ('00000000-0000-0000-0000-0000000000a7', 'Βασίλης', 'pipeline@example.com', true, null);
insert into public.roles (name, description, kind, is_owner, is_builtin)
values ('Μόνο Ευκαιρίες (τεστ)', 'Τεστ: Ευκαιρίες όλης της ομάδας, τίποτα άλλο.', 'team', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'clients.manage', 'all' from public.roles r where r.name = 'Μόνο Ευκαιρίες (τεστ)';
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
               ('00000000-0000-0000-0000-0000000000a4', 'Λογιστής'),
               ('00000000-0000-0000-0000-0000000000a5', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a7', 'Μόνο Ευκαιρίες (τεστ)')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Δεδομένα (χωρίς triggers: μόνο ό,τι διαβάζουν τα RPC) ─────────────
set local session_replication_role = replica;

insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Καφέ Αθηνά', 'Μαρία Παπαδάκη', 'maria@athina.example.gr', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Γυμναστήριο Κίνηση', 'Νίκος Κίνης', 'nikos@kinisi.example.gr', null),
  ('00000000-0000-0000-0000-0000000000c3', 'Φούρνος Ζύμη', 'Ελένη Ζύμη', 'eleni@zymi.example.gr', null);
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

-- Τιμολόγια: i1 Πελάτη 1 ληξιπρόθεσμο 124 € (9 μέρες) · i2 Πελάτη 2 500 € με Είσπραξη 100 € (ληξιπρόθεσμο 400 €, 18 μέρες)
-- · i3 Πελάτη 3 λήγει 31/3, 300 € με Είσπραξη 50 € τον Μάρτιο · i4 λήγει τον Απρίλιο · i5 ληξιπρόθεσμο αλλά ακυρωμένο.
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path, voided_at, void_reason) values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'Τ-1',
   date '2026-02-01', date '2026-03-01', 100, 24, 124, 'brief-test/t1.pdf', null, null),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000c2', 'invoice', 'Τ-2',
   date '2026-01-20', date '2026-02-20', 403.23, 96.77, 500, 'brief-test/t2.pdf', null, null),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-0000000000c3', 'invoice', 'Τ-3',
   date '2026-03-01', date '2026-03-31', 241.94, 58.06, 300, 'brief-test/t3.pdf', null, null),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-0000000000c3', 'invoice', 'Τ-4',
   date '2026-03-05', date '2026-04-15', 161.29, 38.71, 200, 'brief-test/t4.pdf', null, null),
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'Τ-5',
   date '2026-01-10', date '2026-02-10', 805.65, 193.35, 999, 'brief-test/t5.pdf', timestamptz '2026-02-20 10:00+00', 'Λάθος');
insert into public.receipts (client_id, received_on, amount, method_id, note, deleted_at, delete_reason)
select x.client_id::uuid, x.received_on::date, x.amount, (select m.id from public.payment_methods m order by m.sort limit 1),
       '', x.deleted_at::timestamptz, x.reason
  from (values ('00000000-0000-0000-0000-0000000000c2', '2026-02-25', 100, null, null),
               ('00000000-0000-0000-0000-0000000000c3', '2026-03-05', 50, null, null),
               ('00000000-0000-0000-0000-0000000000c3', '2026-03-06', 70, '2026-03-07 10:00+00', 'Λάθος ποσό'))
       as x (client_id, received_on, amount, deleted_at, reason);

insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, payment_days, unused_provisions,
                               filming_notice_hours, filming_cancel_hours, late_cancel_burns, no_show_burns, signed_at)
values ('00000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-0000000000e1', 'one_off', 'Εφάπαξ Αθηνά',
        'signed', 'signed', date '2026-12-31', 30, 'lost', 24, 24, false, false, timestamptz '2026-01-10 10:00+00');

-- Παραγωγές: d0 του Πελάτη 1 (Υπεύθυνος a1) · d1 Εσωτερική (Υπεύθυνος a1) · d2 παραδομένη
insert into public.productions (id, title, client_id, agreement_id, owner_id, state, delivered_at, delivered_note) values
  ('00000000-0000-0000-0000-0000000000d0', 'Βίντεο Αθηνά', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-0000000000a1', 'open', null, null),
  ('00000000-0000-0000-0000-0000000000d1', 'Εσωτερικό podcast', null, null, '00000000-0000-0000-0000-0000000000a1', 'open', null, null),
  ('00000000-0000-0000-0000-0000000000d2', 'Εσωτερικό showreel', null, null, '00000000-0000-0000-0000-0000000000a5',
   'delivered', timestamptz '2026-03-01 10:00+00', 'Παραδόθηκε');

-- Παραδοτέα: x1, x2 του a2 εκπρόθεσμα (5 και 2 μέρες) · x3 του a5 σε 10 μέρες · x4 ακυρωμένο · x5 παραδομένης Παραγωγής
-- · x6 του a2, εκπρόθεσμο αλλά με Έκδοση σε έλεγχο (περιμένει τον a1) · x7 του ανενεργού a6 · x8 προθεσμία σήμερα.
insert into public.deliverables (id, production_id, kind_id, title, assignee_id, charge, deadline, cancelled_at, cancel_reason, cancel_outcome)
select x.id::uuid, x.production_id::uuid, (select k.id from public.provision_kinds k where k.code = 'reel'), x.title,
       x.assignee::uuid, 'included', x.deadline::date, x.cancelled_at::timestamptz, x.reason, x.outcome
  from (values
    ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'Reel 1', '00000000-0000-0000-0000-0000000000a2', '2026-03-05', null, null, null),
    ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000d1', 'Reel 2', '00000000-0000-0000-0000-0000000000a2', '2026-03-08', null, null, null),
    ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000d1', 'Reel 3', '00000000-0000-0000-0000-0000000000a5', '2026-03-20', null, null, null),
    ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000d1', 'Reel 4', '00000000-0000-0000-0000-0000000000a5', '2026-03-01',
     '2026-03-02 10:00+00', 'Δεν χρειάζεται', 'returned'),
    ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000d2', 'Reel 5', '00000000-0000-0000-0000-0000000000a5', '2026-03-01', null, null, null),
    ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000d0', 'Reel 6', '00000000-0000-0000-0000-0000000000a2', '2026-03-02', null, null, null),
    ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000000d1', 'Reel 7', '00000000-0000-0000-0000-0000000000a6', '2026-03-01', null, null, null),
    ('00000000-0000-0000-0000-0000000000f8', '00000000-0000-0000-0000-0000000000d1', 'Reel 8', '00000000-0000-0000-0000-0000000000a5', '2026-03-10', null, null, null)
  ) as x (id, production_id, title, assignee, deadline, cancelled_at, reason, outcome);
insert into public.deliverable_versions (deliverable_id, number, url, host, state, created_at) values
  ('00000000-0000-0000-0000-0000000000f6', 1, 'https://drive.example.com/r6', 'drive.example.com', 'in_review',
   timestamptz '2026-03-08 10:00+00');

-- Ευκαιρίες: e1 της a3, βήμα που έληξε στις 8/3 · e2 της a3, βήμα σήμερα (δεν μετρά) · e3 χωρίς Υπεύθυνο (από 1/3)
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due, created_at)
select x.id::uuid, '00000000-0000-0000-0000-0000000000c1', x.title,
       (select s.id from public.sales_stages s where s.code = 'new'), (select s.id from public.sales_sources s where s.code = 'phone'),
       x.manager::uuid, 'Τηλέφωνο', x.due::date, x.created_at::timestamptz
  from (values ('00000000-0000-0000-0000-0000000000e1', 'Βίντεο γνωριμίας', '00000000-0000-0000-0000-0000000000a3', '2026-03-08',
                '2026-02-01 09:00+00'),
               ('00000000-0000-0000-0000-0000000000e2', 'Reels Πάσχα', '00000000-0000-0000-0000-0000000000a3', '2026-03-10',
                '2026-02-01 09:00+00'),
               ('00000000-0000-0000-0000-0000000000e3', 'Χωρίς Υπεύθυνο', null, '2027-06-01', '2026-03-01 09:00+00'))
       as x (id, title, manager, due, created_at);

-- Γυρίσματα της Τρίτης 10/3 (Αθήνα): g5 στις 00:30 · g1 στις 10:00 (Συνεργείο a2, η a5 αρνήθηκε) · g2 στις 16:00, κράτηση
-- σε αναμονή από 7/3 · g3 ακυρωμένο · g4 αύριο · g7 κράτηση την Πέμπτη 12/3 (κλειστή μέρα).
insert into public.filmings (id, production_id, client_id, starts_at, hours, location, origin, state, is_extra, cancelled_at, cancelled_side, created_at)
values
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-0000000000d0', '00000000-0000-0000-0000-0000000000c1',
   timestamptz '2026-03-10 08:00+00', 2, 'Κατάστημα', 'team', 'scheduled', true, null, null, timestamptz '2026-03-01 10:00+00'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-0000000000d1', null,
   timestamptz '2026-03-10 14:00+00', 3, 'Στούντιο', 'team', 'pending', false, null, null, timestamptz '2026-03-07 10:00+00'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-0000000000d1', null,
   timestamptz '2026-03-10 16:00+00', 2, 'Στούντιο', 'team', 'cancelled', false, timestamptz '2026-03-05 10:00+00', 'team',
   timestamptz '2026-03-01 10:00+00'),
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-0000000000d1', null,
   timestamptz '2026-03-11 08:00+00', 2, 'Στούντιο', 'team', 'scheduled', false, null, null, timestamptz '2026-03-01 10:00+00'),
  ('00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-0000000000d1', null,
   timestamptz '2026-03-09 22:30+00', 1, 'Στούντιο', 'team', 'scheduled', false, null, null, timestamptz '2026-03-01 10:00+00'),
  ('00000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-0000000000d1', null,
   timestamptz '2026-03-12 10:00+00', 2, 'Στούντιο', 'team', 'pending', false, null, null, timestamptz '2026-03-09 10:00+00');
insert into public.filming_crew (filming_id, user_id, response, reason, responded_at) values
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-0000000000a2', 'confirmed', null, timestamptz '2026-03-02 10:00+00'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-0000000000a5', 'declined', 'Άδεια', timestamptz '2026-03-02 10:00+00');

-- Ωράριο: μόνο η Τρίτη ανοιχτή, 08:00–22:00.
update public.filming_settings set booking_hours_set_at = timestamptz '2026-03-01 10:00+00' where id;
insert into public.booking_week (dow, is_open, opens, closes) values (2, true, time '08:00', time '22:00');

set local session_replication_role = origin;

create function public.t_now() returns timestamptz
language sql immutable as $$ select timestamptz '2026-03-10 10:00+00'; $$;
create function public.t_uid(p_last text) returns uuid
language sql immutable as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.today_money() $$, '42501', null, 'Ο ανώνυμος δεν ανοίγει τα Χρήματα');
select throws_ok($$ select public.today_team() $$, '42501', null, 'Ο ανώνυμος δεν ανοίγει την ομάδα');
select throws_ok($$ select public.today_programme(date '2026-03-10') $$, '42501', null, 'Ο ανώνυμος δεν ανοίγει το πρόγραμμα');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.today_money() $$, '42501', null, 'Ο Χρήστης πελάτη δεν ανοίγει τα Χρήματα');
select throws_ok($$ select public.today_team() $$, '42501', null, 'Ο Χρήστης πελάτη δεν ανοίγει την ομάδα');
select throws_ok($$ select public.today_programme(date '2026-03-10') $$, '42501', null, 'Ο Χρήστης πελάτη δεν ανοίγει το πρόγραμμα');
select throws_ok($$ select authz.today_money(auth.uid(), now()) $$, '42501', null, 'Οι συναρτήσεις authz δεν καλούνται απευθείας');
reset role;

select throws_ok($$ select authz.today_money(public.t_uid('a2'), public.t_now()) $$, '42501', null,
  'Παραγωγή (χωρίς Οικονομικά): τα Χρήματα ρίχνουν 42501');
select throws_ok($$ select authz.today_money(public.t_uid('a3'), public.t_now()) $$, '42501', null,
  'Πωλήσεις (ποσά μόνο «με αφορά»): 42501, όπως η κάρτα Ληξιπρόθεσμα');
select throws_ok($$ select authz.today_team(public.t_uid('a2'), public.t_now()) $$, '42501', null,
  'Παραγωγή (Παραδοτέα μόνο «με αφορά»): η ομάδα ρίχνει 42501');
select throws_ok($$ select authz.today_team(public.t_uid('a4'), public.t_now()) $$, '42501', null,
  'Λογιστής (χωρίς Παραδοτέα και Ευκαιρίες): 42501');
select throws_ok($$ select authz.today_programme(public.t_uid('a4'), date '2026-03-10') $$, '42501', null,
  'Λογιστής (χωρίς «Βλέπει Γυρίσματα»): το πρόγραμμα ρίχνει 42501');
select throws_ok($$ select authz.today_programme(public.t_uid('a6'), date '2026-03-10') $$, '42501', null,
  'Ανενεργός Χρήστης: 42501');

-- ───────────── Χρήματα ─────────────
select is(authz.today_money(public.t_uid('a1'), public.t_now()) - 'debtors' - 'month',
  jsonb_build_object('overdue_cents', 52400, 'overdue_count', 2, 'client_count', 2),
  'Ληξιπρόθεσμα: 524 € σε 2 Τιμολόγια από 2 Πελάτες (όχι το ακυρωμένο, όχι όσα δεν έληξαν)');
select is(authz.today_money(public.t_uid('a4'), public.t_now()) ->> 'overdue_cents', '52400', 'Ο Λογιστής βλέπει τα ίδια');
select is(authz.today_money(public.t_uid('a1'), public.t_now()) -> 'debtors',
  jsonb_build_array(
    jsonb_build_object('client_id', '00000000-0000-0000-0000-0000000000c2', 'name', 'Γυμναστήριο Κίνηση', 'amount_cents', 40000,
                       'days', 18, 'link', '/app/finance/ledger?client=00000000-0000-0000-0000-0000000000c2'),
    jsonb_build_object('client_id', '00000000-0000-0000-0000-0000000000c1', 'name', 'Καφέ Αθηνά', 'amount_cents', 12400,
                       'days', 9, 'link', '/app/finance/ledger?client=00000000-0000-0000-0000-0000000000c1')),
  'Οφειλέτες: ο μεγαλύτερος πρώτος, με τις μέρες του παλαιότερου και την Καρτέλα του');
select is(authz.today_money(public.t_uid('a1'), public.t_now()) -> 'month',
  jsonb_build_object('month', 3, 'day', 10, 'days', 31, 'collected_cents', 5000, 'expected_cents', 42400),
  'Μήνας: από 424 € που λήγουν τον Μάρτιο (124 + 300) μπήκαν 50 € (του Τ-3)· όχι το παλιό ληξιπρόθεσμο του Φεβρουαρίου');
-- Μαντείο: ίδια πλήθη με την κάρτα και ίδιο σύνολο με τις Εισπράξεις του πίνακα.
select is((authz.today_money(public.t_uid('a1'), public.t_now()) ->> 'overdue_count')::integer,
  authz.today_count_overdue_invoices(public.t_uid('a1'), null, public.t_now()), 'Ίδιο πλήθος με την κάρτα Ληξιπρόθεσμα');
select is((authz.today_money(public.t_uid('a1'), public.t_now()) -> 'month' ->> 'expected_cents')::bigint,
  (select round(sum(i.total) * 100)::bigint from public.invoices i
    where i.voided_at is null and i.kind = 'invoice' and i.due_date between date '2026-03-01' and date '2026-03-31'),
  'Μαντείο: περιμένουμε = το ποσό των μη ακυρωμένων Τιμολογίων που λήγουν τον Μάρτιο');
select is(authz.today_money(public.t_uid('a1'), timestamptz '2026-04-10 10:00+00') -> 'month',
  jsonb_build_object('month', 4, 'day', 10, 'days', 30, 'collected_cents', 0, 'expected_cents', 20000),
  'Απρίλιος: λήγει μόνο το Τ-4 (200 €), απλήρωτο· η Είσπραξη του Μαρτίου πήγε στο παλαιότερο Τ-3');
select is(authz.today_money(public.t_uid('a1'), timestamptz '2026-05-10 10:00+00') -> 'month' -> 'expected_cents', '0'::jsonb,
  'Μάιος: δεν λήγει κανένα Τιμολόγιο → περιμένουμε 0');
select is((authz.today_money(public.t_uid('a1'), public.t_now()) ->> 'overdue_cents')::bigint,
  (select round(sum(s.remaining) * 100)::bigint from authz.invoice_standings(null, date '2026-03-10') s where s.status = 'overdue'),
  'Σύνολο = το υπόλοιπο των ληξιπρόθεσμων');
select is(authz.today_money(public.t_uid('a1'), timestamptz '2026-02-28 22:30+00') -> 'month' ->> 'day', '1',
  'Ο μήνας είναι της Αθήνας (28/2 22:30 UTC = 1/3)');

-- ───────────── Η ομάδα ─────────────
select is((select array_agg(p ->> 'name' order by n)
             from jsonb_array_elements(authz.today_team(public.t_uid('a1'), public.t_now()) -> 'people') with ordinality x (p, n)),
  array['Πέτρος', 'Άννα', 'Γιώργος'], 'Μόνο όσοι κόλλησαν: πρώτα τα εκπρόθεσμα, μετά τα βήματα, μετά η ουρά');
select is(authz.today_team(public.t_uid('a1'), public.t_now()) -> 'people' -> 0,
  jsonb_build_object('user_id', '00000000-0000-0000-0000-0000000000a2', 'name', 'Πέτρος', 'late', 2, 'oldest_days', 5,
                     'steps', 0, 'versions', 0),
  'Πέτρος: 2 εκπρόθεσμα, το παλαιότερο 5 μέρες (όχι αυτό που είναι σε έλεγχο)');
select is(authz.today_team(public.t_uid('a1'), public.t_now()) -> 'people' -> 1 ->> 'steps', '1',
  'Άννα: 1 Επόμενο βήμα που έληξε (όχι το σημερινό)');
select is(authz.today_team(public.t_uid('a1'), public.t_now()) -> 'people' -> 2 ->> 'versions', '1',
  'Γιώργος: 1 Έκδοση περιμένει τον έλεγχό του');
select is(authz.today_team(public.t_uid('a1'), public.t_now()) ->> 'fine', '3',
  'Οι άλλοι 3 ενεργοί είναι στην ώρα τους (ο ανενεργός δεν μετρά)');
-- Μαντείο: τα εκπρόθεσμα όλων = ανεξάρτητη μέτρηση στους πίνακες (Παραδοτέα χωρίς Έκδοση, ενεργού Χρήστη, ανοιχτής Παραγωγής).
select is((select sum((p ->> 'late')::integer)::integer
             from jsonb_array_elements(authz.today_team(public.t_uid('a1'), public.t_now()) -> 'people') p),
  (select count(*)::integer from public.deliverables x
     join public.productions p on p.id = x.production_id
     join public.team_users u on u.user_id = x.assignee_id and u.is_active
    where p.state = 'open' and x.cancelled_at is null and x.deadline < date '2026-03-10'
      and not exists (select 1 from public.deliverable_versions v where v.deliverable_id = x.id)),
  'Εκπρόθεσμα της ομάδας = ανεξάρτητη μέτρηση');
select is(authz.today_team(public.t_uid('a7'), public.t_now()) -> 'sees',
  jsonb_build_object('deliverables', false, 'steps', true, 'versions', false),
  'Μόνο Ευκαιρίες «όλα»: βλέπει μόνο τα βήματα');
select is((select array_agg(p ->> 'name')
             from jsonb_array_elements(authz.today_team(public.t_uid('a7'), public.t_now()) -> 'people') p),
  array['Άννα'], 'Χωρίς Παραδοτέα «όλα» δεν φαίνονται τα Παραδοτέα κανενός');

-- ───────────── Το πρόγραμμα ─────────────
select is((select array_agg(i ->> 'id' order by n)
             from jsonb_array_elements(authz.today_programme(public.t_uid('a1'), date '2026-03-10') -> 'items') with ordinality x (i, n)),
  array['00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000022'],
  'Όλα τα ανοιχτά της Τρίτης (Αθήνα), με σειρά ώρας· όχι το ακυρωμένο, όχι το αυριανό');
select is(jsonb_array_length(authz.today_programme(public.t_uid('a1'), date '2026-03-10') -> 'items'),
  (select count(*)::integer from public.filmings f
    where f.state in ('pending', 'scheduled') and (f.starts_at at time zone 'Europe/Athens')::date = date '2026-03-10'),
  'Μαντείο: όσα Γυρίσματα της μέρας έχει ο πίνακας');
select is(authz.today_programme(public.t_uid('a1'), date '2026-03-10') -> 'items' -> 1 -> 'crew', '["Πέτρος"]'::jsonb,
  'Το Συνεργείο, χωρίς όσους αρνήθηκαν');
select is(authz.today_programme(public.t_uid('a1'), date '2026-03-10') -> 'items' -> 2 ->> 'subtitle', 'αναμένει έγκριση',
  'Η κράτηση σε αναμονή σημειώνεται');
select is((select array_agg(i ->> 'id')
             from jsonb_array_elements(authz.today_programme(public.t_uid('a2'), date '2026-03-10') -> 'items') i),
  array['00000000-0000-0000-0000-000000000021'], 'Παραγωγή «με αφορά»: μόνο όπου είναι στο Συνεργείο');

-- ───────────── Από πότε περιμένει ─────────────
select is((select array_agg((i ->> 'waiting_since')::timestamptz order by n)
             from jsonb_array_elements(authz.today_items_filming_approvals(public.t_uid('a1'), null, public.t_now()))
                  with ordinality x (i, n)),
  array[timestamptz '2026-03-07 10:00+00', timestamptz '2026-03-09 10:00+00'], 'Κράτηση: περιμένει από τη δημιουργία της');
select is((select array_agg(i ->> 'slot_free' order by n)
             from jsonb_array_elements(authz.today_items_filming_approvals(public.t_uid('a1'), null, public.t_now()))
                  with ordinality x (i, n)),
  array['true', 'false'], 'Η ώρα είναι ελεύθερη μόνο όταν χωρά στο Ωράριο και στη Χωρητικότητα');
select is((authz.today_items_unassigned(public.t_uid('a1'), null, public.t_now()) -> 0 ->> 'waiting_since')::timestamptz,
  timestamptz '2026-03-01 09:00+00', 'Χωρίς υπεύθυνο: περιμένει από τη δημιουργία');

-- ───────────── Μέσα από τα public RPC ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(public.today_money(public.t_now()) ->> 'overdue_count', '2', 'Ο Ιδιοκτήτης ανοίγει τα Χρήματα');
select is(public.today_team(public.t_now()) ->> 'fine', '3', 'Ο Ιδιοκτήτης ανοίγει την ομάδα');

select * from finish();
rollback;
