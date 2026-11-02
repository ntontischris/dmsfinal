-- N1 (νέα εμφάνιση): η «Τελευταία είσοδος» των Χρηστών ομάδας μόνο για όποιον έχει access.team. Φανταστικά δεδομένα.
begin;
select plan(5);

insert into auth.users (id, email, last_sign_in_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com', '2026-10-01 09:00+00'),
  ('00000000-0000-0000-0000-0000000000a4', 'sales@example.com', null);
insert into public.team_users (user_id, name, email, is_active) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com', true),
  ('00000000-0000-0000-0000-0000000000a4', 'Άννα', 'sales@example.com', true);
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a4', 'Πωλήσεις')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

set local role anon;
select throws_ok($$ select public.team_last_sign_in() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τελευταίες εισόδους');

set local role authenticated;
select public.t_as('a4');
select throws_ok($$ select public.team_last_sign_in() $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν βλέπουν τελευταίες εισόδους');

select public.t_as('a1');
select ok(jsonb_array_length(public.team_last_sign_in()) >= 2, 'Ο Ιδιοκτήτης βλέπει όλους τους Χρήστες ομάδας');
select is((select e ->> 'lastSignInAt' from jsonb_array_elements(public.team_last_sign_in()) e
            where e ->> 'userId' = '00000000-0000-0000-0000-0000000000a1')::timestamptz,
  '2026-10-01 09:00+00'::timestamptz, 'Η τελευταία είσοδος έρχεται από το auth.users');
select ok((select e -> 'lastSignInAt' = 'null'::jsonb and e ? 'createdAt' from jsonb_array_elements(public.team_last_sign_in()) e
            where e ->> 'userId' = '00000000-0000-0000-0000-0000000000a4'), 'Ποτέ συνδεδεμένος = null');

select * from finish();
rollback;
