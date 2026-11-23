-- Σήμερα: κάρτα «Υπογράφηκε» (agreement_signed). Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
-- Σταθερό p_now: 2026-03-10 10:00 UTC. Ο Ιδιοκτήτης έχει previous_seen_at 2026-03-08 10:00· η Πωλήσεις δεν έχει γραμμή
-- στο today_seen, άρα κοιτάει τις τελευταίες 3 μέρες (από 2026-03-07 10:00). Όλες οι στιγμές μακριά από τα όρια της μέρας.
begin;
select plan(32);

-- ───────────── Βοηθοί ─────────────
create function public.t_id(p_last text) returns uuid
language sql immutable as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;

create function public.t_ids(p_user text) returns text[]
language sql stable as $$
  select coalesce(array_agg(v ->> 'id' order by n), '{}')
    from jsonb_array_elements(authz.today_items_agreement_signed(public.t_id(p_user), null, timestamptz '2026-03-10 10:00+00'))
         with ordinality x (v, n);
$$;

create function public.t_item(p_user text, p_agreement text) returns jsonb
language sql stable as $$
  select v from jsonb_array_elements(authz.today_items_agreement_signed(public.t_id(p_user), null, timestamptz '2026-03-10 10:00+00'))
         x (v)
   where v ->> 'id' = public.t_id(p_agreement)::text;
$$;

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης (όλα) · a2 Παραγωγή (χωρίς Συμφωνίες) · a3 Πωλήσεις (μόνο «τα δικά μου») · b1 Χρήστης πελάτη του Πελάτη 1
insert into auth.users (id, email) values
  (public.t_id('a1'), 'owner@example.com'),
  (public.t_id('a2'), 'production@example.com'),
  (public.t_id('a3'), 'sales@example.com'),
  (public.t_id('b1'), 'client1-user@example.com');
insert into public.team_users (user_id, name, email) values
  (public.t_id('a1'), 'Γιώργος', 'owner@example.com'),
  (public.t_id('a2'), 'Πέτρος', 'production@example.com'),
  (public.t_id('a3'), 'Άννα', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values (public.t_id('a1'), 'Ιδιοκτήτης'),
               (public.t_id('a2'), 'Παραγωγή'),
               (public.t_id('a3'), 'Πωλήσεις')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Χωρίς triggers: μόνο ό,τι διαβάζουν οι κάρτες (οι Συμφωνίες και οι υπογραφές μπαίνουν ήδη στην τελική τους κατάσταση).
set session_replication_role = replica;

-- ───────────── Πελάτες, Ευκαιρίες, Συμφωνίες ─────────────
-- Πελάτες 1, 5, 7, 8 έχουν Υπεύθυνη την Άννα (a3)· τα υπόλοιπα τον Γιώργο (a1).
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  (public.t_id('c1'), 'Πελάτης 1 (τεστ)', 'Επαφή 1', 'client1@example.com', public.t_id('a3')),
  (public.t_id('c2'), 'Πελάτης 2 (τεστ)', 'Επαφή 2', 'client2@example.com', public.t_id('a1')),
  (public.t_id('c3'), 'Πελάτης 3 (τεστ)', 'Επαφή 3', 'client3@example.com', public.t_id('a1')),
  (public.t_id('c4'), 'Πελάτης 4 (τεστ)', 'Επαφή 4', 'client4@example.com', public.t_id('a1')),
  (public.t_id('c5'), 'Πελάτης 5 (τεστ)', 'Επαφή 5', 'client5@example.com', public.t_id('a3')),
  (public.t_id('c6'), 'Πελάτης 6 (τεστ)', 'Επαφή 6', 'client6@example.com', public.t_id('a1')),
  (public.t_id('c7'), 'Πελάτης 7 (τεστ)', 'Επαφή 7', 'client7@example.com', public.t_id('a3')),
  (public.t_id('c8'), 'Πελάτης 8 (τεστ)', 'Επαφή 8', 'client8@example.com', public.t_id('a3'));
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select public.t_id('c1'), public.t_id('b1'), 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

-- Μία Ευκαιρία ανά Συμφωνία. Η Ευκαιρία έχει τον ίδιο Υπεύθυνο με τον Πελάτη της.
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select public.t_id(x.oid), public.t_id(x.cid), 'Ευκαιρία ' || x.oid,
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       public.t_id(x.mgr), 'Επόμενο', date '2026-03-13'
  from (values ('d1', 'c1', 'a3'), ('d2', 'c2', 'a1'), ('d3', 'c3', 'a1'), ('d4', 'c4', 'a1'),
               ('d5', 'c5', 'a3'), ('d6', 'c6', 'a1'), ('d7', 'c7', 'a3'), ('d8', 'c8', 'a3')) as x (oid, cid, mgr);

-- Συμφωνίες σε υπογεγραμμένη κατάσταση (state <> proposal, path signed, signed_at σε στιγμή πριν το p_now).
insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, start_on, duration_months, end_on,
                               payment_days, unused_provisions, renewal, filming_notice_hours, filming_cancel_hours,
                               late_cancel_burns, no_show_burns, signed_at, created_at)
select public.t_id(x.gid), public.t_id(x.oid), 'monthly', x.title, x.state, 'signed', date '2026-03-20',
       date '2026-03-01', 6, date '2026-09-01', 15, 'lost', 'new_opportunity', 48, 48, false, false,
       timestamptz '2026-03-01 10:00+00', timestamptz '2026-02-20 10:00+00'
  from (values ('e1', 'd1', 'Μηνιαίο A', 'active'), ('e2', 'd2', 'Μηνιαίο B', 'active'),
               ('e3', 'd3', 'Μηνιαίο C', 'active'), ('e4', 'd4', 'Μηνιαίο D', 'active'),
               ('e5', 'd5', 'Μηνιαίο E', 'active'), ('e6', 'd6', 'Μηνιαίο F', 'expired'),
               ('e7', 'd7', 'Μηνιαίο G', 'active'), ('e8', 'd8', 'Μηνιαίο H', 'active')) as x (gid, oid, title, state);

-- Σύνδεσμος πρότασης για τη g3 (η υπογραφή με Σύνδεσμο θέλει γραμμή και τρόπο κωδικού).
insert into public.agreement_links (id, agreement_id, recipient_name, recipient_email, is_signatory, revision, token_hash)
values (public.t_id('f3'), public.t_id('e3'), 'Επαφή 3', 'client3@example.com', true, 1, 'tok-l3');

-- Υπογραφές: recorded_by = ποιος την κατέγραψε (null για υπογραφή του Πελάτη μέσω Συνδέσμου).
insert into public.agreement_signatures (agreement_id, method, signed_name, signed_on, recorded_at, recorded_by,
                                         link_id, otp_delivery, document_hash, reference) values
  (public.t_id('e1'), 'outside', 'Υπογράφων 1', date '2026-03-09', timestamptz '2026-03-09 09:00+00', public.t_id('a1'),
   null, null, 'hash-g1', 'Email 9/3'),
  (public.t_id('e2'), 'outside', 'Υπογράφων 2', date '2026-03-05', timestamptz '2026-03-05 10:00+00', public.t_id('a3'),
   null, null, 'hash-g2', 'Email 5/3'),
  (public.t_id('e3'), 'link', 'Υπογράφων 3', date '2026-03-09', timestamptz '2026-03-09 12:00+00', null,
   public.t_id('f3'), 'manual', 'hash-g3', ''),
  (public.t_id('e4'), 'outside', 'Υπογράφων 4', date '2026-03-11', timestamptz '2026-03-11 10:00+00', public.t_id('a1'),
   null, null, 'hash-g4', 'Email 11/3'),
  (public.t_id('e5'), 'outside', 'Υπογράφων 5', date '2026-03-09', timestamptz '2026-03-09 11:00+00', public.t_id('a3'),
   null, null, 'hash-g5', 'Email 9/3'),
  (public.t_id('e6'), 'outside', 'Υπογράφων 6', date '2026-03-09', timestamptz '2026-03-09 13:00+00', public.t_id('a2'),
   null, null, 'hash-g6', 'Email 9/3'),
  (public.t_id('e7'), 'outside', 'Υπογράφων 7', date '2026-03-06', timestamptz '2026-03-06 10:00+00', public.t_id('a1'),
   null, null, 'hash-g7', 'Email 6/3'),
  (public.t_id('e8'), 'outside', 'Υπογράφων 8', date '2026-03-08', timestamptz '2026-03-08 12:00+00', public.t_id('a2'),
   null, null, 'hash-g8', 'Email 8/3');

reset session_replication_role;

-- Ο Ιδιοκτήτης: seen_at 09:55 (λιγότερο από 30 λεπτά πριν το p_now), άρα το «από» είναι το previous_seen_at 2026-03-08 10:00.
-- Η Άννα δεν έχει γραμμή.
insert into public.today_seen (user_id, seen_at, previous_seen_at) values
  (public.t_id('a1'), timestamptz '2026-03-10 09:55+00', timestamptz '2026-03-08 10:00+00');

-- ───────────── Θετικό: ο Ιδιοκτήτης, από το previous_seen_at, νεότερα πρώτα ─────────────
select is(authz.today_count_agreement_signed(public.t_id('a1'), null, timestamptz '2026-03-10 10:00+00'), 4,
  'Ο Ιδιοκτήτης βλέπει τις τέσσερις υπογραφές μετά το previous_seen_at, χωρίς τη δική του');
select is(public.t_ids('a1'), array[public.t_id('e6')::text, public.t_id('e3')::text, public.t_id('e5')::text, public.t_id('e8')::text],
  'Η σειρά είναι η πιο πρόσφατη υπογραφή πρώτη');
select is(public.t_item('a1', 'e3') ->> 'title', 'Πελάτης 3 (τεστ)', 'Ο τίτλος της γραμμής είναι το όνομα του Πελάτη');
select is(public.t_item('a1', 'e3') ->> 'subtitle', 'Μηνιαίο C · Υπογραφή με Σύνδεσμο',
  'Ο υπότιτλος της υπογραφής με Σύνδεσμο λέει τον τρόπο, χωρίς ημερομηνία');
select is(public.t_item('a1', 'e6') ->> 'subtitle', 'Μηνιαίο F · Υπογραφή εκτός συστήματος',
  'Ο υπότιτλος της υπογραφής εκτός συστήματος λέει τον τρόπο');
select is((public.t_item('a1', 'e6') ->> 'at')::timestamptz, timestamptz '2026-03-09 13:00+00',
  'Η ώρα της γραμμής είναι η στιγμή της υπογραφής');
select is(public.t_item('a1', 'e3') ->> 'link', '/app/agreements/' || public.t_id('e3')::text,
  'Η γραμμή ανοίγει τη Συμφωνία');
select is((select bool_and((v ->> 'urgent')::boolean)
             from jsonb_array_elements(authz.today_items_agreement_signed(public.t_id('a1'), null, timestamptz '2026-03-10 10:00+00')) x (v)),
  false, 'Καμία γραμμή δεν είναι επείγουσα');

-- ───────────── Όριο: έως δύο γραμμές, το πλήθος μένει ολόκληρο ─────────────
select set_config('today.rows', '2', true);
select is(jsonb_array_length(authz.today_items_agreement_signed(public.t_id('a1'), null, timestamptz '2026-03-10 10:00+00')), 2,
  'Το όριο γραμμών κόβει στις δύο πρώτες');
select is(authz.today_count_agreement_signed(public.t_id('a1'), null, timestamptz '2026-03-10 10:00+00'), 4,
  'Το πλήθος μένει ολόκληρο πίσω από το όριο');
select set_config('today.rows', '', true);

-- ───────────── Εξαιρέσεις: παράθυρο, μελλοντικές, δική μου καταχώριση ─────────────
select ok(not (public.t_id('e1')::text = any(public.t_ids('a1'))), 'Ο Ιδιοκτήτης δεν βλέπει την υπογραφή που κατέγραψε ο ίδιος');
set session_replication_role = replica;
update public.agreement_signatures set recorded_at = timestamptz '2026-03-08 10:00+00' where agreement_id = public.t_id('e2');
reset session_replication_role;
select ok(not (public.t_id('e2')::text = any(public.t_ids('a1'))), 'Υπογραφή ακριβώς στο previous_seen_at δεν μπαίνει (αυστηρό όριο)');
select ok(not (public.t_id('e7')::text = any(public.t_ids('a1'))), 'Δεύτερη υπογραφή πριν από το previous_seen_at δεν μπαίνει');
select ok(public.t_id('e8')::text = any(public.t_ids('a1')), 'Υπογραφή μετά το previous_seen_at μπαίνει');
select ok(not (public.t_id('e4')::text = any(public.t_ids('a1'))), 'Υπογραφή με στιγμή μετά το p_now δεν μπαίνει');

-- ───────────── Εύρος «τα δικά μου»: Πωλήσεις, χωρίς γραμμή στο today_seen (3 μέρες) ─────────────
select is(authz.today_count_agreement_signed(public.t_id('a3'), null, timestamptz '2026-03-10 10:00+00'), 2,
  'Η Πωλήσεις βλέπει μόνο τις υπογραφές των δικών της Συμφωνιών μέσα στις 3 μέρες');
select is(public.t_ids('a3'), array[public.t_id('e1')::text, public.t_id('e8')::text],
  'Η Πωλήσεις βλέπει μόνο τις δικές της, νεότερες πρώτα');
select ok(not (public.t_id('e5')::text = any(public.t_ids('a3'))), 'Η Πωλήσεις δεν βλέπει τη δική της καταχώριση (recorded_by = p_uid)');
select ok(not (public.t_id('e7')::text = any(public.t_ids('a3'))), 'Χωρίς γραμμή στο today_seen: υπογραφή πάνω από 3 μέρες δεν μπαίνει');
set session_replication_role = replica;
update public.agreement_signatures set recorded_at = timestamptz '2026-03-07 10:00+00' where agreement_id = public.t_id('e7');
reset session_replication_role;
select ok(not (public.t_id('e7')::text = any(public.t_ids('a3'))), 'Υπογραφή ακριβώς στις 3 μέρες δεν μπαίνει (αυστηρό όριο)');

-- ───────────── Παράθυρο: seen_at πάνω από 30 λεπτά πριν (όχι previous_seen_at) ─────────────
-- seen_at 08:00 (2 ώρες πριν το p_now): το «από» είναι το seen_at. Η g4 (μελλοντική) γίνεται υπογραφή 08:30 του Χρήστη a2.
update public.today_seen set seen_at = timestamptz '2026-03-10 08:00+00' where user_id = public.t_id('a1');
set session_replication_role = replica;
update public.agreement_signatures set recorded_at = timestamptz '2026-03-10 08:30+00', recorded_by = public.t_id('a2')
 where agreement_id = public.t_id('e4');
reset session_replication_role;
select is(authz.today_count_agreement_signed(public.t_id('a1'), null, timestamptz '2026-03-10 10:00+00'), 1,
  'Μετά από 30 λεπτά μετράει από το seen_at: μόνο η υπογραφή μετά από αυτό');
select ok(public.t_id('e4')::text = any(public.t_ids('a1')), 'Η υπογραφή μετά το seen_at μπαίνει');
select ok(not (public.t_id('e3')::text = any(public.t_ids('a1'))),
  'Υπογραφή ανάμεσα στο previous_seen_at και στο seen_at δεν μπαίνει');
select ok(not (public.t_id('e8')::text = any(public.t_ids('a1'))),
  'Δεύτερη υπογραφή ανάμεσα στο previous_seen_at και στο seen_at δεν μπαίνει');
set session_replication_role = replica;
update public.agreement_signatures set recorded_at = timestamptz '2026-03-10 08:00+00' where agreement_id = public.t_id('e4');
reset session_replication_role;
select is(authz.today_count_agreement_signed(public.t_id('a1'), null, timestamptz '2026-03-10 10:00+00'), 0,
  'Υπογραφή ακριβώς στο seen_at δεν μπαίνει (αυστηρό όριο)');

-- ───────────── Χωρίς Δικαίωμα ή Χρήστης πελάτη: null και 42501 ─────────────
select is(authz.today_count_agreement_signed(public.t_id('a2'), null, timestamptz '2026-03-10 10:00+00'), null,
  'Η Παραγωγή (χωρίς Συμφωνίες) δεν παίρνει κάρτα');
select throws_ok($$ select authz.today_items_agreement_signed(public.t_id('a2'), null, timestamptz '2026-03-10 10:00+00') $$,
  '42501', null, 'Οι γραμμές δεν δίνονται σε όποιον δεν βλέπει Συμφωνίες');
select is(authz.today_count_agreement_signed(public.t_id('b1'), null, timestamptz '2026-03-10 10:00+00'), null,
  'Ο Χρήστης πελάτη δεν παίρνει κάρτα');
select throws_ok($$ select authz.today_items_agreement_signed(public.t_id('b1'), null, timestamptz '2026-03-10 10:00+00') $$,
  '42501', null, 'Ο Χρήστης πελάτη δεν παίρνει γραμμές');
select is(authz.today_count_agreement_signed(public.t_id('a1'), public.t_id('c1'), timestamptz '2026-03-10 10:00+00'), null,
  'Η κάρτα δεν εμφανίζεται στο πλαίσιο Πελάτη');
select throws_ok($$ select authz.today_items_agreement_signed(public.t_id('a1'), public.t_id('c1'), timestamptz '2026-03-10 10:00+00') $$,
  '42501', null, 'Στο πλαίσιο Πελάτη οι γραμμές δεν δίνονται');

-- ───────────── Μητρώο: ομάδα «δουλειά», ενέργεια, προς τις Συμφωνίες ─────────────
select is((select grp || '|' || kind || '|' || audience || '|' || link from public.today_cards where code = 'agreement_signed'),
  'work|action|team|/app/clients', 'Η κάρτα είναι στην ομάδα «δουλειά», ως ενέργεια ομάδας');

select * from finish();
rollback;
