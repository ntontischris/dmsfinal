-- Αναφορές Ρα #198: Περίοδοι, Τζίρος και Εισπράξεις ανά μήνα, Τζίρος ανά Πελάτη, Οφειλές κατά ηλικία.
-- Άρνηση ανά ρόλο, ποσά null χωρίς «Βλέπει ποσά», ο Λογιστής βλέπει όλα, ισοτιμία με την Καρτέλα και την I2.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι αριθμοί ελέγχονται με σταθερό «σήμερα» 2025-06-30 στις authz.*
-- (ως superuser, με τον Χρήστη στα claims)· η άρνηση και η ισοτιμία μέσω των public RPC (σήμερα = ώρα Ελλάδας).
begin;
select plan(76);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Λογιστής · a3 Πωλήσεις · a4 Παραγωγή
-- a5 «Αναφορές χωρίς ποσά» (reports.view + finance.view) · a6 «Οικονομικά χωρίς Αναφορές» (finance.view + finance.amounts)
-- b1 Χρήστης πελάτη Α με «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'counts@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'finance@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ελένη', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Ρένα', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'Κώστας', 'counts@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'Λία', 'finance@example.com');
insert into public.roles (name, kind) values ('Αναφορές χωρίς ποσά (τεστ)', 'team'), ('Οικονομικά χωρίς Αναφορές (τεστ)', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, g.code, 'all'
  from (values
    ('Αναφορές χωρίς ποσά (τεστ)', 'reports.view'),
    ('Αναφορές χωρίς ποσά (τεστ)', 'finance.view'),
    ('Οικονομικά χωρίς Αναφορές (τεστ)', 'finance.view'),
    ('Οικονομικά χωρίς Αναφορές (τεστ)', 'finance.amounts')
  ) as g (role_name, code)
  join public.roles r on r.name = g.role_name and r.kind = 'team';
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a4', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000a5', 'Αναφορές χωρίς ποσά (τεστ)'),
    ('00000000-0000-0000-0000-0000000000a6', 'Οικονομικά χωρίς Αναφορές (τεστ)')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Δεδομένα (χωρίς triggers: μόνο ό,τι διαβάζουν οι Αναφορές) ─────────────
set session_replication_role = replica;

insert into public.clients (id, name, contact_name, contact_email) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', 'Μαρία Παπαδάκη', 'a@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', 'Νίκος Κίνης', 'b@example.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'Πελάτης Γ', 'Ελένη Γεωργίου', 'c@example.com'),
  ('00000000-0000-0000-0000-0000000000c4', 'Πελάτης Δ', 'Πέτρος Δ', 'd@example.com'),
  ('00000000-0000-0000-0000-0000000000c5', 'Πελάτης Ε', 'Ελπίδα Ε', 'e@example.com'),
  ('00000000-0000-0000-0000-0000000000c6', 'Πελάτης Ζ', 'Ζήσης Ζ', 'z@example.com');
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

-- Α: A-1 (1/1, λήξη 20/1) 1.000 + 240, εξοφλημένο με Είσπραξη 1.240 (1/2)· A-2 (5/6, λήξη 5/7) 500 + 120.
-- Β: B-1 (1/3, λήξη 15/3) 200 + 48· B-2 (10/5, λήξη 20/5) 100 + 24· πιστωτικό P-1 (10/6) 50 + 12 στο B-2· Είσπραξη 100 (15/6).
--    Ένα ακυρωμένο Τιμολόγιο και μία διαγραμμένη Είσπραξη δεν μετρούν πουθενά.
-- Γ: μόνο προκαταβολή 500 (1/4): υπόλοιπο υπέρ του πελάτη, εκτός Οφειλών.
-- Δ: ένα Τιμολόγιο σήμερα (ώρα Ελλάδας), για την ισοτιμία με το «Τζίρος μήνα» της I2.
-- Ε: Τιμολόγιο 100 + 24 και Είσπραξη 300 στην τελευταία μέρα του τρέχοντος μήνα (μελλοντικές ημερομηνίες, μετρούν):
--    προκαταβολή πέρα από τα Τιμολόγια.
--    Και μία Είσπραξη 40 στις 31/12 της τρέχουσας χρονιάς: μελλοντικός μήνας μέσα στο «Φέτος».
--    Υπόλοιπο υπέρ του πελάτη 124 − 340 = −216, που οι Οφειλές δεν δείχνουν.
-- Ζ: χωρίς καμία κίνηση (φίλτρο Πελάτη εκτός λίστας).
-- Τα σταθερά δεδομένα είναι στο 2025, άρα δεν πέφτουν ποτέ στον πραγματικό τρέχοντα μήνα ή χρονιά.
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, credit_for, pdf_path) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'A-1',
   date '2025-01-10', date '2025-01-20', 1000, 240, 1240, null, 'pending/t-a1.pdf'),
  ('00000000-0000-0000-0000-0000000001a2', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'A-2',
   date '2025-06-05', date '2025-07-05', 500, 120, 620, null, 'pending/t-a2.pdf'),
  ('00000000-0000-0000-0000-0000000001b1', '00000000-0000-0000-0000-0000000000c2', 'invoice', 'B-1',
   date '2025-03-01', date '2025-03-15', 200, 48, 248, null, 'pending/t-b1.pdf'),
  ('00000000-0000-0000-0000-0000000001b2', '00000000-0000-0000-0000-0000000000c2', 'invoice', 'B-2',
   date '2025-05-10', date '2025-05-20', 100, 24, 124, null, 'pending/t-b2.pdf'),
  ('00000000-0000-0000-0000-0000000001d1', '00000000-0000-0000-0000-0000000000c4', 'invoice', 'D-1',
   public.sales_today(), public.sales_today() + 30, 300, 72, 372, null, 'pending/t-d1.pdf'),
  ('00000000-0000-0000-0000-0000000001e1', '00000000-0000-0000-0000-0000000000c5', 'invoice', 'E-1',
   (date_trunc('month', public.sales_today()) + interval '1 month - 1 day')::date,
   (date_trunc('month', public.sales_today()) + interval '1 month - 1 day')::date + 30, 100, 24, 124, null, 'pending/t-e1.pdf');
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, credit_for, pdf_path) values
  ('00000000-0000-0000-0000-0000000001b3', '00000000-0000-0000-0000-0000000000c2', 'credit', 'P-1',
   date '2025-06-10', null, 50, 12, 62, '00000000-0000-0000-0000-0000000001b2', 'pending/t-p1.pdf');
insert into public.invoices (client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path, voided_at, void_reason)
values ('00000000-0000-0000-0000-0000000000c2', 'invoice', 'X-1', date '2025-06-01', date '2025-06-11', 999, 0, 999,
        'pending/t-x1.pdf', now(), 'Λάθος καταχώριση');

select set_config('t.bank', (select m.id::text from public.payment_methods m where m.label = 'Τραπεζική κατάθεση'), true);
insert into public.receipts (client_id, received_on, amount, method_id) values
  ('00000000-0000-0000-0000-0000000000c1', date '2025-02-01', 1240, current_setting('t.bank')::uuid),
  ('00000000-0000-0000-0000-0000000000c2', date '2025-06-15', 100, current_setting('t.bank')::uuid),
  ('00000000-0000-0000-0000-0000000000c3', date '2025-04-01', 500, current_setting('t.bank')::uuid),
  ('00000000-0000-0000-0000-0000000000c5', (date_trunc('month', public.sales_today()) + interval '1 month - 1 day')::date,
   300, current_setting('t.bank')::uuid),
  ('00000000-0000-0000-0000-0000000000c5', (date_trunc('year', public.sales_today()) + interval '1 year - 1 day')::date,
   40, current_setting('t.bank')::uuid);
insert into public.receipts (client_id, received_on, amount, method_id, deleted_at, delete_reason) values
  ('00000000-0000-0000-0000-0000000000c2', date '2025-06-20', 50, current_setting('t.bank')::uuid, now(), 'Λάθος ποσό');

set session_replication_role = origin;

select set_config('t.a', '00000000-0000-0000-0000-0000000000c1', true);
select set_config('t.b', '00000000-0000-0000-0000-0000000000c2', true);
select set_config('t.e', '00000000-0000-0000-0000-0000000000c5', true);
select set_config('t.z', '00000000-0000-0000-0000-0000000000c6', true);

-- ───────────── Περίοδοι (σταθερό σήμερα) ─────────────
select is(
  (select string_agg(p.code || ':' || p.from_date || '..' || p.to_date || '>' || p.through || ':' || p.is_partial, ' ' order by p.sort)
     from authz.report_periods(date '2026-02-10') p),
  'this-month:2026-02-01..2026-02-28>2026-02-10:true last-month:2026-01-01..2026-01-31>2026-01-31:false '
  || 'this-quarter:2026-01-01..2026-03-31>2026-02-10:true this-year:2026-01-01..2026-12-31>2026-02-10:true '
  || 'last-year:2025-01-01..2025-12-31>2025-12-31:false',
  'Οι πέντε Περίοδοι, με το «ως σήμερα»'
);
select is(
  (select p.from_date || '..' || p.to_date from authz.report_period('last-month', date '2026-01-15') p),
  '2025-12-01..2025-12-31', 'Ο προηγούμενος μήνας του Ιανουαρίου είναι ο Δεκέμβριος της περασμένης χρονιάς'
);
select is(
  (select p.from_date || '..' || p.to_date from authz.report_period('this-quarter', date '2026-11-30') p),
  '2026-10-01..2026-12-31', 'Το τρίμηνο του Νοεμβρίου είναι Οκτώβριος–Δεκέμβριος'
);
select is((select p.code from authz.report_period(null, date '2026-06-30') p), 'this-year', 'Χωρίς Περίοδο: Φέτος');
select throws_ok($$ select * from authz.report_period('last-week', date '2026-06-30') $$, 'P0001', 'Άγνωστη Περίοδος',
  'Δεν υπάρχει ελεύθερο εύρος ούτε άλλη Περίοδος');

-- ───────────── Κουτιά ηλικίας ─────────────
select is(
  (select string_agg(authz.report_aging_bucket(d, date '2026-06-30')::text, ',' order by n)
     from (values (1, null::date), (2, date '2026-07-01'), (3, date '2026-06-30'), (4, date '2026-06-29'),
                  (5, date '2026-05-31'), (6, date '2026-05-30'), (7, date '2026-05-01'), (8, date '2026-04-30'),
                  (9, date '2026-04-01'), (10, date '2026-03-31')) as v (n, d)),
  '0,0,0,1,1,2,2,3,3,4', 'Κουτιά: δεν έχει λήξει, 1–30, 31–60, 61–90, πάνω από 90'
);

-- ───────────── Άρνηση ανά ρόλο ─────────────
set local role anon;
select throws_ok($$ select public.report_periods() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Περιόδους');
select throws_ok($$ select public.report_turnover_monthly() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Τζίρο ανά μήνα');
select throws_ok($$ select public.report_turnover_by_client() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Τζίρο ανά Πελάτη');
select throws_ok($$ select public.report_receivables_aging() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Οφειλές');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select throws_ok($$ select public.report_periods() $$, '42501', null, 'Η Παραγωγή δεν βλέπει Περιόδους');
select throws_ok($$ select public.report_turnover_monthly() $$, '42501', null, 'Η Παραγωγή δεν βλέπει Τζίρο ανά μήνα');
select throws_ok($$ select public.report_turnover_by_client() $$, '42501', null, 'Η Παραγωγή δεν βλέπει Τζίρο ανά Πελάτη');
select throws_ok($$ select public.report_receivables_aging() $$, '42501', null, 'Η Παραγωγή δεν βλέπει Οφειλές');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is(public.report_periods()->>'default', 'this-year', 'Οι Πωλήσεις («Βλέπει Αναφορές») παίρνουν τις Περιόδους');
select throws_ok($$ select public.report_turnover_monthly() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν Τζίρο ανά μήνα');
select throws_ok($$ select public.report_turnover_by_client() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν Τζίρο ανά Πελάτη');
select throws_ok($$ select public.report_receivables_aging() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν Οφειλές');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok($$ select public.report_periods() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει Περιόδους');
select throws_ok($$ select public.report_turnover_monthly(null, current_setting('t.a')::uuid) $$, '42501', null,
  'Ο Χρήστης πελάτη δεν βλέπει Τζίρο, ούτε του δικού του Πελάτη');
select throws_ok($$ select public.report_turnover_by_client() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει Τζίρο ανά Πελάτη');
select throws_ok($$ select public.report_receivables_aging() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει Οφειλές');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a6","role":"authenticated"}', true);
select throws_ok($$ select public.report_turnover_monthly() $$, '42501', null, 'Χωρίς «Βλέπει Αναφορές» δεν φαίνεται ο Τζίρος ανά μήνα');
select throws_ok($$ select public.report_turnover_by_client() $$, '42501', null, 'Χωρίς «Βλέπει Αναφορές» δεν φαίνεται ο Τζίρος ανά Πελάτη');
select throws_ok($$ select public.report_receivables_aging() $$, '42501', null, 'Χωρίς «Βλέπει Αναφορές» δεν φαίνονται οι Οφειλές');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$ select public.report_turnover_monthly('next-year') $$, 'P0001', 'Άγνωστη Περίοδος', 'Άγνωστη Περίοδος → P0001');

-- ───────────── Τζίρος και Εισπράξεις ανά μήνα (Ιδιοκτήτης, 30/6/2025) ─────────────
select set_config('t.m', authz.report_turnover_monthly('this-year', null, date '2025-06-30')::text, true);
select is(current_setting('t.m')::jsonb->'period'->>'through', '2025-06-30', 'Φέτος ως σήμερα');
select is(current_setting('t.m')::jsonb->>'amounts', 'true', 'Ο Ιδιοκτήτης βλέπει ποσά');
select is(
  (select string_agg(m->>'month', ',') from jsonb_array_elements(current_setting('t.m')::jsonb->'months') m),
  '2025-01,2025-02,2025-03,2025-04,2025-05,2025-06', 'Ένας μήνας ανά γραμμή, ως τον τρέχοντα μήνα'
);
select is(
  (select string_agg(trim_scale((m->>'turnover')::numeric) || '/' || trim_scale((m->>'collections')::numeric), ',')
     from jsonb_array_elements(current_setting('t.m')::jsonb->'months') m),
  '1000/0,0/1240,200/0,0/500,100/0,450/100',
  'Τζίρος (καθαρό, μείον πιστωτικά, κατά έκδοση) και Εισπράξεις (με ΦΠΑ, κατά είσπραξη) ανά μήνα'
);
select is(
  (select string_agg(m->>'invoiceCount' || '/' || (m->>'creditCount') || '/' || (m->>'receiptCount') || '/' || (m->>'isPartial'), ',')
     from jsonb_array_elements(current_setting('t.m')::jsonb->'months') m),
  '1/0/0/false,0/0/1/false,1/0/0/false,0/0/1/false,1/0/0/false,1/1/1/true',
  'Πλήθη ανά μήνα· ο τρέχων μήνας είναι «ως σήμερα»'
);
select is(
  (select trim_scale((t->>'turnover')::numeric) || '|' || trim_scale((t->>'collections')::numeric) || '|' || (t->>'invoiceCount') || '|' ||
          (t->>'creditCount') || '|' || (t->>'receiptCount')
     from (select current_setting('t.m')::jsonb->'totals' as t) x),
  '1750|1840|4|1|3', 'Σύνολα: το ακυρωμένο, η διαγραμμένη Είσπραξη και το μελλοντικό Τιμολόγιο εκτός'
);
select is(
  (authz.report_turnover_monthly('this-year', current_setting('t.b')::uuid, date '2025-06-30')->'totals'->>'turnover')::numeric,
  250::numeric, 'Φίλτρο Πελάτη: ο Τζίρος του Β είναι 200 + 100 − 50'
);
select is(
  authz.report_turnover_monthly('this-year', current_setting('t.b')::uuid, date '2025-06-30')->'client'->>'name',
  'Πελάτης Β', 'Η Αναφορά λέει για ποιον Πελάτη είναι'
);
select is(
  (select string_agg(c->>'name', ',') from jsonb_array_elements(
     authz.report_turnover_monthly('this-year', null, date '2025-06-30')->'clients') c),
  'Πελάτης Α,Πελάτης Β,Πελάτης Γ,Πελάτης Δ,Πελάτης Ε', 'Οι Πελάτες του φίλτρου: όσοι έχουν Τιμολόγιο ή Είσπραξη'
);
select is(authz.report_turnover_monthly('this-year', current_setting('t.z')::uuid, date '2025-06-30')->'client', 'null'::jsonb,
  'Φίλτρο με Πελάτη εκτός λίστας: χωρίς όνομα');
select is(
  (select string_agg(m->>'month' || '=' || trim_scale((m->>'turnover')::numeric), ',') from jsonb_array_elements(
     authz.report_turnover_monthly('last-month', null, date '2025-06-30')->'months') m),
  '2025-05=100', 'Προηγούμενος μήνας: μία γραμμή'
);
select is(
  (select count(*)::int || '|' || trim_scale(sum((m->>'turnover')::numeric)) from jsonb_array_elements(
     authz.report_turnover_monthly('last-year', null, date '2025-06-30')->'months') m),
  '12|0', 'Πέρυσι: δώδεκα κενοί μήνες'
);

-- ───────────── Τζίρος ανά Πελάτη (Ιδιοκτήτης, 30/6/2025) ─────────────
select set_config('t.c', authz.report_turnover_by_client('this-year', date '2025-06-30')::text, true);
select is(
  (select string_agg(r->>'clientName' || '=' || trim_scale((r->>'turnover')::numeric) || '@' || (r->>'share') || '#' || (r->>'invoiceCount')
                     || '/' || (r->>'creditCount'), ',')
     from jsonb_array_elements(current_setting('t.c')::jsonb->'rows') r),
  'Πελάτης Α=1500@0.8571#2/0,Πελάτης Β=250@0.1429#2/1', 'Τζίρος ανά Πελάτη με μερίδιο, μεγαλύτερος πρώτα'
);
select is((current_setting('t.c')::jsonb->'totals'->>'turnover')::numeric, 1750::numeric,
  'Το σύνολο ανά Πελάτη είναι ίσο με το σύνολο ανά μήνα');
select is(
  (select r->>'clientId' from jsonb_array_elements(current_setting('t.c')::jsonb->'rows') r limit 1),
  '00000000-0000-0000-0000-0000000000c1', 'Κάθε γραμμή φέρει τον Πελάτη της (για τον σύνδεσμο)'
);

-- ───────────── Οφειλές κατά ηλικία (Ιδιοκτήτης, 30/6/2025) ─────────────
select set_config('t.g', authz.report_receivables_aging(date '2025-06-30')::text, true);
select is(
  (select string_agg(r->>'clientName' || '=' || trim_scale((r->>'total')::numeric), ',')
     from jsonb_array_elements(current_setting('t.g')::jsonb->'rows') r),
  'Πελάτης Α=620,Πελάτης Δ=372,Πελάτης Β=210', 'Οφειλές ανά Πελάτη, μεγαλύτερη πρώτα· η προκαταβολή του Γ δεν μετρά'
);
select is(
  (select r->'buckets' from jsonb_array_elements(current_setting('t.g')::jsonb->'rows') r where r->>'clientName' = 'Πελάτης Β'),
  '[0, 0, 62, 0, 148]'::jsonb, 'Β: 62 στα 31–60 (μετά το πιστωτικό), 148 πάνω από 90 (μετά την Είσπραξη)'
);
select is(
  (select r->>'oldestDue' || '|' || (r->>'invoiceCount')
     from jsonb_array_elements(current_setting('t.g')::jsonb->'rows') r where r->>'clientName' = 'Πελάτης Β'),
  '2025-03-15|2', 'Β: παλαιότερη λήξη που πέρασε και πλήθος Τιμολογίων'
);
select is(
  (select r->>'oldestDue' from jsonb_array_elements(current_setting('t.g')::jsonb->'rows') r where r->>'clientName' = 'Πελάτης Α'),
  null, 'Α: τίποτα ληξιπρόθεσμο, άρα χωρίς παλαιότερη λήξη'
);
select is(current_setting('t.g')::jsonb->'totals'->'buckets', '[992, 0, 62, 0, 148]'::jsonb, 'Σύνολα ηλικίας ανά κουτί');
select is(
  (select trim_scale((t->>'total')::numeric) || '|' || trim_scale((t->>'overdue')::numeric) || '|' || (t->>'invoiceCount')
     from (select current_setting('t.g')::jsonb->'totals' as t) x),
  '1202|210|4', 'Σύνολα ηλικίας: ανεξόφλητα και ληξιπρόθεσμα'
);

-- ───────────── Χωρίς «Βλέπει ποσά»: πλήθη, ποσά null, αλφαβητικά ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
select set_config('t.m0', authz.report_turnover_monthly('this-year', null, date '2025-06-30')::text, true);
select is(current_setting('t.m0')::jsonb->>'amounts', 'false', 'Χωρίς «Βλέπει ποσά»: amounts = false');
select is(
  (select count(*)::int from jsonb_array_elements(current_setting('t.m0')::jsonb->'months') m
    where m->'turnover' <> 'null'::jsonb or m->'collections' <> 'null'::jsonb),
  0, 'Χωρίς «Βλέπει ποσά»: κανένα ποσό ανά μήνα'
);
select is(
  (select (t->'turnover')::text || '|' || (t->'collections')::text || '|' || (t->>'invoiceCount') || '|' || (t->>'receiptCount')
     from (select current_setting('t.m0')::jsonb->'totals' as t) x),
  'null|null|4|3', 'Χωρίς «Βλέπει ποσά»: τα σύνολα είναι μόνο πλήθη'
);
select set_config('t.c0', authz.report_turnover_by_client('this-year', date '2025-06-30')::text, true);
select is(
  (select string_agg(r->>'clientName' || '=' || (r->'turnover')::text || '@' || (r->'share')::text || '#' || (r->>'invoiceCount'), ',')
     from jsonb_array_elements(current_setting('t.c0')::jsonb->'rows') r),
  'Πελάτης Α=null@null#2,Πελάτης Β=null@null#2', 'Χωρίς «Βλέπει ποσά»: ανά Πελάτη μόνο πλήθη'
);
select is(current_setting('t.c0')::jsonb->'totals'->'turnover', 'null'::jsonb, 'Χωρίς «Βλέπει ποσά»: χωρίς σύνολο Τζίρου');
select set_config('t.g0', authz.report_receivables_aging(date '2025-06-30')::text, true);
select is(
  (select string_agg(r->>'clientName', ',') from jsonb_array_elements(current_setting('t.g0')::jsonb->'rows') r),
  'Πελάτης Α,Πελάτης Β,Πελάτης Δ', 'Χωρίς «Βλέπει ποσά»: αλφαβητικά, για να μη μαρτυρά η σειρά τα ποσά'
);
select is(
  (select count(*)::int from jsonb_array_elements(current_setting('t.g0')::jsonb->'rows') r
    where r->'total' <> 'null'::jsonb or r->'buckets' <> '[null, null, null, null, null]'::jsonb),
  0, 'Χωρίς «Βλέπει ποσά»: κανένα ποσό οφειλής'
);
select is(
  (select r->'counts' from jsonb_array_elements(current_setting('t.g0')::jsonb->'rows') r where r->>'clientName' = 'Πελάτης Β'),
  '[0, 0, 1, 0, 1]'::jsonb, 'Χωρίς «Βλέπει ποσά»: τα πλήθη ανά κουτί μένουν'
);
select is(
  (select (t->'total')::text || '|' || (t->'overdue')::text || '|' || (t->'buckets')::text || '|' || (t->>'invoiceCount')
     from (select current_setting('t.g0')::jsonb->'totals' as t) x),
  'null|null|[null, null, null, null, null]|4', 'Χωρίς «Βλέπει ποσά»: σύνολα ηλικίας μόνο σε πλήθος'
);

-- ───────────── Ο Λογιστής βλέπει όλα ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is(authz.report_turnover_monthly('this-year', null, date '2025-06-30'), current_setting('t.m')::jsonb,
  'Ο Λογιστής βλέπει τον Τζίρο ανά μήνα όπως ο Ιδιοκτήτης');
select is(authz.report_turnover_by_client('this-year', date '2025-06-30'), current_setting('t.c')::jsonb,
  'Ο Λογιστής βλέπει τον Τζίρο ανά Πελάτη όπως ο Ιδιοκτήτης');
select is(authz.report_receivables_aging(date '2025-06-30'), current_setting('t.g')::jsonb,
  'Ο Λογιστής βλέπει τις Οφειλές όπως ο Ιδιοκτήτης');
select is(jsonb_array_length(public.report_periods()->'items'), 5, 'Ο Λογιστής παίρνει τις πέντε Περιόδους');

set local role authenticated;
select lives_ok($$ select public.report_turnover_monthly('this-month') $$, 'Η εφαρμογή (authenticated) καλεί τον Τζίρο ανά μήνα');
select lives_ok($$ select public.report_turnover_by_client('last-year') $$, 'Η εφαρμογή καλεί τον Τζίρο ανά Πελάτη');
select lives_ok($$ select public.report_receivables_aging() $$, 'Η εφαρμογή καλεί τις Οφειλές');
select throws_ok($$ select authz.report_receivables_aging(current_date) $$, '42501', null,
  'Οι authz.report_* είναι κλειστές για την εφαρμογή (μόνο μέσω public RPC)');
reset role;

-- ───────────── Ισοτιμία με την Καρτέλα Πελάτη και την I2 (σήμερα, ώρα Ελλάδας) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(
  (select (r->>'total')::numeric from jsonb_array_elements(public.report_receivables_aging()->'rows') r
    where r->>'clientId' = current_setting('t.b')),
  (public.client_ledger_view(current_setting('t.b')::uuid)->>'balance')::numeric,
  'Ισοτιμία: οι Οφειλές του Β = το υπόλοιπο της Καρτέλας του'
);
select is(
  (select (r->'buckets'->>1)::numeric + (r->'buckets'->>2)::numeric + (r->'buckets'->>3)::numeric + (r->'buckets'->>4)::numeric
     from jsonb_array_elements(public.report_receivables_aging()->'rows') r where r->>'clientId' = current_setting('t.b')),
  (public.client_ledger_view(current_setting('t.b')::uuid)->>'overdue')::numeric,
  'Ισοτιμία: τα ληξιπρόθεσμα του Β = τα ληξιπρόθεσμα της Καρτέλας του'
);
select is(
  (authz.report_turnover_monthly('this-year', current_setting('t.b')::uuid, date '2025-06-30')->'totals'->>'collections')::numeric,
  (select sum((e->>'credit')::numeric) from jsonb_array_elements(public.client_ledger_view(current_setting('t.b')::uuid)->'entries') e
    where e->>'kind' = 'payment'),
  'Ισοτιμία: οι Εισπράξεις του Β = οι Εισπράξεις της Καρτέλας του'
);
select is(
  (public.report_turnover_by_client('this-month')->'totals'->>'turnover')::numeric,
  (public.invoices_view()->'totals'->>'turnoverMonth')::numeric,
  'Ισοτιμία: ο Τζίρος του μήνα ανά Πελάτη = το «Τζίρος μήνα» της I2, μαζί με το Τιμολόγιο αργότερα μέσα στον μήνα'
);
select is(
  (public.report_turnover_monthly('this-month')->'totals'->>'turnover')::numeric,
  (public.invoices_view()->'totals'->>'turnoverMonth')::numeric,
  'Ισοτιμία: ο Τζίρος του μήνα ανά μήνα = το «Τζίρος μήνα» της I2'
);
select is(
  (public.report_turnover_monthly('this-year', current_setting('t.e')::uuid)->'totals'->>'collections')::numeric,
  (select sum((e->>'credit')::numeric) from jsonb_array_elements(public.client_ledger_view(current_setting('t.e')::uuid)->'entries') e
    where e->>'kind' = 'payment'),
  'Ισοτιμία: οι Εισπράξεις του Ε φέτος (και οι μελλοντικές) = οι Εισπράξεις της Καρτέλας του'
);
select set_config('t.y', public.report_turnover_monthly('this-year')::text, true);
select is(
  (select trim_scale(sum((m->>'turnover')::numeric)) || '|' || trim_scale(sum((m->>'collections')::numeric))
     from jsonb_array_elements(current_setting('t.y')::jsonb->'months') m),
  (select trim_scale((t->>'turnover')::numeric) || '|' || trim_scale((t->>'collections')::numeric)
     from (select current_setting('t.y')::jsonb->'totals' as t) x),
  'Οι γραμμές μηνών αθροίζονται στα σύνολα, και με κινήσεις σε μελλοντικό μήνα'
);
select is(
  (select m->>'month' from jsonb_array_elements(current_setting('t.y')::jsonb->'months') m order by m->>'month' desc limit 1),
  to_char(date_trunc('year', public.sales_today()) + interval '11 months', 'YYYY-MM'),
  'Οι γραμμές φτάνουν ως τον τελευταίο μήνα με κίνηση (η Είσπραξη της 31/12)'
);
select is((public.client_ledger_view(current_setting('t.e')::uuid)->>'balance')::numeric, -216::numeric,
  'Ε: η Καρτέλα έχει υπόλοιπο υπέρ του πελάτη');
select is(
  (select count(*)::int from jsonb_array_elements(public.report_receivables_aging()->'rows') r
    where r->>'clientId' = current_setting('t.e')),
  0, 'Ε: οι Οφειλές δεν δείχνουν το υπόλοιπο υπέρ του πελάτη (σκόπιμα ≠ Καρτέλα)'
);

-- ───────────── Κλειστές εσωτερικές συναρτήσεις ─────────────
select is(
  (select count(*)::int from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'authz' and p.proname like 'report\_%'
      and (pg_catalog.has_function_privilege('anon', p.oid, 'execute')
           or pg_catalog.has_function_privilege('authenticated', p.oid, 'execute'))),
  0, 'Καμία authz.report_* δεν εκτελείται από anon ή authenticated'
);
select ok(
  (select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'authz' and p.proname like 'report\_%') >= 11,
  'Ο έλεγχος βρήκε όλες τις authz.report_*'
);

select * from finish();
rollback;
