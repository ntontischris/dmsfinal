-- Ομάδα Να #207: προεπισκόπηση απενεργοποίησης = αποτέλεσμα της απενεργοποίησης (ισοτιμία σε όλα τα είδη ανάθεσης),
-- περασμένα Γυρίσματα ανέπαφα, σήμα «άδειασε θέση» και Γεγονός 60, λόγοι «δεν γίνεται», επανενεργοποίηση χωρίς αναθέσεις,
-- Γεγονός 58 χωρίς τον ίδιο τον actor, Επανενεργοποίηση από την πρόσκληση, Ρόλος σε δύο βήματα.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι ημερομηνίες είναι σχετικές με το now() της συναλλαγής.
begin;
select plan(73);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Μαρία (αργότερα δεύτερη Ιδιοκτήτρια) · a3 Διαχείριση · a4 Πωλήσεις · a5 Νίκος (αυτός που φεύγει:
-- Πωλήσεις + Παραγωγή) · a6 Ρένα (Παραγωγή, Υπεύθυνη της Παραγωγής 202) · a7 απενεργοποιημένη Λένα · b1 Χρήστης πελάτη
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'maria@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'nikos@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'rena@example.com'),
  ('00000000-0000-0000-0000-0000000000a7', 'gone@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr');
insert into public.team_users (user_id, name, email, is_active) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com', true),
  ('00000000-0000-0000-0000-0000000000a2', 'Μαρία', 'maria@example.com', true),
  ('00000000-0000-0000-0000-0000000000a3', 'Δημήτρης', 'admin@example.com', true),
  ('00000000-0000-0000-0000-0000000000a4', 'Άννα', 'sales@example.com', true),
  ('00000000-0000-0000-0000-0000000000a5', 'Νίκος', 'nikos@example.com', true),
  ('00000000-0000-0000-0000-0000000000a6', 'Ρένα', 'rena@example.com', true),
  ('00000000-0000-0000-0000-0000000000a7', 'Λένα', 'gone@example.com', false);
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a3', 'Διαχείριση'),
               ('00000000-0000-0000-0000-0000000000a4', 'Πωλήσεις'),
               ('00000000-0000-0000-0000-0000000000a5', 'Πωλήσεις'),
               ('00000000-0000-0000-0000-0000000000a5', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a6', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a7', 'Παραγωγή')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Ένας Ρόλος με 12 ενεργούς Χρήστες και έναν απενεργοποιημένο (για τα «έως 10 και N ακόμη»).
insert into public.roles (name, kind) values ('Μεγάλος Ρόλος (τεστ)', 'team');
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000000009' || lpad(n::text, 2, '0'))::uuid, 'z' || n || '@example.com' from generate_series(1, 13) n;
insert into public.team_users (user_id, name, email, is_active)
select ('00000000-0000-0000-0000-0000000009' || lpad(n::text, 2, '0'))::uuid, 'Ζ' || lpad(n::text, 2, '0'), 'z' || n || '@example.com', n <= 12
  from generate_series(1, 13) n;
insert into public.team_user_roles (user_id, role_id)
select ('00000000-0000-0000-0000-0000000009' || lpad(n::text, 2, '0'))::uuid, r.id
  from generate_series(1, 13) n cross join public.roles r where r.name = 'Μεγάλος Ρόλος (τεστ)';

-- ───────────── Αναθέσεις του Νίκου (άμεσες εγγραφές, χωρίς triggers) ─────────────
-- Ανοιχτά (επιστρέφουν): Πελάτης c1, Ευκαιρία 101, Παραγωγή 201, Εργασία 301, Παραδοτέο 401, θέσεις στα μελλοντικά 501
-- (Παραγωγή της Ρένας) και 504 (της δικής του Παραγωγής 201, που μένει χωρίς Υπεύθυνο).
-- Κλειστά (μένουν): αρχειοθετημένος c2, κερδισμένη 102, παραδομένη 203, Εργασία που έγινε 302, εγκεκριμένο 402,
-- το περασμένο Γύρισμα 502 και το ακυρωμένο 503.
set local session_replication_role = replica;
insert into public.clients (id, name, contact_name, contact_email, manager_id, archived_at) values
  ('00000000-0000-0000-0000-0000000000c1', 'Κυψέλη Καφέ', 'Μαρία Παπαδάκη', 'one@example.com', '00000000-0000-0000-0000-0000000000a5', null),
  ('00000000-0000-0000-0000-0000000000c2', 'Παλιός Πελάτης', 'Κώστας Παλαιός', 'old@example.com', '00000000-0000-0000-0000-0000000000a5', now());
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due, outcome, closed_at)
select x.id::uuid, '00000000-0000-0000-0000-0000000000c1', x.title,
       (select s.id from public.sales_stages s where s.code = 'new'), (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a5', 'Κλήση', current_date + 30, x.outcome, x.closed_at::timestamptz
  from (values ('00000000-0000-0000-0000-000000000101', 'Βίντεο εγκαινίων', 'open', null),
               ('00000000-0000-0000-0000-000000000102', 'Μηνιαία Παρουσία', 'won', now()::text)) as x (id, title, outcome, closed_at);
insert into public.productions (id, title, owner_id, state, delivered_at, delivered_note) values
  ('00000000-0000-0000-0000-000000000201', 'Παραγωγή Νίκου', '00000000-0000-0000-0000-0000000000a5', 'open', null, null),
  ('00000000-0000-0000-0000-000000000202', 'Παραγωγή Ρένας', '00000000-0000-0000-0000-0000000000a6', 'open', null, null),
  ('00000000-0000-0000-0000-000000000203', 'Παραδομένη', '00000000-0000-0000-0000-0000000000a5', 'delivered', now(), 'Παραδόθηκε');
insert into public.production_tasks (id, production_id, title, assignee_id, done_at, done_by) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000202', 'Μοντάζ', '00000000-0000-0000-0000-0000000000a5', null, null),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000202', 'Σενάριο', '00000000-0000-0000-0000-0000000000a5',
   now(), '00000000-0000-0000-0000-0000000000a5');
insert into public.deliverables (id, production_id, kind_id, title, charge, assignee_id, approved_at) values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000202',
   (select k.id from public.provision_kinds k where k.code = 'reel'), 'Reel εγκαινίων', 'included', '00000000-0000-0000-0000-0000000000a5', null),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000202',
   (select k.id from public.provision_kinds k where k.code = 'reel'), 'Reel που εγκρίθηκε', 'included', '00000000-0000-0000-0000-0000000000a5', now());
insert into public.filmings (id, production_id, starts_at, hours, origin, state, approved_at, cancelled_at, cancelled_side, cancelled_reason) values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000202', now() + interval '7 days', 2, 'team', 'scheduled', now(), null, null, null),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000202', now() - interval '7 days', 2, 'team', 'scheduled', now(), null, null, null),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000202', now() + interval '9 days', 2, 'team', 'cancelled', now(),
   now(), 'team', 'Ακυρώθηκε'),
  ('00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000201', now() + interval '11 days', 2, 'team', 'scheduled', now(), null, null, null);
insert into public.filming_crew (filming_id, user_id) values
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-0000000000a5'),
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-0000000000a6'),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-0000000000a5'),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-0000000000a5'),
  ('00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-0000000000a5');
set local session_replication_role = origin;
-- Δελτίο με αυτόματη αποστολή: εκδόθηκε η 1η έκδοση του 501 πριν φύγει ο Νίκος.
update public.filming_settings set sheet_sending = 'auto' where id;
select authz.sheet_issue('00000000-0000-0000-0000-000000000501', null);

-- ───────────── Βοηθητικά (ως postgres, ποτέ ως authenticated) ─────────────
create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

create function public.t_uid(p_last text) returns uuid
language sql immutable
as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;

-- Κάθε ανάθεση ενός Χρήστη, ανοιχτή ή κλειστή, ως «είδος:id» (ίδια ονόματα με την προεπισκόπηση).
create function public.t_assignments(p_user uuid) returns setof text
language sql stable
as $$
  select 'client:' || c.id from public.clients c where c.manager_id = p_user
  union all select 'opportunity:' || o.id from public.opportunities o where o.manager_id = p_user
  union all select 'production:' || p.id from public.productions p where p.owner_id = p_user
  union all select 'task:' || t.id from public.production_tasks t where t.assignee_id = p_user
  union all select 'deliverable:' || d.id from public.deliverables d where d.assignee_id = p_user
  union all select 'crew:' || fc.filming_id from public.filming_crew fc where fc.user_id = p_user;
$$;

-- Οι Ειδοποιήσεις ενός Χρήστη για ένα είδος Γεγονότος.
create function public.t_notes(p_last text, p_type text) returns integer
language sql stable
as $$
  select count(*)::integer from public.notifications n join public.events e on e.id = n.event_id
   where n.user_id = public.t_uid(p_last) and e.type = p_type;
$$;

-- ───────────── Κατάλογος ─────────────
select is((select relatives from public.event_types where code = 'team.access_changed'), '{owner}'::text[],
  'Το Γεγονός 58 πάει μόνο στους Ιδιοκτήτες (ποτέ στον actor)');
select is((select number || ' ' || array_to_string(relatives, ',') from public.event_types where code = 'filming.crew_vacated'),
  '60 production_owner', 'Το Γεγονός 60 «άδειασε θέση» πάει στον Υπεύθυνο της Παραγωγής');
select ok((select is_enabled from public.automations where event_type = 'filming.crew_vacated' and is_initial),
  'Ο αρχικός Αυτοματισμός του 60 είναι ενεργός');

-- ───────────── Άρνηση: Δικαίωμα πρώτα, ίδιο σφάλμα για ό,τι δεν φαίνεται ή δεν υπάρχει ─────────────
set local role anon;
select throws_ok($$ select public.team_deactivation_preview('00000000-0000-0000-0000-0000000000a5') $$, '42501', null,
  'Ο ανώνυμος δεν βλέπει προεπισκόπηση');
select throws_ok($$ select public.team_user_set_roles('00000000-0000-0000-0000-0000000000a5', '{}') $$, '42501', null,
  'Ο ανώνυμος δεν αλλάζει Ρόλους');
select throws_ok($$ select public.invitation_team_email_check('gone@example.com') $$, '42501', null,
  'Ο ανώνυμος δεν ελέγχει email');
select throws_ok($$ select public.role_affected_users(gen_random_uuid()) $$, '42501', null,
  'Ο ανώνυμος δεν βλέπει ποιους επηρεάζει ένας Ρόλος');

set local role authenticated;
select public.t_as('a4');
select throws_ok($$ select public.team_deactivation_preview('00000000-0000-0000-0000-0000000000a5') $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν βλέπουν προεπισκόπηση');
select throws_ok($$ select public.team_deactivation_preview(gen_random_uuid()) $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ίδιο σφάλμα για Χρήστη που δεν υπάρχει');
select throws_ok($$ select public.team_user_set_roles('00000000-0000-0000-0000-0000000000a6',
                    array[(select r.id from public.roles r where r.name = 'Πωλήσεις' and r.kind = 'team')]) $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν αλλάζουν Ρόλους');
select throws_ok($$ select public.invitation_team_email_check('gone@example.com') $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν ελέγχουν email πρόσκλησης');
select public.t_as('b1');
select throws_ok($$ select public.team_deactivation_preview('00000000-0000-0000-0000-0000000000a5') $$, '42501', null,
  'Ο Χρήστης πελάτη δεν βλέπει προεπισκόπηση');
select throws_ok($$ select public.team_user_set_roles('00000000-0000-0000-0000-0000000000a6', array[gen_random_uuid()]) $$, '42501', null,
  'Ο Χρήστης πελάτη δεν αλλάζει Ρόλους');
select throws_ok($$ select public.invitation_team_email_check('gone@example.com') $$, '42501', null,
  'Ο Χρήστης πελάτη δεν ελέγχει email πρόσκλησης');
select throws_ok($$ select public.role_affected_users(gen_random_uuid()) $$,
  '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει ποιους επηρεάζει ένας Ρόλος');
select public.t_as('a3');
select throws_ok($$ select public.role_affected_users((select r.id from public.roles r where r.name = 'Πωλήσεις' and r.kind = 'team')) $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Διαχείριση δεν βλέπει τη λίστα του Ρόλου (μόνο ο Ιδιοκτήτης αλλάζει Ρόλους)');
select throws_ok($$ select public.role_affected_users(gen_random_uuid()) $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ίδιο σφάλμα για Ρόλο που δεν υπάρχει');
select throws_ok($$ select public.team_deactivation_preview(null) $$, 'P0001', 'Ο Χρήστης ομάδας δεν βρέθηκε',
  'Κενό id: ο Χρήστης δεν βρέθηκε');
select throws_ok($$ select public.team_deactivation_preview(gen_random_uuid()) $$, 'P0001', 'Ο Χρήστης ομάδας δεν βρέθηκε',
  'Άγνωστο id: ο Χρήστης δεν βρέθηκε');

-- ───────────── Λόγοι «δεν γίνεται» ─────────────
select is(public.team_deactivation_preview('00000000-0000-0000-0000-0000000000a1') ->> 'block', 'owner_by_non_owner',
  'Τον Ιδιοκτήτη δεν τον απενεργοποιεί η Διαχείριση');
select throws_ok($$ select public.team_user_set_active('00000000-0000-0000-0000-0000000000a1', false) $$, 'P0001',
  'Έναν Ιδιοκτήτη τον απενεργοποιεί μόνο Ιδιοκτήτης', 'Η απενεργοποίηση αρνείται για τον ίδιο λόγο');
select is(public.team_deactivation_preview('00000000-0000-0000-0000-0000000000a3') ->> 'block', 'self', 'Τον εαυτό σου δεν τον απενεργοποιείς');
select public.t_as('a1');
select is(public.team_deactivation_preview('00000000-0000-0000-0000-0000000000a1') ->> 'block', 'self', 'Ούτε ο Ιδιοκτήτης τον εαυτό του');
select is(public.team_deactivation_preview('00000000-0000-0000-0000-0000000000a5') ->> 'block', null, 'Ο Νίκος απενεργοποιείται');
select is(public.team_deactivation_preview('00000000-0000-0000-0000-0000000000a7'),
  '{"isActive": false, "block": null, "items": []}'::jsonb, 'Ο ήδη απενεργοποιημένος: τίποτα να επιστρέψει');
reset role;
-- «last_owner» φτάνει μόνο με κενό actor (service role): ένας Ιδιοκτήτης δεν απενεργοποιεί τον εαυτό του, και με δεύτερο ενεργό δεν είναι ο τελευταίος.
select is(authz.deactivation_block(null, '00000000-0000-0000-0000-0000000000a1'), 'last_owner',
  'Ο μόνος ενεργός Ιδιοκτήτης είναι ο τελευταίος');
select is(authz.deactivation_block('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a5'), null,
  'Κανένας λόγος για απλό Χρήστη');

-- ───────────── Προεπισκόπηση = απενεργοποίηση ─────────────
select set_config('t.before', (select array_agg(x order by x)::text from public.t_assignments(public.t_uid('a5')) x), true);
set local role authenticated;
select public.t_as('a3');
select set_config('t.preview', public.team_deactivation_preview('00000000-0000-0000-0000-0000000000a5')::text, true);
select is((select array_agg(i ->> 'kind' order by n) from jsonb_array_elements(current_setting('t.preview')::jsonb -> 'items')
            with ordinality x (i, n)),
  array['client', 'opportunity', 'production', 'task', 'deliverable', 'crew', 'crew'], 'Κάθε είδος, με τη σειρά του καταλόγου');
select is((select string_agg(i ->> 'label', ' | ' order by n) from jsonb_array_elements(current_setting('t.preview')::jsonb -> 'items')
            with ordinality x (i, n)),
  'Κυψέλη Καφέ | Βίντεο εγκαινίων | Παραγωγή Νίκου | Μοντάζ | Reel εγκαινίων | Παραγωγή Νίκου | Παραγωγή Ρένας', 'Ονομαστικά');
select lives_ok($$ select public.team_user_set_active('00000000-0000-0000-0000-0000000000a5', false) $$, 'Η Διαχείριση απενεργοποιεί τον Νίκο');
reset role;
select is(
  (select array_agg(x order by x) from unnest(current_setting('t.before')::text[]) x
    where x not in (select * from public.t_assignments(public.t_uid('a5')))),
  (select array_agg((i ->> 'kind') || ':' || (i ->> 'id') order by (i ->> 'kind') || ':' || (i ->> 'id'))
     from jsonb_array_elements(current_setting('t.preview')::jsonb -> 'items') i),
  'Ισοτιμία: επέστρεψαν ακριβώς όσα έδειξε η προεπισκόπηση');
select is((select count(*)::integer from authz.deactivation_items(public.t_uid('a5'), now())), 0, 'Δεν έμεινε καμία ανοιχτή ανάθεση');
select is((select array_agg(x order by x) from public.t_assignments(public.t_uid('a5')) x),
  array['client:00000000-0000-0000-0000-0000000000c2', 'crew:00000000-0000-0000-0000-000000000502',
        'crew:00000000-0000-0000-0000-000000000503', 'deliverable:00000000-0000-0000-0000-000000000402',
        'opportunity:00000000-0000-0000-0000-000000000102', 'production:00000000-0000-0000-0000-000000000203',
        'task:00000000-0000-0000-0000-000000000302'],
  'Τα κλειστά μένουν: αρχειοθετημένος Πελάτης, κερδισμένη, παραδομένη, Εργασία που έγινε, εγκεκριμένο, περασμένο και ακυρωμένο Γύρισμα');
select is((select owner_id from public.productions where id = '00000000-0000-0000-0000-000000000201'), null,
  'Η Παραγωγή μένει χωρίς Υπεύθυνο');
select is((select array_agg(user_id order by user_id) from public.filming_crew where filming_id = '00000000-0000-0000-0000-000000000501'),
  array['00000000-0000-0000-0000-0000000000a6'::uuid], 'Στο μελλοντικό Γύρισμα μένει μόνο η Ρένα');
select is((select count(*)::integer from public.filming_crew_vacancies
            where filming_id = '00000000-0000-0000-0000-000000000501' and user_id = public.t_uid('a5')), 1,
  'Σήμα «άδειασε θέση» στο μελλοντικό Γύρισμα');
select is((select count(*)::integer from public.filming_crew_vacancies
            where filming_id not in ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000504')), 0,
  'Κανένα σήμα στα περασμένα ή ακυρωμένα');
select is((select version || ' ' || change from public.filming_sheet_versions
            where filming_id = '00000000-0000-0000-0000-000000000501' order by version desc limit 1),
  '2 Άλλαξε το Συνεργείο', 'Με αυτόματη αποστολή το Δελτίο βγαίνει ξανά, όπως σε κάθε αλλαγή Συνεργείου');
select is((select after -> 'removed' from public.audit_log
            where entity = 'filmings' and entity_id = '00000000-0000-0000-0000-000000000501' and after ->> 'event' = 'crew_changed'),
  '["00000000-0000-0000-0000-0000000000a5"]'::jsonb, 'Το Ιστορικό του Γυρίσματος γράφει την αλλαγή Συνεργείου');
select is((select count(*)::integer from public.events where type = 'filming.crew_vacated'
            and entity_id = '00000000-0000-0000-0000-000000000501' and actor_id = public.t_uid('a3')), 1,
  'Γεγονός 60 για τη θέση που άδειασε, με actor τη Διαχείριση');
select public.events_process();
select is(public.t_notes('a6', 'filming.crew_vacated'), 1, 'Η Υπεύθυνη της Παραγωγής παίρνει Ειδοποίηση');
select is(public.t_notes('a3', 'filming.crew_vacated'), 0, 'Όποιος απενεργοποίησε δεν ειδοποιείται');
select is(public.t_notes('a1', 'filming.crew_vacated'), 1,
  'Ο Νίκος ήταν και Υπεύθυνος της 201: για το 504 ειδοποιούνται όσοι «Μεταβιβάζουν Υπεύθυνο» (ο Ιδιοκτήτης)');
select is((select n.body from public.notifications n join public.events e on e.id = n.event_id
            where e.type = 'filming.crew_vacated' and n.user_id = public.t_uid('a6')),
  'Άδειασε θέση στο Συνεργείο: Παραγωγή Ρένας · ' || to_char((now() + interval '7 days') at time zone 'Europe/Athens', 'DD/MM')
    || '. Ο/Η Νίκος απενεργοποιήθηκε· βρες αντικαταστάτη.', 'Η Ειδοποίηση λέει ποιο μέλος έφυγε');

-- E3 και Σήμερα.
set local role authenticated;
select is(jsonb_array_length(public.filming_view('00000000-0000-0000-0000-000000000501') -> 'vacancies'), 1,
  'Το E3 δείχνει το σήμα στην ομάδα');
select is(public.filming_view('00000000-0000-0000-0000-000000000501') -> 'vacancies' -> 0 ->> 'name', 'Νίκος', 'Με το όνομα του μέλους');
reset role;
select ok(exists (select 1 from jsonb_array_elements(authz.today_items_unassigned(public.t_uid('a3'), null, now())) i
                   where i ->> 'id' = 'production:00000000-0000-0000-0000-000000000201'
                     and i ->> 'link' = '/app/productions/00000000-0000-0000-0000-000000000201'),
  'Η Παραγωγή χωρίς Υπεύθυνο φαίνεται στην κάρτα «Χωρίς υπεύθυνο» του Σήμερα');

-- Επανενεργοποίηση: οι Ρόλοι μένουν, οι αναθέσεις όχι.
select set_config('t.after', (select array_agg(x order by x)::text from public.t_assignments(public.t_uid('a5')) x), true);
set local role authenticated;
select lives_ok($$ select public.team_user_set_active('00000000-0000-0000-0000-0000000000a5', true) $$, 'Η Διαχείριση τον επανενεργοποιεί');
reset role;
select is((select count(*)::integer from public.team_user_roles where user_id = public.t_uid('a5')), 2, 'Κρατά τους δύο Ρόλους του');
select is((select array_agg(x order by x)::text from public.t_assignments(public.t_uid('a5')) x), current_setting('t.after'),
  'Καμία ανάθεση δεν επιστρέφει');
insert into public.filming_crew (filming_id, user_id) values ('00000000-0000-0000-0000-000000000501', public.t_uid('a2'));
select is((select count(*)::integer from public.filming_crew_vacancies where filming_id = '00000000-0000-0000-0000-000000000501'), 0,
  'Νέο μέλος στο Συνεργείο σβήνει το σήμα');
update public.filmings set state = 'cancelled', cancelled_at = now(), cancelled_side = 'team', cancelled_reason = 'Ακυρώθηκε'
 where id = '00000000-0000-0000-0000-000000000504';
set local role authenticated;
select is(jsonb_array_length(public.filming_view('00000000-0000-0000-0000-000000000504') -> 'vacancies'), 0,
  'Σε Γύρισμα που έκλεισε το σήμα δεν φαίνεται');
reset role;

-- ───────────── Γεγονός 58: πρόσκληση και αλλαγή Ρόλων, ποτέ στον ίδιο ─────────────
set local role authenticated;
select public.t_as('a1');
select lives_ok($$ select public.team_user_set_roles('00000000-0000-0000-0000-0000000000a6',
                   array(select r.id from public.roles r where r.kind = 'team' and r.name in ('Παραγωγή', 'Πωλήσεις'))) $$,
  'Ο μόνος Ιδιοκτήτης δίνει Ρόλο');
reset role;
select is((select jsonb_build_array(after -> 'before', after -> 'after') from public.audit_log
            where entity = 'access' and after ->> 'event' = 'team_roles_changed' order by id desc limit 1),
  '[["Παραγωγή"], ["Παραγωγή", "Πωλήσεις"]]'::jsonb, 'Το Ίχνος κρατά πριν → μετά');
select public.events_process();
select is((select count(*)::integer from public.notifications n join public.events e on e.id = n.event_id
            where e.type = 'team.access_changed'), 0, 'Με έναν Ιδιοκτήτη που το έκανε ο ίδιος: καμία Ειδοποίηση');

set local role authenticated;
select public.t_as('a3');
select lives_ok($$ select public.team_user_set_roles('00000000-0000-0000-0000-0000000000a6',
                   array(select r.id from public.roles r where r.kind = 'team' and r.name = 'Παραγωγή')) $$,
  'Η Διαχείριση αφαιρεί Ρόλο');
select throws_ok($$ select public.team_user_set_roles('00000000-0000-0000-0000-0000000000a6',
                    array(select r.id from public.roles r where r.kind = 'team' and r.name in ('Παραγωγή', 'Ιδιοκτήτης'))) $$,
  '42501', null, 'Η Διαχείριση δεν δίνει τον Ρόλο Ιδιοκτήτης');
select throws_ok($$ select public.team_user_set_roles('00000000-0000-0000-0000-0000000000a1',
                    array(select r.id from public.roles r where r.kind = 'team' and r.name in ('Ιδιοκτήτης', 'Πωλήσεις'))) $$,
  '42501', null, 'Η Διαχείριση δεν αλλάζει τους Ρόλους του Ιδιοκτήτη');
select throws_ok($$ select public.team_user_set_roles(null, array[gen_random_uuid()]) $$, 'P0001', 'Ο Χρήστης ομάδας δεν βρέθηκε',
  'Κενός Χρήστης');
select throws_ok($$ select public.team_user_set_roles(gen_random_uuid(), array[gen_random_uuid()]) $$, 'P0001',
  'Ο Χρήστης ομάδας δεν βρέθηκε', 'Άγνωστος Χρήστης');
select throws_ok($$ select public.team_user_set_roles('00000000-0000-0000-0000-0000000000a6', '{}') $$, 'P0001',
  'Ένας Χρήστης ομάδας θέλει τουλάχιστον έναν Ρόλο', 'Χωρίς Ρόλο δεν γίνεται');
reset role;
select public.events_process();
select is(public.t_notes('a1', 'team.access_changed'), 1, 'Ο Ιδιοκτήτης ειδοποιείται για ό,τι έκανε η Διαχείριση');
select is(public.t_notes('a3', 'team.access_changed'), 0, 'Η Διαχείριση όχι για τη δική της ενέργεια');

-- Δύο Ιδιοκτήτες: ειδοποιείται μόνο ο άλλος.
insert into public.team_user_roles (user_id, role_id)
select public.t_uid('a2'), r.id from public.roles r where r.is_owner;
set local role authenticated;
select public.t_as('a1');
select public.team_user_set_roles('00000000-0000-0000-0000-0000000000a6',
  array(select r.id from public.roles r where r.kind = 'team' and r.name in ('Παραγωγή', 'Πωλήσεις')));
reset role;
select set_config('t.events58', (select count(*)::text from public.events where type = 'team.access_changed'), true);
set local role authenticated;
select lives_ok($$ select public.team_user_set_roles('00000000-0000-0000-0000-0000000000a6',
                   array(select r.id from public.roles r where r.kind = 'team' and r.name in ('Πωλήσεις', 'Παραγωγή'))) $$,
  'Οι ίδιοι Ρόλοι ξανά');
reset role;
select is((select count(*)::text from public.events where type = 'team.access_changed'), current_setting('t.events58'),
  'Χωρίς αλλαγή, κανένα Γεγονός');
select public.events_process();
select is(public.t_notes('a2', 'team.access_changed'), 1, 'Η δεύτερη Ιδιοκτήτρια ειδοποιείται');
select is(public.t_notes('a1', 'team.access_changed'), 1, 'Ο Ιδιοκτήτης που το έκανε δεν παίρνει δεύτερη');

-- ───────────── Πρόσκληση: δομημένο αποτέλεσμα για απενεργοποιημένο Χρήστη ─────────────
set local role authenticated;
select public.t_as('a3');
select is(public.invitation_team_email_check(' GONE@example.com '),
  '{"deactivatedUser": {"userId": "00000000-0000-0000-0000-0000000000a7", "name": "Λένα"}}'::jsonb,
  'Email απενεργοποιημένου: ο Χρήστης, για Επανενεργοποίηση');
select is(public.invitation_team_email_check('rena@example.com'), '{"deactivatedUser": null}'::jsonb, 'Ενεργός Χρήστης: τίποτα');
select is(public.invitation_team_email_check(null), '{"deactivatedUser": null}'::jsonb, 'Κενό email: τίποτα');

-- ───────────── Ρόλος σε δύο βήματα: ποιους επηρεάζει ─────────────
select public.t_as('a1');
select is(public.role_affected_users((select r.id from public.roles r where r.name = 'Μεγάλος Ρόλος (τεστ)')),
  jsonb_build_object('names', to_jsonb(array['Ζ01', 'Ζ02', 'Ζ03', 'Ζ04', 'Ζ05', 'Ζ06', 'Ζ07', 'Ζ08', 'Ζ09', 'Ζ10']),
                     'total', 12, 'more', 2),
  'Έως 10 ονόματα και «και 2 ακόμη»· ο απενεργοποιημένος δεν μετράει');
select is(public.role_affected_users((select r.id from public.roles r where r.system_key = 'client_full')),
  '{"names": ["Κώστας"], "total": 1, "more": 0}'::jsonb, 'Ρόλος πελάτη: οι Χρήστες πελάτη');
select throws_ok($$ select public.role_affected_users(gen_random_uuid()) $$, 'P0001', 'Ο Ρόλος δεν βρέθηκε', 'Άγνωστος Ρόλος');

select * from finish();
rollback;
