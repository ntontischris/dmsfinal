-- Αναφορές Ργ #200 και Ρδ #201: Εξαγωγή συνόλων (M2), Εξαγωγή Αναφοράς, Ιστορικό εξαγωγών, Πακέτο λογιστή.
-- Άρνηση ανά RPC και ρόλο, Ίχνος με φίλτρα και πλήθος, ορατότητα Ιστορικού, ποσά null χωρίς «Βλέπει ποσά», Πακέτο μόνο
-- με όσα βλέπει ο Χρήστης. Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι αριθμοί ελέγχονται με σταθερό «σήμερα»
-- 2025-03-31 στις authz.* (ως superuser, με τον Χρήστη στα claims)· η άρνηση μέσω των public RPC.
begin;
select plan(78);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Λογιστής · a3 Πωλήσεις · a4 Παραγωγή · a7 Διαχείριση
-- a5 «Εξαγωγή χωρίς πηγή» (reports.export + reports.view) · a6 «Εξαγωγή χωρίς ποσά» (+ finance.view, clients.view)
-- a8 «Εξαγωγή δικών Πελατών» (reports.export + clients.view Εύρος «με αφορά») · b1 Χρήστης πελάτη Α με «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'nosource@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'noamounts@example.com'),
  ('00000000-0000-0000-0000-0000000000a7', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a8', 'mine@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ελένη', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Ρένα', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'Κώστας', 'nosource@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'Λία', 'noamounts@example.com'),
  ('00000000-0000-0000-0000-0000000000a7', 'Μάρκος', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a8', 'Νίνα', 'mine@example.com');
insert into public.roles (name, kind) values
  ('Εξαγωγή χωρίς πηγή (τεστ)', 'team'), ('Εξαγωγή χωρίς ποσά (τεστ)', 'team'), ('Εξαγωγή δικών Πελατών (τεστ)', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, g.code, g.scope
  from (values
    ('Εξαγωγή χωρίς πηγή (τεστ)', 'reports.export', 'all'),
    ('Εξαγωγή χωρίς πηγή (τεστ)', 'reports.view', 'all'),
    ('Εξαγωγή χωρίς ποσά (τεστ)', 'reports.export', 'all'),
    ('Εξαγωγή χωρίς ποσά (τεστ)', 'reports.view', 'all'),
    ('Εξαγωγή χωρίς ποσά (τεστ)', 'finance.view', 'all'),
    ('Εξαγωγή χωρίς ποσά (τεστ)', 'clients.view', 'all'),
    ('Εξαγωγή δικών Πελατών (τεστ)', 'reports.export', 'all'),
    ('Εξαγωγή δικών Πελατών (τεστ)', 'clients.view', 'mine')
  ) as g (role_name, code, scope)
  join public.roles r on r.name = g.role_name and r.kind = 'team';
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a4', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000a5', 'Εξαγωγή χωρίς πηγή (τεστ)'),
    ('00000000-0000-0000-0000-0000000000a6', 'Εξαγωγή χωρίς ποσά (τεστ)'),
    ('00000000-0000-0000-0000-0000000000a7', 'Διαχείριση'),
    ('00000000-0000-0000-0000-0000000000a8', 'Εξαγωγή δικών Πελατών (τεστ)')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Δεδομένα (χωρίς triggers: μόνο ό,τι διαβάζουν οι εξαγωγές) ─────────────
set session_replication_role = replica;

-- Α (Υπεύθυνη η a8), Β, και ένας συγχωνευμένος Γ που δεν εξάγεται.
insert into public.clients (id, name, contact_name, contact_email, afm, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α & Υιοί', 'Μαρία Παπαδάκη', 'a@example.com', '111111111',
   '00000000-0000-0000-0000-0000000000a8'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', 'Νίκος Κίνης', 'b@example.com', null, null);
insert into public.clients (id, name, contact_name, contact_email, archived_at, merged_into_id) values
  ('00000000-0000-0000-0000-0000000000c3', 'Πελάτης Γ', 'Ελένη Γ', 'c@example.com', now(), '00000000-0000-0000-0000-0000000000c2');
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

-- Μάρτιος 2025: A-1 (Α, 10/3) 100 + 24 εξοφλημένο με Είσπραξη 124 (20/3)· B-1 (Β, 15/3) 200 + 48 ανεξόφλητο.
-- Ένα ακυρωμένο X-1 (12/3) και μία διαγραμμένη Είσπραξη (25/3) δεν εξάγονται. A-2 (5/4) είναι εκτός μήνα.
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'A-1',
   date '2025-03-10', date '2025-03-25', 100, 24, 124, 'pending/t-x-a1.pdf'),
  ('00000000-0000-0000-0000-0000000001b1', '00000000-0000-0000-0000-0000000000c2', 'invoice', 'B-1',
   date '2025-03-15', date '2025-04-15', 200, 48, 248, 'pending/t-x-b1.pdf'),
  ('00000000-0000-0000-0000-0000000001a2', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'A-2',
   date '2025-04-05', date '2025-04-20', 50, 12, 62, 'pending/t-x-a2.pdf');
insert into public.invoices (client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path, voided_at, void_reason)
values ('00000000-0000-0000-0000-0000000000c2', 'invoice', 'X-1', date '2025-03-12', date '2025-03-22', 999, 0, 999,
        'pending/t-x-x1.pdf', now(), 'Λάθος καταχώριση');

select set_config('t.bank', (select m.id::text from public.payment_methods m where m.label = 'Τραπεζική κατάθεση'), true);
insert into public.receipts (client_id, received_on, amount, method_id, note) values
  ('00000000-0000-0000-0000-0000000000c1', date '2025-03-20', 124, current_setting('t.bank')::uuid, 'Μάρτιος');
insert into public.receipts (client_id, received_on, amount, method_id, deleted_at, delete_reason) values
  ('00000000-0000-0000-0000-0000000000c2', date '2025-03-25', 50, current_setting('t.bank')::uuid, now(), 'Λάθος ποσό');

insert into public.cost_months (month, expenses_total, productive_hours) values (date '2025-03-01', 3000, 120);

set session_replication_role = origin;

select set_config('t.args', '{"p_period": "this-year"}', true);

-- ───────────── Άρνηση: ανώνυμος ─────────────
set local role anon;
select throws_ok($$ select public.export_datasets() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τα σύνολα');
select throws_ok($$ select public.export_dataset('invoices') $$, '42501', null, 'Ο ανώνυμος δεν εξάγει σύνολο');
select throws_ok($$ select public.export_report('by-client', 'report_turnover_by_client', '{}'::jsonb, 'rows') $$, '42501', null,
  'Ο ανώνυμος δεν εξάγει Αναφορά');
select throws_ok($$ select public.export_accountant_pack('2025-03') $$, '42501', null, 'Ο ανώνυμος δεν παίρνει Πακέτο λογιστή');
select throws_ok($$ select public.export_history() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Ιστορικό');
reset role;

-- ───────────── Άρνηση: χωρίς «Εξάγει δεδομένα» (Παραγωγή, Πωλήσεις, Χρήστης πελάτη) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select throws_ok($$ select public.export_datasets() $$, '42501', null, 'Η Παραγωγή δεν βλέπει τα σύνολα');
select throws_ok($$ select public.export_dataset('clients') $$, '42501', null, 'Η Παραγωγή δεν εξάγει σύνολο');
select throws_ok($$ select public.export_report('by-client', 'report_turnover_by_client', current_setting('t.args')::jsonb, 'rows') $$,
  '42501', null, 'Η Παραγωγή δεν εξάγει Αναφορά');
select throws_ok($$ select public.export_accountant_pack('2025-03') $$, '42501', null, 'Η Παραγωγή δεν παίρνει Πακέτο λογιστή');
select throws_ok($$ select public.export_history() $$, '42501', null, 'Η Παραγωγή δεν βλέπει Ιστορικό');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok($$ select public.export_datasets() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν τα σύνολα');
select throws_ok($$ select public.export_dataset('clients') $$, '42501', null,
  'Οι Πωλήσεις δεν εξάγουν ούτε τους Πελάτες που βλέπουν');
select throws_ok($$ select public.export_report('by-client', 'report_turnover_by_client', current_setting('t.args')::jsonb, 'rows') $$,
  '42501', null, 'Οι Πωλήσεις δεν εξάγουν Αναφορά');
select throws_ok($$ select public.export_accountant_pack('2025-03') $$, '42501', null, 'Οι Πωλήσεις δεν παίρνουν Πακέτο λογιστή');
select throws_ok($$ select public.export_history() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν Ιστορικό');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok($$ select public.export_datasets() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει τα σύνολα');
select throws_ok($$ select public.export_dataset('invoices') $$, '42501', null, 'Ο Χρήστης πελάτη δεν εξάγει Τιμολόγια');
select throws_ok($$ select public.export_report('by-client', 'report_turnover_by_client', current_setting('t.args')::jsonb, 'rows') $$,
  '42501', null, 'Ο Χρήστης πελάτη δεν εξάγει Αναφορά');
select throws_ok($$ select public.export_accountant_pack('2025-03') $$, '42501', null, 'Ο Χρήστης πελάτη δεν παίρνει Πακέτο λογιστή');
select throws_ok($$ select public.export_history() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει Ιστορικό');

-- ───────────── Άρνηση: «Εξάγει δεδομένα» χωρίς το «Βλέπει» της πηγής ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
select is(authz.export_datasets('this-month', date '2025-03-31')->'items', '[]'::jsonb,
  'Χωρίς πηγή: κανένα σύνολο στη λίστα');
select throws_ok($$ select public.export_dataset('invoices') $$, '42501', null, 'Χωρίς «Βλέπει Οικονομικά»: όχι Τιμολόγια');
select throws_ok($$ select public.export_dataset('ledgers') $$, '42501', null, 'Χωρίς «Βλέπει Οικονομικά»: όχι Καρτέλες');
select throws_ok($$ select public.export_dataset('clients') $$, '42501', null, 'Χωρίς «Βλέπει Πελάτες»: όχι Πελάτες');
select throws_ok($$ select public.export_dataset('agreements') $$, '42501', null, 'Χωρίς «Βλέπει Συμφωνίες»: όχι Συμφωνίες');
select throws_ok($$ select public.export_dataset('expenses') $$, '42501', null, 'Χωρίς «Βλέπει κόστος»: όχι Έξοδα');
select throws_ok($$ select public.export_accountant_pack('2025-03') $$, '42501', null,
  'Χωρίς «Βλέπει Οικονομικά»: όχι Πακέτο λογιστή');
select throws_ok($$ select public.export_report('by-client', 'report_turnover_by_client', current_setting('t.args')::jsonb, 'rows') $$,
  '42501', null, 'Η Αναφορά ελέγχει τη δική της πηγή: χωρίς «Βλέπει Οικονομικά» δεν εξάγεται');
select is(
  (select count(*)::int from public.audit_log a
    where a.entity = 'report_exports' and a.entity_id = '00000000-0000-0000-0000-0000000000a5'),
  0, 'Καμία άρνηση δεν γράφει Ίχνος εξαγωγής'
);

-- ───────────── Λογιστής: τα σύνολα και τα Τιμολόγια του μήνα ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is(
  (select string_agg(i->>'code', ',' order by n)
     from jsonb_array_elements(authz.export_datasets('this-month', date '2025-03-31')->'items') with ordinality x (i, n)),
  'invoices,receipts,billables,ledgers,clients,agreements',
  'Λογιστής: όλα τα σύνολα εκτός από τα Έξοδα (δεν βλέπει κόστος)'
);
select is(
  (select string_agg((i->>'code') || ':' || (i->>'rowCount'), ',' order by n)
     from jsonb_array_elements(authz.export_datasets('this-month', date '2025-03-31')->'items') with ordinality x (i, n)
    where i->>'code' in ('invoices', 'receipts', 'ledgers', 'clients')),
  'invoices:2,receipts:1,ledgers:3,clients:2',
  'Πλήθος γραμμών πριν τη λήψη: χωρίς ακυρωμένα, διαγραμμένα ή συγχωνευμένους'
);
select throws_ok($$ select public.export_dataset('expenses') $$, '42501', null, 'Ο Λογιστής δεν εξάγει Έξοδα');
select throws_ok($$ select public.export_dataset('unknown') $$, 'P0001', 'Άγνωστο σύνολο δεδομένων', 'Άγνωστο σύνολο → P0001');
select throws_ok($$ select public.export_dataset('invoices', 'this-year', 'pdf') $$, 'P0001', 'Άγνωστη μορφή αρχείου',
  'Άγνωστη μορφή → P0001');
select throws_ok($$ select public.export_dataset('invoices', 'next-year') $$, 'P0001', 'Άγνωστη Περίοδος',
  'Άγνωστη Περίοδος → P0001');

select set_config('t.inv', authz.export_dataset('invoices', 'this-month', 'xlsx', date '2025-03-31')::text, true);
select is(
  (select string_agg((r->>'number') || ':' || (r->>'total') || ':' || (r->>'remaining') || ':' || (r->>'status'), ' '
                     order by r->>'number')
     from jsonb_array_elements(current_setting('t.inv')::jsonb->'rows') r),
  'A-1:124.00:0.00:Εξοφλημένο B-1:248.00:248.00:Ανεξόφλητο',
  'Τιμολόγια του μήνα με σύνολο, υπόλοιπο και κατάσταση'
);
select is(
  (select (t->>'dataset') || '|' || (t->>'amounts') || '|' || (t#>>'{period,from}') || '..' || (t#>>'{period,to}')
     from (select current_setting('t.inv')::jsonb as t) x),
  'invoices|true|2025-03-01..2025-03-31', 'Η απάντηση λέει σύνολο, ποσά και Περίοδο'
);
select is(
  (select (a.after->>'event') || '|' || (a.after->>'kind') || '|' || (a.after->>'subject') || '|' || (a.after->>'rows') || '|'
          || (a.after->>'format') || '|' || (a.after#>>'{filters,period}') || '|' || (a.after#>>'{filters,from}') || '|'
          || a.actor_id::text
     from public.audit_log a
    where a.entity = 'report_exports' and a.entity_id = '00000000-0000-0000-0000-0000000000a2'
    order by a.id desc limit 1),
  'exported|dataset|invoices|2|xlsx|this-month|2025-03-01|00000000-0000-0000-0000-0000000000a2',
  'Ίχνος: ποιος, ποιο σύνολο, Περίοδος, γραμμές και μορφή'
);
select is(
  (select count(*)::int from public.audit_log a
    where a.entity = 'report_exports' and a.after::text ~ '"(total|net|amount)"'),
  0, 'Το Ίχνος δεν κρατά ποσά'
);

select set_config('t.led', authz.export_dataset('ledgers', 'this-month', 'csv', date '2025-03-31')::text, true);
select is(
  (select string_agg((r->>'label') || ':' || (r->>'debit') || '/' || (r->>'credit') || '=' || (r->>'balance'), ' '
                     order by n)
     from jsonb_array_elements(current_setting('t.led')::jsonb->'rows') with ordinality x (r, n)
    where r->>'clientName' = 'Πελάτης Α & Υιοί'),
  'Τιμολόγιο A-1:124.00/0=124.00 Είσπραξη (Μάρτιος):0/124.00=0.00',
  'Καρτέλα: κινήσεις του μήνα με το υπόλοιπο μετά από κάθε κίνηση'
);
select is(
  (select r->>'balance' from jsonb_array_elements(current_setting('t.led')::jsonb->'rows') r
    where r->>'clientName' = 'Πελάτης Β'),
  (public.client_ledger_view('00000000-0000-0000-0000-0000000000c2')->>'balance'),
  'Ισοτιμία: το υπόλοιπο της εξαγωγής = το υπόλοιπο της Καρτέλας'
);
select is(
  jsonb_array_length(authz.export_dataset('clients', null, 'xlsx', date '2025-03-31')->'rows'), 2,
  'Πελάτες: όλοι όσοι βλέπει ο Λογιστής, χωρίς τους συγχωνευμένους'
);
select ok(
  authz.export_dataset('clients', 'this-month', 'xlsx', date '2025-03-31')->'period' = 'null'::jsonb,
  'Οι Πελάτες εξάγονται χωρίς Περίοδο'
);
select lives_ok($$ select authz.export_dataset('billables', 'this-year', 'xlsx', date '2025-03-31') $$,
  'Τα Τιμολογητέα εξάγονται');
select lives_ok($$ select authz.export_dataset('agreements', null, 'xlsx', date '2025-03-31') $$, 'Οι Συμφωνίες εξάγονται');

-- ───────────── Πακέτο λογιστή ─────────────
select set_config('t.pack', authz.export_accountant_pack('2025-03', date '2025-04-10')::text, true);
select is(
  (select string_agg((r->>'number') || ':' || (r->>'pdfPath'), ' ' order by r->>'number')
     from jsonb_array_elements(current_setting('t.pack')::jsonb->'invoices') r),
  'A-1:pending/t-x-a1.pdf B-1:pending/t-x-b1.pdf',
  'Πακέτο: μόνο τα μη ακυρωμένα Τιμολόγια του μήνα, με τη διαδρομή του PDF'
);
select is(
  (select jsonb_array_length(t->'receipts') || '|' || (t->>'pdfs') || '|' || (t->>'isPartial') || '|' || (t->>'month')
     from (select current_setting('t.pack')::jsonb as t) x),
  '1|true|false|2025-03', 'Πακέτο: οι Εισπράξεις του μήνα (όχι οι διαγραμμένες), κλεισμένος μήνας'
);
select is(
  (select (a.after->>'kind') || '|' || (a.after->>'rows') || '|' || (a.after#>>'{filters,month}') || '|'
          || (a.after#>>'{filters,invoices}') || '|' || (a.after->>'format')
     from public.audit_log a
    where a.entity = 'report_exports' and a.entity_id = '00000000-0000-0000-0000-0000000000a2'
    order by a.id desc limit 1),
  'accountant_pack|3|2025-03|2|zip', 'Το Πακέτο γράφεται στο Ίχνος όπως κάθε εξαγωγή'
);
select is((authz.export_accountant_pack('2025-03', date '2025-03-31')->>'isPartial')::boolean, true,
  'Ο τρέχων μήνας είναι «ως σήμερα»');
select throws_ok($$ select authz.export_accountant_pack('2025-05', date '2025-03-31') $$, 'P0001',
  'Ο μήνας δεν έχει αρχίσει ακόμα', 'Μελλοντικός μήνας → P0001');
select throws_ok($$ select public.export_accountant_pack('2025-13') $$, 'P0001', 'Άγνωστος μήνας', 'Άκυρος μήνας → P0001');

-- ───────────── Χωρίς «Βλέπει ποσά»: πλήθη και κείμενα, ποσά null, χωρίς PDF ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a6","role":"authenticated"}', true);
select set_config('t.inv0', authz.export_dataset('invoices', 'this-month', 'xlsx', date '2025-03-31')::text, true);
select is(
  (select (t->>'amounts') || '|' || jsonb_array_length(t->'rows')
     from (select current_setting('t.inv0')::jsonb as t) x),
  'false|2', 'Χωρίς ποσά: ίδιες γραμμές'
);
select is(
  (select count(*)::int from jsonb_array_elements(current_setting('t.inv0')::jsonb->'rows') r
    where r->'net' <> 'null'::jsonb or r->'vat' <> 'null'::jsonb or r->'total' <> 'null'::jsonb
       or r->'remaining' <> 'null'::jsonb),
  0, 'Χωρίς ποσά: κανένα ποσό Τιμολογίου'
);
select is(
  (select count(*)::int from jsonb_array_elements(authz.export_dataset('receipts', 'this-month', 'csv', date '2025-03-31')->'rows') r
    where r->'amount' <> 'null'::jsonb),
  0, 'Χωρίς ποσά: κανένα ποσό Είσπραξης'
);
select is(
  (select count(*)::int from jsonb_array_elements(authz.export_dataset('ledgers', 'this-month', 'csv', date '2025-03-31')->'rows') r
    where r->'debit' <> 'null'::jsonb or r->'credit' <> 'null'::jsonb or r->'balance' <> 'null'::jsonb),
  0, 'Χωρίς ποσά: κανένα ποσό Καρτέλας'
);
select set_config('t.pack0', authz.export_accountant_pack('2025-03', date '2025-04-10')::text, true);
select is(
  (select (t->>'pdfs') || '|' || jsonb_array_length(t->'invoices') || '|'
          || (select count(*) from jsonb_array_elements(t->'invoices') r where r->'pdfPath' <> 'null'::jsonb)
     from (select current_setting('t.pack0')::jsonb as t) x),
  'false|2|0', 'Χωρίς ποσά: το Πακέτο δεν δίνει διαδρομές PDF'
);

-- ───────────── Εύρος: «Βλέπει Πελάτες» με αφορά ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a8","role":"authenticated"}', true);
select is(
  (select string_agg(i->>'code', ',') from jsonb_array_elements(authz.export_datasets(null, date '2025-03-31')->'items') i),
  'clients', 'Με «Βλέπει Πελάτες» μόνο: μόνο το σύνολο Πελάτες'
);
select is(
  (select string_agg(r->>'name', ',') from jsonb_array_elements(authz.export_dataset('clients', null, 'csv', date '2025-03-31')->'rows') r),
  'Πελάτης Α & Υιοί', 'Εύρος «με αφορά»: μόνο οι Πελάτες όπου είναι Υπεύθυνη'
);

-- ───────────── Ιδιοκτήτης: Έξοδα και Εξαγωγή Αναφοράς ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(
  (select (r->>'month') || ':' || (r->>'expenses') || ':' || (r->>'hourCost')
     from jsonb_array_elements(authz.export_dataset('expenses', 'this-month', 'xlsx', date '2025-03-31')->'rows') r),
  '2025-03:3000.00:25.00', 'Ο Ιδιοκτήτης εξάγει τα Έξοδα του μήνα'
);
select is(
  authz.export_report('by-client', 'report_turnover_by_client', current_setting('t.args')::jsonb, 'rows', 'csv'),
  public.report_turnover_by_client('this-year'),
  'Η Εξαγωγή Αναφοράς δίνει το JSON της Αναφοράς όπως φαίνεται, με τα ίδια φίλτρα'
);
select is(
  (select (a.after->>'kind') || '|' || (a.after->>'subject') || '|' || (a.after->>'rows') || '|' || (a.after#>>'{filters,period}')
          || '|' || (a.after->>'format')
     from public.audit_log a
    where a.entity = 'report_exports' and a.entity_id = '00000000-0000-0000-0000-0000000000a1'
    order by a.id desc limit 1),
  'report|by-client|' || jsonb_array_length(public.report_turnover_by_client('this-year')->'rows') || '|this-year|csv',
  'Ίχνος της Εξαγωγής Αναφοράς: Αναφορά, φίλτρα, γραμμές'
);
select set_config('t.r', authz.export_report('turnover', 'report_turnover_monthly',
  '{"p_period": "this-year", "p_client": "00000000-0000-0000-0000-0000000000c1"}', 'months', 'xlsx')::text, true);
select is(current_setting('t.r')::jsonb#>>'{client,id}', '00000000-0000-0000-0000-0000000000c1',
  'Η Εξαγωγή Αναφοράς περνά το φίλτρο Πελάτη στην Αναφορά');
select is(
  (select (a.after->>'subject') || '|' || (a.after#>>'{filters,client}') from public.audit_log a
    where a.entity = 'report_exports' and a.entity_id = '00000000-0000-0000-0000-0000000000a1'
    order by a.id desc limit 1),
  'turnover|00000000-0000-0000-0000-0000000000c1', 'Ίχνος της Εξαγωγής Αναφοράς: και το φίλτρο Πελάτη'
);
select throws_ok($$ select authz.export_report('history', 'export_history', '{}', 'items', 'xlsx') $$, 'P0001',
  'Αυτή η Αναφορά δεν εξάγεται', 'Εξαγωγή μόνο από public.report_* RPC');
select throws_ok($$ select authz.export_report('x', 'report_nothing_here', '{}', 'rows', 'xlsx') $$, 'P0001',
  'Αυτή η Αναφορά δεν εξάγεται', 'Ανύπαρκτο RPC → P0001');
select throws_ok($$ select authz.export_report('by-client', 'report_turnover_by_client', '{"p_today": "2020-01-01"}', 'rows', 'xlsx') $$,
  'P0001', 'Αυτή η Αναφορά δεν εξάγεται', 'Μόνο τα φίλτρα της διεύθυνσης (Περίοδος, Πελάτης, Πωλητής)');
select throws_ok($$ select authz.export_report('by-client', 'report_turnover_by_client', '{}', 'nope', 'xlsx') $$, 'P0001',
  'Αυτή η Αναφορά δεν εξάγεται', 'Χωρίς πίνακα γραμμών → P0001');

-- ───────────── Ιστορικό εξαγωγών ─────────────
select is(
  (select (h->>'all') || '|' || (select count(*) from jsonb_array_elements(h->'items') i
                                  where i->>'actorName' = 'Ελένη') || '|'
          || (select count(*) from jsonb_array_elements(h->'items') i where (i->>'isMine')::boolean)
     from (select authz.export_history(200) as h) x),
  'true|' || (select count(*) from public.audit_log a where a.entity = 'report_exports'
                and a.entity_id = '00000000-0000-0000-0000-0000000000a2')
  || '|' || (select count(*) from public.audit_log a where a.entity = 'report_exports'
               and a.entity_id = '00000000-0000-0000-0000-0000000000a1'),
  'Ο Ιδιοκτήτης βλέπει όλο το Ιστορικό, και του Λογιστή'
);
select ok(authz.audit_entity_allowed('report_exports'), 'Οι εξαγωγές φαίνονται στο Ίχνος σε όποιον «Βλέπει ίχνος»');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a7","role":"authenticated"}', true);
select is(
  (select (h->>'all') || '|' || jsonb_array_length(h->'items') from (select authz.export_history(200) as h) x),
  'true|' || (select count(*) from public.audit_log a where a.entity = 'report_exports'),
  'Η Διαχείριση βλέπει όλο το Ιστορικό'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select set_config('t.h', authz.export_history(200)::text, true);
select is(
  (select (h->>'all') || '|' || jsonb_array_length(h->'items') || '|'
          || (select count(*) from jsonb_array_elements(h->'items') i where not (i->>'isMine')::boolean)
     from (select current_setting('t.h')::jsonb as h) x),
  'false|' || (select count(*) from public.audit_log a where a.entity = 'report_exports'
                 and a.entity_id = '00000000-0000-0000-0000-0000000000a2') || '|0',
  'Ο Λογιστής βλέπει μόνο τις δικές του εξαγωγές'
);
select is(
  (select (i->>'kind') || '|' || (i->>'subject') || '|' || (i->>'format') || '|' || (i->>'rows')
     from jsonb_array_elements(current_setting('t.h')::jsonb->'items') with ordinality x (i, n) where n = 1),
  'accountant_pack|accountant-pack|zip|3', 'Το Ιστορικό δείχνει πρώτα την πιο πρόσφατη εξαγωγή'
);

set local role authenticated;
select lives_ok($$ select public.export_history() $$, 'Η εφαρμογή (authenticated) καλεί το Ιστορικό');
select lives_ok($$ select public.export_datasets('this-year') $$, 'Η εφαρμογή καλεί τη λίστα συνόλων');
select throws_ok($$ select authz.export_history(10) $$, '42501', null,
  'Οι authz.export_* είναι κλειστές για την εφαρμογή (μόνο μέσω public RPC)');
reset role;

-- ───────────── Κλειστές εσωτερικές συναρτήσεις ─────────────
select is(
  (select count(*)::int from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'authz' and p.proname like 'export\_%'
      and (pg_catalog.has_function_privilege('anon', p.oid, 'execute')
           or pg_catalog.has_function_privilege('authenticated', p.oid, 'execute'))),
  0, 'Καμία authz.export_* δεν εκτελείται από anon ή authenticated'
);
select ok(
  (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'authz' and p.proname like 'export\_%') >= 20,
  'Ο έλεγχος βρήκε όλες τις authz.export_*'
);
select is(
  (select count(*)::int from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'export\_%'
      and (pg_catalog.has_function_privilege('anon', p.oid, 'execute')
           or not p.prosecdef or not ('search_path=""' = any (coalesce(p.proconfig, '{}'))))),
  0, 'Τα public.export_*: security definer, search_path κενό, όχι για τον ανώνυμο'
);

select * from finish();
rollback;
