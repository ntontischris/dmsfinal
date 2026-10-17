-- Ειδοποιήσεις Kδ #173: RPC της K1 (Αυτοματισμοί) και της K2 (Μηνύματα συστήματος).
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(68);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Παραγωγή (χωρίς automations.manage) · a3 Διαχείριση · a4 ανενεργός Χρήστης ομάδας · b1 Χρήστης πελάτη «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'former@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Δήμητρα', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Στέλιος', 'former@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'), ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a3', 'Διαχείριση'), ('00000000-0000-0000-0000-0000000000a4', 'Παραγωγή'))
       as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';
update public.team_users set is_active = false where user_id = '00000000-0000-0000-0000-0000000000a4';

insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Ένα', 'Μαρία Παπαδάκη', 'one@example.com', '00000000-0000-0000-0000-0000000000a1');
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

-- ───────────── Βοηθητικά (ως postgres, ποτέ ως authenticated) ─────────────
create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

create function public.t_audits(p_entity text) returns integer
language sql
as $$ select count(*)::integer from public.audit_log l where l.entity = p_entity; $$;

-- Ένας νέος Αυτοματισμός «Νέο Μήνυμα» προς ονομαστικούς Χρήστες.
create function public.t_users_auto(p_users text) returns jsonb
language sql
as $$
  select public.automation_save(jsonb_build_object(
    'eventType', 'message.created', 'channel', 'notification', 'recipientKind', 'users',
    'recipientUserIds', p_users::jsonb, 'timing', 'immediate', 'bodyEl', 'Νέο Μήνυμα από {sender}', 'bodyEn', ''));
$$;

-- ───────────── Δικαιώματα ─────────────
set local role anon;
select throws_ok($$ select public.automations_catalog() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τον κατάλογο');
select throws_ok($$ select public.system_messages_list() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τα Μηνύματα συστήματος');
reset role;

select public.t_as('a1');
set local role authenticated;
select throws_ok($$ select * from public.system_messages $$, '42501', null, 'Ο πίνακας system_messages είναι κλειστός');
select throws_ok($$ select * from public.automations $$, '42501', null, 'Ο πίνακας automations είναι κλειστός');
reset role;

select public.t_as('a2');
select throws_ok($$ select public.automations_catalog() $$, '42501', null, 'Χωρίς automations.manage δεν φαίνεται ο κατάλογος');
select throws_ok($$ select public.automation_event('message.created') $$, '42501', null, 'Χωρίς automations.manage δεν φαίνεται Γεγονός');
select throws_ok($$ select public.automation_event('δεν.υπάρχει') $$, '42501', null, 'Ανύπαρκτο Γεγονός χωρίς Δικαίωμα: ίδιο 42501');
select throws_ok($$ select public.t_users_auto('["00000000-0000-0000-0000-0000000000a1"]') $$, '42501', null,
  'Χωρίς automations.manage δεν προστίθεται Αυτοματισμός');
select throws_ok(format($$ select public.automation_set_enabled(%L, false) $$,
                        (select a.id from public.automations a where a.event_type = 'message.created' order by a.sort limit 1)),
  '42501', null, 'Χωρίς automations.manage δεν σβήνει Αυτοματισμός');
select throws_ok($$ select public.automation_delete(gen_random_uuid()) $$, '42501', null, 'Χωρίς automations.manage δεν διαγράφεται τίποτα');
select throws_ok($$ select public.system_messages_list() $$, '42501', null, 'Χωρίς automations.manage δεν φαίνονται τα Μηνύματα συστήματος');
select throws_ok($$ select public.system_message_save('{"code":"invite","subjectEl":"Γεια"}') $$, '42501', null,
  'Χωρίς automations.manage δεν αλλάζει Μήνυμα συστήματος');

select public.t_as('b1');
select throws_ok($$ select public.automations_catalog() $$, '42501', null, 'Ο πελάτης δεν βλέπει τον κατάλογο');
select throws_ok($$ select public.system_message_save('{"code":"invite","subjectEl":"Γεια"}') $$, '42501', null,
  'Ο πελάτης δεν αλλάζει Μήνυμα συστήματος');

-- ───────────── Κατάλογος και Γεγονός ─────────────
select public.t_as('a3');
select is(jsonb_array_length(public.automations_catalog() -> 'events'), 59, 'Η Διαχείριση βλέπει και τα 59 Γεγονότα (58 και το 60)');
select is(jsonb_array_length(public.automations_catalog() -> 'groups'), 6, 'Έξι ομάδες');
select is((select (e ->> 'totalCount')::integer from jsonb_array_elements(public.automations_catalog() -> 'events') e
            where e ->> 'code' = 'message.created'), 3, 'Το «Νέο Μήνυμα» έχει 3 αρχικούς Αυτοματισμούς');
select is((select e ->> 'isWired' from jsonb_array_elements(public.automations_catalog() -> 'events') e
            where e ->> 'code' = 'opportunity.form_submitted'), 'false', 'Η φόρμα Ιστοσελίδας συνδέεται αργότερα');
select is(jsonb_array_length(public.automation_event('message.created') -> 'automations'), 3, 'Η σελίδα Γεγονότος έχει τους Αυτοματισμούς');
select is((select a ->> 'sendTime' from jsonb_array_elements(public.automation_event('holiday.greeting') -> 'automations') a limit 1),
  '09:00', 'Η ώρα αποστολής φεύγει ως «HH:MM»');
select throws_ok($$ select public.automation_event('δεν.υπάρχει') $$, 'P0001', null, 'Ανύπαρκτο Γεγονός: P0001');

-- ───────────── Νέος Αυτοματισμός ─────────────
select public.t_as('a1');
select lives_ok($$ select public.t_users_auto('["00000000-0000-0000-0000-0000000000a3"]') $$,
  'Ο Ιδιοκτήτης προσθέτει Ειδοποίηση προς συγκεκριμένο Χρήστη');
select is((select count(*)::integer from public.automations
            where event_type = 'message.created' and recipient_kind = 'users' and not is_initial and is_enabled), 1,
  'Ο νέος είναι ενεργός και όχι αρχικός');
select is((select count(*)::integer from public.audit_log l
            where l.entity = 'automations' and l.action = 'insert' and l.actor_id = '00000000-0000-0000-0000-0000000000a1'), 1,
  'Γράφτηκε Ίχνος με τον Ιδιοκτήτη');
select throws_ok($$ select public.t_users_auto('["00000000-0000-0000-0000-0000000000a4"]') $$, 'P0001', null,
  'Ανενεργός Χρήστης: P0001');
select throws_ok($$ select public.t_users_auto('["00000000-0000-0000-0000-0000000000b1"]') $$, 'P0001', null,
  'Χρήστης πελάτη στα «ονομαστικά»: P0001');
select throws_ok($$ select public.automation_save('{"eventType":"message.created","channel":"notification","recipientKind":"relative",
  "recipientRelative":"client_owner","timing":"immediate","bodyEl":"Γεια {τοποθεσια} {location}"}') $$, 'P0001', null,
  'Άγνωστη μεταβλητή: P0001');
select throws_ok($$ select public.automation_save('{"eventType":"message.created","channel":"email","recipientKind":"relative",
  "recipientRelative":"client_owner","timing":"immediate","bodyEl":"Γεια {sender}"}') $$, 'P0001', null,
  'Email χωρίς θέμα: P0001');
select throws_ok($$ select public.automation_save('{"eventType":"message.created","channel":"notification","recipientKind":"relative",
  "recipientRelative":"client_owner","timing":"wait","waitMinutes":10,"bodyEl":"Γεια"}') $$, 'P0001', null,
  'Αναμονή σε στιγμιαίο Γεγονός: P0001');
select throws_ok($$ select public.automation_save('{"eventType":"message.created","channel":"notification","recipientKind":"relative",
  "recipientRelative":"crew","timing":"immediate","bodyEl":"Γεια"}') $$, 'P0001', null,
  'Σχετικός παραλήπτης εκτός λίστας: P0001');
select throws_ok($$ select public.automation_save('{"eventType":"message.created","channel":"notification","recipientKind":"permission",
  "recipientPermission":"δεν.υπάρχει","timing":"immediate","bodyEl":"Γεια"}') $$, 'P0001', null,
  'Δικαίωμα που δεν υπάρχει: P0001');
select throws_ok($$ select public.automation_save('{"eventType":"filming.day","channel":"notification","recipientKind":"relative",
  "recipientRelative":"crew","timing":"offset","offsetDays":-1,"bodyEl":"Αύριο"}') $$, 'P0001', null,
  'Χρονισμός με ημερομηνία χωρίς ώρα: P0001');
select lives_ok($$ select public.automation_save('{"eventType":"filming.day","channel":"notification","recipientKind":"relative",
  "recipientRelative":"crew","timing":"offset","offsetDays":-2,"sendTime":"08:30","bodyEl":"Σε δύο μέρες: {filming}"}') $$,
  'Χρονισμός με ημερομηνία: μέρες και ώρα');
select lives_ok($$ select public.automation_save('{"eventType":"opportunity.form_submitted","channel":"notification",
  "recipientKind":"relative","recipientRelative":"opportunity_owner","timing":"immediate","bodyEl":"Νέα Ευκαιρία {opportunity}"}') $$,
  'Γεγονός που συνδέεται αργότερα δέχεται Αυτοματισμό');

-- ───────────── Επεξεργασία, διακόπτης, διαγραφή ─────────────
select set_config('t.new', (select a.id::text from public.automations a
                             where a.event_type = 'message.created' and recipient_kind = 'users'), true);
select set_config('t.audits', public.t_audits('automations')::text, true);
select is(public.automation_save(jsonb_build_object('id', current_setting('t.new'), 'bodyEl', 'Νέο Μήνυμα από {sender}')) ->> 'changed',
  'false', 'Χωρίς αλλαγή: τίποτα δεν γράφεται');
select is(public.t_audits('automations'), current_setting('t.audits')::integer, 'Χωρίς αλλαγή: ούτε Ίχνος');
select is(public.automation_save(jsonb_build_object('id', current_setting('t.new'), 'bodyEl', 'Γράφει ο/η {sender}: {excerpt}')) ->> 'changed',
  'true', 'Αλλαγή κειμένου');
select throws_ok(format($$ select public.automation_save('{"id":"%s","eventType":"request.created"}') $$, current_setting('t.new')),
  'P0001', null, 'Ένας Αυτοματισμός δεν αλλάζει Γεγονός');
select lives_ok(format($$ select public.automation_set_enabled(%L, false) $$, current_setting('t.new')), 'Σβήνει');
select is((select is_enabled from public.automations where id = current_setting('t.new')::uuid), false, 'Είναι σβηστός');
select throws_ok(format($$ select public.automation_delete(%L) $$,
                        (select a.id from public.automations a where a.event_type = 'message.created' and a.is_initial limit 1)),
  'P0001', null, 'Οι αρχικοί δεν διαγράφονται');
select lives_ok(format($$ select public.automation_delete(%L) $$, current_setting('t.new')), 'Ο Αυτοματισμός της Διαχείρισης διαγράφεται');
select is((select count(*)::integer from public.automations where id = current_setting('t.new')::uuid), 0, 'Δεν υπάρχει πια');

-- Με αποστολές: μόνο σβήνει, το Ιστορικό μένει.
select set_config('t.sent', (public.t_users_auto('["00000000-0000-0000-0000-0000000000a3"]') ->> 'id'), true);
insert into public.automation_sends (automation_id, case_key, recipient_key, channel)
values (current_setting('t.sent')::uuid, 'message.created:τεστ', '00000000-0000-0000-0000-0000000000a3', 'notification');
select throws_ok(format($$ select public.automation_delete(%L) $$, current_setting('t.sent')), 'P0001', null,
  'Αυτοματισμός με αποστολές δεν διαγράφεται');
select is((select count(*)::integer from public.automation_sends where automation_id = current_setting('t.sent')::uuid), 1,
  'Το σημάδι αποστολής μένει');

-- Κανένας σύνδεσμος στο θέμα.
select throws_ok($$ select public.automation_save('{"eventType":"message.created","channel":"email","recipientKind":"relative",
  "recipientRelative":"client_owner","timing":"immediate","subjectEl":"Δες {link}","bodyEl":"Γεια {link}"}') $$, 'P0001', null,
  'Το {link} δεν μπαίνει στο θέμα Αυτοματισμού');
select lives_ok($$ select public.automation_save('{"eventType":"message.created","channel":"email","recipientKind":"relative",
  "recipientRelative":"client_owner","timing":"immediate","subjectEl":"Μήνυμα από {sender}","bodyEl":"Δες {link}"}') $$,
  'Το {link} μπαίνει στο κείμενο');

-- Δικαίωμα πελάτη: ο Αυτοματισμός ανήκει στις Προτιμήσεις του πελάτη.
select set_config('t.client_perm', (public.automation_save('{"eventType":"message.created","channel":"notification",
  "recipientKind":"permission","recipientPermission":"c.chatRead","timing":"immediate","bodyEl":"Νέο Μήνυμα"}') ->> 'id'), true);
select is((select count(*)::integer from jsonb_array_elements(public.my_notification_prefs()) p
            where p ->> 'automationId' = current_setting('t.client_perm')), 0,
  'Η ομάδα δεν βλέπει στις Προτιμήσεις Αυτοματισμό με Δικαίωμα πελάτη');
select public.t_as('b1');
select is((select count(*)::integer from jsonb_array_elements(public.my_notification_prefs()) p
            where p ->> 'automationId' = current_setting('t.client_perm')), 1,
  'Ο πελάτης τον βλέπει στις Προτιμήσεις');
select lives_ok(format($$ select public.set_notification_pref(%L, false) $$, current_setting('t.client_perm')),
  'Ο πελάτης τον σβήνει για τον εαυτό του');

-- ───────────── Αργίες: μία αλλαγή κάθε φορά ─────────────
select public.t_as('a2');
select throws_ok($$ select public.holiday_greeting_add('{"name":"Γιορτή","month":12,"day":27}') $$, '42501', null,
  'Χωρίς automations.manage δεν προστίθεται αργία');
select public.t_as('a1');
select lives_ok($$ select public.holiday_greeting_set_official('Πρωτοχρονιά', false) $$, 'Σβήνει μία επίσημη');
select ok((public.holiday_greetings_get(2026) -> 'removed') ? 'Πρωτοχρονιά', 'Η Πρωτοχρονιά είναι σβηστή');
select ok((public.holiday_greetings_get(2026) -> 'removed') ? 'Καθαρά Δευτέρα', 'Οι άλλες σβηστές μένουν όπως ήταν');
select throws_ok($$ select public.holiday_greeting_set_official('Άγνωστη', false) $$, 'P0001', null, 'Μόνο επίσημες');
select set_config('t.holiday', public.holiday_greeting_add('{"name":"Γιορτή της εταιρείας","month":12,"day":27}')::text, true);
select is(jsonb_array_length(public.holiday_greetings_get(2026) -> 'added'), 1, 'Η προσθήκη φαίνεται');
select lives_ok(format($$ select public.holiday_greeting_remove(%L) $$, current_setting('t.holiday')), 'Σβήνει τη δική της');
select is(jsonb_array_length(public.holiday_greetings_get(2026) -> 'added'), 0, 'Δεν υπάρχει πια');

-- ───────────── Μηνύματα συστήματος ─────────────
select is(jsonb_array_length(public.system_messages_list()), 7, 'Επτά Μηνύματα συστήματος');
select throws_ok($$ select public.system_message_save('{"code":"signing_code","bodyEl":"Ο κωδικός σας για {agreement}."}') $$,
  'P0001', null, 'Ο κωδικός υπογραφής χωρίς {code}: P0001');
select throws_ok($$ select public.system_message_save('{"code":"invite","bodyEl":"Γεια {code}"}') $$,
  'P0001', null, 'Άγνωστη μεταβλητή στην πρόσκληση: P0001');
select throws_ok($$ select public.system_message_save('{"code":"signing_code","subjectEl":"Κωδικός {code}","bodyEl":"Ο κωδικός {code}."}') $$,
  'P0001', null, 'Ο {code} δεν μπαίνει στο θέμα');
select throws_ok($$ select public.system_message_save('{"code":"invite","subjectEn":"Join {link}"}') $$,
  'P0001', null, 'Ο {link} δεν μπαίνει στο θέμα');
select throws_ok($$ select public.system_message_save('{"code":"δεν_υπάρχει","bodyEl":"Γεια"}') $$,
  'P0001', null, 'Ανύπαρκτο Μήνυμα συστήματος: P0001');
select lives_ok($$ select public.system_message_save('{"code":"invite","subjectEl":"Καλώς ήρθες, {recipientName}"}') $$,
  'Αλλάζει το θέμα της πρόσκλησης');
select is((select m ->> 'isEdited' from jsonb_array_elements(public.system_messages_list()) m where m ->> 'code' = 'invite'),
  'true', 'Η πρόσκληση φαίνεται «αλλαγμένη»');
select lives_ok($$ select public.system_message_save('{"code":"invite"}') $$, 'Επαναφορά');
select is((select count(*)::integer from public.audit_log l where l.entity = 'system_messages' and l.entity_id = 'invite'), 2,
  'Αλλαγή και επαναφορά γράφουν Ίχνος');

select * from finish();
rollback;
