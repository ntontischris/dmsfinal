-- Σήμερα: κάρτα «Κάμερα σε επισκευή» (equipment_repair). Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
-- Οι ώρες είναι σχετικές με το now() της συναλλαγής, ώστε το τεστ να μην εξαρτάται από ημερομηνία.
begin;
select plan(25);

-- ───────────── Βοηθοί ─────────────
create function public.t_uid(p_last text) returns uuid
language sql immutable as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;
create function public.t_fid(p_last text) returns text
language sql immutable as $$ select '00000000-0000-0000-0000-0000000000' || p_last; $$;
create function public.t_eid(p_last text) returns text
language sql immutable as $$ select '00000000-0000-0000-0000-0000000000' || p_last; $$;

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης (όλα) · a2 Παραγωγή (μέλος της d1) · a3 Πωλήσεις (χωρίς Εξοπλισμό)
-- a4 Λογιστής (χωρίς Εξοπλισμό) · a5 Παραγωγή (μέλος της d2, και μέλος του Συνεργείου του f1)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'member@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Ελένη', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'Σοφία', 'member@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
               ('00000000-0000-0000-0000-0000000000a4', 'Λογιστής'),
               ('00000000-0000-0000-0000-0000000000a5', 'Παραγωγή')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Δεδομένα (χωρίς triggers: μόνο ό,τι διαβάζουν οι κάρτες) ─────────────
set session_replication_role = replica;

insert into public.productions (id, title, client_id, agreement_id, owner_id, state, delivered_at, delivered_note) values
  ('00000000-0000-0000-0000-0000000000d1', 'Εσωτερικό showreel', null, null, '00000000-0000-0000-0000-0000000000a1', 'open', null, null),
  ('00000000-0000-0000-0000-0000000000d2', 'Εσωτερικό podcast', null, null, '00000000-0000-0000-0000-0000000000a1', 'open', null, null);
insert into public.production_members (production_id, user_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000a5');

insert into public.equipment_categories (id, name) values
  ('00000000-0000-0000-0000-0000000000c1', 'Κάμερες (τεστ)');
insert into public.equipment_items (id, category_id, name, status, status_note) values
  (public.t_eid('e1')::uuid, '00000000-0000-0000-0000-0000000000c1', 'Κάμερα Α (τεστ)', 'available', null),
  (public.t_eid('e2')::uuid, '00000000-0000-0000-0000-0000000000c1', 'Φακός (τεστ)', 'retired', null),
  (public.t_eid('e3')::uuid, '00000000-0000-0000-0000-0000000000c1', 'Κάμερα Β (τεστ)', 'in_repair', 'Σπασμένη οθόνη'),
  (public.t_eid('e4')::uuid, '00000000-0000-0000-0000-0000000000c1', 'Φωτιστικό (τεστ)', 'in_repair', 'Βλάβη τροφοδοσίας'),
  (public.t_eid('e5')::uuid, '00000000-0000-0000-0000-0000000000c1', 'Μικρόφωνο (τεστ)', 'in_repair', 'Θόρυβος στο καλώδιο'),
  (public.t_eid('e6')::uuid, '00000000-0000-0000-0000-0000000000c1', 'Τρίποδο (τεστ)', 'in_repair', 'Σπασμένο πόδι'),
  (public.t_eid('e7')::uuid, '00000000-0000-0000-0000-0000000000c1', 'Gimbal (τεστ)', 'in_repair', 'Κολλημένος άξονας'),
  (public.t_eid('e8')::uuid, '00000000-0000-0000-0000-0000000000c1', 'Ηχογράφος (τεστ)', 'in_repair', 'Δεν ανάβει');

-- f1: σε 12 ώρες, d1 με δύο σε επισκευή, ένα διαθέσιμο και ένα αποσυρμένο (μετράει δύο, επείγον)
-- f2: σε 3 μέρες 12 ώρες, d1, το ίδιο Φωτιστικό με το f1 (μετράει, όχι επείγον)
-- f3: σε 8 μέρες (έξω από το παράθυρο) · f4: πριν 12 ώρες (πέρασε) · f5: ακυρωμένο
-- f6: σε 2 μέρες 12 ώρες, d2 (μετράει, όχι επείγον)
insert into public.filmings (id, production_id, client_id, starts_at, hours, location, origin, state, is_extra,
                             cancelled_at, cancelled_side, rejected_at, rejected_reason) values
  (public.t_fid('f1')::uuid, '00000000-0000-0000-0000-0000000000d1', null,
   now() + interval '12 hours', 2, 'Στούντιο Α', 'team', 'scheduled', false, null, null, null, null),
  (public.t_fid('f2')::uuid, '00000000-0000-0000-0000-0000000000d1', null,
   now() + interval '3 days 12 hours', 2, 'Στούντιο Α', 'team', 'scheduled', false, null, null, null, null),
  (public.t_fid('f3')::uuid, '00000000-0000-0000-0000-0000000000d1', null,
   now() + interval '8 days', 2, 'Στούντιο Α', 'team', 'scheduled', false, null, null, null, null),
  (public.t_fid('f4')::uuid, '00000000-0000-0000-0000-0000000000d1', null,
   now() - interval '12 hours', 2, 'Στούντιο Α', 'team', 'scheduled', false, null, null, null, null),
  (public.t_fid('f5')::uuid, '00000000-0000-0000-0000-0000000000d1', null,
   now() + interval '1 day 6 hours', 2, 'Στούντιο Α', 'team', 'cancelled', false, now(), 'team', null, null),
  (public.t_fid('f6')::uuid, '00000000-0000-0000-0000-0000000000d2', null,
   now() + interval '2 days 12 hours', 2, 'Κατάστημα', 'team', 'scheduled', false, null, null, null, null);

insert into public.filming_equipment (filming_id, item_id, added_by) values
  (public.t_fid('f1')::uuid, public.t_eid('e1')::uuid, null),
  (public.t_fid('f1')::uuid, public.t_eid('e2')::uuid, null),
  (public.t_fid('f1')::uuid, public.t_eid('e3')::uuid, null),
  (public.t_fid('f1')::uuid, public.t_eid('e4')::uuid, null),
  (public.t_fid('f2')::uuid, public.t_eid('e4')::uuid, null),
  (public.t_fid('f3')::uuid, public.t_eid('e5')::uuid, null),
  (public.t_fid('f4')::uuid, public.t_eid('e6')::uuid, null),
  (public.t_fid('f5')::uuid, public.t_eid('e7')::uuid, null),
  (public.t_fid('f6')::uuid, public.t_eid('e8')::uuid, null);

insert into public.filming_crew (filming_id, user_id, response, reason, responded_at) values
  (public.t_fid('f1')::uuid, '00000000-0000-0000-0000-0000000000a5', 'pending', null, null);

reset session_replication_role;

-- ───────────── Θετικό: ο Ιδιοκτήτης βλέπει τις τέσσερις γραμμές ─────────────
select is(authz.today_count_equipment_repair(public.t_uid('a1'), null, now()), 4,
  'Ο Ιδιοκτήτης βλέπει 4 γραμμές: δύο στο f1, μία στο f2 και μία στο f6');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a1'), null, now())) x),
  4, 'Οι γραμμές είναι ένα ανά (Γύρισμα, αντικείμενο)');

-- ───────────── Σειρά: πιο κοντινό πρώτο, και ισοπαλία με id ─────────────
select is((select array_agg(v ->> 'id' order by n)
             from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a1'), null, now())) with ordinality x (v, n)),
  array[public.t_fid('f1') || ':' || public.t_eid('e3'),
        public.t_fid('f1') || ':' || public.t_eid('e4'),
        public.t_fid('f6') || ':' || public.t_eid('e8'),
        public.t_fid('f2') || ':' || public.t_eid('e4')],
  'Η σειρά είναι η ώρα έναρξης του Γυρίσματος και μετά id');

-- ───────────── Γραμμή: τίτλος, υπότιτλος με μέρα, ώρα και λόγο επισκευής, σύνδεσμος, επείγον ─────────────
select is((select v ->> 'title' from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f6') || ':' || public.t_eid('e8')),
  'Ηχογράφος (τεστ)', 'Ο τίτλος είναι το όνομα του αντικειμένου');
select is((select v ->> 'subtitle' from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f1') || ':' || public.t_eid('e3')),
  'Σπασμένη οθόνη',
  'Ο υπότιτλος έχει μόνο τον λόγο επισκευής (η ώρα είναι η ετικέτα «at»)');
select is((select v ->> 'link' from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f1') || ':' || public.t_eid('e3')),
  '/app/filming/' || public.t_fid('f1'), 'Η γραμμή ανοίγει το Γύρισμα');
select is((select (v ->> 'urgent')::boolean from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f1') || ':' || public.t_eid('e3')), true,
  'Γύρισμα σε 12 ώρες είναι επείγον');
select is((select (v ->> 'urgent')::boolean from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f2') || ':' || public.t_eid('e4')), false,
  'Γύρισμα σε 3 μέρες δεν είναι επείγον');
select is((select (v ->> 'urgent')::boolean from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f6') || ':' || public.t_eid('e8')), false,
  'Γύρισμα σε 2 μέρες και 12 ώρες δεν είναι επείγον (το όριο είναι 1 μέρα)');

-- ───────────── Ένα αντικείμενο σε δύο Γυρίσματα δίνει δύο γραμμές ─────────────
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'title' = 'Φωτιστικό (τεστ)'), 2,
  'Το ίδιο αντικείμενο σε δύο Γυρίσματα δίνει δύο γραμμές');

-- ───────────── Εξαιρέσεις: διαθέσιμο, αποσυρμένο, πάνω από 7 μέρες, πέρασε, ακυρωμένο ─────────────
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f1') || ':' || public.t_eid('e1')), 0, 'Διαθέσιμο αντικείμενο δεν μπαίνει');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f1') || ':' || public.t_eid('e2')), 0, 'Αποσυρμένο αντικείμενο δεν μπαίνει');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f3') || ':' || public.t_eid('e5')), 0, 'Γύρισμα πάνω από 7 μέρες δεν μπαίνει');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f4') || ':' || public.t_eid('e6')), 0, 'Γύρισμα που πέρασε δεν μπαίνει');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f5') || ':' || public.t_eid('e7')), 0, 'Ακυρωμένο Γύρισμα δεν μπαίνει');

-- ───────────── Μητρώο: ζώνη ώρας, ενέργεια ομάδας, προς /app/filming ─────────────
select is((select grp || '|' || kind || '|' || audience || '|' || link from public.today_cards where code = 'equipment_repair'),
  'week|action|team|/app/filming', 'Η κάρτα είναι στη ζώνη ώρας, ως ενέργεια ομάδας, προς /app/filming');

-- ───────────── Ορατότητα «με αφορούν»: μέλος της Παραγωγής και μέλος του Συνεργείου ─────────────
select is(authz.today_count_equipment_repair(public.t_uid('a2'), null, now()), 3,
  'Η Παραγωγή της d1 βλέπει τις τρεις γραμμές του f1 και του f2');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a2'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f6') || ':' || public.t_eid('e8')), 0,
  'Η Παραγωγή της d1 δεν βλέπει το f6 της d2');
select is(authz.today_count_equipment_repair(public.t_uid('a5'), null, now()), 3,
  'Μέλος της d2 και του Συνεργείου του f1 βλέπει το f6 και τις δύο γραμμές του f1');

-- ───────────── Χωρίς Δικαίωμα: Πωλήσεις και Λογιστής ─────────────
select is(authz.today_count_equipment_repair(public.t_uid('a3'), null, now()), null,
  'Οι Πωλήσεις (χωρίς Εξοπλισμό) δεν παίρνουν κάρτα');
select throws_ok($$ select authz.today_items_equipment_repair('00000000-0000-0000-0000-0000000000a3', null, now()) $$,
  '42501', null, 'Οι γραμμές δεν δίνονται σε όποιον δεν έχει δικαίωμα Εξοπλισμού');
select is(authz.today_count_equipment_repair(public.t_uid('a4'), null, now()), null,
  'Ο Λογιστής δεν παίρνει κάρτα');
select is(authz.today_count_equipment_repair(public.t_uid('a1'), public.t_uid('c1'), now()), null,
  'Η κάρτα δεν εμφανίζεται στο πλαίσιο Πελάτη');

-- ───────────── Όριο: έως δύο γραμμές, το πλήθος μένει ολόκληρο ─────────────
select set_config('today.rows', '2', true);
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_equipment_repair(public.t_uid('a1'), null, now())) x (v)),
  2, 'Το όριο γραμμών κόβει τις γραμμές στο όριο');
select is(authz.today_count_equipment_repair(public.t_uid('a1'), null, now()), 4, 'Το πλήθος μένει ολόκληρο πίσω από το όριο');

select * from finish();
rollback;
