-- Λίστα Πελατών: ΑΦΜ και email επαφής για να ξεχωρίζουν συνονόματοι Πελάτες
-- (MIG 20261124142000_sales_client_list_afm_email.sql). Μόνο για Πελάτη που ανοίγεις, όπως η πόλη.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(8);

-- a1 Ιδιοκτήτης · a3 Άννα (Πωλήσεις) · a4 Νίκος (Πωλήσεις) · b1 Χρήστης πελάτη
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-4000-8000-0000000000a3', 'anna@example.com'),
  ('00000000-0000-4000-8000-0000000000a4', 'nikos@example.com'),
  ('00000000-0000-4000-8000-0000000000b1', 'k1@client-a.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-4000-8000-0000000000a3', 'Άννα', 'anna@example.com'),
  ('00000000-0000-4000-8000-0000000000a4', 'Νίκος', 'nikos@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-4000-8000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-4000-8000-0000000000a3', 'Πωλήσεις'),
               ('00000000-0000-4000-8000-0000000000a4', 'Πωλήσεις')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Δύο συνονόματοι Πελάτες στην ίδια πόλη: c1 της Άννας, c2 του Νίκου.
set local session_replication_role = replica;
insert into public.clients (id, name, city, afm, contact_name, contact_email, manager_id) values
  ('00000000-0000-4000-8000-0000000000c1', 'Ίδιο Όνομα', 'Θεσσαλονίκη', '123456789', 'Επαφή', 'c1@example.com',
   '00000000-0000-4000-8000-0000000000a3'),
  ('00000000-0000-4000-8000-0000000000c2', 'Ίδιο Όνομα', 'Θεσσαλονίκη', null, 'Επαφή', 'c2@example.com',
   '00000000-0000-4000-8000-0000000000a4');
set local session_replication_role = origin;
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'Κώστας',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true);

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-4000-8000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

set local role anon;
select throws_ok($$ select * from public.sales_client_list() $$, '42501', null, 'Ο ανώνυμος δεν διαβάζει τη λίστα');
reset role;

set local role authenticated;
select public.t_as('a1');
select is((select afm from public.sales_client_list(null, 100, 0, '00000000-0000-4000-8000-0000000000c1')),
          '123456789', 'Ο Ιδιοκτήτης βλέπει το ΑΦΜ');
select is((select contact_email from public.sales_client_list(null, 100, 0, '00000000-0000-4000-8000-0000000000c2')),
          'c2@example.com', 'Ο Ιδιοκτήτης βλέπει το email επαφής');
select is((select afm from public.sales_client_list(null, 100, 0, '00000000-0000-4000-8000-0000000000c2')),
          null, 'Χωρίς ΑΦΜ: null');

select public.t_as('a3');
select is((select contact_email from public.sales_client_list(null, 100, 0, '00000000-0000-4000-8000-0000000000c1')),
          'c1@example.com', 'Η Άννα βλέπει το email του δικού της Πελάτη');
select is((select afm from public.sales_client_list(null, 100, 0, '00000000-0000-4000-8000-0000000000c2')),
          null, 'Πελάτης άλλου: χωρίς ΑΦΜ');
select is((select contact_email from public.sales_client_list(null, 100, 0, '00000000-0000-4000-8000-0000000000c2')),
          '', 'Πελάτης άλλου: χωρίς email');

select public.t_as('b1');
select is((select count(*)::int from public.sales_client_list()), 0, 'Ο Χρήστης πελάτη δεν βλέπει τη λίστα');
reset role;

select * from finish();
rollback;
