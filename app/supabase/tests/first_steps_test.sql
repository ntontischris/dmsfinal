-- Πρόσβαση a3 (20261114160300_first_steps): κάρτα «Πρώτα βήματα» ανά Ρόλο.
-- Άρνηση (anon, όχι Ιδιοκτήτης, κλειστοί πίνακες), τι βλέπει κάθε Χρήστης, «Κατάλαβα» μόνο για τον ίδιο, αλλαγή κειμένου.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι κλειστοί πίνακες διαβάζονται μόνο μετά από reset role.
begin;
select plan(27);

-- a1 Ιδιοκτήτης · a3 Διαχείριση · b1 Χρήστης πελάτη (Πλήρης) · b2 αφαιρεμένος Χρήστης πελάτη · d1 χωρίς Ρόλο
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'maria@client.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'nikos@client.example.gr'),
  ('00000000-0000-0000-0000-0000000000d1', 'nobody@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Δημήτρης', 'admin@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a3', 'Διαχείριση')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

set local session_replication_role = replica;
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Φούρνος Παράδειγμα', 'Μαρία', 'c1@example.com',
   '00000000-0000-0000-0000-0000000000a1');
insert into public.client_users (client_id, user_id, name, role_id, is_current, removed_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Μαρία',
   (select r.id from public.roles r where r.system_key = 'client_full'), true, null),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'Νίκος',
   (select r.id from public.roles r where r.system_key = 'client_full'), false, now());
set local session_replication_role = origin;

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
language sql stable security definer set search_path = ''
as $$ select r.id from public.roles r where r.name = p_name and r.is_builtin; $$;
grant execute on function public.t_role(text) to authenticated;

-- Οι Ρόλοι που δείχνει η κάρτα του τρέχοντα Χρήστη, με τη σειρά τους.
create function public.t_view_roles() returns text
language sql
as $$ select coalesce(string_agg(e ->> 'role', ',' order by o), '')
        from jsonb_array_elements(public.first_steps_view()) with ordinality as x (e, o); $$;
grant execute on function public.t_view_roles() to authenticated;

-- ───────────── Αρχικά κείμενα ─────────────
select is(
  (select string_agg(r.name, ',' order by r.name) from public.role_first_steps f join public.roles r on r.id = f.role_id),
  'Διαχείριση,Ιδιοκτήτης,Λογιστής,Παραγωγή,Πλήρης,Πωλήσεις', 'Κάθε έτοιμος Ρόλος έχει αρχικό κείμενο');

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.first_steps_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει κάρτα');
select throws_ok($$ select public.first_steps_dismiss() $$, '42501', null, 'Ο ανώνυμος δεν κρύβει κάρτα');
select throws_ok($$ select public.role_first_steps_set('00000000-0000-0000-0000-000000000000', 'x') $$,
  '42501', null, 'Ο ανώνυμος δεν γράφει κείμενο');
select throws_ok($$ select public.role_first_steps_get('00000000-0000-0000-0000-000000000000') $$,
  '42501', null, 'Ο ανώνυμος δεν διαβάζει κείμενο Ρόλου');
reset role;

select public.t_as('a3');
set local role authenticated;
select throws_ok($$ select public.role_first_steps_set(public.t_role('Διαχείριση'), 'Κλεμμένο') $$,
  '42501', null, 'Η Διαχείριση δεν γράφει κείμενα');
select throws_ok($$ select public.role_first_steps_get(public.t_role('Διαχείριση')) $$,
  '42501', null, 'Η Διαχείριση δεν ανοίγει τη φόρμα του Ιδιοκτήτη');
select throws_ok($$ select count(*) from public.role_first_steps $$, '42501', null,
  'Τα κείμενα είναι κλειστός πίνακας');
select throws_ok($$ select count(*) from public.first_steps_dismissals $$, '42501', null,
  'Οι αποκρύψεις είναι κλειστός πίνακας');
select throws_ok($$ insert into public.first_steps_dismissals (user_id) values ('00000000-0000-0000-0000-0000000000a1') $$,
  '42501', null, 'Κανείς δεν κρύβει την κάρτα άλλου απευθείας');
reset role;

select public.t_as('b1');
set local role authenticated;
select throws_ok($$ select public.role_first_steps_set(public.t_role('Πλήρης'), 'Από πελάτη') $$,
  '42501', null, 'Ο Χρήστης πελάτη δεν γράφει κείμενα');
reset role;

-- ───────────── Τι βλέπει ο καθένας ─────────────
select public.t_as('a1');
set local role authenticated;
select is(public.t_view_roles(), 'Ιδιοκτήτης', 'Ο Ιδιοκτήτης βλέπει το κείμενο του Ρόλου του');
reset role;
select public.t_as('a3');
set local role authenticated;
select is(public.t_view_roles(), 'Διαχείριση', 'Η Διαχείριση βλέπει το δικό της');
reset role;
select public.t_as('b1');
set local role authenticated;
select is(public.t_view_roles(), 'Πλήρης', 'Ο Χρήστης πελάτη βλέπει το κείμενο του Ρόλου του στον Πελάτη');
reset role;
select public.t_as('b2');
set local role authenticated;
select is(public.first_steps_view(), '[]'::jsonb, 'Αφαιρεμένος Χρήστης πελάτη: καμία κάρτα');
reset role;
select public.t_as('d1');
set local role authenticated;
select is(public.first_steps_view(), '[]'::jsonb, 'Χωρίς Ρόλο: καμία κάρτα');
reset role;

-- ───────────── Ο Ιδιοκτήτης αλλάζει τα κείμενα ─────────────
select public.t_as('a1');
set local role authenticated;
select lives_ok($$ select public.role_first_steps_set(public.t_role('Διαχείριση'), '  Νέο κείμενο για τη Διαχείριση. ') $$,
  'Ο Ιδιοκτήτης γράφει κείμενο');
select is(public.role_first_steps_get(public.t_role('Διαχείριση')), 'Νέο κείμενο για τη Διαχείριση.',
  'Αποθηκεύεται χωρίς κενά στις άκρες');
select lives_ok($$ select public.role_first_steps_set(public.t_role('Ιδιοκτήτης'), 'Για τον Ιδιοκτήτη.') $$,
  'Και του Ιδιοκτήτη, που κατά τα άλλα δεν αλλάζει');
select throws_ok($$ select public.role_first_steps_set(public.t_role('Διαχείριση'), repeat('α', 2001)) $$,
  'P0001', null, 'Πάνω από 2000 χαρακτήρες: άρνηση');
select throws_ok($$ select public.role_first_steps_set('00000000-0000-0000-0000-000000000000', 'x') $$,
  'P0001', null, 'Άγνωστος Ρόλος: άρνηση');
reset role;
select public.t_as('a3');
set local role authenticated;
select is(public.first_steps_view() -> 0 ->> 'body', 'Νέο κείμενο για τη Διαχείριση.',
  'Η Διαχείριση βλέπει το νέο κείμενο');
reset role;
select public.t_as('a1');
set local role authenticated;
select lives_ok($$ select public.role_first_steps_set(public.t_role('Παραγωγή'), '   ') $$, 'Κενό κείμενο: σβήνει');
reset role;
select ok(not exists (select 1 from public.role_first_steps where role_id = public.t_role('Παραγωγή')),
  'Η Παραγωγή δεν έχει πια κάρτα');

-- ───────────── «Κατάλαβα» ─────────────
select public.t_as('a3');
set local role authenticated;
select lives_ok($$ select public.first_steps_dismiss(); select public.first_steps_dismiss(); $$,
  'Η Διαχείριση κρύβει την κάρτα (και δεύτερη φορά χωρίς λάθος)');
select is(public.first_steps_view(), '[]'::jsonb, 'Μετά το «Κατάλαβα» η κάρτα δεν ξαναφαίνεται');
reset role;
select public.t_as('a1');
set local role authenticated;
select is(public.t_view_roles(), 'Ιδιοκτήτης', 'Το «Κατάλαβα» ενός Χρήστη δεν κρύβει την κάρτα των άλλων');
reset role;

select * from finish();
rollback;
