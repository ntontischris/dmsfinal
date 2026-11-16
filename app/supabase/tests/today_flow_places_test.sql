-- «Ξεκινώ τη μέρα μου» (G1): οι θέσεις των μισών οδηγών στον λογαριασμό (today_place_set / today_place_clear /
-- today_places). Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(19);

-- a1 Ιδιοκτήτης · a2 Παραγωγή · a6 ανενεργός · b1 Χρήστης πελάτη
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'gone@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr');
insert into public.team_users (user_id, name, email, is_active, deactivated_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'production@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a6', 'Νίκος', 'gone@example.com', false, timestamptz '2026-03-01 10:00+00');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

set local session_replication_role = replica;
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Καφέ Αθηνά', 'Μαρία Παπαδάκη', 'maria@athina.example.gr', null);
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';
set local session_replication_role = origin;

create function public.t_uid(p_last text) returns uuid
language sql immutable as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;
create function public.t_now() returns timestamptz
language sql immutable as $$ select timestamptz '2026-03-10 10:00+00'; $$;

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.today_places() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει θέσεις');
select throws_ok($$ select public.today_place_set('stino-gyrisma', '{"step":2}') $$, '42501', null,
  'Ο ανώνυμος δεν γράφει θέση');
select throws_ok($$ select public.today_place_clear('stino-gyrisma') $$, '42501', null, 'Ο ανώνυμος δεν σβήνει θέση');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.today_places() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει θέσεις');
select throws_ok($$ select public.today_place_set('stino-gyrisma', '{"step":2}') $$, '42501', null,
  'Ο Χρήστης πελάτη δεν γράφει θέση');
select throws_ok($$ select * from public.today_flow_places $$, '42501', null, 'Ο πίνακας today_flow_places είναι κλειστός');
select throws_ok($$ select authz.today_places(auth.uid()) $$, '42501', null, 'Οι συναρτήσεις authz δεν καλούνται απευθείας');
reset role;

select throws_ok($$ select authz.today_place_set(public.t_uid('a6'), 'stino-gyrisma', '{"step":2}', public.t_now()) $$,
  '42501', null, 'Ανενεργός Χρήστης: 42501');
select throws_ok($$ select authz.today_place_set(public.t_uid('a1'), 'Όχι οδηγός', '{"step":2}', public.t_now()) $$,
  'P0001', 'Άγνωστος οδηγός', 'Δουλειά εκτός μορφής: απορρίπτεται');
select throws_ok($$ select authz.today_place_set(public.t_uid('a1'), 'stino-gyrisma', '[1]', public.t_now()) $$,
  'P0001', 'Άγνωστη θέση', 'Θέση που δεν είναι αντικείμενο: απορρίπτεται');

-- ───────────── Θέσεις ─────────────
select is(authz.today_places(public.t_uid('a1')), '[]'::jsonb, 'Χωρίς μισό οδηγό: καμία θέση');
select lives_ok($$ select authz.today_place_set(public.t_uid('a1'), 'stino-gyrisma', '{"step":2,"reason":"exit"}',
  public.t_now()) $$, 'Ο Χρήστης γράφει τη θέση του');
select lives_ok($$ select authz.today_place_set(public.t_uid('a1'), 'apanto-se-pelates', '{"step":3,"reason":"exit"}',
  public.t_now() + interval '1 minute') $$, 'Δεύτερος οδηγός');
select is(authz.today_places(public.t_uid('a1')),
  '[{"job":"apanto-se-pelates","step":3,"reason":"exit"},{"job":"stino-gyrisma","step":2,"reason":"exit"}]'::jsonb,
  'Οι θέσεις, νεότερη πρώτη, με τη δουλειά');
select lives_ok($$ select authz.today_place_set(public.t_uid('a1'), 'stino-gyrisma', '{"step":3,"reason":"wait"}',
  public.t_now() + interval '2 minutes') $$, 'Ίδια δουλειά: αντικαθίσταται');
select is((select count(*)::int from public.today_flow_places f where f.user_id = public.t_uid('a1')), 2,
  'Μία θέση ανά δουλειά');
select is(authz.today_places(public.t_uid('a2')), '[]'::jsonb, 'Άλλος Χρήστης δεν βλέπει τις θέσεις');
select lives_ok($$ select authz.today_place_clear(public.t_uid('a1'), 'stino-gyrisma') $$, 'Η δουλειά τελείωσε');
-- Μαντείο: ό,τι λέει το RPC = οι γραμμές του πίνακα.
select is(authz.today_places(public.t_uid('a1')),
  (select jsonb_agg(f.place || jsonb_build_object('job', f.job)) from public.today_flow_places f
    where f.user_id = public.t_uid('a1')),
  'Μένει μόνο ο άλλος οδηγός');

select * from finish();
rollback;
