-- Σήμερα: κάρτα «Γύρισμα χωρίς σενάριο» (filming_no_script). Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
-- Οι ώρες είναι σχετικές με το now() της συναλλαγής, ώστε το τεστ να μην εξαρτάται από ημερομηνία.
begin;
select plan(27);

-- ───────────── Βοηθοί ─────────────
create function public.t_uid(p_last text) returns uuid
language sql immutable as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;
create function public.t_fid(p_last text) returns text
language sql immutable as $$ select '00000000-0000-0000-0000-0000000000' || p_last; $$;

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης (όλα) · a2 Παραγωγή (μέλος της d1, και μέλος του Συνεργείου του fa) · a3 Πωλήσεις (χωρίς Δελτίο)
-- a4 Λογιστής (χωρίς Δελτίο) · a5 Παραγωγή, μέλος της d2
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

insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Καφέ Αθηνά', 'Μαρία Παπαδάκη', 'maria@athina.example.gr',
   '00000000-0000-0000-0000-0000000000a3');

insert into public.productions (id, title, client_id, agreement_id, owner_id, state, delivered_at, delivered_note) values
  ('00000000-0000-0000-0000-0000000000d1', 'Εσωτερικό showreel', null, null, '00000000-0000-0000-0000-0000000000a1', 'open', null, null),
  ('00000000-0000-0000-0000-0000000000d2', 'Εσωτερικό podcast', null, null, '00000000-0000-0000-0000-0000000000a1', 'open', null, null);
insert into public.production_members (production_id, user_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000a5');

-- f1: σε 1 μέρα, χωρίς Δελτίο (μετράει, επείγον, πρώτο)     · f4: σε 1 μέρα 2 ώρες, Δελτίο με κενές λήψεις (μετράει)
-- f9: σε 1 μέρα 3 ώρες, εσωτερικό στη d2 (μετράει)          · fa: σε 1 μέρα 4 ώρες, d2, μέλος του Συνεργείου ο a2
-- f2: σε 2 μέρες 23 ώρες (μέσα στο παράθυρο των 3 ημερών, μετράει, τελευταίο)
-- f3: σε 1 μέρα, Δελτίο με λήψεις (δεν μετράει) · f5: σε 3 μέρες 1 ώρα (έξω από το παράθυρο)
-- f6: χθες (πέρασε) · f7: σε 1 μέρα, ακυρωμένο · f8: σε 1 μέρα, απορριμμένο
insert into public.filmings (id, production_id, client_id, starts_at, hours, location, origin, state, is_extra,
                             cancelled_at, cancelled_side, rejected_at, rejected_reason) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', null,
   now() + interval '1 day', 2, 'Στούντιο Α', 'team', 'pending', false, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000d1', null,
   now() + interval '1 day 2 hours', 2, 'Στούντιο Β', 'team', 'scheduled', false, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-0000000000d2', null,
   now() + interval '1 day 3 hours', 2, 'Κατάστημα', 'team', 'scheduled', false, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000fa', '00000000-0000-0000-0000-0000000000d2', null,
   now() + interval '1 day 4 hours', 2, 'Στούντιο Γ', 'team', 'scheduled', false, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000d1', null,
   now() + interval '2 days 23 hours', 2, 'Στούντιο Α', 'team', 'scheduled', false, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000d1', null,
   now() + interval '1 day 5 hours', 2, 'Στούντιο Α', 'team', 'scheduled', false, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000d1', null,
   now() + interval '3 days 1 hour', 2, 'Στούντιο Α', 'team', 'scheduled', false, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000d1', null,
   now() - interval '1 day', 2, 'Στούντιο Α', 'team', 'scheduled', false, null, null, null, null),
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000000d1', null,
   now() + interval '1 day 6 hours', 2, 'Στούντιο Α', 'team', 'cancelled', false, now(), 'team', null, null),
  ('00000000-0000-0000-0000-0000000000f8', '00000000-0000-0000-0000-0000000000d1', null,
   now() + interval '1 day 7 hours', 2, 'Στούντιο Α', 'team', 'rejected', false, null, null, now(), 'Δεν χωράει');

insert into public.filming_sheets (filming_id, shots) values
  (public.t_fid('f3')::uuid, '[{"id": "s1", "label": "Πλάνο 1"}]'::jsonb),
  (public.t_fid('f4')::uuid, '[]'::jsonb);

insert into public.filming_crew (filming_id, user_id, response, reason, responded_at) values
  (public.t_fid('fa')::uuid, '00000000-0000-0000-0000-0000000000a2', 'pending', null, null);

reset session_replication_role;

-- ───────────── Θετικό: ο Ιδιοκτήτης βλέπει τα πέντε Γυρίσματα χωρίς σενάριο ─────────────
select is(authz.today_count_filming_no_script(public.t_uid('a1'), null, now()), 5,
  'Ο Ιδιοκτήτης βλέπει τα 5 Γυρίσματα χωρίς σενάριο (χωρίς τα με λήψεις, τα εκτός παραθύρου, τα παλιά, τα ακυρωμένα και τα απορριμμένα)');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) x),
  5, 'Οι γραμμές είναι ένα ανά Γύρισμα');

-- ───────────── Σειρά: πιο κοντινό πρώτο, και ισοπαλία με id ─────────────
select is((select array_agg(v ->> 'id' order by n)
             from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) with ordinality x (v, n)),
  array[public.t_fid('f1'), public.t_fid('f4'), public.t_fid('f9'), public.t_fid('fa'), public.t_fid('f2')],
  'Η σειρά είναι η ώρα έναρξης και μετά id');

-- ───────────── Γραμμή: τίτλος, υπότιτλος με μέρα, ώρα και Πελάτη ή χώρο, σύνδεσμος, επείγον ─────────────
select is((select v ->> 'title' from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f9')),
  'Εσωτερικό podcast', 'Ο τίτλος είναι η Παραγωγή');
select is((select v ->> 'subtitle' from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f9')),
  'Κατάστημα',
  'Ο υπότιτλος έχει μόνο τον χώρο (η μέρα και η ώρα είναι η ετικέτα «at»), χωρίς Πελάτη σε εσωτερικό Γύρισμα');
select is((select v ->> 'subtitle' from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f1')),
  'Στούντιο Α',
  'Χωρίς Πελάτη, ο υπότιτλος έχει μόνο τον χώρο');
select is((select v ->> 'link' from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f1')),
  '/app/filming/' || public.t_fid('f1'), 'Η γραμμή ανοίγει το Γύρισμα');
select is((select (v ->> 'urgent')::boolean from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f1')), true, 'Γύρισμα αύριο είναι επείγον');
-- f2 είναι 2 μέρες και 23 ώρες μακριά: η ημερολογιακή διαφορά του είναι 2 ή 3 ανάλογα με την ώρα, άρα δεν είναι επείγον.
select is((select (v ->> 'urgent')::boolean from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f2')), false, 'Γύρισμα σε 2 μέρες δεν είναι επείγον');

-- ───────────── Κλειστό Δελτίο και παράθυρο ─────────────
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f4')), 1, 'Δελτίο με κενό shots μετράει ως χωρίς σενάριο');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f3')), 0, 'Δελτίο με λήψεις δεν μπαίνει');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f2')), 1, 'Γύρισμα σε 2 μέρες 23 ώρες είναι μέσα στο παράθυρο των 3 ημερών');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f5')), 0, 'Γύρισμα πάνω από 3 μέρες δεν μπαίνει');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f6')), 0, 'Γύρισμα που πέρασε δεν μπαίνει');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f7')), 0, 'Ακυρωμένο Γύρισμα δεν μπαίνει');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f8')), 0, 'Απορριμμένο Γύρισμα δεν μπαίνει');

-- ───────────── Ορατότητα «με αφορά»: μέλος της Παραγωγής ή του Συνεργείου ─────────────
select is(authz.today_count_filming_no_script(public.t_uid('a2'), null, now()), 4,
  'Η Παραγωγή βλέπει τα Γυρίσματα της d1 και το fa ως μέλος του Συνεργείου του');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a2'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('f9')), 0, 'Η Παραγωγή δεν βλέπει το f9 της d2, όπου δεν είναι μέλος ούτε στο Συνεργείο');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a2'), null, now())) x (v)
            where v ->> 'id' = public.t_fid('fa')), 1, 'Η Παραγωγή βλέπει το fa ως μέλος του Συνεργείου του');
select is(authz.today_count_filming_no_script(public.t_uid('a5'), null, now()), 2,
  'Μέλος της d2 βλέπει τα δύο Γυρίσματα της d2 και τίποτα από τη d1');

-- ───────────── Χωρίς Δικαίωμα: Πωλήσεις και Λογιστής ─────────────
select is(authz.today_count_filming_no_script(public.t_uid('a3'), null, now()), null,
  'Η Πωλήσεις (χωρίς Δελτίο) δεν παίρνει κάρτα');
select throws_ok($$ select authz.today_items_filming_no_script('00000000-0000-0000-0000-0000000000a3', null, now()) $$,
  '42501', null, 'Οι γραμμές δεν δίνονται σε όποιον δεν έχει Δελτίο');
select is(authz.today_count_filming_no_script(public.t_uid('a4'), null, now()), null,
  'Ο Λογιστής δεν παίρνει κάρτα');
select is(authz.today_count_filming_no_script(public.t_uid('a1'), public.t_uid('c1'), now()), null,
  'Η κάρτα δεν εμφανίζεται στο πλαίσιο Πελάτη');

-- ───────────── Μητρώο: ζώνη ώρας, ενέργεια ομάδας, προς /app/filming ─────────────
select is((select grp || '|' || kind || '|' || audience || '|' || link from public.today_cards where code = 'filming_no_script'),
  'week|action|team|/app/filming', 'Η κάρτα είναι στη ζώνη ώρας, ως ενέργεια ομάδας, προς /app/filming');

-- ───────────── Όριο: έως δύο γραμμές, το πλήθος μένει ολόκληρο ─────────────
select set_config('today.rows', '2', true);
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_filming_no_script(public.t_uid('a1'), null, now())) x (v)),
  2, 'Το όριο γραμμών κόβει τις γραμμές στο όριο');
select is(authz.today_count_filming_no_script(public.t_uid('a1'), null, now()), 5, 'Το πλήθος μένει ολόκληρο πίσω από το όριο');

select * from finish();
rollback;
