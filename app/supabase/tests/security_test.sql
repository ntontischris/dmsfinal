-- Σκλήρυνση ασφάλειας: προστασία Ιδιοκτητών, τελευταίος Ιδιοκτήτης, Ίχνος εντός Εύρους, πρώτος Ιδιοκτήτης, δικαιώματα πινάκων.
begin;
select plan(41);

-- ───────────── Πρώτος Ιδιοκτήτης: μόνο προσκεκλημένος ─────────────
-- c1 Ιδιοκτήτης (προσκεκλημένος) · c2 δεύτερος Ιδιοκτήτης · c3 Διαχείριση · c4 Άννα (Πωλήσεις) · c5 Νίκος (Πωλήσεις)
-- c6 Ελεγκτής (μόνο audit.view) · c7 ξένος χωρίς πρόσκληση · c8 Πωλητής με Ίχνος (δικός του Πελάτης + audit.view)
insert into auth.users (id, email, invited_at) values
  ('00000000-0000-0000-0000-0000000000c1', 'owner@example.com', now());
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c2', 'owner2@example.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000c4', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000c5', 'nikos@example.com'),
  ('00000000-0000-0000-0000-0000000000c6', 'auditor@example.com'),
  ('00000000-0000-0000-0000-0000000000c7', 'stranger@example.com'),
  ('00000000-0000-0000-0000-0000000000c8', 'seller@example.com'),
  ('00000000-0000-0000-0000-0000000000c9', 'gone@example.com');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c7","role":"authenticated"}', true);
select is(public.claim_first_owner(), false, 'Ένας λογαριασμός χωρίς πρόσκληση δεν διεκδικεί τον Ρόλο Ιδιοκτήτη');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is(public.claim_first_owner(), true, 'Ο προσκεκλημένος λογαριασμός γίνεται ο πρώτος Ιδιοκτήτης');
reset role;

insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000c2', 'Μαρία', 'owner2@example.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'Δημήτρης', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000c4', 'Άννα', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000c5', 'Νίκος', 'nikos@example.com'),
  ('00000000-0000-0000-0000-0000000000c6', 'Κώστας', 'auditor@example.com'),
  ('00000000-0000-0000-0000-0000000000c8', 'Σοφία', 'seller@example.com');
insert into public.team_users (user_id, name, email, is_active) values
  ('00000000-0000-0000-0000-0000000000c9', 'Γιάννης', 'gone@example.com', false);

insert into public.roles (name, kind) values ('Ελεγκτής', 'team'), ('Πωλητής με Ίχνος', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, g.code, g.scope
  from (values
    ('Ελεγκτής', 'audit.view', 'all'),
    ('Πωλητής με Ίχνος', 'audit.view', 'all'),
    ('Πωλητής με Ίχνος', 'clients.view', 'mine'),
    ('Πωλητής με Ίχνος', 'clients.manage', 'mine')
  ) as g (role_name, code, scope)
  join public.roles r on r.name = g.role_name and r.kind = 'team';

insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000c2', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000c3', 'Διαχείριση'),
    ('00000000-0000-0000-0000-0000000000c4', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000c5', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000c6', 'Ελεγκτής'),
    ('00000000-0000-0000-0000-0000000000c8', 'Πωλητής με Ίχνος')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Προστασία Ιδιοκτητών στο team_users ─────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select lives_ok(
  $$ update public.team_users set is_active = false where user_id = '00000000-0000-0000-0000-0000000000c2' $$,
  'Ο Ιδιοκτήτης απενεργοποιεί τον άλλον Ιδιοκτήτη'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select throws_ok(
  $$ update public.team_users set is_active = true where user_id = '00000000-0000-0000-0000-0000000000c2' $$,
  'P0001', 'Έναν Ιδιοκτήτη τον επανενεργοποιεί μόνο Ιδιοκτήτης', 'Η Διαχείριση δεν επανενεργοποιεί απενεργοποιημένο Ιδιοκτήτη'
);
select throws_ok(
  $$ update public.team_users set name = 'Άλλος' where user_id = '00000000-0000-0000-0000-0000000000c2' $$,
  'P0001', null, 'Η Διαχείριση δεν αλλάζει το όνομα απενεργοποιημένου Ιδιοκτήτη'
);
select throws_ok(
  $$ update public.team_users set email = 'x@example.com' where user_id = '00000000-0000-0000-0000-0000000000c1' $$,
  'P0001', 'Τα στοιχεία ενός Ιδιοκτήτη τα αλλάζει μόνο Ιδιοκτήτης', 'Η Διαχείριση δεν αλλάζει το email ενεργού Ιδιοκτήτη'
);
select throws_ok(
  $$ update public.team_users set language = 'en' where user_id = '00000000-0000-0000-0000-0000000000c1' $$,
  'P0001', null, 'Η Διαχείριση δεν αλλάζει τη γλώσσα Ιδιοκτήτη'
);
select throws_ok(
  $$ update public.team_users set created_at = now() - interval '1 year' where user_id = '00000000-0000-0000-0000-0000000000c1' $$,
  'P0001', null, 'Η Διαχείριση δεν αλλάζει την ημερομηνία δημιουργίας Ιδιοκτήτη'
);
select lives_ok(
  $$ update public.team_users set name = 'Άννα Π.' where user_id = '00000000-0000-0000-0000-0000000000c4' $$,
  'Η Διαχείριση συνεχίζει να αλλάζει στοιχεία απλών Χρηστών'
);
select lives_ok(
  $$ update public.team_users set language = 'en' where user_id = '00000000-0000-0000-0000-0000000000c3' $$,
  'Και τα δικά της στοιχεία'
);
select throws_ok(
  $$ update public.team_users set user_id = '00000000-0000-0000-0000-0000000000c7' where user_id = '00000000-0000-0000-0000-0000000000c6' $$,
  'P0001', null, 'Το user_id δεν αλλάζει'
);
select throws_ok(
  $$ update public.team_users set created_at = now() - interval '1 year' where user_id = '00000000-0000-0000-0000-0000000000c4' $$,
  'P0001', null, 'Το created_at δεν αλλάζει ούτε σε απλό Χρήστη'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select lives_ok(
  $$ update public.team_users set name = 'Μαρία Κ.' where user_id = '00000000-0000-0000-0000-0000000000c2' $$,
  'Ο Ιδιοκτήτης αλλάζει στοιχεία Ιδιοκτήτη'
);
select lives_ok(
  $$ update public.team_users set is_active = true where user_id = '00000000-0000-0000-0000-0000000000c2' $$,
  'Ο Ιδιοκτήτης επανενεργοποιεί Ιδιοκτήτη'
);
select is((select is_active from public.team_users where user_id = '00000000-0000-0000-0000-0000000000c2'), true, 'Ο δεύτερος Ιδιοκτήτης είναι ξανά ενεργός');
reset role;

-- ───────────── Τελευταίος Ιδιοκτήτης ─────────────
select ok(
  (select prosrc like '%pg_advisory_xact_lock%' from pg_proc where oid = 'authz.guard_last_owner()'::regprocedure),
  'Ο έλεγχος τελευταίου Ιδιοκτήτη σειριοποιείται με κλείδωμα συναλλαγής'
);
select lives_ok(
  $$ update public.team_user_roles set role_id = (select id from public.roles where name = 'Διαχείριση' and kind = 'team')
      where user_id = '00000000-0000-0000-0000-0000000000c2' $$,
  'Η αλλαγή Ρόλου του ενός Ιδιοκτήτη επιτρέπεται όσο μένει άλλος'
);
select throws_ok(
  $$ update public.team_user_roles set role_id = (select id from public.roles where name = 'Διαχείριση' and kind = 'team')
      where user_id = '00000000-0000-0000-0000-0000000000c1' $$,
  'P0001', 'Χρειάζεται πάντα τουλάχιστον ένας ενεργός Ιδιοκτήτης', 'Η αλλαγή Ρόλου του τελευταίου Ιδιοκτήτη μπλοκάρεται'
);
select throws_ok(
  $$ update public.team_user_roles set user_id = '00000000-0000-0000-0000-0000000000c9'
      where user_id = '00000000-0000-0000-0000-0000000000c1' and role_id = (select id from public.roles where is_owner) $$,
  'P0001', null, 'Η μεταφορά του Ρόλου Ιδιοκτήτη σε απενεργοποιημένο Χρήστη μπλοκάρεται'
);

-- ───────────── Ίχνος: Πελάτες και Ευκαιρίες μόνο εντός Εύρους ─────────────
-- Πελάτες: b1, b2 της Άννας (c4) · b3 της Σοφίας (c8) · b4 του Νίκου (c5)
insert into public.clients (id, name, afm, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000b1', 'Κυψέλη Καφέ', '099999999', 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '00000000-0000-0000-0000-0000000000c4'),
  ('00000000-0000-0000-0000-0000000000b2', 'Γυμναστήριο Κίνηση', null, 'Πέτρος Νικολάου', 'info@kinisi.example.gr', '00000000-0000-0000-0000-0000000000c4'),
  ('00000000-0000-0000-0000-0000000000b3', 'Ταβέρνα Αρμύρα', '081234567', 'Ελένη Γεωργίου', 'armyra@example.com', '00000000-0000-0000-0000-0000000000c8'),
  ('00000000-0000-0000-0000-0000000000b4', 'Καφέ Αθηνά', null, 'Κώστας Σιμιτζής', 'kostas@athina-cafe.example.gr', '00000000-0000-0000-0000-0000000000c5');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}', true);
select set_config('t.o1', public.sales_create_opportunity(
  '00000000-0000-0000-0000-0000000000b1', null, 'Βίντεο εγκαινίων',
  (select id from public.sales_sources where code = 'referral'), '', 'Να στείλω πρόταση', current_date + 3)::text, true);
select set_config('t.q1', public.sales_request_access(
  '00000000-0000-0000-0000-0000000000b3', 'Βίντεο για καμπάνια', 'Τον ξέρω από παλιά.',
  (select id from public.sales_sources where code = 'referral'))::text, true);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c8","role":"authenticated"}', true);
select set_config('t.o3', public.sales_create_opportunity(
  '00000000-0000-0000-0000-0000000000b3', null, 'Νέο μενού',
  (select id from public.sales_sources where code = 'phone'), '', 'Κλήση', current_date + 1)::text, true);
reset role;

-- Ο Ελεγκτής (μόνο audit.view) δεν βλέπει τίποτα από Πελάτες, Ευκαιρίες, Αιτήματα, αλλά βλέπει ό,τι αφορά την πρόσβαση.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c6","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.audit_log where entity in ('clients', 'opportunities', 'access_requests', 'client_duplicate_flags')),
  0, 'Ο Ελεγκτής δεν βλέπει στο Ίχνος Πελάτες, Ευκαιρίες και Αιτήματα πρόσβασης'
);
select ok((select count(*) > 0 from public.audit_log where entity = 'team_users'), 'Ο Ελεγκτής βλέπει στο Ίχνος τις αλλαγές πρόσβασης');
select is(authz.audit_entity_allowed('new_table_nobody_listed'), false, 'Άγνωστη οντότητα δεν φαίνεται ποτέ στο Ίχνος');

-- Ο Πωλητής με Ίχνος βλέπει μόνο τον δικό του Πελάτη και τις Ευκαιρίες του.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c8","role":"authenticated"}', true);
select is(
  (select array_agg(distinct entity_id order by entity_id) from public.audit_log where entity = 'clients'),
  array['00000000-0000-0000-0000-0000000000b3'],
  'Ο Πωλητής βλέπει στο Ίχνος μόνο τον δικό του Πελάτη'
);
select is(
  (select count(*)::int from public.audit_log where entity = 'opportunities' and entity_id <> (current_setting('t.o3')::jsonb ->> 'opportunity_id')),
  0, 'Και μόνο τις δικές του Ευκαιρίες'
);
select ok(
  (select count(*) > 0 from public.audit_log where entity = 'opportunities' and entity_id = (current_setting('t.o3')::jsonb ->> 'opportunity_id')),
  'Η δική του Ευκαιρία φαίνεται'
);
select ok(
  (select count(*) > 0 from public.audit_log where entity = 'access_requests' and entity_id = current_setting('t.q1')),
  'Το Αίτημα πρόσβασης στον δικό του Πελάτη φαίνεται'
);

-- Η Άννα (χωρίς audit.view) δεν βλέπει το Ίχνος.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}', true);
select is((select count(*)::int from public.audit_log), 0, 'Χωρίς «Βλέπει ίχνος ενεργειών» δεν φαίνεται τίποτα');

-- Η Διαχείριση (Εύρος «όλα») βλέπει όλους τους Πελάτες στο Ίχνος.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select is(
  (select count(distinct entity_id)::int from public.audit_log where entity = 'clients'),
  4, 'Η Διαχείριση βλέπει στο Ίχνος και τους 4 Πελάτες'
);
select ok(authz.audit_row_allowed('opportunities', current_setting('t.o1')::jsonb ->> 'opportunity_id'), 'Και την Ευκαιρία της Άννας');
select is(authz.audit_row_allowed('clients', 'not-a-uuid'), false, 'Μη έγκυρο αναγνωριστικό Πελάτη δεν φαίνεται');
reset role;

-- Κάθε οντότητα που έγραψαν τα triggers σε αυτό το τεστ είναι στη λίστα επιτρεπτών (ο Ιδιοκτήτης έχει όλα τα Δικαιώματα).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is(
  (select count(*)::int from (select distinct entity from public.audit_log) e where not authz.audit_entity_allowed(e.entity)),
  0, 'Όλες οι οντότητες του Ίχνους είναι ρητά στη λίστα επιτρεπτών'
);
reset role;

-- ───────────── Αίτημα πρόσβασης με αποσυρμένη Πηγή ─────────────
update public.sales_sources set retired_at = now() where code = 'phone';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}', true);
select throws_ok(
  format($$ select public.sales_request_access('00000000-0000-0000-0000-0000000000b4', 'Ιδέα', '', %L) $$,
    (select id from public.sales_sources where code = 'phone')),
  'P0001', 'Η Πηγή έχει αποσυρθεί', 'Αίτημα πρόσβασης με αποσυρμένη Πηγή δεν γίνεται'
);
select lives_ok(
  format($$ select public.sales_request_access('00000000-0000-0000-0000-0000000000b4', 'Ιδέα', '', %L) $$,
    (select id from public.sales_sources where code = 'referral')),
  'Με ενεργή Πηγή γίνεται κανονικά'
);
reset role;

-- ───────────── Δικαιώματα πινάκων ─────────────
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and has_table_privilege('anon', c.oid, 'select,insert,update,delete,truncate,references,trigger')),
  0, 'Ο ανώνυμος δεν έχει κανένα δικαίωμα σε πίνακες'
);
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and has_table_privilege('authenticated', c.oid, 'truncate,references,trigger')),
  0, 'Οι authenticated δεν έχουν TRUNCATE, REFERENCES, TRIGGER'
);
select is(
  (select count(*)::int from (values ('audit_log'), ('permissions')) t (name)
    where has_table_privilege('authenticated', 'public.' || t.name, 'insert,update,delete')),
  0, 'Οι authenticated δεν γράφουν στο Ίχνος και στον κατάλογο Δικαιωμάτων'
);
select ok(
  has_table_privilege('authenticated', 'public.team_users', 'select,insert,update')
  and not has_table_privilege('authenticated', 'public.team_users', 'delete'),
  'Στο team_users μένουν μόνο όσα χρειάζονται οι policies'
);
set local role authenticated;
select throws_ok($$ truncate public.team_user_roles $$, '42501', null, 'Οι authenticated δεν κάνουν TRUNCATE στους Ρόλους Χρηστών');
reset role;

-- Νέοι πίνακες: ίδια δικαιώματα από την αρχή.
create table public.zz_probe (id integer);
select is(
  has_table_privilege('anon', 'public.zz_probe', 'select,insert,update,delete,truncate,references,trigger'),
  false, 'Νέος πίνακας: ο ανώνυμος δεν παίρνει δικαιώματα'
);
select is(
  has_table_privilege('authenticated', 'public.zz_probe', 'truncate,references,trigger'),
  false, 'Νέος πίνακας: οι authenticated δεν παίρνουν TRUNCATE, REFERENCES, TRIGGER'
);
select ok(
  has_table_privilege('authenticated', 'public.zz_probe', 'select,insert,update,delete'),
  'Νέος πίνακας: οι authenticated κρατούν τα συνήθη δικαιώματα (το RLS τα περιορίζει)'
);

select * from finish();
rollback;
