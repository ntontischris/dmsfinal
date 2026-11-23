-- Σήμερα: κάρτα «Δεν απάντησε» (crew_silent). Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
-- Όλες οι ημερομηνίες είναι σχετικές με τη σημερινή μέρα της Αθήνας, ώστε το τεστ να μην εξαρτάται από ημερομηνία ή τέλος μήνα.
begin;
select plan(17);

-- ───────────── Βοηθοί ─────────────
create function public.t_uid(p_last text) returns uuid
language sql immutable as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;
create function public.t_fid(p_last text) returns text
language sql immutable as $$ select '00000000-0000-0000-0000-0000000000' || p_last; $$;
-- Μεσημέρι (12:00 Αθήνα) της σημερινής μέρας +p_offset μέρες.
create function public.t_day_at(p_offset integer) returns timestamptz
language sql stable as $$
  select (((now() at time zone 'Europe/Athens')::date + p_offset)::timestamp + interval '12 hours') at time zone 'Europe/Athens';
$$;

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης (όλα τα Γυρίσματα) · a2 Παραγωγή (μόνο «με αφορά», σιωπηλό μέλος) · a3 Πωλήσεις (Υπεύθυνος του Πελάτη c1)
-- a5 Παραγωγή, μέλος της Παραγωγής d1 · b1 Χρήστης πελάτη
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'member@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'Σοφία', 'member@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
               ('00000000-0000-0000-0000-0000000000a5', 'Παραγωγή')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Δεδομένα (χωρίς triggers: μόνο ό,τι διαβάζουν οι κάρτες) ─────────────
set session_replication_role = replica;

insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Καφέ Αθηνά', 'Μαρία Παπαδάκη', 'maria@athina.example.gr',
   '00000000-0000-0000-0000-0000000000a3');
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

-- Παραγωγή d1 και d2, ιδιοκτήτης ο a1· ο a5 είναι μέλος μόνο της d1
insert into public.productions (id, title, client_id, agreement_id, owner_id, state, delivered_at, delivered_note) values
  ('00000000-0000-0000-0000-0000000000d1', 'Εσωτερικό showreel', null, null, '00000000-0000-0000-0000-0000000000a1', 'open', null, null),
  ('00000000-0000-0000-0000-0000000000d2', 'Εσωτερικό podcast', null, null, '00000000-0000-0000-0000-0000000000a1', 'open', null, null);
insert into public.production_members (production_id, user_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a5');

-- f1: σε 2 μέρες, δύο σιωπηλά μέλη (επείγον) · f2: σε 5 μέρες, ένα σιωπηλό μέλος (όχι επείγον)
-- f3: χθες (πέρασε) · f4: σε 2 μέρες αλλά ακυρωμένο · f5: σε 3 μέρες, σιωπηλό μόλις πριν 1 ώρα (δεν μετράει ακόμη)
-- f6: σε 4 μέρες, Πελάτης c1 (υπεύθυνος a3), ένα μέλος επιβεβαίωσε και ένα είναι σιωπηλό
insert into public.filmings (id, production_id, client_id, starts_at, hours, location, origin, state, is_extra,
                             cancelled_at, cancelled_side) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', null,
   public.t_day_at(2), 2, 'Στούντιο Α', 'team', 'scheduled', false, null, null),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000d2', null,
   public.t_day_at(5), 2, 'Στούντιο Β', 'team', 'scheduled', false, null, null),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000d1', null,
   public.t_day_at(-1), 2, 'Στούντιο Α', 'team', 'scheduled', false, null, null),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000d1', null,
   public.t_day_at(2), 2, 'Στούντιο Α', 'team', 'cancelled', false, now(), 'team'),
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000d1', null,
   public.t_day_at(3), 2, 'Στούντιο Α', 'team', 'scheduled', false, null, null),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1',
   public.t_day_at(4), 2, 'Κατάστημα', 'team', 'scheduled', true, null, null);

insert into public.filming_crew (filming_id, user_id, response, reason, responded_at, added_at) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'pending', null, null, now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a3', 'pending', null, null, now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a5', 'pending', null, null, now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000a3', 'pending', null, null, now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000a3', 'pending', null, null, now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000a3', 'pending', null, null, now() - interval '1 hour'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000a5', 'confirmed', null, now(), now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000a2', 'pending', null, null, now() - interval '2 days');

reset session_replication_role;

-- ───────────── Θετικό: ο Ιδιοκτήτης βλέπει τα τρία μελλοντικά Γυρίσματα με σιωπηλό μέλος ─────────────
select is(authz.today_count_crew_silent(public.t_uid('a1'), null, now()), 3,
  'Ο Ιδιοκτήτης βλέπει τα 3 μελλοντικά Γυρίσματα με σιωπηλό μέλος (χωρίς το παρελθόν, το ακυρωμένο και το πρόσφατο)');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_crew_silent(public.t_uid('a1'), null, now())) x),
  3, 'Οι γραμμές είναι ένα ανά Γύρισμα και όχι ανά άτομο');
select is((select array_agg(x ->> 'id' order by n)
             from jsonb_array_elements(authz.today_items_crew_silent(public.t_uid('a1'), null, now())) with ordinality x (v, n)),
  array[public.t_fid('f1'), public.t_fid('f6'), public.t_fid('f2')], 'Οι γραμμές είναι σε σειρά ημερομηνίας');
select is((select x ->> 'subtitle' from jsonb_array_elements(authz.today_items_crew_silent(public.t_uid('a1'), null, now())) x
            where x ->> 'id' = public.t_fid('f1')),
  'Δεν έχει απαντήσει: Άννα, Πέτρος', 'Η γραμμή λέει ποιοι δεν απάντησαν, με τα ονόματα της ομάδας και σε σειρά');
select is((select x ->> 'link' from jsonb_array_elements(authz.today_items_crew_silent(public.t_uid('a1'), null, now())) x
            where x ->> 'id' = public.t_fid('f1')),
  '/app/filming/' || public.t_fid('f1'), 'Η γραμμή ανοίγει το Γύρισμα');

-- ───────────── Όριο: ≤ 2 μέρες επείγον, 3+ μέρες όχι ─────────────
select is((select (x ->> 'urgent')::boolean from jsonb_array_elements(authz.today_items_crew_silent(public.t_uid('a1'), null, now())) x
            where x ->> 'id' = public.t_fid('f1')), true, 'Γύρισμα σε 2 μέρες είναι επείγον');
select is((select (x ->> 'urgent')::boolean from jsonb_array_elements(authz.today_items_crew_silent(public.t_uid('a1'), null, now())) x
            where x ->> 'id' = public.t_fid('f2')), false, 'Γύρισμα σε 5 μέρες δεν είναι επείγον');

-- ───────────── Εξαιρέσεις: πρόσφατο, παρελθόν, ακυρωμένο, επιβεβαιωμένο μέλος ─────────────
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_crew_silent(public.t_uid('a1'), null, now())) x
            where x ->> 'id' in (public.t_fid('f5'), public.t_fid('f3'), public.t_fid('f4'))), 0,
  'Πρόσφατη εκκρεμότητα (κάτω από 24 ώρες), παρελθόν και ακυρωμένο δεν εμφανίζονται');
select is((select x ->> 'subtitle' from jsonb_array_elements(authz.today_items_crew_silent(public.t_uid('a1'), null, now())) x
            where x ->> 'id' = public.t_fid('f6')),
  'Δεν έχει απαντήσει: Πέτρος', 'Το μέλος που επιβεβαίωσε δεν μπαίνει στη γραμμή');

-- ───────────── Ορατότητα «με αφορά» ─────────────
-- Ο Πέτρος είναι σιωπηλός στα f1 και f6· δεν βλέπει την κάρτα για τη δική του εκκρεμότητα.
select is(authz.today_count_crew_silent(public.t_uid('a2'), null, now()), 0,
  'Το σιωπηλό μέλος δεν βλέπει την κάρτα για τη δική του σιωπή');
-- Η Σοφία είναι μέλος της d1 (βλέπει το f1) και έχει επιβεβαιώσει το f6.
select is(authz.today_count_crew_silent(public.t_uid('a5'), null, now()), 2,
  'Μέλος της Παραγωγής (με αφορά) βλέπει τα Γυρίσματα της Παραγωγής του και όσα έχει επιβεβαιώσει');
select is((select x ->> 'subtitle' from jsonb_array_elements(authz.today_items_crew_silent(public.t_uid('a5'), null, now())) x
            where x ->> 'id' = public.t_fid('f1')),
  'Δεν έχει απαντήσει: Άννα, Πέτρος', 'Το μέλος της Παραγωγής βλέπει τα ονόματα που δεν απάντησαν');

-- ───────────── Υπεύθυνος του Πελάτη (Πωλήσεις «με αφορά»): καμία γραμμή χωρίς Συνεργείο του ─────────────
select is(authz.today_count_crew_silent(public.t_uid('a3'), null, now()), 0,
  'Ο Υπεύθυνος του Πελάτη, χωρίς να είναι στο Συνεργείο ανοιχτό, δεν βλέπει την κάρτα');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_crew_silent(public.t_uid('a3'), null, now())) x),
  0, 'Ο Υπεύθυνος του Πελάτη δεν παίρνει ονόματα του Συνεργείου');

-- ───────────── Χρήστης πελάτη: καμία κάρτα ─────────────
select is(authz.today_count_crew_silent(public.t_uid('b1'), public.t_uid('c1'), now()), null,
  'Ο Χρήστης πελάτη δεν παίρνει κάρτα της ομάδας');

-- ───────────── Μητρώο: η κάρτα στη ζώνη αποφάσεων, με σύνδεσμο στα Γυρίσματα ─────────────
select is((select grp || '|' || kind || '|' || audience || '|' || link from public.today_cards where code = 'crew_silent'),
  'decide|action|team|/app/filming', 'Η κάρτα είναι στη ζώνη αποφάσεων, ως ενέργεια ομάδας, προς /app/filming');
select is((select sort || '|' || needs_second_person::text from public.today_cards where code = 'crew_silent'),
  '126|true', 'Η κάρτα έχει σειρά 126 και θέλει δεύτερο άνθρωπο (κανόνας 8)');

select * from finish();
rollback;
