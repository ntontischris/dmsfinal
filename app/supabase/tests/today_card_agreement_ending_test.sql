-- Σήμερα: κάρτα «Λήγει η Συμφωνία» (agreement_ending). Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
-- Οι ημερομηνίες είναι σχετικές με το σήμερα της Αθήνας και μακριά από τα όρια (3, 12, 20, 40 μέρες· −3 για το παρελθόν).
begin;
select plan(26);

-- ───────────── Βοηθοί ─────────────
create function public.t_id(p_last text) returns uuid
language sql immutable as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;

create function public.t_ids(p_user text) returns text[]
language sql stable as $$
  select coalesce(array_agg(v ->> 'id' order by n), '{}')
    from jsonb_array_elements(authz.today_items_agreement_ending(public.t_id(p_user), null, now())) with ordinality x (v, n);
$$;

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης (όλα) · a2 Παραγωγή (χωρίς Συμφωνίες) · a3 Πωλήσεις (μόνο «τα δικά μου»)
insert into auth.users (id, email) values
  (public.t_id('a1'), 'owner@example.com'),
  (public.t_id('a2'), 'production@example.com'),
  (public.t_id('a3'), 'sales@example.com');
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

-- Χωρίς triggers: μόνο ό,τι διαβάζουν οι κάρτες (οι Συμφωνίες μπαίνουν ήδη στην τελική τους κατάσταση).
set session_replication_role = replica;

-- ───────────── Πελάτες και Ευκαιρίες ─────────────
-- c1 (Υπεύθυνος η Άννα) · τα υπόλοιπα (Υπεύθυνος ο Γιώργος)
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  (public.t_id('c1'), 'Πελάτης 1 (τεστ)', 'Επαφή 1', 'client1@example.com', public.t_id('a3')),
  (public.t_id('c2'), 'Πελάτης 2 (τεστ)', 'Επαφή 2', 'client2@example.com', public.t_id('a1')),
  (public.t_id('c3'), 'Πελάτης 3 (τεστ)', 'Επαφή 3', 'client3@example.com', public.t_id('a1')),
  (public.t_id('c4'), 'Πελάτης 4 (τεστ)', 'Επαφή 4', 'client4@example.com', public.t_id('a1')),
  (public.t_id('c5'), 'Πελάτης 5 (τεστ)', 'Επαφή 5', 'client5@example.com', public.t_id('a1')),
  (public.t_id('c6'), 'Πελάτης 6 (τεστ)', 'Επαφή 6', 'client6@example.com', public.t_id('a1')),
  (public.t_id('c7'), 'Πελάτης 7 (τεστ)', 'Επαφή 7', 'client7@example.com', public.t_id('a1')),
  (public.t_id('c8'), 'Πελάτης 8 (τεστ)', 'Επαφή 8', 'client8@example.com', public.t_id('a1')),
  (public.t_id('c9'), 'Πελάτης 9 (τεστ)', 'Επαφή 9', 'client9@example.com', public.t_id('a1')),
  (public.t_id('ca'), 'Πελάτης 10 (τεστ)', 'Επαφή 10', 'client10@example.com', public.t_id('a1')),
  (public.t_id('cb'), 'Πελάτης 11 (τεστ)', 'Επαφή 11', 'client11@example.com', public.t_id('a1')),
  (public.t_id('cc'), 'Πελάτης 12 (τεστ)', 'Επαφή 12', 'client12@example.com', public.t_id('a1')),
  (public.t_id('cd'), 'Πελάτης 13 (τεστ)', 'Επαφή 13', 'client13@example.com', public.t_id('a1'));

-- Μία Ευκαιρία ανά Συμφωνία: e1 (Υπεύθυνος η Άννα), τα υπόλοιπα ο Γιώργος.
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select public.t_id(x.oid), public.t_id(x.cid), x.title,
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       public.t_id(x.mgr), 'Επόμενο', (now() at time zone 'Europe/Athens')::date + 3
  from (values ('e1', 'c1', 'Ευκαιρία 1', 'a3'), ('e2', 'c2', 'Ευκαιρία 2', 'a1'), ('e3', 'c3', 'Ευκαιρία 3', 'a1'),
               ('e4', 'c4', 'Ευκαιρία 4', 'a1'), ('e5', 'c5', 'Ευκαιρία 5', 'a1'), ('e6', 'c6', 'Ευκαιρία 6', 'a1'),
               ('e7', 'c7', 'Ευκαιρία 7', 'a1'), ('e8', 'c8', 'Ευκαιρία 8', 'a1'), ('e9', 'c9', 'Ευκαιρία 9', 'a1'),
               ('ea', 'ca', 'Ευκαιρία 10', 'a1'), ('eb', 'cb', 'Ευκαιρία 11', 'a1'), ('ec', 'cb', 'Ευκαιρία 12', 'a1'),
               ('ed', 'cc', 'Ευκαιρία 13', 'a1'), ('ee', 'cd', 'Ευκαιρία 14', 'a1'),
               ('ef', 'cd', 'Ευκαιρία 15', 'a1')) as x (oid, cid, title, mgr);

-- ───────────── Συμφωνίες (άμεσες εγγραφές στην τελική κατάσταση, χωρίς triggers) ─────────────
-- f1 ενεργή, λήγει σε 12 μέρες, νέα Ευκαιρία (ορατή στην Άννα) · f2 ενεργή, αυτόματη με «Χωρίς συνέχιση», σε 3 μέρες
-- f3 ενεργή, σε 20 μέρες · f4 σε 40 μέρες · f5 έληξε πριν 3 μέρες · f6 εφάπαξ · f7 πρόταση · f8 ληγμένη
-- f9 λυμένη με ημερομηνία · fa αυτόματη χωρίς «Χωρίς συνέχιση» · fb ενεργή, με μεταγενέστερη πρόταση (fc) του ίδιου Πελάτη
-- fd λυμένη (κατάσταση)
with t as (select (now() at time zone 'Europe/Athens')::date as today)
insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, start_on, duration_months, end_on,
                               payment_days, unused_provisions, renewal, filming_notice_hours, filming_cancel_hours,
                               late_cancel_burns, no_show_burns, signed_at, created_at)
select public.t_id(x.aid), public.t_id(x.oid), x.kind, x.title, x.state, x.path, t.today + 5,
       t.today + x.start_off, case when x.kind = 'monthly' then 6 end, t.today + x.end_off,
       15, 'lost', x.renewal, 48, 48, false, false,
       case when x.state = 'proposal' then null else now() - interval '2 days' end,
       case when x.state = 'proposal' then now() else now() - interval '2 days' end
  from t
  cross join (values
    ('f1', 'e1', 'monthly', 'Μηνιαίο P1', 'active', 'signed', 'new_opportunity', -100, 12),
    ('f2', 'e2', 'monthly', 'Μηνιαίο P2', 'active', 'signed', 'auto', -100, 3),
    ('f3', 'e3', 'monthly', 'Μηνιαίο P3', 'active', 'signed', 'new_opportunity', -100, 20),
    ('f4', 'e4', 'monthly', 'Μηνιαίο εκτός', 'active', 'signed', 'new_opportunity', -100, 40),
    ('f5', 'e5', 'monthly', 'Μηνιαίο παρελθόν', 'active', 'signed', 'new_opportunity', -100, -3),
    ('f6', 'e6', 'one_off', 'Εφάπαξ', 'signed', 'signed', null, null, null),
    ('f7', 'e7', 'monthly', 'Μηνιαία πρόταση', 'proposal', 'sent', 'new_opportunity', null, 12),
    ('f8', 'e8', 'monthly', 'Μηνιαία ληγμένη', 'expired', 'signed', 'new_opportunity', -100, 12),
    ('f9', 'e9', 'monthly', 'Μηνιαία λυμένη', 'active', 'signed', 'new_opportunity', -100, 12),
    ('fa', 'ea', 'monthly', 'Αυτόματη χωρίς', 'active', 'signed', 'auto', -100, 12),
    ('fb', 'eb', 'monthly', 'Μηνιαία με επόμενη', 'active', 'signed', 'new_opportunity', -100, 12),
    ('fc', 'ec', 'monthly', 'Επόμενη πρόταση', 'proposal', 'sent', 'new_opportunity', 20, 50),
    ('fd', 'ed', 'monthly', 'Μηνιαία κατάσταση λυμένη', 'dissolved', 'signed', 'new_opportunity', -100, 12),
    ('fe', 'ee', 'monthly', 'Μηνιαία με νέα πρόταση', 'active', 'signed', 'new_opportunity', -100, 12),
    ('ff', 'ef', 'monthly', 'Νέα πρόταση χωρίς έναρξη', 'proposal', 'sent', 'new_opportunity', null, 50)
  ) as x (aid, oid, kind, title, state, path, renewal, start_off, end_off);

-- f2 με «Χωρίς συνέχιση» · f9 λυμένη με ημερομηνία (πέντε μέρες από σήμερα)
insert into public.agreement_endings (agreement_id, no_continuation_at, dissolved_on, dissolution_reason, dissolved_at) values
  (public.t_id('f2'), now(), null, null, null),
  (public.t_id('f9'), null, (now() at time zone 'Europe/Athens')::date + 5, 'Λύση τεστ', now());

reset session_replication_role;

-- ───────────── Θετικό: ο Ιδιοκτήτης βλέπει τις τρεις, με τη σειρά λήξης ─────────────
select is(authz.today_count_agreement_ending(public.t_id('a1'), null, now()), 3,
  'Ο Ιδιοκτήτης βλέπει τις τρεις Συμφωνίες που λήγουν σε έως 30 μέρες');
select is(public.t_ids('a1'), array[public.t_id('f2')::text, public.t_id('f1')::text, public.t_id('f3')::text],
  'Η σειρά είναι η λήξη, πιο κοντινή πρώτη (η αυτόματη με «Χωρίς συνέχιση» μπαίνει)');
select is((select v ->> 'title' from jsonb_array_elements(authz.today_items_agreement_ending(public.t_id('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_id('f2')::text), 'Πελάτης 2 (τεστ)',
  'Ο τίτλος της γραμμής είναι το όνομα του Πελάτη');
select is((select v ->> 'subtitle' from jsonb_array_elements(authz.today_items_agreement_ending(public.t_id('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_id('f2')::text),
  'Μηνιαίο P2 · λήγει ' || to_char((now() at time zone 'Europe/Athens')::date + 3, 'DD/MM/YYYY'),
  'Ο υπότιτλος έχει τίτλο Συμφωνίας και ημερομηνία λήξης');
select is((select v ->> 'link' from jsonb_array_elements(authz.today_items_agreement_ending(public.t_id('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_id('f2')::text),
  '/app/clients/' || public.t_id('c2')::text || '?tab=agreements', 'Η γραμμή ανοίγει την καρτέλα Συμφωνιών του Πελάτη');
select is((select (v ->> 'urgent')::boolean from jsonb_array_elements(authz.today_items_agreement_ending(public.t_id('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_id('f2')::text), true, 'Λήξη σε 3 μέρες είναι επείγον');
select is((select (v ->> 'urgent')::boolean from jsonb_array_elements(authz.today_items_agreement_ending(public.t_id('a1'), null, now())) x (v)
            where v ->> 'id' = public.t_id('f1')::text), false, 'Λήξη σε 12 μέρες δεν είναι επείγον');

-- ───────────── Εξαιρέσεις ─────────────
select ok(not (public.t_id('f4')::text = any(public.t_ids('a1'))), 'Λήξη σε 40 μέρες είναι έξω από το παράθυρο των 30');
select ok(not (public.t_id('f5')::text = any(public.t_ids('a1'))), 'Συμφωνία που έληξε πριν από σήμερα δεν μπαίνει');
select ok(not (public.t_id('f6')::text = any(public.t_ids('a1'))), 'Εφάπαξ Συμφωνία δεν μπαίνει');
select ok(not (public.t_id('f7')::text = any(public.t_ids('a1'))), 'Πρόταση δεν μπαίνει');
select ok(not (public.t_id('f8')::text = any(public.t_ids('a1'))), 'Ληγμένη Συμφωνία δεν μπαίνει');
select ok(not (public.t_id('f9')::text = any(public.t_ids('a1'))), 'Λυμένη με ημερομηνία δεν μπαίνει');
select ok(not (public.t_id('fd')::text = any(public.t_ids('a1'))), 'Λυμένη (κατάσταση) δεν μπαίνει');
select ok(not (public.t_id('fa')::text = any(public.t_ids('a1'))),
  'Αυτόματη συνέχιση χωρίς «Χωρίς συνέχιση» δεν μπαίνει, γιατί δεν σταματά');
select ok(not (public.t_id('fb')::text = any(public.t_ids('a1'))),
  'Συμφωνία με μεταγενέστερη πρόταση του ίδιου Πελάτη δεν μπαίνει');
select ok(not (public.t_id('fe')::text = any(public.t_ids('a1'))),
  'Συμφωνία με μεταγενέστερη πρόταση χωρίς έναρξη (μετά την υπογραφή) δεν μπαίνει');

-- ───────────── Μητρώο: ομάδα «δουλειά», ενέργεια, προς την Πελάτη ─────────────
select is((select grp || '|' || kind || '|' || audience || '|' || link from public.today_cards where code = 'agreement_ending'),
  'work|action|team|/app/clients', 'Η κάρτα είναι στην ομάδα «δουλειά», ως ενέργεια ομάδας, προς /app/clients');

-- ───────────── Χωρίς Δικαίωμα: Παραγωγή ─────────────
select is(authz.today_count_agreement_ending(public.t_id('a2'), null, now()), null,
  'Η Παραγωγή (χωρίς Συμφωνίες) δεν παίρνει κάρτα');
select throws_ok($$ select authz.today_items_agreement_ending(public.t_id('a2'), null, now()) $$,
  '42501', null, 'Οι γραμμές δεν δίνονται σε όποιον δεν βλέπει Συμφωνίες');

-- ───────────── Εύρος «τα δικά μου»: Πωλήσεις βλέπει μόνο τη δική της ─────────────
select is(authz.today_count_agreement_ending(public.t_id('a3'), null, now()), 1,
  'Η Πωλήσεις βλέπει μόνο τη Συμφωνία της Ευκαιρίας ή του Πελάτη της');
select is(public.t_ids('a3'), array[public.t_id('f1')::text], 'Η Πωλήσεις βλέπει μόνο τη δική της γραμμή');

-- ───────────── Πλαίσιο Πελάτη (p_client όχι null): null και 42501 ─────────────
select is(authz.today_count_agreement_ending(public.t_id('a1'), public.t_id('c1'), now()), null,
  'Η κάρτα δεν εμφανίζεται στο πλαίσιο Πελάτη');
select throws_ok($$ select authz.today_items_agreement_ending(public.t_id('a1'), public.t_id('c1'), now()) $$,
  '42501', null, 'Στο πλαίσιο Πελάτη οι γραμμές δεν δίνονται');

-- ───────────── Όριο: έως δύο γραμμές, το πλήθος μένει ολόκληρο ─────────────
select set_config('today.rows', '2', true);
select is((select count(*)::integer from jsonb_array_elements(authz.today_items_agreement_ending(public.t_id('a1'), null, now())) x (v)),
  2, 'Το όριο γραμμών κόβει τις γραμμές στο όριο');
select is(authz.today_count_agreement_ending(public.t_id('a1'), null, now()), 3, 'Το πλήθος μένει ολόκληρο πίσω από το όριο');

select * from finish();
rollback;
