-- Κατάλογος, Κόστος ώρας, Εύρος τιμής, Είδη Παροχής (κεφ. 3, 5, ADR 0007, 0015, 0017). Φανταστικοί Χρήστες και στοιχεία.
begin;
select plan(197);

-- ───────────── Χρήστες ─────────────
-- d1 Ιδιοκτήτης · d2 Διαχείριση · d3 Άννα (Πωλήσεις) · d4 Παραγωγή · d5 Λογιστής
-- d6 «Κατάλογος μόνο» (catalogue.manage) · d7 «Ελεγκτής» (audit.view) · d8 «Κόστος» (catalogue.view + finance.cost + finance.costManage)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000d3', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000d4', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000d5', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000d6', 'catalogue@example.com'),
  ('00000000-0000-0000-0000-0000000000d7', 'auditor@example.com'),
  ('00000000-0000-0000-0000-0000000000d8', 'cost@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'Δημήτρης', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000d3', 'Άννα', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000d4', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000d5', 'Μαρία', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000d6', 'Ελένη', 'catalogue@example.com'),
  ('00000000-0000-0000-0000-0000000000d7', 'Κώστας', 'auditor@example.com'),
  ('00000000-0000-0000-0000-0000000000d8', 'Σοφία', 'cost@example.com');

insert into public.roles (name, kind) values
  ('Κατάλογος μόνο', 'team'), ('Ελεγκτής', 'team'), ('Κόστος', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, g.code, 'all'
  from (values
    ('Κατάλογος μόνο', 'catalogue.manage'),
    ('Ελεγκτής', 'audit.view'),
    ('Κόστος', 'catalogue.view'), ('Κόστος', 'finance.cost'), ('Κόστος', 'finance.costManage')
  ) as g (role_name, code)
  join public.roles r on r.name = g.role_name and r.kind = 'team';

insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000d1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000d2', 'Διαχείριση'),
    ('00000000-0000-0000-0000-0000000000d3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000d4', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000d5', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000d6', 'Κατάλογος μόνο'),
    ('00000000-0000-0000-0000-0000000000d7', 'Ελεγκτής'),
    ('00000000-0000-0000-0000-0000000000d8', 'Κόστος')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Βοηθητικό των τεστ: [{kind_id, quantity}] από κωδικούς ειδών Παροχής.
create function public.t_prov(p_codes text[], p_qty integer[]) returns jsonb
language sql stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object('kind_id', k.id, 'quantity', u.q) order by u.n), '[]'::jsonb)
    from unnest(p_codes, p_qty) with ordinality as u (code, q, n)
    join public.provision_kinds k on k.code = u.code;
$$;

-- Ο τρέχων μήνας στην Ελλάδα, όπως τον βλέπει η βάση.
select set_config('t.m0', (date_trunc('month', now() at time zone 'Europe/Athens')::date)::text, true);
select set_config('t.m_prev', ((current_setting('t.m0')::date - interval '1 month')::date)::text, true);
select set_config('t.m_prev2', ((current_setting('t.m0')::date - interval '2 months')::date)::text, true);
select set_config('t.m_next', ((current_setting('t.m0')::date + interval '1 month')::date)::text, true);

-- ───────────── Αρχικές τιμές και δομή ─────────────
select is((select count(*)::int from public.provision_kinds where retired_at is null), 5, '5 αρχικά είδη Παροχής');
select is(
  (select measure || ':' || default_hours::text from public.provision_kinds where code = 'shoot'),
  'per_filming:4.0', 'Το Γύρισμα μετριέται ανά Γύρισμα, έως 4 ώρες'
);
select is(
  (select count(*)::int from public.provision_kinds where length(label_en) > 0 and length(unit_en) > 0),
  5, 'Τα είδη Παροχής έχουν ελληνικά και αγγλικά'
);
select is(
  (select multiplier_min::text || '/' || multiplier_target::text || '/' || multiplier_max::text from public.cost_settings),
  '1.30/1.60/2.00', 'Οι αρχικοί πολλαπλασιαστές του Εύρους τιμής'
);
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname in ('provision_kinds', 'catalogue_items', 'catalogue_item_amounts', 'catalogue_item_costs',
                        'catalogue_item_provisions', 'cost_months', 'cost_settings')),
  7, 'RLS ενεργό σε όλους τους πίνακες του Καταλόγου και του κόστους'
);
select is((select count(*)::int from public.catalogue_items), 0, 'Ο Κατάλογος ξεκινά άδειος');
select is((select done from authz.readiness_items() where item = 'catalogue'), false, 'Κατάλογος: εκκρεμεί όσο δεν υπάρχει στοιχείο');
select is((select note from authz.readiness_items() where item = 'catalogue'), null, 'Η γραμμή «catalogue» δεν περιμένει πια module');
select is((select done from authz.readiness_items() where item = 'costs'), false, 'Κόστος ώρας: εκκρεμεί όσο δεν υπάρχει μήνας');
select is((select count(*)::int from authz.readiness_items()), 11, 'Ο Έλεγχος ετοιμότητας έχει ακόμα 11 γραμμές');

set local role authenticated;

-- ───────────── Ιδιοκτήτης: δημιουργία ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);

select set_config('t.p1', public.catalogue_create_item(
  'package', 'monthly', 'Μηνιαία Παρουσία', 'Το βασικό μηνιαίο πακέτο social.', '', 1300,
  public.t_prov(array['shoot', 'reel'], array[2, 8]))::text, true);
select is((select count(*)::int from public.catalogue_items_view(current_setting('t.p1')::uuid)), 1, 'Ο Ιδιοκτήτης βλέπει το νέο Πακέτο');
select is(
  (select kind || ':' || billing || ':' || price::text || ':' || hours_shoot::text || ':' || hours_edit::text || ':' || direct_cost::text
     from public.catalogue_items_view(current_setting('t.p1')::uuid)),
  'package:monthly:1300.00:0.0:0.0:0.00', 'Μηνιαίο Πακέτο με τιμή, μηδενικές ώρες και κόστος'
);
select is(
  (select jsonb_array_length(provisions) || ':' || (provisions -> 0 ->> 'quantity') || ':' || (provisions -> 1 ->> 'quantity')
     from public.catalogue_items_view(current_setting('t.p1')::uuid)),
  '2:2:8', 'Οι Παροχές: 2 Γυρίσματα, 8 reels, με τη σειρά της λίστας'
);
select is((select uses from public.catalogue_items_view(current_setting('t.p1')::uuid)), 0::bigint, 'Καμία Συμφωνία δεν το έχει αντιγράψει ακόμα');

select set_config('t.s1', public.catalogue_create_item(
  'service', null, 'Έξτρα reel', '', 'ανά reel', 150, public.t_prov(array['reel'], array[1]))::text, true);
select is(
  (select kind || ':' || coalesce(billing, 'null') || ':' || unit from public.catalogue_items_view(current_setting('t.s1')::uuid)),
  'service:null:ανά reel', 'Η Υπηρεσία έχει μονάδα και καμία χρέωση περιόδου'
);

select set_config('t.p2', public.catalogue_create_item(
  'package', 'one_off', 'Εκδήλωση', '', 'ανά εκδήλωση', 400,
  public.t_prov(array['video', 'photo'], array[1, 20]))::text, true);
select is((select unit from public.catalogue_items_view(current_setting('t.p2')::uuid)), '', 'Το Πακέτο δεν κρατά μονάδα');

select throws_ok(
  $$ select public.catalogue_create_item('package', 'monthly', 'Άδειο', '', '', 10, '[]'::jsonb) $$,
  'P0001', 'Ένα Πακέτο έχει τουλάχιστον μία Παροχή', 'Πακέτο χωρίς Παροχές δεν γίνεται'
);
select throws_ok(
  $$ select public.catalogue_create_item('service', null, 'Χωρίς μονάδα', '', '  ', 10, '[]'::jsonb) $$,
  'P0001', 'Η Υπηρεσία θέλει μονάδα (π.χ. ανά reel)', 'Υπηρεσία χωρίς μονάδα δεν γίνεται'
);
select throws_ok(
  $$ select public.catalogue_create_item('package', null, 'Χωρίς χρέωση', '', '', 10, public.t_prov(array['reel'], array[1])) $$,
  'P0001', null, 'Πακέτο χωρίς μηνιαίο/εφάπαξ δεν γίνεται'
);
select throws_ok(
  $$ select public.catalogue_create_item('bundle', null, 'Άγνωστο', '', '', 10, '[]'::jsonb) $$,
  'P0001', null, 'Άγνωστο είδος στοιχείου'
);
select throws_ok(
  $$ select public.catalogue_create_item('package', 'monthly', 'μηνιαία παρουσία', '', '', 10, public.t_prov(array['reel'], array[1])) $$,
  '23505', null, 'Ενεργό όνομα μοναδικό, χωρίς διάκριση πεζών'
);
select throws_ok(
  $$ select public.catalogue_create_item('package', 'monthly', 'Διπλές Παροχές', '', '', 10, public.t_prov(array['reel', 'reel'], array[1, 2])) $$,
  'P0001', 'Κάθε είδος Παροχής μπαίνει μία φορά', 'Το ίδιο είδος Παροχής δύο φορές'
);
select throws_ok(
  $$ select public.catalogue_create_item('package', 'monthly', 'Μηδενική ποσότητα', '', '', 10, public.t_prov(array['reel'], array[0])) $$,
  'P0001', null, 'Ποσότητα Παροχής μικρότερη από 1'
);
select throws_ok(
  $$ select public.catalogue_create_item('package', 'monthly', 'Άγνωστη Παροχή', '', '', 10,
       '[{"kind_id":"00000000-0000-0000-0000-0000000000ff","quantity":1}]'::jsonb) $$,
  'P0001', 'Άγνωστο είδος Παροχής', 'Άγνωστο είδος Παροχής'
);
select throws_ok(
  $$ select public.catalogue_create_item('package', 'monthly', 'Αρνητική τιμή', '', '', -5, public.t_prov(array['reel'], array[1])) $$,
  '23514', null, 'Αρνητική τιμή δεν γίνεται'
);
select is((select count(*)::int from public.catalogue_items_view()), 3, 'Οι αποτυχημένες δημιουργίες δεν άφησαν τίποτα');

-- Ώρες και Άμεσο κόστος.
select lives_ok(
  format($$ select public.catalogue_set_cost(%L, 6, 14) $$, current_setting('t.p1')),
  'Ο Ιδιοκτήτης γράφει ώρες γυρίσματος και μοντάζ'
);
select lives_ok(
  format($$ select public.catalogue_set_cost(%L, null, 16) $$, current_setting('t.p1')),
  'Μόνο οι ώρες που δίνονται αλλάζουν'
);
select is(
  (select hours_shoot::text || '/' || hours_edit::text from public.catalogue_items_view(current_setting('t.p1')::uuid)),
  '6.0/16.0', 'Οι ώρες γυρίσματος έμειναν, οι ώρες μοντάζ άλλαξαν'
);
select lives_ok(
  format($$ select public.catalogue_set_cost(%L, 3, 1, 25, 'drone') $$, current_setting('t.s1')),
  'Ο Ιδιοκτήτης γράφει ώρες και Άμεσο κόστος μαζί'
);
select is(
  (select direct_cost::text || ':' || direct_cost_note from public.catalogue_items_view(current_setting('t.s1')::uuid)),
  '25.00:drone', 'Άμεσο κόστος με σημείωση'
);
select throws_ok(
  format($$ select public.catalogue_set_cost(%L, -1, null) $$, current_setting('t.p1')),
  '23514', null, 'Αρνητικές ώρες δεν γίνονται'
);
select set_config('t.audit_costs', (select count(*)::text from public.audit_log where entity = 'catalogue_item_costs'), true);
select lives_ok(
  format($$ select public.catalogue_set_cost(%L, 6, 16, 0, '') $$, current_setting('t.p1')),
  'Αποθήκευση ωρών και κόστους χωρίς καμία αλλαγή'
);
select is(
  (select count(*)::text from public.audit_log where entity = 'catalogue_item_costs'),
  current_setting('t.audit_costs'), 'Αποθήκευση κόστους χωρίς αλλαγή δεν γράφει στο Ίχνος'
);

-- Όρια αριθμών: ελληνικό μήνυμα αντί για το 22003 της βάσης.
select throws_ok(
  $$ select public.catalogue_create_item('service', null, 'Υπέρογκη τιμή', '', 'ανά τίποτα', 10000000, '[]'::jsonb) $$,
  'P0001', 'Η τιμή πρέπει να είναι μικρότερη από 10.000.000 €', 'Τιμή 10.000.000 € ή πάνω δεν γίνεται (δημιουργία)'
);
select throws_ok(
  format($$ select public.catalogue_update_item(%L, 'Έξτρα reel', '', 'ανά reel', 99999999999) $$, current_setting('t.s1')),
  'P0001', 'Η τιμή πρέπει να είναι μικρότερη από 10.000.000 €', 'Υπέρογκη τιμή δεν γίνεται (αλλαγή)'
);
select throws_ok(
  format($$ select public.catalogue_set_cost(%L, 1000, null) $$, current_setting('t.p1')),
  'P0001', 'Οι ώρες δεν μπορούν να ξεπερνούν τις 999', 'Ώρες γυρίσματος πάνω από 999 δεν γίνονται'
);
select throws_ok(
  format($$ select public.catalogue_set_cost(%L, null, 99999) $$, current_setting('t.p1')),
  'P0001', 'Οι ώρες δεν μπορούν να ξεπερνούν τις 999', 'Ώρες μοντάζ πάνω από 999 δεν γίνονται'
);
select throws_ok(
  format($$ select public.catalogue_set_cost(%L, null, null, 10000000, '') $$, current_setting('t.p1')),
  'P0001', 'Το Άμεσο κόστος πρέπει να είναι μικρότερο από 10.000.000 €', 'Υπέρογκο Άμεσο κόστος δεν γίνεται'
);
select lives_ok(
  format($$ select public.catalogue_set_cost(%L, 999, 999, 9999999.99, '') $$, current_setting('t.s1')),
  'Τα όρια 999 ώρες και 9.999.999,99 € γίνονται δεκτά'
);
select lives_ok(
  format($$ select public.catalogue_set_cost(%L, 3, 1, 40, 'freelancer') $$, current_setting('t.s1')),
  'Επιστροφή των ωρών και του κόστους της Υπηρεσίας σε λογικές τιμές'
);

-- Αλλαγή τιμής: μόνο προς τα εμπρός, στο Ίχνος με πριν → μετά.
select lives_ok(
  format($$ select public.catalogue_update_item(%L, 'Μηνιαία Παρουσία', 'Το βασικό μηνιαίο πακέτο social: δύο Γυρίσματα και οκτώ reels.', '', 1350) $$, current_setting('t.p1')),
  'Ο Ιδιοκτήτης αλλάζει την τιμή'
);
select is((select price from public.catalogue_items_view(current_setting('t.p1')::uuid)), 1350.00::numeric, 'Η νέα τιμή ισχύει');
select ok(
  (select count(*) = 1 from public.audit_log
    where entity = 'catalogue_item_amounts' and entity_id = current_setting('t.p1')
      and action = 'update' and (before ->> 'price')::numeric = 1300 and (after ->> 'price')::numeric = 1350),
  'Η αλλαγή τιμής γράφεται στο Ίχνος: 1300 → 1350'
);
select set_config('t.audit_before', (select count(*)::text from public.audit_log where entity in ('catalogue_items', 'catalogue_item_amounts')), true);
select lives_ok(
  format($$ select public.catalogue_update_item(%L, 'Μηνιαία Παρουσία', 'Το βασικό μηνιαίο πακέτο social: δύο Γυρίσματα και οκτώ reels.', '', 1350) $$, current_setting('t.p1')),
  'Αποθήκευση χωρίς καμία αλλαγή'
);
select is(
  (select count(*)::text from public.audit_log where entity in ('catalogue_items', 'catalogue_item_amounts')),
  current_setting('t.audit_before'), 'Αποθήκευση χωρίς αλλαγή δεν γράφει στο Ίχνος'
);
select throws_ok(
  format($$ select public.catalogue_update_item(%L, '   ', '', '', null) $$, current_setting('t.p1')),
  '23514', null, 'Κενό όνομα δεν γίνεται'
);
select throws_ok(
  format($$ select public.catalogue_update_item(%L, 'Έξτρα reel', '', ' ', null) $$, current_setting('t.s1')),
  'P0001', 'Η Υπηρεσία θέλει μονάδα (π.χ. ανά reel)', 'Η Υπηρεσία δεν χάνει τη μονάδα της'
);

-- Παροχές: αντικατάσταση μόνο όσων διαφέρουν.
select lives_ok(
  format($$ select public.catalogue_set_provisions(%L, public.t_prov(array['reel', 'video'], array[10, 1])) $$, current_setting('t.p1')),
  'Αλλαγή των Παροχών ενός Πακέτου'
);
select is(
  (select string_agg(k.code || '=' || (e ->> 'quantity'), ',' order by k.sort)
     from public.catalogue_items_view(current_setting('t.p1')::uuid) v
     cross join lateral jsonb_array_elements(v.provisions) e
     join public.provision_kinds k on k.id = (e ->> 'kind_id')::uuid),
  'reel=10,video=1', 'Το Γύρισμα έφυγε, το reel άλλαξε, το βίντεο μπήκε'
);
select set_config('t.prov_audit', (select count(*)::text from public.audit_log where entity = 'catalogue_item_provisions'), true);
select lives_ok(
  format($$ select public.catalogue_set_provisions(%L, public.t_prov(array['reel', 'video'], array[10, 1])) $$, current_setting('t.p1')),
  'Ξανα-αποθήκευση των ίδιων Παροχών'
);
select is(
  (select count(*)::text from public.audit_log where entity = 'catalogue_item_provisions'),
  current_setting('t.prov_audit'), 'Οι ίδιες Παροχές δεν γράφουν στο Ίχνος'
);
select throws_ok(
  format($$ select public.catalogue_set_provisions(%L, '[]'::jsonb) $$, current_setting('t.p1')),
  'P0001', 'Ένα Πακέτο έχει τουλάχιστον μία Παροχή', 'Το Πακέτο δεν μένει χωρίς Παροχές'
);
select lives_ok(
  format($$ select public.catalogue_set_provisions(%L, '[]'::jsonb) $$, current_setting('t.s1')),
  'Η Υπηρεσία μπορεί να μην καταναλώνει Παροχή (π.χ. drone)'
);
select lives_ok(
  format($$ select public.catalogue_set_provisions(%L, public.t_prov(array['reel'], array[1])) $$, current_setting('t.s1')),
  'Η Υπηρεσία ξαναβάζει την Παροχή της'
);
select lives_ok(
  format($$ select public.catalogue_set_provisions(%L, public.t_prov(array['shoot', 'reel'], array[2, 8])) $$, current_setting('t.p1')),
  'Το Πακέτο γυρνά στις Παροχές 2 + 8'
);

-- ───────────── Έλεγχος ετοιμότητας ─────────────
select is((select done from public.readiness() where item = 'catalogue'), true, 'Κατάλογος: έτοιμος όταν όλα τα ενεργά στοιχεία έχουν τιμή');

-- ───────────── Διαχείριση: βλέπει κόστος, δεν διαχειρίζεται κόστος ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
select is(
  (select hours_shoot::text || '/' || hours_edit::text || ':' || price::text from public.catalogue_items_view(current_setting('t.p1')::uuid)),
  '6.0/16.0:1350.00', 'Η Διαχείριση βλέπει ώρες και τιμή'
);
select throws_ok(
  format($$ select public.catalogue_set_cost(%L, 7, null) $$, current_setting('t.p1')),
  '42501', null, 'Η Διαχείριση δεν αλλάζει ώρες: θέλει «Διαχειρίζεται κόστος»'
);
select lives_ok(
  format($$ select public.catalogue_set_cost(%L, null, null, 40, 'freelancer') $$, current_setting('t.s1')),
  'Η Διαχείριση αλλάζει το Άμεσο κόστος'
);
select set_config('t.p3', public.catalogue_create_item(
  'package', 'monthly', 'Podcast Μηνιαίο', 'Δύο επεισόδια τον μήνα.', '', 900,
  public.t_prov(array['podcast_episode'], array[2]))::text, true);
select is((select price from public.catalogue_items_view(current_setting('t.p3')::uuid)), 900.00::numeric, 'Η Διαχείριση φτιάχνει Πακέτο με τιμή');
select throws_ok(
  $$ select public.cost_save_month(current_setting('t.m0')::date, 8800, 220) $$,
  '42501', null, 'Η Διαχείριση δεν γράφει έξοδα και ώρες του μήνα'
);
select throws_ok(
  $$ select public.cost_save_multipliers(1.2, 1.5, 2.2) $$,
  '42501', null, 'Η Διαχείριση δεν αλλάζει πολλαπλασιαστές'
);

-- ───────────── Πωλήσεις (Άννα): τιμές και Παροχές, χωρίς κόστος ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}', true);
select is((select count(*)::int from public.catalogue_items_view()), 4, 'Οι Πωλήσεις βλέπουν τα ενεργά στοιχεία');
select is(
  (select price::text || ':' || coalesce(hours_shoot::text, 'null') || ':' || coalesce(hours_edit::text, 'null') || ':'
          || coalesce(direct_cost::text, 'null') || ':' || coalesce(uses::text, 'null')
     from public.catalogue_items_view(current_setting('t.p1')::uuid)),
  '1350.00:null:null:null:null', 'Οι Πωλήσεις βλέπουν τιμή, όχι ώρες, κόστος ή χρήσεις'
);
select is((select jsonb_array_length(provisions) from public.catalogue_items_view(current_setting('t.p1')::uuid)), 2, 'Οι Πωλήσεις βλέπουν τις Παροχές');
select is(
  (select direct_cost_note from public.catalogue_items_view(current_setting('t.s1')::uuid)), null,
  'Ούτε η σημείωση του Άμεσου κόστους φτάνει στις Πωλήσεις'
);
select throws_ok($$ select * from public.catalogue_item_costs $$, '42501', null, 'Οι Πωλήσεις δεν διαβάζουν τον πίνακα κόστους');
select throws_ok($$ select * from public.catalogue_item_amounts $$, '42501', null, 'Οι Πωλήσεις δεν διαβάζουν τον πίνακα τιμών');
select throws_ok($$ select * from public.catalogue_items $$, '42501', null, 'Οι Πωλήσεις δεν διαβάζουν τον πίνακα του Καταλόγου');
select throws_ok(
  $$ update public.catalogue_item_amounts set price = 1 $$,
  '42501', null, 'Οι Πωλήσεις δεν γράφουν τιμές απευθείας'
);
select throws_ok(
  $$ select public.catalogue_create_item('service', null, 'Hack', '', 'ανά τίποτα', 1, '[]'::jsonb) $$,
  '42501', null, 'Οι Πωλήσεις δεν φτιάχνουν στοιχεία'
);
select throws_ok(
  format($$ select public.catalogue_update_item(%L, 'Hack', '', '', 1) $$, current_setting('t.p1')),
  '42501', null, 'Οι Πωλήσεις δεν αλλάζουν στοιχεία'
);
select throws_ok(
  format($$ select public.catalogue_set_provisions(%L, public.t_prov(array['reel'], array[1])) $$, current_setting('t.p1')),
  '42501', null, 'Οι Πωλήσεις δεν αλλάζουν Παροχές'
);
select throws_ok(
  format($$ select public.catalogue_set_cost(%L, null, null, 1, '') $$, current_setting('t.p1')),
  '42501', null, 'Οι Πωλήσεις δεν αλλάζουν κόστος'
);
select set_config('t.p1_stamp', (select updated_at::text || ':' || coalesce(updated_by_name, '-')
                                    from public.catalogue_items_view(current_setting('t.p1')::uuid)), true);
select throws_ok(
  format($$ select public.catalogue_set_cost(%L) $$, current_setting('t.p1')),
  '42501', null, 'Οι Πωλήσεις χωρίς κανένα πεδίο που δικαιούνται να γράψουν παίρνουν άρνηση'
);
select is(
  (select updated_at::text || ':' || coalesce(updated_by_name, '-') from public.catalogue_items_view(current_setting('t.p1')::uuid)),
  current_setting('t.p1_stamp'), 'Το «τελευταία αλλαγή» δεν άλλαξε'
);
select throws_ok(
  format($$ select public.catalogue_set_public(%L, true, true, '', 'x', '') $$, current_setting('t.p1')),
  '42501', null, 'Οι Πωλήσεις δεν κάνουν Πακέτο δημόσιο'
);
select throws_ok(
  format($$ select public.catalogue_retire_item(%L) $$, current_setting('t.p1')),
  '42501', null, 'Οι Πωλήσεις δεν αρχειοθετούν'
);
select is((select count(*)::int from public.cost_hint()), 0, 'Οι Πωλήσεις δεν παίρνουν Κόστος ώρας και πολλαπλασιαστές');
select is((select count(*)::int from public.cost_months_view()), 0, 'Οι Πωλήσεις δεν βλέπουν μήνες κόστους');
select throws_ok($$ select * from public.cost_months $$, '42501', null, 'Οι Πωλήσεις δεν διαβάζουν τον πίνακα κόστους ώρας');
select is((select count(*)::int from public.provision_kinds), 5, 'Η ομάδα βλέπει τα είδη Παροχής');
select throws_ok(
  $$ insert into public.provision_kinds (label, label_en, unit, unit_en, sort) values ('Hack', 'Hack', 'hack', 'hack', 1) $$,
  '42501', null, 'Οι Πωλήσεις δεν προσθέτουν είδος Παροχής'
);
select is((select count(*)::int from public.catalogue_kind_usage()), 0, 'Οι Πωλήσεις δεν βλέπουν χρήσεις ειδών Παροχής');

-- ───────────── Παραγωγή και Λογιστής: δεν βλέπουν τον Κατάλογο ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}', true);
select is((select count(*)::int from public.catalogue_items_view()), 0, 'Η Παραγωγή δεν βλέπει τον Κατάλογο');
select throws_ok(
  $$ select public.catalogue_create_item('service', null, 'Hack', '', 'ανά τίποτα', 1, '[]'::jsonb) $$,
  '42501', null, 'Η Παραγωγή δεν φτιάχνει στοιχεία'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d5","role":"authenticated"}', true);
select is((select count(*)::int from public.catalogue_items_view(current_setting('t.p1')::uuid)), 0, 'Ο Λογιστής δεν βλέπει τον Κατάλογο');
select is((select count(*)::int from public.cost_hint()), 0, 'Ο Λογιστής δεν βλέπει το Κόστος ώρας');

-- ───────────── «Κατάλογος μόνο»: διαχειρίζεται, αλλά δεν βλέπει ποσά ούτε κόστος ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d6","role":"authenticated"}', true);
select is(
  (select coalesce(price::text, 'null') || ':' || coalesce(hours_shoot::text, 'null') || ':' || coalesce(direct_cost::text, 'null')
          || ':' || uses::text
     from public.catalogue_items_view(current_setting('t.p1')::uuid)),
  'null:null:null:0', 'Όποιος διαχειρίζεται τον Κατάλογο χωρίς «Βλέπει ποσά» δεν παίρνει τιμή ή κόστος'
);
select lives_ok(
  format($$ select public.catalogue_update_item(%L, 'Μηνιαία Παρουσία', 'Νέα εσωτερική περιγραφή.', '', null) $$, current_setting('t.p1')),
  'Αλλάζει περιγραφή χωρίς τιμή'
);
select throws_ok(
  format($$ select public.catalogue_update_item(%L, 'Μηνιαία Παρουσία', 'x', '', 1) $$, current_setting('t.p1')),
  '42501', null, 'Δεν γράφει τιμή που δεν βλέπει'
);
select throws_ok(
  $$ select public.catalogue_create_item('service', null, 'Με τιμή', '', 'ανά ώρα', 10, '[]'::jsonb) $$,
  '42501', null, 'Δεν φτιάχνει στοιχείο με τιμή που δεν βλέπει'
);
select throws_ok(
  format($$ select public.catalogue_set_cost(%L, null, null, 5, '') $$, current_setting('t.p1')),
  '42501', null, 'Δεν γράφει Άμεσο κόστος που δεν βλέπει'
);
select set_config('t.s_unpriced', public.catalogue_create_item('service', null, 'Συνεδρία σκέψης', '', 'ανά ώρα', null, '[]'::jsonb)::text, true);
select is(
  (select count(*)::int from public.catalogue_items_view(current_setting('t.s_unpriced')::uuid)), 1,
  'Φτιάχνει στοιχείο χωρίς τιμή'
);

-- ───────────── Χωρίς τιμή δεν είναι έτοιμος ο Κατάλογος ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
select is((select done from public.readiness() where item = 'catalogue'), false, 'Ενεργό στοιχείο με τιμή 0 κρατά το «εκκρεμεί»');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select is(
  (select price from public.catalogue_items_view(current_setting('t.s_unpriced')::uuid)), 0.00::numeric,
  'Το στοιχείο χωρίς τιμή ξεκινά με 0'
);
select lives_ok(
  format($$ select public.catalogue_update_item(%L, 'Συνεδρία σκέψης', '', 'ανά ώρα', 80) $$, current_setting('t.s_unpriced')),
  'Ο Ιδιοκτήτης βάζει την τιμή'
);
select is((select done from public.readiness() where item = 'catalogue'), true, 'Με τιμή σε όλα, ο Κατάλογος είναι έτοιμος');

-- ───────────── «Κόστος»: διαχειρίζεται ώρες, όχι τον Κατάλογο ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d8","role":"authenticated"}', true);
select is(
  (select hours_shoot::text || '/' || hours_edit::text || ':' || coalesce(price::text, 'null') from public.catalogue_items_view(current_setting('t.p1')::uuid)),
  '6.0/16.0:null', 'Βλέπει ώρες, όχι τιμή'
);
select lives_ok(
  format($$ select public.catalogue_set_cost(%L, 6, 14) $$, current_setting('t.p1')),
  'Όποιος «Διαχειρίζεται κόστος» αλλάζει ώρες χωρίς να διαχειρίζεται τον Κατάλογο'
);
select throws_ok(
  format($$ select public.catalogue_update_item(%L, 'Μηνιαία Παρουσία', '', '', null) $$, current_setting('t.p1')),
  '42501', null, 'Δεν αλλάζει το στοιχείο του Καταλόγου'
);
select throws_ok(
  format($$ select public.catalogue_set_cost(%L, null, null, 9, '') $$, current_setting('t.p1')),
  '42501', null, 'Το Άμεσο κόστος θέλει και «Διαχειρίζεται Κατάλογο»'
);

-- ───────────── Δημόσιο ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select throws_ok(
  format($$ select public.catalogue_set_public(%L, true, true, '', 'Περιγραφή', '') $$, current_setting('t.s1')),
  'P0001', 'Μόνο τα Πακέτα γίνονται δημόσια', 'Η Υπηρεσία δεν γίνεται δημόσια'
);
select throws_ok(
  format($$ select public.catalogue_set_public(%L, true, true, 'Monthly Presence', '  ', '') $$, current_setting('t.p1')),
  'P0001', 'Ένα δημόσιο Πακέτο θέλει σύντομη περιγραφή στα ελληνικά', 'Δημόσιο Πακέτο θέλει ελληνική περιγραφή'
);
select lives_ok(
  format($$ select public.catalogue_set_public(%L, true, true, 'Monthly Presence', 'Δύο Γυρίσματα και οκτώ reels κάθε μήνα.', '') $$, current_setting('t.p1')),
  'Δημόσιο Πακέτο, με ένδειξη τιμής, χωρίς αγγλική περιγραφή'
);
select is(
  (select is_public::text || ':' || shows_price::text || ':' || name_en || ':[' || description_public_en || ']'
     from public.catalogue_items_view(current_setting('t.p1')::uuid)),
  'true:true:Monthly Presence:[]', 'Η σήμανση «δημόσιο» αποθηκεύτηκε'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}', true);
select is(
  (select is_public::text || ':' || description_public from public.catalogue_items_view(current_setting('t.p1')::uuid)),
  'true:Δύο Γυρίσματα και οκτώ reels κάθε μήνα.', 'Οι Πωλήσεις βλέπουν τι είναι δημόσιο'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);

-- ───────────── Αρχειοθέτηση, επαναφορά ─────────────
select lives_ok(
  format($$ select public.catalogue_set_public(%L, true, false, '', 'Εκδήλωση με βίντεο και φωτογραφίες.', '') $$, current_setting('t.p2')),
  'Το εφάπαξ Πακέτο γίνεται δημόσιο'
);
select lives_ok(format($$ select public.catalogue_retire_item(%L) $$, current_setting('t.p2')), 'Αρχειοθέτηση Πακέτου');
select is(
  (select is_retired::text || ':' || is_public::text from public.catalogue_items_view(current_setting('t.p2')::uuid)),
  'true:false', 'Το αρχειοθετημένο Πακέτο φεύγει από την Ιστοσελίδα'
);
select is((select count(*)::int from public.catalogue_items_view()), 4, 'Η λίστα δεν δείχνει αρχειοθετημένα');
select is((select count(*)::int from public.catalogue_items_view(null, true)), 5, 'Ο Διαχειριστής Καταλόγου τα ζητά και τα βλέπει');
select is(
  (select jsonb_array_length(provisions) from public.catalogue_items_view(current_setting('t.p2')::uuid)), 2,
  'Το αρχειοθετημένο κρατά τις Παροχές του'
);
select throws_ok(
  format($$ select public.catalogue_retire_item(%L) $$, current_setting('t.p2')),
  'P0001', null, 'Δεν αρχειοθετείται δεύτερη φορά'
);
select throws_ok(
  format($$ select public.catalogue_set_public(%L, true, true, '', 'Περιγραφή', '') $$, current_setting('t.p2')),
  'P0001', 'Ένα αρχειοθετημένο Πακέτο δεν γίνεται δημόσιο', 'Το αρχειοθετημένο δεν γίνεται δημόσιο'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}', true);
select is((select count(*)::int from public.catalogue_items_view(current_setting('t.p2')::uuid)), 0, 'Οι Πωλήσεις δεν βλέπουν αρχειοθετημένα, ούτε με το id');
select is((select count(*)::int from public.catalogue_items_view(null, true)), 4, 'Οι Πωλήσεις δεν παίρνουν αρχειοθετημένα ούτε αν τα ζητήσουν');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);

-- Το όνομα ενός αρχειοθετημένου ελευθερώνεται· η επαναφορά κρατά τη μοναδικότητα των ενεργών.
select set_config('t.p4', public.catalogue_create_item(
  'package', 'one_off', 'Εκδήλωση', '', '', 450, public.t_prov(array['video'], array[1]))::text, true);
select throws_ok(
  format($$ select public.catalogue_restore_item(%L) $$, current_setting('t.p2')),
  '23505', null, 'Επαναφορά με όνομα που πήρε άλλο ενεργό στοιχείο'
);
select lives_ok(
  format($$ select public.catalogue_update_item(%L, 'Εκδήλωση Premium', '', '', null) $$, current_setting('t.p4')),
  'Μετονομασία του νέου στοιχείου'
);
select lives_ok(format($$ select public.catalogue_restore_item(%L) $$, current_setting('t.p2')), 'Επαναφορά αρχειοθετημένου');
select is(
  (select is_retired::text || ':' || is_public::text from public.catalogue_items_view(current_setting('t.p2')::uuid)),
  'false:false', 'Η επαναφορά δεν το κάνει αυτόματα δημόσιο'
);
select throws_ok(
  format($$ select public.catalogue_restore_item(%L) $$, current_setting('t.p2')),
  'P0001', null, 'Δεν γίνεται επαναφορά σε ενεργό στοιχείο'
);

-- ───────────── Είδη Παροχής: λίστα Ρυθμίσεων ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.provision_kinds (code, label, label_en, unit, unit_en, sort)
     values ('hack', 'Live streaming', 'Live stream', 'μεταδόσεις', 'streams', 60) $$,
  'Η Διαχείριση προσθέτει είδος Παροχής'
);
select is(
  (select code from public.provision_kinds where label = 'Live streaming'), null,
  'Το αναγνωριστικό «του συστήματος» δεν το ορίζει η εφαρμογή'
);
select throws_ok(
  $$ insert into public.provision_kinds (label, label_en, unit, unit_en, sort) values ('live STREAMING', 'x', 'x', 'x', 70) $$,
  '23505', null, 'Ενεργή ετικέτα μοναδική, χωρίς διάκριση πεζών'
);
select throws_ok(
  $$ insert into public.provision_kinds (label, label_en, unit, unit_en, sort) values ('Χωρίς αγγλικά', '', 'x', 'x', 70) $$,
  '23514', null, 'Τα αγγλικά είναι υποχρεωτικά'
);
select throws_ok(
  $$ insert into public.provision_kinds (label, label_en, unit, unit_en, default_hours, sort) values ('Διάρκεια', 'Duration', 'x', 'x', 2, 70) $$,
  '23514', null, 'Προεπιλεγμένη διάρκεια χωρίς Τρόπο μέτρησης δεν γίνεται'
);
select lives_ok(
  $$ delete from public.provision_kinds where label = 'Live streaming' $$,
  'Είδος Παροχής που δεν χρησιμοποιήθηκε ποτέ διαγράφεται'
);
select throws_ok(
  $$ delete from public.provision_kinds where code = 'reel' $$,
  'P0001', null, 'Είδος Παροχής σε χρήση δεν διαγράφεται'
);
select lives_ok(
  $$ update public.provision_kinds set label = 'Reel βίντεο', label_en = 'Reel video' where code = 'reel' $$,
  'Η μετονομασία περνά (τα στοιχεία δείχνουν το id)'
);
select is(
  (select count(*)::int
     from public.catalogue_items_view() v
     cross join lateral jsonb_array_elements(v.provisions) e
     join public.provision_kinds k on k.id = (e ->> 'kind_id')::uuid
    where k.label = 'Reel βίντεο'),
  2, 'Η νέα ετικέτα φαίνεται σε όλα τα στοιχεία που το έχουν'
);
select is(
  (select uses from public.catalogue_kind_usage() where kind_id = (select id from public.provision_kinds where code = 'reel')),
  2::bigint, 'Χρήσεις του είδους Παροχής: 2 στοιχεία'
);
select is(
  (select uses from public.catalogue_kind_usage() where kind_id = (select id from public.provision_kinds where code = 'shoot')),
  1::bigint, 'Χρήσεις του Γυρίσματος: 1 στοιχείο'
);

-- Σειρά.
select lives_ok(
  format($$ select public.catalogue_move_kind(%L, 'down') $$, (select id from public.provision_kinds where code = 'shoot')),
  'Η Διαχείριση μετακινεί είδος Παροχής'
);
select is(
  (select string_agg(code, ',' order by sort) from (select code, sort from public.provision_kinds where retired_at is null order by sort limit 2) s),
  'reel,shoot', 'Το Γύρισμα κατέβηκε μια θέση'
);
select throws_ok(
  $$ select public.catalogue_move_kind(gen_random_uuid(), 'sideways') $$,
  'P0001', null, 'Άγνωστη κατεύθυνση'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}', true);
select throws_ok(
  format($$ select public.catalogue_move_kind(%L, 'up') $$, (select id from public.provision_kinds where code = 'shoot')),
  '42501', null, 'Οι Πωλήσεις δεν αλλάζουν τη σειρά'
);
select lives_ok(
  $$ update public.provision_kinds set label = 'Hack' where code = 'video' $$,
  'Η εγγραφή των Πωλήσεων σε είδος Παροχής δεν βρίσκει γραμμή να αλλάξει'
);
select is((select label from public.provision_kinds where code = 'video'), 'βίντεο', 'Οι Πωλήσεις δεν μετονομάζουν είδος Παροχής');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);

-- Απόσυρση: φεύγει από τις νέες επιλογές, μένει στα παλιά στοιχεία.
select lives_ok(
  $$ update public.provision_kinds set retired_at = now() where code = 'photo' $$,
  'Απόσυρση είδους Παροχής που χρησιμοποιείται'
);
select throws_ok(
  format($$ select public.catalogue_set_provisions(%L, public.t_prov(array['reel', 'photo'], array[1, 1])) $$, current_setting('t.p1')),
  'P0001', null, 'Το αποσυρμένο είδος δεν μπαίνει σε νέο στοιχείο'
);
select lives_ok(
  format($$ select public.catalogue_set_provisions(%L, public.t_prov(array['video', 'photo'], array[2, 25])) $$, current_setting('t.p2')),
  'Στοιχείο που ήδη το έχει μπορεί να το κρατήσει και να αλλάξει ποσότητα'
);
select throws_ok(
  format($$ select public.catalogue_create_item('service', null, 'Φωτογραφία έξτρα', '', 'ανά φωτογραφία', 5, public.t_prov(array['photo'], array[1])) $$),
  'P0001', null, 'Νέο στοιχείο δεν παίρνει αποσυρμένο είδος Παροχής'
);
select throws_ok(
  $$ update public.provision_kinds set retired_at = now() where retired_at is null $$,
  'P0001', 'Χρειάζεται τουλάχιστον ένα ενεργό είδος Παροχής', 'Η λίστα δεν μένει χωρίς ενεργό είδος Παροχής'
);
select lives_ok(
  $$ update public.provision_kinds set retired_at = null where code = 'photo' $$,
  'Επανενεργοποίηση είδους Παροχής'
);

-- ───────────── Κόστος ώρας ανά μήνα ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select is(
  (select coalesce(hour_cost::text, 'null') || ':' || multiplier_min::text || '/' || multiplier_target::text || '/' || multiplier_max::text
     from public.cost_hint()),
  'null:1.30/1.60/2.00', 'Χωρίς μήνα, το Κόστος ώρας λείπει· οι πολλαπλασιαστές υπάρχουν'
);

-- Ιστορικός μήνας, από migration/service (auth.uid() null): ισχύει και στους επόμενους μήνες.
reset role;
select set_config('request.jwt.claims', '', true);
insert into public.cost_months (month, expenses_total, productive_hours) values (current_setting('t.m_prev2')::date, 6600, 220);
select is((select done from authz.readiness_items() where item = 'costs'), true, 'Κόστος ώρας: έτοιμο όταν ισχύει κάποιος μήνας με έξοδα');
select throws_ok(
  $$ update public.cost_months set expenses_total = 7000 where month = current_setting('t.m_prev2')::date $$,
  'P0001', 'Ο μήνας έχει κλείσει· το Κόστος ώρας του δεν αλλάζει', 'Ο κλεισμένος μήνας δεν αλλάζει, ούτε για τον service role'
);
select throws_ok(
  $$ delete from public.cost_months where month = current_setting('t.m_prev2')::date $$,
  'P0001', null, 'Κανένας μήνας δεν σβήνεται'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select is(
  (select hour_cost_month::text || ':' || hour_cost::text from public.cost_hint()),
  current_setting('t.m_prev2') || ':30.00', 'Χωρίς τρέχοντα μήνα ισχύει ο πιο πρόσφατος προηγούμενος'
);

-- Ισχύει ο μήνας σε ισχύ: ένας παλιός μήνας με έξοδα δεν σώζει τρέχοντα μήνα με 0.
select lives_ok(
  $$ select public.cost_save_month(current_setting('t.m0')::date, 0, 220) $$,
  'Ο Ιδιοκτήτης ορίζει τον τρέχοντα μήνα με μηδενικά έξοδα'
);
select is(
  (select done from public.readiness() where item = 'costs'), false,
  'Κόστος ώρας: ο τρέχων μήνας με 0 έξοδα κρατά το «εκκρεμεί», παρότι ο παλιός μήνας έχει έξοδα'
);
select lives_ok(
  $$ select public.cost_save_month(current_setting('t.m0')::date + 14, 8800, 220) $$,
  'Ο Ιδιοκτήτης γράφει έξοδα και ώρες του τρέχοντος μήνα (η ημέρα κανονικοποιείται)'
);
select is(
  (select done from public.readiness() where item = 'costs'), true,
  'Κόστος ώρας: έτοιμο όταν ο μήνας σε ισχύ έχει έξοδα'
);
select is(
  (select month::text || ':' || hour_cost::text || ':' || is_closed::text from public.cost_months_view() where month = current_setting('t.m0')::date),
  current_setting('t.m0') || ':40.00:false', 'Κόστος ώρας = έξοδα ÷ παραγωγικές ώρες'
);
select is(
  (select hour_cost_month::text || ':' || hour_cost::text from public.cost_hint()),
  current_setting('t.m0') || ':40.00', 'Ισχύει το Κόστος ώρας του τρέχοντος μήνα'
);
select is(
  (select is_closed::text from public.cost_months_view() where month = current_setting('t.m_prev2')::date),
  'true', 'Ο προηγούμενος μήνας φαίνεται κλεισμένος'
);
select lives_ok(
  $$ select public.cost_save_month(current_setting('t.m_next')::date, 9900, 220) $$,
  'Ο επόμενος μήνας ορίζεται από τώρα'
);
select is(
  (select hour_cost_month::text from public.cost_hint()), current_setting('t.m0'),
  'Ο μελλοντικός μήνας δεν ισχύει πριν έρθει'
);
select lives_ok(
  $$ select public.cost_save_month(current_setting('t.m0')::date, 9000, 220) $$,
  'Ο τρέχων μήνας αλλάζει όσο δεν έχει κλείσει'
);
select is((select hour_cost from public.cost_hint()), 40.91::numeric, 'Στρογγυλοποίηση στο λεπτό: 9000 ÷ 220');
select lives_ok($$ select public.cost_save_month(current_setting('t.m0')::date, 8800, 220) $$, 'Επιστροφή στα 8800');
select set_config('t.audit_months', (select count(*)::text from public.audit_log where entity = 'cost_months'), true);
select lives_ok($$ select public.cost_save_month(current_setting('t.m0')::date, 8800, 220) $$, 'Αποθήκευση μήνα χωρίς καμία αλλαγή');
select is(
  (select count(*)::text from public.audit_log where entity = 'cost_months'),
  current_setting('t.audit_months'), 'Αποθήκευση μήνα χωρίς αλλαγή δεν γράφει στο Ίχνος'
);
select throws_ok(
  $$ select public.cost_save_month(current_setting('t.m_prev')::date, 8800, 220) $$,
  'P0001', 'Ο μήνας έχει κλείσει· το Κόστος ώρας του δεν αλλάζει', 'Ο Ιδιοκτήτης δεν αλλάζει μήνα που πέρασε'
);
select throws_ok(
  $$ select public.cost_save_month(current_setting('t.m0')::date, 8800, 0) $$,
  'P0001', null, 'Μηδενικές παραγωγικές ώρες δεν γίνονται'
);
select throws_ok(
  $$ select public.cost_save_month(current_setting('t.m0')::date, -1, 220) $$,
  'P0001', null, 'Αρνητικά έξοδα δεν γίνονται'
);
select is((select count(*)::int from public.cost_months_view()), 3, 'Τρεις μήνες: ιστορικός, τρέχων, επόμενος');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
select is((select count(*)::int from public.cost_months_view()), 3, 'Η Διαχείριση βλέπει τους μήνες κόστους');
select is((select hour_cost from public.cost_hint()), 40.00::numeric, 'Η Διαχείριση βλέπει το Κόστος ώρας');

-- ───────────── Εύρος τιμής ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select lives_ok($$ select public.cost_save_multipliers(1.2, 1.5, 2.2) $$, 'Ο Ιδιοκτήτης αλλάζει τους πολλαπλασιαστές');
select is(
  (select multiplier_min::text || '/' || multiplier_target::text || '/' || multiplier_max::text from public.cost_hint()),
  '1.20/1.50/2.20', 'Οι νέοι πολλαπλασιαστές'
);
select throws_ok($$ select public.cost_save_multipliers(1.5, 1.2, 2.2) $$, 'P0001', null, 'Ο στόχος δεν είναι κάτω από την ελάχιστη');
select throws_ok($$ select public.cost_save_multipliers(0.9, 1.5, 2.2) $$, 'P0001', null, 'Ο ελάχιστος πολλαπλασιαστής ξεκινά από 1');
select throws_ok($$ select public.cost_save_multipliers(1.2, 1.5, null) $$, 'P0001', null, 'Και οι τρεις πολλαπλασιαστές είναι υποχρεωτικοί');
select lives_ok($$ select public.cost_save_multipliers(1.3, 1.6, 2.0) $$, 'Επιστροφή στα 1,3 / 1,6 / 2,0');
select set_config('t.audit_mult', (select count(*)::text from public.audit_log where entity = 'cost_settings'), true);
select lives_ok($$ select public.cost_save_multipliers(1.3, 1.6, 2.0) $$, 'Αποθήκευση πολλαπλασιαστών χωρίς καμία αλλαγή');
select is(
  (select count(*)::text from public.audit_log where entity = 'cost_settings'),
  current_setting('t.audit_mult'), 'Αποθήκευση πολλαπλασιαστών χωρίς αλλαγή δεν γράφει στο Ίχνος'
);

-- Η ίδια απόρριψη ισχύει και για τον service role.
reset role;
select set_config('request.jwt.claims', '', true);
select throws_ok(
  $$ update public.cost_settings set multiplier_min = 3 $$,
  '23514', null, 'Η βάση απορρίπτει πολλαπλασιαστές εκτός σειράς, ακόμα και από service role'
);

-- ───────────── Κανόνες που ισχύουν για όλους ─────────────
select throws_ok(
  format($$ delete from public.catalogue_items where id = %L $$, current_setting('t.p4')),
  'P0001', 'Ο Κατάλογος δεν διαγράφει Πακέτα και Υπηρεσίες· τα αρχειοθετεί', 'Πακέτο ή Υπηρεσία δεν διαγράφεται ποτέ'
);
select throws_ok(
  format($$ update public.catalogue_items set kind = 'service', billing = null, unit = 'ανά τίποτα' where id = %L $$, current_setting('t.p4')),
  'P0001', null, 'Το είδος δεν αλλάζει μετά τη δημιουργία'
);
select throws_ok(
  format($$ update public.catalogue_items set billing = 'monthly' where id = %L $$, current_setting('t.p4')),
  'P0001', null, 'Μηνιαίο/εφάπαξ δεν αλλάζει μετά τη δημιουργία'
);
select throws_ok(
  format($$ update public.catalogue_items set is_public = true, description_public = 'x' where id = %L $$, current_setting('t.s1')),
  '23514', null, 'Υπηρεσία δεν γίνεται δημόσια ούτε με απευθείας εγγραφή'
);
select throws_ok(
  format($$ update public.catalogue_items set is_public = true where id = %L $$, current_setting('t.p4')),
  '23514', null, 'Δημόσιο Πακέτο χωρίς περιγραφή δεν γίνεται ούτε με απευθείας εγγραφή'
);

-- ───────────── Ίχνος ενεργειών: ποσά και κόστος μόνο σε όποιον τα βλέπει ─────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select ok(
  (select count(*) > 0 from public.audit_log where entity in ('cost_months', 'catalogue_item_costs', 'cost_settings', 'catalogue_item_amounts')),
  'Ο Ιδιοκτήτης βλέπει στο Ίχνος τα ποσά και το κόστος'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
select ok(
  (select count(*) > 0 from public.audit_log where entity in ('cost_months', 'catalogue_item_costs', 'cost_settings', 'catalogue_item_amounts')),
  'Η Διαχείριση (Ίχνος + ποσά + κόστος) τα βλέπει'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d7","role":"authenticated"}', true);
select ok(
  (select count(*) > 0 from public.audit_log where entity in ('catalogue_items', 'catalogue_item_provisions', 'provision_kinds')),
  'Όποιος βλέπει το Ίχνος βλέπει τις αλλαγές του Καταλόγου και των ειδών Παροχής'
);
select is(
  (select count(*)::int from public.audit_log
    where entity in ('cost_months', 'catalogue_item_costs', 'cost_settings', 'catalogue_item_amounts')),
  0, 'Χωρίς «Βλέπει ποσά» και «Βλέπει κόστος» το Ίχνος δεν δείχνει τιμές, ώρες και Κόστος ώρας'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}', true);
select is((select count(*)::int from public.audit_log), 0, 'Οι Πωλήσεις δεν βλέπουν το Ίχνος');

-- ───────────── Εσωτερικά και ανώνυμοι ─────────────
select throws_ok(
  format($$ select public.catalogue_item_uses(%L) $$, current_setting('t.p1')),
  '42501', null, 'Οι εσωτερικές συναρτήσεις δεν καλούνται από την εφαρμογή (χρήσεις στοιχείου)'
);
select throws_ok(
  format($$ select public.provision_kind_uses(%L) $$, (select id from public.provision_kinds where code = 'reel')),
  '42501', null, 'Οι εσωτερικές συναρτήσεις δεν καλούνται από την εφαρμογή (χρήσεις είδους)'
);
select throws_ok($$ select authz.athens_month_start() $$, '42501', null, 'Ούτε οι βοηθητικές του authz');
select throws_ok(
  format($$ select authz.apply_provisions(%L, '[]'::jsonb) $$, current_setting('t.s1')),
  '42501', null, 'Ούτε η εφαρμογή Παροχών απευθείας'
);

set local role anon;
select throws_ok($$ select * from public.catalogue_items_view() $$, '42501', null, 'Ο ανώνυμος δεν διαβάζει τον Κατάλογο');
select throws_ok($$ select * from public.cost_hint() $$, '42501', null, 'Ο ανώνυμος δεν διαβάζει το κόστος');
select throws_ok($$ select * from public.provision_kinds $$, '42501', null, 'Ο ανώνυμος δεν διαβάζει τα είδη Παροχής');

select * from finish();
rollback;
