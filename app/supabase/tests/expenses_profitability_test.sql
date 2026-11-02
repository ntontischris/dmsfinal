-- Έξοδα του μήνα αναλυτικά (I6: public.cost_expenses_view, public.cost_save_expenses, ο νέος κανόνας της cost_save_month)
-- και Κερδοφορία (I7: public.profitability_view). Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Τα Έξοδα δουλεύουν
-- με τον τρέχοντα μήνα (σχετικά με τη μέρα εκτέλεσης)· η Κερδοφορία με σταθερές ημερομηνίες (Μάρτιος 2026).
-- Οι κλειστοί πίνακες δεν διαβάζονται ποτέ ως authenticated.
begin;
select plan(36);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης (βλέπει και γράφει κόστος) · a2 Διαχείριση (βλέπει κόστος, δεν γράφει) · a3 Πωλήσεις (χωρίς κόστος)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'manager@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Νίκος', 'manager@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Διαχείριση'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- Μήνες: m0 τρέχων, m_prev προηγούμενος (κλεισμένος), m1 επόμενος, m2 μεθεπόμενος.
select set_config('t.m0', date_trunc('month', now() at time zone 'Europe/Athens')::date::text, true);
select set_config('t.m_prev', (current_setting('t.m0')::date - interval '1 month')::date::text, true);
select set_config('t.m1', (current_setting('t.m0')::date + interval '1 month')::date::text, true);
select set_config('t.m2', (current_setting('t.m0')::date + interval '2 months')::date::text, true);

-- ───────────── Δεδομένα (χωρίς triggers) ─────────────
set local session_replication_role = replica;

-- Κόστος ώρας Μαρτίου 2026: 2.200 € ÷ 220 ώρες = 10 €. Ο προηγούμενος μήνας έχει ανάλυση (για το αντίγραφο).
insert into public.cost_months (month, expenses_total, productive_hours, expense_categories) values
  (date '2026-03-01', 2200, 220, null),
  (current_setting('t.m_prev')::date, 1500, 150,
   '[{"name":"Σταθερά","items":[{"name":"Ενοίκιο","lines":[{"label":"Γραφείο","amount":1500}]}]}]'::jsonb);

insert into public.clients (id, name, contact_name, contact_email) values
  ('00000000-0000-0000-0000-0000000000c1', 'Καφέ Αθηνά', 'Μαρία', 'maria@athina.example.gr'),
  ('00000000-0000-0000-0000-0000000000c2', 'Γυμναστήριο Κίνηση', 'Νίκος', 'nikos@kinisi.example.gr');

-- d1 Πελάτη 1, ώρες επιβεβαιωμένες · d2 Πελάτη 2 χωρίς ώρες · d3 Εσωτερική με ώρες · d4 ακυρωμένη · d5 εκτός διαστήματος
insert into public.productions (id, title, client_id, agreement_id, state, delivered_at, delivered_note, cancelled_at, cancelled_reason) values
  ('00000000-0000-0000-0000-0000000000d1', 'Βίντεο Αθηνά', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000e1', 'delivered', timestamptz '2026-03-10 10:00+00', 'Παραδόθηκε', null, null),
  ('00000000-0000-0000-0000-0000000000d2', 'Reel Κίνηση', '00000000-0000-0000-0000-0000000000c2',
   '00000000-0000-0000-0000-0000000000e2', 'delivered', timestamptz '2026-03-12 10:00+00', 'Παραδόθηκε', null, null),
  ('00000000-0000-0000-0000-0000000000d3', 'Εσωτερικό showreel', null, null,
   'delivered', timestamptz '2026-03-15 10:00+00', 'Παραδόθηκε', null, null),
  ('00000000-0000-0000-0000-0000000000d4', 'Ακυρωμένο Αθηνά', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000e1', 'cancelled', null, null, timestamptz '2026-03-05 10:00+00', 'Δεν χρειάζεται'),
  ('00000000-0000-0000-0000-0000000000d5', 'Παλιό Αθηνά', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000e1', 'delivered', timestamptz '2025-06-10 10:00+00', 'Παραδόθηκε', null, null);
insert into public.production_costs (production_id, estimate_shoot_hours, estimate_edit_hours, estimate_direct_cost,
                                     estimate_price, estimate_hour_cost, shoot_hours, shoot_confirmed_at, edit_hours, edit_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000d1', 6, 14, 0, 1000, 10, 10, now(), 15, now()),
  ('00000000-0000-0000-0000-0000000000d2', 2, 2, 0, 300, 10, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000d3', 0, 0, 0, null, 10, 2, now(), 3, now()),
  ('00000000-0000-0000-0000-0000000000d4', 2, 2, 0, 300, 10, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000d5', 2, 2, 0, 300, 10, 2, now(), 2, now());

set local session_replication_role = origin;

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.cost_expenses_view(current_date) $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Έξοδα');
select throws_ok($$ select public.profitability_view(date '2026-01-01', date '2026-06-01') $$, '42501', null,
  'Ο ανώνυμος δεν βλέπει Κερδοφορία');

set local role authenticated;
select public.t_as('a3');
select throws_ok($$ select public.cost_expenses_view(current_date) $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν βλέπουν Έξοδα');
select throws_ok(
  format($$ select public.cost_save_expenses(%L, '[]'::jsonb, 100) $$, current_setting('t.m0')),
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν γράφουν Έξοδα');
select throws_ok($$ select public.profitability_view(date '2026-01-01', date '2026-06-01') $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν βλέπουν Κερδοφορία');
select throws_ok($$ select * from public.cost_months $$, '42501', null, 'Ο πίνακας κόστους ώρας μένει κλειστός');

select public.t_as('a2');
select is((public.cost_expenses_view(current_setting('t.m0')::date) ->> 'canEdit')::boolean, false,
  'Η Διαχείριση βλέπει τα Έξοδα χωρίς επεξεργασία');
select throws_ok(
  format($$ select public.cost_save_expenses(%L, '[{"name":"Α","items":[]}]'::jsonb, 100) $$, current_setting('t.m0')),
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Διαχείριση δεν γράφει Έξοδα');
select is(jsonb_array_length(public.profitability_view(date '2026-01-01', date '2026-06-01')), 3,
  'Η Διαχείριση βλέπει την Κερδοφορία');

-- ───────────── Έξοδα: ανάγνωση πριν από την εγγραφή ─────────────
select public.t_as('a1');
select ok(public.cost_expenses_view(current_setting('t.m0')::date) -> 'saved' = 'null'::jsonb,
  'Ο τρέχων μήνας δεν έχει γραφτεί ακόμα');
select is(public.cost_expenses_view(current_setting('t.m0')::date) #>> '{previous,categories,0,items,0,name}', 'Ενοίκιο',
  'Ο προηγούμενος μήνας δίνει την ανάλυσή του για αντίγραφο');
select is((public.cost_expenses_view(current_setting('t.m0')::date) ->> 'canEdit')::boolean, true,
  'Ο Ιδιοκτήτης αλλάζει τον τρέχοντα μήνα');
select is((public.cost_expenses_view(current_setting('t.m_prev')::date) ->> 'isClosed')::boolean, true,
  'Ο προηγούμενος μήνας είναι κλεισμένος');
select is((public.cost_expenses_view(current_setting('t.m_prev')::date) ->> 'canEdit')::boolean, false,
  'Ο κλεισμένος μήνας δεν αλλάζει ούτε από τον Ιδιοκτήτη');

-- ───────────── Έξοδα: εγγραφή ─────────────
select lives_ok(
  format($$ select public.cost_save_expenses(%L,
    '[{"name":" Σταθερά ","items":[{"name":"Ενοίκιο","lines":[{"label":"Γραφείο","amount":1200},{"label":"Αποθήκη","amount":300.5}]}]},
      {"name":"Λογισμικό","items":[{"name":"Άδειες","lines":[{"label":"Μοντάζ","amount":699.5,"extra":"x"}]}]}]'::jsonb, 220) $$,
    current_setting('t.m0')),
  'Ο Ιδιοκτήτης γράφει την ανάλυση του τρέχοντος μήνα');
select is(
  (select expenses_total from public.cost_months_view() where month = current_setting('t.m0')::date), 2200.00::numeric,
  'Το σύνολο εξόδων είναι το άθροισμα των γραμμών');
select is(
  (select hour_cost from public.cost_months_view() where month = current_setting('t.m0')::date), 10.00::numeric,
  'Το Κόστος ώρας είναι σύνολο ÷ παραγωγικές ώρες, όπως πριν');
select is(public.cost_expenses_view(current_setting('t.m0')::date) #>> '{saved,categories,0,name}', 'Σταθερά',
  'Τα ονόματα γράφονται χωρίς κενά στις άκρες');
select ok(not (public.cost_expenses_view(current_setting('t.m0')::date) #> '{saved,categories,1,items,0,lines,0}' ? 'extra'),
  'Κρατιούνται μόνο τα γνωστά πεδία');

reset role;
select is((select count(*)::int from public.audit_log where entity = 'cost_months' and entity_id = current_setting('t.m0')), 1,
  'Η εγγραφή γράφει το Ίχνος');
set local role authenticated;
select public.t_as('a1');

select throws_ok(
  format($$ select public.cost_save_expenses(%L, '[{"name":"Α","items":[{"name":"Β","lines":[{"label":"Γ","amount":-1}]}]}]'::jsonb, 220) $$,
    current_setting('t.m0')),
  'P0001', null, 'Αρνητικό ποσό σταματά την αποθήκευση');
select throws_ok(
  format($$ select public.cost_save_expenses(%L, '[{"name":"  ","items":[]}]'::jsonb, 220) $$, current_setting('t.m0')),
  'P0001', null, 'Κενό όνομα σταματά την αποθήκευση');
select throws_ok(
  format($$ select public.cost_save_expenses(%L, '[{"name":"Α","items":[{"name":"Β","lines":[{"label":"Γ","amount":"10"}]}]}]'::jsonb, 220) $$,
    current_setting('t.m0')),
  'P0001', null, 'Ποσό που δεν είναι αριθμός σταματά την αποθήκευση');
select throws_ok(
  format($$ select public.cost_save_expenses(%L, '[{"name":"Α","items":[]}]'::jsonb, 220) $$, current_setting('t.m_prev')),
  'P0001', 'Ο μήνας έχει κλείσει· τα έξοδά του δεν αλλάζουν', 'Ο κλεισμένος μήνας δεν αλλάζει');
select throws_ok(
  format($$ select public.cost_save_expenses(%L, '[]'::jsonb, 220) $$, current_setting('t.m2')),
  'P0001', 'Πρόσθεσε τουλάχιστον ένα έξοδο', 'Νέος μήνας χωρίς έξοδα δεν γράφεται');

-- O6: μήνας με ανάλυση δεν παίρνει άλλο σύνολο· οι ώρες αλλάζουν κανονικά.
select throws_ok(
  format($$ select public.cost_save_month(%L, 5000, 220) $$, current_setting('t.m0')),
  'P0001', 'Τα έξοδα αυτού του μήνα είναι αναλυτικά· άλλαξέ τα στα «Έξοδα και Κόστος ώρας»',
  'Οι Ρυθμίσεις δεν αλλάζουν το σύνολο ενός μήνα με ανάλυση');
select lives_ok(format($$ select public.cost_save_month(%L, 2200, 200) $$, current_setting('t.m0')),
  'Οι Ρυθμίσεις αλλάζουν τις ώρες ενός μήνα με ανάλυση');
select is(
  (select hour_cost from public.cost_months_view() where month = current_setting('t.m0')::date), 11.00::numeric,
  'Το Κόστος ώρας ακολουθεί τις νέες ώρες');
select lives_ok(format($$ select public.cost_save_month(%L, 900, 90) $$, current_setting('t.m1')),
  'Μήνας χωρίς ανάλυση κρατά το ένα σύνολό του');

-- Κενή ανάλυση σε μήνα που υπάρχει: γυρίζει στο ένα σύνολο, χωρίς να αλλάξει.
select lives_ok(format($$ select public.cost_save_expenses(%L, '[]'::jsonb, 200) $$, current_setting('t.m0')),
  'Κενή ανάλυση αφαιρεί την ανάλυση');
select ok(
  public.cost_expenses_view(current_setting('t.m0')::date) #> '{saved,categories}' = 'null'::jsonb
    and (public.cost_expenses_view(current_setting('t.m0')::date) #>> '{saved,expensesTotal}')::numeric = 2200,
  'Χωρίς ανάλυση, το σύνολο μένει όπως ήταν');

-- ───────────── Κερδοφορία ─────────────
select is(
  (select string_agg(e ->> 'productionId', ',' order by e ->> 'productionId')
     from jsonb_array_elements(public.profitability_view(date '2026-01-01', date '2026-06-01')) e),
  '00000000-0000-0000-0000-0000000000d1,00000000-0000-0000-0000-0000000000d2,00000000-0000-0000-0000-0000000000d3',
  'Μόνο οι μη ακυρωμένες Παραγωγές του διαστήματος');
select is(
  (select format('%s|%s|%s|%s|%s|%s', e ->> 'clientId', e ->> 'client', e ->> 'month', trim_scale((e ->> 'price')::numeric),
                 trim_scale((e ->> 'actualCost')::numeric), e ->> 'hoursComplete')
     from jsonb_array_elements(public.profitability_view(date '2026-01-01', date '2026-06-01')) e
    where e ->> 'productionId' = '00000000-0000-0000-0000-0000000000d1'),
  '00000000-0000-0000-0000-0000000000c1|Καφέ Αθηνά|2026-03-01|1000|250|true',
  'Πελάτης, μήνας, τιμή και πραγματικό κόστος (25 ώρες × 10 €)');
select is(
  (select format('%s|%s|%s', e ->> 'hoursComplete', e ->> 'isInternal', trim_scale((e ->> 'estimateCost')::numeric))
     from jsonb_array_elements(public.profitability_view(date '2026-01-01', date '2026-06-01')) e
    where e ->> 'productionId' = '00000000-0000-0000-0000-0000000000d2'),
  'false|false|40',
  'Χωρίς επιβεβαιωμένες ώρες: hoursComplete false');
select is(
  (select format('%s|%s|%s', e ->> 'isInternal', e -> 'price', trim_scale((e ->> 'actualCost')::numeric))
     from jsonb_array_elements(public.profitability_view(date '2026-01-01', date '2026-06-01')) e
    where e ->> 'productionId' = '00000000-0000-0000-0000-0000000000d3'),
  'true|null|50',
  'Η Εσωτερική Παραγωγή: χωρίς τιμή, με κόστος');
select throws_ok($$ select public.profitability_view(date '2026-06-01', date '2026-01-01') $$, 'P0001', null,
  'Ανάποδο διάστημα σταματά την ανάγνωση');

select * from finish();
rollback;
