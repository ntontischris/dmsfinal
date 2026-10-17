-- Ομάδα Νγ #209: Ενσωματώσεις και συνδρομές (N5). Μόνο ο Ιδιοκτήτης (άρνηση για Διαχείριση, Πωλήσεις, Χρήστη πελάτη· η
-- κατάσταση των συνδέσεων ανοίγει και σε health.view από το #215),
-- GA4 / Meta Pixel με έλεγχο μορφής, σύνολα συνδρομών ανά νόμισμα, «Έλεγχος τώρα» το πολύ μία φορά το λεπτό, τα γεγονότα
-- πίσω από την κατάσταση (μέρα Αθήνας), Γεγονός 59 μία φορά 7 μέρες πριν από την ανανέωση.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι ώρες είναι σταθερές και περνούν ως p_now.
begin;
select plan(65);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Διαχείριση · a3 Πωλήσεις · b1 Χρήστης πελάτη «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Δημήτρης', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Διαχείριση'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';
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

create function public.t_scan(p_now timestamptz) returns jsonb
language sql
as $$ select public.automations_scan(p_now); $$;

create function public.t_sent59(p_last text) returns integer
language sql
as $$
  select count(*)::integer from public.automation_sends s join public.automations a on a.id = s.automation_id
   where a.event_type = 'subscription.renewing' and a.is_initial
     and s.recipient_key = '00000000-0000-0000-0000-0000000000' || p_last;
$$;

-- Σημάδια του 59 προς έναν Χρήστη από ΟΠΟΙΟΝΔΗΠΟΤΕ Αυτοματισμό (και όσους πρόσθεσε η Διαχείριση).
create function public.t_sent59_any(p_last text) returns integer
language sql
as $$
  select count(*)::integer from public.automation_sends s join public.automations a on a.id = s.automation_id
   where a.event_type = 'subscription.renewing' and s.recipient_key = '00000000-0000-0000-0000-0000000000' || p_last;
$$;

-- Οι περιπτώσεις του 59 στα Προγραμματισμένα του θεατή, σε ένα σταθερό παράθυρο (μία γραμμή ανά Αυτοματισμό).
create function public.t_upcoming59() returns integer
language sql
as $$
  select count(distinct x ->> 'caseKey')::integer
    from jsonb_array_elements(public.automations_upcoming(timestamptz '2026-04-12 00:00+00', timestamptz '2026-04-14 00:00+00')) x
   where x ->> 'eventType' = 'subscription.renewing';
$$;

-- ───────────── Μόνο ο Ιδιοκτήτης: άρνηση ανά RPC ─────────────
select public.t_as('a2');
set local role authenticated;
select lives_ok($$ select public.integrations_view() $$,
  'Διαχείριση (health.view, #215): βλέπει την κατάσταση των συνδέσεων για την κάρτα Google της Υγείας');
select throws_ok($$ select public.integration_check_begin('email') $$, '42501', null, 'Διαχείριση: δεν κάνει «Έλεγχος τώρα»');
select throws_ok($$ select public.integration_check_finish('email', true) $$, '42501', null, 'Διαχείριση: δεν γράφει αποτέλεσμα ελέγχου');
select throws_ok($$ select public.company_analytics_save('G-ABCD1234', '') $$, '42501', null, 'Διαχείριση: δεν αλλάζει GA4 / Pixel');
select throws_ok($$ select public.subscriptions_view() $$, '42501', null, 'Διαχείριση: δεν βλέπει τις συνδρομές');
select throws_ok($$ insert into public.subscriptions (provider, monthly_cost, currency) values ('Vercel', 20, 'USD') $$,
  '42501', null, 'Διαχείριση: δεν προσθέτει συνδρομή (RLS)');
select throws_ok($$ update public.company_settings set ga4_measurement_id = 'G-ABCD1234' where id $$,
  'P0001', null, 'Διαχείριση (με «Διαχειρίζεται Ρυθμίσεις»): ο φύλακας κρατά τα GA4 / Pixel για τον Ιδιοκτήτη');
reset role;

select public.t_as('a3');
set local role authenticated;
select throws_ok($$ select public.integrations_view() $$, '42501', null, 'Πωλήσεις: δεν βλέπει την κατάσταση των συνδέσεων');
select throws_ok($$ select public.integration_check_begin('ai') $$, '42501', null, 'Πωλήσεις: δεν κάνει «Έλεγχος τώρα»');
select throws_ok($$ select public.integration_check_finish('ai', false, 'x') $$, '42501', null, 'Πωλήσεις: δεν γράφει αποτέλεσμα ελέγχου');
select throws_ok($$ select public.company_analytics_save('', '123456789') $$, '42501', null, 'Πωλήσεις: δεν αλλάζει GA4 / Pixel');
select throws_ok($$ select public.subscriptions_view() $$, '42501', null, 'Πωλήσεις: δεν βλέπει τις συνδρομές');
select throws_ok($$ insert into public.subscriptions (provider, monthly_cost, currency) values ('Vercel', 20, 'USD') $$,
  '42501', null, 'Πωλήσεις: δεν προσθέτει συνδρομή (RLS)');
reset role;

select public.t_as('b1');
set local role authenticated;
select throws_ok($$ select public.integrations_view() $$, '42501', null, 'Χρήστης πελάτη: δεν βλέπει την κατάσταση των συνδέσεων');
select throws_ok($$ select public.integration_check_begin('google') $$, '42501', null, 'Χρήστης πελάτη: δεν κάνει «Έλεγχος τώρα»');
select throws_ok($$ select public.integration_check_finish('google', true) $$, '42501', null, 'Χρήστης πελάτη: δεν γράφει αποτέλεσμα');
select throws_ok($$ select public.company_analytics_save('G-ABCD1234', '') $$, '42501', null, 'Χρήστης πελάτη: δεν αλλάζει GA4 / Pixel');
select throws_ok($$ select public.subscriptions_view() $$, '42501', null, 'Χρήστης πελάτη: δεν βλέπει τις συνδρομές');
select throws_ok($$ insert into public.subscriptions (provider, monthly_cost, currency) values ('Vercel', 20, 'USD') $$,
  '42501', null, 'Χρήστης πελάτη: δεν προσθέτει συνδρομή (RLS)');
reset role;

set local role anon;
select throws_ok($$ select public.integrations_view() $$, '42501', null, 'Ανώνυμος: καμία πρόσβαση');
reset role;

-- ───────────── GA4 και Meta Pixel ─────────────
select public.t_as('a1');
set local role authenticated;
select lives_ok($$ select public.company_analytics_save(' g-ab12cd34ef ', '123456789012345') $$,
  'Ο Ιδιοκτήτης αποθηκεύει GA4 και Pixel');
select throws_ok($$ select public.company_analytics_save('UA-12345-1', '') $$, 'P0001', null, 'GA σε άλλη μορφή: P0001');
select throws_ok($$ select public.company_analytics_save('', '12ab3456') $$, 'P0001', null, 'Pixel με γράμματα: P0001');
reset role;
select is((select ga4_measurement_id || ' ' || meta_pixel_id from public.company_settings where id),
  'G-AB12CD34EF 123456789012345', 'Αποθηκεύτηκαν καθαρισμένα (κεφαλαία, χωρίς κενά)');
select throws_ok($$ update public.company_settings set ga4_measurement_id = 'G-x' where id $$, '23514', null,
  'Η βάση απορρίπτει GA4 εκτός μορφής');
select throws_ok($$ update public.company_settings set meta_pixel_id = 'abc' where id $$, '23514', null,
  'Η βάση απορρίπτει Pixel εκτός μορφής');

-- ───────────── Μητρώο συνδρομών: σύνολα ανά νόμισμα ─────────────
select public.t_as('a1');
set local role authenticated;
select lives_ok($$ insert into public.subscriptions (provider, covers, plan, monthly_cost, currency) values
  ('Vercel', 'Φιλοξενία', 'Pro', 20, 'USD'), ('Supabase', 'Βάση', 'Pro', 25.5, 'USD'), ('SiteGround', 'Domain', 'ετήσιο', 2, 'EUR') $$,
  'Ο Ιδιοκτήτης προσθέτει συνδρομές');
select is(public.subscriptions_view() -> 'totals',
  '[{"currency":"EUR","total":2,"count":1},{"currency":"USD","total":45.5,"count":2}]'::jsonb,
  'Ένα σύνολο ανά νόμισμα, χωρίς μετατροπή');
select is(jsonb_array_length(public.subscriptions_view() -> 'items'), 3, 'Ο Ιδιοκτήτης βλέπει και τις τρεις');
select throws_ok($$ insert into public.subscriptions (provider, monthly_cost, currency) values ('X', 1, 'eur') $$, '23514', null,
  'Νόμισμα μόνο κωδικός ISO με κεφαλαία');
select throws_ok($$ insert into public.subscriptions (provider, monthly_cost, currency) values ('X', -1, 'EUR') $$, '23514', null,
  'Αρνητικό κόστος: όχι');
reset role;

select public.t_as('a2');
set local role authenticated;
select is((select count(*)::integer from public.subscriptions), 0, 'Διαχείριση: το RLS δεν δείχνει καμία συνδρομή');
update public.subscriptions set monthly_cost = 0;
delete from public.subscriptions;
reset role;
select is((select count(*)::integer from public.subscriptions where monthly_cost > 0), 3,
  'Διαχείριση: αλλαγή και διαγραφή δεν αγγίζουν τίποτα');

select public.t_as('a1');
select is(authz.audit_entity_allowed('subscriptions'), true, 'Ίχνος συνδρομών: ο Ιδιοκτήτης το βλέπει');
select public.t_as('a2');
select is(authz.audit_entity_allowed('subscriptions'), false, 'Ίχνος συνδρομών: η Διαχείριση όχι');
select ok((select count(*) from public.audit_log where entity = 'subscriptions' and action = 'insert') = 3,
  'Κάθε συνδρομή γράφτηκε στο Ίχνος');

-- ───────────── «Έλεγχος τώρα»: το πολύ μία φορά το λεπτό ανά σύνδεση ─────────────
select public.t_as('a1');
select lives_ok($$ select authz.integration_check_begin('email', timestamptz '2026-03-10 10:00:00+00') $$, 'Πρώτος έλεγχος: ξεκινά');
select throws_ok($$ select authz.integration_check_begin('email', timestamptz '2026-03-10 10:00:30+00') $$, 'P0001', null,
  'Δεύτερος μέσα στο ίδιο λεπτό: απορρίπτεται');
select lives_ok($$ select authz.integration_check_begin('ai', timestamptz '2026-03-10 10:00:30+00') $$,
  'Άλλη σύνδεση, ίδιο λεπτό: ξεκινά');
select lives_ok($$ select authz.integration_check_finish('email', true, null, timestamptz '2026-03-10 10:00:05+00') $$,
  'Το αποτέλεσμα γράφεται');
select is((select last_ok_at from public.integration_checks where connection = 'email'), timestamptz '2026-03-10 10:00:05+00',
  'Γράφτηκε η τελευταία επιτυχία');
select throws_ok($$ select authz.integration_check_finish('email', true, null, timestamptz '2026-03-10 10:00:20+00') $$, 'P0001', null,
  'Δεύτερο αποτέλεσμα για τον ίδιο έλεγχο: όχι');
select lives_ok($$ select authz.integration_check_begin('email', timestamptz '2026-03-10 10:01:00+00') $$, 'Μετά από ένα λεπτό: ξεκινά ξανά');
select lives_ok($$ select authz.integration_check_finish('email', false, 'Resend 401', timestamptz '2026-03-10 10:01:02+00') $$,
  'Αποτυχία γράφεται με τον λόγο');
select throws_ok($$ select authz.integration_check_begin('turnstile', timestamptz '2026-03-10 10:05:00+00') $$, 'P0001', null,
  'Σύνδεση που δεν ελέγχεται από εδώ: P0001');
select throws_ok($$ select authz.integration_check_finish('google', true, null, timestamptz '2026-03-10 10:05:00+00') $$, 'P0001', null,
  'Αποτέλεσμα χωρίς έναρξη: P0001');
select lives_ok($$ select public.integration_check_begin('google') $$, 'Η public εκδοχή (με now()) ξεκινά έλεγχο');
select throws_ok($$ select public.integration_check_begin('google') $$, 'P0001', null, 'και αμέσως μετά απορρίπτει τον δεύτερο');

-- ───────────── Τα γεγονότα πίσω από την κατάσταση (μέρα Αθήνας) ─────────────
-- p_now = 2026-03-10 12:00 Αθήνας. «Σήμερα» αρχίζει στις 2026-03-09 22:00 UTC.
insert into public.email_log (kind, to_email, subject, status, sent_at) values
  ('test', 'owner@example.com', 'Χθες', 'sent', timestamptz '2026-03-09 21:30+00'),
  ('test', 'owner@example.com', 'Σήμερα 1', 'sent', timestamptz '2026-03-09 22:30+00'),
  ('test', 'owner@example.com', 'Σήμερα 2', 'sent', timestamptz '2026-03-10 09:00+00'),
  ('test', 'owner@example.com', 'Απέτυχε', 'failed', timestamptz '2026-03-10 08:00+00'),
  ('test', 'owner@example.com', 'Αύριο', 'sent', timestamptz '2026-03-11 09:00+00');
insert into public.ai_usage (at, purpose, model, input_tokens, cost_micros, audience) values
  (timestamptz '2026-03-05 10:00+00', 'chat', 'openai/gpt-4.1-mini', 1000, 1500000, 'team'),
  (timestamptz '2026-02-27 10:00+00', 'chat', 'openai/gpt-4.1-mini', 1000, 9000000, 'team');
select public.t_as('a1');
select is(authz.integrations_view(timestamptz '2026-03-10 10:00+00') -> 'email' ->> 'sentToday', '2',
  'Emails της ημέρας: μόνο της σημερινής μέρας Αθήνας');
select is(authz.integrations_view(timestamptz '2026-03-10 10:00+00') -> 'email' ->> 'failedToday', '1', 'Αποτυχίες της ημέρας');
select is((authz.integrations_view(timestamptz '2026-03-10 10:00+00') -> 'email' ->> 'lastSentAt')::timestamptz,
  timestamptz '2026-03-10 09:00+00', 'Τελευταία αποστολή: όχι μετά το p_now');
select is(authz.integrations_view(timestamptz '2026-03-10 10:00+00') -> 'ai' ->> 'spentMicros', '1500000',
  'Δαπάνη AI του μήνα (χωρίς τον προηγούμενο)');
select is(authz.integrations_view(timestamptz '2026-03-10 10:00+00') -> 'ai' ->> 'capMicros', '30000000', 'Πλαφόν του μήνα');
select is(authz.integrations_view(timestamptz '2026-03-10 10:00+00') -> 'checks' -> 'email' ->> 'lastError', 'Resend 401',
  'Ο τελευταίος έλεγχος φαίνεται με τον λόγο');
select is(authz.integrations_view(timestamptz '2026-03-10 10:00+00') -> 'analytics',
  '{"ga4":"G-AB12CD34EF","pixel":"123456789012345"}'::jsonb, 'GA4 και Pixel στην ίδια πηγή');

-- ───────────── Γεγονός 59: 7 μέρες πριν από την ανανέωση, μία φορά ─────────────
select is((select kind || ' ' || grp || ' ' || is_wired::text || ' ' || array_to_string(relatives, ',')
             from public.event_types where number = 59),
  'dated ΣΤ true owner', 'Το 59 είναι «με ημερομηνία», συνδεδεμένο, προς τους Ιδιοκτήτες');
select is((select count(*)::integer from public.automations
            where event_type = 'subscription.renewing' and is_initial and is_enabled and channel = 'notification'
              and recipient_relative = 'owner' and timing = 'offset' and offset_days = -7 and send_time = '09:00'),
  1, 'Αρχικός Αυτοματισμός: Ειδοποίηση στους Ιδιοκτήτες, 7 μέρες πριν, 09:00');

-- Ανανέωση 2026-04-20 → αποστολή 2026-04-13 09:00 Αθήνας = 06:00 UTC (θερινή ώρα).
insert into public.subscriptions (id, provider, plan, monthly_cost, currency, renews_on) values
  ('00000000-0000-0000-0000-000000005901', 'Resend', 'Pro', 25.5, 'USD', date '2026-04-20');
-- Η Διαχείριση (automations.manage) βάζει τον εαυτό της παραλήπτη του 59: ονομαστικά και «όσοι έχουν Δικαίωμα».
insert into public.automations (event_type, channel, recipient_kind, recipient_user_ids, timing, offset_days, send_time, body_el)
values ('subscription.renewing', 'notification', 'users', '{00000000-0000-0000-0000-0000000000a2}', 'offset', -7, '09:00',
        '{subscription} {renewsOn} {amount}');
insert into public.automations (event_type, channel, recipient_kind, recipient_permission, timing, offset_days, send_time, subject_el, body_el)
values ('subscription.renewing', 'email', 'permission', 'automations.manage', 'offset', -7, '09:00', 'Συνδρομή',
        '{subscription} {renewsOn} {amount}'),
       ('subscription.renewing', 'notification', 'permission', 'clients.view', 'offset', -7, '09:00', null,
        '{subscription} {renewsOn} {amount}');
select public.t_scan(timestamptz '2026-04-13 05:59+00');
select is(public.t_sent59('a1'), 0, 'Ένα λεπτό πριν τις 09:00 της 7ης μέρας πριν: τίποτα');
select public.t_scan(timestamptz '2026-04-13 06:00+00');
select is(public.t_sent59('a1'), 1, 'Στις 09:00 Αθήνας, 7 μέρες πριν: Ειδοποίηση στον Ιδιοκτήτη');
select is(public.t_sent59_any('a2'), 0,
  'Η Διαχείριση δεν την παίρνει, ούτε ονομαστικά ούτε ως «όσοι έχουν Δικαίωμα», ούτε με email');
select is(public.t_sent59_any('a3'), 0, 'Ούτε οι Πωλήσεις μέσω Δικαιώματος');
select ok((select n.body like '%Resend%20/04/2026%25,50 USD%' from public.notifications n
            join public.automation_sends s on s.notification_id = n.id
            join public.automations a on a.id = s.automation_id
           where a.event_type = 'subscription.renewing' limit 1),
  'Η Ειδοποίηση λέει πάροχο, ημερομηνία και ποσό με το νόμισμά του');
select public.t_scan(timestamptz '2026-04-13 06:01+00');
select public.t_scan(timestamptz '2026-04-14 06:00+00');
select is(public.t_sent59('a1'), 1, 'Μία φορά: οι επόμενοι έλεγχοι δεν ξαναστέλνουν');

select public.t_as('a1');
select is(public.t_upcoming59(), 1, 'Προγραμματισμένα: ο Ιδιοκτήτης βλέπει την υπενθύμιση της συνδρομής');
select public.t_as('a2');
select is(public.t_upcoming59(), 0, 'Προγραμματισμένα: η Διαχείριση όχι');

select * from finish();
rollback;
