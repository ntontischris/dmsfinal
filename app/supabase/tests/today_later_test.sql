-- Σήμερα ως ενημέρωση, κομμάτι 3 (#241 Σ8): «νέο από την τελευταία φορά» (today_mark_seen) και «Αργότερα»
-- (today_snooze / today_unsnooze / today_snoozed). Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(32);

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
-- Τρίτη 10/3/2026 10:00 UTC = 12:00 Αθήνας (χειμερινή ώρα, +2).
create function public.t_now() returns timestamptz
language sql immutable as $$ select timestamptz '2026-03-10 10:00+00'; $$;

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.today_mark_seen() $$, '42501', null, 'Ο ανώνυμος δεν γράφει επίσκεψη');
select throws_ok($$ select public.today_snooze('unassigned:opportunity:1') $$, '42501', null, 'Ο ανώνυμος δεν κάνει «Αργότερα»');
select throws_ok($$ select public.today_unsnooze('unassigned:opportunity:1') $$, '42501', null, 'Ο ανώνυμος δεν κάνει Αναίρεση');
select throws_ok($$ select public.today_snoozed() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τα «Αργότερα»');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.today_mark_seen() $$, '42501', null, 'Ο Χρήστης πελάτη δεν γράφει επίσκεψη');
select throws_ok($$ select public.today_snooze('unassigned:opportunity:1') $$, '42501', null, 'Ο Χρήστης πελάτη δεν κάνει «Αργότερα»');
select throws_ok($$ select public.today_snoozed() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει τα «Αργότερα»');
select throws_ok($$ select * from public.today_snoozes $$, '42501', null, 'Ο πίνακας today_snoozes είναι κλειστός');
select throws_ok($$ select * from public.today_seen $$, '42501', null, 'Ο πίνακας today_seen είναι κλειστός');
select throws_ok($$ select authz.today_snooze(auth.uid(), 'unassigned:x', now()) $$, '42501', null,
  'Οι συναρτήσεις authz δεν καλούνται απευθείας');
reset role;

select throws_ok($$ select authz.today_snooze(public.t_uid('a6'), 'unassigned:x', public.t_now()) $$, '42501', null,
  'Ανενεργός Χρήστης: 42501');
select throws_ok($$ select authz.today_mark_seen(public.t_uid('a6'), public.t_now()) $$, '42501', null,
  'Ανενεργός Χρήστης: δεν γράφει επίσκεψη');
select throws_ok($$ select authz.today_snooze(public.t_uid('a1'), 'Όχι κλειδί', public.t_now()) $$, 'P0001', 'Άγνωστη απόφαση',
  'Κλειδί εκτός μορφής «κάρτα:id»: απορρίπτεται');

-- ───────────── Ως αύριο το πρωί ─────────────
select is(authz.today_next_morning(public.t_now()), timestamptz '2026-03-11 06:00+00',
  '12:00 Αθήνας → αύριο 08:00 Αθήνας');
select is(authz.today_next_morning(timestamptz '2026-03-10 04:00+00'), timestamptz '2026-03-10 06:00+00',
  '06:00 Αθήνας (πριν από τις 8) → σήμερα 08:00');
select is(authz.today_next_morning(timestamptz '2026-03-28 21:00+00'), timestamptz '2026-03-29 05:00+00',
  'Η αλλαγή ώρας: Σάββατο 23:00 → Κυριακή 08:00 θερινής ώρας (+3)');

-- ───────────── Αργότερα ─────────────
select is(authz.today_snooze(public.t_uid('a1'), 'unassigned:opportunity:1', public.t_now()), timestamptz '2026-03-11 06:00+00',
  'Το «Αργότερα» κρύβει ως αύριο 08:00 Αθήνας');
select is(authz.today_snoozed(public.t_uid('a1'), public.t_now()), array['unassigned:opportunity:1'],
  'Ο Χρήστης βλέπει τι έκρυψε');
select is(authz.today_snoozed(public.t_uid('a2'), public.t_now()), '{}'::text[], 'Άλλος Χρήστης δεν το βλέπει');
select is(authz.today_snoozed(public.t_uid('a1'), timestamptz '2026-03-11 06:00+00'), '{}'::text[],
  'Στις 08:00 Αθήνας ξαναβγαίνει');
-- Μαντείο: ό,τι λέει το RPC = οι γραμμές του πίνακα που δεν έληξαν.
select is(authz.today_snoozed(public.t_uid('a1'), public.t_now()),
  array(select s.item_key from public.today_snoozes s
         where s.user_id = public.t_uid('a1') and s.until > public.t_now() order by s.item_key),
  'Μαντείο: τα κλειδιά = οι γραμμές του πίνακα με until μετά το τώρα');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select public.today_snooze('filming_approvals:booking:00000000-0000-0000-0000-000000000021') $$,
  'Ο Ιδιοκτήτης κάνει «Αργότερα» από το public RPC');
select ok('filming_approvals:booking:00000000-0000-0000-0000-000000000021' = any (public.today_snoozed()),
  'Και το βλέπει στα «Αργότερα»');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select is(public.today_snoozed(), '{}'::text[], 'Η Παραγωγή δεν βλέπει τα «Αργότερα» του Ιδιοκτήτη');
select lives_ok($$ select public.today_unsnooze('filming_approvals:booking:00000000-0000-0000-0000-000000000021') $$,
  'Η Αναίρεση άλλου Χρήστη δεν ρίχνει…');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select ok('filming_approvals:booking:00000000-0000-0000-0000-000000000021' = any (public.today_snoozed()),
  '…και δεν αγγίζει τα «Αργότερα» του Ιδιοκτήτη');
select lives_ok($$ select public.today_unsnooze('filming_approvals:booking:00000000-0000-0000-0000-000000000021') $$,
  'Ο Ιδιοκτήτης κάνει Αναίρεση');
select ok(not ('filming_approvals:booking:00000000-0000-0000-0000-000000000021' = any (public.today_snoozed())),
  'Η Αναίρεση το ξαναφέρνει αμέσως');
reset role;

-- ───────────── Νέο από την τελευταία φορά ─────────────
select is(authz.today_mark_seen(public.t_uid('a2'), timestamptz '2026-03-10 08:00+00'), null::timestamptz,
  'Πρώτη επίσκεψη: καμία προηγούμενη');
select is(authz.today_mark_seen(public.t_uid('a2'), timestamptz '2026-03-10 08:10+00'), null::timestamptz,
  'Ξαναφόρτωμα μέσα σε 30 λεπτά: ίδια επίσκεψη, ίδια προηγούμενη');
select is(authz.today_mark_seen(public.t_uid('a2'), timestamptz '2026-03-10 10:00+00'), timestamptz '2026-03-10 08:10+00',
  'Νέα επίσκεψη: επιστρέφει πότε τελείωσε η προηγούμενη');
select is(authz.today_mark_seen(public.t_uid('a2'), timestamptz '2026-03-10 10:20+00'), timestamptz '2026-03-10 08:10+00',
  'Μέσα στη νέα επίσκεψη (π.χ. μετά από «Αργότερα») τα «νέο» δεν σβήνουν');

select * from finish();
rollback;
