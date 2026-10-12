-- Ειδοποιήσεις Kε #174: Ιστορικό αποστολών (K3, καρτέλα Πελάτη), «Ξαναστείλε», Γεγονότα Υγείας 50–53, διατήρηση 12 μηνών.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι έλεγχοι Υγείας και ο καθαρισμός παίρνουν σταθερό p_now.
begin;
select plan(74);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Παραγωγή (χωρίς Δικαίωμα) · a3 Πωλήσεις (Υπεύθυνος Πελάτη 1) · a4 μόνο «Διαχειρίζεται Αυτοματισμούς»
-- a5 Ιδιοκτήτης απενεργοποιημένος · b1 Πελάτη 1 · b2 Πελάτη 2 · b3 Πελάτη 1 αφαιρεμένος · b4 και στους δύο Πελάτες
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'automations@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'old@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@client-two.example.gr'),
  ('00000000-0000-0000-0000-0000000000b3', 'b3@client-one.example.gr'),
  ('00000000-0000-0000-0000-0000000000b4', 'b4@both.example.gr');
insert into public.team_users (user_id, name, email, is_active, deactivated_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'production@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a4', 'Νίκος', 'automations@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a5', 'Σοφία', 'old@example.com', false, now());
insert into public.roles (name, description, kind, is_owner, is_builtin)
values ('Μόνο Αυτοματισμοί (τεστ)', 'Τεστ: μόνο «Διαχειρίζεται Αυτοματισμούς».', 'team', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'automations.manage', 'all' from public.roles r where r.name = 'Μόνο Αυτοματισμοί (τεστ)';
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'), ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'), ('00000000-0000-0000-0000-0000000000a4', 'Μόνο Αυτοματισμοί (τεστ)'),
               ('00000000-0000-0000-0000-0000000000a5', 'Ιδιοκτήτης')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Ένα', 'Μαρία Παπαδάκη', 'one@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Δύο', 'Νίκος Κίνης', 'two@example.com', '00000000-0000-0000-0000-0000000000a1');
insert into public.client_users (client_id, user_id, name, role_id, is_current, removed_at)
select x.client_id::uuid, x.user_id::uuid, x.name, r.id, x.is_current, x.removed_at
  from (values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', true, null::timestamptz),
               ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', 'Πάνος', true, null),
               ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b3', 'Στέλιος', false, now()),
               ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b4', 'Λένα', true, null),
               ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b4', 'Λένα', false, null))
       as x (client_id, user_id, name, is_current, removed_at)
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

create function public.t_uid(p_last text) returns uuid
language sql immutable
as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;

create function public.t_auto(p_type text, p_channel text, p_relative text) returns uuid
language sql
as $$
  select a.id from public.automations a
   where a.event_type = p_type and a.channel = p_channel and a.recipient_relative = p_relative and a.is_initial limit 1;
$$;

create function public.t_events(p_like text) returns integer
language sql
as $$ select count(*)::integer from public.events e where e.case_key like p_like; $$;

create function public.t_ids(p jsonb) returns text[]
language sql
as $$ select coalesce(array_agg(i ->> 'id' order by i ->> 'id'), '{}') from jsonb_array_elements(p -> 'items') i; $$;

create function public.t_sorted(p text[]) returns text[]
language sql
as $$ select array_agg(x order by x) from unnest(p) x; $$;

create function public.t_keys(p jsonb) returns text[]
language sql
as $$ select array_agg(distinct k order by k) from jsonb_array_elements(p -> 'items') i cross join lateral jsonb_object_keys(i) k; $$;

create function public.t_ref(p_case text) returns text
language sql
as $$ select 'a' || lpad(min(s.id)::text, 19, '0') from public.automation_sends s where s.case_key = p_case; $$;

create function public.t_log(p_email text) returns text
language sql
as $$ select 'l' || min(l.id::text) from public.email_log l where l.to_email = p_email and l.kind = 'magiclink'; $$;

-- Ένα email που απέτυχε (και το σημάδι του, όταν είναι Αυτοματισμού).
create function public.t_failed(p_id text, p_kind text, p_auto uuid, p_last text, p_client uuid, p_case text) returns void
language plpgsql
as $$
declare
  v_id uuid := ('00000000-0000-0000-0000-0000000000' || p_id)::uuid;
begin
  insert into public.email_outbox (id, kind, to_name, to_email, payload, status, attempts, last_error, handled_at, created_at)
  values (v_id, p_kind, 'Παραλήπτης', (select u.email from auth.users u where u.id = public.t_uid(p_last)),
          case when p_auto is null then '{}'::jsonb else jsonb_build_object('subject', 'x', 'body', 'x', 'automationId', p_auto) end,
          'failed', 5, 'Bounce', timestamptz '2026-01-15 10:00+00', timestamptz '2026-01-15 10:00+00');
  if p_auto is not null then
    insert into public.automation_sends (automation_id, case_key, recipient_key, channel, email_outbox_id, client_id, created_at)
    values (p_auto, p_case, public.t_uid(p_last)::text, 'email', v_id, p_client, timestamptz '2026-01-15 10:00+00');
  end if;
end;
$$;

-- ───────────── Αποστολές ─────────────
-- Ειδοποίηση στον b1 (Νέο Μήνυμα), email στον b1 που θα αποτύχει (νέα Έκδοση), Ειδοποίηση στην a1 για τον Πελάτη 1,
-- δοκιμαστικό email στην a1, σύνδεσμος εισόδου στον b1 και στον b4 (μόνο στο email_log), Ειδοποίηση στον b4 για τον Πελάτη 2.
insert into public.notifications (id, user_id, client_id, title, body, link)
values ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1',
        'Μυστικός τίτλος', 'Μυστικό κείμενο', '/app/messages'),
       ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000c2',
        'Τίτλος', 'Κείμενο', '/app/messages');
insert into public.automation_sends (automation_id, case_key, recipient_key, channel, notification_id, client_id, created_at) values
  (public.t_auto('message.created', 'notification', 'client'), 'message.created:t1', '00000000-0000-0000-0000-0000000000b1',
   'notification', '00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000c1', timestamptz '2026-02-01 10:00+00'),
  (public.t_auto('message.created', 'notification', 'client_owner'), 'message.created:t2', '00000000-0000-0000-0000-0000000000a1',
   'notification', null, '00000000-0000-0000-0000-0000000000c1', timestamptz '2026-02-01 10:01+00'),
  (public.t_auto('message.created', 'notification', 'client'), 'message.created:t4', '00000000-0000-0000-0000-0000000000b4',
   'notification', '00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-0000000000c2', timestamptz '2026-02-01 10:02+00');
insert into public.email_outbox (id, kind, to_name, to_email, payload, attempts, created_at)
values ('00000000-0000-0000-0000-00000000ee01', 'automation', 'Κώστας', 'b1@client-one.example.gr',
        jsonb_build_object('subject', 'Μυστικό θέμα', 'body', 'Μυστικό σώμα 1.234,50 €', 'link', '/app/deliverables/secret',
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
insert into public.email_log (kind, to_email, subject, status, sent_at) values
  ('magiclink', 'b1@client-one.example.gr', 'Σύνδεσμος εισόδου', 'sent', timestamptz '2026-02-01 13:00+00'),
  ('magiclink', 'b4@both.example.gr', 'Σύνδεσμος εισόδου', 'sent', timestamptz '2026-02-01 13:01+00');

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
  public.t_sorted(array[public.t_ref('message.created:t1'), public.t_ref('deliverable.version_sent:t3'),
                        public.t_log('b1@client-one.example.gr')]),
  'Ο Υπεύθυνος βλέπει μόνο ό,τι πήγε σε Χρήστες του Πελάτη· όχι του Χρήστη δύο Πελατών χωρίς Πελάτη ή για τον άλλο Πελάτη');
select is(public.t_keys(public.client_sends('00000000-0000-0000-0000-0000000000c1')),
  array['at', 'channel', 'eventLabel', 'eventType', 'id', 'kind', 'recipientName', 'source', 'state'],
  'Η καρτέλα του Πελάτη έχει μόνο Πότε / Τι / Παραλήπτη / Κατάσταση');

-- ───────────── Αποστολή απέτυχε οριστικά (51) ─────────────
select public.email_outbox_done('00000000-0000-0000-0000-00000000ee01', false, 'Μυστικό θέμα', 'Ο πάροχος απέρριψε τη διεύθυνση');
select is((select status from public.email_outbox where id = '00000000-0000-0000-0000-00000000ee01'), 'failed',
  'Πέμπτη αποτυχία: failed');
select is(public.t_events('health.send_failed:%'), 1, 'Η οριστική αποτυχία γράφει το Γεγονός 51');
select is((select e.payload ->> 'job' from public.events e where e.type = 'health.send_failed'), 'Νέα Έκδοση προς έγκριση',
  'Το 51 λέει μόνο την ετικέτα του Γεγονότος');
select ok((select bool_and(l.via_outbox) from public.email_log l where l.kind = 'automation'),
  'Η γραμμή του email_log από την ουρά σημειώνεται via_outbox');
select public.events_process(100, timestamptz '2026-02-01 11:05+00');
select is((select count(*)::integer from public.notifications n join public.automations a on a.id = n.automation_id
            where a.event_type = 'health.send_failed' and n.user_id = '00000000-0000-0000-0000-0000000000a1'), 1,
  'Ειδοποίηση Υγείας στον Ιδιοκτήτη (health.view)');
select is((select count(*)::integer from public.notifications n join public.automations a on a.id = n.automation_id
            where a.event_type = 'health.send_failed' and n.user_id in ('00000000-0000-0000-0000-0000000000a2',
                                                                         '00000000-0000-0000-0000-0000000000a5')), 0,
  'Όχι σε όσους δεν έχουν health.view, όχι σε ανενεργό');

-- Χωρίς βρόχο: αποτυχία email Αυτοματισμού Υγείας δεν γράφει νέο Γεγονός Υγείας.
insert into public.automations (id, event_type, channel, recipient_kind, recipient_permission, subject_el, body_el)
values ('00000000-0000-0000-0000-00000000ab01', 'health.send_failed', 'email', 'permission', 'health.view', 'Υγεία', '{error}');
insert into public.email_outbox (id, kind, to_name, to_email, payload, attempts)
values ('00000000-0000-0000-0000-00000000ee03', 'automation', 'Γιώργος', 'owner@example.com',
        '{"subject":"Υγεία","body":"x","automationId":"00000000-0000-0000-0000-00000000ab01"}', 5);
select public.email_outbox_done('00000000-0000-0000-0000-00000000ee03', false, 'Υγεία', 'Πάλι λάθος');
select is(public.t_events('health.send_failed:%'), 1, 'Αποτυχία email Υγείας: κανένα νέο Γεγονός Υγείας');

-- ───────────── K3 ─────────────
select public.t_as('a1');
select is(public.t_ids(public.sends_list('sent', null, '00000000-0000-0000-0000-0000000000c1')),
  public.t_sorted(array[public.t_ref('message.created:t1'), public.t_ref('message.created:t2'),
                        public.t_ref('deliverable.version_sent:t3'), public.t_log('b1@client-one.example.gr'),
                        public.t_log('b4@both.example.gr')]),
  'Στάλθηκαν, Πελάτης 1: οι αποστολές Αυτοματισμών και οι σύνδεσμοι εισόδου των Χρηστών του');
select is(public.t_keys(public.sends_list('sent')),
  array['at', 'attempts', 'channel', 'clientId', 'clientName', 'eventLabel', 'eventType', 'id', 'isRetried', 'kind', 'reason',
        'recipientCount', 'recipientEmail', 'recipientName', 'retryRef', 'source', 'state'],
  'Κάθε γραμμή έχει μόνο αυτά τα κλειδιά: κανένα payload, link ή κωδικός');
select ok(position('Μυστικ' in public.sends_list('sent')::text) = 0 and position('tok-secret' in public.sends_list('sent')::text) = 0
          and position('/app/deliverables/secret' in public.sends_list('sent')::text) = 0
          and position('κωδικός-999' in public.sends_list('sent')::text) = 0
          and position('1.234,50' in public.sends_list('sent')::text) = 0,
  'Ούτε θέμα, κείμενο, ποσό, link, token ή κωδικός στις τιμές');
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
select is((select i ->> 'clientName' from jsonb_array_elements(public.sends_list('sent') -> 'items') i
            where i ->> 'id' = public.t_log('b1@client-one.example.gr')),
  'Πελάτης Ένα', 'Ο σύνδεσμος εισόδου δείχνει τον Πελάτη του Χρήστη');
select is(public.sends_list('sent') -> 'clients',
  '[{"id":"00000000-0000-0000-0000-0000000000c2","name":"Πελάτης Δύο"},{"id":"00000000-0000-0000-0000-0000000000c1","name":"Πελάτης Ένα"}]'::jsonb,
  'Το φίλτρο Πελάτη έχει όσους έχουν αποστολές');
select throws_ok($$ select public.sends_list('other') $$, 'P0001', null, 'Άγνωστη καρτέλα: P0001');

-- Μόνο «Διαχειρίζεται Αυτοματισμούς», χωρίς να βλέπει Πελάτες: ούτε γραμμές Πελατών ούτε Μηνύματα συστήματος.
select public.t_as('a4');
select ok(not (public.t_ids(public.sends_list('sent')) && array[public.t_ref('message.created:t1'), public.t_ref('message.created:t2'),
                 public.t_log('b1@client-one.example.gr'), 'o00000000-0000-0000-0000-00000000ee02']),
  'Χωρίς ορατό Πελάτη και χωρίς health.view: καμία γραμμή Πελάτη, κανένα Μήνυμα συστήματος');
select is(public.sends_list('sent') -> 'clients', '[]'::jsonb, 'Το φίλτρο Πελάτη έχει μόνο ορατούς Πελάτες');
select ok(public.t_ids(public.sends_list('sent')) @> array['o00000000-0000-0000-0000-00000000ee03'],
  'Τα email Αυτοματισμών προς την ομάδα φαίνονται');

-- ───────────── Ξαναστείλε ─────────────
select public.t_as('a1');
insert into public.automations (id, event_type, channel, recipient_kind, recipient_relative, subject_el, body_el, is_enabled)
values ('00000000-0000-0000-0000-00000000ab02', 'filming.cancelled', 'email', 'relative', 'client', 'Ακύρωση', 'x', false),
       ('00000000-0000-0000-0000-00000000ab03', 'filming.rescheduled', 'email', 'relative', 'client', 'Μετάθεση', 'x', true);
insert into public.automation_optouts (user_id, automation_id)
values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000ab03');
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path, voided_at, void_reason) values
  ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'T-1',
   date '2024-12-01', date '2024-12-15', 500, 0, 500, 'invoices/t-1.pdf', null, null),
  ('00000000-0000-0000-0000-0000000000bc', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'T-2',
   date '2025-12-01', date '2025-12-15', 200, 0, 200, 'invoices/t-2.pdf', now(), 'Λάθος'),
  ('00000000-0000-0000-0000-0000000000bd', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'T-3',
   date '2025-12-01', date '2025-12-15', 300, 0, 300, 'invoices/t-3.pdf', null, null);
insert into public.invoices (id, client_id, kind, number, issue_date, net, vat, total, pdf_path, credit_for) values
  ('00000000-0000-0000-0000-0000000000be', '00000000-0000-0000-0000-0000000000c1', 'credit', 'Π-1',
   date '2025-12-20', 300, 0, 300, 'invoices/p-1.pdf', '00000000-0000-0000-0000-0000000000bd');
select public.t_failed('f1', 'invite_resend', null, 'b1', null, null);
select public.t_failed('f2', 'client_added', null, 'b1', null, null);
select public.t_failed('f3', 'automation', '00000000-0000-0000-0000-00000000ab02', 'b1', '00000000-0000-0000-0000-0000000000c1',
                       'filming.cancelled:t');
select public.t_failed('f4', 'automation', public.t_auto('filming.cancelled', 'email', 'crew'), 'a5', null, 'filming.cancelled:t5');
select public.t_failed('f5', 'automation', public.t_auto('filming.cancelled', 'email', 'client'), 'b3',
                       '00000000-0000-0000-0000-0000000000c1', 'filming.cancelled:t6');
select public.t_failed('f6', 'automation', '00000000-0000-0000-0000-00000000ab03', 'b2', '00000000-0000-0000-0000-0000000000c2',
                       'filming.rescheduled:t');
select public.t_failed('f7', 'automation', public.t_auto('invoice.registered', 'email', 'client'), 'b1',
                       '00000000-0000-0000-0000-0000000000c1', 'invoice.registered:00000000-0000-0000-0000-0000000000bc');
select public.t_failed('f8', 'automation', public.t_auto('invoice.overdue', 'email', 'client'), 'b1',
                       '00000000-0000-0000-0000-0000000000c1', 'invoice.overdue:00000000-0000-0000-0000-0000000000bd:20251214T220000');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-0000000000f1') $$, 'P0001', 'Ξαναστείλε από τις Προσκλήσεις',
  'Πρόσκληση ξανά: μόνο από τις Προσκλήσεις');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-0000000000f2') $$, 'P0001', 'Ξαναστείλε από τις Προσκλήσεις',
  'Προσθήκη σε Πελάτη: μόνο από τις Προσκλήσεις');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-0000000000f3') $$, 'P0001', 'Ο Αυτοματισμός είναι κλειστός',
  'Κλειστός Αυτοματισμός: P0001');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-0000000000f4') $$, 'P0001', 'Ο παραλήπτης δεν είναι πια ενεργός',
  'Απενεργοποιημένο μέλος της ομάδας: P0001');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-0000000000f5') $$, 'P0001', 'Ο παραλήπτης δεν είναι πια ενεργός',
  'Αφαιρεμένος Χρήστης πελάτη: P0001');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-0000000000f6') $$, 'P0001', 'Ο παραλήπτης σταμάτησε αυτά τα email',
  'Παραλήπτης με «δεν το λαμβάνω»: P0001');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-0000000000f7') $$, 'P0001', 'Το Τιμολόγιο ακυρώθηκε',
  'Ακυρωμένο Τιμολόγιο: P0001');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-0000000000f8') $$, 'P0001', 'Το Τιμολόγιο δεν έχει πια υπόλοιπο',
  'Ληξιπρόθεσμο χωρίς υπόλοιπο: P0001');
select is((select count(*)::integer from jsonb_array_elements(public.sends_list('failed', null, null, null, null, 50) -> 'items') i
            where (i ->> 'id' like 'o00000000-0000-0000-0000-0000000000f%'
                   or i ->> 'id' in (public.t_ref('filming.cancelled:t'), public.t_ref('filming.cancelled:t5'),
                                     public.t_ref('filming.cancelled:t6'), public.t_ref('filming.rescheduled:t'),
                                     public.t_ref('invoice.registered:00000000-0000-0000-0000-0000000000bc'),
                                     public.t_ref('invoice.overdue:00000000-0000-0000-0000-0000000000bd:20251214T220000')))
              and i ->> 'retryRef' is not null), 0,
  'Το «Ξαναστείλε» δεν προσφέρεται όπου δεν επιτρέπεται');
select is((select count(*)::integer from jsonb_array_elements(public.sends_list('failed', null, null, null, null, 50) -> 'items') i
            where i ->> 'id' like 'o00000000-0000-0000-0000-0000000000f%'
               or i ->> 'id' in (public.t_ref('filming.cancelled:t'), public.t_ref('filming.cancelled:t5'),
                                 public.t_ref('filming.cancelled:t6'), public.t_ref('filming.rescheduled:t'),
                                 public.t_ref('invoice.registered:00000000-0000-0000-0000-0000000000bc'),
                                 public.t_ref('invoice.overdue:00000000-0000-0000-0000-0000000000bd:20251214T220000'))), 8,
  'Οι οκτώ αποτυχημένες φαίνονται στα Απέτυχαν');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-00000000ee02') $$, 'P0001', null,
  'Μόνο αποτυχημένο email ξαναστέλνεται');
select is((select i ->> 'retryRef' from jsonb_array_elements(public.sends_list('failed', 'email', '00000000-0000-0000-0000-0000000000c1') -> 'items') i
            where i ->> 'id' = public.t_ref('deliverable.version_sent:t3')), '00000000-0000-0000-0000-00000000ee01',
  'Το επιτρεπτό αποτυχημένο email έχει «Ξαναστείλε»');
select lives_ok($$ select public.send_retry('00000000-0000-0000-0000-00000000ee01') $$, 'Ο Ιδιοκτήτης ξαναστέλνει το αποτυχημένο');
select is((select count(*)::integer from public.email_outbox o where o.retry_of = '00000000-0000-0000-0000-00000000ee01'
             and o.status = 'pending' and o.payload ->> 'subject' = 'Μυστικό θέμα'), 1, 'Μία νέα γραμμή με το ίδιο payload');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-00000000ee01') $$, 'P0001', 'Αυτό το email ξαναστάλθηκε ήδη μία φορά',
  'Δεύτερο «Ξαναστείλε»: P0001');
select is((select (i ->> 'isRetried') || ' ' || coalesce(i ->> 'retryRef', '—')
             from jsonb_array_elements(public.sends_list('failed', 'email', '00000000-0000-0000-0000-0000000000c1') -> 'items') i
            where i ->> 'id' = public.t_ref('deliverable.version_sent:t3')),
  'true —', 'Μετά το «Ξαναστείλε» η γραμμή δεν ξαναστέλνεται');
select is((select count(*)::integer from jsonb_array_elements(public.sends_list('scheduled', null, null, null, null, 50,
             timestamptz '2026-02-02 00:00+00') -> 'items') i
            where i ->> 'state' = 'scheduled' and i ->> 'eventType' = 'deliverable.version_sent'
              and i ->> 'clientName' = 'Πελάτης Ένα'), 1,
  'Η νέα γραμμή περιμένει στα Προγραμματισμένα, με τον Πελάτη της αρχικής αποστολής');
update public.email_outbox set status = 'failed', handled_at = now(), attempts = 5
 where retry_of = '00000000-0000-0000-0000-00000000ee01';
select is((select count(*)::integer from jsonb_array_elements(public.sends_list('failed', 'email', '00000000-0000-0000-0000-0000000000c1') -> 'items') i
            where i ->> 'id' = (select 'o' || o.id::text from public.email_outbox o where o.retry_of = '00000000-0000-0000-0000-00000000ee01')
              and i ->> 'retryRef' is null), 1,
  'Η ίδια η επανάληψη, αν αποτύχει, δεν ξαναστέλνεται');

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
update public.google_calendar set calendar_id = 'cal@example.com', last_sync_at = timestamptz '2026-03-01 09:10+00' where id;
update public.google_calendar set last_error = 'Στιγμιαίο σφάλμα' where id;
select ok((select error_since is not null from public.google_calendar where id), 'Το σφάλμα κρατά από πότε ξεκίνησε');
select is(public.health_check('outbox', timestamptz '2026-03-01 09:20+00') ->> 'google', '0',
  'Στιγμιαίο σφάλμα με πρόσφατο συγχρονισμό: τίποτα');
update public.google_calendar set error_since = timestamptz '2026-02-27 09:00+00' where id;
select is(public.health_check('outbox', timestamptz '2026-03-01 09:20+00') ->> 'google', '1', 'Σφάλμα πάνω από 30′: Γεγονός 52');
select is(public.health_check('outbox', timestamptz '2026-03-01 09:50+00') ->> 'google', '0',
  'Ίδιο επεισόδιο (μέρα έναρξης): μία φορά, ακόμα κι αν μένει πίσω και ο συγχρονισμός');
update public.google_calendar set last_error = null where id;
select is(public.health_check('outbox', timestamptz '2026-03-02 09:00+00') ->> 'google', '1',
  'Χωρίς σφάλμα αλλά συγχρονισμός πάνω από 30′ πίσω: νέο επεισόδιο');

-- ───────────── Γεγονός κόλλησε (53) ─────────────
insert into public.events (type, entity, case_key, payload, occurred_at)
values ('message.created', 'messages', 'message.created:stuck', '{}', timestamptz '2026-03-03 09:00+00'),
       ('health.job_missed', 'job_runs', 'health.job_missed:old', '{}', timestamptz '2026-03-03 09:00+00');
select public.job_run_mark('outbox', true, null, timestamptz '2026-03-03 08:00+00');
select is(public.health_check('google', timestamptz '2026-03-03 09:30+00') ->> 'events', '0',
  'Ανεπεξέργαστα, αλλά η εργασία outbox είναι ήδη πίσω: το λέει το 50, όχι το 53');
select public.job_run_mark('outbox', true, null, timestamptz '2026-03-03 09:29+00');
select is(public.health_check('google', timestamptz '2026-03-03 09:30+00') ->> 'events', '1',
  'Ανεπεξέργαστα πάνω από 15′: μία περίπτωση της μέρας');
select ok((select e.payload ->> 'job' like '1 ανεπεξέργαστα%' from public.events e where e.case_key = 'health.event_stuck:day:20260303'),
  'Με το πλήθος, χωρίς το Γεγονός Υγείας');
select is(public.health_check('google', timestamptz '2026-03-03 09:40+00') ->> 'events', '0', 'Μία φορά τη μέρα');
update public.events set attempts = 5 where case_key in ('message.created:stuck', 'health.job_missed:old');
select is(public.health_check('google', timestamptz '2026-03-03 09:41+00') ->> 'events', '1',
  '5 προσπάθειες: ένα Γεγονός 53 για το Γεγονός (όχι για το Γεγονός Υγείας)');
select is(public.health_check('google', timestamptz '2026-03-03 09:50+00') ->> 'events', '0', 'Μία φορά ανά Γεγονός');

-- ───────────── Διατήρηση 12 μηνών, μία φορά τη μέρα ─────────────
insert into public.automation_sends (automation_id, case_key, recipient_key, channel, created_at) values
  (public.t_auto('message.created', 'notification', 'client'), 'message.created:old', '00000000-0000-0000-0000-0000000000b1',
   'notification', timestamptz '2025-01-01 10:00+00'),
  (public.t_auto('invoice.overdue', 'email', 'client'), 'invoice.overdue:00000000-0000-0000-0000-0000000000bb:20241214T220000',
   '00000000-0000-0000-0000-0000000000b1', 'email', timestamptz '2025-01-01 10:00+00');
insert into public.email_log (kind, to_email, subject, status, sent_at)
values ('magiclink', 'b1@client-one.example.gr', 'Παλιός σύνδεσμος', 'sent', timestamptz '2025-01-01 10:00+00');
insert into public.email_outbox (kind, to_email, status, handled_at, created_at)
values ('test', 'owner@example.com', 'sent', timestamptz '2025-01-01 10:00+00', timestamptz '2025-01-01 10:00+00');
select is(public.sends_cleanup(timestamptz '2026-03-04 10:00+00'), '{"skipped": true}'::jsonb, 'Εκτός 03:xx Αθήνας: τίποτα');
select is(public.sends_cleanup(timestamptz '2026-03-04 01:10+00'), '{"sends": 1, "logs": 1, "outbox": 1}'::jsonb,
  'Στις 03:10 Αθήνας σβήνονται τα παλαιότερα από 12 μήνες');
select is(public.sends_cleanup(timestamptz '2026-03-04 01:40+00'), '{"skipped": true}'::jsonb, 'Μία φορά τη μέρα');
select ok(exists (select 1 from public.automation_sends s where s.case_key like 'invoice.overdue:00000000-0000-0000-0000-0000000000bb:%'),
  'Μένει το σημάδι του ληξιπρόθεσμου Τιμολογίου με υπόλοιπο');

select * from finish();
rollback;
