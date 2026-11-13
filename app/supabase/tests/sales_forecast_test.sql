-- Πρόβλεψη πωλήσεων (b3) και αλλαγή Υπεύθυνου μίας Ευκαιρίας (b2). MIG 20261114140000_sales_forecast.sql.
-- Φανταστικά δεδομένα στο 2025 με σταθερό «σήμερα» 2025-06-15. Οι κλειστοί πίνακες διαβάζονται μόνο μετά από reset role.
begin;
select plan(44);

-- a1 Ιδιοκτήτης · a2 Λογιστής · a3 Άννα (Πωλήσεις) · a4 Παραγωγή · a5 «Πωλήσεις χωρίς ποσά» (Εύρος όλα) · a7 Βασίλης (Πωλήσεις)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'counts@example.com'),
  ('00000000-0000-0000-0000-0000000000a7', 'vasilis@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ελένη', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Ρένα', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'Κώστας', 'counts@example.com'),
  ('00000000-0000-0000-0000-0000000000a7', 'Βασίλης', 'vasilis@example.com');
insert into public.roles (name, kind) values ('Πωλήσεις χωρίς ποσά (τεστ)', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'clients.manage', 'all' from public.roles r where r.name = 'Πωλήσεις χωρίς ποσά (τεστ)' and r.kind = 'team';
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

-- ───────────── Δεδομένα (χωρίς triggers) ─────────────
set session_replication_role = replica;

insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', 'Μαρία Παπαδάκη', 'a@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', 'Νίκος Κίνης', 'b@example.com', '00000000-0000-0000-0000-0000000000a7');

--  d1 Α · Άννα · Πρόταση · μηνιαία πρόταση 2 × 500 για 6 μήνες
--  d2 Α · Άννα · Νέα · χωρίς πρόταση
--  d3 Β · Βασίλης · Πρόταση · εφάπαξ πρόταση 1.500
--  d4 Α · χωρίς Υπεύθυνο (ουρά) · d5 Α · Άννα · κερδισμένη
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, outcome,
                                  next_step, next_step_due, created_at, closed_at)
select x.id::uuid, x.client_id::uuid, x.title,
       (select s.id from public.sales_stages s where s.code = x.stage),
       (select s.id from public.sales_sources s where s.code = 'web'),
       x.manager::uuid, x.outcome, 'Επόμενο', date '2025-07-01', timestamptz '2025-03-01 12:00+02', x.closed_at::timestamptz
  from (values
    ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο Α', 'proposal',
     '00000000-0000-0000-0000-0000000000a3', 'open', null),
    ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'Βίντεο Α', 'new',
     '00000000-0000-0000-0000-0000000000a3', 'open', null),
    ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c2', 'Εφάπαξ Β', 'proposal',
     '00000000-0000-0000-0000-0000000000a7', 'open', null),
    ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c1', 'Φόρμα Α', 'new',
     null, 'open', null),
    ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000c1', 'Κερδισμένο Α', 'proposal',
     '00000000-0000-0000-0000-0000000000a3', 'won', '2025-05-20 10:00+03')
  ) as x (id, client_id, title, stage, manager, outcome, closed_at);

insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, duration_months, renewal,
                               payment_days, unused_provisions, filming_notice_hours, filming_cancel_hours,
                               late_cancel_burns, no_show_burns, signed_at)
values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'monthly', 'Μηνιαίο Α', 'proposal', 'sent',
   date '2025-07-15', 6, 'new_opportunity', 15, 'lost', 48, 24, false, false, null),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000d3', 'one_off', 'Εφάπαξ Β', 'proposal', 'draft',
   date '2025-07-15', null, null, 15, 'lost', 48, 24, false, false, null);
insert into public.agreement_lines (id, agreement_id, position, line_kind, description, quantity) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-0000000000f1', 1, 'free', 'Reels', 2),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-0000000000f3', 1, 'free', 'Βίντεο', 1);
insert into public.agreement_line_amounts (line_id, unit_price) values
  ('00000000-0000-0000-0000-000000000301', 500),
  ('00000000-0000-0000-0000-000000000303', 1500);

set session_replication_role = origin;

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- Μία γραμμή πρόβλεψης ως κείμενο: Αξία|πηγή|Πιθανότητα|πηγή|σταθμισμένη|αργεί
create function public.t_row(p_opp text) returns text
language sql
as $$
  select concat_ws('|', coalesce(trim_scale(r.value)::text, '—'), coalesce(r.value_source, '—'), r.probability,
                   coalesce(r.probability_source, '—'), coalesce(trim_scale(r.weighted)::text, '—'), r.is_late)
    from public.sales_pipeline_rows(date '2025-06-15') r
   where r.opportunity_id = ('00000000-0000-0000-0000-0000000000' || p_opp)::uuid;
$$;

-- Σύνολο ως κείμενο: ανοιχτές|με Αξία|Σ Αξίας|Σ σταθμισμένης|του μήνα|σταθμισμένη μήνα|αργούν
create function public.t_sum() returns text
language sql
as $$
  select concat_ws('|', v->>'open', v->>'valued', coalesce(trim_scale((v->>'total')::numeric)::text, '—'),
                   coalesce(trim_scale((v->>'weighted')::numeric)::text, '—'), v->'thisMonth'->>'count',
                   coalesce(trim_scale((v->'thisMonth'->>'weighted')::numeric)::text, '—'), v->>'late')
    from (select public.sales_pipeline_value(date '2025-06-15') as v) s;
$$;

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.sales_pipeline_value(null) $$, '42501', null, 'Ο ανώνυμος δεν βλέπει την πρόβλεψη');
select throws_ok($$ select public.sales_set_forecast('00000000-0000-0000-0000-0000000000d1', 1, 50, null) $$, '42501', null,
  'Ο ανώνυμος δεν γράφει πρόβλεψη');
select throws_ok($$ select * from public.opportunity_amounts $$, '42501', null, 'Ο ανώνυμος δεν διαβάζει εκτιμήσεις');
reset role;

set local role authenticated;
select public.t_as('a4');
select throws_ok($$ select public.sales_pipeline_value(null) $$, '42501', null, 'Η Παραγωγή δεν βλέπει την πρόβλεψη');
select throws_ok($$ select * from public.sales_pipeline_rows(null) $$, '42501', null, 'Η Παραγωγή δεν βλέπει γραμμές πρόβλεψης');
select public.t_as('a2');
select throws_ok($$ select public.sales_pipeline_value(null) $$, '42501', null,
  'Ο Λογιστής (χωρίς «Διαχειρίζεται Πελάτες») δεν βλέπει την πρόβλεψη');
select throws_ok($$ select public.sales_set_forecast('00000000-0000-0000-0000-0000000000d1', 1, 50, null) $$, '42501', null,
  'Ο Λογιστής δεν γράφει πρόβλεψη');
select is((select count(*) from public.opportunity_amounts), 0::bigint, 'Ο Λογιστής δεν βλέπει εκτιμήσεις Ευκαιριών');
select public.t_as('a7');
select throws_ok($$ select public.sales_set_forecast('00000000-0000-0000-0000-0000000000d1', 1, 50, null) $$, '42501', null,
  'Ο Βασίλης δεν γράφει πρόβλεψη σε Ευκαιρία της Άννας');
select throws_ok(
  $$ insert into public.opportunity_amounts (opportunity_id, estimated_value) values ('00000000-0000-0000-0000-0000000000d3', 1) $$,
  '42501', null, 'Κανείς δεν γράφει εκτίμηση απευθείας στον πίνακα');

-- ───────────── Γραφή πρόβλεψης ─────────────
select public.t_as('a1');
select lives_ok($$ select public.sales_set_forecast('00000000-0000-0000-0000-0000000000d2', 2000, 50, date '2025-06-20') $$,
  'Ο Ιδιοκτήτης γράφει Αξία, Πιθανότητα και κλείσιμο σε Ευκαιρία της Άννας');
select throws_ok($$ select public.sales_set_forecast('00000000-0000-0000-0000-0000000000d2', 1, 120, null) $$, 'P0001',
  'Η Πιθανότητα είναι από 0 έως 100%', 'Πιθανότητα πάνω από 100 δεν περνά');
select throws_ok($$ select public.sales_set_forecast('00000000-0000-0000-0000-0000000000d2', -1, 50, null) $$, 'P0001',
  'Η Αξία δεν μπορεί να είναι αρνητική', 'Αρνητική Αξία δεν περνά');
select throws_ok($$ select public.sales_set_forecast('00000000-0000-0000-0000-0000000000d5', 1, 50, null) $$, 'P0001',
  'Μια κλεισμένη Ευκαιρία δεν αλλάζει', 'Κλεισμένη Ευκαιρία δεν παίρνει πρόβλεψη');
select public.t_as('a3');
select lives_ok($$ select public.sales_set_forecast('00000000-0000-0000-0000-0000000000d1', null, null, date '2025-06-30') $$,
  'Η Άννα αφήνει την Αξία στην πρόταση και την Πιθανότητα στο Στάδιο');
select public.t_as('a7');
select lives_ok($$ select public.sales_set_forecast('00000000-0000-0000-0000-0000000000d3', null, null, date '2025-05-01') $$,
  'Ο Βασίλης γράφει κλείσιμο στη δική του');

-- ───────────── Ανάγνωση πρόβλεψης ─────────────
select public.t_as('a1');
select is(public.t_row('d1'), '6000|proposal|60|stage|3600|false',
  'Χωρίς εκτίμηση: Αξία = μηνιαία πρόταση × μήνες, Πιθανότητα του Σταδίου «Πρόταση»');
select is(public.t_row('d2'), '2000|estimate|50|opportunity|1000|false', 'Η εκτίμηση και η Πιθανότητα της Ευκαιρίας νικούν');
select is(public.t_row('d3'), '1500|proposal|60|stage|900|true', 'Εφάπαξ πρόταση· το κλείσιμο πέρασε → αργεί');
select is(public.t_row('d4'), '—|—|10|stage|—|false', 'Χωρίς πρόταση και εκτίμηση: χωρίς Αξία');
select is(public.t_row('d5'), null, 'Οι κλεισμένες δεν μπαίνουν στην πρόβλεψη');
select is(public.t_sum(), '4|3|9500|5500|2|4600|1', 'Σύνολο Ιδιοκτήτη: όλες οι ανοιχτές');
select public.t_as('a3');
select is(public.t_sum(), '3|2|8000|4600|2|4600|0', 'Η Άννα βλέπει τις δικές της και την ουρά του Πελάτη της');
select public.t_as('a5');
select is(public.t_sum(), '4|0|—|—|2|—|1', 'Χωρίς «Βλέπει ποσά»: πλήθη ναι, ποσά όχι');
select is((select count(*) from public.opportunity_amounts), 0::bigint, 'Χωρίς «Βλέπει ποσά» δεν διαβάζει εκτιμήσεις');
select throws_ok($$ select public.sales_set_forecast('00000000-0000-0000-0000-0000000000d3', 100, 70, null) $$, '42501', null,
  'Χωρίς «Βλέπει ποσά» δεν γράφει Αξία');
select lives_ok($$ select public.sales_set_forecast('00000000-0000-0000-0000-0000000000d3', null, 70, null, true) $$,
  'Χωρίς «Βλέπει ποσά» γράφει Πιθανότητα και κλείσιμο, η Αξία μένει');
select public.t_as('a1');
select is(public.t_row('d3'), '1500|proposal|70|opportunity|1050|false', 'Η Αξία έμεινε, η Πιθανότητα άλλαξε');

-- Προεπιλογή Σταδίου: μόνο όποιος «Διαχειρίζεται Ρυθμίσεις».
select public.t_as('a3');
update public.sales_stages set probability = 90 where code = 'proposal';
select public.t_as('a1');
select is(public.t_row('d1'), '6000|proposal|60|stage|3600|false', 'Ο πωλητής δεν αλλάζει την Πιθανότητα Σταδίου');
update public.sales_stages set probability = 65 where code = 'proposal';
select is(public.t_row('d1'), '6000|proposal|65|stage|3900|false', 'Ο Ιδιοκτήτης αλλάζει την Πιθανότητα Σταδίου');

-- ───────────── Αλλαγή Υπεύθυνου (b2) ─────────────
select public.t_as('a7');
select throws_ok($$ select public.sales_set_opportunity_manager('00000000-0000-0000-0000-0000000000d1',
                                                                 '00000000-0000-0000-0000-0000000000a7') $$,
  '42501', null, 'Ο Βασίλης δεν παίρνει Ευκαιρία της Άννας');
select public.t_as('a3');
select lives_ok($$ select public.sales_set_opportunity_manager('00000000-0000-0000-0000-0000000000d2',
                                                                '00000000-0000-0000-0000-0000000000a7') $$,
  'Η Άννα δίνει τη δική της Ευκαιρία στον Βασίλη');
select throws_ok($$ select public.sales_set_opportunity_manager('00000000-0000-0000-0000-0000000000d2',
                                                                 '00000000-0000-0000-0000-0000000000a3') $$,
  '42501', null, 'Αφού τη δώσει, η Άννα δεν την παίρνει πίσω μόνη της');
reset role;
select is((select manager_id from public.opportunities where id = '00000000-0000-0000-0000-0000000000d2'),
  '00000000-0000-0000-0000-0000000000a7'::uuid, 'Ο Βασίλης είναι ο νέος Υπεύθυνος');
select is((select count(*) from public.opportunity_activities
            where opportunity_id = '00000000-0000-0000-0000-0000000000d2' and event = 'assigned'
              and previous_id = '00000000-0000-0000-0000-0000000000a3' and subject_id = '00000000-0000-0000-0000-0000000000a7'
              and actor_id = '00000000-0000-0000-0000-0000000000a3'),
  1::bigint, 'Γράφεται Δραστηριότητα ανάθεσης');
select is((select manager_id from public.clients where id = '00000000-0000-0000-0000-0000000000c1'),
  '00000000-0000-0000-0000-0000000000a3'::uuid, 'Ο Υπεύθυνος του Πελάτη δεν αλλάζει');

set local role authenticated;
select public.t_as('a1');
select lives_ok($$ select public.sales_set_opportunity_manager('00000000-0000-0000-0000-0000000000d2',
                                                                '00000000-0000-0000-0000-0000000000a3') $$,
  'Όποιος «Μεταβιβάζει Υπεύθυνο» αλλάζει τον Υπεύθυνο οποιασδήποτε');
select throws_ok($$ select public.sales_set_opportunity_manager('00000000-0000-0000-0000-0000000000d2',
                                                                 '00000000-0000-0000-0000-0000000000a2') $$,
  'P0001', null, 'Υπεύθυνος γίνεται μόνο όποιος διαχειρίζεται Πελάτες');
select throws_ok($$ select public.sales_set_opportunity_manager('00000000-0000-0000-0000-0000000000d5',
                                                                 '00000000-0000-0000-0000-0000000000a7') $$,
  'P0001', 'Μια κλεισμένη Ευκαιρία δεν αλλάζει', 'Κλεισμένη Ευκαιρία δεν αλλάζει Υπεύθυνο');
select throws_ok($$ select public.sales_set_opportunity_manager('00000000-0000-0000-0000-0000000000d4',
                                                                 '00000000-0000-0000-0000-0000000000a7') $$,
  'P0001', null, 'Η ουρά «Χωρίς υπεύθυνο» ανατίθεται από τη δική της ενέργεια');
select throws_ok($$ select public.sales_set_opportunity_manager('00000000-0000-0000-0000-0000000000d2', null) $$,
  'P0001', 'Διάλεξε νέο Υπεύθυνο', 'Χωρίς νέο Υπεύθυνο δεν περνά');

-- Υποψήφιοι Υπεύθυνοι: μόνο για όποιον διαχειρίζεται Πελάτες· μόνο όσοι μπορούν να γίνουν Υπεύθυνοι.
select public.t_as('a3');
select ok((select array['Άννα', 'Βασίλης', 'Γιώργος', 'Κώστας'] <@ array_agg(name)
                and not ('Ελένη' = any (array_agg(name))) and not ('Ρένα' = any (array_agg(name)))
              from public.sales_handoff_candidates()),
  'Ο πωλητής βλέπει σε ποιους μπορεί να δώσει την Ευκαιρία (όχι Λογιστή, όχι Παραγωγή)');
select public.t_as('a2');
select throws_ok($$ select * from public.sales_handoff_candidates() $$, '42501', null,
  'Ο Λογιστής δεν παίρνει λίστα Υπευθύνων');
reset role;
set local role anon;
select throws_ok($$ select * from public.sales_handoff_candidates() $$, '42501', null, 'Ο ανώνυμος δεν παίρνει λίστα Υπευθύνων');
reset role;

select * from finish();
rollback;
