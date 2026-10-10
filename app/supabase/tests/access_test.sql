-- Ρόλοι, Δικαιώματα, Εύρος, χωρίς κλιμάκωση, τελευταίος Ιδιοκτήτης, Ίχνος (κεφ. 1, κεφ. 7). Φανταστικοί Χρήστες.
begin;
select plan(34);

-- ───────────── Δεδομένα ─────────────
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'admin@example.com'),
  ('00000000-0000-0000-0000-000000000003', 'sales@example.com'),
  ('00000000-0000-0000-0000-000000000004', 'accountant@example.com'),
  ('00000000-0000-0000-0000-000000000005', 'both@example.com'),
  ('00000000-0000-0000-0000-000000000006', 'inactive@example.com'),
  ('00000000-0000-0000-0000-000000000007', 'owner2@example.com');

insert into public.team_users (user_id, name, email, is_active) values
  ('00000000-0000-0000-0000-000000000001', 'Γιώργος', 'owner@example.com', true),
  ('00000000-0000-0000-0000-000000000002', 'Δημήτρης', 'admin@example.com', true),
  ('00000000-0000-0000-0000-000000000003', 'Άννα', 'sales@example.com', true),
  ('00000000-0000-0000-0000-000000000004', 'Ελένη', 'accountant@example.com', true),
  ('00000000-0000-0000-0000-000000000005', 'Νίκος', 'both@example.com', true),
  ('00000000-0000-0000-0000-000000000006', 'Άρης', 'inactive@example.com', false),
  ('00000000-0000-0000-0000-000000000007', 'Μαρία', 'owner2@example.com', true);

insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-000000000001', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-000000000002', 'Διαχείριση'),
    ('00000000-0000-0000-0000-000000000003', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-000000000004', 'Λογιστής'),
    ('00000000-0000-0000-0000-000000000005', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-000000000005', 'Λογιστής'),
    ('00000000-0000-0000-0000-000000000006', 'Παραγωγή')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';


-- ───────────── Κατάλογος και έτοιμοι Ρόλοι ─────────────
select is((select count(*)::int from public.permissions where kind = 'team'), 40, 'Ο κατάλογος έχει 40 Δικαιώματα ομάδας');
select is((select count(*)::int from public.permissions where kind = 'client'), 9, 'Ο κατάλογος έχει 9 Δικαιώματα πελάτη');
select is((select count(*)::int from public.roles where is_builtin), 6, 'Υπάρχουν 6 έτοιμοι Ρόλοι');

-- ───────────── Εύρος ανά Ρόλο ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(authz.scope('finance.costManage'), 'all', 'Ο Ιδιοκτήτης έχει όλα τα Δικαιώματα ομάδας με «όλα»');
select is(authz.scope('c.sign'), null, 'Ο Ιδιοκτήτης δεν παίρνει Δικαιώματα πελάτη');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is(authz.scope('clients.view'), 'all', 'Η Διαχείριση βλέπει όλους τους Πελάτες');
select is(authz.scope('finance.invoices'), null, 'Η Διαχείριση δεν καταχωρεί Τιμολόγια');
select is(authz.scope('finance.costManage'), null, 'Η Διαχείριση δεν διαχειρίζεται κόστος');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is(authz.scope('clients.view'), 'mine', 'Οι Πωλήσεις βλέπουν μόνο όσους Πελάτες τους αφορούν');
select is(authz.scope('catalogue.view'), 'all', 'Οι Πωλήσεις βλέπουν όλο τον Κατάλογο');
select is(authz.scope('finance.cost'), null, 'Οι Πωλήσεις δεν βλέπουν κόστος');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select is(authz.scope('clients.view'), 'all', 'Από δύο Ρόλους κερδίζει το ευρύτερο Εύρος');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
select is(authz.scope('filming.view'), null, 'Ένας απενεργοποιημένος Χρήστης δεν έχει κανένα Δικαίωμα');

select set_config('request.jwt.claims', '{}', true);
select is(authz.scope('clients.view'), null, 'Χωρίς σύνδεση δεν υπάρχει κανένα Δικαίωμα');

-- ───────────── Ρόλους φτιάχνει και αλλάζει μόνο ο Ιδιοκτήτης ─────────────
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.roles (name, kind) values ('Δοκιμή', 'team') $$,
  '42501', null, 'Η Διαχείριση δεν φτιάχνει Ρόλους'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.roles (name, kind) values ('Εκδηλώσεις', 'team'), ('Τιμολόγηση', 'team') $$,
  'Ο Ιδιοκτήτης φτιάχνει Ρόλους'
);
select lives_ok(
  $$ insert into public.role_permissions (role_id, permission, scope)
     select id, 'filming.view', 'all' from public.roles where name = 'Εκδηλώσεις'
     union all
     select id, 'finance.invoices', 'all' from public.roles where name = 'Τιμολόγηση' $$,
  'Ο Ιδιοκτήτης δίνει Δικαιώματα σε Ρόλο'
);
select throws_ok(
  $$ update public.roles set name = 'Αφεντικό' where is_owner $$,
  'P0001', null, 'Ο Ρόλος Ιδιοκτήτης δεν αλλάζει'
);
select throws_ok(
  $$ delete from public.roles where name = 'Πλήρης' and kind = 'client' $$,
  'P0001', null, 'Ο «Πλήρης» δεν διαγράφεται'
);
select throws_ok(
  $$ insert into public.role_permissions (role_id, permission, scope)
     select id, 'catalogue.view', 'mine' from public.roles where name = 'Εκδηλώσεις' $$,
  'P0001', null, 'Ένα Δικαίωμα παίρνει μόνο τα Εύρη που υποστηρίζει'
);
select throws_ok(
  $$ insert into public.role_permissions (role_id, permission, scope)
     select id, 'c.sign', 'all' from public.roles where name = 'Εκδηλώσεις' $$,
  'P0001', null, 'Ένας Ρόλος ομάδας δεν παίρνει Δικαίωμα πελάτη'
);

-- ───────────── Χωρίς κλιμάκωση ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.team_user_roles (user_id, role_id)
     select '00000000-0000-0000-0000-000000000003', id from public.roles where is_owner $$,
  '42501', null, 'Η Διαχείριση δεν δίνει τον Ρόλο Ιδιοκτήτης'
);
select throws_ok(
  $$ insert into public.team_user_roles (user_id, role_id)
     select '00000000-0000-0000-0000-000000000003', id from public.roles where name = 'Τιμολόγηση' $$,
  '42501', null, 'Η Διαχείριση δεν δίνει Ρόλο με Δικαίωμα που δεν έχει'
);
select lives_ok(
  $$ insert into public.team_user_roles (user_id, role_id)
     select '00000000-0000-0000-0000-000000000003', id from public.roles where name = 'Εκδηλώσεις' $$,
  'Η Διαχείριση δίνει Ρόλο που δεν ξεπερνά τα δικά της Δικαιώματα'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.team_user_roles (user_id, role_id)
     select '00000000-0000-0000-0000-000000000004', id from public.roles where name = 'Παραγωγή' $$,
  '42501', null, 'Χωρίς «Προσκαλεί και απενεργοποιεί» δεν δίνεις Ρόλους'
);

-- ───────────── Πάντα ένας ενεργός Ιδιοκτήτης ─────────────
reset role;
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-0000-0000-000000000007', id from public.roles where is_owner;
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$ delete from public.team_user_roles
      where user_id = '00000000-0000-0000-0000-000000000007'
        and role_id = (select id from public.roles where is_owner) $$,
  'Ένας Ιδιοκτήτης αφαιρεί τον Ρόλο από άλλον Ιδιοκτήτη όταν μένει κι άλλος'
);
select throws_ok(
  $$ delete from public.team_user_roles
      where user_id = '00000000-0000-0000-0000-000000000001'
        and role_id = (select id from public.roles where is_owner) $$,
  'P0001', null, 'Ο τελευταίος Ιδιοκτήτης δεν χάνει τον Ρόλο του'
);
select throws_ok(
  $$ update public.team_users set is_active = false where user_id = '00000000-0000-0000-0000-000000000001' $$,
  'P0001', null, 'Δεν απενεργοποιείς τον εαυτό σου'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$ update public.team_users set is_active = false where user_id = '00000000-0000-0000-0000-000000000001' $$,
  'P0001', null, 'Έναν Ιδιοκτήτη τον απενεργοποιεί μόνο Ιδιοκτήτης'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$ update public.team_users set is_active = false where user_id = '00000000-0000-0000-0000-000000000002' $$,
  'Ο Ιδιοκτήτης απενεργοποιεί ενεργό μη-Ιδιοκτήτη'
);

-- ───────────── Ίχνος ενεργειών ─────────────
select ok(
  (select count(*) > 0 from public.audit_log
    where entity = 'roles' and after ->> 'name' = 'Εκδηλώσεις'
      and actor_id = '00000000-0000-0000-0000-000000000001'),
  'Η δημιουργία Ρόλου γράφεται στο Ίχνος με το όνομα του Ιδιοκτήτη (το βλέπει η Διαχείριση)'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.audit_log), 0, 'Οι Πωλήσεις δεν βλέπουν το Ίχνος');

reset role;
select throws_ok(
  $$ delete from public.audit_log $$,
  'P0001', null, 'Το Ίχνος δεν σβήνεται, ούτε από τη βάση'
);

-- ───────────── Χωρίς σύνδεση ─────────────
set local role anon;
select throws_ok($$ select count(*) from public.roles $$,'42501', null, 'Χωρίς σύνδεση δεν διαβάζεται κανένας Ρόλος');

select * from finish();
rollback;
