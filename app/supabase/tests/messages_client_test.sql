-- Μηνύματα Jβ #161: ο Χρήστης πελάτη. Ο Πελάτης του, Δικαιώματα ανάγνωσης και γραφής, ετικέτες μόνο από τις Παραγωγές του,
-- κανένα Εσωτερικό, διόρθωση και διαγραφή μόνο των δικών του. Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(30);

-- a1 Ιδιοκτήτης · a2 Λογιστής · b1 Χρήστης πελάτη Α «Πλήρης» · b2 Α μόνο «Βλέπει Συνομιλία» · b3 Β «Πλήρης» · b4 Α χωρίς Συνομιλία
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'k2@client-a.example.gr'),
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
  ('Μόνο ανάγνωση Συνομιλίας (τεστ)', 'Τεστ: μόνο διαβάζει τη Συνομιλία.', 'client', false, false),
  ('Χωρίς Συνομιλία (τεστ)', 'Τεστ: χωρίς Δικαίωμα Συνομιλίας.', 'client', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.chatRead', 'all' from public.roles r where r.name = 'Μόνο ανάγνωση Συνομιλίας (τεστ)';
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.finance', 'all' from public.roles r where r.name = 'Χωρίς Συνομιλία (τεστ)';
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'Λία',
   (select r.id from public.roles r where r.name = 'Μόνο ανάγνωση Συνομιλίας (τεστ)' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b3', 'Πάνος',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b4', 'Δήμητρα',
   (select r.id from public.roles r where r.name = 'Χωρίς Συνομιλία (τεστ)' and r.kind = 'client'), true);

-- Παραγωγές χωρίς Συμφωνίες: οι ξένοι κλειδιά και οι triggers παρακάμπτονται μόνο για αυτή την εισαγωγή.
set local session_replication_role = replica;
insert into public.productions (id, title, client_id, agreement_id, owner_id, state, cancelled_at, cancelled_reason) values
  ('00000000-0000-0000-0000-0000000000f1', 'Reel Α', '00000000-0000-0000-0000-0000000000c1', gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', 'open', null, null),
  ('00000000-0000-0000-0000-0000000000f2', 'Reel Β', '00000000-0000-0000-0000-0000000000c2', gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', 'open', null, null),
  ('00000000-0000-0000-0000-0000000000f3', 'Ακυρωμένο Α', '00000000-0000-0000-0000-0000000000c1', gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', 'cancelled', now(), 'Τεστ');
reset session_replication_role;

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

create function public.t_msg(p_key text, p jsonb) returns void
language plpgsql
as $$
begin
  perform set_config('t.' || p_key, public.message_send(p)->>'id', true);
end;
$$;

create function public.t_thread(p_client text) returns jsonb
language sql
as $$ select public.messages_thread(p_client::uuid); $$;

-- ───────────── Ο Πελάτης του ─────────────
set local role anon;
select throws_ok($$ select public.messages_my_client() $$, '42501', null, 'Ο ανώνυμος δεν έχει Πελάτη');
reset role;

select public.t_as('a1');
select throws_ok($$ select public.messages_my_client() $$, '42501', null, 'Η ομάδα δεν είναι Χρήστης πελάτη');
select public.t_as('a2');
select throws_ok($$ select public.messages_my_client() $$, '42501', null, 'Ο Λογιστής δεν είναι Χρήστης πελάτη');
select public.t_as('b4');
select throws_ok($$ select public.messages_my_client() $$, '42501', null, 'Χρήστης πελάτη χωρίς c.chatRead δεν έχει Συνομιλία');
select throws_ok($$ select public.messages_thread('00000000-0000-0000-0000-0000000000c1') $$, '42501', null, 'Χωρίς c.chatRead: 42501 στη Συνομιλία');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"x"}') $$, '42501', null, 'Χωρίς c.chatWrite: 42501 στην αποστολή');
select public.t_as('b1');
select is(public.messages_my_client(), '00000000-0000-0000-0000-0000000000c1'::uuid, 'Ο πελάτης Α παίρνει τον Πελάτη Α');
select public.t_as('b2');
select is(public.messages_my_client(), '00000000-0000-0000-0000-0000000000c1'::uuid, 'Ο πελάτης μόνο ανάγνωσης παίρνει τον Πελάτη του');
select public.t_as('b3');
select is(public.messages_my_client(), '00000000-0000-0000-0000-0000000000c2'::uuid, 'Ο πελάτης Β παίρνει τον Πελάτη Β');

-- ───────────── Μηνύματα της ομάδας ─────────────
select public.t_as('a1');
select public.t_msg('t1', '{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"Καλημέρα από την ομάδα"}');
select public.t_msg('t2', '{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"Εσωτερική σημείωση","internal":true}');

-- ───────────── Ο πελάτης γράφει ─────────────
select public.t_as('b1');
select is(jsonb_array_length(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'productions'), 1, 'Ετικέτες πελάτη: μόνο μη ακυρωμένες Παραγωγές του Πελάτη του');
select is(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'productions'->0->>'title', 'Reel Α', 'Η ετικέτα είναι η Παραγωγή του');
select is((public.t_thread('00000000-0000-0000-0000-0000000000c1')->>'canWrite')::boolean, true, 'Με c.chatWrite: canWrite');
select public.t_msg('c1', '{"clientId":"00000000-0000-0000-0000-0000000000c1","productionId":"00000000-0000-0000-0000-0000000000f1","body":"Ερώτηση για το Reel"}');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","productionId":"00000000-0000-0000-0000-0000000000f2","body":"x"}') $$, 'P0001', null, 'Ετικέτα με Παραγωγή άλλου Πελάτη: P0001');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","productionId":"00000000-0000-0000-0000-0000000000f3","body":"x"}') $$, 'P0001', null, 'Ετικέτα με ακυρωμένη Παραγωγή: P0001');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c2","body":"x"}') $$, '42501', null, 'Ο πελάτης Α δεν γράφει στη Συνομιλία του Β');

-- ───────────── Ορατότητα ─────────────
select is(jsonb_array_length(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'messages'), 2, 'Ο πελάτης βλέπει 2 Μηνύματα: της ομάδας και το δικό του, όχι το Εσωτερικό');
select ok(not exists (
  select 1 from jsonb_array_elements(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'messages') x
   where x->>'body' = 'Εσωτερική σημείωση'), 'Ο πελάτης δεν βλέπει Εσωτερικά');
select ok(not exists (
  select 1 from jsonb_array_elements(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'messages') x
   where x ? 'internal' or x ? 'mentions'), 'Τα Μηνύματα του πελάτη δεν έχουν internal ούτε mentions');
select throws_ok($$ select public.messages_thread('00000000-0000-0000-0000-0000000000c2') $$, '42501', null, 'Ο πελάτης Α δεν βλέπει τη Συνομιλία του Β');
select public.t_as('b3');
select throws_ok($$ select public.messages_thread('00000000-0000-0000-0000-0000000000c1') $$, '42501', null, 'Ο πελάτης Β δεν βλέπει τη Συνομιλία του Α');

-- ───────────── Μόνο ανάγνωση ─────────────
select public.t_as('b2');
select is(jsonb_array_length(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'messages'), 2, 'Μόνο c.chatRead: διαβάζει τη Συνομιλία');
select is((public.t_thread('00000000-0000-0000-0000-0000000000c1')->>'canWrite')::boolean, false, 'Μόνο c.chatRead: canWrite false');
select is(jsonb_array_length(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'productions'), 0, 'Μόνο c.chatRead: καμία ετικέτα');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"x"}') $$, '42501', null, 'Μόνο c.chatRead: η αποστολή δίνει 42501');
select throws_ok($$ select public.message_edit(current_setting('t.c1')::uuid, 'ξένο') $$, '42501', null, 'Ο πελάτης δεν διορθώνει Μήνυμα άλλου πελάτη');
select throws_ok($$ select public.message_delete(current_setting('t.c1')::uuid) $$, '42501', null, 'Ο πελάτης δεν διαγράφει Μήνυμα άλλου πελάτη');

-- ───────────── Διόρθωση και διαγραφή των δικών του ─────────────
select public.t_as('b1');
select lives_ok($$ select public.message_edit(current_setting('t.c1')::uuid, 'Ερώτηση για το Reel, διορθωμένη') $$, 'Ο πελάτης διορθώνει το δικό του');
select throws_ok($$ select public.message_edit(current_setting('t.t1')::uuid, 'ξένο') $$, '42501', null, 'Ο πελάτης δεν διορθώνει Μήνυμα της ομάδας');
select throws_ok($$ select public.message_delete(current_setting('t.t1')::uuid) $$, '42501', null, 'Ο πελάτης δεν διαγράφει Μήνυμα της ομάδας');
select lives_ok($$ select public.message_delete(current_setting('t.c1')::uuid) $$, 'Ο πελάτης διαγράφει το δικό του');

select * from finish();
rollback;
