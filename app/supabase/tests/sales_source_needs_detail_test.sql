-- Πηγή που θέλει περιγραφή (MIG 20261112100000_sales_source_needs_detail.sql). Φανταστικά δεδομένα· όλα ζουν μέσα
-- στη συναλλαγή. Οι κλειστοί πίνακες διαβάζονται μόνο μετά από reset role.
begin;
select plan(10);

-- a1 Ιδιοκτήτης · a3 Άννα (Πωλήσεις)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'anna@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'anna@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- Νέος Πελάτης με τη Πηγή p_code και την περιγραφή p_detail.
create function public.t_new(p_n text, p_code text, p_detail text) returns jsonb
language sql
as $$
  select public.sales_create_opportunity(null,
    jsonb_build_object('name', 'Δοκιμή Πηγής ' || p_n, 'contact_name', 'Επαφή',
                       'contact_email', 'source' || p_n || '@example.com', 'contact_phone', ''),
    'Βίντεο', (select id from public.sales_sources where code = p_code), p_detail, 'Κλήση', date '2099-01-05');
$$;

select is(
  (select array_agg(code order by code) from public.sales_sources where needs_detail),
  array['other', 'referral'], 'Από την αρχή περιγραφή θέλουν η «Σύσταση» και το «Άλλο»'
);

set local role authenticated;
select public.t_as('a3');
select throws_ok($$ select public.t_new('1', 'other', '') $$, 'P0001',
  'Γράψε ποια είναι η Πηγή (π.χ. ποιος μας σύστησε)', '«Άλλο» χωρίς περιγραφή δεν περνά');
select throws_ok($$ select public.t_new('2', 'referral', '   ') $$, 'P0001',
  'Γράψε ποια είναι η Πηγή (π.χ. ποιος μας σύστησε)', 'Μόνο κενά δεν μετράνε για περιγραφή');
select set_config('t.r1', public.t_new('3', 'other', '  Έκθεση γάμου ')::text, true);
select is(current_setting('t.r1')::jsonb ->> 'status', 'created', '«Άλλο» με περιγραφή περνά');
select lives_ok($$ select public.t_new('4', 'phone', '') $$, 'Πηγή χωρίς σημαία δεν θέλει περιγραφή');

-- Ο πωλητής δεν αλλάζει τη σημαία (RLS: «Διαχειρίζεται Ρυθμίσεις»)· ο Ιδιοκτήτης ναι.
update public.sales_sources set needs_detail = true where code = 'phone';
select public.t_as('a1');
select is((select needs_detail from public.sales_sources where code = 'phone'), false,
  'Ο πωλητής δεν αλλάζει τη σημαία');
update public.sales_sources set needs_detail = true where code = 'phone';
select is((select needs_detail from public.sales_sources where code = 'phone'), true,
  'Ο Ιδιοκτήτης ορίζει ότι μια Πηγή θέλει περιγραφή');
select public.t_as('a3');
select throws_ok($$ select public.t_new('5', 'phone', '') $$, 'P0001', null,
  'Η σημαία ισχύει αμέσως, χωρίς κώδικα για τη συγκεκριμένη Πηγή');

-- Υπάρχων Πελάτης χωρίς Πηγή: η Πηγή κληρονομείται και δεν ξαναρωτιέται περιγραφή.
select lives_ok(format($$ select public.sales_create_opportunity(%L, null, 'Δεύτερο', null, '', 'Κλήση', date '2099-01-05') $$,
  current_setting('t.r1')::jsonb ->> 'client_id'), 'Η κληρονομημένη Πηγή δεν θέλει ξανά περιγραφή');

reset role;
select is(
  (select referred_by from public.opportunities where id = (current_setting('t.r1')::jsonb ->> 'opportunity_id')::uuid),
  'Έκθεση γάμου', 'Η περιγραφή κρατιέται στην Ευκαιρία, χωρίς τα κενά'
);

select * from finish();
rollback;
