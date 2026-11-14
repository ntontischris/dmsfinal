-- Η δημόσια φόρμα ενδιαφέροντος (b4). MIG 20261114141000_sales_web_form.sql.
-- Φανταστικά δεδομένα. Ο κλειστός πίνακας sales_web_form_hits διαβάζεται μόνο μετά από reset role.
begin;
select plan(18);

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

-- ───────────── Ο ανώνυμος στέλνει τη φόρμα ─────────────
set local role anon;
select is(
  public.sales_web_form('{"name":"Καφέ Αστέρι","contact_name":"Νίκος","contact_email":"Nikos@asteri.example.gr",
                          "contact_phone":"2100000000","message":"Θέλουμε   βίντεο για τα social"}'::jsonb, '203.0.113.7'),
  '{"status":"ok"}'::jsonb, 'Ο ανώνυμος στέλνει τη φόρμα');
select throws_ok($$ select count(*) from public.sales_web_form_hits $$, '42501', null,
  'Ο ανώνυμος δεν διαβάζει τις υποβολές');
select throws_ok($$ select authz.sales_web_form_at('{}'::jsonb, '1.1.1.1', now()) $$, '42501', null,
  'Ο ανώνυμος δεν ορίζει δικό του «τώρα»');
reset role;

select is(
  (select c.name || '|' || c.contact_email || '|' || s.code || '|' || o.manager_id::text || '|' || o.next_step
     from public.opportunities o join public.clients c on c.id = o.client_id join public.sales_sources s on s.id = o.source_id
    where c.contact_email = 'nikos@asteri.example.gr'),
  'Καφέ Αστέρι|nikos@asteri.example.gr|web|00000000-0000-0000-0000-0000000000a1|Απάντησε στο μήνυμα της φόρμας: «Θέλουμε βίντεο για τα social»',
  'Νέος Πελάτης και Ευκαιρία με Πηγή «Ιστοσελίδα», στον Ιδιοκτήτη, με το μήνυμα ως επόμενο βήμα');
select is((select count(*)::int from public.sales_web_form_hits), 1, 'Η υποβολή μετρήθηκε');
select ok((select h.ip_hash <> '203.0.113.7' and length(h.ip_hash) = 64 from public.sales_web_form_hits h),
  'Η διεύθυνση κρατιέται μόνο ως hash');

-- ───────────── Άρνηση: συνδεδεμένος χρήστης ─────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok($$ select public.sales_web_form('{"contact_name":"Χ","contact_email":"x@example.com"}'::jsonb, '1.1.1.1') $$,
  '42501', null, 'Η φόρμα δεν καλείται από συνδεδεμένο χρήστη');
select throws_ok($$ select count(*) from public.sales_web_form_hits $$, '42501', null,
  'Ο χρήστης της ομάδας δεν διαβάζει τις υποβολές');
reset role;

-- ───────────── Έλεγχος στοιχείων ─────────────
select is(authz.sales_web_form_at('{"contact_name":"Μαρία","contact_email":"όχι-email"}'::jsonb, '198.51.100.1', timestamptz '2025-06-15 10:00+03'),
  '{"status":"invalid","field":"contact_email"}'::jsonb, 'Λάθος email → invalid');
select is(authz.sales_web_form_at('{"contact_name":"  ","contact_email":"m@example.com"}'::jsonb, '198.51.100.1', timestamptz '2025-06-15 10:01+03'),
  '{"status":"invalid","field":"contact_name"}'::jsonb, 'Χωρίς όνομα → invalid');
select is((select count(*)::int from public.clients where contact_email = 'm@example.com'), 0, 'Το λάθος δεν γράφει Πελάτη');

-- ───────────── Όριο ρυθμού ─────────────
select is(authz.sales_web_form_at('{"contact_name":"Μαρία","contact_email":"m@example.com"}'::jsonb, '198.51.100.1', timestamptz '2025-06-15 10:02+03'),
  '{"status":"ok"}'::jsonb, 'Η τρίτη μέσα στο 10λεπτο περνά');
select is(authz.sales_web_form_at('{"contact_name":"Μαρία","contact_email":"m@example.com"}'::jsonb, '198.51.100.1', timestamptz '2025-06-15 10:03+03'),
  '{"status":"rate_limited"}'::jsonb, 'Η τέταρτη από την ίδια διεύθυνση σε 10′ κόβεται');
select is(authz.sales_web_form_at('{"contact_name":"Λίνα","contact_email":"l@example.com"}'::jsonb, '198.51.100.2', timestamptz '2025-06-15 10:03+03'),
  '{"status":"ok"}'::jsonb, 'Άλλη διεύθυνση περνά');
select is(authz.sales_web_form_at('{"contact_name":"Μαρία","contact_email":"m@example.com"}'::jsonb, '198.51.100.1', timestamptz '2025-06-15 10:13+03'),
  '{"status":"ok"}'::jsonb, 'Μετά από 10′ η ίδια διεύθυνση ξαναπερνά');

-- 10 την ημέρα από την ίδια διεύθυνση.
select authz.sales_web_form_at('{"contact_name":"Μαρία","contact_email":"m@example.com"}'::jsonb, '198.51.100.1',
                               timestamptz '2025-06-15 11:00+03' + make_interval(mins => 15 * g))
  from generate_series(0, 5) g;
select is(authz.sales_web_form_at('{"contact_name":"Μαρία","contact_email":"m@example.com"}'::jsonb, '198.51.100.1', timestamptz '2025-06-15 14:00+03'),
  '{"status":"rate_limited"}'::jsonb, 'Η ενδέκατη της ημέρας από την ίδια διεύθυνση κόβεται');

-- 60 την ώρα συνολικά (από διαφορετικές διευθύνσεις).
select authz.sales_web_form_at('{"contact_name":"Χ","contact_email":"bad"}'::jsonb, '192.0.2.' || g, timestamptz '2025-06-16 09:00+03')
  from generate_series(1, 60) g;
select is(authz.sales_web_form_at('{"contact_name":"Νέα","contact_email":"n@example.com"}'::jsonb, '192.0.2.200', timestamptz '2025-06-16 09:30+03'),
  '{"status":"rate_limited"}'::jsonb, 'Πάνω από 60 την ώρα συνολικά κόβεται');
select authz.sales_web_form_at('{"contact_name":"Χ","contact_email":"bad"}'::jsonb, '192.0.2.201', timestamptz '2025-06-18 10:00+03');
select is((select count(*)::int from public.sales_web_form_hits where created_at < timestamptz '2025-06-17 00:00+03'), 0,
  'Οι υποβολές πάνω από 2 ημέρες σβήνουν');

select * from finish();
rollback;
