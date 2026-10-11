-- Μηνύματα Jγ #162: Συνημμένα. Θέσεις ανεβάσματος, αποστολή με συνημμένα, λήψη με έλεγχο ορατότητας, διαγραφή και καθάρισμα.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Τα αρχεία «ανεβαίνουν» με γραμμή στο storage.objects (όπως το t_pdf των Τιμολογίων).
begin;
select plan(61);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Λογιστής · a3 Πωλήσεις (Υπεύθυνος του Α) · a4 Παραγωγή (Μέλος της Π1) · a5 Παραγωγή (Μέλος της Π2)
-- b1 Χρήστης πελάτη Α «Πλήρης» · b2 Χρήστης πελάτη Α μόνο «Βλέπει Συνομιλία» · b3 Χρήστης πελάτη Β «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'prod1@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'prod2@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'k2@client-a.example.gr'),
  ('00000000-0000-0000-0000-0000000000b3', 'k3@client-b.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ελένη', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Νίκος', 'prod1@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'Πέτρος', 'prod2@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a4', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000a5', 'Παραγωγή')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

insert into public.clients (id, name, afm, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', '123456789', 'Μαρία Παπαδάκη', 'a@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', '987654321', 'Νίκος Κίνης', 'b@example.com', '00000000-0000-0000-0000-0000000000a1');

insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Μόνο ανάγνωση Συνομιλίας (τεστ)', 'Τεστ: Χρήστης πελάτη που μόνο διαβάζει τη Συνομιλία.', 'client', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.chatRead', 'all' from public.roles r where r.name = 'Μόνο ανάγνωση Συνομιλίας (τεστ)';
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'Λία',
   (select r.id from public.roles r where r.name = 'Μόνο ανάγνωση Συνομιλίας (τεστ)' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b3', 'Πάνος',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true);

-- Παραγωγές χωρίς Συμφωνίες: οι ξένοι κλειδιά και οι triggers παρακάμπτονται μόνο για αυτή την εισαγωγή.
set local session_replication_role = replica;
insert into public.productions (id, title, client_id, agreement_id, owner_id, state, cancelled_at, cancelled_reason) values
  ('00000000-0000-0000-0000-0000000000f1', 'Reel Α', '00000000-0000-0000-0000-0000000000c1', gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', 'open', null, null),
  ('00000000-0000-0000-0000-0000000000f2', 'Reel Β', '00000000-0000-0000-0000-0000000000c2', gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', 'open', null, null),
  ('00000000-0000-0000-0000-0000000000f3', 'Ακυρωμένο Α', '00000000-0000-0000-0000-0000000000c1', gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', 'cancelled', now(), 'Τεστ');
insert into public.production_members (production_id, user_id) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a4'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a5');
reset session_replication_role;

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- «Ανεβάζει» ένα αρχείο (γραμμή στο storage.objects) στη διαδρομή. Το size μπαίνει στο metadata μόνο όταν δοθεί.
create function public.t_up(p_path text, p_size bigint default null) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into storage.objects (bucket_id, name, metadata)
  values ('message-attachments', p_path, case when p_size is null then null else jsonb_build_object('size', p_size) end);
end;
$$;

-- Ζητά θέσεις και κρατά το αποτέλεσμα στο t.<key>.
create function public.t_slots(p_key text, p_client text, p_files jsonb, p_production text default null) returns void
language plpgsql
as $$
begin
  perform set_config('t.' || p_key,
    public.message_attachment_slots(p_client::uuid, p_files, p_production::uuid)::text, true);
end;
$$;

create function public.t_path(p_key text, p_index integer default 0) returns text
language sql
as $$ select current_setting('t.' || p_key)::jsonb->'slots'->p_index->>'path'; $$;

-- Το id του συνημμένου ενός Μηνύματος, όπως φαίνεται στη Συνομιλία.
create function public.t_att(p_client text, p_message text, p_index integer default 0) returns uuid
language sql
as $$
  select (m->'attachments'->p_index->>'id')::uuid
    from jsonb_array_elements(public.messages_thread(p_client::uuid)->'messages') m
   where m->>'id' = current_setting('t.' || p_message);
$$;

create function public.t_files(p_count integer) returns jsonb
language sql
as $$
  select jsonb_agg(jsonb_build_object('name', 'αρχείο' || n || '.pdf', 'mime', 'application/pdf', 'size', 1000))
    from generate_series(1, p_count) n;
$$;

-- Αποστολή με συνημμένα (διαδρομές από τα t.<key>) και κείμενο.
create function public.t_send(p_client text, p_body text, p_paths text[], p_internal boolean default false) returns jsonb
language sql
as $$
  select public.message_send(jsonb_build_object(
    'clientId', p_client, 'body', p_body, 'internal', p_internal, 'attachments', to_jsonb(p_paths)));
$$;

-- ───────────── Άρνηση ανά ρόλο ─────────────
set local role anon;
select throws_ok($$ select public.message_attachment_slots('00000000-0000-0000-0000-0000000000c1', '[{"name":"x.pdf","mime":"application/pdf","size":10}]') $$, '42501', null, 'Ο ανώνυμος δεν ζητά θέσεις');
select throws_ok($$ select public.message_attachment_path(gen_random_uuid()) $$, '42501', null, 'Ο ανώνυμος δεν παίρνει συνημμένο');
select throws_ok($$ select public.message_attachment_slots_expired('2021-01-01') $$, '42501', null, 'Ο ανώνυμος δεν καθαρίζει θέσεις');
reset role;

select public.t_as('a2');
select throws_ok($$ select public.message_attachment_slots('00000000-0000-0000-0000-0000000000c1', public.t_files(1)) $$, '42501', null, 'Ο Λογιστής (χωρίς messages.chat) δεν ζητά θέσεις');
select throws_ok($$ select public.message_attachment_path(gen_random_uuid()) $$, '42501', null, 'Ο Λογιστής δεν παίρνει συνημμένο');

select public.t_as('b2');
select throws_ok($$ select public.message_attachment_slots('00000000-0000-0000-0000-0000000000c1', public.t_files(1)) $$, '42501', null, 'Πελάτης χωρίς c.chatWrite δεν ζητά θέσεις');

select public.t_as('b3');
select throws_ok($$ select public.message_attachment_slots('00000000-0000-0000-0000-0000000000c1', public.t_files(1)) $$, '42501', null, 'Πελάτης άλλου Πελάτη δεν ζητά θέσεις');

select public.t_as('a5');
select throws_ok($$ select public.message_attachment_slots('00000000-0000-0000-0000-0000000000c1', public.t_files(1)) $$, '42501', null, 'Μέλος άλλης Παραγωγής δεν ζητά θέσεις χωρίς ετικέτα');
select throws_ok($$ select public.message_attachment_slots('00000000-0000-0000-0000-0000000000c1', public.t_files(1), '00000000-0000-0000-0000-0000000000f2') $$, '42501', null, 'Μέλος άλλης Παραγωγής δεν ζητά θέσεις με ετικέτα άλλου Πελάτη');

select public.t_as('a1');
set local role authenticated;
select throws_ok($$ select public.message_attachment_slots_expired('2021-01-01') $$, '42501', null, 'Ο authenticated δεν καθαρίζει θέσεις (μόνο service_role)');
select throws_ok($$ select * from public.message_attachment_slots $$, '42501', null, 'Ο πίνακας θέσεων είναι κλειστός');
select throws_ok($$ select * from public.message_attachments $$, '42501', null, 'Ο πίνακας συνημμένων είναι κλειστός');
reset role;

-- ───────────── Κανόνες θέσεων (Ιδιοκτήτης) ─────────────
select public.t_as('a1');
select throws_ok($$ select public.message_attachment_slots('00000000-0000-0000-0000-0000000000c1', public.t_files(6)) $$, 'P0001', 'Έως 5 αρχεία ανά Μήνυμα', '6 αρχεία απορρίπτονται');
select throws_ok($$ select public.message_attachment_slots('00000000-0000-0000-0000-0000000000c1', '[]') $$, 'P0001', null, 'Κενή λίστα απορρίπτεται');
select throws_ok($$ select public.message_attachment_slots('00000000-0000-0000-0000-0000000000c1', '[{"name":"μεγάλο.pdf","mime":"application/pdf","size":11534336}]') $$, 'P0001', 'Πάνω από 10 MB: στείλε το ως link', '11 MB απορρίπτεται');
select throws_ok($$ select public.message_attachment_slots('00000000-0000-0000-0000-0000000000c1', '[{"name":"ταινία.mp4","mime":"video/mp4","size":1000}]') $$, 'P0001', 'Το βίντεο στέλνεται ως link', 'Το βίντεο στέλνεται ως link');
select throws_ok($$ select public.message_attachment_slots('00000000-0000-0000-0000-0000000000c1', '[{"name":"x.zip","mime":"application/zip","size":1000}]') $$, 'P0001', null, 'Μη επιτρεπτό είδος απορρίπτεται');
select throws_ok($$ select public.message_attachment_slots('00000000-0000-0000-0000-0000000000c1', '[{"name":"","mime":"application/pdf","size":1000}]') $$, 'P0001', null, 'Κενό όνομα απορρίπτεται');
select lives_ok($$ select public.t_slots('s1', '00000000-0000-0000-0000-0000000000c1', '[{"name":"προσφορά.pdf","mime":"application/pdf","size":1000},{"name":"φωτό.png","mime":"image/png","size":2000}]') $$, 'Ο Ιδιοκτήτης παίρνει θέσεις για 2 αρχεία');
select is(jsonb_array_length(current_setting('t.s1')::jsonb->'slots'), 2, 'Δύο θέσεις');
select ok(public.t_path('s1', 0) ~ '^00000000-0000-0000-0000-0000000000c1/[0-9a-f-]{36}[.]pdf$', 'Η διαδρομή έχει τον Πελάτη και επέκταση από το mime (pdf)');
select ok(public.t_path('s1', 1) ~ '^00000000-0000-0000-0000-0000000000c1/[0-9a-f-]{36}[.]png$', 'Η επέκταση ακολουθεί το mime (png)');

-- ───────────── Αποστολή ─────────────
select throws_ok(
  format($$ select public.t_send('00000000-0000-0000-0000-0000000000c1', 'x', array[%L]) $$, public.t_path('s1', 0)),
  'P0001', 'Το αρχείο δεν ανέβηκε σωστά', 'Θέση χωρίς ανεβασμένο αρχείο απορρίπτεται');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"x","attachments":["00000000-0000-0000-0000-0000000000c1/δεν-υπάρχει.pdf"]}') $$, 'P0001', 'Το αρχείο δεν ανέβηκε σωστά', 'Άγνωστη διαδρομή απορρίπτεται');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"","attachments":[]}') $$, 'P0001', null, 'Χωρίς κείμενο και χωρίς συνημμένα απορρίπτεται');
select throws_ok($$ select public.t_send('00000000-0000-0000-0000-0000000000c1', 'x', array['a/1.pdf','a/2.pdf','a/3.pdf','a/4.pdf','a/5.pdf','a/6.pdf']) $$, 'P0001', 'Έως 5 αρχεία ανά Μήνυμα', '6 συνημμένα στην αποστολή απορρίπτονται');

-- Η θέση άλλου χρήστη (μέλους Παραγωγής, με ετικέτα) δεν χρησιμοποιείται από τον Ιδιοκτήτη.
select public.t_as('a4');
select throws_ok($$ select public.message_attachment_slots('00000000-0000-0000-0000-0000000000c1', public.t_files(1)) $$, '42501', null, 'Μέλος Παραγωγής χωρίς ετικέτα δεν ζητά θέσεις');
select lives_ok($$ select public.t_slots('s4', '00000000-0000-0000-0000-0000000000c1', public.t_files(1), '00000000-0000-0000-0000-0000000000f1') $$, 'Μέλος Παραγωγής ζητά θέσεις με ετικέτα της Παραγωγής του');
select public.t_up(public.t_path('s4'));
select public.t_as('a1');
select throws_ok(
  format($$ select public.t_send('00000000-0000-0000-0000-0000000000c1', 'x', array[%L]) $$, public.t_path('s4')),
  'P0001', 'Το αρχείο δεν ανέβηκε σωστά', 'Δεν χρησιμοποιείς θέση άλλου χρήστη');

-- Θέση άλλου Πελάτη.
select lives_ok($$ select public.t_slots('sb', '00000000-0000-0000-0000-0000000000c2', public.t_files(1)) $$, 'Θέση για τον Πελάτη Β');
select public.t_up(public.t_path('sb'));
select throws_ok(
  format($$ select public.t_send('00000000-0000-0000-0000-0000000000c1', 'x', array[%L]) $$, public.t_path('sb')),
  'P0001', 'Το αρχείο δεν ανέβηκε σωστά', 'Δεν χρησιμοποιείς θέση άλλου Πελάτη');

-- Αρχείο πάνω από 10 MB στο storage (πέρασε το όριο του bucket).
select lives_ok($$ select public.t_slots('sbig', '00000000-0000-0000-0000-0000000000c1', public.t_files(1)) $$, 'Θέση για μεγάλο αρχείο');
select public.t_up(public.t_path('sbig'), 20000000);
select throws_ok(
  format($$ select public.t_send('00000000-0000-0000-0000-0000000000c1', 'x', array[%L]) $$, public.t_path('sbig')),
  'P0001', 'Το αρχείο δεν ανέβηκε σωστά', 'Αρχείο πάνω από 10 MB στο storage απορρίπτεται');

-- Επιτυχία: Μήνυμα μόνο με συνημμένα (κενό κείμενο).
select public.t_up(public.t_path('s1', 0), 1000);
select public.t_up(public.t_path('s1', 1), 2000);
select lives_ok(
  format($$ select set_config('t.m1', public.t_send('00000000-0000-0000-0000-0000000000c1', '', array[%L, %L])->>'id', true) $$,
    public.t_path('s1', 0), public.t_path('s1', 1)),
  'Μήνυμα μόνο με συνημμένα γίνεται δεκτό');
select is((select count(*)::integer from public.message_attachment_slots where path in (public.t_path('s1', 0), public.t_path('s1', 1))), 0, 'Οι θέσεις που χρησιμοποιήθηκαν σβήνουν');
select is((select count(*)::integer from public.message_attachments where message_id = current_setting('t.m1')::uuid), 2, 'Τα συνημμένα γράφτηκαν στο Μήνυμα');
select throws_ok(
  format($$ select public.t_send('00000000-0000-0000-0000-0000000000c1', 'x', array[%L]) $$, public.t_path('s1', 0)),
  'P0001', 'Το αρχείο δεν ανέβηκε σωστά', 'Η ίδια θέση δεν ξαναχρησιμοποιείται');
select is(
  (select jsonb_array_length(m->'attachments') from jsonb_array_elements(public.messages_thread('00000000-0000-0000-0000-0000000000c1')->'messages') m where m->>'id' = current_setting('t.m1')),
  2, 'Η Συνομιλία δείχνει 2 συνημμένα');
select is(
  (select m->'attachments'->0->>'name' from jsonb_array_elements(public.messages_thread('00000000-0000-0000-0000-0000000000c1')->'messages') m where m->>'id' = current_setting('t.m1')),
  'προσφορά.pdf', 'Το συνημμένο έχει όνομα');

-- Εσωτερικό Μήνυμα με συνημμένο.
select lives_ok($$ select public.t_slots('s2', '00000000-0000-0000-0000-0000000000c1', public.t_files(1)) $$, 'Θέση για Εσωτερικό');
select public.t_up(public.t_path('s2'));
select lives_ok(
  format($$ select set_config('t.m2', public.t_send('00000000-0000-0000-0000-0000000000c1', 'εσωτερικό αρχείο', array[%L], true)->>'id', true) $$, public.t_path('s2')),
  'Εσωτερικό Μήνυμα με συνημμένο');

-- ───────────── Λήψη ─────────────
select set_config('t.att1', public.t_att('00000000-0000-0000-0000-0000000000c1', 'm1')::text, true);
select set_config('t.att2', public.t_att('00000000-0000-0000-0000-0000000000c1', 'm2')::text, true);
select is(public.message_attachment_path(current_setting('t.att1')::uuid), public.t_path('s1', 0), 'Ο Ιδιοκτήτης παίρνει τη διαδρομή του συνημμένου');

select public.t_as('b1');
select is(public.message_attachment_path(current_setting('t.att1')::uuid), public.t_path('s1', 0), 'Ο πελάτης παίρνει συνημμένο Μηνύματος που βλέπει');
select throws_ok($$ select public.message_attachment_path(current_setting('t.att2')::uuid) $$, '42501', null, 'Ο πελάτης δεν παίρνει συνημμένο Εσωτερικού Μηνύματος');
select public.t_as('b3');
select throws_ok($$ select public.message_attachment_path(current_setting('t.att1')::uuid) $$, '42501', null, 'Πελάτης άλλου Πελάτη δεν παίρνει συνημμένο');
select public.t_as('a5');
select throws_ok($$ select public.message_attachment_path(current_setting('t.att1')::uuid) $$, '42501', null, 'Μέλος άλλης Παραγωγής δεν παίρνει συνημμένο');
select public.t_as('a2');
select throws_ok($$ select public.message_attachment_path(current_setting('t.att1')::uuid) $$, '42501', null, 'Ο Λογιστής δεν παίρνει συνημμένο');
select public.t_as('a1');
select throws_ok($$ select public.message_attachment_path('00000000-0000-0000-0000-00000000dead') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ανύπαρκτο συνημμένο: το ίδιο 42501');

-- ───────────── Διαγραφή ─────────────
select set_config('t.del', public.message_delete(current_setting('t.m1')::uuid)::text, true);
select ok(
  (current_setting('t.del')::jsonb->'removedPaths') @> jsonb_build_array(public.t_path('s1', 0), public.t_path('s1', 1))
  and jsonb_array_length(current_setting('t.del')::jsonb->'removedPaths') = 2,
  'Η διαγραφή επιστρέφει τις διαδρομές των αρχείων');
select is((select count(*)::integer from public.message_attachments where message_id = current_setting('t.m1')::uuid), 0, 'Οι γραμμές συνημμένων σβήνουν με το Μήνυμα');
select throws_ok($$ select public.message_attachment_path(current_setting('t.att1')::uuid) $$, '42501', null, 'Μετά τη διαγραφή δεν υπάρχει λήψη');
select public.t_as('b1');
select throws_ok($$ select public.message_attachment_path(current_setting('t.att1')::uuid) $$, '42501', null, 'Μετά τη διαγραφή ούτε ο πελάτης παίρνει συνημμένο');
select public.t_as('a1');
select is((public.message_delete(current_setting('t.m2')::uuid))->'removedPaths', jsonb_build_array(public.t_path('s2')), 'Διαγραφή Μηνύματος με ένα συνημμένο');

-- ───────────── Τύπος, πραγματικό μέγεθος, όριο θέσεων ─────────────
select public.t_as('a1');
select public.t_slots('smime', '00000000-0000-0000-0000-0000000000c1', public.t_files(1));
insert into storage.objects (bucket_id, name, metadata)
values ('message-attachments', public.t_path('smime'), '{"size":1000,"mimetype":"image/png"}');
select throws_ok(
  format($$ select public.t_send('00000000-0000-0000-0000-0000000000c1', 'x', array[%L]) $$, public.t_path('smime')),
  'P0001', 'Το αρχείο δεν ανέβηκε σωστά', 'Αρχείο με άλλο τύπο από τη θέση απορρίπτεται');
select public.t_slots('sreal', '00000000-0000-0000-0000-0000000000c1', public.t_files(1));
insert into storage.objects (bucket_id, name, metadata)
values ('message-attachments', public.t_path('sreal'), '{"size":4321,"mimetype":"application/pdf"}');
select lives_ok(
  format($$ select public.t_send('00000000-0000-0000-0000-0000000000c1', 'Με αρχείο', array[%L]) $$, public.t_path('sreal')),
  'Αρχείο με τον τύπο της θέσης γίνεται δεκτό');
select is((select size from public.message_attachments where path = public.t_path('sreal')), 4321, 'Γράφεται το μέγεθος του Storage, όχι αυτό που δηλώθηκε');
select throws_ok(
  $$ select public.message_attachment_slots('00000000-0000-0000-0000-0000000000c1', public.t_files(5)) from generate_series(1, 5) $$,
  'P0001', 'Πολλά αρχεία σε αναμονή. Στείλε ή περίμενε λίγο και ξαναδοκίμασε', 'Όριο 20 ανοιχτών θέσεων ανά Χρήστη');
select lives_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"Χωρίς αρχεία","attachments":null}') $$, 'attachments: null σημαίνει χωρίς συνημμένα');

-- ───────────── Καθάρισμα θέσεων που έληξαν ─────────────
insert into public.message_attachment_slots (path, client_id, user_id, name, mime, size, created_at) values
  ('00000000-0000-0000-0000-0000000000c1/00000000-0000-0000-0000-00000000aaaa.pdf', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000a1', 'παλιό.pdf', 'application/pdf', 1000, '2020-01-01 10:00:00+00');
set local role service_role;
select set_config('t.expired', public.message_attachment_slots_expired('2021-01-01 00:00:00+00')::text, true);
reset role;
select is(current_setting('t.expired')::jsonb, jsonb_build_array('00000000-0000-0000-0000-0000000000c1/00000000-0000-0000-0000-00000000aaaa.pdf'), 'Το service_role παίρνει μόνο τις θέσεις που έληξαν');
select is((select count(*)::integer from public.message_attachment_slots where created_at < '2021-01-01'), 0, 'Οι θέσεις που έληξαν σβήνονται');
select is((select count(*)::integer from public.message_attachment_slots where path = public.t_path('sbig')), 1, 'Οι πρόσφατες θέσεις μένουν');

select * from finish();
rollback;
