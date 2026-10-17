-- Αναφορές Ρβ #199: Ανοιχτές Ευκαιρίες ανά Στάδιο, Κερδισμένες και χαμένες, Πηγές Ευκαιριών.
-- Άρνηση ανά ρόλο, Εύρος Α (μόνο όπου είναι Υπεύθυνος, χωρίς «Χωρίς υπεύθυνο»), ποσά null χωρίς «Βλέπει ποσά»,
-- αξία = τελευταία πρόταση (μηνιαία/εφάπαξ χωριστά), ποσοστό επιτυχίας, Πωλητής χωρίς oracle.
-- Φανταστικά δεδομένα στο 2025, με σταθερό «σήμερα» 2025-06-30 στις authz.* (ως superuser, με τον Χρήστη στα claims)·
-- η άρνηση μέσω των public RPC. Κανένα τεστ δεν εξαρτάται από την πραγματική ημερομηνία.
begin;
select plan(50);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Λογιστής · a3 Πωλήσεις (Άννα) · a4 Παραγωγή · a5 «Πωλήσεις χωρίς ποσά» (Εύρος όλα)
-- a7 Πωλήσεις (Βασίλης) · b1 Χρήστης πελάτη
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'counts@example.com'),
  ('00000000-0000-0000-0000-0000000000a7', 'sales2@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ελένη', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Ρένα', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'Κώστας', 'counts@example.com'),
  ('00000000-0000-0000-0000-0000000000a7', 'Βασίλης', 'sales2@example.com');
insert into public.roles (name, kind) values ('Πωλήσεις χωρίς ποσά (τεστ)', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, g.code, 'all'
  from (values ('reports.view'), ('clients.manage')) as g (code)
  join public.roles r on r.name = 'Πωλήσεις χωρίς ποσά (τεστ)' and r.kind = 'team';
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a4', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000a5', 'Πωλήσεις χωρίς ποσά (τεστ)'),
    ('00000000-0000-0000-0000-0000000000a7', 'Πωλήσεις')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Δεδομένα (χωρίς triggers: μόνο ό,τι διαβάζουν οι Αναφορές) ─────────────
set session_replication_role = replica;

-- c1 της Άννας · c2 του Βασίλη · c3 χωρίς Υπεύθυνο
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', 'Μαρία Παπαδάκη', 'a@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', 'Νίκος Κίνης', 'b@example.com', '00000000-0000-0000-0000-0000000000a7'),
  ('00000000-0000-0000-0000-0000000000c3', 'Πελάτης Γ', 'Ελένη Γεωργίου', 'c@example.com', null);
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

-- Ευκαιρίες (Υπεύθυνος, Στάδιο, Πηγή, άνοιξε, Έκβαση):
--  d1 Α · Άννα · Πρόταση · web · 10/3 · ανοιχτή, μηνιαία πρόταση 2 × 500
--  d2 Α · Άννα · Νέα · instagram · 1/5 · ανοιχτή, χωρίς πρόταση
--  d3 Β · Βασίλης · Πρόταση · web · 1/4 · ανοιχτή, εφάπαξ πρόταση 1.500
--  d4 Γ · χωρίς Υπεύθυνο · Νέα · web · 1/6 · ανοιχτή (ουρά)
--  d5 Α · Άννα · referral · 1/2 · κερδισμένη 20/5, μηνιαία 800
--  d6 Β · Βασίλης · web · 15/1 · χαμένη 10/6 «Τιμή», εφάπαξ πρόταση 300
--  d7 Α · Άννα · phone · 1/12/2024 · χαμένη 31/12/2024 23:30 UTC = 1/1/2025 01:30 Ελλάδας, «Δεν απάντησε»
--  d9 Α (της Άννας) · Βασίλης (με Αίτημα πρόσβασης) · Συνάντηση · facebook · 15/6 · ανοιχτή
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, outcome, loss_reason_id,
                                  next_step, next_step_due, created_at, closed_at)
select x.id::uuid, x.client_id::uuid, x.title,
       (select s.id from public.sales_stages s where s.code = x.stage),
       (select s.id from public.sales_sources s where s.code = x.source),
       x.manager::uuid, x.outcome, (select r.id from public.sales_loss_reasons r where r.code = x.reason),
       'Επόμενο', date '2025-07-01', x.created_at::timestamptz, x.closed_at::timestamptz
  from (values
    ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο Α', 'proposal', 'web',
     '00000000-0000-0000-0000-0000000000a3', 'open', null, '2025-03-10 12:00+03', null),
    ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'Βίντεο Α', 'new', 'instagram',
     '00000000-0000-0000-0000-0000000000a3', 'open', null, '2025-05-01 12:00+03', null),
    ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c2', 'Εφάπαξ Β', 'proposal', 'web',
     '00000000-0000-0000-0000-0000000000a7', 'open', null, '2025-04-01 12:00+03', null),
    ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c3', 'Φόρμα Γ', 'new', 'web',
     null, 'open', null, '2025-06-01 12:00+03', null),
    ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000c1', 'Κερδισμένο Α', 'proposal', 'referral',
     '00000000-0000-0000-0000-0000000000a3', 'won', null, '2025-02-01 12:00+03', '2025-05-20 10:00+03'),
    ('00000000-0000-0000-0000-0000000000d6', '00000000-0000-0000-0000-0000000000c2', 'Χαμένο Β', 'proposal', 'web',
     '00000000-0000-0000-0000-0000000000a7', 'lost', 'price', '2025-01-15 12:00+03', '2025-06-10 10:00+03'),
    ('00000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000c1', 'Παλιό Α', 'new', 'phone',
     '00000000-0000-0000-0000-0000000000a3', 'lost', 'no_reply', '2024-12-01 12:00+02', '2024-12-31 23:30+00'),
    ('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000c1', 'Συνεργασία Α', 'meeting', 'facebook',
     '00000000-0000-0000-0000-0000000000a7', 'open', null, '2025-06-15 12:00+03', null)
  ) as x (id, client_id, title, stage, source, manager, outcome, reason, created_at, closed_at);

insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, duration_months, renewal,
                               payment_days, unused_provisions, filming_notice_hours, filming_cancel_hours,
                               late_cancel_burns, no_show_burns, signed_at)
values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'monthly', 'Μηνιαίο Α', 'proposal', 'sent',
   date '2025-07-15', 6, 'new_opportunity', 15, 'lost', 48, 24, false, false, null),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000d3', 'one_off', 'Εφάπαξ Β', 'proposal', 'draft',
   date '2025-07-15', null, null, 15, 'lost', 48, 24, false, false, null),
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000d5', 'monthly', 'Κερδισμένο Α', 'signed', 'signed',
   date '2025-06-01', 6, 'new_opportunity', 15, 'lost', 48, 24, false, false, timestamptz '2025-05-20 10:00+03'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000d6', 'one_off', 'Χαμένο Β', 'proposal', 'lost',
   date '2025-06-15', null, null, 15, 'lost', 48, 24, false, false, null);
insert into public.agreement_lines (id, agreement_id, position, line_kind, description, quantity) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-0000000000f1', 1, 'free', 'Reels', 2),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-0000000000f3', 1, 'free', 'Βίντεο', 1),
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-0000000000f5', 1, 'free', 'Reels', 1),
  ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-0000000000f6', 1, 'free', 'Βίντεο', 1);
insert into public.agreement_line_amounts (line_id, unit_price) values
  ('00000000-0000-0000-0000-000000000301', 500),
  ('00000000-0000-0000-0000-000000000303', 1500),
  ('00000000-0000-0000-0000-000000000305', 800),
  ('00000000-0000-0000-0000-000000000306', 300);

set session_replication_role = origin;

select set_config('t.anna', '00000000-0000-0000-0000-0000000000a3', true);
select set_config('t.vas', '00000000-0000-0000-0000-0000000000a7', true);
select set_config('t.nobody', '00000000-0000-0000-0000-0000000000ff', true);

-- ───────────── Άρνηση ανά ρόλο ─────────────
set local role anon;
select throws_ok($$ select public.report_sales_pipeline() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Ανοιχτές Ευκαιρίες');
select throws_ok($$ select public.report_sales_results() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Κερδισμένες και χαμένες');
select throws_ok($$ select public.report_sales_sources() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Πηγές');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select throws_ok($$ select public.report_sales_pipeline() $$, '42501', null, 'Η Παραγωγή δεν βλέπει Ανοιχτές Ευκαιρίες');
select throws_ok($$ select public.report_sales_results() $$, '42501', null, 'Η Παραγωγή δεν βλέπει Κερδισμένες και χαμένες');
select throws_ok($$ select public.report_sales_sources() $$, '42501', null, 'Η Παραγωγή δεν βλέπει Πηγές');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok($$ select public.report_sales_pipeline() $$, '42501', null,
  'Ο Λογιστής («Βλέπει Αναφορές», όχι «Διαχειρίζεται Πελάτες») δεν βλέπει Ανοιχτές Ευκαιρίες');
select throws_ok($$ select public.report_sales_results() $$, '42501', null, 'Ο Λογιστής δεν βλέπει Κερδισμένες και χαμένες');
select throws_ok($$ select public.report_sales_sources() $$, '42501', null, 'Ο Λογιστής δεν βλέπει Πηγές');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok($$ select public.report_sales_pipeline() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει Ανοιχτές Ευκαιρίες');
select throws_ok($$ select public.report_sales_results() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει Κερδισμένες και χαμένες');
select throws_ok($$ select public.report_sales_sources() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει Πηγές');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$ select public.report_sales_results('next-year') $$, 'P0001', 'Άγνωστη Περίοδος', 'Άγνωστη Περίοδος → P0001');

-- ───────────── Ανοιχτές Ευκαιρίες ανά Στάδιο (Ιδιοκτήτης) ─────────────
select set_config('t.p', authz.report_sales_pipeline(null)::text, true);
select is(
  (select string_agg(s->>'label' || '=' || (s->>'count') || '/' || (s->>'withoutProposal'), ',')
     from jsonb_array_elements(current_setting('t.p')::jsonb->'stages') s),
  'Νέα=2/2,Πρώτη επαφή=0/0,Συνάντηση=1/1,Πρόταση=2/0,Διαπραγμάτευση=0/0',
  'Όλα τα Στάδια με τη σειρά τους, πλήθος και «χωρίς πρόταση»· οι κλειστές δεν μετρούν'
);
select is(
  (select trim_scale((s->>'monthly')::numeric) || '|' || trim_scale((s->>'oneOff')::numeric)
     from jsonb_array_elements(current_setting('t.p')::jsonb->'stages') s where s->>'label' = 'Πρόταση'),
  '1000|1500', 'Αξία = η τελευταία πρόταση, μηνιαία (2 × 500) και εφάπαξ χωριστά'
);
select is(
  (select (t->>'count') || '|' || trim_scale((t->>'monthly')::numeric) || '|' || trim_scale((t->>'oneOff')::numeric) || '|'
          || (t->>'withoutProposal')
     from (select current_setting('t.p')::jsonb->'totals' as t) x),
  '5|1000|1500|3', 'Σύνολα: πέντε ανοιχτές, οι τρεις χωρίς πρόταση μετρούν στο πλήθος'
);
select is(
  (select string_agg(r->>'title' || ':' || coalesce(r->>'value', '—') || ':' || coalesce(r->>'kind', '—'), ',')
     from jsonb_array_elements(current_setting('t.p')::jsonb->'rows') r),
  'Βίντεο Α:—:—,Φόρμα Γ:—:—,Συνεργασία Α:—:—,Εφάπαξ Β:1500.00:one_off,Μηνιαίο Α:1000.00:monthly',
  'Γραμμές κατά Στάδιο και Επόμενο βήμα, χωρίς πρόταση «—»'
);
select is(
  (select r->>'managerName' from jsonb_array_elements(current_setting('t.p')::jsonb->'rows') r where r->>'title' = 'Φόρμα Γ'),
  null, 'Η Ευκαιρία της ουράς δεν έχει Υπεύθυνο (Εύρος όλα)'
);
select is(
  (select r->>'opportunityId' from jsonb_array_elements(current_setting('t.p')::jsonb->'rows') r where r->>'title' = 'Μηνιαίο Α'),
  '00000000-0000-0000-0000-0000000000d1', 'Κάθε γραμμή φέρει την Ευκαιρία της (για τον σύνδεσμο)'
);
select is(
  (select (j->>'isScoped') || '|' || (j->>'showSeller') || '|' || (select string_agg(s->>'name', ',') from jsonb_array_elements(j->'sellers') s)
     from (select current_setting('t.p')::jsonb as j) x),
  'false|true|Άννα,Βασίλης,Γιώργος,Κώστας',
  'Εύρος όλα με πάνω από έναν πιθανό Υπεύθυνο: φίλτρο Πωλητή με τους ενεργούς που «Διαχειρίζονται Πελάτες»'
);
select is(
  (select string_agg(r->>'title', ',') from jsonb_array_elements(authz.report_sales_pipeline(current_setting('t.vas')::uuid)->'rows') r),
  'Συνεργασία Α,Εφάπαξ Β', 'Φίλτρο Πωλητή: μόνο οι Ευκαιρίες όπου είναι Υπεύθυνος'
);
select is(authz.report_sales_pipeline(current_setting('t.vas')::uuid)->'seller'->>'name', 'Βασίλης',
  'Η Αναφορά λέει για ποιον Πωλητή είναι');

-- ───────────── Κερδισμένες και χαμένες (Ιδιοκτήτης, 30/6/2025) ─────────────
select set_config('t.r', authz.report_sales_results('this-year', null, date '2025-06-30')::text, true);
select is(
  (select (t->>'won') || '|' || (t->>'lost') || '|' || (t->>'winRate') || '|' || trim_scale((t->>'wonMonthly')::numeric) || '|'
          || trim_scale((t->>'wonOneOff')::numeric)
     from (select current_setting('t.r')::jsonb->'totals' as t) x),
  '1|2|0.3333|800|0', 'Μία κερδισμένη, δύο χαμένες (η μία την 1/1 ώρα Ελλάδας): ποσοστό 1 / 3, κερδισμένη αξία μηνιαία'
);
select is(
  (select string_agg(l->>'label' || '=' || (l->>'count'), ',') from jsonb_array_elements(current_setting('t.r')::jsonb->'lossReasons') l),
  'Τιμή=1,Δεν απάντησε=1', 'Λόγοι απώλειας με πλήθος'
);
select is(
  (select string_agg(r->>'title' || ':' || (r->>'outcome') || ':' || (r->>'closedOn') || ':' || coalesce(r->>'lossReason', '—'), ',')
     from jsonb_array_elements(current_setting('t.r')::jsonb->'rows') r),
  'Χαμένο Β:lost:2025-06-10:Τιμή,Κερδισμένο Α:won:2025-05-20:—,Παλιό Α:lost:2025-01-01:Δεν απάντησε',
  'Γραμμές κατά ημερομηνία Έκβασης (ώρα Ελλάδας), πιο πρόσφατη πρώτα'
);
select is(
  (select (t->>'won') || '|' || (t->>'lost') || '|' || coalesce(t->>'winRate', 'null')
     from (select authz.report_sales_results('last-year', null, date '2025-06-30')->'totals' as t) x),
  '0|0|null', 'Πέρυσι: τίποτα (η Έκβαση της 31/12 UTC είναι 1/1 στην Ελλάδα)· χωρίς έκβαση δεν υπάρχει ποσοστό'
);
select is(
  (select (t->>'won') || '|' || (t->>'lost') || '|' || (t->>'winRate')
     from (select authz.report_sales_results('this-year', current_setting('t.vas')::uuid, date '2025-06-30')->'totals' as t) x),
  '0|1|0.0000', 'Φίλτρο Πωλητή: ο Βασίλης μία χαμένη, ποσοστό 0'
);
select is(authz.report_sales_results('this-year', null, date '2025-06-30')->'period'->>'through', '2025-06-30', 'Φέτος ως σήμερα');

-- ───────────── Πηγές Ευκαιριών (Ιδιοκτήτης, 30/6/2025) ─────────────
select set_config('t.s', authz.report_sales_sources('this-year', null, date '2025-06-30')::text, true);
select is(
  (select string_agg(r->>'label' || '=' || (r->>'opened') || '/' || (r->>'open') || '/' || (r->>'won') || '/' || (r->>'lost') || '@'
                     || coalesce(r->>'winRate', '—'), ',')
     from jsonb_array_elements(current_setting('t.s')::jsonb->'rows') r),
  'Ιστοσελίδα=4/3/0/1@0.0000,Instagram=1/1/0/0@—,Facebook=1/1/0/0@—,Σύσταση=1/0/1/0@1.0000',
  'Ανά Πηγή όσες άνοιξαν μέσα στην περίοδο, και τι έγιναν ως σήμερα'
);
select is(
  (select (t->>'opened') || '|' || (t->>'open') || '|' || (t->>'won') || '|' || (t->>'lost') || '|' || (t->>'winRate')
     from (select current_setting('t.s')::jsonb->'totals' as t) x),
  '7|5|1|1|0.5000', 'Σύνολα Πηγών: η Ευκαιρία που άνοιξε το 2024 δεν μετρά'
);
select is(
  (select count(*)::int from jsonb_array_elements(current_setting('t.s')::jsonb->'opportunities') o),
  7, 'Οι Ευκαιρίες της περιόδου, μία γραμμή η καθεμία'
);

-- ───────────── Εύρος Α: η Άννα (Πωλήσεις) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select set_config('t.pa', authz.report_sales_pipeline(null)::text, true);
select is(
  (select string_agg(r->>'title', ',') from jsonb_array_elements(current_setting('t.pa')::jsonb->'rows') r),
  'Βίντεο Α,Μηνιαίο Α',
  'Η Άννα βλέπει μόνο όπου είναι Υπεύθυνη: όχι την ουρά, ούτε του Βασίλη στον δικό της Πελάτη'
);
select is(
  (select (t->>'count') || '|' || trim_scale((t->>'monthly')::numeric) || '|' || trim_scale((t->>'oneOff')::numeric) || '|'
          || (t->>'withoutProposal')
     from (select current_setting('t.pa')::jsonb->'totals' as t) x),
  '2|1000|0|1', 'Η Άννα («Βλέπει ποσά» Α) βλέπει τα ποσά των δικών της'
);
select is(
  (select (j->>'isScoped') || '|' || (j->>'showSeller') || '|' || (j->'sellers')::text || '|' || (j->'seller')::text
     from (select current_setting('t.pa')::jsonb as j) x),
  'true|false|[]|null', 'Εύρος Α: χωρίς φίλτρο Πωλητή και χωρίς λίστα Πωλητών'
);
select is(
  (select (t->>'won') || '|' || (t->>'lost') || '|' || (t->>'winRate')
     from (select authz.report_sales_results('this-year', null, date '2025-06-30')->'totals' as t) x),
  '1|1|0.5000', 'Η Άννα: μία κερδισμένη, μία χαμένη'
);
select is(
  (select (t->>'opened') || '|' || (t->>'open') || '|' || (t->>'won') || '|' || (t->>'lost')
     from (select authz.report_sales_sources('this-year', null, date '2025-06-30')->'totals' as t) x),
  '3|2|1|0', 'Η Άννα: Πηγές μόνο των δικών της'
);
-- Πωλητής που δεν βλέπει = Πωλητής που δεν υπάρχει.
select is(authz.report_sales_pipeline(current_setting('t.vas')::uuid), authz.report_sales_pipeline(current_setting('t.nobody')::uuid),
  'Ανοιχτές: ξένος Πωλητής = άγνωστος Πωλητής');
select is(
  authz.report_sales_results('this-year', current_setting('t.vas')::uuid, date '2025-06-30'),
  authz.report_sales_results('this-year', current_setting('t.nobody')::uuid, date '2025-06-30'),
  'Κερδισμένες και χαμένες: ξένος Πωλητής = άγνωστος Πωλητής'
);
select is(
  authz.report_sales_sources('this-year', current_setting('t.vas')::uuid, date '2025-06-30'),
  authz.report_sales_sources('this-year', current_setting('t.nobody')::uuid, date '2025-06-30'),
  'Πηγές: ξένος Πωλητής = άγνωστος Πωλητής'
);
select is(jsonb_array_length(authz.report_sales_pipeline(current_setting('t.vas')::uuid)->'rows'), 0,
  'Ξένος Πωλητής: καμία γραμμή');
select is(authz.report_sales_pipeline(current_setting('t.anna')::uuid), current_setting('t.pa')::jsonb,
  'Η Άννα με τον εαυτό της ως Πωλητή: ό,τι και χωρίς φίλτρο');

-- ───────────── Χωρίς «Βλέπει ποσά»: πλήθη, ποσά null, ίδια σειρά ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
select set_config('t.p0', authz.report_sales_pipeline(null)::text, true);
select is(current_setting('t.p0')::jsonb->>'amounts', 'false', 'Χωρίς «Βλέπει ποσά»: amounts = false');
select is(
  (select count(*)::int from jsonb_array_elements(current_setting('t.p0')::jsonb->'rows') r where r->'value' <> 'null'::jsonb)
  + (select count(*)::int from jsonb_array_elements(current_setting('t.p0')::jsonb->'stages') s
      where s->'monthly' <> 'null'::jsonb or s->'oneOff' <> 'null'::jsonb),
  0, 'Χωρίς «Βλέπει ποσά»: καμία αξία ανά γραμμή ή Στάδιο'
);
select is(
  (select (t->>'count') || '|' || (t->'monthly')::text || '|' || (t->'oneOff')::text || '|' || (t->>'withoutProposal')
     from (select current_setting('t.p0')::jsonb->'totals' as t) x),
  '5|null|null|3', 'Χωρίς «Βλέπει ποσά»: σύνολα μόνο σε πλήθος'
);
select is(
  (select string_agg(r->>'opportunityId', ',') from jsonb_array_elements(current_setting('t.p0')::jsonb->'rows') r),
  (select string_agg(r->>'opportunityId', ',') from jsonb_array_elements(current_setting('t.p')::jsonb->'rows') r),
  'Η σειρά των γραμμών δεν μαρτυρά ποσά: ίδια με και χωρίς «Βλέπει ποσά»'
);
select is(
  (select (t->>'won') || '|' || (t->'wonMonthly')::text || '|' || (t->'wonOneOff')::text
     from (select authz.report_sales_results('this-year', null, date '2025-06-30')->'totals' as t) x),
  '1|null|null', 'Χωρίς «Βλέπει ποσά»: πλήθος κερδισμένων χωρίς αξία'
);

-- ───────────── Η εφαρμογή καλεί μόνο τα public RPC ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select public.report_sales_pipeline() $$, 'Η εφαρμογή (authenticated) καλεί τις Ανοιχτές Ευκαιρίες');
select lives_ok($$ select public.report_sales_results('last-month') $$, 'Η εφαρμογή καλεί τις Κερδισμένες και χαμένες');
select lives_ok($$ select public.report_sales_sources('this-quarter') $$, 'Η εφαρμογή καλεί τις Πηγές');
reset role;

select is(
  (select count(*)::int from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'authz'
      and p.proname in ('report_sales_access', 'report_sellers', 'report_seller_json', 'report_opportunities',
                        'report_sales_pipeline', 'report_sales_results', 'report_sales_sources')
      and (pg_catalog.has_function_privilege('anon', p.oid, 'execute')
           or pg_catalog.has_function_privilege('authenticated', p.oid, 'execute'))),
  0, 'Καμία authz.* του Ρβ δεν εκτελείται από anon ή authenticated'
);

select * from finish();
rollback;
