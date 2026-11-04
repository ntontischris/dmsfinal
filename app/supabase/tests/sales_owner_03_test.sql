-- Walkthrough Ιδιοκτήτη 03, πρώτος γύρος: «Πιθανό διπλό» και στις δύο μεριές, και Πηγή μόνο για νέο Πελάτη
-- (MIG 20261105160000_sales_owner_03_round_1.sql). Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
-- Οι κλειστοί πίνακες διαβάζονται μόνο μετά από reset role.
begin;
select plan(15);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a3 Άννα (Πωλήσεις) · a4 Νίκος (Πωλήσεις)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'nikos@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'anna@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Νίκος', 'nikos@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
               ('00000000-0000-0000-0000-0000000000a4', 'Πωλήσεις')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Δεδομένα (άμεσες εγγραφές, χωρίς triggers) ─────────────
-- c1 Φούρνος (Άννα) · c2 Δοκιμή (Άννα), νέος με σήμα «μοιάζει με τον c1» · c3 Ταβέρνα (Νίκος) · c4 τρίτος, χωρίς σήμα
set local session_replication_role = replica;
insert into public.clients (id, name, contact_name, contact_email, contact_phone, manager_id)
select x.id::uuid, x.name, 'Επαφή', x.email, x.phone, x.manager::uuid
  from (values
    ('00000000-0000-0000-0000-0000000000c1', 'Φούρνος Δοκιμής', 'c1@example.com', '2310 000 901', '00000000-0000-0000-0000-0000000000a3'),
    ('00000000-0000-0000-0000-0000000000c2', 'Δοκιμή Διπλού', 'c2@example.com', '2310 000 901', '00000000-0000-0000-0000-0000000000a3'),
    ('00000000-0000-0000-0000-0000000000c3', 'Ταβέρνα Δοκιμής', 'c3@example.com', '', '00000000-0000-0000-0000-0000000000a4'),
    ('00000000-0000-0000-0000-0000000000c4', 'Τρίτος Δοκιμής', 'c4@example.com', '', '00000000-0000-0000-0000-0000000000a3')
  ) as x (id, name, email, phone, manager);

-- Ευκαιρίες: ο c1 ήρθε από Τηλέφωνο (πρώτη) και μετά είχε μία από Instagram · ο c3 από Σύσταση
insert into public.opportunities (client_id, title, stage_id, source_id, manager_id, next_step, next_step_due, created_at)
select x.client_id::uuid, x.title,
       (select s.id from public.sales_stages s where s.code = 'new'), (select s.id from public.sales_sources s where s.code = x.source),
       x.manager::uuid, 'Κλήση', date '2099-01-01', x.created::timestamptz
  from (values
    ('00000000-0000-0000-0000-0000000000c1', 'Πρώτη', 'phone', '00000000-0000-0000-0000-0000000000a3', '2026-01-01 10:00+00'),
    ('00000000-0000-0000-0000-0000000000c1', 'Δεύτερη', 'instagram', '00000000-0000-0000-0000-0000000000a3', '2026-02-01 10:00+00'),
    ('00000000-0000-0000-0000-0000000000c3', 'Γάμος', 'referral', '00000000-0000-0000-0000-0000000000a4', '2026-01-01 10:00+00')
  ) as x (client_id, title, source, manager, created);

insert into public.client_duplicate_flags (id, client_id, matches_client_id, reason) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c1', 'phone');

-- Η Πηγή «Τηλέφωνο» αποσύρεται: ο c1 ήρθε από εκεί, άρα η νέα του Ευκαιρία τη δέχεται.
update public.sales_sources set retired_at = now() where code = 'phone';
set local session_replication_role = origin;

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- ───────────── Άρνηση ─────────────

set local role anon;
select throws_ok($$ select public.sales_client_source('00000000-0000-0000-0000-0000000000c1') $$, '42501', null,
  'Ο ανώνυμος δεν καλεί την εσωτερική Πηγή Πελάτη');

set local role authenticated;
select public.t_as('a3');
select throws_ok($$ select public.sales_client_source('00000000-0000-0000-0000-0000000000c1') $$, '42501', null,
  'Κανένας Χρήστης δεν καλεί την εσωτερική Πηγή Πελάτη');
select is((select bool_or(is_possible_duplicate) from public.sales_client_list()), false,
  'Ο πωλητής δεν βλέπει το σήμα σε καμία μεριά');

-- ───────────── «Πιθανό διπλό» και στις δύο μεριές ─────────────

select public.t_as('a1');
select is(
  (select array_agg(name order by name) from public.sales_client_list() where is_possible_duplicate),
  array['Δοκιμή Διπλού', 'Φούρνος Δοκιμής'],
  'Ο Ιδιοκτήτης βλέπει το σήμα και στον νέο και στον υπάρχοντα Πελάτη'
);
select is(
  (select is_possible_duplicate from public.sales_client_list(null, 100, 0, '00000000-0000-0000-0000-0000000000c1')),
  true, 'Η κάρτα του υπάρχοντος Πελάτη (Σελίδα Πελάτη) έχει το σήμα'
);
select is(
  (select is_possible_duplicate from public.sales_client_list(null, 100, 0, '00000000-0000-0000-0000-0000000000c4')),
  false, 'Πελάτης έξω από το ζευγάρι δεν έχει σήμα'
);
select is(jsonb_array_length(public.sales_duplicate_pairs()), 1, 'Μία εκκρεμότητα για το ζευγάρι, όχι δύο');
select lives_ok($$ select public.sales_resolve_duplicate('00000000-0000-0000-0000-0000000000f1') $$,
  '«Είναι άλλος» κλείνει την εκκρεμότητα');
select is((select count(*)::int from public.sales_client_list() where is_possible_duplicate), 0,
  'Η απόφαση καθαρίζει το σήμα και από τις δύο μεριές');

-- ───────────── Πηγή μόνο για νέο Πελάτη ─────────────

select public.t_as('a3');
select set_config('t.r1', public.sales_create_opportunity(
  '00000000-0000-0000-0000-0000000000c1', null, 'Νέο πακέτο', null, '', 'Κλήση', current_date + 1)::text, true);
select is(current_setting('t.r1')::jsonb ->> 'status', 'created',
  'Νέα Ευκαιρία σε υπάρχοντα Πελάτη χωρίς Πηγή (ακόμη κι αν η Πηγή του αποσύρθηκε)');
select throws_ok(
  format($$ select public.sales_create_opportunity('00000000-0000-0000-0000-0000000000c1', null, 'Άλλο', %L, '', 'Κλήση', current_date + 1) $$,
    (select id from public.sales_sources where code = 'phone')),
  'P0001', 'Η Πηγή έχει αποσυρθεί', 'Αποσυρμένη Πηγή που διαλέγεται ρητά δεν περνά (η εξαίρεση ίσχυσε μόνο για εκείνη την εισαγωγή)'
);
select throws_ok(
  $$ select public.sales_create_opportunity(null,
       '{"name":"Ολοκαίνουργιος","contact_name":"Ελένη","contact_email":"eleni@new-client.example.gr","contact_phone":""}'::jsonb,
       'Βίντεο', null, '', 'Κλήση', current_date + 1) $$,
  'P0001', 'Διάλεξε Πηγή', 'Νέος Πελάτης χωρίς Πηγή: σφάλμα'
);
select set_config('t.req', public.sales_request_access(
  '00000000-0000-0000-0000-0000000000c3', 'Καμπάνια', '', null)::text, true);
select throws_ok(
  format($$ select public.sales_request_access('00000000-0000-0000-0000-0000000000c3', 'Άλλο', '', %L) $$,
    (select id from public.sales_sources where code = 'phone')),
  'P0001', 'Η Πηγή έχει αποσυρθεί', 'Αίτημα με ρητά αποσυρμένη Πηγή δεν περνά'
);

reset role;
select is(
  (select s.code from public.opportunities o join public.sales_sources s on s.id = o.source_id
    where o.id = (current_setting('t.r1')::jsonb ->> 'opportunity_id')::uuid),
  'phone', 'Η Ευκαιρία παίρνει την Πηγή της πρώτης Ευκαιρίας του Πελάτη'
);
select is(
  (select s.code from public.access_requests r join public.sales_sources s on s.id = r.source_id
    where r.id = current_setting('t.req')::uuid),
  'referral', 'Το Αίτημα πρόσβασης χωρίς Πηγή παίρνει την Πηγή του Πελάτη'
);

select * from finish();
rollback;
