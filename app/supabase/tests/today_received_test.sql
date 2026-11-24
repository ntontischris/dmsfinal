-- Σήμερα: «Μπήκαν τον <μήνα>» (public.today_received). Μόνο οι Εισπράξεις του μήνα, χωρίς τις διαγραμμένες· null για
-- όποιον δεν βλέπει ποσά (καμία άρνηση)· άρνηση για τον ανώνυμο.
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή. Η «σήμερα» δίνεται ρητά (2026-06-15).
begin;
select plan(5);

-- a1 Ιδιοκτήτης · a3 Πωλήσεις
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-4000-8000-0000000000a3', 'sales@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-4000-8000-0000000000a3', 'Άννα', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-4000-8000-0000000000a1', 'Ιδιοκτήτης'), ('00000000-0000-4000-8000-0000000000a3', 'Πωλήσεις'))
       as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';
insert into public.clients (id, name, afm, contact_name, contact_email, manager_id) values
  ('00000000-0000-4000-8000-0000000000c1', 'Πελάτης Α', '123456789', 'Μαρία Π', 'a@example.com',
   '00000000-0000-4000-8000-0000000000a1');

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-4000-8000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

create function public.t_rec(p_on date, p_amount numeric) returns uuid
language sql
as $$
  select public.receipt_record(jsonb_build_object(
    'clientId', '00000000-0000-4000-8000-0000000000c1', 'receivedOn', p_on, 'amount', p_amount,
    'methodId', (select m.id from public.payment_methods m where m.label = 'Τραπεζική κατάθεση')
  ));
$$;

select public.t_as('a1');
select public.t_rec(date '2026-06-10', 100);
select public.t_rec(date '2026-06-30', 50.5);
select public.t_rec(date '2026-05-31', 999);
select public.t_rec(date '2026-07-01', 777);
select public.receipt_delete(public.t_rec(date '2026-06-12', 30), 'Λάθος καταχώριση');

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.today_received(date '2026-06-15') $$, '42501', null,
                 'Ο ανώνυμος δεν βλέπει τις Εισπράξεις του μήνα');
reset role;

-- ───────────── Το άθροισμα ─────────────
select is(public.today_received(date '2026-06-15') ->> 'month', '2026-06', 'Ο μήνας της «σήμερα»');
select is((public.today_received(date '2026-06-15') ->> 'received')::numeric, 150.50,
          'Μόνο οι Εισπράξεις του μήνα, χωρίς τη διαγραμμένη');
select is((public.today_received(date '2026-07-15') ->> 'received')::numeric, 777.00, 'Άλλος μήνας, άλλο άθροισμα');

select public.t_as('a3');
select ok(public.today_received(date '2026-06-15') -> 'received' = 'null'::jsonb,
          'Χωρίς «Βλέπει ποσά» για όλους: κανένα ποσό, καμία άρνηση');

select * from finish();
rollback;
