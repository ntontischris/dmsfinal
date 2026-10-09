-- Εξοπλισμός: μητρώο, Κατηγορίες, Πρότυπα, κανόνες διαγραφής και Ίχνος (κεφ. 3, ADR 0007). Φανταστικοί Χρήστες και στοιχεία.
begin;
select plan(62);

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης · e2 Παραγωγή · e3 Πωλήσεις · e4 «Ελεγκτής» (audit.view μόνο)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'auditor@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'Κώστας', 'auditor@example.com');

insert into public.roles (name, kind) values ('Ελεγκτής', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'audit.view', 'all' from public.roles r where r.name = 'Ελεγκτής' and r.kind = 'team';

insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e2', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000e3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000e4', 'Ελεγκτής')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Αναγνωριστικά των αρχικών Κατηγοριών, διαβασμένα πριν από τον περιορισμό ρόλου.
select set_config('t.cat_cam', (select c.id::text from public.equipment_categories c where c.name = 'Κάμερες'), true);
select set_config('t.cat_lens', (select c.id::text from public.equipment_categories c where c.name = 'Φακοί'), true);
select set_config('t.cat_sound', (select c.id::text from public.equipment_categories c where c.name = 'Ήχος'), true);
select set_config('t.cat_drone', (select c.id::text from public.equipment_categories c where c.name = 'Drone'), true);

-- ───────────── Δομή και αρχικές τιμές ─────────────
select is((select count(*)::int from public.equipment_categories), 6, 'Έξι αρχικές Κατηγορίες');
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname in ('equipment_categories', 'equipment_items', 'equipment_templates', 'equipment_template_items')),
  4, 'RLS ενεργό σε όλους τους πίνακες του Εξοπλισμού'
);
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename like 'equipment%'), 0, 'Κανένα policy: οι πίνακες είναι κλειστοί');
select is(authz.equipment_item_reserved(gen_random_uuid()), false, 'Χωρίς Γυρίσματα κανένα αντικείμενο δεν είναι δεσμευμένο');
select is(
  (select string_agg(c.name, ',' order by c.sort_order) from public.equipment_categories c),
  'Κάμερες,Φακοί,Φωτισμός,Ήχος,Στήριξη και σταθεροποίηση,Drone', 'Οι αρχικές Κατηγορίες με τη σειρά τους'
);

-- ───────────── Ανώνυμος και Πωλήσεις ─────────────
set local role anon;
select throws_ok($$ select * from public.equipment_items_view() $$, '42501', null, 'Ο ανώνυμος δεν διαβάζει το μητρώο');
select throws_ok($$ select * from public.equipment_categories_view() $$, '42501', null, 'Ο ανώνυμος δεν διαβάζει τις Κατηγορίες');
select throws_ok($$ select * from public.equipment_templates_view() $$, '42501', null, 'Ο ανώνυμος δεν διαβάζει τα Πρότυπα');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok($$ select * from public.equipment_items_view() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν το μητρώο');
select throws_ok($$ select * from public.equipment_categories_view() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν τις Κατηγορίες');
select throws_ok($$ select * from public.equipment_templates_view() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν τα Πρότυπα');

-- ───────────── Ιδιοκτήτης: Κατηγορίες ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select set_config('t.cat_tmp', public.equipment_category_create('Δοκιμή')::text, true);
select is((select count(*)::int from public.equipment_categories_view() v where v.name = 'Δοκιμή'), 1, 'Ο Ιδιοκτήτης φτιάχνει Κατηγορία');
select throws_ok(
  $$ select public.equipment_category_create('δοκιμή') $$, 'P0001', 'Υπάρχει ήδη Κατηγορία με αυτό το όνομα',
  'Το όνομα Κατηγορίας δεν διακρίνει πεζά και κεφαλαία'
);
select lives_ok($$ select public.equipment_category_rename(current_setting('t.cat_tmp')::uuid, 'Δοκιμαστική') $$, 'Ο Ιδιοκτήτης μετονομάζει Κατηγορία');
select lives_ok($$ select public.equipment_category_retire(current_setting('t.cat_tmp')::uuid) $$, 'Ο Ιδιοκτήτης αποσύρει Κατηγορία');
select is(
  (select v.is_retired from public.equipment_categories_view(true) v where v.id = current_setting('t.cat_tmp')::uuid),
  true, 'Η αποσυρμένη Κατηγορία φαίνεται με σήμα'
);
select throws_ok(
  $$ select public.equipment_item_create(current_setting('t.cat_tmp')::uuid, 'Δοκιμαστικό', null, null) $$, 'P0001',
  'Η Κατηγορία έχει αποσυρθεί, δεν δέχεται νέα αντικείμενα', 'Σε αποσυρμένη Κατηγορία δεν μπαίνουν νέα αντικείμενα'
);
select lives_ok($$ select public.equipment_category_restore(current_setting('t.cat_tmp')::uuid) $$, 'Ο Ιδιοκτήτης επαναφέρει Κατηγορία');
select lives_ok($$ select public.equipment_category_delete(current_setting('t.cat_tmp')::uuid) $$, 'Ο Ιδιοκτήτης διαγράφει Κατηγορία χωρίς αντικείμενα');
select is((select count(*)::int from public.equipment_categories_view(true)), 6, 'Μετά τη διαγραφή μένουν οι έξι αρχικές');

-- ───────────── Ιδιοκτήτης: Αντικείμενα ─────────────
select set_config('t.item1', public.equipment_item_create(current_setting('t.cat_cam')::uuid, 'Sony FX3', 'SN-1', 'Κύρια κάμερα')::text, true);
select set_config('t.item2', public.equipment_item_create(current_setting('t.cat_lens')::uuid, 'Canon 24-70', null, null)::text, true);
select set_config('t.item3', public.equipment_item_create(current_setting('t.cat_sound')::uuid, 'Rode Wireless', null, null)::text, true);
select throws_ok(
  $$ select public.equipment_item_create(current_setting('t.cat_cam')::uuid, 'sony fx3', null, null) $$, 'P0001',
  'Υπάρχει ήδη αντικείμενο με αυτό το όνομα', 'Το όνομα αντικειμένου δεν διακρίνει πεζά και κεφαλαία'
);
select throws_ok(
  $$ select public.equipment_item_create(current_setting('t.cat_cam')::uuid, '   ', null, null) $$, 'P0001',
  'Το αντικείμενο θέλει όνομα', 'Το αντικείμενο χωρίς όνομα απορρίπτεται'
);
select is((select count(*)::int from public.equipment_items_view(true)), 3, 'Το μητρώο έχει τρία αντικείμενα');
select throws_ok(
  $$ select public.equipment_item_set_status(current_setting('t.item1')::uuid, 'in_repair', '   ') $$, 'P0001',
  'Η επισκευή θέλει λόγο: τι έπαθε και πότε επιστρέφει', 'Η επισκευή δεν γίνεται χωρίς λόγο'
);
select lives_ok(
  $$ select public.equipment_item_set_status(current_setting('t.item1')::uuid, 'in_repair', 'Σπασμένη οθόνη, επιστρέφει Δευτέρα') $$,
  'Ο Ιδιοκτήτης βάζει αντικείμενο σε επισκευή με λόγο'
);
select is(
  (select v.status from public.equipment_items_view(true) v where v.id = current_setting('t.item1')::uuid),
  'in_repair', 'Το αντικείμενο φαίνεται σε επισκευή'
);
select throws_ok(
  $$ select public.equipment_item_set_status(current_setting('t.item1')::uuid, 'bogus', null) $$, 'P0001',
  'Άγνωστη Κατάσταση', 'Άγνωστη Κατάσταση απορρίπτεται'
);
select lives_ok(
  $$ select public.equipment_item_set_status(current_setting('t.item1')::uuid, 'available', null) $$,
  'Ο Ιδιοκτήτης επαναφέρει αντικείμενο σε διαθέσιμο'
);
select is(
  (select v.status_note from public.equipment_items_view(true) v where v.id = current_setting('t.item1')::uuid),
  null, 'Η επαναφορά σε διαθέσιμο καθαρίζει τον λόγο'
);
select lives_ok(
  $$ select public.equipment_item_update(current_setting('t.item2')::uuid, current_setting('t.cat_lens')::uuid, 'Canon 24-70 f2.8', 'C-2', 'νέα σημείωση') $$,
  'Ο Ιδιοκτήτης αλλάζει στοιχεία αντικειμένου'
);
select is(
  (select v.name from public.equipment_items_view(true) v where v.id = current_setting('t.item2')::uuid),
  'Canon 24-70 f2.8', 'Το νέο όνομα φαίνεται στο μητρώο'
);
select lives_ok($$ select public.equipment_category_retire(current_setting('t.cat_drone')::uuid) $$, 'Αποσύρεται η Κατηγορία Drone');
select throws_ok(
  $$ select public.equipment_item_update(current_setting('t.item1')::uuid, current_setting('t.cat_drone')::uuid, 'Sony FX3', 'SN-1', 'Κύρια κάμερα') $$,
  'P0001', 'Η Κατηγορία έχει αποσυρθεί, δεν δέχεται νέα αντικείμενα', 'Αντικείμενο δεν μεταφέρεται σε αποσυρμένη Κατηγορία'
);
select lives_ok($$ select public.equipment_category_restore(current_setting('t.cat_drone')::uuid) $$, 'Επαναφορά της Κατηγορίας Drone');
select throws_ok(
  $$ select public.equipment_category_delete(current_setting('t.cat_cam')::uuid) $$, 'P0001',
  'Η Κατηγορία έχει αντικείμενα, αποσύρεται και δεν διαγράφεται', 'Κατηγορία με αντικείμενα δεν διαγράφεται'
);
select lives_ok($$ select public.equipment_item_delete(current_setting('t.item2')::uuid) $$, 'Αντικείμενο που δεν δεσμεύτηκε ποτέ διαγράφεται');
select is((select count(*)::int from public.equipment_items_view(true)), 2, 'Μετά τη διαγραφή μένουν δύο αντικείμενα');
select lives_ok(
  $$ select public.equipment_item_set_status(current_setting('t.item3')::uuid, 'retired', null) $$,
  'Ο Ιδιοκτήτης αποσύρει αντικείμενο'
);
select is((select count(*)::int from public.equipment_items_view()), 1, 'Το προεπιλεγμένο μητρώο κρύβει τα αποσυρμένα');

-- ───────────── Ιδιοκτήτης: Πρότυπα ─────────────
select set_config('t.tpl1', public.equipment_template_create(
  'Μικρό γύρισμα', 'σημείωση', array[current_setting('t.item1')::uuid, current_setting('t.item3')::uuid]
)::text, true);
select is((select count(*)::int from public.equipment_templates_view()), 1, 'Ο Ιδιοκτήτης φτιάχνει Πρότυπο');
select throws_ok(
  $$ select public.equipment_template_create('Χωρίς αντικείμενα', null, array[]::uuid[]) $$, 'P0001',
  'Ένα Πρότυπο θέλει τουλάχιστον ένα αντικείμενο', 'Πρότυπο χωρίς αντικείμενα απορρίπτεται'
);
select throws_ok(
  $$ select public.equipment_template_create('μικρό γύρισμα', null, array[current_setting('t.item1')::uuid]) $$, 'P0001',
  'Υπάρχει ήδη Πρότυπο με αυτό το όνομα', 'Το όνομα Προτύπου δεν διακρίνει πεζά και κεφαλαία'
);
select is(
  (select e ->> 'status' from public.equipment_templates_view() v, jsonb_array_elements(v.items) e
    where v.id = current_setting('t.tpl1')::uuid and e ->> 'id' = current_setting('t.item3')),
  'retired', 'Το Πρότυπο κρατά αποσυρμένο αντικείμενο με τη δική του κατάσταση'
);
select throws_ok(
  $$ select public.equipment_template_update(current_setting('t.tpl1')::uuid, 'Μικρό γύρισμα', null, array[]::uuid[]) $$, 'P0001',
  'Ένα Πρότυπο θέλει τουλάχιστον ένα αντικείμενο', 'Ενημέρωση Προτύπου δεν αφήνει κενή λίστα'
);
select lives_ok(
  $$ select public.equipment_template_update(current_setting('t.tpl1')::uuid, 'Μικρό γύρισμα', null, array[current_setting('t.item1')::uuid]) $$,
  'Ο Ιδιοκτήτης αλλάζει τα αντικείμενα Προτύπου'
);
select is(
  (select jsonb_array_length(v.items) from public.equipment_templates_view() v where v.id = current_setting('t.tpl1')::uuid),
  1, 'Η αλλαγή αφαιρεί το αντικείμενο που έφυγε από το Πρότυπο'
);
select set_config('t.tpl2', public.equipment_template_create('Προς διαγραφή', null, array[current_setting('t.item1')::uuid])::text, true);
select lives_ok($$ select public.equipment_template_delete(current_setting('t.tpl2')::uuid) $$, 'Ο Ιδιοκτήτης διαγράφει Πρότυπο');
select is((select count(*)::int from public.equipment_templates_view()), 1, 'Μετά τη διαγραφή μένει το ένα Πρότυπο');

-- ───────────── Παραγωγή ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select is((select count(*)::int from public.equipment_items_view()), 1, 'Η Παραγωγή βλέπει το μητρώο, χωρίς τα αποσυρμένα');
select throws_ok(
  $$ select public.equipment_item_create(current_setting('t.cat_cam')::uuid, 'Νέο', null, null) $$, '42501', null,
  'Η Παραγωγή δεν φτιάχνει αντικείμενο'
);
select throws_ok($$ select public.equipment_category_create('Νέα') $$, '42501', null, 'Η Παραγωγή δεν φτιάχνει Κατηγορία');
select set_config('t.tpl3', public.equipment_template_create('Από Παραγωγή', null, array[current_setting('t.item1')::uuid])::text, true);
select is((select count(*)::int from public.equipment_templates_view()), 2, 'Η Παραγωγή φτιάχνει Πρότυπο');
select throws_ok(
  $$ select public.equipment_item_set_status(current_setting('t.item1')::uuid, 'retired', null) $$, '42501', null,
  'Η Παραγωγή δεν αλλάζει Κατάσταση'
);
select throws_ok(
  $$ select public.equipment_item_delete(current_setting('t.item1')::uuid) $$, '42501', null,
  'Η Παραγωγή δεν διαγράφει αντικείμενο'
);
select ok(
  jsonb_array_length(public.equipment_item_view(current_setting('t.item1')::uuid) -> 'history') > 0,
  'Η σελίδα αντικειμένου δείχνει το ιστορικό από το Ίχνος'
);

-- ───────────── Ελεγκτής ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
select throws_ok($$ select * from public.equipment_items_view() $$, '42501', null, 'Ο Ελεγκτής βλέπει το Ίχνος, όχι το μητρώο');
select is(
  (select count(*)::int from public.audit_log
    where entity = 'equipment_items' and action = 'event'
      and after ->> 'to' = 'in_repair' and after ->> 'note' = 'Σπασμένη οθόνη, επιστρέφει Δευτέρα'),
  1, 'Το Ίχνος δείχνει τον λόγο της επισκευής'
);
select ok(
  (select count(*) from public.audit_log where entity like 'equipment%') > 0,
  'Ο Ελεγκτής βλέπει τις αλλαγές του Εξοπλισμού στο Ίχνος'
);

-- ───────────── Άμεση πρόσβαση στους πίνακες ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select throws_ok($$ select * from public.equipment_categories $$, '42501', null, 'Ο πίνακας Κατηγοριών δεν διαβάζεται απευθείας');
select throws_ok($$ select * from public.equipment_items $$, '42501', null, 'Ο πίνακας αντικειμένων δεν διαβάζεται απευθείας');
select throws_ok($$ select * from public.equipment_templates $$, '42501', null, 'Ο πίνακας Προτύπων δεν διαβάζεται απευθείας');
select throws_ok($$ select * from public.equipment_template_items $$, '42501', null, 'Ο πίνακας συνδέσεων Προτύπου δεν διαβάζεται απευθείας');

select * from finish();
rollback;
