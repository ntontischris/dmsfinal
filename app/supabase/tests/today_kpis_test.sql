-- Σήμερα: δείκτες και «ραντάρ κινδύνου» (d9). Άρνηση για ανώνυμο και Χρήστη πελάτη· κάθε δείκτης μόνο με το Δικαίωμά
-- του (Ιδιοκτήτης όλα, Λογιστής μόνο Τζίρος, Πωλήσεις μόνο pipeline, Παραγωγή μόνο τις δικές της Παραγωγές).
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι αριθμοί με σταθερό «σήμερα» 2025-06-30 στην authz.today_kpis
-- (ως superuser, με τον Χρήστη στα claims)· η άρνηση μέσω της public RPC.
begin;
select plan(21);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Λογιστής · a3 Πωλήσεις · a4 Παραγωγή · b1 Χρήστης πελάτη Α με «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ελένη', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Ρένα', 'production@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a4', 'Παραγωγή')
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

-- ───────────── Δεδομένα (χωρίς triggers) ─────────────
set local session_replication_role = replica;

-- c1 με Υπεύθυνη την Άννα (Πωλήσεις), c2 με Υπεύθυνο τον Ιδιοκτήτη.
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', 'Μαρία Παπαδάκη', 'a@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', 'Νίκος Κίνης', 'b@example.com', '00000000-0000-0000-0000-0000000000a1');
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

-- Τζίρος: Μάιος 1.000· Ιούνιος 500 − Πιστωτικό 100 = 400.
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, credit_for, pdf_path) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'F-1',
   date '2025-05-10', date '2025-05-25', 1000, 240, 1240, null, 'pending/f-1.pdf'),
  ('00000000-0000-0000-0000-0000000001b1', '00000000-0000-0000-0000-0000000000c2', 'invoice', 'F-2',
   date '2025-06-05', date '2025-06-20', 500, 120, 620, null, 'pending/f-2.pdf');
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, credit_for, pdf_path) values
  ('00000000-0000-0000-0000-0000000001b2', '00000000-0000-0000-0000-0000000000c2', 'credit', 'F-P1',
   date '2025-06-10', null, 100, 24, 124, '00000000-0000-0000-0000-0000000001b1', 'pending/f-p1.pdf');

-- Έξοδα μόνο τον Ιούνιο (700)· ο Μάιος (προηγούμενος μήνας) δεν έχει → κίνδυνος «expenses_missing».
-- Περιθώριο φέτος = μόνο ο Ιούνιος: (400 − 700) / 400 = −0,75.
insert into public.cost_months (month, expenses_total, productive_hours, expense_categories) values
  (date '2025-06-01', 700, 100, null);

-- Ευκαιρίες: o1 της Άννας 1.000 × 50% (αργεί: κλείσιμο 15/6) · o2 του Ιδιοκτήτη 2.000 × 25% (κλείσιμο 20/7).
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, outcome,
                                  next_step, next_step_due, created_at, probability, expected_close)
select x.id::uuid, x.client_id::uuid, x.title,
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'web'),
       x.manager::uuid, 'open', 'Επόμενο', date '2025-07-01', timestamptz '2025-03-01 12:00+02', x.probability, x.expected_close
  from (values
    ('00000000-0000-0000-0000-000000000e01', '00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο Α',
     '00000000-0000-0000-0000-0000000000a3', 50::smallint, date '2025-06-15'),
    ('00000000-0000-0000-0000-000000000e02', '00000000-0000-0000-0000-0000000000c2', 'Εφάπαξ Β',
     '00000000-0000-0000-0000-0000000000a1', 25::smallint, date '2025-07-20')
  ) as x (id, client_id, title, manager, probability, expected_close);
insert into public.opportunity_amounts (opportunity_id, estimated_value) values
  ('00000000-0000-0000-0000-000000000e01', 1000),
  ('00000000-0000-0000-0000-000000000e02', 2000);

-- Παραγωγές (Εσωτερικές): d1 ανοιχτή σε Υπέρβαση (30 ώρες έναντι 20) · d2 παραδομένη χωρίς επιβεβαιωμένες ώρες
-- · d3 ανοιχτή της Ρένας, χωρίς γραμμή κόστους · d4 ακυρωμένη σε Υπέρβαση (δεν μετρά).
insert into public.productions (id, title, client_id, agreement_id, period_id, owner_id, state, created_at,
                                delivered_at, delivered_note, cancelled_at, cancelled_reason) values
  ('00000000-0000-0000-0000-0000000000d1', 'Showreel', null, null, null, '00000000-0000-0000-0000-0000000000a1',
   'open', timestamptz '2025-05-01 10:00+00', null, null, null, null),
  ('00000000-0000-0000-0000-0000000000d2', 'Teaser', null, null, null, '00000000-0000-0000-0000-0000000000a1',
   'delivered', timestamptz '2025-04-01 10:00+00', timestamptz '2025-06-01 10:00+00', 'Παραδόθηκε', null, null),
  ('00000000-0000-0000-0000-0000000000d3', 'Backstage', null, null, null, '00000000-0000-0000-0000-0000000000a4',
   'open', timestamptz '2025-06-01 10:00+00', null, null, null, null),
  ('00000000-0000-0000-0000-0000000000d4', 'Παλιό', null, null, null, '00000000-0000-0000-0000-0000000000a1',
   'cancelled', timestamptz '2025-03-01 10:00+00', null, null, timestamptz '2025-03-02 10:00+00', 'Δεν χρειάζεται');
insert into public.production_costs (production_id, estimate_shoot_hours, estimate_edit_hours, shoot_hours, shoot_confirmed_at,
                                     edit_hours, edit_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000d1', 10, 10, 20, timestamptz '2025-06-02 10:00+00', 10, timestamptz '2025-06-02 10:00+00'),
  ('00000000-0000-0000-0000-0000000000d2', 5, 5, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000d4', 10, 10, 20, timestamptz '2025-03-01 12:00+00', 10, timestamptz '2025-03-01 12:00+00');

set local session_replication_role = origin;

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.today_kpis() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει δείκτες');
reset role;

select public.t_as('b1');
set local role authenticated;
select throws_ok($$ select public.today_kpis() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει δείκτες');
reset role;
select throws_ok($$ select authz.today_kpis(date '2025-06-30') $$, '42501', null,
  'Ο Χρήστης πελάτη δεν περνά ούτε από την εσωτερική συνάρτηση');

-- ───────────── Ιδιοκτήτης: όλα ─────────────
select public.t_as('a1');
select set_config('t.k', authz.today_kpis(date '2025-06-30')::text, true);
select is(current_setting('t.k')::jsonb ->> 'month', '2025-06', 'Ο μήνας των δεικτών');
select is(trim_scale((current_setting('t.k')::jsonb ->> 'turnover')::numeric), 400::numeric,
  'Τζίρος Ιουνίου = 500 − Πιστωτικό 100');
select is(trim_scale((current_setting('t.k')::jsonb #>> '{margin,margin}')::numeric), -0.75::numeric,
  'Περιθώριο φέτος μόνο από τον Ιούνιο (ο μόνος μήνας με Έξοδα)');
select is((current_setting('t.k')::jsonb #>> '{margin,months}')::integer, 1, 'Ένας μήνας μετρά στο Περιθώριο');
select is(
  concat_ws('|', trim_scale((current_setting('t.k')::jsonb #>> '{pipeline,weighted}')::numeric),
                 trim_scale((current_setting('t.k')::jsonb #>> '{pipeline,total}')::numeric),
                 current_setting('t.k')::jsonb #>> '{pipeline,open}'),
  '1000|3000|2', 'Pipeline: σταθμισμένη 500 + 500, συνολική 3.000, 2 ανοιχτές');
select is((current_setting('t.k')::jsonb ->> 'activeProductions')::integer, 2, 'Δύο ανοιχτές Παραγωγές (η ακυρωμένη όχι)');
select is(
  (select string_agg((r ->> 'code') || ':' || (r ->> 'count') || ':' || (r ->> 'link'), ' ' order by n)
     from jsonb_array_elements(current_setting('t.k')::jsonb -> 'risks') with ordinality x (r, n)),
  'cost_overrun:1:/app/productions/costs hours_missing:1:/app/productions/costs '
  'expenses_missing:1:/app/finance/expenses?month=2025-05 late_opportunities:1:/app/pipeline',
  'Ραντάρ: Υπέρβαση, χωρίς ώρες, χωρίς Έξοδα Μαΐου, μία Ευκαιρία αργεί — με αυτή τη σειρά');

-- Με Έξοδα Μαΐου ο κίνδυνος «expenses_missing» φεύγει.
set local session_replication_role = replica;
insert into public.cost_months (month, expenses_total, productive_hours, expense_categories) values
  (date '2025-05-01', 1000, 100, null);
set local session_replication_role = origin;
select is(
  (select string_agg(r ->> 'code', ' ' order by n)
     from jsonb_array_elements(authz.today_kpis(date '2025-06-30') -> 'risks') with ordinality x (r, n)),
  'cost_overrun hours_missing late_opportunities', 'Με Έξοδα Μαΐου δεν λείπουν Έξοδα');
select is(trim_scale((authz.today_kpis(date '2025-06-30') #>> '{margin,margin}')::numeric), -0.2143::numeric,
  'Περιθώριο Μαΐου και Ιουνίου: (1.400 − 1.700) / 1.400');

-- ───────────── Λογιστής: μόνο Τζίρος ─────────────
select public.t_as('a2');
select set_config('t.k', authz.today_kpis(date '2025-06-30')::text, true);
select is(trim_scale((current_setting('t.k')::jsonb ->> 'turnover')::numeric), 400::numeric, 'Ο Λογιστής βλέπει τον Τζίρο');
select is(current_setting('t.k')::jsonb -> 'margin', 'null'::jsonb, 'Ο Λογιστής δεν βλέπει Περιθώριο (θέλει κόστος)');
select is(current_setting('t.k')::jsonb -> 'pipeline', 'null'::jsonb, 'Ο Λογιστής δεν βλέπει pipeline');
select is(current_setting('t.k')::jsonb -> 'activeProductions', 'null'::jsonb, 'Ο Λογιστής δεν βλέπει Παραγωγές');
select is(current_setting('t.k')::jsonb -> 'risks', '[]'::jsonb, 'Ο Λογιστής δεν έχει ραντάρ κινδύνου');

-- ───────────── Πωλήσεις: μόνο το δικό τους pipeline ─────────────
select public.t_as('a3');
select set_config('t.k', authz.today_kpis(date '2025-06-30')::text, true);
select is(current_setting('t.k')::jsonb -> 'turnover', 'null'::jsonb, 'Οι Πωλήσεις δεν βλέπουν Τζίρο (ποσά μόνο «δικά μου»)');
select is(
  concat_ws('|', trim_scale((current_setting('t.k')::jsonb #>> '{pipeline,weighted}')::numeric),
                 trim_scale((current_setting('t.k')::jsonb #>> '{pipeline,total}')::numeric),
                 current_setting('t.k')::jsonb #>> '{pipeline,open}'),
  '500|1000|1', 'Οι Πωλήσεις βλέπουν μόνο τη δική τους Ευκαιρία');
select is(current_setting('t.k')::jsonb -> 'risks', '[{"code":"late_opportunities","count":1,"link":"/app/pipeline"}]'::jsonb,
  'Οι Πωλήσεις βλέπουν μόνο την Ευκαιρία που αργεί');

-- ───────────── Παραγωγή: μόνο οι δικές της ─────────────
select public.t_as('a4');
select is((authz.today_kpis(date '2025-06-30') ->> 'activeProductions')::integer, 1, 'Η Παραγωγή μετρά μόνο τις δικές της');

select * from finish();
rollback;
