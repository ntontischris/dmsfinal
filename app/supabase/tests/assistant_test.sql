-- Γνώση Lγ #193: ο Βοηθός (assistant_context), πλαφόν δαπάνης AI (μόνο Ιδιοκτήτης, μηνιαία δαπάνη, Γεγονός 57 μία φορά ανά
-- όριο ανά μήνα), ετικέτες και όρια Υγείας ανά εργασία. Φανταστικά δεδομένα και σταθερές στιγμές· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(49);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Διαχείριση · a3 Πωλήσεις · b1 Χρήστης πελάτη Α «Πλήρης» · b2 Χρήστης πελάτη Β, άλλος Ρόλος · d1 χωρίς πρόσβαση
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'k2@client-b.example.gr'),
  ('00000000-0000-0000-0000-0000000000d1', 'nobody@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Δήμητρα', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Διαχείριση'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';
insert into public.clients (id, name, afm, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', '123456789', 'Μαρία Παπαδάκη', 'a@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', '987654321', 'Νίκος Κίνης', 'b@example.com', '00000000-0000-0000-0000-0000000000a3');
insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Βασικός (τεστ)', 'Τεστ: άλλος Ρόλος πελάτη.', 'client', false, false);
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', 'Πάνος',
   (select r.id from public.roles r where r.name = 'Βασικός (τεστ)' and r.kind = 'client'), true);

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

create function public.t_role(p_name text, p_kind text) returns uuid
language sql
as $$ select r.id from public.roles r where r.name = p_name and r.kind = p_kind; $$;

create function public.t_id(p_key text) returns uuid
language sql
as $$ select current_setting('t.' || p_key)::uuid; $$;

-- Δημοσιευμένο Άρθρο με Κοινό τον Ρόλο p_role.
create function public.t_published(p_key text, p_title text, p_body text, p_role uuid) returns void
language plpgsql
as $$
begin
  perform set_config('t.' || p_key, public.knowledge_item_save(jsonb_build_object(
    'sectionId', current_setting('t.s1'), 'kind', 'article', 'title', p_title, 'summary', 'Περίληψη: ' || p_title,
    'body', p_body))->>'id', true);
  perform public.knowledge_item_set_audience(public.t_id(p_key), array[p_role], false);
  perform public.knowledge_item_publish(public.t_id(p_key));
end;
$$;

-- Σταθερό vector 1536 διαστάσεων με 1 στη θέση p_a.
create function public.t_arr(p_a integer) returns real[]
language sql immutable
as $$ select array_agg(case when g = p_a then 1 else 0 end::real order by g) from generate_series(1, 1536) g; $$;

create function public.t_vec(p_a integer) returns extensions.vector
language sql immutable
as $$ select public.t_arr(p_a)::extensions.vector; $$;

-- Ένα κομμάτι (όπως ο worker) για το τρέχον version του στοιχείου.
create function public.t_store(p_key text, p_content text, p_a integer) returns jsonb
language sql security definer set search_path = ''
as $$
  select public.knowledge_index_store(i.id, i.content_version, null, 'openai/text-embedding-3-small',
    jsonb_build_array(jsonb_build_object('content', p_content, 'embedding', to_jsonb(public.t_arr(p_a)))))
    from public.knowledge_items i where i.id = current_setting('t.' || p_key)::uuid;
$$;

create function public.t_cost(p_at timestamptz, p_micros bigint) returns void
language sql security definer set search_path = ''
as $$
  insert into public.ai_usage (at, purpose, model, input_tokens, output_tokens, cost_micros, audience)
  values (p_at, 'chat', 'openai/gpt-4.1-mini', 1, 1, p_micros, 'team');
$$;

-- Πόσα Γεγονότα 57 υπάρχουν για τον μήνα (YYYY-MM).
create function public.t_caps(p_month text) returns integer
language sql security definer set search_path = ''
as $$
  select count(*)::integer from public.events e
   where e.type = 'assistant.cap_reached' and e.case_key like 'assistant.cap_reached:' || p_month || ':%';
$$;

-- Πεδίο ενός Πακέτου στο assistant_context.
create function public.t_pkg(p_ctx jsonb, p_name text, p_field text) returns text
language sql immutable
as $$ select p ->> p_field from jsonb_array_elements(p_ctx -> 'packages') p where p ->> 'name' = p_name; $$;

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.assistant_context('x', null) $$, '42501', null, 'Ο ανώνυμος δεν ρωτά τον Βοηθό');
select throws_ok($$ select public.ai_spend_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τη δαπάνη');
select throws_ok($$ select public.assistant_cap_save(40, 80) $$, '42501', null, 'Ο ανώνυμος δεν αλλάζει το πλαφόν');
reset role;

set local role authenticated;
select public.t_as('a1');
select throws_ok($$ select public.ai_budget() $$, '42501', null, 'Το ai_budget μόνο με service_role');
select throws_ok($$ select public.job_run_mark('assistant_purge', true) $$, '42501', null, 'Το job_runs γράφεται μόνο με service_role');
select throws_ok($$ select * from public.ai_usage $$, '42501', null, 'Ο πίνακας κόστους AI είναι κλειστός');
select throws_ok($$ select * from public.job_runs $$, '42501', null, 'Ο πίνακας εργασιών είναι κλειστός');
reset role;

select public.t_as('a2');
select throws_ok($$ select public.assistant_cap_save(40, 80) $$, '42501', null, 'Η Διαχείριση δεν αλλάζει το πλαφόν');
select public.t_as('a3');
select throws_ok($$ select public.ai_spend_view() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν τη δαπάνη');
select public.t_as('b1');
select throws_ok($$ select public.assistant_cap_save(40, 80) $$, '42501', null, 'Ο πελάτης δεν αλλάζει το πλαφόν');
select throws_ok($$ select public.ai_spend_view() $$, '42501', null, 'Ο πελάτης δεν βλέπει τη δαπάνη');
select public.t_as('d1');
select throws_ok($$ select public.assistant_context('x', public.t_vec(1)) $$, '42501', null,
  'Χωρίς ομάδα και χωρίς Πελάτη: όχι Βοηθός');

-- ───────────── Πλαφόν: μόνο ο Ιδιοκτήτης ─────────────
select public.t_as('a1');
select lives_ok($$ select public.assistant_cap_save(40, 70) $$, 'Ο Ιδιοκτήτης αλλάζει πλαφόν και μερίδιο');
select is((select c.ai_monthly_cap_usd from public.company_settings c where c.id), 40.00::numeric(8, 2), 'Το πλαφόν αποθηκεύτηκε');
select throws_ok($$ select public.assistant_cap_save(40, 150) $$, 'P0001', 'Το μερίδιο είναι από 0 έως 100%',
  'Μερίδιο πάνω από 100% απορρίπτεται');
select throws_ok($$ select public.assistant_cap_save(40, 80, timestamptz '2000-01-01') $$, 'P0001', null,
  'Παλιό version: «κάποιος άλλος άλλαξε»');
select public.t_as('a2');
select is(public.ai_spend_view(timestamptz '2026-10-15 12:00+00') ->> 'capMicros', '40000000',
  'Η Διαχείριση βλέπει πλαφόν και δαπάνη');
select public.t_as('a1');
select public.assistant_cap_save(30, 80);

-- ───────────── Δαπάνη μήνα (Europe/Athens) και Γεγονός 57 ─────────────
select public.t_cost(timestamptz '2026-09-30 20:59+00', 7);           -- 23:59 Αθήνας, Σεπτέμβριος
select public.t_cost(timestamptz '2026-09-30 21:00+00', 20000000);    -- 00:00 Αθήνας, 1 Οκτωβρίου (66%)
select is(authz.ai_month_spend(timestamptz '2026-10-15 12:00+00'), 20000000::bigint, 'Οκτώβριος από την 1η, ώρα Ελλάδας');
select is(authz.ai_month_spend(timestamptz '2026-09-15 12:00+00'), 7::bigint, 'Σεπτέμβριος χωριστά');
select is(public.t_caps('2026-10'), 0, 'Στο 66%: κανένα Γεγονός 57');

select public.t_cost(timestamptz '2026-10-05 10:00+00', 5000000);     -- 83%
select is(public.t_caps('2026-10'), 1, 'Στο 80%: Γεγονός 57');
select is((select e.payload ->> 'limit' from public.events e where e.case_key = 'assistant.cap_reached:2026-10:80'), '80%',
  'Το Γεγονός λέει το όριο');
select public.t_cost(timestamptz '2026-10-06 10:00+00', 1000000);     -- 86%
select is(public.t_caps('2026-10'), 1, 'Το 80% γράφεται μία φορά');
select public.t_cost(timestamptz '2026-10-07 10:00+00', 5000000);     -- 103%
select is(public.t_caps('2026-10'), 2, 'Στο 100%: δεύτερο Γεγονός 57');
select public.t_cost(timestamptz '2026-10-08 10:00+00', 1);
select is(public.t_caps('2026-10'), 2, 'Το 100% γράφεται μία φορά');
select public.t_cost(timestamptz '2026-11-02 10:00+00', 24000000);    -- Νοέμβριος, 80%
select is(public.t_caps('2026-11'), 1, 'Νέος μήνας: ξανά Γεγονός 57 στο 80%');

select is(authz.ai_budget(timestamptz '2026-10-20 12:00+00') ->> 'usersOpen', 'false', 'Στο 100%: κλειστό και για τους Χρήστες');
select is(authz.ai_budget(timestamptz '2026-11-03 12:00+00') ->> 'usersOpen', 'true', 'Στο 80%: ανοιχτό για τους Χρήστες');
select is(authz.ai_budget(timestamptz '2026-11-03 12:00+00') ->> 'publicOpen', 'false', 'Στο 80%: κλειστό για το δημόσιο widget');
select is((select count(*)::integer from public.automations a
            where a.event_type = 'assistant.cap_reached' and a.recipient_permission = 'health.view' and a.is_enabled),
  2, 'Αρχικοί Αυτοματισμοί 57: Ειδοποίηση και email σε όσους βλέπουν Υγεία');

-- ───────────── Υγεία: ετικέτες και όριο ανά εργασία ─────────────
select is(authz.health_job_label('knowledge_index'), 'Μνήμη του Βοηθού', 'Ετικέτα της μνήμης');
select is(authz.health_job_label('assistant_purge'), 'Καθαρισμός Συζητήσεων Βοηθού', 'Ετικέτα του καθαρισμού');
select public.job_run_mark('assistant_purge', true, null, timestamptz '2026-03-01 03:00+00');
select is(public.health_check('outbox', timestamptz '2026-03-02 04:00+00') ->> 'jobs', '0', 'Purge πριν από 25 ώρες: εντάξει');
select is((select count(*)::integer from authz.today_health_rows('00000000-0000-0000-0000-0000000000a1', timestamptz '2026-03-02 04:00+00')
            where id = 'job:assistant_purge'), 0, 'Σήμερα: τίποτα στις 25 ώρες');
select is(public.health_check('outbox', timestamptz '2026-03-02 06:00+00') ->> 'jobs', '1', 'Purge πριν από 27 ώρες: Γεγονός 50');
select is((select count(*)::integer from authz.today_health_rows('00000000-0000-0000-0000-0000000000a1', timestamptz '2026-03-02 06:00+00')
            where id = 'job:assistant_purge'), 1, 'Σήμερα: «Δεν έτρεξε» στις 27 ώρες');
select public.job_run_mark('outbox', true, null, timestamptz '2026-03-02 06:00+00');
select is(public.health_check('google', timestamptz '2026-03-02 06:05+00') ->> 'jobs', '0', 'Outbox στα 5 λεπτά: τίποτα, όπως πριν');
select is(public.health_check('google', timestamptz '2026-03-02 06:11+00') ->> 'jobs', '1', 'Outbox στα 11 λεπτά: Γεγονός 50, όπως πριν');

-- ───────────── Ο Βοηθός: κομμάτια του Κοινού του, ομοιότητα, δημόσια Πακέτα ─────────────
select public.t_as('a2');
select set_config('t.s1', public.knowledge_section_save('{"name":"Οδηγοί"}')->>'id', true);
select public.t_published('pa', 'Πώς κλείνω Γύρισμα', 'Ανοίγεις την Κράτηση.', public.t_role('Πλήρης', 'client'));
select public.t_published('pt', 'Σενάριο πωλήσεων', 'Τα βήματα μιας πώλησης.', public.t_role('Πωλήσεις', 'team'));
select public.t_store('pa', 'Οδηγοί · Πώς κλείνω Γύρισμα · Ανοίγεις την Κράτηση.', 1);
select public.t_store('pt', 'Οδηγοί · Σενάριο πωλήσεων · Τα βήματα μιας πώλησης.', 2);

insert into public.catalogue_items (kind, billing, name, name_en, is_public, shows_price, description_public) values
  ('package', 'monthly', 'Podcast Start', 'Podcast Start', true, true, 'Ένα επεισόδιο podcast κάθε μήνα.'),
  ('package', 'monthly', 'Social Basic', 'Social Basic', true, false, 'Βίντεο για τα social κάθε μήνα.'),
  ('package', 'one_off', 'Εσωτερικό Πακέτο', 'Internal', false, false, '');
insert into public.catalogue_item_amounts (item_id, price)
select i.id, 250 from public.catalogue_items i where i.name = 'Podcast Start';

select public.t_as('b1');
select set_config('t.ctx', public.assistant_context('Πώς κλείνω γύρισμα;', public.t_vec(1))::text, true);
select is((current_setting('t.ctx')::jsonb -> 'chunks' -> 0 ->> 'itemId')::uuid, public.t_id('pa'), 'Πελάτης: το Άρθρο του Κοινού του');
select is(round((current_setting('t.ctx')::jsonb -> 'chunks' -> 0 ->> 'similarity')::numeric, 3), 1.000,
  'Επιστρέφει την ομοιότητα συνημιτόνου (όχι το RRF)');
select is(jsonb_array_length(current_setting('t.ctx')::jsonb -> 'packages'), 2, 'Μόνο τα δημόσια Πακέτα');
select is(public.t_pkg(current_setting('t.ctx')::jsonb, 'Podcast Start', 'price')::numeric, 250::numeric, 'Τιμή όταν «δείχνει τιμή»');
select is(public.t_pkg(current_setting('t.ctx')::jsonb, 'Social Basic', 'price'), null, 'Χωρίς «δείχνει τιμή»: καμία τιμή');
select is(public.t_pkg(current_setting('t.ctx')::jsonb, 'Podcast Start', 'canOpen'), 'false', 'Ο πελάτης δεν ανοίγει τον Κατάλογο');
select is(public.t_pkg(public.assistant_context('πόσο κοστίζει το podcast;', public.t_vec(9)), 'Podcast Start', 'matched'), 'true',
  'Η ερώτηση ταιριάζει με το Πακέτο');
select is(jsonb_array_length(public.assistant_context('ζζζ', public.t_vec(2)) -> 'chunks'), 0,
  'Ο πελάτης δεν βλέπει το Άρθρο της ομάδας ούτε για την ερώτησή του');
select public.t_as('b2');
select is(jsonb_array_length(public.assistant_context('Πώς κλείνω γύρισμα;', public.t_vec(1)) -> 'chunks'), 0,
  'Πελάτης με άλλο Ρόλο: τίποτα');
select public.t_as('a3');
select is((public.assistant_context('ζζζ', public.t_vec(2)) -> 'chunks' -> 0 ->> 'itemId')::uuid, public.t_id('pt'),
  'Ομάδα: το Άρθρο των Ρόλων της');
select throws_ok($$ select public.assistant_context('x', null) $$, 'P0001', 'Λείπει το embedding της ερώτησης',
  'Χωρίς embedding: σφάλμα');

select * from finish();
rollback;
