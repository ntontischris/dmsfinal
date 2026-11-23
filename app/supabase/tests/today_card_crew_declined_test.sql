-- Σήμερα: κάρτα «Βρες αντικαταστάτη» (crew_declined). Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
-- Όλες οι ημερομηνίες είναι σχετικές με τη σημερινή μέρα της Αθήνας, ώστε το τεστ να μην εξαρτάται από ημερομηνία ή τέλος μήνα.
begin;
select plan(16);

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
-- a1 Ιδιοκτήτης (όλα τα Γυρίσματα) · a2 Παραγωγή (μόνο «με αφορά») · a3 Πωλήσεις (άλλο μέλος που αρνήθηκε)
-- a4 Λογιστής (χωρίς «Βλέπει Γυρίσματα») · a5 Παραγωγή, μέλος της Παραγωγής d1 · b1 Χρήστης πελάτη
-- a3 είναι Υπεύθυνος του Πελάτη c1 (όχι στο Συνεργείο του f6)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'member@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr');
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
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

-- Παραγωγή d1 και d2, ιδιοκτήτης ο a1 (ο a2 δεν είναι μέλος τους)
insert into public.productions (id, title, client_id, agreement_id, owner_id, state, delivered_at, delivered_note) values
  ('00000000-0000-0000-0000-0000000000d1', 'Εσωτερικό showreel', null, null, '00000000-0000-0000-0000-0000000000a1', 'open', null, null),
  ('00000000-0000-0000-0000-0000000000d2', 'Εσωτερικό podcast', null, null, '00000000-0000-0000-0000-0000000000a1', 'open', null, null);

-- f1: σε 2 μέρες, δύο μέλη αρνήθηκαν (επείγον) · f2: σε 3 μέρες, ένα μέλος αρνήθηκε (όχι επείγον)
-- f3: χθες (πέρασε) · f4: σε 2 μέρες αλλά ακυρωμένο · f5: σε 4 μέρες, μόνο «αναμένει» (καμία άρνηση)
-- f6: σε 5 μέρες, Πελάτης c1 (υπεύθυνος a3), άρνηση μέλους που ο a3 δεν είναι στο Συνεργείο
insert into public.production_members (production_id, user_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a5');

insert into public.filmings (id, production_id, client_id, starts_at, hours, location, origin, state, is_extra,
                             cancelled_at, cancelled_side) values
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1',
   public.t_day_at(5), 2, 'Κατάστημα', 'team', 'scheduled', true, null, null),
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000000d2', null,
   public.t_day_at(3), 2, 'Στούντιο Β', 'team', 'scheduled', false, null, null),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', null,
   public.t_day_at(2), 2, 'Στούντιο Α', 'team', 'scheduled', false, null, null),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000d2', null,
   public.t_day_at(3), 2, 'Στούντιο Β', 'team', 'scheduled', false, null, null),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000d1', null,
   public.t_day_at(-1), 2, 'Στούντιο Α', 'team', 'scheduled', false, null, null),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000d1', null,
   public.t_day_at(2), 2, 'Στούντιο Α', 'team', 'cancelled', false, now(), 'team'),
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000d1', null,
   public.t_day_at(4), 2, 'Στούντιο Α', 'team', 'pending', false, null, null);

insert into public.filming_crew (filming_id, user_id, response, reason, responded_at) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'declined', 'Άλλη υποχρέωση', now()),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a3', 'declined', 'Ταξίδι', now()),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a3', 'declined', 'Ταξίδι', now()),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000a2', 'declined', 'Άρρωστος', now()),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000a2', 'declined', 'Άρρωστος', now()),
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000a2', 'pending', null, null),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000a2', 'declined', 'Άλλη υποχρέωση', now()),
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000000a1', 'declined', 'Ταξίδι', now());

reset session_replication_role;

-- ───────────── Θετικό: ο Ιδιοκτήτης βλέπει τα δύο μελλοντικά Γυρίσματα με άρνηση ─────────────
select is(authz.today_count_crew_declined(public.t_uid('a1'), null, now()), 3,
  'Ο Ιδιοκτήτης βλέπει τα 3 μελλοντικά Γυρίσματα με άρνηση (χωρίς το παρελθόν, το ακυρωμένο και το «αναμένει»)');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_crew_declined(public.t_uid('a1'), null, now())) x),
  3, 'Οι γραμμές είναι ένα ανά Γύρισμα και όχι ανά άτομο');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_crew_declined(public.t_uid('a1'), null, now())) x
            where x ->> 'id' in (public.t_fid('f1'), public.t_fid('f2'))), 2,
  'Οι δύο γραμμές είναι τα Γυρίσματα f1 και f2');
select is((select x ->> 'subtitle' from jsonb_array_elements(authz.today_items_crew_declined(public.t_uid('a1'), null, now())) x
            where x ->> 'id' = public.t_fid('f1')),
  'Δήλωσε «δεν μπορώ»: Άννα, Πέτρος', 'Η γραμμή λέει ποιοι αρνήθηκαν, με τα ονόματα της ομάδας και σε σειρά');
select is((select x ->> 'link' from jsonb_array_elements(authz.today_items_crew_declined(public.t_uid('a1'), null, now())) x
            where x ->> 'id' = public.t_fid('f1')),
  '/app/filming/' || public.t_fid('f1'), 'Η γραμμή ανοίγει το Γύρισμα');

-- ───────────── Όριο: ≤ 2 μέρες επείγον, 3+ μέρες όχι ─────────────
select is((select (x ->> 'urgent')::boolean from jsonb_array_elements(authz.today_items_crew_declined(public.t_uid('a1'), null, now())) x
            where x ->> 'id' = public.t_fid('f1')), true, 'Γύρισμα σε 2 μέρες είναι επείγον');
select is((select (x ->> 'urgent')::boolean from jsonb_array_elements(authz.today_items_crew_declined(public.t_uid('a1'), null, now())) x
            where x ->> 'id' = public.t_fid('f2')), false, 'Γύρισμα σε 3 μέρες δεν είναι επείγον');

-- ───────────── Ορατότητα «με αφορά»: η Παραγωγή βλέπει μόνο το Γύρισμα του Συνεργείου της ─────────────
-- Ο Πέτρος αρνήθηκε τα f1, f3, f4 και f6 και δεν είναι στο Συνεργείο κανενός ανοιχτού· δεν βλέπει την κάρτα για τη δική του άρνηση.
select is(authz.today_count_crew_declined(public.t_uid('a2'), null, now()), 0,
  'Ο αρνητής δεν βλέπει την κάρτα για τη δική του άρνηση');
select is(authz.today_count_crew_declined(public.t_uid('a5'), null, now()), 1,
  'Μέλος της Παραγωγής (με αφορά) βλέπει τα Γυρίσματα της Παραγωγής του, μόνο το ανοιχτό με άρνηση');

-- ───────────── Υπεύθυνος του Πελάτη (Πωλήσεις «με αφορά»): καμία γραμμή χωρίς Συνεργείο του ─────────────
select is(authz.today_count_crew_declined(public.t_uid('a3'), null, now()), 0,
  'Ο Υπεύθυνος του Πελάτη, χωρίς να είναι στο Συνεργείο, δεν βλέπει την κάρτα');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_crew_declined(public.t_uid('a3'), null, now())) x),
  0, 'Ο Υπεύθυνος του Πελάτη δεν παίρνει ονόματα του Συνεργείου');

-- ───────────── Άρνηση: χωρίς «Βλέπει Γυρίσματα» και πελάτης: καμία κάρτα ─────────────
select is(authz.today_count_crew_declined(public.t_uid('a4'), null, now()), null,
  'Ο Λογιστής (χωρίς Γυρίσματα) δεν παίρνει κάρτα');
select throws_ok($$ select authz.today_items_crew_declined('00000000-0000-0000-0000-0000000000a4', null, now()) $$,
  '42501', null, 'Οι γραμμές δεν δίνονται σε όποιον δεν βλέπει Γυρίσματα');
select is(authz.today_count_crew_declined(public.t_uid('b1'), public.t_uid('c1'), now()), null,
  'Ο Χρήστης πελάτη δεν παίρνει κάρτα της ομάδας');

-- ───────────── Μητρώο: η κάρτα στη ζώνη αποφάσεων, με σύνδεσμο στα Γυρίσματα ─────────────
select is((select grp || '|' || kind || '|' || audience || '|' || link from public.today_cards where code = 'crew_declined'),
  'decide|action|team|/app/filming', 'Η κάρτα είναι στη ζώνη αποφάσεων, ως ενέργεια ομάδας, προς /app/filming');

-- ───────────── Ο ίδιος ο Χρήστης: η δική του άρνηση δεν μπαίνει στη γραμμή του ─────────────
-- Ο Ιδιοκτήτης αρνήθηκε μόνος του το f7 (μελλοντικό)· δεν βλέπει τη δική του άρνηση.
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_crew_declined(public.t_uid('a1'), null, now())) x
            where x ->> 'id' = public.t_fid('f7')), 0,
  'Ο Ιδιοκτήτης δεν βλέπει το Γύρισμα όπου η μόνη άρνηση είναι η δική του');

select * from finish();
rollback;
