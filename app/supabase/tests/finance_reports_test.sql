-- Οι Αναφορές του παλιού DMS (d8) και τα Έξοδα στο Πακέτο λογιστή (d10): Έξοδα ανά κατηγορία, Έσοδα − Έξοδα = Κέρδος,
-- Τρόποι είσπραξης, Παραγωγές ανά κατάσταση και είδος. Άρνηση ανά ρόλο, ποσά null χωρίς «Βλέπει ποσά», Εύρος «δικές μου».
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι αριθμοί ελέγχονται με σταθερό «σήμερα» 2025-06-30 στις authz.*
-- (ως superuser, με τον Χρήστη στα claims)· η άρνηση μέσω των public RPC. Οι κλειστοί πίνακες δεν διαβάζονται ως authenticated.
begin;
select plan(49);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Λογιστής (ποσά για όλα, χωρίς κόστος) · a3 Πωλήσεις · a4 Παραγωγή
-- a5 «Αναφορές χωρίς ποσά» (reports.view + finance.view) · a6 «Παραγωγές δικές μου» (reports.view + productions.manage mine)
-- b1 Χρήστης πελάτη Α με «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'counts@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'mine@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ελένη', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Ρένα', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'Κώστας', 'counts@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'Λία', 'mine@example.com');
insert into public.roles (name, kind) values ('Αναφορές χωρίς ποσά (τεστ)', 'team'), ('Παραγωγές δικές μου (τεστ)', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, g.code, g.scope
  from (values
    ('Αναφορές χωρίς ποσά (τεστ)', 'reports.view', 'all'),
    ('Αναφορές χωρίς ποσά (τεστ)', 'finance.view', 'all'),
    ('Παραγωγές δικές μου (τεστ)', 'reports.view', 'all'),
    ('Παραγωγές δικές μου (τεστ)', 'productions.manage', 'mine')
  ) as g (role_name, code, scope)
  join public.roles r on r.name = g.role_name and r.kind = 'team';
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a4', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000a5', 'Αναφορές χωρίς ποσά (τεστ)'),
    ('00000000-0000-0000-0000-0000000000a6', 'Παραγωγές δικές μου (τεστ)')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- ───────────── Δεδομένα (χωρίς triggers: μόνο ό,τι διαβάζουν οι Αναφορές) ─────────────
set local session_replication_role = replica;

insert into public.clients (id, name, contact_name, contact_email) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', 'Μαρία Παπαδάκη', 'a@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', 'Νίκος Κίνης', 'b@example.com');
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

-- Τζίρος: Μάιος 1.000 (Α)· Ιούνιος 500 (Β) − Πιστωτικό 100 = 400.
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, credit_for, pdf_path) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'F-1',
   date '2025-05-10', date '2025-05-25', 1000, 240, 1240, null, 'pending/f-1.pdf'),
  ('00000000-0000-0000-0000-0000000001b1', '00000000-0000-0000-0000-0000000000c2', 'invoice', 'F-2',
   date '2025-06-05', date '2025-06-20', 500, 120, 620, null, 'pending/f-2.pdf');
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, credit_for, pdf_path) values
  ('00000000-0000-0000-0000-0000000001b2', '00000000-0000-0000-0000-0000000000c2', 'credit', 'F-P1',
   date '2025-06-10', null, 100, 24, 124, '00000000-0000-0000-0000-0000000001b1', 'pending/f-p1.pdf');

-- Έξοδα: Μάιος 1.000 με ανάλυση (Σταθερά 800 σε 3 γραμμές, Μεταβλητά 200)· Ιούνιος 700 χωρίς ανάλυση.
insert into public.cost_months (month, expenses_total, productive_hours, expense_categories) values
  (date '2025-05-01', 1000, 100,
   '[{"name":"Σταθερά","items":[{"name":"Ενοίκιο","lines":[{"label":"Γραφείο","amount":600}]},
                                {"name":"Λογαριασμοί","lines":[{"label":"Ρεύμα","amount":150},{"label":"Internet","amount":50}]}]},
     {"name":"Μεταβλητά","items":[{"name":"Μετακινήσεις","lines":[{"label":"Καύσιμα","amount":200}]}]}]'::jsonb),
  (date '2025-06-01', 700, 100, null);

-- Εισπράξεις: Τραπεζική 1.040 + παρακράτηση 200 (Μάιος)· Μετρητά 300 + 100 (Ιούνιος)· μία διαγραμμένη και μία πέρσι.
select set_config('t.bank', (select m.id::text from public.payment_methods m where m.label = 'Τραπεζική κατάθεση'), true);
select set_config('t.cash', (select m.id::text from public.payment_methods m where m.label = 'Μετρητά'), true);
insert into public.receipts (client_id, received_on, amount, withheld, method_id) values
  ('00000000-0000-0000-0000-0000000000c1', date '2025-05-20', 1040, 200, current_setting('t.bank')::uuid),
  ('00000000-0000-0000-0000-0000000000c2', date '2025-06-15', 300, 0, current_setting('t.cash')::uuid),
  ('00000000-0000-0000-0000-0000000000c2', date '2025-06-20', 100, 0, current_setting('t.cash')::uuid),
  ('00000000-0000-0000-0000-0000000000c1', date '2024-12-01', 50, 0, current_setting('t.bank')::uuid);
insert into public.receipts (client_id, received_on, amount, method_id, deleted_at, delete_reason) values
  ('00000000-0000-0000-0000-0000000000c2', date '2025-06-21', 999, current_setting('t.bank')::uuid, now(), 'Λάθος ποσό');

-- Συμφωνίες: e1 μηνιαία του Α, e2 και e3 εφάπαξ του Β.
insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, start_on, duration_months, renewal,
                               payment_days, unused_provisions, filming_notice_hours, filming_cancel_hours,
                               late_cancel_burns, no_show_burns, signed_at) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1', 'monthly', 'Social Α', 'active', 'signed',
   date '2025-01-31', date '2025-01-01', 12, 'auto', 15, 'lost', 48, 48, false, false, timestamptz '2025-01-02 10:00+00'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000f2', 'one_off', 'Βίντεο Β', 'active', 'signed',
   date '2025-04-30', null, null, null, 15, 'lost', 48, 48, false, false, timestamptz '2025-04-02 10:00+00'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000f3', 'one_off', 'Reel Β', 'active', 'signed',
   date '2025-05-31', null, null, null, 15, 'lost', 48, 48, false, false, timestamptz '2025-05-02 10:00+00');

-- Παραγωγές (έναρξη = created_at): d1 μηνιαία ανοιχτή (υπεύθυνη η a6) · d2 μηνιαία παραδομένη 1/5 · d3 εφάπαξ παραδομένη 1/6
-- · d4 εφάπαξ ακυρωμένη · d5 Εσωτερική ανοιχτή (Μέλος η a6) · d6 Εσωτερική πέρσι, παραδομένη 15/1 φέτος.
insert into public.productions (id, title, client_id, agreement_id, period_id, owner_id, state, created_at,
                                delivered_at, delivered_note, cancelled_at, cancelled_reason) values
  ('00000000-0000-0000-0000-0000000000d1', 'Μάρτιος Α', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000ee1', '00000000-0000-0000-0000-0000000000a6',
   'open', timestamptz '2025-03-10 10:00+00', null, null, null, null),
  ('00000000-0000-0000-0000-0000000000d2', 'Απρίλιος Α', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000ee2', '00000000-0000-0000-0000-0000000000a1',
   'delivered', timestamptz '2025-04-10 10:00+00', timestamptz '2025-05-01 10:00+00', 'Παραδόθηκε', null, null),
  ('00000000-0000-0000-0000-0000000000d3', 'Βίντεο Β', '00000000-0000-0000-0000-0000000000c2',
   '00000000-0000-0000-0000-0000000000e2', null, '00000000-0000-0000-0000-0000000000a1',
   'delivered', timestamptz '2025-05-05 10:00+00', timestamptz '2025-06-01 10:00+00', 'Παραδόθηκε', null, null),
  ('00000000-0000-0000-0000-0000000000d4', 'Reel Β', '00000000-0000-0000-0000-0000000000c2',
   '00000000-0000-0000-0000-0000000000e3', null, '00000000-0000-0000-0000-0000000000a1',
   'cancelled', timestamptz '2025-06-01 10:00+00', null, null, timestamptz '2025-06-02 10:00+00', 'Δεν χρειάζεται'),
  ('00000000-0000-0000-0000-0000000000d5', 'Showreel', null, null, null, '00000000-0000-0000-0000-0000000000a1',
   'open', timestamptz '2025-02-01 10:00+00', null, null, null, null),
  ('00000000-0000-0000-0000-0000000000d6', 'Παλιό εσωτερικό', null, null, null, '00000000-0000-0000-0000-0000000000a1',
   'delivered', timestamptz '2024-12-01 10:00+00', timestamptz '2025-01-15 10:00+00', 'Παραδόθηκε', null, null);
insert into public.production_members (production_id, user_id) values
  ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000a6');

set local session_replication_role = origin;

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.report_expenses_by_category() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Έξοδα');
select throws_ok($$ select public.report_profit() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Κέρδος');
select throws_ok($$ select public.report_payment_methods() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Τρόπους είσπραξης');
select throws_ok($$ select public.report_productions() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Παραγωγές');
reset role;

select public.t_as('b1');
select throws_ok($$ select public.report_expenses_by_category() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει Έξοδα');
select throws_ok($$ select public.report_profit() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει Κέρδος');
select throws_ok($$ select public.report_payment_methods() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει Τρόπους');
select throws_ok($$ select public.report_productions() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει Παραγωγές');

select public.t_as('a3');
select throws_ok($$ select public.report_expenses_by_category() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν Έξοδα');
select throws_ok($$ select public.report_profit() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν Κέρδος');
select throws_ok($$ select public.report_payment_methods() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν Τρόπους');
select throws_ok($$ select public.report_productions() $$, '42501', null,
  'Οι Πωλήσεις δεν βλέπουν Παραγωγές (δεν διαχειρίζονται Παραγωγές)');

select public.t_as('a4');
select throws_ok($$ select public.report_productions() $$, '42501', null, 'Η Παραγωγή χωρίς «Βλέπει Αναφορές» δεν βλέπει την Αναφορά');
select throws_ok($$ select public.report_expenses_by_category() $$, '42501', null, 'Η Παραγωγή δεν βλέπει Έξοδα');

select public.t_as('a5');
select throws_ok($$ select public.report_expenses_by_category() $$, '42501', null,
  'Χωρίς κόστος και χωρίς «Βλέπει ποσά» δεν φαίνονται τα Έξοδα');
select throws_ok($$ select public.report_profit() $$, '42501', null, 'Χωρίς κόστος δεν φαίνεται το Κέρδος');

select public.t_as('a2');
select throws_ok($$ select public.report_profit() $$, '42501', null, 'Ο Λογιστής δεν βλέπει Κέρδος (θέλει «Βλέπει κόστος»)');
select throws_ok($$ select public.report_productions() $$, '42501', null, 'Ο Λογιστής δεν βλέπει Παραγωγές');

select public.t_as('a1');
select throws_ok($$ select public.report_profit('next-year') $$, 'P0001', 'Άγνωστη Περίοδος', 'Άγνωστη Περίοδος → P0001');

-- ───────────── Έξοδα ανά κατηγορία ─────────────
select set_config('t.x', authz.report_expenses_by_category('this-year', date '2025-06-30')::text, true);
select is(
  (select string_agg((r->>'category') || ':' || trim_scale((r->>'amount')::numeric) || ':' || (r->>'share') || ':' || (r->>'lineCount'),
                     ' ' order by n)
     from jsonb_array_elements(current_setting('t.x')::jsonb->'rows') with ordinality x (r, n)),
  'Σταθερά:800:0.4706:3 Χωρίς ανάλυση:700:0.4118:0 Μεταβλητά:200:0.1176:1',
  'Οι κατηγορίες, μεγαλύτερη πρώτη· ο μήνας χωρίς ανάλυση στο «Χωρίς ανάλυση»'
);
select is((current_setting('t.x')::jsonb#>>'{totals,amount}')::numeric, 1700::numeric, 'Σύνολο Εξόδων = 1.000 + 700');
select is(
  (select (j->>'monthCount') || '/' || (j->>'unsplitMonths') || '/' || (j->>'missingMonths') from (select current_setting('t.x')::jsonb j) s),
  '2/1/4', 'Δύο μήνες με Έξοδα, ένας χωρίς ανάλυση, τέσσερις χωρίς Έξοδα ως σήμερα'
);
select is(
  jsonb_array_length(authz.report_expenses_by_category('last-year', date '2025-06-30')->'rows'), 0,
  'Πέρσι: καμία κατηγορία'
);
select public.t_as('a2');
select is(authz.report_expenses_by_category('this-year', date '2025-06-30'), current_setting('t.x')::jsonb,
  'Ο Λογιστής βλέπει τα Έξοδα όπως ο Ιδιοκτήτης');
select public.t_as('a1');

-- ───────────── Έσοδα − Έξοδα = Κέρδος ─────────────
select set_config('t.p', authz.report_profit('this-year', date '2025-06-30')::text, true);
select is(
  (select string_agg((m->>'month') || ':' || coalesce((trim_scale((m->>'income')::numeric))::text, '-') || ':'
                     || coalesce((trim_scale((m->>'expenses')::numeric))::text, '-') || ':' || coalesce((trim_scale((m->>'profit')::numeric))::text, '-')
                     || ':' || coalesce(m->>'margin', '-') || ':' || (m->>'isPartial'), ' ' order by n)
     from jsonb_array_elements(current_setting('t.p')::jsonb->'months') with ordinality x (m, n)
    where m->>'month' >= '2025-04'),
  '2025-04:0:-:-:-:false 2025-05:1000:1000:0:0.0000:false 2025-06:400:700:-300:-0.7500:true',
  'Ανά μήνα: Έσοδα μετά τα Πιστωτικά, Έξοδα, Κέρδος· μήνας χωρίς Έξοδα χωρίς Κέρδος'
);
select is(jsonb_array_length(current_setting('t.p')::jsonb->'months'), 6, 'Φέτος ως σήμερα: Ιανουάριος–Ιούνιος');
select is(
  (select (trim_scale((t->>'income')::numeric))::text || '/' || (trim_scale((t->>'expenses')::numeric))::text || '/' || (trim_scale((t->>'profit')::numeric))::text
          || '/' || (t->>'margin')
     from (select current_setting('t.p')::jsonb->'totals' t) s),
  '1400/1700/-300/-0.2143', 'Σύνολα μόνο από τους μήνες με Έξοδα'
);
select is((current_setting('t.p')::jsonb->>'missingMonths')::int, 4, 'Τέσσερις μήνες χωρίς Έξοδα');

-- ───────────── Τρόποι είσπραξης ─────────────
select set_config('t.m', authz.report_payment_methods('this-year', date '2025-06-30')::text, true);
select is(
  (select string_agg((r->>'label') || ':' || trim_scale((r->>'amount')::numeric) || ':' || (r->>'share') || ':' || (r->>'receiptCount'),
                     ' ' order by n)
     from jsonb_array_elements(current_setting('t.m')::jsonb->'rows') with ordinality x (r, n)),
  'Τραπεζική κατάθεση:1040:0.7222:1 Μετρητά:400:0.2778:2',
  'Ανά Τρόπο, μεγαλύτερο πρώτο· χωρίς τη διαγραμμένη και την περσινή'
);
select is(
  (select (trim_scale((t->>'amount')::numeric))::text || '/' || (t->>'receiptCount') || '/' || (trim_scale((t->>'withheld')::numeric))::text
          || '/' || (t->>'withheldCount')
     from (select current_setting('t.m')::jsonb->'totals' t) s),
  '1440/3/200/1', 'Σύνολα με την παρακράτηση χωριστά'
);
select public.t_as('a2');
select is(authz.report_payment_methods('this-year', date '2025-06-30'), current_setting('t.m')::jsonb,
  'Ο Λογιστής βλέπει τους Τρόπους όπως ο Ιδιοκτήτης');
select public.t_as('a5');
select set_config('t.m5', authz.report_payment_methods('this-year', date '2025-06-30')::text, true);
select is(
  (select string_agg((r->>'label') || ':' || coalesce(r->>'amount', 'null') || ':' || (r->>'receiptCount'), ' ' order by n)
     from jsonb_array_elements(current_setting('t.m5')::jsonb->'rows') with ordinality x (r, n)),
  'Μετρητά:null:2 Τραπεζική κατάθεση:null:1', 'Χωρίς «Βλέπει ποσά»: μόνο πλήθη, αλφαβητικά'
);
select is(
  (select coalesce(t->>'amount', 'null') || '/' || coalesce(t->>'withheld', 'null') || '/' || (t->>'receiptCount')
     from (select current_setting('t.m5')::jsonb->'totals' t) s),
  'null/null/3', 'Χωρίς «Βλέπει ποσά»: σύνολα χωρίς ποσά'
);
select public.t_as('a1');

-- ───────────── Παραγωγές ανά κατάσταση και είδος ─────────────
select set_config('t.g', authz.report_productions('this-year', date '2025-06-30')::text, true);
select is(
  (select string_agg((r->>'type') || ':' || (r->>'open') || '/' || (r->>'delivered') || '/' || (r->>'cancelled') || '/' || (r->>'total'),
                     ' ' order by n)
     from jsonb_array_elements(current_setting('t.g')::jsonb->'rows') with ordinality x (r, n)),
  'monthly:1/1/0/2 one_off:0/1/1/2 internal:1/0/0/1',
  'Ανά είδος: όσες ξεκίνησαν φέτος, με την κατάστασή τους σήμερα'
);
select is(
  (select (t->>'open') || '/' || (t->>'delivered') || '/' || (t->>'cancelled') || '/' || (t->>'total')
     from (select current_setting('t.g')::jsonb->'totals' t) s),
  '2/2/1/5', 'Σύνολα'
);
select is((current_setting('t.g')::jsonb->>'deliveredInPeriod')::int, 3,
  'Παραδόθηκαν φέτος τρεις (και η περσινή Εσωτερική)');
select public.t_as('a6');
select set_config('t.g6', authz.report_productions('this-year', date '2025-06-30')::text, true);
select is(
  (select string_agg((r->>'type') || ':' || (r->>'total'), ' ' order by n)
     from jsonb_array_elements(current_setting('t.g6')::jsonb->'rows') with ordinality x (r, n)),
  'monthly:1 internal:1', 'Εύρος «δικές μου»: μόνο όπου είναι υπεύθυνη ή Μέλος'
);
select is((current_setting('t.g6')::jsonb->>'deliveredInPeriod')::int, 0, '«Δικές μου»: καμία παραδομένη');
select public.t_as('a1');

-- ───────────── Πακέτο λογιστή: τα Έξοδα ─────────────
select public.t_as('a2');
select set_config('t.k', authz.export_accountant_pack('2025-05', date '2025-06-30')::text, true);
select is(
  (select string_agg((e->>'category') || '/' || coalesce(e->>'item', '-') || '/' || coalesce(e->>'label', '-') || ':'
                     || trim_scale((e->>'amount')::numeric), ' ' order by n)
     from jsonb_array_elements(current_setting('t.k')::jsonb->'expenses') with ordinality x (e, n)),
  'Μεταβλητά/Μετακινήσεις/Καύσιμα:200 Σταθερά/Ενοίκιο/Γραφείο:600 Σταθερά/Λογαριασμοί/Internet:50 Σταθερά/Λογαριασμοί/Ρεύμα:150',
  'Ο Λογιστής παίρνει τις γραμμές Εξόδων του μήνα'
);
select is(
  (select (e->>'category') || ':' || trim_scale((e->>'amount')::numeric) || ':' || coalesce(e->>'item', 'null')
     from jsonb_array_elements(authz.export_accountant_pack('2025-06', date '2025-06-30')->'expenses') e),
  'Χωρίς ανάλυση:700:null', 'Μήνας χωρίς ανάλυση: μία γραμμή με το σύνολο'
);
select is(
  (select (a.after->>'rows') || '|' || (a.after#>>'{filters,expenses}')
     from public.audit_log a
    where a.entity = 'report_exports' and a.after->>'kind' = 'accountant_pack' and a.after#>>'{filters,month}' = '2025-05'),
  '2|4', 'Το Ίχνος μετρά Τιμολόγια + Εισπράξεις όπως πριν· τα Έξοδα στα φίλτρα'
);
select ok(not (current_setting('t.k')::jsonb ? 'hourCost') and not (current_setting('t.k')::jsonb ? 'productiveHours'),
  'Το πακέτο δεν έχει Κόστος ώρας ούτε παραγωγικές ώρες');
select public.t_as('a1');
select is(
  jsonb_array_length(authz.export_accountant_pack('2025-05', date '2025-06-30')->'expenses'), 4,
  'Ο Ιδιοκτήτης παίρνει κι αυτός τα Έξοδα'
);

-- ───────────── Εξαγωγή των νέων Αναφορών ─────────────
select lives_ok($$ select authz.export_report('expenses', 'report_expenses_by_category', '{"p_period":"this-year"}', 'rows', 'xlsx') $$,
  'Τα Έξοδα ανά κατηγορία εξάγονται');
select lives_ok($$ select authz.export_report('profit', 'report_profit', '{"p_period":"this-year"}', 'months', 'csv') $$,
  'Το Κέρδος εξάγεται');
select lives_ok($$ select authz.export_report('payment-methods', 'report_payment_methods', '{}', 'rows', 'xlsx') $$,
  'Οι Τρόποι είσπραξης εξάγονται');
select throws_ok($$ select authz.export_report('profit', 'report_turnover_monthly', '{}', 'months', 'xlsx') $$, 'P0001',
  'Αυτή η Αναφορά δεν εξάγεται', 'Λάθος ζεύγος Αναφοράς και RPC απορρίπτεται');

-- ───────────── Κλειστές εσωτερικές συναρτήσεις ─────────────
set local role authenticated;
select lives_ok($$ select public.report_payment_methods('this-month') $$, 'Η εφαρμογή (authenticated) καλεί τους Τρόπους');
select throws_ok($$ select authz.report_profit(null, current_date) $$, '42501', null,
  'Οι authz.report_* είναι κλειστές για την εφαρμογή (μόνο μέσω public RPC)');
reset role;

select * from finish();
rollback;
