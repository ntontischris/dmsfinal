-- Μηνύματα e3: ποιος ακούει ποιο θέμα Realtime της Συνομιλίας, και ότι το σήμα δεν σπάει ποτέ την αποστολή.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(16);

-- a1 Ιδιοκτήτης · a2 Λογιστής (χωρίς «Συνομιλεί με πελάτη») · b1 Χρήστης πελάτη Α «Πλήρης» · b3 Β «Πλήρης» · b4 Α χωρίς Συνομιλία
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr'),
  ('00000000-0000-0000-0000-0000000000b3', 'k3@client-b.example.gr'),
  ('00000000-0000-0000-0000-0000000000b4', 'k4@client-a.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ελένη', 'accountant@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Λογιστής')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

insert into public.clients (id, name, afm, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', '123456789', 'Μαρία Παπαδάκη', 'a@example.com', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', '987654321', 'Νίκος Κίνης', 'b@example.com', '00000000-0000-0000-0000-0000000000a1');

insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Χωρίς Συνομιλία (τεστ)', 'Τεστ: χωρίς Δικαίωμα Συνομιλίας.', 'client', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.finance', 'all' from public.roles r where r.name = 'Χωρίς Συνομιλία (τεστ)';
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b3', 'Πάνος',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b4', 'Δήμητρα',
   (select r.id from public.roles r where r.name = 'Χωρίς Συνομιλία (τεστ)' and r.kind = 'client'), true);

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

create function public.t_allowed(p_topic text) returns boolean
language sql
as $$ select authz.chat_topic_allowed(p_topic); $$;

-- ───────────── Ο ανώνυμος δεν ρωτά καν ─────────────
set local role anon;
select throws_ok($$ select authz.chat_topic_allowed('chat-team:00000000-0000-0000-0000-0000000000c1') $$,
  '42501', null, 'Ο ανώνυμος δεν καλεί τον έλεγχο θεμάτων');
reset role;

-- ───────────── Ομάδα ─────────────
select public.t_as('a1');
select ok(public.t_allowed('chat-team:00000000-0000-0000-0000-0000000000c1'), 'Ο Ιδιοκτήτης ακούει τη Συνομιλία ομάδας του Α');
select ok(public.t_allowed('chat-team:00000000-0000-0000-0000-0000000000c2'), 'Ο Ιδιοκτήτης ακούει τη Συνομιλία ομάδας του Β');
select ok(not public.t_allowed('chat-client:00000000-0000-0000-0000-0000000000c1'), 'Η ομάδα δεν ακούει το θέμα του πελάτη');
select ok(not public.t_allowed('chat-team:όχι-πελάτης'), 'Άκυρο θέμα: όχι');
select ok(not public.t_allowed('notifications'), 'Ξένο θέμα: όχι');

select public.t_as('a2');
select ok(not public.t_allowed('chat-team:00000000-0000-0000-0000-0000000000c1'), 'Χωρίς «Συνομιλεί με πελάτη»: όχι');

-- ───────────── Πελάτης ─────────────
select public.t_as('b1');
select ok(public.t_allowed('chat-client:00000000-0000-0000-0000-0000000000c1'), 'Ο πελάτης Α ακούει το δικό του θέμα');
select ok(not public.t_allowed('chat-client:00000000-0000-0000-0000-0000000000c2'), 'Ο πελάτης Α δεν ακούει τον Β');
select ok(not public.t_allowed('chat-team:00000000-0000-0000-0000-0000000000c1'), 'Ο πελάτης δεν ακούει το θέμα της ομάδας (Εσωτερικά)');

select public.t_as('b3');
select ok(not public.t_allowed('chat-client:00000000-0000-0000-0000-0000000000c1'), 'Ο πελάτης Β δεν ακούει τον Α');

select public.t_as('b4');
select ok(not public.t_allowed('chat-client:00000000-0000-0000-0000-0000000000c1'), 'Χωρίς «Βλέπει Συνομιλία»: όχι');

-- ───────────── Το σήμα δεν σπάει την αποστολή ─────────────
select has_trigger('public', 'messages', 'messages_realtime', 'Σήμα σε κάθε αλλαγή Μηνύματος');
select has_trigger('public', 'message_requests', 'message_requests_realtime', 'Σήμα σε κάθε αλλαγή Αιτήματος');

select public.t_as('a1');
select lives_ok(
  $$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"Γεια σας από την ομάδα"}') $$,
  'Η αποστολή περνά με ή χωρίς Realtime');
select is(
  (select count(*)::int from public.messages m where m.client_id = '00000000-0000-0000-0000-0000000000c1'),
  1, 'Το Μήνυμα γράφτηκε');

select * from finish();
rollback;
