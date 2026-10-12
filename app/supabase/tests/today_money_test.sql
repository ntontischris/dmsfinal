-- Σήμερα Σδ #183: κάρτες «Τα χρήματα» (Γύροι πέρα από το όριο, Προς τιμολόγηση, Ληξιπρόθεσμα, Ώρες και Υπέρβαση)
-- και «Η εβδομάδα» (Γυρίσματα των επόμενων 7 ημερών). Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
-- Σταθερό p_now: 2026-03-10 10:00 UTC (Αθήνα: Τρίτη 10/3).
begin;
select plan(47);

-- ───────────── Μητρώο ─────────────
select is(
  (select count(*)::integer from public.today_cards c
    where (c.code, c.grp, c.kind, c.audience) in (('rounds_over_limit', 'money', 'action', 'team'),
                                                ('to_invoice', 'money', 'action', 'team'),
                                                ('overdue_invoices', 'money', 'action', 'team'),
                                                ('cost_hours', 'money', 'action', 'team'),
                                                ('week_filming', 'week', 'week', 'team'))
      and c.sort between case when c.grp = 'money' then 300 else 500 end and case when c.grp = 'money' then 399 else 599 end),
  5, 'Οι πέντε κάρτες στο μητρώο, στις ζώνες τους');
select is((select link from public.today_cards where code = 'overdue_invoices'), '/app/finance/invoices?filter=overdue',
  'Τα Ληξιπρόθεσμα ανοίγουν την I2 με το φίλτρο της');

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Παραγωγή (Γυρίσματα «με αφορά», χωρίς ποσά) · a3 Πωλήσεις (ποσά «με αφορά», Υπεύθυνος του Πελάτη 1)
-- a4 Λογιστής (Οικονομικά και ποσά «όλα», χωρίς Παραδοτέα, κόστος και Γυρίσματα) · a5 Παραγωγή, Μέλος της Παραγωγής PI2
-- · b1 Χρήστης πελάτη του Πελάτη 1
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'member@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Ελένη', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'Σοφία', 'member@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
               ('00000000-0000-0000-0000-0000000000a4', 'Λογιστής'),
               ('00000000-0000-0000-0000-0000000000a5', 'Παραγωγή')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Δεδομένα (χωρίς triggers: μόνο ό,τι διαβάζουν οι κάρτες) ─────────────
set session_replication_role = replica;

insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Καφέ Αθηνά', 'Μαρία Παπαδάκη', 'maria@athina.example.gr', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Γυμναστήριο Κίνηση', 'Νίκος Κίνης', 'nikos@kinisi.example.gr', null),
  ('00000000-0000-0000-0000-0000000000c3', 'Φούρνος Ζύμη', 'Ελένη Ζύμη', 'eleni@zymi.example.gr', null);
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, payment_days, unused_provisions,
                               filming_notice_hours, filming_cancel_hours, late_cancel_burns, no_show_burns, signed_at)
values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e9', 'one_off', 'Εφάπαξ Αθηνά',
        'signed', 'signed', date '2026-12-31', 30, 'lost', 24, 24, false, false, timestamptz '2026-01-10 10:00+00');

-- PA: Παραγωγή του Πελάτη 1 (ανοιχτή) · PI1 παραδομένη χωρίς ώρες · PI2 ανοιχτή με Υπέρβαση · PI3 ανοιχτή χωρίς σήματα
insert into public.productions (id, title, client_id, agreement_id, owner_id, state, delivered_at, delivered_note) values
  ('00000000-0000-0000-0000-0000000000d0', 'Βίντεο Αθηνά', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'open', null, null),
  ('00000000-0000-0000-0000-0000000000d1', 'Εσωτερικό showreel', null, null, '00000000-0000-0000-0000-0000000000a1',
   'delivered', timestamptz '2026-03-01 10:00+00', 'Παραδόθηκε'),
  ('00000000-0000-0000-0000-0000000000d2', 'Εσωτερικό podcast', null, null, '00000000-0000-0000-0000-0000000000a1',
   'open', null, null),
  ('00000000-0000-0000-0000-0000000000d3', 'Εσωτερικό teaser', null, null, '00000000-0000-0000-0000-0000000000a1',
   'open', null, null);
insert into public.production_costs (production_id, estimate_shoot_hours, estimate_edit_hours,
                                     shoot_hours, shoot_confirmed_at, edit_hours, edit_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000d1', 2, 2, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000d2', 2, 2, 5, now(), 5, now()),
  ('00000000-0000-0000-0000-0000000000d3', 0, 0, null, null, null, null);

-- Αποφάσεις χρέωσης: f1 (προθεσμία σήμερα, επείγον) και f2 (σε 10 μέρες) μετρούν· όχι το included, το ακυρωμένο, ούτε
-- αυτό της παραδομένης Παραγωγής.
insert into public.deliverables (id, production_id, kind_id, title, charge, deadline, cancelled_at, cancel_reason, cancel_outcome, created_at)
select x.id::uuid, x.production_id::uuid, (select k.id from public.provision_kinds k where k.code = 'reel'), x.title, x.charge,
       x.deadline::date, x.cancelled_at::timestamptz, x.reason, x.outcome, timestamptz '2026-03-01 10:00+00'
  from (values
    ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d0', 'Έξτρα reel 1', 'pending', '2026-03-10', null, null, null),
    ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000d0', 'Έξτρα reel 2', 'pending', '2026-03-20', null, null, null),
    ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000d0', 'Reel πακέτου', 'included', '2026-03-10', null, null, null),
    ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000d0', 'Ακυρωμένο reel', 'pending', '2026-03-10',
     '2026-03-02 10:00+00', 'Δεν χρειάζεται', 'returned'),
    ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000d1', 'Reel παραδομένης', 'pending', '2026-03-10', null, null, null)
  ) as x (id, production_id, title, charge, deadline, cancelled_at, reason, outcome);

-- Τιμολογητέα: Πελάτης 1 με 20 και 3 μέρες (150 €), Πελάτης 2 με 5 μέρες (80 €).
insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'milestone', gen_random_uuid(), 'Δόση 1', date '2026-02-18', 100),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'milestone', gen_random_uuid(), 'Δόση 2', date '2026-03-07', 50),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'milestone', gen_random_uuid(), 'Δόση 3', date '2026-03-05', 80);

-- Τιμολόγια του Πελάτη 3: ένα ληξιπρόθεσμο, ένα που δεν έληξε, ένα ληξιπρόθεσμο αλλά ακυρωμένο.
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path, voided_at, void_reason) values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000c3', 'invoice', 'Τ-1',
   date '2026-02-01', date '2026-03-01', 100, 24, 124, 'today-test/t1.pdf', null, null),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000c3', 'invoice', 'Τ-2',
   date '2026-03-01', date '2026-03-31', 100, 24, 124, 'today-test/t2.pdf', null, null),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-0000000000c3', 'invoice', 'Τ-3',
   date '2026-01-10', date '2026-02-10', 100, 24, 124, 'today-test/t3.pdf', timestamptz '2026-02-20 10:00+00', 'Λάθος ποσό');

-- Γυρίσματα: g1 Πελάτη 1 αύριο (Συνεργείο ο a2) · g2 Εσωτερικό σε 3 μέρες, αναμένει έγκριση · g3 σε 10 μέρες (εκτός)
-- · g4 σε 2 μέρες αλλά ακυρωμένο.
insert into public.filmings (id, production_id, client_id, starts_at, hours, location, origin, state, is_extra,
                             cancelled_at, cancelled_side) values
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-0000000000d0', '00000000-0000-0000-0000-0000000000c1',
   timestamptz '2026-03-11 08:00+00', 2, 'Κατάστημα Κολωνακίου', 'team', 'scheduled', true, null, null),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-0000000000d2', null,
   timestamptz '2026-03-13 09:00+00', 3, 'Στούντιο', 'team', 'pending', false, null, null),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-0000000000d2', null,
   timestamptz '2026-03-20 09:00+00', 3, 'Στούντιο', 'team', 'scheduled', false, null, null),
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-0000000000d2', null,
   timestamptz '2026-03-12 09:00+00', 3, 'Στούντιο', 'team', 'cancelled', false, timestamptz '2026-03-05 10:00+00', 'team');
insert into public.filming_crew (filming_id, user_id) values
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-0000000000a2');
insert into public.production_members (production_id, user_id) values
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000a5');

reset session_replication_role;

create function public.t_now() returns timestamptz
language sql immutable as $$ select timestamptz '2026-03-10 10:00+00'; $$;
create function public.t_uid(p_last text) returns uuid
language sql immutable as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;

-- ───────────── Άρνηση: ανώνυμος, πελάτης, κλειστές συναρτήσεις ─────────────
set local role anon;
select throws_ok($$ select public.today_card('overdue_invoices') $$, '42501', null, 'Ο ανώνυμος δεν ανοίγει κάρτα χρημάτων');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.today_card('to_invoice') $$, '42501', null, 'Ο Χρήστης πελάτη δεν ανοίγει «Προς τιμολόγηση»');
select throws_ok($$ select public.today_card('week_filming') $$, '42501', null, 'Ο Χρήστης πελάτη δεν ανοίγει την εβδομάδα της ομάδας');
select throws_ok($$ select authz.today_count_to_invoice(auth.uid(), null, now()) $$, '42501', null,
  'Οι συναρτήσεις κάρτας δεν καλούνται απευθείας');
reset role;

select is(array[authz.today_count_rounds_over_limit(public.t_uid('b1'), public.t_uid('c1'), public.t_now()),
                authz.today_count_to_invoice(public.t_uid('b1'), public.t_uid('c1'), public.t_now()),
                authz.today_count_overdue_invoices(public.t_uid('b1'), public.t_uid('c1'), public.t_now()),
                authz.today_count_cost_hours(public.t_uid('b1'), public.t_uid('c1'), public.t_now()),
                authz.today_count_week_filming(public.t_uid('b1'), public.t_uid('c1'), public.t_now())],
  array[null, null, null, null, null]::integer[], 'Πελάτης: καμία κάρτα χρημάτων ή εβδομάδας (null)');
select is(authz.today_count_to_invoice(public.t_uid('a1'), public.t_uid('c1'), public.t_now()), null,
  'Κάρτα ομάδας με Πελάτη: null');

-- ───────────── Γύροι πέρα από το όριο (αποφάσεις χρέωσης) ─────────────
select is(authz.today_count_rounds_over_limit(public.t_uid('a1'), null, public.t_now()), 2,
  'Ιδιοκτήτης: τα δύο «χρεώνεται;» ανοιχτής Παραγωγής (όχι included, ακυρωμένο ή παραδομένης)');
select is(authz.today_count_rounds_over_limit(public.t_uid('a2'), null, public.t_now()), null,
  'Παραγωγή (χωρίς ποσά): null');
select is(authz.today_count_rounds_over_limit(public.t_uid('a3'), null, public.t_now()), null,
  'Πωλήσεις (ποσά μόνο «με αφορά», χωρίς Παραδοτέα): null');
select is(authz.today_count_rounds_over_limit(public.t_uid('a4'), null, public.t_now()), null,
  'Λογιστής (ποσά «όλα» αλλά χωρίς Παραδοτέα, όπως η σελίδα H1): null');
select is(authz.today_items_rounds_over_limit(public.t_uid('a1'), null, public.t_now()) -> 0 ->> 'id',
  '00000000-0000-0000-0000-0000000000f1', 'Πρώτο το επείγον (προθεσμία σήμερα)');
select is((select array_agg((i ->> 'urgent')::boolean order by n)
             from jsonb_array_elements(authz.today_items_rounds_over_limit(public.t_uid('a1'), null, public.t_now()))
                  with ordinality x (i, n)), array[true, false], 'Επείγον μόνο με προθεσμία σε έως 1 μέρα');
select ok(not (authz.today_items_rounds_over_limit(public.t_uid('a1'), null, public.t_now()) -> 0 ? 'amount_cents'),
  'Οι Γύροι δεν δείχνουν ποσά');
select throws_ok($$ select authz.today_items_rounds_over_limit(public.t_uid('a2'), null, public.t_now()) $$, '42501', null,
  'Γραμμές χωρίς Δικαίωμα: 42501');

-- ───────────── Προς τιμολόγηση ─────────────
select is(authz.today_count_to_invoice(public.t_uid('a1'), null, public.t_now()), 3, 'Ιδιοκτήτης: τρία ανοιχτά Τιμολογητέα');
select is(authz.today_count_to_invoice(public.t_uid('a4'), null, public.t_now()), 3, 'Λογιστής: τα ίδια');
select is(authz.today_count_to_invoice(public.t_uid('a3'), null, public.t_now()), null,
  'Πωλήσεις (χωρίς Οικονομικά, ποσά «με αφορά»): null');
select is(authz.today_count_to_invoice(public.t_uid('a2'), null, public.t_now()), null, 'Παραγωγή: null');
select is(authz.today_items_to_invoice(public.t_uid('a1'), null, public.t_now()) -> 0,
  jsonb_build_object('id', '00000000-0000-0000-0000-0000000000c1', 'title', 'Καφέ Αθηνά',
                     'subtitle', '2 Τιμολογητέα · το παλαιότερο 20 μέρες', 'at', null, 'urgent', true,
                     'amount_cents', 15000, 'link', '/app/finance/to-invoice'),
  'Ανά Πελάτη, το παλαιότερο πρώτο· επείγον στις 14+ μέρες, με το ποσό');
select is(authz.today_items_to_invoice(public.t_uid('a1'), null, public.t_now()) -> 1 ->> 'urgent', 'false',
  'Τιμολογητέο 5 ημερών: όχι επείγον');
select throws_ok($$ select authz.today_items_to_invoice(public.t_uid('a3'), null, public.t_now()) $$, '42501', null,
  'Ποσά μόνο με «Βλέπει ποσά» «όλα»: 42501 για τις Πωλήσεις');

-- ───────────── Ληξιπρόθεσμα Τιμολόγια ─────────────
select is(authz.today_count_overdue_invoices(public.t_uid('a1'), null, public.t_now()), 1,
  'Ένα ληξιπρόθεσμο (όχι αυτό που δεν έληξε, ούτε το ακυρωμένο)');
select is(authz.today_count_overdue_invoices(public.t_uid('a4'), null, public.t_now()), 1, 'Λογιστής: το ίδιο');
select is(authz.today_count_overdue_invoices(public.t_uid('a3'), null, public.t_now()), null, 'Πωλήσεις: null');
select is(authz.today_items_overdue_invoices(public.t_uid('a1'), null, public.t_now()) -> 0,
  jsonb_build_object('id', '00000000-0000-0000-0000-000000000011', 'title', 'Φούρνος Ζύμη, Τ-1',
                     'subtitle', 'έληξε πριν από 9 μέρες', 'at', null, 'urgent', true, 'amount_cents', 12400,
                     'link', '/app/finance/invoices/00000000-0000-0000-0000-000000000011'),
  'Κάθε ληξιπρόθεσμο είναι επείγον, με το υπόλοιπο');
select throws_ok($$ select authz.today_items_overdue_invoices(public.t_uid('a2'), null, public.t_now()) $$, '42501', null,
  'Παραγωγή: 42501');

-- ───────────── Ώρες και Υπέρβαση κόστους ─────────────
select is(authz.today_count_cost_hours(public.t_uid('a1'), null, public.t_now()), 2,
  'Ιδιοκτήτης: μία που θέλει ώρες και μία Υπέρβαση');
select is(authz.today_count_cost_hours(public.t_uid('a2'), null, public.t_now()), null, 'Χωρίς «Βλέπει κόστος»: null');
select is(authz.today_count_cost_hours(public.t_uid('a4'), null, public.t_now()), null, 'Λογιστής χωρίς κόστος: null');
select is(authz.today_items_cost_hours(public.t_uid('a1'), null, public.t_now()) -> 0,
  jsonb_build_object('id', '00000000-0000-0000-0000-0000000000d2', 'title', 'Υπέρβαση: Εσωτερικό podcast',
                     'subtitle', null, 'at', null, 'urgent', true,
                     'link', '/app/productions/00000000-0000-0000-0000-0000000000d2/costs'),
  'Πρώτα η Υπέρβαση, επείγουσα');
select is(authz.today_items_cost_hours(public.t_uid('a1'), null, public.t_now()) -> 1 ->> 'link',
  '/app/productions/00000000-0000-0000-0000-0000000000d1/costs', 'Μετά όσες θέλουν ώρες, προς τη φόρμα ωρών της Παραγωγής');
select is(authz.today_items_cost_hours(public.t_uid('a1'), null, public.t_now()) -> 1 ->> 'urgent', 'false',
  'Οι ώρες που λείπουν δεν είναι επείγουσες');
select ok(not (authz.today_items_cost_hours(public.t_uid('a1'), null, public.t_now()) -> 0 ? 'amount_cents'),
  'Η κάρτα κόστους δεν δείχνει ποσά');

-- ───────────── Γυρίσματα των επόμενων 7 ημερών ─────────────
select is(authz.today_count_week_filming(public.t_uid('a1'), null, public.t_now()), 2,
  'Ιδιοκτήτης: τα δύο ανοιχτά της εβδομάδας (όχι σε 10 μέρες, όχι το ακυρωμένο)');
select is(authz.today_count_week_filming(public.t_uid('a2'), null, public.t_now()), 1,
  'Παραγωγή «με αφορά»: μόνο όπου είναι στο Συνεργείο');
select is(authz.today_count_week_filming(public.t_uid('a3'), null, public.t_now()), 1,
  'Πωλήσεις «με αφορά»: μόνο του Πελάτη που έχουν');
select is(authz.today_count_week_filming(public.t_uid('a4'), null, public.t_now()), null, 'Χωρίς «Βλέπει Γυρίσματα»: null');
select is(authz.today_count_week_filming(public.t_uid('a5'), null, public.t_now()), 1,
  'Μέλος Παραγωγής «με αφορά»: το Γύρισμα της Παραγωγής του μέσα στην εβδομάδα');

-- Ίδια ορατότητα με το authz.can_see_filming (που διαβάζει τον auth.uid()), για κάθε Χρήστη ομάδας, στο ίδιο παράθυρο.
create function public.t_week_same(p_last text) returns boolean
language plpgsql
as $$
declare
  v_helper uuid[];
  v_rule uuid[];
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
  v_helper := array(select w.id from authz.today_week_filmings(public.t_uid(p_last), public.t_now()) w order by w.id);
  v_rule := array(select f.id from public.filmings f
                   where authz.can_see_filming(f.id) and f.state in ('pending', 'scheduled')
                     and (f.starts_at at time zone 'Europe/Athens')::date
                         between date '2026-03-10' and date '2026-03-16'
                   order by f.id);
  return v_helper = v_rule;
end;
$$;
select is(array(select u from unnest(array['a1', 'a2', 'a3', 'a4', 'a5']) u where not public.t_week_same(u)), '{}'::text[],
  'Τα Γυρίσματα της κάρτας = όσα δίνει το can_see_filming, για κάθε Χρήστη');
select is((select array_agg(i ->> 'id' order by n)
             from jsonb_array_elements(authz.today_items_week_filming(public.t_uid('a1'), null, public.t_now()))
                  with ordinality x (i, n)),
  array['00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000022'], 'Χρονολογικά');
select is(authz.today_items_week_filming(public.t_uid('a1'), null, public.t_now()) -> 1 ->> 'subtitle', 'αναμένει έγκριση',
  'Το Γύρισμα που αναμένει έγκριση σημειώνεται');
select is(authz.today_items_week_filming(public.t_uid('a1'), null, public.t_now()) -> 0 ->> 'title',
  'Καφέ Αθηνά, Κατάστημα Κολωνακίου', 'Πελάτης και τοποθεσία');
select is(authz.today_count_week_filming(public.t_uid('a2'), null, timestamptz '2026-03-25 10:00+00'), 0,
  'Άδεια εβδομάδα: 0, όχι null (η κάρτα μένει)');

-- ───────────── Μέσα από τα public RPC ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(public.today_card('overdue_invoices', public.t_now()) ->> 'count', '1', 'Ο Ιδιοκτήτης ανοίγει την κάρτα');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok($$ select public.today_card('to_invoice', public.t_now()) $$, '42501', null,
  'Οι Πωλήσεις δεν ανοίγουν «Προς τιμολόγηση»');

select * from finish();
rollback;
