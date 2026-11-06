-- Δραστηριότητες στον Πελάτη, με ώρα, διόρθωση και διαγραφή (MIG 20261112120000_activity_log_client_level.sql).
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι κλειστοί πίνακες διαβάζονται μόνο μετά από reset role.
begin;
select plan(30);

-- a1 Ιδιοκτήτης · a2 Λογιστής · a3 Άννα (Πωλήσεις, Υπεύθυνη c1) · a4 Νίκος (Πωλήσεις, Υπεύθυνος c3)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'nikos@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Κώστας', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Νίκος', 'nikos@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Λογιστής'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
               ('00000000-0000-0000-0000-0000000000a4', 'Πωλήσεις')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

set local session_replication_role = replica;
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Φούρνος Δοκιμής', 'Επαφή', 'c1@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c3', 'Ταβέρνα Δοκιμής', 'Επαφή', 'c3@example.com', '00000000-0000-0000-0000-0000000000a4');
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select x.id::uuid, x.client_id::uuid, x.title, (select s.id from public.sales_stages s where s.code = 'new'),
       (select s.id from public.sales_sources s where s.code = 'phone'), x.manager::uuid, 'Κλήση', date '2099-01-08'
  from (values
    ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Βίντεο', '00000000-0000-0000-0000-0000000000a3'),
    ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000c3', 'Γάμος', '00000000-0000-0000-0000-0000000000a4')
  ) as x (id, client_id, title, manager);
-- Αυτόματη Δραστηριότητα της e1 (δεν αλλάζει ποτέ).
insert into public.opportunity_activities (id, opportunity_id, client_id, actor_id, event, subject_id) values
  ('00000000-0000-0000-0000-0000000000d0', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000a3', 'created', (select s.id from public.sales_stages s where s.code = 'new'));
set local session_replication_role = origin;

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

create function public.t_kind(p_code text) returns uuid
language sql stable
as $$ select k.id from public.sales_activity_kinds k where k.code = p_code; $$;

create function public.t_seen(p_id text) returns integer
language sql stable
as $$ select count(*)::integer from public.opportunity_activities where id = p_id::uuid; $$;

-- ───────────── Άρνηση ─────────────

set local role anon;
select throws_ok($$ select public.sales_log_activity(null, null, 'x', '00000000-0000-0000-0000-0000000000c1') $$, '42501', null,
  'Ο ανώνυμος δεν γράφει Δραστηριότητα');
select throws_ok($$ select public.sales_delete_activity('00000000-0000-0000-0000-0000000000d0') $$, '42501', null,
  'Ο ανώνυμος δεν σβήνει Δραστηριότητα');

set local role authenticated;
select public.t_as('a4');
select throws_ok(
  $$ select public.sales_log_activity(null, public.t_kind('note'), 'Παρείσακτη', '00000000-0000-0000-0000-0000000000c1') $$,
  '42501', 'Τον Πελάτη τον δουλεύει ο Υπεύθυνός του', 'Πωλητής δεν γράφει στον Πελάτη άλλου');
select public.t_as('a2');
select throws_ok(
  $$ select public.sales_log_activity(null, public.t_kind('note'), 'Λογιστής', '00000000-0000-0000-0000-0000000000c1') $$,
  '42501', null, 'Ο Λογιστής δεν γράφει Δραστηριότητες');

-- ───────────── Στον Πελάτη, χωρίς Ευκαιρία, με ώρα ─────────────

select public.t_as('a3');
select set_config('t.n1', public.sales_log_activity(null, public.t_kind('call'), '  Του τηλεφώνησα  ',
  '00000000-0000-0000-0000-0000000000c1', now() - interval '2 days')::text, true);
select is(public.t_seen(current_setting('t.n1')), 1, 'Η Υπεύθυνη γράφει και βλέπει Δραστηριότητα στον Πελάτη');
select throws_ok(
  $$ select public.sales_log_activity(null, public.t_kind('note'), 'Αύριο', '00000000-0000-0000-0000-0000000000c1',
       now() + interval '1 day') $$,
  'P0001', 'Η ώρα της Δραστηριότητας δεν μπορεί να είναι στο μέλλον', 'Η ώρα δεν πάει στο μέλλον');
select throws_ok(
  $$ select public.sales_log_activity(null, public.t_kind('note'), 'Πέρσι', '00000000-0000-0000-0000-0000000000c1',
       now() - interval '400 days') $$,
  'P0001', 'Η ώρα της Δραστηριότητας δεν πάει πάνω από έναν χρόνο πίσω', 'Η ώρα δεν πάει πάνω από έναν χρόνο πίσω');
select throws_ok($$ select public.sales_log_activity(null, public.t_kind('note'), 'Πού;') $$,
  'P0001', 'Διάλεξε Πελάτη ή Ευκαιρία', 'Χωρίς Πελάτη και χωρίς Ευκαιρία: σφάλμα');
select throws_ok(
  $$ select public.sales_log_activity('00000000-0000-0000-0000-0000000000e1', public.t_kind('note'), 'Λάθος',
       '00000000-0000-0000-0000-0000000000c3') $$,
  'P0001', 'Η Ευκαιρία δεν είναι αυτού του Πελάτη', 'Ευκαιρία άλλου Πελάτη: σφάλμα');
select set_config('t.o1', public.sales_log_activity('00000000-0000-0000-0000-0000000000e1', public.t_kind('email'),
  'Στάλθηκε πρόταση')::text, true);
select ok(current_setting('t.o1')::uuid is not null, 'Δραστηριότητα σε Ευκαιρία γράφεται όπως πριν');

reset role;
select is(
  (select jsonb_build_object('opp', opportunity_id, 'client', client_id, 'body', body,
                             'past', occurred_at < created_at - interval '1 day')
     from public.opportunity_activities where id = current_setting('t.n1')::uuid),
  jsonb_build_object('opp', null, 'client', '00000000-0000-0000-0000-0000000000c1', 'body', 'Του τηλεφώνησα', 'past', true),
  'Χωρίς Ευκαιρία, στον Πελάτη, με την ώρα που δόθηκε και καθαρό κείμενο'
);
select throws_ok(
  $$ insert into public.opportunity_activities (client_id, event) values ('00000000-0000-0000-0000-0000000000c1', 'created') $$,
  'P0001', null, 'Αυτόματη Δραστηριότητα χωρίς Ευκαιρία δεν γράφεται');

-- ───────────── Ορατότητα ─────────────

set local role authenticated;
select public.t_as('a4');
select is(public.t_seen(current_setting('t.n1')), 0, 'Άλλος πωλητής δεν τη βλέπει');
select public.t_as('a2');
select is(public.t_seen(current_setting('t.n1')), 1, 'Όποιος βλέπει τον Πελάτη (Λογιστής) βλέπει τη Δραστηριότητα του Πελάτη');
select public.t_as('a3');
-- Η πιο πρόσφατη επαφή είναι το email της Ευκαιρίας (τώρα)· η σημείωση του Πελάτη είναι 2 μέρες πίσω.
select ok(
  (select l.last_contact from public.sales_client_last_contacts(array['00000000-0000-0000-0000-0000000000c1'::uuid]) l)
    > now() - interval '1 minute', 'Τελευταία επαφή: η πιο πρόσφατη χειροκίνητη');

-- ───────────── Διόρθωση ─────────────

select public.t_as('a4');
select throws_ok(format($$ select public.sales_edit_activity(%L, public.t_kind('note'), 'Όχι', now()) $$, current_setting('t.n1')),
  '42501', null, 'Άλλος πωλητής δεν διορθώνει');
select public.t_as('a3');
select lives_ok(format($$ select public.sales_edit_activity(%L, public.t_kind('meeting'), 'Συναντηθήκαμε', now() - interval '3 days') $$,
  current_setting('t.n1')), 'Όποια τη γράφει τη διορθώνει μέσα σε 24 ώρες');
select throws_ok(format($$ select public.sales_edit_activity(%L, public.t_kind('note'), 'Αύριο', now() + interval '1 day') $$,
  current_setting('t.n1')), 'P0001', 'Η ώρα της Δραστηριότητας δεν μπορεί να είναι στο μέλλον', 'Η διόρθωση σέβεται τα όρια ώρας');
select throws_ok($$ select public.sales_edit_activity('00000000-0000-0000-0000-0000000000d0', public.t_kind('note'), 'Χ', now()) $$,
  '42501', null, 'Η αυτόματη Δραστηριότητα δεν διορθώνεται');

reset role;
select is(
  (select jsonb_build_object('kind', kind_id = public.t_kind('meeting'), 'body', body, 'by', edited_by)
     from public.opportunity_activities where id = current_setting('t.n1')::uuid),
  jsonb_build_object('kind', true, 'body', 'Συναντηθήκαμε', 'by', '00000000-0000-0000-0000-0000000000a3'),
  'Η διόρθωση γράφει είδος, κείμενο και ποιος τη διόρθωσε'
);
select throws_ok(format($$ update public.opportunity_activities set body = 'Κρυφά' where id = %L $$, current_setting('t.n1')),
  'P0001', 'Το ιστορικό δέχεται μόνο προσθήκες', 'Χωρίς το RPC καμία αλλαγή');

-- Πέρασαν 25 ώρες από την καταγραφή.
set local session_replication_role = replica;
update public.opportunity_activities set created_at = now() - interval '25 hours' where id = current_setting('t.n1')::uuid;
set local session_replication_role = origin;

set local role authenticated;
select public.t_as('a3');
select throws_ok(format($$ select public.sales_edit_activity(%L, public.t_kind('note'), 'Αργά', now()) $$, current_setting('t.n1')),
  '42501', null, 'Μετά από 24 ώρες ο συντάκτης δεν διορθώνει');
select throws_ok(format($$ select public.sales_delete_activity(%L) $$, current_setting('t.n1')),
  '42501', null, 'Μετά από 24 ώρες ο συντάκτης δεν σβήνει');
select public.t_as('a1');
select lives_ok(format($$ select public.sales_edit_activity(%L, public.t_kind('meeting'), 'Συναντηθήκαμε στο μαγαζί', now() - interval '3 days') $$,
  current_setting('t.n1')), 'Ο Ιδιοκτήτης διορθώνει πάντα');

-- ───────────── Διαγραφή ─────────────

select public.t_as('a3');
select lives_ok(format($$ select public.sales_delete_activity(%L) $$, current_setting('t.o1')),
  'Η συντάκτρια σβήνει μέσα σε 24 ώρες');
select is(public.t_seen(current_setting('t.o1')), 0, 'Η σβησμένη δεν φαίνεται');
select public.t_as('a1');
select lives_ok(format($$ select public.sales_delete_activity(%L) $$, current_setting('t.n1')), 'Ο Ιδιοκτήτης σβήνει πάντα');
select throws_ok(format($$ select public.sales_delete_activity(%L) $$, current_setting('t.n1')),
  '42501', null, 'Η σβησμένη δεν ξανασβήνεται ούτε διορθώνεται');
select is(
  (select l.last_contact from public.sales_client_last_contacts(array['00000000-0000-0000-0000-0000000000c1'::uuid]) l),
  null, 'Οι σβησμένες δεν μετράνε για τελευταία επαφή'
);

reset role;
select is((select count(*)::integer from public.opportunity_activities where deleted_at is not null and deleted_by is not null), 2,
  'Η διαγραφή είναι ήπια: η γραμμή μένει με το ποιος τη έσβησε');

select * from finish();
rollback;
