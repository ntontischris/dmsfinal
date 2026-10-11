-- Μηνύματα Jα #160: άρνηση ανά ρόλο, ορατότητα ανά Εύρος, @αναφορά, ετικέτες, διόρθωση, διαγραφή, αδιάβαστα και Ίχνος.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Η μόνη εξάρτηση από την ώρα είναι το παράθυρο διόρθωσης,
-- που ελέγχεται μετακινώντας το created_at στο παρελθόν.
begin;
select plan(101);

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

-- Στέλνει Μήνυμα και κρατά το id στο t.<key>.
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

create function public.t_count(p_client text) returns integer
language sql
as $$ select jsonb_array_length(public.messages_thread(p_client::uuid)->'messages'); $$;

select is((select edit_minutes from public.message_settings), 15, 'Προεπιλογή: 15 λεπτά διόρθωσης');

-- ───────────── Άρνηση ανά ρόλο ─────────────
set local role anon;
select throws_ok($$ select public.messages_inbox() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Εισερχόμενα');
select throws_ok($$ select public.messages_thread('00000000-0000-0000-0000-0000000000c1') $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Συνομιλία');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"x"}') $$, '42501', null, 'Ο ανώνυμος δεν στέλνει');
select throws_ok($$ select public.message_edit(gen_random_uuid(), 'x') $$, '42501', null, 'Ο ανώνυμος δεν διορθώνει');
select throws_ok($$ select public.message_delete(gen_random_uuid()) $$, '42501', null, 'Ο ανώνυμος δεν διαγράφει');
select throws_ok($$ select public.message_set_tag(gen_random_uuid(), null) $$, '42501', null, 'Ο ανώνυμος δεν αλλάζει ετικέτα');
select throws_ok($$ select public.messages_mark_read('00000000-0000-0000-0000-0000000000c1') $$, '42501', null, 'Ο ανώνυμος δεν σημειώνει ανάγνωση');
select throws_ok($$ select public.messages_mentions() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει αναφορές');
select throws_ok($$ select public.messages_writable_clients() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Πελάτες για γραφή');
reset role;

select public.t_as('a2');
select throws_ok($$ select public.messages_inbox() $$, '42501', null, 'Ο Λογιστής δεν βλέπει Εισερχόμενα');
select throws_ok($$ select public.messages_thread('00000000-0000-0000-0000-0000000000c1') $$, '42501', null, 'Ο Λογιστής δεν βλέπει Συνομιλία');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"x"}') $$, '42501', null, 'Ο Λογιστής δεν στέλνει');
select throws_ok($$ select public.messages_mentions() $$, '42501', null, 'Ο Λογιστής δεν βλέπει αναφορές');

select public.t_as('a1');
set local role authenticated;
select throws_ok($$ select * from public.messages $$, '42501', null, 'Ο πίνακας Μηνυμάτων είναι κλειστός');
select throws_ok($$ select * from public.message_reads $$, '42501', null, 'Ο πίνακας ανάγνωσης είναι κλειστός');
select throws_ok($$ select * from public.message_settings $$, '42501', null, 'Ο πίνακας ρυθμίσεων είναι κλειστός');
reset role;

-- ───────────── Αποστολή ─────────────
select public.t_as('a1');
select public.t_msg('m1', '{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"Καλημέρα Α"}');
select public.t_msg('m2', '{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"Εσωτερικό για τον Πέτρο","internal":true,"mentions":["00000000-0000-0000-0000-0000000000a5"]}');
select public.t_msg('m3', '{"clientId":"00000000-0000-0000-0000-0000000000c1","productionId":"00000000-0000-0000-0000-0000000000f1","body":"Για το Reel Α"}');
select public.t_msg('m4', '{"clientId":"00000000-0000-0000-0000-0000000000c1","productionId":"00000000-0000-0000-0000-0000000000f1","body":"Εσωτερικό Reel Α","internal":true}');
select public.t_msg('m5', '{"clientId":"00000000-0000-0000-0000-0000000000c2","productionId":"00000000-0000-0000-0000-0000000000f2","body":"Για το Reel Β"}');

select public.t_as('a4');
select public.t_msg('m6', '{"clientId":"00000000-0000-0000-0000-0000000000c1","productionId":"00000000-0000-0000-0000-0000000000f1","body":"Από την Παραγωγή"}');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"χωρίς ετικέτα"}') $$, '42501', null, 'Μέλος Παραγωγής δεν γράφει χωρίς ετικέτα');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","productionId":"00000000-0000-0000-0000-0000000000f2","body":"x"}') $$, '42501', null, 'Μέλος δεν γράφει με ετικέτα Παραγωγής άλλου Πελάτη');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c2","productionId":"00000000-0000-0000-0000-0000000000f2","body":"x"}') $$, '42501', null, 'Μέλος άλλης Παραγωγής δεν γράφει στον Πελάτη Β');

select public.t_as('b1');
select public.t_msg('m7', '{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"Γεια σας από τον πελάτη"}');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"x","internal":true}') $$, 'P0001', null, 'Ο πελάτης δεν στέλνει Εσωτερικό');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"x","mentions":["00000000-0000-0000-0000-0000000000a5"]}') $$, 'P0001', null, 'Ο πελάτης δεν στέλνει αναφορές');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c2","body":"x"}') $$, '42501', null, 'Ο πελάτης Α δεν γράφει στη Συνομιλία του Β');

select public.t_as('b2');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"x"}') $$, '42501', null, 'Πελάτης χωρίς c.chatWrite δεν στέλνει');

select public.t_as('a3');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c2","body":"x"}') $$, '42501', null, 'Πωλήσεις δεν γράφουν σε Πελάτη που δεν είναι Υπεύθυνοι');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","productionId":"00000000-0000-0000-0000-0000000000f2","body":"x"}') $$, 'P0001', null, 'Η Παραγωγή άλλου Πελάτη απορρίπτεται');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","productionId":"00000000-0000-0000-0000-0000000000f3","body":"x"}') $$, 'P0001', null, 'Η ακυρωμένη Παραγωγή απορρίπτεται');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"x","mentions":["00000000-0000-0000-0000-0000000000a5"]}') $$, 'P0001', null, 'Αναφορές μόνο σε Εσωτερικά');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"x","internal":true,"mentions":["00000000-0000-0000-0000-0000000000a2"]}') $$, 'P0001', null, 'Αναφορά σε Λογιστή (χωρίς Συνομιλία) απορρίπτεται');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"   "}') $$, 'P0001', null, 'Κενό Μήνυμα απορρίπτεται');
select throws_ok($$ select public.message_send(jsonb_build_object('clientId', '00000000-0000-0000-0000-0000000000c1', 'body', repeat('x', 4001))) $$, 'P0001', null, 'Πάνω από 4.000 χαρακτήρες απορρίπτεται');
select throws_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"δες http://example.com"}') $$, 'P0001', null, 'Σύνδεσμος http:// απορρίπτεται');
select lives_ok($$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"δες https://example.com"}') $$, 'Σύνδεσμος https:// γίνεται δεκτός');
select public.t_msg('m8', jsonb_build_object('clientId', '00000000-0000-0000-0000-0000000000c1', 'body', repeat('Α', 120)));

-- ───────────── Ορατότητα ─────────────
-- Στη Συνομιλία του Α: m1 m2(Εσωτ., @Πέτρος) m3(Π1) m4(Εσωτ., Π1) m6(Π1, Νίκος) m7(πελάτης) σύνδεσμος(Άννα) m8(Άννα) = 8.
select public.t_as('a4');
select is(public.t_count('00000000-0000-0000-0000-0000000000c1'), 3, 'Μέλος Π1: βλέπει μόνο τα Μηνύματα με ετικέτα Π1 (m3, m4, m6)');
select is((public.t_thread('00000000-0000-0000-0000-0000000000c1')->>'partial')::boolean, true, 'Μέλος Π1: partial');
select throws_ok($$ select public.messages_thread('00000000-0000-0000-0000-0000000000c2') $$, '42501', null, 'Μέλος Π1 δεν έχει τίποτα στη Συνομιλία του Β');
select is(jsonb_array_length(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'productions'), 1, 'Μέλος Π1: ετικέτες μόνο δικές του (όχι ακυρωμένες)');
select is((public.t_thread('00000000-0000-0000-0000-0000000000c1')->>'canWriteUntagged')::boolean, false, 'Μέλος Π1: δεν γράφει χωρίς ετικέτα');

select public.t_as('a3');
select is(public.t_count('00000000-0000-0000-0000-0000000000c1'), 8, 'Υπεύθυνος του Α: βλέπει ολόκληρη τη Συνομιλία (και τα Εσωτερικά)');
select is((public.t_thread('00000000-0000-0000-0000-0000000000c1')->>'partial')::boolean, false, 'Υπεύθυνος: όχι partial');
select is(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'client'->>'status', 'active', 'Πελάτης με ανοιχτή Παραγωγή: ενεργός');
select throws_ok($$ select public.messages_thread('00000000-0000-0000-0000-0000000000c2') $$, '42501', null, 'Πωλήσεις (mine) δεν βλέπουν Πελάτη που δεν είναι Υπεύθυνοι');

select public.t_as('a5');
select is(public.t_count('00000000-0000-0000-0000-0000000000c1'), 1, '@αναφορά: βλέπει μόνο εκείνο το Εσωτερικό');
select is(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'messages'->0->>'id', current_setting('t.m2'), '@αναφορά: είναι το m2');
select is(public.t_count('00000000-0000-0000-0000-0000000000c2'), 1, 'Μέλος Π2: το Μήνυμα με την ετικέτα της Π2');

select public.t_as('b1');
select is(public.t_count('00000000-0000-0000-0000-0000000000c1'), 6, 'Πελάτης: βλέπει όλα εκτός των Εσωτερικών');

select public.t_as('a1');
select is(public.t_count('00000000-0000-0000-0000-0000000000c1'), 8, 'Ιδιοκτήτης: Εύρος όλα, βλέπει τα πάντα');
select is(jsonb_array_length(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'mentionable'), 3, 'Ιδιοκτήτης: αναφέρονται μόνο ενεργά μέλη με Συνομιλία, όχι ο εαυτός');
select is(jsonb_array_length(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'productions'), 1, 'Ιδιοκτήτης: οι ακυρωμένες Παραγωγές δεν είναι ετικέτες');

select public.t_as('b1');
select is(jsonb_typeof(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'mentionable'), 'null', 'Πελάτης: χωρίς λίστα αναφορών');
select is(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'client'->>'managerName', null, 'Πελάτης: χωρίς όνομα Υπεύθυνου');
select ok(not (public.t_thread('00000000-0000-0000-0000-0000000000c1')->'messages'->0 ? 'internal'), 'Πελάτης: τα Μηνύματα δεν έχουν πεδίο internal');
select throws_ok($$ select public.messages_thread('00000000-0000-0000-0000-0000000000c2') $$, '42501', null, 'Πελάτης Α δεν βλέπει τη Συνομιλία του Β');
select public.t_as('b3');
select throws_ok($$ select public.messages_thread('00000000-0000-0000-0000-0000000000c1') $$, '42501', null, 'Πελάτης Β δεν βλέπει τη Συνομιλία του Α');
select public.t_as('b2');
select is(public.t_count('00000000-0000-0000-0000-0000000000c1'), 6, 'Πελάτης με c.chatRead βλέπει τη Συνομιλία');

-- ───────────── Εισερχόμενα και αναφορές ─────────────
select public.t_as('a5');
select is(jsonb_array_length(public.messages_inbox()->'items'), 2, 'Μέλος Π2: δύο Συνομιλίες (αναφορά και δική του Παραγωγή)');
select is(public.messages_inbox()->'items'->0->>'clientName', 'Πελάτης Β', 'Ταξινόμηση: η πιο πρόσφατη πρώτη');
select is((public.messages_inbox()->'items'->1->>'lastInternal')::boolean, true, 'Η Συνομιλία της αναφοράς έχει τελευταίο Εσωτερικό');
select is((public.messages_inbox()->>'mentionsUnread')::int, 1, 'Μία αδιάβαστη αναφορά');
select is(jsonb_array_length(public.messages_mentions()->'items'), 1, 'Μία αναφορά στη λίστα');
select public.t_as('a3');
select is(jsonb_array_length(public.messages_mentions()->'items'), 0, 'Όποιος δεν αναφέρθηκε δεν έχει αναφορές');
select is(length(public.messages_inbox()->'items'->0->>'preview'), 90, 'Το preview κόβεται στους 90 χαρακτήρες');
select is(jsonb_array_length(public.messages_writable_clients()), 1, 'Πωλήσεις (mine): γράφουν μόνο στον Πελάτη όπου είναι Υπεύθυνοι');
select public.t_as('a1');
select is(jsonb_array_length(public.messages_writable_clients()), 2, 'Ιδιοκτήτης: γράφει σε όλους');
select public.t_as('a4');
select is(jsonb_array_length(public.messages_writable_clients()), 1, 'Μέλος Π1: γράφει στον Πελάτη της Παραγωγής του');
select public.t_as('b1');
select throws_ok($$ select public.messages_inbox() $$, '42501', null, 'Ο Χρήστης πελάτη δεν έχει Εισερχόμενα ομάδας');
select throws_ok($$ select public.messages_writable_clients() $$, '42501', null, 'Ο Χρήστης πελάτη δεν έχει λίστα Πελατών');

-- ───────────── Αδιάβαστα ─────────────
select public.t_as('a3');
select is((public.messages_inbox()->'items'->0->>'unread')::int, 6, 'Αδιάβαστα του Υπεύθυνου: m1 m2 m3 m4 m6 m7 (όχι τα δικά του)');
select is((public.messages_inbox()->'items'->0->>'partial')::boolean, false, 'Εισερχόμενα: Υπεύθυνος, όχι partial');
select is(public.t_thread('00000000-0000-0000-0000-0000000000c1')->>'readAt', null, 'Πριν το άνοιγμα δεν υπάρχει δείκτης');
select public.messages_mark_read('00000000-0000-0000-0000-0000000000c1');
select is((public.messages_inbox()->'items'->0->>'unread')::int, 0, 'Μετά το mark_read τα αδιάβαστα είναι 0');
select isnt(public.t_thread('00000000-0000-0000-0000-0000000000c1')->>'readAt', null, 'Ο δείκτης αποθηκεύτηκε');
select public.t_as('a1');
select public.t_msg('m9', '{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"Νέο Μήνυμα μετά την ανάγνωση"}');
select public.t_as('a3');
select is((public.messages_inbox()->'items'->0->>'unread')::int, 1, 'Ένα νέο Μήνυμα άλλου είναι αδιάβαστο');
select public.t_as('a4');
select is((public.messages_inbox()->'items'->0->>'partial')::boolean, true, 'Εισερχόμενα: Μέλος, partial');
select public.t_as('b3');
select throws_ok($$ select public.messages_mark_read('00000000-0000-0000-0000-0000000000c1') $$, '42501', null, 'Πελάτης Β δεν σημειώνει ανάγνωση στη Συνομιλία του Α');
select public.t_as('a2');
select throws_ok($$ select public.messages_mark_read('00000000-0000-0000-0000-0000000000c1') $$, '42501', null, 'Ο Λογιστής δεν σημειώνει ανάγνωση');

-- ───────────── Διόρθωση ─────────────
select public.t_as('a1');
select lives_ok($$ select public.message_edit(current_setting('t.m1')::uuid, 'Καλημέρα Α, διορθωμένο') $$, 'Διόρθωση εντός παραθύρου');
select isnt(
  (select x->>'editedAt' from jsonb_array_elements(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'messages') x where x->>'id' = current_setting('t.m1')),
  null, 'Το Μήνυμα φαίνεται διορθωμένο'
);
select public.t_as('a3');
select throws_ok($$ select public.message_edit(current_setting('t.m1')::uuid, 'ξένο') $$, '42501', null, 'Δεν διορθώνεις Μήνυμα άλλου');
select public.t_as('a5');
select throws_ok($$ select public.message_edit(current_setting('t.m1')::uuid, 'ξένο') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Μη ορατό Μήνυμα: 42501');
select throws_ok($$ select public.message_edit(gen_random_uuid(), 'ξένο') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ανύπαρκτο Μήνυμα: το ίδιο 42501');
select public.t_as('b1');
select throws_ok($$ select public.message_edit(current_setting('t.m1')::uuid, 'ξένο') $$, '42501', null, 'Ο πελάτης δεν διορθώνει Μήνυμα της ομάδας');

update public.messages set created_at = clock_timestamp() - interval '16 minutes' where id = current_setting('t.m1')::uuid;
select public.t_as('a1');
select throws_ok($$ select public.message_edit(current_setting('t.m1')::uuid, 'αργά') $$, 'P0001', 'Πέρασαν τα 15 λεπτά για διόρθωση', 'Εκτός παραθύρου: P0001');
select is(
  (select (x->>'canEdit')::boolean from jsonb_array_elements(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'messages') x where x->>'id' = current_setting('t.m1')),
  false, 'Εκτός παραθύρου δεν υπάρχει canEdit'
);

-- ───────────── Ετικέτα ─────────────
select public.t_as('a3');
select lives_ok($$ select public.message_set_tag(current_setting('t.m7')::uuid, '00000000-0000-0000-0000-0000000000f1') $$, 'Ο Υπεύθυνος βάζει ετικέτα');
select is(
  (select x->>'productionTitle' from jsonb_array_elements(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'messages') x where x->>'id' = current_setting('t.m7')),
  'Reel Α', 'Η ετικέτα φαίνεται'
);
select lives_ok($$ select public.message_set_tag(current_setting('t.m7')::uuid, null) $$, 'Ο Υπεύθυνος αφαιρεί την ετικέτα');
select throws_ok($$ select public.message_set_tag(current_setting('t.m7')::uuid, '00000000-0000-0000-0000-0000000000f3') $$, 'P0001', null, 'Ακυρωμένη Παραγωγή δεν γίνεται ετικέτα');
select public.t_as('a4');
select throws_ok($$ select public.message_set_tag(current_setting('t.m4')::uuid, null) $$, '42501', null, 'Μέλος δεν αφαιρεί ετικέτα (δεν βλέπει όλη τη Συνομιλία)');
select throws_ok($$ select public.message_set_tag(current_setting('t.m4')::uuid, '00000000-0000-0000-0000-0000000000f2') $$, '42501', null, 'Μέλος δεν βάζει ετικέτα Παραγωγής που δεν ανήκει στον Πελάτη');
select public.t_as('b1');
select throws_ok($$ select public.message_set_tag(current_setting('t.m7')::uuid, null) $$, '42501', null, 'Ο πελάτης δεν αλλάζει ετικέτες');

-- ───────────── Διαγραφή ─────────────
select public.t_as('a3');
select throws_ok($$ select public.message_delete(current_setting('t.m3')::uuid) $$, '42501', null, 'Δεν διαγράφεις Μήνυμα άλλου');
select public.t_as('a1');
select lives_ok($$ select public.message_delete(current_setting('t.m3')::uuid) $$, 'Ο αποστολέας διαγράφει');
select throws_ok($$ select public.message_edit(current_setting('t.m3')::uuid, 'ξανά') $$, 'P0001', null, 'Διαγραμμένο δεν διορθώνεται');
select public.t_as('a3');
select is(
  (select x->>'deleted' from jsonb_array_elements(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'messages') x where x->>'id' = current_setting('t.m3')),
  'true', 'Το διαγραμμένο φαίνεται ως διαγραμμένο'
);
select is(
  (select x->'body' from jsonb_array_elements(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'messages') x where x->>'id' = current_setting('t.m3')),
  'null'::jsonb, 'Το διαγραμμένο δεν έχει κείμενο'
);
select public.t_as('b1');
select is(
  (select x->'body' from jsonb_array_elements(public.t_thread('00000000-0000-0000-0000-0000000000c1')->'messages') x where x->>'id' = current_setting('t.m3')),
  'null'::jsonb, 'Ο πελάτης βλέπει διαγραμμένο χωρίς κείμενο'
);

-- ───────────── Ίχνος ─────────────
select public.t_as('a1');
set local role authenticated;
select is((select count(*)::int from public.audit_log where entity = 'messages' and action = 'insert'), 0, 'Η αποστολή δεν γράφεται στο Ίχνος');
select ok((select count(*) from public.audit_log where entity = 'messages' and action = 'update') >= 3, 'Διόρθωση, ετικέτα και διαγραφή γράφονται στο Ίχνος');
reset role;
select public.t_as('a3');
set local role authenticated;
select is((select count(*)::int from public.audit_log where entity = 'messages'), 0, 'Χωρίς «Βλέπει ίχνος» δεν φαίνονται Μηνύματα στο Ίχνος');
reset role;

-- ───────────── Αφαίρεση Μέλους ─────────────
delete from public.production_members where user_id = '00000000-0000-0000-0000-0000000000a4';
select public.t_as('a4');
select throws_ok($$ select public.messages_thread('00000000-0000-0000-0000-0000000000c1') $$, '42501', null, 'Η αφαίρεση Μέλους κόβει αμέσως την πρόσβαση');

select * from finish();
rollback;
