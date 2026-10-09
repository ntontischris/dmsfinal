-- Εξοπλισμός: μητρώο, Κατηγορίες, Πρότυπα, κανόνες διαγραφής και Ίχνος (κεφ. 3, ADR 0007). Φανταστικοί Χρήστες και στοιχεία.
begin;
select plan(128);

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης · e2 Παραγωγή · e3 Πωλήσεις · e4 «Ελεγκτής» (audit.view μόνο) · e5 «Δεσμεύει μόνο» (equipment.reserve μόνο)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'auditor@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'reserve@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'Κώστας', 'auditor@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'Νίκος', 'reserve@example.com');

insert into public.roles (name, kind) values ('Ελεγκτής', 'team'), ('Δεσμεύει μόνο', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, g.permission, 'all'
  from (values ('Ελεγκτής', 'audit.view'), ('Δεσμεύει μόνο', 'equipment.reserve')) as g (role_name, permission)
  join public.roles r on r.name = g.role_name and r.kind = 'team';

insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e2', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000e3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000e4', 'Ελεγκτής'),
    ('00000000-0000-0000-0000-0000000000e5', 'Δεσμεύει μόνο')
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
select throws_ok(
  $$ select authz.equipment_check_template_items(array['00000000-0000-0000-0000-00000000aaaa'::uuid, '00000000-0000-0000-0000-00000000aaaa'::uuid]) $$,
  'P0001', 'Κάθε αντικείμενο μπαίνει στο Πρότυπο μία φορά', 'Ο έλεγχος Προτύπου απορρίπτει διπλά αναγνωριστικά'
);
select throws_ok(
  $$ select authz.equipment_check_template_items(array[gen_random_uuid()]) $$,
  'P0001', 'Κάποιο αντικείμενο του Προτύπου δεν βρέθηκε', 'Ο έλεγχος Προτύπου απορρίπτει αναγνωριστικό που δεν υπάρχει'
);
select throws_ok(
  $$ select authz.equipment_check_template_items(array[null::uuid]) $$,
  'P0001', 'Κάθε αντικείμενο μπαίνει στο Πρότυπο μία φορά', 'Ο έλεγχος Προτύπου απορρίπτει κενό αναγνωριστικό'
);
select throws_ok(
  $$ select authz.equipment_check_template_items(null::uuid[]) $$,
  'P0001', 'Ένα Πρότυπο θέλει τουλάχιστον ένα αντικείμενο', 'Ο έλεγχος Προτύπου απορρίπτει κενή λίστα'
);

-- ───────────── Ανώνυμος ─────────────
set local role anon;
select throws_ok($$ select * from public.equipment_items_view() $$, '42501', null, 'Ο ανώνυμος δεν διαβάζει το μητρώο');
select throws_ok($$ select * from public.equipment_categories_view() $$, '42501', null, 'Ο ανώνυμος δεν διαβάζει τις Κατηγορίες');
select throws_ok($$ select * from public.equipment_templates_view() $$, '42501', null, 'Ο ανώνυμος δεν διαβάζει τα Πρότυπα');
select throws_ok($$ select public.equipment_item_view(gen_random_uuid()) $$, '42501', null, 'Ο ανώνυμος δεν βλέπει σελίδα αντικειμένου');
select throws_ok($$ select public.equipment_category_create('Νέα') $$, '42501', null, 'Ο ανώνυμος δεν φτιάχνει Κατηγορία');
select throws_ok($$ select public.equipment_category_rename(gen_random_uuid(), 'Νέα') $$, '42501', null, 'Ο ανώνυμος δεν μετονομάζει Κατηγορία');
select throws_ok($$ select public.equipment_category_retire(gen_random_uuid()) $$, '42501', null, 'Ο ανώνυμος δεν αποσύρει Κατηγορία');
select throws_ok($$ select public.equipment_category_restore(gen_random_uuid()) $$, '42501', null, 'Ο ανώνυμος δεν επαναφέρει Κατηγορία');
select throws_ok($$ select public.equipment_category_delete(gen_random_uuid()) $$, '42501', null, 'Ο ανώνυμος δεν διαγράφει Κατηγορία');
select throws_ok($$ select public.equipment_item_create(gen_random_uuid(), 'Νέο', null, null) $$, '42501', null, 'Ο ανώνυμος δεν φτιάχνει αντικείμενο');
select throws_ok($$ select public.equipment_item_update(gen_random_uuid(), gen_random_uuid(), 'Νέο', null, null) $$, '42501', null, 'Ο ανώνυμος δεν αλλάζει αντικείμενο');
select throws_ok($$ select public.equipment_item_set_status(gen_random_uuid(), 'available', null) $$, '42501', null, 'Ο ανώνυμος δεν αλλάζει Κατάσταση');
select throws_ok($$ select public.equipment_item_delete(gen_random_uuid()) $$, '42501', null, 'Ο ανώνυμος δεν διαγράφει αντικείμενο');
select throws_ok($$ select public.equipment_template_create('Νέο', null, array[gen_random_uuid()]) $$, '42501', null, 'Ο ανώνυμος δεν φτιάχνει Πρότυπο');
select throws_ok($$ select public.equipment_template_update(gen_random_uuid(), 'Νέο', null, array[gen_random_uuid()]) $$, '42501', null, 'Ο ανώνυμος δεν αλλάζει Πρότυπο');
select throws_ok($$ select public.equipment_template_delete(gen_random_uuid()) $$, '42501', null, 'Ο ανώνυμος δεν διαγράφει Πρότυπο');

-- ───────────── Πωλήσεις ─────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok($$ select * from public.equipment_items_view() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν το μητρώο');
select throws_ok($$ select * from public.equipment_categories_view() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν τις Κατηγορίες');
select throws_ok($$ select * from public.equipment_templates_view() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν τα Πρότυπα');
select throws_ok($$ select public.equipment_item_view(gen_random_uuid()) $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν σελίδα αντικειμένου');
select throws_ok($$ select public.equipment_category_create('Νέα') $$, '42501', null, 'Οι Πωλήσεις δεν φτιάχνουν Κατηγορία');
select throws_ok($$ select public.equipment_category_rename(gen_random_uuid(), 'Νέα') $$, '42501', null, 'Οι Πωλήσεις δεν μετονομάζουν Κατηγορία');
select throws_ok($$ select public.equipment_category_retire(gen_random_uuid()) $$, '42501', null, 'Οι Πωλήσεις δεν αποσύρουν Κατηγορία');
select throws_ok($$ select public.equipment_category_restore(gen_random_uuid()) $$, '42501', null, 'Οι Πωλήσεις δεν επαναφέρουν Κατηγορία');
select throws_ok($$ select public.equipment_category_delete(gen_random_uuid()) $$, '42501', null, 'Οι Πωλήσεις δεν διαγράφουν Κατηγορία');
select throws_ok($$ select public.equipment_item_create(gen_random_uuid(), 'Νέο', null, null) $$, '42501', null, 'Οι Πωλήσεις δεν φτιάχνουν αντικείμενο');
select throws_ok($$ select public.equipment_item_update(gen_random_uuid(), gen_random_uuid(), 'Νέο', null, null) $$, '42501', null, 'Οι Πωλήσεις δεν αλλάζουν αντικείμενο');
select throws_ok($$ select public.equipment_item_set_status(gen_random_uuid(), 'available', null) $$, '42501', null, 'Οι Πωλήσεις δεν αλλάζουν Κατάσταση');
select throws_ok($$ select public.equipment_item_delete(gen_random_uuid()) $$, '42501', null, 'Οι Πωλήσεις δεν διαγράφουν αντικείμενο');
select throws_ok($$ select public.equipment_template_create('Νέο', null, array[gen_random_uuid()]) $$, '42501', null, 'Οι Πωλήσεις δεν φτιάχνουν Πρότυπο');
select throws_ok($$ select public.equipment_template_update(gen_random_uuid(), 'Νέο', null, array[gen_random_uuid()]) $$, '42501', null, 'Οι Πωλήσεις δεν αλλάζουν Πρότυπο');
select throws_ok($$ select public.equipment_template_delete(gen_random_uuid()) $$, '42501', null, 'Οι Πωλήσεις δεν διαγράφουν Πρότυπο');

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
  $$ select public.equipment_item_set_status(null, 'available', null) $$, 'P0001',
  'Το αντικείμενο δεν βρέθηκε', 'Κενό αναγνωριστικό αντικειμένου δείχνει «δεν βρέθηκε»'
);
select throws_ok(
  $$ select public.equipment_item_set_status(current_setting('t.item1')::uuid, null, null) $$, 'P0001',
  'Άγνωστη Κατάσταση', 'Κενή Κατάσταση απορρίπτεται'
);
select throws_ok(
  $$ select public.equipment_item_update(current_setting('t.item1')::uuid, gen_random_uuid(), 'Sony FX3', null, null) $$, 'P0001',
  'Η Κατηγορία δεν βρέθηκε', 'Αντικείμενο δεν μεταφέρεται σε Κατηγορία που δεν υπάρχει'
);
select throws_ok(
  $$ select public.equipment_item_create(current_setting('t.cat_cam')::uuid, 'Sony FX3', null, null) $$, 'P0001',
  'Υπάρχει ήδη αντικείμενο με αυτό το όνομα', 'Το ίδιο όνομα δεν ξαναμπαίνει'
);
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
select set_config('t.ev', (select count(*)::text from public.audit_log
  where entity = 'equipment_items' and action = 'event' and entity_id = current_setting('t.item1')), true);
select lives_ok(
  $$ select public.equipment_item_set_status(current_setting('t.item1')::uuid, 'available', null) $$,
  'Ίδια Κατάσταση ξαναγράφεται χωρίς σφάλμα'
);
select is(
  (select count(*)::text from public.audit_log
    where entity = 'equipment_items' and action = 'event' and entity_id = current_setting('t.item1')),
  current_setting('t.ev'), 'Ίδια Κατάσταση δεν γράφει νέο γεγονός'
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
select lives_ok($$ select public.equipment_category_retire(current_setting('t.cat_sound')::uuid) $$, 'Αποσύρεται η Κατηγορία Ήχος');
select is((select count(*)::int from public.equipment_categories_view()), 5, 'Οι αποσυρμένες Κατηγορίες κρύβονται από προεπιλογή');
select is((select count(*)::int from public.equipment_categories_view(true)), 6, 'Οι αποσυρμένες Κατηγορίες φαίνονται με true');
select lives_ok($$ select public.equipment_category_restore(current_setting('t.cat_sound')::uuid) $$, 'Επαναφορά της Κατηγορίας Ήχος');
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
select throws_ok(
  $$ select public.equipment_item_delete(current_setting('t.item1')::uuid) $$, 'P0001',
  'Το αντικείμενο είναι σε Πρότυπο, αφαίρεσέ το από εκεί πρώτα', 'Αντικείμενο σε Πρότυπο δεν διαγράφεται'
);
select set_config('t.tpl4', public.equipment_template_create('Άλλο Πρότυπο', null, array[current_setting('t.item1')::uuid])::text, true);
select throws_ok(
  $$ select public.equipment_template_update(current_setting('t.tpl1')::uuid, 'άλλο πρότυπο', null, array[current_setting('t.item1')::uuid]) $$,
  'P0001', 'Υπάρχει ήδη Πρότυπο με αυτό το όνομα', 'Μετονομασία σε όνομα άλλου Προτύπου απορρίπτεται'
);
select lives_ok($$ select public.equipment_template_delete(current_setting('t.tpl4')::uuid) $$, 'Διαγραφή του βοηθητικού Προτύπου');
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
select throws_ok(
  $$ select public.equipment_category_rename(current_setting('t.cat_cam')::uuid, 'Άλλη') $$, '42501', null,
  'Η Παραγωγή δεν μετονομάζει Κατηγορία'
);
select throws_ok(
  $$ select public.equipment_category_retire(current_setting('t.cat_cam')::uuid) $$, '42501', null,
  'Η Παραγωγή δεν αποσύρει Κατηγορία'
);
select throws_ok(
  $$ select public.equipment_category_restore(current_setting('t.cat_cam')::uuid) $$, '42501', null,
  'Η Παραγωγή δεν επαναφέρει Κατηγορία'
);
select throws_ok(
  $$ select public.equipment_category_delete(current_setting('t.cat_cam')::uuid) $$, '42501', null,
  'Η Παραγωγή δεν διαγράφει Κατηγορία'
);
select throws_ok(
  $$ select public.equipment_item_update(current_setting('t.item1')::uuid, current_setting('t.cat_cam')::uuid, 'Sony FX3', null, null) $$, '42501', null,
  'Η Παραγωγή δεν αλλάζει στοιχεία αντικειμένου'
);
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

-- ───────────── Μόνο «Δεσμεύει εξοπλισμό» ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}', true);
select lives_ok(
  $$ select public.equipment_template_update(current_setting('t.tpl1')::uuid, 'Μικρό γύρισμα', null, array[current_setting('t.item1')::uuid]) $$,
  'Όποιος έχει μόνο «Δεσμεύει εξοπλισμό» αλλάζει Πρότυπο'
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

-- ───────────── Ποσότητα στη δημιουργία (#123) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select set_config('t.many', array_to_string(public.equipment_items_create_many(current_setting('t.cat_sound')::uuid, 'Lavalier', 'LAV', 'Για συνέντευξη', 3), ','), true);
select is(cardinality(string_to_array(current_setting('t.many'), ',')), 3, 'Ποσότητα 3 φτιάχνει τρεις μονάδες');
select is(
  (select string_agg(i.name, '|' order by i.name) from public.equipment_items_view(true) i where i.id = any (string_to_array(current_setting('t.many'), ',')::uuid[])),
  'Lavalier #1|Lavalier #2|Lavalier #3', 'Οι μονάδες παίρνουν αρίθμηση #1 έως #3'
);
select is(
  (select string_agg(i.code, '|' order by i.code) from public.equipment_items_view(true) i where i.id = any (string_to_array(current_setting('t.many'), ',')::uuid[])),
  'LAV-1|LAV-2|LAV-3', 'Ο κωδικός παίρνει αρίθμηση -1 έως -3'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.audit_log a where a.entity = 'equipment_items' and a.action = 'insert' and a.entity_id = any (string_to_array(current_setting('t.many'), ','))),
  3, 'Κάθε μονάδα γράφει την εγγραφή της στο Ίχνος'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select set_config('t.one', array_to_string(public.equipment_items_create_many(current_setting('t.cat_drone')::uuid, 'Drone Mavic', null, null, 1), ','), true);
select is(
  (select i.name from public.equipment_items_view(true) i where i.id = current_setting('t.one')::uuid), 'Drone Mavic',
  'Ποσότητα 1 δεν βάζει αρίθμηση'
);
select is(
  (select i.code from public.equipment_items_view(true) i where i.id = current_setting('t.one')::uuid), null,
  'Ποσότητα 1 χωρίς κωδικό μένει χωρίς κωδικό'
);
select set_config('t.clash', public.equipment_item_create(current_setting('t.cat_lens')::uuid, 'Ρύθμιση #2', null, null)::text, true);
select throws_ok(
  $$ select public.equipment_items_create_many(current_setting('t.cat_lens')::uuid, 'Ρύθμιση', null, null, 3) $$, 'P0001',
  'Υπάρχει ήδη αντικείμενο με αυτό το όνομα', 'Σύγκρουση ονόματος σε μία μονάδα ακυρώνει όλη την ποσότητα'
);
select is(
  (select count(*)::int from public.equipment_items_view(true) i where lower(i.name) like 'ρύθμιση%'), 1,
  'Μετά την αποτυχία δεν μπαίνει καμία μονάδα'
);
select throws_ok(
  $$ select public.equipment_items_create_many(current_setting('t.cat_cam')::uuid, 'Μηδέν', null, null, 0) $$, 'P0001',
  'Η Ποσότητα είναι από 1 ως 50', 'Ποσότητα 0 απορρίπτεται'
);
select throws_ok(
  $$ select public.equipment_items_create_many(current_setting('t.cat_cam')::uuid, 'Πολλά', null, null, 51) $$, 'P0001',
  'Η Ποσότητα είναι από 1 ως 50', 'Ποσότητα 51 απορρίπτεται'
);
select set_config('t.cat_q', public.equipment_category_create('Ποσότητα δοκιμή')::text, true);
select lives_ok($$ select public.equipment_category_retire(current_setting('t.cat_q')::uuid) $$, 'Αποσύρεται Κατηγορία για τον έλεγχο ποσότητας');
select throws_ok(
  $$ select public.equipment_items_create_many(current_setting('t.cat_q')::uuid, 'Αποσυρμένο', null, null, 2) $$, 'P0001',
  'Η Κατηγορία έχει αποσυρθεί, δεν δέχεται νέα αντικείμενα', 'Σε αποσυρμένη Κατηγορία δεν μπαίνουν μονάδες'
);
select throws_ok(
  $$ select public.equipment_items_create_many(null::uuid, 'Χωρίς Κατηγορία', null, null, 2) $$, 'P0001',
  'Η Κατηγορία δεν βρέθηκε', 'Ποσότητα χωρίς Κατηγορία απορρίπτεται'
);
select throws_ok(
  $$ select public.equipment_items_create_many(gen_random_uuid(), 'Άγνωστη Κατηγορία', null, null, 2) $$, 'P0001',
  'Η Κατηγορία δεν βρέθηκε', 'Ποσότητα σε ανύπαρκτη Κατηγορία απορρίπτεται'
);
set local role anon;
select throws_ok($$ select public.equipment_items_create_many(gen_random_uuid(), 'Νέο', null, null, 2) $$, '42501', null, 'Ο ανώνυμος δεν φτιάχνει μονάδες');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok($$ select public.equipment_items_create_many(current_setting('t.cat_cam')::uuid, 'Νέο', null, null, 2) $$, '42501', null, 'Οι Πωλήσεις δεν φτιάχνουν μονάδες');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}', true);
select throws_ok($$ select public.equipment_items_create_many(current_setting('t.cat_cam')::uuid, 'Νέο', null, null, 2) $$, '42501', null, 'Η Παραγωγή δεν φτιάχνει μονάδες');

select * from finish();
rollback;
