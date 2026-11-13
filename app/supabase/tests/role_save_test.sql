-- Πρόσβαση a6 (20261114160200_role_save_atomic): η αποθήκευση και η δημιουργία Ρόλου είναι μία ατομική ενέργεια·
-- αν κάτι αποτύχει δεν αλλάζει τίποτα· μόνο ο Ιδιοκτήτης.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(22);

-- a1 Ιδιοκτήτης · a3 Διαχείριση
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'admin@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Δημήτρης', 'admin@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a3', 'Διαχείριση')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

insert into public.roles (name, kind) values ('Μοντέρ (τεστ)', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, g.permission, g.scope
  from public.roles r,
       (values ('clients.view', 'mine'), ('calendar.availability', 'all')) as g (permission, scope)
 where r.name = 'Μοντέρ (τεστ)';

-- ───────────── Βοηθητικά (ως postgres) ─────────────
create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

create function public.t_role(p_name text) returns uuid
language sql stable
as $$ select r.id from public.roles r where r.name = p_name; $$;
grant execute on function public.t_role(text) to authenticated;

create function public.t_grants(p_role uuid) returns jsonb
language sql stable
as $$ select coalesce(jsonb_object_agg(rp.permission, rp.scope), '{}'::jsonb)
        from public.role_permissions rp where rp.role_id = p_role; $$;

-- ───────────── Μόνο ο Ιδιοκτήτης ─────────────
select public.t_as('a3');
set local role authenticated;
select throws_ok(
  $$ select public.role_save(public.t_role('Μοντέρ (τεστ)'), 'Κλεμμένος', '', '{}'::jsonb) $$,
  '42501', null, 'Η Διαχείριση δεν αποθηκεύει Ρόλους');
select throws_ok($$ select public.role_create('team', 'Νέος από Διαχείριση', null) $$,
  '42501', null, 'Η Διαχείριση δεν δημιουργεί Ρόλους');
reset role;
set local role anon;
select throws_ok(
  $$ select public.role_save('00000000-0000-0000-0000-000000000000', 'x', '', '{}'::jsonb) $$,
  '42501', null, 'Ο ανώνυμος δεν αποθηκεύει Ρόλους');
select throws_ok($$ select public.role_create('team', 'x', null) $$,
  '42501', null, 'Ο ανώνυμος δεν δημιουργεί Ρόλους');
reset role;
select is((select name from public.roles where id = public.t_role('Μοντέρ (τεστ)')), 'Μοντέρ (τεστ)',
  'Η άρνηση δεν άλλαξε το όνομα');
select is(public.t_grants(public.t_role('Μοντέρ (τεστ)')),
  '{"clients.view":"mine","calendar.availability":"all"}'::jsonb, 'Η άρνηση δεν άλλαξε τα Δικαιώματα');

-- ───────────── Αποθήκευση: όνομα + πλήρης εικόνα Δικαιωμάτων ─────────────
select public.t_as('a1');
set local role authenticated;
select lives_ok(
  $$ select public.role_save(public.t_role('Μοντέρ (τεστ)'), '  Μοντέρ Α (τεστ) ', 'Κάνει μοντάζ',
       '{"clients.view":"all","agreements.view":"all"}'::jsonb) $$,
  'Ο Ιδιοκτήτης αποθηκεύει');
reset role;
select is((select name from public.roles where description = 'Κάνει μοντάζ'), 'Μοντέρ Α (τεστ)',
  'Νέο όνομα, χωρίς κενά');
select is(public.t_grants(public.t_role('Μοντέρ Α (τεστ)')),
  '{"clients.view":"all","agreements.view":"all"}'::jsonb,
  'Αλλαγή Εύρους, προσθήκη, και αφαίρεση ό,τι έλειπε');

-- ───────────── Αποτυχία: τίποτα δεν αλλάζει ─────────────
select public.t_as('a1');
set local role authenticated;
select throws_ok(
  $$ select public.role_save(public.t_role('Μοντέρ Α (τεστ)'), 'Μισό όνομα', '',
       '{"clients.view":"mine","calendar.availability":"mine"}'::jsonb) $$,
  'P0001', null, 'Εύρος που δεν υποστηρίζεται: άρνηση');
select throws_ok(
  $$ select public.role_save(public.t_role('Μοντέρ Α (τεστ)'), 'Μισό όνομα', '',
       '{"c.chatRead":"all"}'::jsonb) $$,
  'P0001', null, 'Δικαίωμα πελάτη σε Ρόλο ομάδας: άρνηση');
select throws_ok(
  $$ select public.role_save(public.t_role('Μοντέρ Α (τεστ)'), 'Διαχείριση', '', '{}'::jsonb) $$,
  '23505', null, 'Όνομα που υπάρχει ήδη: άρνηση');
select throws_ok(
  $$ select public.role_save(public.t_role('Ιδιοκτήτης'), 'Αφεντικό', '', '{}'::jsonb) $$,
  'P0001', null, 'Ο Ιδιοκτήτης δεν αλλάζει');
select throws_ok(
  $$ select public.role_save(public.t_role('Μοντέρ Α (τεστ)'), 'x', '', '[]'::jsonb) $$,
  'P0001', null, 'Δικαιώματα που δεν είναι αντικείμενο: άρνηση');
reset role;
select is((select name from public.roles where description = 'Κάνει μοντάζ'), 'Μοντέρ Α (τεστ)',
  'Μετά τις αποτυχίες το όνομα έμεινε ίδιο');
select is(public.t_grants(public.t_role('Μοντέρ Α (τεστ)')),
  '{"clients.view":"all","agreements.view":"all"}'::jsonb,
  'Μετά τις αποτυχίες τα Δικαιώματα έμειναν ίδια');

-- ───────────── Δημιουργία με αντιγραφή ─────────────
select public.t_as('a1');
set local role authenticated;
select lives_ok($$ select public.role_create('team', 'Μοντέρ Β (τεστ)', public.t_role('Μοντέρ Α (τεστ)')) $$,
  'Ο Ιδιοκτήτης δημιουργεί αντίγραφο');
select lives_ok($$ select public.role_create('team', 'Κενός (τεστ)', null) $$, 'Ο Ιδιοκτήτης δημιουργεί κενό Ρόλο');
select throws_ok($$ select public.role_create('client', 'Λάθος είδος (τεστ)', public.t_role('Μοντέρ Α (τεστ)')) $$,
  'P0001', null, 'Αντιγραφή μόνο από ίδιο είδος');
reset role;
select is(public.t_grants(public.t_role('Μοντέρ Β (τεστ)')),
  '{"clients.view":"all","agreements.view":"all"}'::jsonb, 'Το αντίγραφο πήρε τα Δικαιώματα');
select is((select description from public.roles where name = 'Μοντέρ Β (τεστ)'), 'Αντίγραφο του «Μοντέρ Α (τεστ)».',
  'Το αντίγραφο λέει από πού ήρθε');
select is((select count(*)::int from public.roles where name = 'Λάθος είδος (τεστ)'), 0,
  'Η αποτυχημένη δημιουργία δεν άφησε Ρόλο');

select * from finish();
rollback;
