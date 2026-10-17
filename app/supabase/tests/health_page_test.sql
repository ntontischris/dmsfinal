-- Υγεία Pβ #215: η σελίδα Υγείας (health_view), οι ενέργειες (Ξαναστείλε, Αγνόησε, Ξαναδοκίμασε), ο κατάλογος εργασιών με
-- όριο ανά εργασία, ο δημόσιος έλεγχος (health_ok) και η δαπάνη AI με health.view.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι εργασίες παίρνουν σταθερό p_now· οι αποστολές και τα Γεγονότα που
-- περνούν από ενέργειες γράφονται σε σχέση με το now(), ώστε το τεστ να μην εξαρτάται από τη μέρα.
begin;
select plan(85);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Διαχείριση · a3 Πωλήσεις · a4 Παραγωγή · a5 Λογιστής · a6 μόνο «Βλέπει Υγεία συστήματος»
-- b1 Χρήστης πελάτη «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'health@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Δημήτρης', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Ρένα', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'Λίνα', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'Ελένη', 'health@example.com');
insert into public.roles (name, description, kind, is_owner, is_builtin)
values ('Μόνο Υγεία (τεστ)', 'Τεστ: μόνο «Βλέπει Υγεία συστήματος».', 'team', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'health.view', 'all' from public.roles r where r.name = 'Μόνο Υγεία (τεστ)';
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'), ('00000000-0000-0000-0000-0000000000a2', 'Διαχείριση'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'), ('00000000-0000-0000-0000-0000000000a4', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a5', 'Λογιστής'), ('00000000-0000-0000-0000-0000000000a6', 'Μόνο Υγεία (τεστ)'))
       as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Ένα', 'Μαρία Παπαδάκη', 'one@example.com', '00000000-0000-0000-0000-0000000000a3');
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

-- Η κατάσταση μιας εργασίας στην health_view τη στιγμή p_now.
create function public.t_job(p_job text, p_now timestamptz) returns text
language sql
as $$ select j ->> 'state' from jsonb_array_elements(public.health_view(p_now) -> 'jobs') j where j ->> 'job' = p_job; $$;

create function public.t_send_ids(p jsonb) returns text[]
language sql
as $$ select coalesce(array_agg(i ->> 'id' order by i ->> 'id'), '{}') from jsonb_array_elements(p -> 'sends' -> 'items') i; $$;

create function public.t_k3_state(p_tab text, p_id text) returns text
language sql
as $$
  select i ->> 'state' from jsonb_array_elements(public.sends_list(p_tab, null, null, null, null, 50) -> 'items') i
   where i ->> 'id' = p_id;
$$;

create function public.t_event_sends(p_case text) returns integer
language sql
as $$ select count(*)::integer from public.automation_sends s where s.case_key = p_case; $$;

create function public.t_event_notifications(p_case text) returns integer
language sql
as $$
  select count(*)::integer from public.notifications n join public.events e on e.id = n.event_id where e.case_key = p_case;
$$;

-- Όλα τα email των Αυτοματισμών του 57, όχι μόνο όσα έχουν σημάδι: ένα δεύτερο email θα φαινόταν εδώ.
create function public.t_event_emails() returns integer
language sql
as $$
  select count(*)::integer from public.email_outbox o
   where o.kind = 'automation'
     and authz.outbox_automation(o.payload) in (select a.id from public.automations a where a.event_type = 'assistant.cap_reached');
$$;

-- ───────────── Άρνηση ανά νέα συνάρτηση: Πωλήσεις, Παραγωγή, Λογιστής, Χρήστης πελάτη, ανώνυμος ─────────────
select public.t_as('a3');
set local role authenticated;
select throws_ok($$ select public.health_view() $$, '42501', null, 'Πωλήσεις: δεν βλέπουν την Υγεία');
select throws_ok($$ select public.send_ignore('00000000-0000-0000-0000-0000000000f1') $$, '42501', null, 'Πωλήσεις: δεν αγνοούν');
select throws_ok($$ select public.event_retry(1) $$, '42501', null, 'Πωλήσεις: δεν ξαναδοκιμάζουν Γεγονός');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-0000000000f1') $$, '42501', null, 'Πωλήσεις: δεν ξαναστέλνουν');
reset role;

select public.t_as('a4');
set local role authenticated;
select throws_ok($$ select public.health_view() $$, '42501', null, 'Παραγωγή: δεν βλέπει την Υγεία');
select throws_ok($$ select public.send_ignore('00000000-0000-0000-0000-0000000000f1') $$, '42501', null, 'Παραγωγή: δεν αγνοεί');
select throws_ok($$ select public.event_retry(1) $$, '42501', null, 'Παραγωγή: δεν ξαναδοκιμάζει Γεγονός');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-0000000000f1') $$, '42501', null, 'Παραγωγή: δεν ξαναστέλνει');
reset role;

select public.t_as('a5');
set local role authenticated;
select throws_ok($$ select public.health_view() $$, '42501', null, 'Λογιστής: δεν βλέπει την Υγεία');
select throws_ok($$ select public.send_ignore('00000000-0000-0000-0000-0000000000f1') $$, '42501', null, 'Λογιστής: δεν αγνοεί');
select throws_ok($$ select public.event_retry(1) $$, '42501', null, 'Λογιστής: δεν ξαναδοκιμάζει Γεγονός');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-0000000000f1') $$, '42501', null, 'Λογιστής: δεν ξαναστέλνει');
reset role;

select public.t_as('b1');
set local role authenticated;
select throws_ok($$ select public.health_view() $$, '42501', null, 'Χρήστης πελάτη: δεν βλέπει την Υγεία');
select throws_ok($$ select public.send_ignore('00000000-0000-0000-0000-0000000000f1') $$, '42501', null, 'Χρήστης πελάτη: δεν αγνοεί');
select throws_ok($$ select public.event_retry(1) $$, '42501', null, 'Χρήστης πελάτη: δεν ξαναδοκιμάζει Γεγονός');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-0000000000f1') $$, '42501', null, 'Χρήστης πελάτη: δεν ξαναστέλνει');
reset role;

set local role anon;
select throws_ok($$ select public.health_view() $$, '42501', null, 'Ανώνυμος: δεν βλέπει την Υγεία');
select throws_ok($$ select public.send_ignore('00000000-0000-0000-0000-0000000000f1') $$, '42501', null, 'Ανώνυμος: δεν αγνοεί');
select throws_ok($$ select public.event_retry(1) $$, '42501', null, 'Ανώνυμος: δεν ξαναδοκιμάζει Γεγονός');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-0000000000f1') $$, '42501', null, 'Ανώνυμος: δεν ξαναστέλνει');
select throws_ok($$ select authz.health_ok(now()) $$, '42501', null, 'Ανώνυμος: μόνο το public.health_ok(), χωρίς ώρα');
select is(public.health_ok(), false, 'Ανώνυμος: η ουρά δεν έχει τρέξει ποτέ → όχι εντάξει');
reset role;

select public.t_as('a1');
set local role authenticated;
select throws_ok($$ select public.job_run_mark('billables', true) $$, '42501', null, 'Το job_runs γράφεται μόνο με service_role');
reset role;

select is(
  (select count(*)::int from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'authz' and p.proname like 'health\_%'
      and (pg_catalog.has_function_privilege('anon', p.oid, 'execute')
           or pg_catalog.has_function_privilege('authenticated', p.oid, 'execute'))),
  0, 'Καμία authz.health_* δεν εκτελείται από anon ή authenticated');

-- ───────────── Κατάλογος εργασιών και όριο ανά εργασία (σταθερό p_now) ─────────────
select is(authz.health_job_label('billables'), 'Τιμολογητέα', 'Ετικέτα από τον κατάλογο');
select is(authz.health_job_grace('sends_cleanup'), interval '26 hours', 'Ο ημερήσιος καθαρισμός έχει περιθώριο 26 ωρών');
select throws_ok($$ select public.job_run_mark('nope', true) $$, 'P0001', 'Άγνωστη εργασία', 'Εργασία εκτός καταλόγου: P0001');
select public.job_run_mark('outbox', true, null, timestamptz '2026-03-01 10:00+00');
select public.job_run_mark('billables', true, null, timestamptz '2026-03-01 10:00+00');
select public.job_run_mark('assistant_purge', true, null, timestamptz '2026-03-01 10:00+00');

select public.t_as('a1');
select is(public.t_job('outbox', timestamptz '2026-03-01 10:05+00'), 'ok', 'Ουρά στα 5′: έτρεξε');
select is(public.t_job('google', timestamptz '2026-03-01 10:05+00'), 'never', 'Google χωρίς εκτέλεση: δεν έχει τρέξει ακόμα');
select is((public.health_view(timestamptz '2026-03-01 10:05+00') ->> 'attention')::integer, 0, 'Στα 5′: όλα δουλεύουν');
select is(jsonb_array_length(public.health_view(timestamptz '2026-03-01 10:05+00') -> 'jobs'),
  (select count(*)::integer from authz.health_job_catalog()), 'Κάθε εργασία του καταλόγου φαίνεται, και όσες δεν έτρεξαν');
select is(public.t_job('outbox', timestamptz '2026-03-01 10:11+00'), 'late', 'Ουρά στα 11′: άργησε');
select is(public.t_job('billables', timestamptz '2026-03-01 10:11+00'), 'late', 'Τα Τιμολογητέα (βήμα της ουράς) άργησαν κι αυτά');
select is((public.health_view(timestamptz '2026-03-01 10:11+00') ->> 'attention')::integer, 1,
  'Μία αιτία, ένα «θέλει προσοχή»: το βήμα δεν μετρά όσο άργησε η ίδια η ουρά');
select is(authz.today_count_health('00000000-0000-0000-0000-0000000000a1', null, timestamptz '2026-03-01 10:11+00'), 1,
  'Η κάρτα Σήμερα μετρά το ίδιο');
select is(public.health_check('google', timestamptz '2026-03-01 10:11+00') ->> 'jobs', '1', 'Ένα Γεγονός 50, για την ουρά');
select public.job_run_mark('outbox', true, null, timestamptz '2026-03-01 10:11+00');
select is(public.t_job('outbox', timestamptz '2026-03-01 10:12+00'), 'ok', 'Η ουρά πρασινίζει μόνη της μόλις τρέξει');
select is((public.health_view(timestamptz '2026-03-01 10:12+00') ->> 'attention')::integer, 1,
  'Η ουρά έτρεξε αλλά τα Τιμολογητέα όχι: τώρα μετρά το βήμα');
select is(public.health_check('google', timestamptz '2026-03-01 10:12+00') ->> 'jobs', '1', 'Γεγονός 50 για τα Τιμολογητέα');
select is((select e.payload ->> 'link' from public.events e where e.case_key like 'health.job_missed:billables:%'), '/app/health',
  'Το Γεγονός 50 ανοίγει την Υγεία');
select public.job_run_mark('billables', true, null, timestamptz '2026-03-01 10:12+00');
select is((public.health_view(timestamptz '2026-03-01 10:13+00') ->> 'attention')::integer, 0, 'Πρασινίζει μόνο του');
select is(public.t_job('assistant_purge', timestamptz '2026-03-02 11:00+00'), 'ok', 'Ημερήσια εργασία στις 25 ώρες: εντάξει');
select is(public.t_job('assistant_purge', timestamptz '2026-03-02 13:00+00'), 'late', 'Ημερήσια εργασία στις 27 ώρες: άργησε');
select is((select j ->> 'schedule' from jsonb_array_elements(public.health_view(timestamptz '2026-03-01 10:13+00') -> 'jobs') j
            where j ->> 'job' = 'automations_scan'), 'κάθε λεπτό, με την ουρά', 'Κάθε εργασία λέει πότε τρέχει');

-- ───────────── Δημόσιος έλεγχος: μόνο boolean ─────────────
select is(authz.health_ok(timestamptz '2026-03-01 10:15+00'), true, 'Ουρά πριν από 4′: εντάξει');
select is(authz.health_ok(timestamptz '2026-03-01 10:22+00'), false, 'Ουρά πριν από 11′: πρόβλημα');
select public.job_run_mark('outbox', true, null, now() - interval '2 minutes');
set local role anon;
select is(public.health_ok(), true, 'Ανώνυμος: ουρά που μόλις έτρεξε → εντάξει, και μόνο αυτό');
reset role;

-- ───────────── «Αγνόησε»: φεύγει από την Υγεία και τη Σήμερα, μένει στο Ιστορικό ─────────────
insert into public.email_outbox (id, kind, to_name, to_email, status, attempts, last_error, handled_at, created_at) values
  ('00000000-0000-0000-0000-0000000000f1', 'test', 'Γιώργος', 'owner@example.com', 'failed', 5, 'Bounce',
   now() - interval '1 hour', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-0000000000f2', 'test', 'Γιώργος', 'owner@example.com', 'failed', 5, 'Bounce',
   now() - interval '2 hours', now() - interval '2 hours');
insert into public.email_log (id, kind, to_email, subject, status, error, sent_at) values
  ('00000000-0000-0000-0000-0000000000e1', 'magiclink', 'b1@client-one.example.gr', 'Σύνδεσμος εισόδου', 'failed', 'Bounce',
   now() - interval '1 hour');

select public.t_as('a1');
select is(public.t_send_ids(public.health_view()),
  array['00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2', 'l00000000-0000-0000-0000-0000000000e1'],
  'Η Υγεία δείχνει τις αποτυχημένες αποστολές της ουράς και του email_log');
select ok(position('Σύνδεσμος εισόδου' in (public.health_view() -> 'sends')::text) = 0, 'Ποτέ το θέμα της αποστολής');
select set_config('t.today', authz.today_count_health('00000000-0000-0000-0000-0000000000a1', null, now())::text, true);
select lives_ok($$ select public.send_ignore('00000000-0000-0000-0000-0000000000f1') $$, 'Ο Ιδιοκτήτης αγνοεί την αποστολή');
select is((select status || ' ' || ignored_by::text || ' ' || (ignored_at is not null)::text
             from public.email_outbox where id = '00000000-0000-0000-0000-0000000000f1'),
  'ignored 00000000-0000-0000-0000-0000000000a1 true', 'Κατάσταση «αγνοήθηκε», με ποιος και πότε');
select ok(not ('00000000-0000-0000-0000-0000000000f1' = any (public.t_send_ids(public.health_view()))), 'Φεύγει από την Υγεία');
select is(authz.today_count_health('00000000-0000-0000-0000-0000000000a1', null, now()), current_setting('t.today')::integer - 1,
  'Φεύγει από την κάρτα Σήμερα');
select is(public.t_k3_state('sent', 'o00000000-0000-0000-0000-0000000000f1'), 'ignored',
  'Μένει στο Ιστορικό αποστολών ως «αγνοήθηκε»');
select is(public.t_k3_state('failed', 'o00000000-0000-0000-0000-0000000000f1'), null, 'Δεν είναι πια στα «Απέτυχαν»');
select is((select count(*)::integer from public.audit_log l
            where l.entity = 'email_outbox' and l.entity_id = '00000000-0000-0000-0000-0000000000f1' and l.action = 'update'
              and l.actor_id = '00000000-0000-0000-0000-0000000000a1' and l.after ->> 'status' = 'ignored'), 1,
  'Το «Αγνόησε» γράφεται στο Ίχνος με το όνομα του Ιδιοκτήτη');
select throws_ok($$ select public.send_ignore('00000000-0000-0000-0000-0000000000f1') $$, 'P0001',
  'Αγνοείται μόνο αποστολή που απέτυχε', 'Δεύτερο «Αγνόησε»: P0001');
select throws_ok($$ select public.send_ignore('00000000-0000-0000-0000-0000000000ff') $$, 'P0001',
  'Αγνοείται μόνο αποστολή που απέτυχε', 'Ανύπαρκτη αποστολή: το ίδιο λάθος');
select lives_ok($$ select public.send_ignore('l00000000-0000-0000-0000-0000000000e1') $$, 'Αγνοείται και αποτυχία του email_log');
select is(public.t_k3_state('sent', 'l00000000-0000-0000-0000-0000000000e1'), 'ignored', 'Και αυτή μένει στο Ιστορικό');
select is((select count(*)::integer from public.audit_log l
            where l.entity = 'email_log' and l.entity_id = '00000000-0000-0000-0000-0000000000e1' and l.action = 'update'
              and l.actor_id = '00000000-0000-0000-0000-0000000000a1'), 1, 'Και αυτό στο Ίχνος');

-- ───────────── «Ξαναστείλε» με health.view ─────────────
select public.t_as('a6');
select is((select i ->> 'retryRef' from jsonb_array_elements(public.health_view() -> 'sends' -> 'items') i
            where i ->> 'id' = '00000000-0000-0000-0000-0000000000f2'), '00000000-0000-0000-0000-0000000000f2',
  'Μόνο με health.view: η αποστολή έχει «Ξαναστείλε»');
select lives_ok($$ select public.send_retry('00000000-0000-0000-0000-0000000000f2') $$, 'Ξαναστέλνει με health.view');
select is((select count(*)::integer from public.email_outbox o where o.retry_of = '00000000-0000-0000-0000-0000000000f2'), 1,
  'Μία νέα γραμμή στην ουρά');
select is((select count(*)::integer from public.audit_log l join public.email_outbox o on o.id::text = l.entity_id
            where o.retry_of = '00000000-0000-0000-0000-0000000000f2' and l.entity = 'email_outbox' and l.action = 'insert'
              and l.actor_id = '00000000-0000-0000-0000-0000000000a6'), 1, 'Το «Ξαναστείλε» γράφεται στο Ίχνος');
select throws_ok($$ select public.send_retry('00000000-0000-0000-0000-0000000000f2') $$, 'P0001',
  'Αυτό το email ξαναστάλθηκε ήδη μία φορά', 'Μία φορά ανά αποστολή');
select ok(not ('00000000-0000-0000-0000-0000000000f2' = any (public.t_send_ids(public.health_view()))),
  'Η αποστολή που ξαναστάλθηκε φεύγει από την Υγεία');

-- ───────────── «Ξαναδοκίμασε»: χωρίς διπλή αποστολή ─────────────
insert into public.events (type, entity, case_key, payload, occurred_at)
values ('assistant.cap_reached', 'ai_usage', 'assistant.cap_reached:t215',
        '{"limit":"80%","month":"03/2026","link":"/app/settings/company"}', now() - interval '30 minutes');
select set_config('t.event', (select id::text from public.events where case_key = 'assistant.cap_reached:t215'), true);
select public.events_process(100, now());
select set_config('t.sends', public.t_event_sends('assistant.cap_reached:t215')::text, true);
select set_config('t.notes', public.t_event_notifications('assistant.cap_reached:t215')::text, true);
select set_config('t.mails', public.t_event_emails()::text, true);
select ok(current_setting('t.sends')::integer > 0 and current_setting('t.notes')::integer > 0,
  'Το Γεγονός έφτασε σε όσους βλέπουν Υγεία');
-- Σαν να κόλλησε μετά από αυτό: 5 αποτυχημένες προσπάθειες, ανεπεξέργαστο.
update public.events set processed_at = null, attempts = 5, last_error = 'boom'
 where id = current_setting('t.event')::bigint;
select ok(exists (select 1 from jsonb_array_elements(public.health_view() -> 'events' -> 'stuck') e
                   where e ->> 'id' = current_setting('t.event')),
  'Το Γεγονός φαίνεται στα «κόλλησαν»');
select lives_ok(format('select public.event_retry(%s)', current_setting('t.event')), 'Ξαναδοκιμάζει με health.view');
select is((select attempts || ' ' || coalesce(last_error, '—') from public.events where id = current_setting('t.event')::bigint),
  '0 —', 'Μηδέν προσπάθειες, ξανά στην ουρά');
select is((select count(*)::integer from public.audit_log l
            where l.entity = 'events' and l.entity_id = current_setting('t.event') and l.action = 'event'
              and l.actor_id = '00000000-0000-0000-0000-0000000000a6' and l.after ->> 'event' = 'retried'), 1,
  'Το «Ξαναδοκίμασε» γράφεται στο Ίχνος');
select is((public.health_view() -> 'events' ->> 'stuckTotal')::integer, 0, 'Φεύγει από τα «κόλλησαν»');
select public.events_process(100, now());
select ok((select processed_at is not null from public.events where id = current_setting('t.event')::bigint),
  'Επεξεργάστηκε ξανά');
select is(public.t_event_sends('assistant.cap_reached:t215'), current_setting('t.sends')::integer,
  'Κανένα νέο σημάδι: όσοι το πήραν δεν το ξαναπαίρνουν');
select is(public.t_event_notifications('assistant.cap_reached:t215'), current_setting('t.notes')::integer,
  'Καμία δεύτερη Ειδοποίηση');
select is(public.t_event_emails(), current_setting('t.mails')::integer, 'Κανένα δεύτερο email');
select throws_ok(format('select public.event_retry(%s)', current_setting('t.event')), 'P0001',
  'Ξαναδοκιμάζεται μόνο Γεγονός που κόλλησε', 'Γεγονός που επεξεργάστηκε: P0001');
insert into public.events (type, entity, case_key, payload, attempts)
values ('health.job_missed', 'job_runs', 'health.job_missed:t215', '{}', 5);
select throws_ok(format('select public.event_retry(%s)', (select id from public.events where case_key = 'health.job_missed:t215')),
  'P0001', 'Ξαναδοκιμάζεται μόνο Γεγονός που κόλλησε', 'Γεγονός Υγείας: δεν ξαναδοκιμάζεται');

-- ───────────── Πλαφόν Βοηθού: ανάγνωση με health.view, αλλαγή μόνο ο Ιδιοκτήτης ─────────────
select ok((public.health_view() -> 'ai') ?& array['spentMicros', 'capMicros', 'publicShare'], 'Η Υγεία δείχνει δαπάνη και πλαφόν');
select lives_ok($$ select public.ai_spend_view() $$, 'Μόνο με health.view: διαβάζει τη δαπάνη');
select throws_ok($$ select public.assistant_cap_save(40, 80) $$, '42501', null, 'Μόνο με health.view: δεν αλλάζει το πλαφόν');
select lives_ok($$ select public.integrations_view() $$, 'Μόνο με health.view: η κοινή πηγή κατάστασης του Google');
select public.t_as('a1');
select lives_ok($$ select public.assistant_cap_save(40, 80) $$, 'Ο Ιδιοκτήτης αλλάζει το πλαφόν');

-- ───────────── Σήμερα: η κάρτα ανοίγει την P2 ─────────────
select is((select link from public.today_cards where code = 'health'), '/app/health', 'Η κάρτα Υγείας ανοίγει την P2');

select * from finish();
rollback;
