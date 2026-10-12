-- Ειδοποιήσεις Kε #174: Ιστορικό αποστολών (K3, καρτέλα Πελάτη), «Ξαναστείλε», Γεγονότα Υγείας 50–53, διατήρηση 12 μηνών.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι έλεγχοι Υγείας και ο καθαρισμός παίρνουν σταθερό p_now.
begin;
select plan(49);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Παραγωγή (χωρίς Δικαίωμα) · a3 Πωλήσεις (Υπεύθυνος Πελάτη 1)
-- b1 Χρήστης πελάτη 1 «Πλήρης» · b2 Χρήστης πελάτη 2 «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@client-two.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'), ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Ένα', 'Μαρία Παπαδάκη', 'one@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Δύο', 'Νίκος Κίνης', 'two@example.com', '00000000-0000-0000-0000-0000000000a1');
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select x.client_id::uuid, x.user_id::uuid, x.name, r.id, true
  from (values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας'),
               ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', 'Πάνος')) as x (client_id, user_id, name)
  join public.roles r on r.name = 'Πλήρης' and r.kind = 'client';

-- ───────────── Βοηθητικά (ως postgres, ποτέ ως authenticated) ─────────────
create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

create function public.t_auto(p_type text, p_channel text, p_relative text) returns uuid
language sql
as $$
  select a.id from public.automations a
   where a.event_type = p_type and a.channel = p_channel and a.recipient_relative = p_relative and a.is_initial limit 1;
$$;

create function public.t_events(p_type text) returns integer
language sql
as $$ select count(*)::integer from public.events e where e.type = p_type; $$;

create function public.t_ids(p jsonb) returns text[]
language sql
as $$ select coalesce(array_agg(i ->> 'id' order by i ->> 'id'), '{}') from jsonb_array_elements(p -> 'items') i; $$;

create function public.t_keys(p jsonb) returns text[]
language sql
as $$ select array_agg(distinct k order by k) from jsonb_array_elements(p -> 'items') i cross join lateral jsonb_object_keys(i) k; $$;

-- ───────────── Αποστολές ─────────────
-- Ειδοποίηση στον b1 (Νέο Μήνυμα), email στον b1 που θα αποτύχει (νέα Έκδοση), Ειδοποίηση στην a1 για τον Πελάτη 1,
-- δοκιμαστικό email στην a1, σύνδεσμος εισόδου στον b1 (μόνο στο email_log).
insert into public.notifications (id, user_id, client_id, title, body, link)
values ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1',
        'Μυστικός τίτλος', 'Μυστικό κείμενο', '/app/messages');
insert into public.automation_sends (automation_id, case_key, recipient_key, channel, notification_id, client_id, created_at)
values (public.t_auto('message.created', 'notification', 'client'), 'message.created:t1', '00000000-0000-0000-0000-0000000000b1',
        'notification', '00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000c1', timestamptz '2026-02-01 10:00+00');
insert into public.automation_sends (automation_id, case_key, recipient_key, channel, client_id, created_at)
values (public.t_auto('message.created', 'notification', 'client_owner'), 'message.created:t2', '00000000-0000-0000-0000-0000000000a1',
        'notification', '00000000-0000-0000-0000-0000000000c1', timestamptz '2026-02-01 10:01+00');
insert into public.email_outbox (id, kind, to_name, to_email, payload, attempts, created_at)
values ('00000000-0000-0000-0000-00000000ee01', 'automation', 'Κώστας', 'b1@client-one.example.gr',
        jsonb_build_object('subject', 'Μυστικό θέμα', 'body', 'Μυστικό σώμα', 'link', '/app/deliverables/secret',
                           'automationId', public.t_auto('deliverable.version_sent', 'email', 'client'),
                           'unsubscribeToken', 'tok-secret-123'),
        5, timestamptz '2026-02-01 11:00+00');
insert into public.automation_sends (automation_id, case_key, recipient_key, channel, email_outbox_id, client_id, created_at)
values (public.t_auto('deliverable.version_sent', 'email', 'client'), 'deliverable.version_sent:t3',
        '00000000-0000-0000-0000-0000000000b1', 'email', '00000000-0000-0000-0000-00000000ee01',
        '00000000-0000-0000-0000-0000000000c1', timestamptz '2026-02-01 11:00+00');
insert into public.email_outbox (id, kind, to_name, to_email, payload, status, handled_at, attempts, created_at)
values ('00000000-0000-0000-0000-00000000ee02', 'test', 'Γιώργος', 'owner@example.com', '{"secret":"κωδικός-999"}', 'sent',
        timestamptz '2026-02-01 12:00+00', 1, timestamptz '2026-02-01 12:00+00');
insert into public.email_log (kind, to_email, subject, status, sent_at)
values ('magiclink', 'b1@client-one.example.gr', 'Σύνδεσμος εισόδου', 'sent', timestamptz '2026-02-01 13:00+00');

-- ───────────── Δικαιώματα ─────────────
set local role anon;
select throws_ok($$ select public.sends_list() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει το Ιστορικό');
select throws_ok($$ select public.client_sends('00000000-0000-0000-0000-0000000000c1') $$, '42501', null,
  'Ο ανώνυμος δεν βλέπει τις Αποστολές Πελάτη');
reset role;

select public.t_as('a1');
set local role authenticated;
select throws_ok($$ select * from public.job_runs $$, '42501', null, 'Ο πίνακας job_runs είναι κλειστός');
select throws_ok($$ select public.job_run_mark('outbox', true) $$, '42501', null, 'Ο Ιδιοκτήτης (authenticated) δεν γράφει job_runs');
select throws_ok($$ select public.health_check('outbox') $$, '42501', null, 'Ο έλεγχος Υγείας τρέχει μόνο με service_role');
select throws_ok($$ select public.sends_cleanup() $$, '42501', null, 'Ο καθαρισμός τρέχει μόνο με service_role');
reset role;

select public.t_as('b1');
select throws_ok($$ select public.sends_list() $$, '42501', null, 'Ο πελάτης δεν βλέπει το Ιστορικό');
select throws_ok($$ select public.client_sends('00000000-0000-0000-0000-0000000000c1') $$, '42501', null,
  'Ο πελάτης δεν βλέπει τις Αποστολές του Πελάτη του');
select public.t_as('a2');
select throws_ok($$ select public.sends_list() $$, '42501', null, 'Χωρίς automations.manage ή health.view: 42501');
select public.t_as('a3');
select throws_ok($$ select public.sends_list() $$, '42501', null, 'Ο Υπεύθυνος Πελάτη χωρίς Δικαίωμα δεν βλέπει το K3');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-00000000ee01') $$, '42501', null,
  'Χωρίς automations.manage δεν ξαναστέλνει');
select throws_ok($$ select public.client_sends('00000000-0000-0000-0000-0000000000c2') $$, '42501', null,
  'Πελάτης που δεν βλέπει: 42501');
select throws_ok($$ select public.client_sends('00000000-0000-0000-0000-0000000000c9') $$, '42501', null,
  'Ανύπαρκτος Πελάτης: 42501 με το ίδιο μήνυμα');
select is(public.t_ids(public.client_sends('00000000-0000-0000-0000-0000000000c1')),
  array['a' || (select min(s.id) from public.automation_sends s where s.case_key = 'message.created:t1'),
        'a' || (select min(s.id) from public.automation_sends s where s.case_key = 'deliverable.version_sent:t3'),
        'l' || (select l.id from public.email_log l where l.kind = 'magiclink')]::text[],
  'Ο Υπεύθυνος βλέπει τις Αποστολές του Πελάτη του: μόνο προς Χρήστες του Πελάτη');

-- ───────────── Αποστολή απέτυχε οριστικά (51) ─────────────
select public.email_outbox_done('00000000-0000-0000-0000-00000000ee01', false, 'Μυστικό θέμα', 'Ο πάροχος απέρριψε τη διεύθυνση');
select is((select status from public.email_outbox where id = '00000000-0000-0000-0000-00000000ee01'), 'failed',
  'Πέμπτη αποτυχία: failed');
select is(public.t_events('health.send_failed'), 1, 'Η οριστική αποτυχία γράφει το Γεγονός 51');
select ok((select e.payload ->> 'job' = 'Νέα Έκδοση προς έγκριση προς Κώστας' from public.events e where e.type = 'health.send_failed'),
  'Το Γεγονός λέει τι απέτυχε και σε ποιον');
select public.events_process(100, timestamptz '2026-02-01 11:05+00');
select is((select count(*)::integer from public.notifications n join public.automations a on a.id = n.automation_id
            where a.event_type = 'health.send_failed' and n.user_id = '00000000-0000-0000-0000-0000000000a1'), 1,
  'Ειδοποίηση Υγείας στον Ιδιοκτήτη (health.view)');
select is((select count(*)::integer from public.notifications n join public.automations a on a.id = n.automation_id
            where a.event_type = 'health.send_failed' and n.user_id in ('00000000-0000-0000-0000-0000000000a2',
                                                                         '00000000-0000-0000-0000-0000000000a3')), 0,
  'Όχι σε όσους δεν έχουν health.view');

-- Χωρίς βρόχο: αποτυχία email Αυτοματισμού Υγείας δεν γράφει νέο Γεγονός Υγείας.
insert into public.automations (id, event_type, channel, recipient_kind, recipient_permission, subject_el, body_el)
values ('00000000-0000-0000-0000-00000000ab01', 'health.send_failed', 'email', 'permission', 'health.view', 'Υγεία', '{error}');
insert into public.email_outbox (id, kind, to_name, to_email, payload, attempts)
values ('00000000-0000-0000-0000-00000000ee03', 'automation', 'Γιώργος', 'owner@example.com',
        '{"subject":"Υγεία","body":"x","automationId":"00000000-0000-0000-0000-00000000ab01"}', 5);
select public.email_outbox_done('00000000-0000-0000-0000-00000000ee03', false, 'Υγεία', 'Πάλι λάθος');
select is(public.t_events('health.send_failed'), 1, 'Αποτυχία email Υγείας: κανένα νέο Γεγονός Υγείας');

-- ───────────── K3 ─────────────
select public.t_as('a1');
select is(public.t_ids(public.sends_list('sent', null, '00000000-0000-0000-0000-0000000000c1')),
  array['a' || (select min(s.id) from public.automation_sends s where s.case_key = 'message.created:t1'),
        'a' || (select min(s.id) from public.automation_sends s where s.case_key = 'message.created:t2'),
        'a' || (select min(s.id) from public.automation_sends s where s.case_key = 'deliverable.version_sent:t3'),
        'l' || (select l.id from public.email_log l where l.kind = 'magiclink')]::text[],
  'Στάλθηκαν, Πελάτης 1: οι τρεις αποστολές Αυτοματισμών και ο σύνδεσμος εισόδου');
select is(public.t_keys(public.sends_list('sent')),
  array['at', 'attempts', 'channel', 'clientId', 'clientName', 'eventLabel', 'eventType', 'id', 'isRetried', 'kind', 'reason',
        'recipientCount', 'recipientEmail', 'recipientName', 'retryRef', 'source', 'state'],
  'Κάθε γραμμή έχει μόνο αυτά τα κλειδιά: κανένα payload, link ή κωδικός');
select ok(position('Μυστικ' in public.sends_list('sent')::text) = 0 and position('tok-secret' in public.sends_list('sent')::text) = 0
          and position('/app/deliverables/secret' in public.sends_list('sent')::text) = 0
          and position('κωδικός-999' in public.sends_list('sent')::text) = 0,
  'Ούτε θέμα, κείμενο, link, token ή κωδικός στις τιμές');
select is((select i ->> 'state' || ' ' || (i ->> 'attempts') || ' ' || (i ->> 'reason') || ' ' || (i ->> 'recipientEmail')
             from jsonb_array_elements(public.sends_list('failed', null, '00000000-0000-0000-0000-0000000000c1') -> 'items') i),
  'failed 5 Ο πάροχος απέρριψε τη διεύθυνση b1@client-one.example.gr',
  'Απέτυχαν: κατάσταση, προσπάθειες, λόγος και email του παραλήπτη');
select is((public.sends_list('failed') ->> 'failed')::integer, 2, 'Το «Απέτυχαν (N)» μετρά όλα τα αποτυχημένα');
select is(jsonb_array_length(public.sends_list('sent', 'notification', '00000000-0000-0000-0000-0000000000c1') -> 'items'), 2,
  'Φίλτρο καναλιού: μόνο Ειδοποιήσεις');
select is((select i ->> 'state' || ' ' || (i ->> 'reason') from jsonb_array_elements(public.sends_list('sent', 'notification') -> 'items') i
            where i ->> 'recipientName' = 'Γιώργος' and i ->> 'eventType' = 'message.created'),
  'not_sent Το είχε ήδη λάβει', 'Σημάδι χωρίς Ειδοποίηση: δεν στάλθηκε');
select is((select i ->> 'recipientEmail' from jsonb_array_elements(public.sends_list('sent', 'notification') -> 'items') i
            where i ->> 'recipientName' = 'Κώστας'), null::text, 'Email παραλήπτη μόνο για email');
select is(public.sends_list('sent') -> 'clients', '[{"id":"00000000-0000-0000-0000-0000000000c1","name":"Πελάτης Ένα"}]'::jsonb,
  'Το φίλτρο Πελάτη έχει όσους έχουν αποστολές');
select throws_ok($$ select public.sends_list('other') $$, 'P0001', null, 'Άγνωστη καρτέλα: P0001');

-- ───────────── Ξαναστείλε ─────────────
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-00000000ee02') $$, 'P0001', null,
  'Μόνο αποτυχημένο email ξαναστέλνεται');
select lives_ok($$ select public.send_retry('00000000-0000-0000-0000-00000000ee01') $$, 'Ο Ιδιοκτήτης ξαναστέλνει το αποτυχημένο');
select is((select count(*)::integer from public.email_outbox o where o.retry_of = '00000000-0000-0000-0000-00000000ee01'
             and o.status = 'pending' and o.payload ->> 'subject' = 'Μυστικό θέμα'), 1, 'Μία νέα γραμμή με το ίδιο payload');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-00000000ee01') $$, 'P0001', null, 'Δεύτερο «Ξαναστείλε»: P0001');
select is((select (i ->> 'isRetried') || ' ' || coalesce(i ->> 'retryRef', '—')
             from jsonb_array_elements(public.sends_list('failed', 'email', '00000000-0000-0000-0000-0000000000c1') -> 'items') i),
  'true —', 'Μετά το «Ξαναστείλε» η γραμμή δεν ξαναστέλνεται');
select is((select count(*)::integer from jsonb_array_elements(public.sends_list('scheduled', null, null, null, null, 50,
             timestamptz '2026-02-02 00:00+00') -> 'items') i
            where i ->> 'state' = 'scheduled' and i ->> 'source' = 'automation' and i ->> 'eventType' = 'deliverable.version_sent'), 1,
  'Η νέα γραμμή περιμένει στα Προγραμματισμένα');

-- ───────────── Εργασία δεν έτρεξε (50) ─────────────
select public.job_run_mark('google', null, null, timestamptz '2026-03-01 09:59+00');
select public.job_run_mark('google', true, null, timestamptz '2026-03-01 10:00+00');
select is(public.health_check('outbox', timestamptz '2026-03-01 10:05+00') ->> 'jobs', '0', 'Στα 5 λεπτά: τίποτα');
select is(public.health_check('google', timestamptz '2026-03-01 10:30+00') ->> 'jobs', '0', 'Κανένα cron δεν ελέγχει τον εαυτό του');
select is(public.health_check('outbox', timestamptz '2026-03-01 10:11+00') ->> 'jobs', '1', 'Στα 11 λεπτά: Γεγονός 50');
select is(public.health_check('outbox', timestamptz '2026-03-01 10:20+00') ->> 'jobs', '0', 'Ίδιο πρόβλημα: μία φορά');
select is((select e.payload ->> 'job' from public.events e where e.type = 'health.job_missed'), 'Συγχρονισμός Google',
  'Το Γεγονός λέει ποια εργασία');

-- ───────────── Συγχρονισμός Google σταμάτησε (52) ─────────────
update public.google_calendar set calendar_id = 'cal@example.com', last_sync_at = timestamptz '2026-03-01 09:00+00', last_error = null
 where id;
select is(public.health_check('outbox', timestamptz '2026-03-01 09:20+00') ->> 'google', '0', 'Συγχρονισμός πριν από 20′: εντάξει');
select is(public.health_check('outbox', timestamptz '2026-03-01 09:31+00') ->> 'google', '1', 'Πάνω από 30′: Γεγονός 52');
select is(public.health_check('outbox', timestamptz '2026-03-01 09:40+00') ->> 'google', '0', 'Ίδιο επεισόδιο: μία φορά');

-- ───────────── Γεγονός κόλλησε (53) ─────────────
insert into public.events (type, entity, case_key, payload, occurred_at)
values ('message.created', 'messages', 'message.created:stuck', '{}', timestamptz '2026-03-01 09:00+00'),
       ('health.job_missed', 'job_runs', 'health.job_missed:old', '{}', timestamptz '2026-03-01 09:00+00');
select is(public.health_check('outbox', timestamptz '2026-03-01 09:16+00') ->> 'events', '1',
  'Ανεπεξέργαστο πάνω από 15′: ένα Γεγονός 53 (όχι για το Γεγονός Υγείας)');
select is(public.health_check('outbox', timestamptz '2026-03-01 09:30+00') ->> 'events', '0', 'Μία φορά ανά Γεγονός');

-- ───────────── Διατήρηση 12 μηνών ─────────────
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path) values
  ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'T-1',
   date '2024-12-01', date '2024-12-15', 500, 0, 500, 'invoices/t-1.pdf');
insert into public.automation_sends (automation_id, case_key, recipient_key, channel, created_at) values
  (public.t_auto('message.created', 'notification', 'client'), 'message.created:old', '00000000-0000-0000-0000-0000000000b1',
   'notification', timestamptz '2025-01-01 10:00+00'),
  (public.t_auto('invoice.overdue', 'email', 'client'), 'invoice.overdue:00000000-0000-0000-0000-0000000000bb:20241214T220000',
   '00000000-0000-0000-0000-0000000000b1', 'email', timestamptz '2025-01-01 10:00+00');
insert into public.email_log (kind, to_email, subject, status, sent_at)
values ('magiclink', 'b1@client-one.example.gr', 'Παλιός σύνδεσμος', 'sent', timestamptz '2025-01-01 10:00+00');
insert into public.email_outbox (kind, to_email, status, handled_at, created_at)
values ('test', 'owner@example.com', 'sent', timestamptz '2025-01-01 10:00+00', timestamptz '2025-01-01 10:00+00');
select is(public.sends_cleanup(timestamptz '2026-03-01 10:00+00'), '{"sends": 1, "logs": 1, "outbox": 1}'::jsonb,
  'Σβήνονται τα παλαιότερα από 12 μήνες');
select ok(exists (select 1 from public.automation_sends s where s.case_key like 'invoice.overdue:00000000-0000-0000-0000-0000000000bb:%'),
  'Μένει το σημάδι του ληξιπρόθεσμου Τιμολογίου με υπόλοιπο');
select is((select count(*)::integer from public.automation_sends s where s.created_at >= timestamptz '2026-01-01'), 4,
  'Οι πρόσφατες αποστολές μένουν');

select * from finish();
rollback;
