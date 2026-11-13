-- Σημειώσεις πάνω στο βίντεο (c2): νήμα απαντήσεων, «λύθηκε», «το είδε», ορατότητα πελάτη, κλειστοί πίνακες.
-- Γύρος πέρα από το Όριο αλλαγών (c8): εκκρεμής χρέωση γύρου, απόφαση «χρεώνεται» / «χωρίς χρέωση», Χρέωση.
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή. Οι ημερομηνίες υπολογίζονται από σήμερα.
begin;
select plan(59);

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης · e2 Παραγωγή (Υπεύθυνος της Παραγωγής) · e3 Πωλήσεις (χωρίς Παραδοτέα) · e5 Διαχείριση
-- e6 Χρήστης πελάτη 1 με «Πλήρης» · e7 Χρήστης πελάτη 1 χωρίς «Εγκρίνει Παραδοτέα» · e8 Χρήστης πελάτη 2 με «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'manager@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'maria@kypseli.example.gr'),
  ('00000000-0000-0000-0000-0000000000e7', 'nikos@kypseli.example.gr'),
  ('00000000-0000-0000-0000-0000000000e8', 'kostas@other.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'Νίκος', 'manager@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e2', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000e3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000e5', 'Διαχείριση')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Πελάτες 1 και 2. Μηνιαίο πακέτο (shoot 2, reel 8) και Υπηρεσία «έξτρα reel» 150 € που δίνει μόνο reel.
insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'Κυψέλη Καφέ', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-0000000000f2', 'Γυμναστήριο Αρμύρας', '', 'Αθήνα', null, 'Κώστας Αρμύρας', 'kostas@other.example.gr', '210 2222222', '00000000-0000-0000-0000-0000000000e3');
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'Μηνιαίο καφέ',
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000e3', 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3;
insert into public.catalogue_items (id, kind, billing, name, name_en, unit, retired_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'package', 'monthly', 'Μηνιαίο πακέτο (τεστ)', 'Monthly (test)', '', null),
  ('00000000-0000-0000-0000-0000000000d8', 'service', null, 'Έξτρα reel (τεστ)', 'Extra reel (test)', 'ανά reel', null);
insert into public.catalogue_item_amounts (item_id, price) values
  ('00000000-0000-0000-0000-0000000000d1', 1000),
  ('00000000-0000-0000-0000-0000000000d8', 150);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost) values
  ('00000000-0000-0000-0000-0000000000d1', 6, 14, 0),
  ('00000000-0000-0000-0000-0000000000d8', 0, 0, 0);
insert into public.catalogue_item_provisions (item_id, kind_id, quantity)
select p.item_id::uuid, k.id, p.qty
  from (values
    ('00000000-0000-0000-0000-0000000000d1', 'shoot', 2),
    ('00000000-0000-0000-0000-0000000000d1', 'reel', 8),
    ('00000000-0000-0000-0000-0000000000d8', 'reel', 1)
  ) as p (item_id, code, qty)
  join public.provision_kinds k on k.code = p.code;
insert into public.cost_months (month, expenses_total, productive_hours)
values (date_trunc('month', now() at time zone 'Europe/Athens')::date, 8800, 220);

insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Μόνο προβολή (τεστ)', 'Τεστ: Χρήστης πελάτη χωρίς έγκριση.', 'client', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.productions', 'all' from public.roles r where r.name = 'Μόνο προβολή (τεστ)';

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- Βοηθός: οι σημειώσεις της v1 όπως τις βλέπει ο καθένας.
create function public.t_notes(p_view jsonb, p_version integer) returns jsonb
language sql immutable
as $$ select v -> 'comments' from jsonb_array_elements(p_view -> 'versions') v where (v ->> 'number')::int = p_version; $$;

create function public.t_note(p_notes jsonb, p_id text) returns jsonb
language sql immutable
as $$ select n from jsonb_array_elements(p_notes) n where n ->> 'id' = p_id; $$;

-- ───────────── Συμφωνία, Παραγωγή, Παραδοτέο ─────────────
select public.t_as('e1');
select set_config('t.a1', public.agreement_create('00000000-0000-0000-0000-0000000000c1', 'monthly', 'Μηνιαίο καφέ')::text, true);
select public.agreement_update_basics(current_setting('t.a1')::uuid, 'Μηνιαίο καφέ', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, 6);
select public.agreement_add_catalogue_line(current_setting('t.a1')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_set_recipients(current_setting('t.a1')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a1')::uuid, (now() at time zone 'Europe/Athens')::date, 'Μαρία Παπαδάκη', (date_trunc('month', now() at time zone 'Europe/Athens') + interval '4 months')::date, 'contract.pdf');
select set_config('t.pa1', (select pr.id::text from public.productions pr
                              join public.agreement_periods pe on pe.id = pr.period_id
                             where pe.agreement_id = current_setting('t.a1')::uuid and pe.n = 1), true);
select public.production_transfer(current_setting('t.pa1')::uuid, '00000000-0000-0000-0000-0000000000e2');

insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e6', 'Μαρία Παπαδάκη',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e7', 'Νίκος Ρέας',
   (select r.id from public.roles r where r.name = 'Μόνο προβολή (τεστ)'), true),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e8', 'Κώστας Αρμύρας',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true);

select set_config('t.d1', public.deliverable_create(current_setting('t.pa1')::uuid,
  (select k.id from public.provision_kinds k where k.code = 'reel'), 'Reel Καφέ', null, null, null, null)::text, true);
select is(public.deliverable_version_add(current_setting('t.d1')::uuid, 'https://vimeo.com/111', 'v1'), 1,
  'Η v1 στάλθηκε στον πελάτη');

-- ───────────── Σημειώσεις και απαντήσεις (c2) ─────────────
select public.t_as('e6');
select set_config('t.c1', public.deliverable_client_comment(current_setting('t.d1')::uuid, 1, 'Στο 0:12 το λογότυπο κόβεται', 12)::text, true);
select public.t_as('e1');
select set_config('t.c2', public.deliverable_comment_add(current_setting('t.d1')::uuid, 1, 'Εσωτερικό: θέλει νέο export', 30, true)::text, true);
select set_config('t.r1', public.deliverable_comment_reply(current_setting('t.c1')::uuid, 'Το διορθώνουμε στη v2', false)::text, true);
select is((select parent_id::text from public.deliverable_comments where id = current_setting('t.r1')::uuid), current_setting('t.c1'),
  'Η απάντηση της ομάδας κρέμεται από τη σημείωση');
select is((select at_seconds from public.deliverable_comments where id = current_setting('t.r1')::uuid), null,
  'Η απάντηση δεν έχει χρόνο');
select set_config('t.r2', public.deliverable_comment_reply(current_setting('t.c2')::uuid, 'Συμφωνώ', false)::text, true);
select is((select is_internal from public.deliverable_comments where id = current_setting('t.r2')::uuid), true,
  'Απάντηση σε εσωτερική σημείωση μένει εσωτερική');
select throws_ok($$ select public.deliverable_comment_reply(current_setting('t.c1')::uuid, '   ', false) $$, 'P0001',
  'Το σχόλιο θέλει κείμενο έως 2000 χαρακτήρες', 'Η κενή απάντηση απορρίπτεται');

select public.t_as('e3');
select throws_ok($$ select public.deliverable_comment_reply(current_setting('t.c1')::uuid, 'Σχόλιο', false) $$, '42501', null,
  'Πωλήσεις χωρίς Παραδοτέα δεν απαντούν');
select throws_ok($$ select public.deliverable_comment_resolve(current_setting('t.c1')::uuid, true) $$, '42501', null,
  'Πωλήσεις χωρίς Παραδοτέα δεν λύνουν σημειώσεις');
select throws_ok($$ select public.deliverable_comments_seen(current_setting('t.d1')::uuid, 1) $$, '42501', null,
  'Πωλήσεις χωρίς Παραδοτέα δεν σημειώνουν «το είδε»');

select public.t_as('e6');
select set_config('t.r3', public.deliverable_client_comment_reply(current_setting('t.r1')::uuid, 'Ευχαριστώ!')::text, true);
select is((select parent_id::text from public.deliverable_comments where id = current_setting('t.r3')::uuid), current_setting('t.c1'),
  'Απάντηση σε απάντηση πάει στη ρίζα του νήματος');
select throws_ok($$ select public.deliverable_client_comment_reply(current_setting('t.c2')::uuid, 'Τι λέτε;') $$, '42501', null,
  'Ο πελάτης δεν απαντά σε εσωτερική σημείωση');
select throws_ok($$ select public.deliverable_client_comment_reply(gen_random_uuid(), 'Τι λέτε;') $$, '42501', null,
  'Σημείωση που δεν υπάρχει δίνει το ίδιο 42501');
select throws_ok($$ select public.deliverable_comment_reply(current_setting('t.c1')::uuid, 'Σχόλιο', false) $$, '42501', null,
  'Ο πελάτης δεν χρησιμοποιεί την απάντηση της ομάδας');
select is(jsonb_array_length(public.t_notes(public.client_deliverable_view(current_setting('t.d1')::uuid), 1)), 3,
  'Ο πελάτης βλέπει τη σημείωσή του και τις δύο απαντήσεις, όχι τα εσωτερικά');
select is(public.t_note(public.t_notes(public.client_deliverable_view(current_setting('t.d1')::uuid), 1), current_setting('t.r1')) ->> 'parentId',
  current_setting('t.c1'), 'Ο πελάτης βλέπει σε ποια σημείωση απαντά η ομάδα');
select ok(not (public.t_note(public.t_notes(public.client_deliverable_view(current_setting('t.d1')::uuid), 1), current_setting('t.c1')) ? 'isInternal'),
  'Ο πελάτης δεν βλέπει το πεδίο «εσωτερικό»');

select public.t_as('e7');
select throws_ok($$ select public.deliverable_client_comment_reply(current_setting('t.c1')::uuid, 'Σχόλιο') $$, '42501', null,
  'Χωρίς «Εγκρίνει Παραδοτέα» δεν απαντά');
select throws_ok($$ select public.deliverable_client_comment_resolve(current_setting('t.c1')::uuid, true) $$, '42501', null,
  'Χωρίς «Εγκρίνει Παραδοτέα» δεν λύνει');

select public.t_as('e8');
select throws_ok($$ select public.deliverable_client_comment_reply(current_setting('t.c1')::uuid, 'Σχόλιο') $$, '42501', null,
  'Πελάτης 2 δεν απαντά σε σημείωση του Πελάτη 1');
select throws_ok($$ select public.deliverable_client_comment_resolve(current_setting('t.c1')::uuid, true) $$, '42501', null,
  'Πελάτης 2 δεν λύνει σημείωση του Πελάτη 1');
select throws_ok($$ select public.deliverable_client_comments_seen(current_setting('t.d1')::uuid, 1) $$, '42501', null,
  'Πελάτης 2 δεν σημειώνει «το είδε» σε Παραδοτέο του Πελάτη 1');

select public.t_as('e1');
select is(jsonb_array_length(public.t_notes(public.deliverable_view(current_setting('t.d1')::uuid), 1)), 5,
  'Η ομάδα βλέπει όλες τις σημειώσεις και απαντήσεις');
select is(public.t_note(public.t_notes(public.deliverable_view(current_setting('t.d1')::uuid), 1), current_setting('t.c1')) ->> 'authorName',
  null, 'Για την ομάδα ο πελάτης μένει χωρίς όνομα ομάδας, όπως πριν');

-- ───────────── «Λύθηκε» ─────────────
select public.t_as('e6');
select throws_ok($$ select public.deliverable_client_comment_resolve(current_setting('t.c2')::uuid, true) $$, '42501', null,
  'Ο πελάτης δεν λύνει εσωτερική σημείωση');
select throws_ok($$ select public.deliverable_client_comment_resolve(current_setting('t.r1')::uuid, true) $$, 'P0001',
  'Λύνεται η σημείωση, όχι η απάντηση', 'Η απάντηση δεν λύνεται');
select lives_ok($$ select public.deliverable_client_comment_resolve(current_setting('t.c1')::uuid, true) $$,
  'Ο πελάτης λύνει τη σημείωσή του');
select is(public.t_note(public.t_notes(public.client_deliverable_view(current_setting('t.d1')::uuid), 1), current_setting('t.c1')) ->> 'resolvedByName',
  'Μαρία Παπαδάκη', 'Το «λύθηκε» γράφει ποιος το έλυσε');
select public.t_as('e2');
select lives_ok($$ select public.deliverable_comment_resolve(current_setting('t.c1')::uuid, false) $$,
  'Ο Υπεύθυνος ξανανοίγει τη σημείωση');
select is(public.t_note(public.t_notes(public.deliverable_view(current_setting('t.d1')::uuid), 1), current_setting('t.c1')) ->> 'resolvedAt',
  null, 'Η ξανανοιγμένη σημείωση δεν έχει «λύθηκε»');
select lives_ok($$ select public.deliverable_comment_resolve(current_setting('t.c2')::uuid, true) $$,
  'Η ομάδα λύνει εσωτερική σημείωση');
select is(public.t_note(public.t_notes(public.deliverable_view(current_setting('t.d1')::uuid), 1), current_setting('t.c2')) ->> 'resolvedByName',
  'Πέτρος', 'Το «λύθηκε» της ομάδας γράφει το όνομα της ομάδας');

-- ───────────── «Το είδε» ─────────────
select public.t_as('e1');
select lives_ok($$ select public.deliverable_comments_seen(current_setting('t.d1')::uuid, 1) $$, 'Η ομάδα ανοίγει την Έκδοση');
select lives_ok($$ select public.deliverable_comments_seen(current_setting('t.d1')::uuid, 1) $$, 'Το ξανάνοιγμα δεν διπλογράφει');
select is((select count(*)::int from public.deliverable_comment_seen where user_id = '00000000-0000-0000-0000-0000000000e1'), 2,
  '«Το είδε» μόνο για ό,τι δεν έγραψε ο ίδιος (η σημείωση και η απάντηση του πελάτη)');
select public.t_as('e6');
select lives_ok($$ select public.deliverable_client_comments_seen(current_setting('t.d1')::uuid, 1) $$, 'Ο πελάτης ανοίγει την Έκδοση');
select is((select count(*)::int from public.deliverable_comment_seen where user_id = '00000000-0000-0000-0000-0000000000e6'), 1,
  'Ο πελάτης σημειώνει μόνο ό,τι βλέπει (όχι τα εσωτερικά)');
select is(public.t_note(public.t_notes(public.client_deliverable_view(current_setting('t.d1')::uuid), 1), current_setting('t.c1')) -> 'seenBy',
  '["Γιώργος"]'::jsonb, 'Ο πελάτης βλέπει ότι η ομάδα είδε τη σημείωσή του');
select public.t_as('e1');
select is(public.t_note(public.t_notes(public.deliverable_view(current_setting('t.d1')::uuid), 1), current_setting('t.r1')) -> 'seenBy',
  '["Μαρία Παπαδάκη"]'::jsonb, 'Η ομάδα βλέπει ότι ο πελάτης είδε την απάντηση');

-- ───────────── Κλειστοί πίνακες ─────────────
set local role authenticated;
select throws_ok($$ select * from public.deliverable_comment_seen $$, '42501', null,
  'Το «το είδε» δεν διαβάζεται απευθείας');
select throws_ok($$ select * from public.deliverable_round_charges $$, '42501', null,
  'Οι χρεώσεις γύρων δεν διαβάζονται απευθείας');
select throws_ok($$ insert into public.deliverable_round_charges (deliverable_id, version_number, round, rounds_limit)
                    values (current_setting('t.d1')::uuid, 1, 9, 2) $$, '42501', null,
  'Οι χρεώσεις γύρων δεν γράφονται απευθείας');
reset role;

-- ───────────── Γύρος πέρα από το Όριο (c8) ─────────────
-- Όριο reel = 2. Γύρος 1 και 2 μέσα στο Όριο· ο 3ος ανοίγει χρέωση γύρου.
select public.t_as('e6');
select public.deliverable_client_answer(current_setting('t.d1')::uuid, false, 'Γύρος 1');
select public.t_as('e1');
select public.deliverable_version_add(current_setting('t.d1')::uuid, 'https://vimeo.com/112', 'v2');
select public.t_as('e6');
select public.deliverable_client_answer(current_setting('t.d1')::uuid, false, 'Γύρος 2');
select is((select count(*)::int from public.deliverable_round_charges where deliverable_id = current_setting('t.d1')::uuid), 0,
  'Μέσα στο Όριο δεν ανοίγει χρέωση γύρου');
select public.t_as('e1');
select public.deliverable_version_add(current_setting('t.d1')::uuid, 'https://vimeo.com/113', 'v3');
select public.t_as('e6');
select public.deliverable_client_answer(current_setting('t.d1')::uuid, false, 'Γύρος 3');
select is((select round || '/' || rounds_limit || '/' || version_number from public.deliverable_round_charges
            where deliverable_id = current_setting('t.d1')::uuid), '3/2/3',
  'Ο 3ος γύρος με Όριο 2 ανοίγει εκκρεμή χρέωση για τη v3');
select set_config('t.g1', (select id::text from public.deliverable_round_charges where deliverable_id = current_setting('t.d1')::uuid), true);
select ok(not (public.client_deliverable_view(current_setting('t.d1')::uuid) ? 'roundCharges'),
  'Ο πελάτης δεν βλέπει τις χρεώσεις γύρων');

select public.t_as('e5');
select ok(exists (select 1 from jsonb_array_elements(public.deliverables_pending_charges()) x where x ->> 'id' = current_setting('t.d1')),
  'Ο γύρος πέρα από το Όριο μπαίνει στις χρεώσεις που περιμένουν απόφαση');
select ok(exists (select 1 from authz.today_pending_charges(now()) t where t.id = current_setting('t.d1')::uuid),
  'Και στο Σήμερα');
select is(public.deliverable_view(current_setting('t.d1')::uuid) -> 'can' ->> 'decideRoundCharge', 'true',
  'Η Διαχείριση αποφασίζει χρέωση γύρου');

select public.t_as('e2');
select is(public.deliverable_view(current_setting('t.d1')::uuid) -> 'can' ->> 'decideRoundCharge', 'false',
  'Η Παραγωγή δεν αποφασίζει χρέωση γύρου');
select throws_ok($$ select public.deliverable_round_charge_decide(current_setting('t.g1')::uuid, 'charged', null) $$, '42501', null,
  'Χωρίς Ποσά δεν αποφασίζεται χρέωση γύρου');
select public.t_as('e6');
select throws_ok($$ select public.deliverable_round_charge_decide(current_setting('t.g1')::uuid, 'free', 'Δώρο') $$, '42501', null,
  'Ο πελάτης δεν αποφασίζει χρέωση γύρου');

select public.t_as('e5');
select throws_ok($$ select public.deliverable_round_charge_decide(current_setting('t.g1')::uuid, 'free', '  ') $$, 'P0001',
  'Το «χωρίς χρέωση» θέλει λόγο', 'Το «χωρίς χρέωση» θέλει λόγο');
select throws_ok($$ select public.deliverable_round_charge_decide(current_setting('t.g1')::uuid, 'maybe', null) $$, 'P0001',
  'Η χρέωση θέλει «χρεώνεται» ή «χωρίς χρέωση»', 'Μόνο δύο απαντήσεις');
select lives_ok($$ select public.deliverable_round_charge_decide(current_setting('t.g1')::uuid, 'charged', null) $$,
  'Η Διαχείριση χρεώνει τον γύρο');
select is(public.deliverable_view(current_setting('t.d1')::uuid) -> 'roundCharges' -> 0 ->> 'decidedByName', 'Νίκος',
  'Η απόφαση γράφει ποιος αποφάσισε');
select throws_ok($$ select public.deliverable_round_charge_decide(current_setting('t.g1')::uuid, 'free', 'Δώρο') $$, 'P0001',
  'Η χρέωση του γύρου έχει ήδη αποφασιστεί', 'Η απόφαση γράφεται μία φορά');
select ok(not exists (select 1 from jsonb_array_elements(public.deliverables_pending_charges()) x where x ->> 'id' = current_setting('t.d1')),
  'Μετά την απόφαση βγαίνει από τις χρεώσεις που περιμένουν');
select is(authz.billables_from_extra_revisions((now() at time zone 'Europe/Athens')::date), 1,
  'Το «χρεώνεται» γεννά μία Χρέωση');
select is((select reason || '/' || net::text from public.billables where source_id = current_setting('t.g1')::uuid), 'extra_revision/150.00',
  'Έξτρα αναθεώρηση με την τιμή της Υπηρεσίας');

-- 4ος γύρος «χωρίς χρέωση»: δεν γεννά Χρέωση.
select public.t_as('e1');
select public.deliverable_version_add(current_setting('t.d1')::uuid, 'https://vimeo.com/114', 'v4');
select public.t_as('e6');
select public.deliverable_client_answer(current_setting('t.d1')::uuid, false, 'Γύρος 4');
select set_config('t.g2', (select id::text from public.deliverable_round_charges
                            where deliverable_id = current_setting('t.d1')::uuid and version_number = 4), true);
select public.t_as('e5');
select lives_ok($$ select public.deliverable_round_charge_decide(current_setting('t.g2')::uuid, 'free', 'Λάθος δικό μας στο μοντάζ') $$,
  '«Χωρίς χρέωση» με λόγο');
select is(authz.billables_from_extra_revisions((now() at time zone 'Europe/Athens')::date), 0,
  'Το «χωρίς χρέωση» δεν γεννά Χρέωση');

select * from finish();
rollback;
