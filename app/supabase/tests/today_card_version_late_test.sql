-- Σήμερα: κάρτα «Αργεί η Έκδοση» (version_late). Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
-- Όλες οι ημερομηνίες είναι σχετικές με τη σημερινή μέρα της Αθήνας, ώστε το τεστ να μην εξαρτάται από ημερομηνία ή τέλος μήνα.
begin;
select plan(26);

-- ───────────── Βοηθοί ─────────────
create function public.t_uid(p_last text) returns uuid
language sql immutable as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;
create function public.t_did(p_last text) returns text
language sql immutable as $$ select '00000000-0000-0000-0000-00000000dd' || p_last; $$;
-- Η σημερινή μέρα της Αθήνας +p_offset μέρες.
create function public.t_date(p_offset integer) returns date
language sql stable as $$ select (now() at time zone 'Europe/Athens')::date + p_offset; $$;

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης (όλα) · a2 Παραγωγή, μέλος της d1 · a3 Πωλήσεις (χωρίς Παραδοτέα) · a4 Λογιστής (χωρίς Παραδοτέα)
-- a5 Παραγωγή, μέλος της d2 (υπεύθυνη των περισσότερων, άρα δεν βλέπει τη δική της καθυστέρηση)
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

-- ───────────── Δεδομένα (χωρίς triggers: μόνο ό,τι διαβάζουν οι κάρτες· το ίχνος γράφεται χειροκίνητα) ─────────────
set session_replication_role = replica;

insert into public.productions (id, title, client_id, agreement_id, owner_id, state, delivered_at, delivered_note) values
  ('00000000-0000-0000-0000-0000000000d1', 'Εσωτερικό showreel', null, null, '00000000-0000-0000-0000-0000000000a1', 'open', null, null),
  ('00000000-0000-0000-0000-0000000000d3', 'Παραδομένο έργο', null, null, '00000000-0000-0000-0000-0000000000a1', 'delivered', now() - interval '20 days', 'Παραδόθηκε'),
  ('00000000-0000-0000-0000-0000000000d2', 'Εσωτερικό podcast', null, null, '00000000-0000-0000-0000-0000000000a1', 'open', null, null);
insert into public.production_members (production_id, user_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000a5');

-- dd01 σε d2, αύριο, χωρίς Έκδοση, υπεύθυνη η Σοφία (μόνο η d2 τη βλέπει)
-- dd02 αύριο, χωρίς Έκδοση · dd03 αύριο, ανατέθηκε ξανά πριν 2 μέρες, η Έκδοση είναι πριν την ανάθεση (μετράει)
-- dd04 αύριο, υπεύθυνος ο Ιδιοκτήτης (ο ίδιος δεν τη βλέπει) · dd05 σήμερα · dd06 χθες (πέρασε)
-- dd07 ακυρωμένο · dd08 εγκεκριμένο · dd09 σε 2 μέρες · dd10 Έκδοση μετά την ανάθεση (δεν μετράει)
-- dd11 χωρίς ίχνος ανάθεσης: η created_at είναι η ανάθεση, η Έκδοση είναι πριν από αυτήν (μετράει)
insert into public.deliverables (id, production_id, kind_id, title, charge, assignee_id, deadline,
                                 cancelled_at, cancel_reason, cancel_outcome, approved_at, created_at) values
  (public.t_did('01')::uuid, '00000000-0000-0000-0000-0000000000d2', (select k.id from public.provision_kinds k where k.code = 'reel'),
   'Podcast επεισόδιο 1', 'included', '00000000-0000-0000-0000-0000000000a5', public.t_date(1), null, null, null, null, now() - interval '10 days'),
  (public.t_did('02')::uuid, '00000000-0000-0000-0000-0000000000d1', (select k.id from public.provision_kinds k where k.code = 'reel'),
   'Reel Α', 'included', '00000000-0000-0000-0000-0000000000a5', public.t_date(1), null, null, null, null, now() - interval '10 days'),
  (public.t_did('03')::uuid, '00000000-0000-0000-0000-0000000000d1', (select k.id from public.provision_kinds k where k.code = 'reel'),
   'Reel Β', 'included', '00000000-0000-0000-0000-0000000000a5', public.t_date(1), null, null, null, null, now() - interval '10 days'),
  (public.t_did('04')::uuid, '00000000-0000-0000-0000-0000000000d1', (select k.id from public.provision_kinds k where k.code = 'reel'),
   'Reel Γ', 'included', '00000000-0000-0000-0000-0000000000a1', public.t_date(1), null, null, null, null, now() - interval '10 days'),
  (public.t_did('05')::uuid, '00000000-0000-0000-0000-0000000000d1', (select k.id from public.provision_kinds k where k.code = 'reel'),
   'Reel Δ', 'included', '00000000-0000-0000-0000-0000000000a5', public.t_date(0), null, null, null, null, now() - interval '10 days'),
  (public.t_did('06')::uuid, '00000000-0000-0000-0000-0000000000d1', (select k.id from public.provision_kinds k where k.code = 'reel'),
   'Reel Ε', 'included', '00000000-0000-0000-0000-0000000000a5', public.t_date(-1), null, null, null, null, now() - interval '10 days'),
  (public.t_did('07')::uuid, '00000000-0000-0000-0000-0000000000d1', (select k.id from public.provision_kinds k where k.code = 'reel'),
   'Reel ΣΤ', 'included', '00000000-0000-0000-0000-0000000000a5', public.t_date(1), now(), 'Αλλαγή σχεδίου', 'consumed', null, now() - interval '10 days'),
  (public.t_did('08')::uuid, '00000000-0000-0000-0000-0000000000d1', (select k.id from public.provision_kinds k where k.code = 'reel'),
   'Reel Ζ', 'included', '00000000-0000-0000-0000-0000000000a5', public.t_date(0), null, null, null, now(), now() - interval '10 days'),
  (public.t_did('09')::uuid, '00000000-0000-0000-0000-0000000000d1', (select k.id from public.provision_kinds k where k.code = 'reel'),
   'Reel Η', 'included', '00000000-0000-0000-0000-0000000000a5', public.t_date(2), null, null, null, null, now() - interval '10 days'),
  (public.t_did('10')::uuid, '00000000-0000-0000-0000-0000000000d1', (select k.id from public.provision_kinds k where k.code = 'reel'),
   'Reel Θ', 'included', '00000000-0000-0000-0000-0000000000a5', public.t_date(1), null, null, null, null, now() - interval '10 days'),
  (public.t_did('11')::uuid, '00000000-0000-0000-0000-0000000000d1', (select k.id from public.provision_kinds k where k.code = 'reel'),
   'Reel Ι', 'included', '00000000-0000-0000-0000-0000000000a5', public.t_date(1), null, null, null, null, now() - interval '10 days'),
  (public.t_did('12')::uuid, '00000000-0000-0000-0000-0000000000d3', (select k.id from public.provision_kinds k where k.code = 'reel'),
   'Reel Κ', 'included', '00000000-0000-0000-0000-0000000000a5', public.t_date(1), null, null, null, null, now() - interval '10 days'),
  (public.t_did('13')::uuid, '00000000-0000-0000-0000-0000000000d1', (select k.id from public.provision_kinds k where k.code = 'reel'),
   'Reel Λ', 'included', '00000000-0000-0000-0000-0000000000a5', null, null, null, null, null, now() - interval '10 days');

-- Το ίχνος των αναθέσεων: dd03 πήγε από τον Πέτρο στη Σοφία πριν 2 μέρες· dd10 στη Σοφία πριν 3 μέρες.
insert into public.audit_log (at, actor_id, action, entity, entity_id, before, after) values
  (now() - interval '10 days', null, 'insert', 'deliverables', public.t_did('03'), null,
   jsonb_build_object('assignee_id', '00000000-0000-0000-0000-0000000000a2')),
  (now() - interval '2 days', null, 'update', 'deliverables', public.t_did('03'),
   jsonb_build_object('assignee_id', '00000000-0000-0000-0000-0000000000a2'),
   jsonb_build_object('assignee_id', '00000000-0000-0000-0000-0000000000a5')),
  (now() - interval '3 days', null, 'insert', 'deliverables', public.t_did('10'), null,
   jsonb_build_object('assignee_id', '00000000-0000-0000-0000-0000000000a5'));

insert into public.deliverable_versions (deliverable_id, number, url, host, state, created_at) values
  (public.t_did('03')::uuid, 1, 'https://example.com/dd03/v1', 'example.com', 'in_review', now() - interval '5 days'),
  (public.t_did('10')::uuid, 1, 'https://example.com/dd10/v1', 'example.com', 'in_review', now() - interval '1 day'),
  (public.t_did('11')::uuid, 1, 'https://example.com/dd11/v1', 'example.com', 'in_review', now() - interval '20 days');

reset session_replication_role;

-- ───────────── Θετικό: ο Ιδιοκτήτης βλέπει τις έξι καθυστερημένες, χωρίς τη δική του ─────────────
select is(authz.today_count_version_late(public.t_uid('a1'), null, now()), 6,
  'Ο Ιδιοκτήτης βλέπει τις 6 καθυστερημένες Εκδόσεις (χωρίς την dd04 που έχει ο ίδιος)');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a1'), null, now())) x),
  6, 'Οι γραμμές είναι ένα ανά Παραδοτέο');

-- ───────────── Σειρά: η πιο παλιά προθεσμία πρώτη, και ισοπαλία με id ─────────────
select is((select array_agg(v ->> 'id' order by n)
             from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a1'), null, now())) with ordinality x (v, n)),
  array[public.t_did('06'), public.t_did('05'), public.t_did('01'), public.t_did('02'), public.t_did('03'), public.t_did('11')],
  'Η σειρά είναι προθεσμία και μετά id');

-- ───────────── Γραμμή: υπεύθυνος και προθεσμία στο υπότιτλο, σύνδεσμος στο Παραδοτέο, επείγον ─────────────
select is((select v ->> 'subtitle' from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_did('02')),
  'Υπεύθυνος: Σοφία · προθεσμία ' || to_char(public.t_date(1), 'DD/MM'),
  'Ο υπότιτλος λέει τον υπεύθυνο και την προθεσμία');
select is((select v ->> 'link' from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_did('02')),
  '/app/deliverables/' || public.t_did('02'), 'Η γραμμή ανοίγει το Παραδοτέο');
select is((select (v ->> 'urgent')::boolean from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_did('02')), true, 'Προθεσμία αύριο είναι επείγουσα (κανόνας 5)');

-- ───────────── Αποκλεισμοί ─────────────
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_did('07')), 0, 'Ακυρωμένο Παραδοτέο δεν μπαίνει');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_did('08')), 0, 'Εγκεκριμένο Παραδοτέο δεν μπαίνει');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_did('09')), 0, 'Προθεσμία σε 2 μέρες δεν μπαίνει');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_did('10')), 0, 'Έκδοση μετά την ανάθεση: δεν μπαίνει');

-- ───────────── Ανάθεση που ξαναγίνεται: η Έκδοση πριν τη νέα ανάθεση δεν μετράει, άρα μπαίνει ─────────────
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_did('03')), 1,
  'Η Έκδοση πριν από την τελευταία ανάθεση δεν μετράει, άρα το Παραδοτέο μπαίνει');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_did('11')), 1,
  'Χωρίς ίχνος ανάθεσης, η created_at μετράει ως ανάθεση· η Έκδοση πριν από αυτήν δεν μετράει');

-- ───────────── Κλειστή Παραγωγή και χωρίς προθεσμία: δεν μπαίνουν ─────────────
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_did('12')), 0, 'Παραδοτέο σε παραδομένη Παραγωγή δεν μπαίνει');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_did('13')), 0, 'Παραδοτέο χωρίς προθεσμία δεν μπαίνει');

-- ───────────── Ο υπεύθυνος δεν βλέπει τη δική του καθυστέρηση ─────────────
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_did('04')), 0, 'Ο Ιδιοκτήτης, υπεύθυνος της dd04, δεν τη βλέπει');
select is(authz.today_count_version_late(public.t_uid('a5'), null, now()), 0,
  'Η Σοφία, υπεύθυνη της μόνης καθυστέρησης που βλέπει (dd01), δεν βλέπει τίποτα');

-- ───────────── Ορατότητα «με αφορά»: η Παραγωγή βλέπει μόνο τις Παραγωγές της ─────────────
select is(authz.today_count_version_late(public.t_uid('a2'), null, now()), 6,
  'Το Μέλος της d1 βλέπει τις καθυστερημένες της d1, συμπεριλαμβανομένης της dd04');
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a2'), null, now())) x (v)
            where v ->> 'id' = public.t_did('01')), 0, 'Το Μέλος της d1 δεν βλέπει το Παραδοτέο της d2');

-- ───────────── Χωρίς Δικαίωμα: Πωλήσεις και Λογιστής ─────────────
select is(authz.today_count_version_late(public.t_uid('a3'), null, now()), null,
  'Η Πωλήσεις δεν έχει Παραδοτέα και δεν παίρνει κάρτα');
select throws_ok($$ select authz.today_items_version_late('00000000-0000-0000-0000-0000000000a3', null, now()) $$,
  '42501', null, 'Οι γραμμές δεν δίνονται σε όποιον δεν βλέπει Παραδοτέα');
select is(authz.today_count_version_late(public.t_uid('a4'), null, now()), null,
  'Ο Λογιστής δεν παίρνει κάρτα');
select is(authz.today_count_version_late(public.t_uid('a1'), public.t_uid('c1'), now()), null,
  'Η κάρτα δεν εμφανίζεται στο πλαίσιο Πελάτη');

-- ───────────── Μητρώο ─────────────
select is((select grp || '|' || kind || '|' || audience || '|' || link from public.today_cards where code = 'version_late'),
  'decide|action|team|/app/deliverables', 'Η κάρτα είναι στη ζώνη αποφάσεων, ως ενέργεια ομάδας, προς /app/deliverables');
select ok((select needs_second_person from public.today_cards where code = 'version_late'),
  'Η κάρτα θέλει δεύτερο άνθρωπο (κανόνας 8), όπως οι συγγενικές του Συνεργείου');

-- ───────────── Όριο: έως δέκα γραμμές, το πλήθος δεν περικόπτεται ─────────────
select set_config('today.rows', '2', true);
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_version_late(public.t_uid('a1'), null, now())) x (v)),
  2, 'Το όριο γραμμών κόβει τις γραμμές στο όριο');
select is(authz.today_count_version_late(public.t_uid('a1'), null, now()), 6, 'Το πλήθος μένει ολόκληρο πίσω από το όριο');

select * from finish();
rollback;
