-- Μηνύματα Jε #164: σύνοψη αδιάβαστων (Μ4), email κλεισίματος Αιτήματος (Γεγονός 48) και Ρυθμίσεις › Μηνύματα (Μ14).
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι ώρες είναι σταθερές (παρελθόν) και περνούν ως p_now.
begin;
select plan(58);

-- a1 Ιδιοκτήτης · a2 Λογιστής · a3 Πωλήσεις · b1 Χρήστης πελάτη Α «Πλήρης» · b2 Α μόνο «Βλέπει Συνομιλία» · b3 Β «Πλήρης» · b4 Α χωρίς Συνομιλία
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'k2@client-a.example.gr'),
  ('00000000-0000-0000-0000-0000000000b3', 'k3@client-b.example.gr'),
  ('00000000-0000-0000-0000-0000000000b4', 'k4@client-a.example.gr'),
  ('00000000-0000-0000-0000-0000000000b5', 'k5@client-a.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ελένη', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Νίκος', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις')
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
-- b5: αφαιρεμένος Χρήστης πελάτη Α «Πλήρης»· δεν παίρνει κανένα email.
insert into public.client_users (client_id, user_id, name, role_id, is_current, removed_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b5', 'Στέλιος',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), false, now());

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- Ώρα σε λεπτά από τη σταθερή αρχή T0 = 2026-01-10 10:00 UTC.
create function public.t_at(p_min integer) returns timestamptz
language sql immutable
as $$ select timestamptz '2026-01-10 10:00+00' + make_interval(mins => p_min); $$;

-- Μήνυμα με σταθερή ώρα: (κλειδί, συγγραφέας, είδος, εσωτερικό, λεπτά).
create function public.t_msg(p_key text, p_author text, p_kind text, p_internal boolean, p_min integer) returns void
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into public.messages (id, client_id, author_id, author_kind, body, is_internal, created_at)
  values (v_id, '00000000-0000-0000-0000-0000000000c1', ('00000000-0000-0000-0000-0000000000' || p_author)::uuid,
          p_kind, 'Κείμενο ' || p_key, p_internal, public.t_at(p_min));
  perform set_config('t.' || p_key, v_id::text, true);
end;
$$;

create function public.t_digest(p_min integer) returns integer
language sql
as $$ select public.message_digest_enqueue(public.t_at(p_min)); $$;

create function public.t_mails(p_kind text, p_email text) returns integer
language sql
as $$ select count(*)::integer from public.email_outbox where kind = p_kind and to_email = p_email; $$;

-- ───────────── Δικαιώματα ─────────────
set local role anon;
select throws_ok($$ select public.message_digest_enqueue() $$, '42501', null, 'Ο ανώνυμος δεν τρέχει τη σύνοψη');
select throws_ok($$ select public.message_settings_get() $$, '42501', null, 'Ο ανώνυμος δεν διαβάζει τις Ρυθμίσεις');
reset role;

select public.t_as('a1');
set local role authenticated;
select throws_ok($$ select public.message_digest_enqueue() $$, '42501', null, 'Ο Ιδιοκτήτης (authenticated) δεν τρέχει τη σύνοψη: μόνο service_role');
reset role;

select public.t_as('a2');
select throws_ok($$ select public.message_settings_update('{"editMinutes":20}') $$, '42501', null, 'Ο Λογιστής δεν αλλάζει τις Ρυθμίσεις');
select throws_ok($$ select public.message_settings_get() $$, '42501', null, 'Ο Λογιστής (χωρίς messages.chat) δεν διαβάζει τις Ρυθμίσεις');
select public.t_as('a3');
select throws_ok($$ select public.message_settings_update('{"editMinutes":20}') $$, '42501', null, 'Οι Πωλήσεις δεν αλλάζουν τις Ρυθμίσεις');
select public.t_as('b1');
select throws_ok($$ select public.message_settings_update('{"editMinutes":20}') $$, '42501', null, 'Ο πελάτης δεν αλλάζει τις Ρυθμίσεις');
select throws_ok($$ select public.message_settings_get() $$, '42501', null, 'Ο πελάτης δεν διαβάζει τις Ρυθμίσεις');
select public.t_as('a1');
set local role authenticated;
select throws_ok($$ select * from public.message_digest_marks $$, '42501', null, 'Ο πίνακας message_digest_marks είναι κλειστός');
reset role;
select is(public.message_settings_get(), '{"digestMinutes":15,"editMinutes":15,"requestOpenDays":3}'::jsonb, 'Οι προεπιλεγμένες Ρυθμίσεις');

-- ───────────── Σύνοψη αδιάβαστων ─────────────
-- m1 ομάδα T0 · m2 εσωτερικό T0+1 · m3 δικό του (πελάτη) T0 · m4 διαγραμμένο της ομάδας T0
select public.t_msg('m1', 'a1', 'team', false, 0);
select public.t_msg('m2', 'a1', 'team', true, 1);
select public.t_msg('m3', 'b1', 'client', false, 0);
select public.t_msg('m4', 'a1', 'team', false, 0);
update public.messages set deleted_at = public.t_at(2), deleted_by = '00000000-0000-0000-0000-0000000000a1'
 where id = current_setting('t.m4')::uuid;

select is(public.t_digest(14), 0, 'Στα 14 λεπτά δεν στέλνει σύνοψη');
select is(public.t_digest(15), 2, 'Στα 15 λεπτά στέλνει ένα email σε κάθε Χρήστη του Πελάτη με c.chatRead');
select is(public.t_mails('message_digest', 'k1@client-a.example.gr'), 1, 'Ο πλήρης πελάτης παίρνει ένα email');
select is(public.t_mails('message_digest', 'k2@client-a.example.gr'), 1, 'Ο πελάτης μόνο ανάγνωσης παίρνει ένα email');
select is((select payload from public.email_outbox where kind = 'message_digest' and to_email = 'k1@client-a.example.gr'),
          '{"clientName":"Πελάτης Α","count":1}'::jsonb, 'Το payload έχει μόνο όνομα Πελάτη και πλήθος: εσωτερικά, δικά του και διαγραμμένα δεν μετρούν');
select is(public.t_mails('message_digest', 'k4@client-a.example.gr'), 0, 'Χωρίς c.chatRead: τίποτα');
select is(public.t_mails('message_digest', 'k3@client-b.example.gr'), 0, 'Ο Πελάτης Β δεν έχει νέα Μηνύματα: τίποτα');
select is(public.t_mails('message_digest', 'owner@example.com'), 0, 'Η ομάδα δεν παίρνει σύνοψη');
select is(public.t_mails('message_digest', 'k5@client-a.example.gr'), 0, 'Ο αφαιρεμένος Χρήστης πελάτη δεν παίρνει σύνοψη');
select is(public.t_digest(16), 0, 'Δεύτερη κλήση: ούτε ένα email ξανά');

select public.t_msg('m5', 'a1', 'team', false, 20);
select is(public.t_digest(34), 0, 'Νέο Μήνυμα μετά τη σύνοψη: 14 λεπτά, τίποτα');
select is(public.t_digest(35), 2, 'Νέο Μήνυμα μετά τη σύνοψη: νέο κύμα στα 15 λεπτά');

select public.t_msg('m6', 'a1', 'team', false, 60);
select public.t_as('b1');
select public.messages_mark_read('00000000-0000-0000-0000-0000000000c1', public.t_at(61));
select is(public.t_digest(80), 1, 'Το διάβασμα ακυρώνει τη σύνοψη του πελάτη που διάβασε· παίρνει μόνο ο άλλος');
select is(public.t_mails('message_digest', 'k1@client-a.example.gr'), 2, 'Ο πελάτης που διάβασε έχει μείνει με δύο email');
select is(public.t_mails('message_digest', 'k2@client-a.example.gr'), 3, 'Ο πελάτης που δεν διάβασε έχει τρία email');

-- ───────────── Ρυθμίσεις: αλλαγή και όρια ─────────────
select public.t_as('a1');
select throws_ok($$ select public.message_settings_update('{"digestMinutes":0}') $$, 'P0001', null, 'Σύνοψη 0 λεπτά: P0001');
select throws_ok($$ select public.message_settings_update('{"digestMinutes":1441}') $$, 'P0001', null, 'Σύνοψη πάνω από 1440: P0001');
select throws_ok($$ select public.message_settings_update('{"editMinutes":1.5}') $$, 'P0001', null, 'Μη ακέραιη διόρθωση: P0001');
select throws_ok($$ select public.message_settings_update('{"requestOpenDays":61}') $$, 'P0001', null, 'Μέρες Αιτήματος πάνω από 60: P0001');
select throws_ok($$ select public.message_settings_update('{"editMinutes":"x"}') $$, 'P0001', null, 'Κείμενο αντί για αριθμό: P0001');
select throws_ok($$ select public.message_settings_update('[1]') $$, 'P0001', null, 'Πίνακας αντί για αντικείμενο: P0001');
select is((select count(*)::integer from public.audit_log where entity = 'message_settings'), 0, 'Τα άκυρα αιτήματα δεν γράφουν Ίχνος');

select lives_ok($$ select public.message_settings_update('{"digestMinutes":30,"editMinutes":20}') $$, 'Ο Ιδιοκτήτης αλλάζει τις Ρυθμίσεις');
select is(public.message_settings_get(), '{"digestMinutes":30,"editMinutes":20,"requestOpenDays":3}'::jsonb, 'Η μερική αλλαγή κρατά τις υπόλοιπες τιμές');
select is((select count(*)::integer from public.audit_log where entity = 'message_settings' and action = 'update'), 1, 'Η αλλαγή γράφει Ίχνος');
select lives_ok($$ select public.message_settings_update('{"digestMinutes":30,"editMinutes":20}') $$, 'Αίτημα χωρίς αλλαγή τιμών');
select is((select count(*)::integer from public.audit_log where entity = 'message_settings'), 1, 'Χωρίς αλλαγή τιμών δεν γράφεται Ίχνος');
select public.t_as('b1');
select is(public.messages_client_context()->>'digestMinutes', '30', 'Το πλαίσιο του πελάτη διαβάζει τα λεπτά σύνοψης από τη ρύθμιση');
select is(public.messages_client_context()->>'editMinutes', '20', 'Το πλαίσιο του πελάτη διαβάζει τα λεπτά διόρθωσης από τη ρύθμιση');

-- Η αλλαγή digest_minutes επηρεάζει την επόμενη κλήση: m7 στο T0+100.
select public.t_as('a1');
select public.t_msg('m7', 'a1', 'team', false, 100);
select is(public.t_digest(125), 0, 'Με 30 λεπτά: στα 25 λεπτά δεν στέλνει (με 15 θα έστελνε)');
select is(public.t_digest(130), 2, 'Με 30 λεπτά: στα 30 στέλνει');

-- ───────────── Κλείσιμο Αιτήματος ─────────────
-- Αιτήματα με άμεση εισαγωγή (δηλωμένα από τον πελάτη b1 / την ομάδα a1 / τον b4 χωρίς c.chatRead).
create function public.t_req(p_key text, p_author text, p_kind text, p_declared_by text, p_declared_user text) returns void
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into public.messages (id, client_id, author_id, author_kind, body, created_at)
  values (v_id, '00000000-0000-0000-0000-0000000000c1', ('00000000-0000-0000-0000-0000000000' || p_author)::uuid,
          p_kind, 'Αίτημα ' || p_key, public.t_at(200));
  insert into public.message_requests (message_id, kind, declared_by, declared_user)
  values (v_id, 'other', p_declared_by, ('00000000-0000-0000-0000-0000000000' || p_declared_user)::uuid);
  perform set_config('t.' || p_key, v_id::text, true);
end;
$$;

select public.t_req('q1', 'b1', 'client', 'client', 'b1');
select public.t_req('q2', 'b1', 'client', 'client', 'b1');
select public.t_req('q3', 'b1', 'client', 'team', 'a1');
select public.t_req('q4', 'b1', 'client', 'client', 'b1');
select public.t_req('q5', 'b4', 'client', 'client', 'b4');

select is((select count(*)::integer from public.email_outbox where kind = 'request_closed'), 0, 'Ανοιχτά Αιτήματα: κανένα email');

select public.message_request_close(current_setting('t.q1')::uuid, '{"outcome":"done","link":"https://example.com/reel","comment":"Έτοιμο"}');
select is(public.t_mails('request_closed', 'k1@client-a.example.gr'), 1, 'Ολοκλήρωση: ένα email στον πελάτη που δήλωσε');
select is(public.t_mails('request_closed', 'k2@client-a.example.gr'), 0, 'Ολοκλήρωση: δεν πάει σε άλλον Χρήστη του Πελάτη όταν το δήλωσε πελάτης');
select is((select payload from public.email_outbox where kind = 'request_closed' and to_email = 'k1@client-a.example.gr'),
          '{"clientName":"Πελάτης Α","kind":"other","outcome":"done","comment":"Έτοιμο","link":"https://example.com/reel"}'::jsonb,
          'Το payload ολοκλήρωσης έχει σχόλιο και σύνδεσμο https, όχι κείμενο Μηνύματος');

select public.message_request_close(current_setting('t.q2')::uuid, '{"outcome":"rejected","reply":"Δεν γίνεται αυτή την περίοδο"}');
select is(public.t_mails('request_closed', 'k1@client-a.example.gr'), 2, 'Απόρριψη: ένα ακόμα email');
select is((select payload from public.email_outbox where kind = 'request_closed' and payload ->> 'outcome' = 'rejected'),
          '{"clientName":"Πελάτης Α","kind":"other","outcome":"rejected","reply":"Δεν γίνεται αυτή την περίοδο"}'::jsonb,
          'Το payload απόρριψης έχει την απάντηση');

select public.message_request_close(current_setting('t.q3')::uuid, '{"outcome":"done","comment":"Το φροντίσαμε"}');
select is(public.t_mails('request_closed', 'k1@client-a.example.gr'), 3, 'Αίτημα της ομάδας: πάει στον πλήρη πελάτη');
select is(public.t_mails('request_closed', 'k2@client-a.example.gr'), 1, 'Αίτημα της ομάδας: πάει και στον πελάτη μόνο ανάγνωσης');
select is(public.t_mails('request_closed', 'k4@client-a.example.gr') + public.t_mails('request_closed', 'k3@client-b.example.gr'), 0,
          'Αίτημα της ομάδας: όχι σε όσους δεν έχουν c.chatRead ή είναι άλλου Πελάτη');
select is(public.t_mails('request_closed', 'k5@client-a.example.gr'), 0, 'Αίτημα της ομάδας: όχι στον αφαιρεμένο Χρήστη πελάτη');

-- Αυτόματο κλείσιμο (Μ11): το Αίτημα κλείνει με το Παραδοτέο που δημιουργήθηκε.
update public.message_requests
   set state = 'done', closed_at = public.t_at(210), closed_by = '00000000-0000-0000-0000-0000000000a1',
       is_automatic = true, result_kind = 'deliverable', result_id = '00000000-0000-0000-0000-0000000000d1'
 where message_id = current_setting('t.q4')::uuid;
select is((select payload ->> 'deliverableId' from public.email_outbox
            where kind = 'request_closed' and payload ->> 'deliverableId' is not null), '00000000-0000-0000-0000-0000000000d1',
          'Το αυτόματο κλείσιμο γράφει email με το Παραδοτέο');
select is(public.t_mails('request_closed', 'k1@client-a.example.gr'), 4, 'Το αυτόματο κλείσιμο πάει στον πελάτη που δήλωσε');

-- Αίτημα πελάτη που δεν έχει (πια) c.chatRead: πάει σε όλους τους Χρήστες του Πελάτη με c.chatRead.
select public.message_request_close(current_setting('t.q5')::uuid, '{"outcome":"rejected","reply":"Όχι"}');
select is(public.t_mails('request_closed', 'k4@client-a.example.gr'), 0, 'Ο δηλώσας χωρίς c.chatRead δεν παίρνει email');
select is(public.t_mails('request_closed', 'k1@client-a.example.gr'), 5, 'Ο δηλώσας έφυγε: πάει στον πλήρη πελάτη');
select is(public.t_mails('request_closed', 'k2@client-a.example.gr'), 2, 'Ο δηλώσας έφυγε: πάει και στον πελάτη μόνο ανάγνωσης');
select is((select count(*)::integer from public.email_outbox where kind = 'request_closed'), 7, 'Σύνολο email κλεισίματος: 7');

-- Αλλαγή υπευθύνου σε ήδη κλεισμένο Αίτημα δεν ξαναστέλνει.
update public.message_requests set assignee_id = '00000000-0000-0000-0000-0000000000a1' where message_id = current_setting('t.q1')::uuid;
select is((select count(*)::integer from public.email_outbox where kind = 'request_closed'), 7, 'Αλλαγή στο κλεισμένο Αίτημα δεν ξαναστέλνει');

select * from finish();
rollback;
