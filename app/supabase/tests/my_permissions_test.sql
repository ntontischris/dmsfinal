-- Τα Δικαιώματα του συνδεδεμένου Χρήστη, όπως τα βλέπει η εφαρμογή.
begin;
select plan(3);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b1', 'sales@example.com');
insert into public.team_users (user_id, name, email) values ('00000000-0000-0000-0000-0000000000b1', 'Άννα', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000b1', id from public.roles where name = 'Πωλήσεις' and kind = 'team';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

select is((select count(*)::int from public.my_permissions()), 11, 'Οι Πωλήσεις έχουν 11 Δικαιώματα');
select is((select scope from public.my_permissions() where permission = 'clients.view'), 'mine', 'Με το Εύρος τους');

set local role anon;
select throws_ok($$ select * from public.my_permissions() $$, '42501', null, 'Χωρίς σύνδεση η συνάρτηση δεν καλείται');

select * from finish();
rollback;
