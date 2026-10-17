-- Υγεία Pα #214: Ίχνος ενεργειών (P1). Άρνηση ανά RPC και ρόλο (ίδιο λάθος για «δεν υπάρχει» και «δεν φαίνεται»),
-- κρυφά ποσά και κόστος ανά πεδίο, στοιχεία μόνο Ιδιοκτήτη, σύμβαση καταλόγου, φίλτρα, περίοδοι σε ώρα Αθήνας, keyset,
-- εξαγωγή με Ίχνος πριν από τα δεδομένα. Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι γραμμές του Ίχνους μπαίνουν
-- απευθείας με σταθερό «at» και id που αρχίζει από «t-», και κάθε έλεγχος φιλτράρει σε αυτά: οι γραμμές που γράφει το
-- πραγματικό now() (migrations, triggers) δεν μπαίνουν ποτέ στη μέτρηση. Σταθερό p_now: 2030-01-15 10:00 UTC (12:00 Αθήνα).
-- Οι authz.* καλούνται ως superuser με τον Χρήστη στα claims· η άρνηση ελέγχεται μέσω των public RPC.
begin;
select plan(66);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Λογιστής · a3 Πωλήσεις · a4 Παραγωγή · a7 Διαχείριση
-- a6 «Διαχείριση χωρίς ποσά» (Διαχείριση χωρίς finance.amounts και finance.cost) · a5 «Ίχνος με ποσά χωρίς κόστος»
-- a8 Ανωνυμοποιημένος Χρήστης ομάδας · b1 Χρήστης πελάτη με «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'nocost@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'noamounts@example.com'),
  ('00000000-0000-0000-0000-0000000000a7', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a8', 'anonymized-7@anonymized.invalid'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ελένη', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Ρένα', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'Κώστας', 'nocost@example.com'),
  ('00000000-0000-0000-0000-0000000000a6', 'Λία', 'noamounts@example.com'),
  ('00000000-0000-0000-0000-0000000000a7', 'Μάρκος', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a8', 'Ανωνυμοποιημένος Χρήστης 7', 'anonymized-7@anonymized.invalid');
insert into public.roles (name, kind) values ('Διαχείριση χωρίς ποσά (τεστ)', 'team'), ('Ίχνος με ποσά (τεστ)', 'team');
insert into public.role_permissions (role_id, permission, scope)
select n.id, rp.permission, rp.scope
  from public.role_permissions rp
  join public.roles d on d.id = rp.role_id and d.name = 'Διαχείριση' and d.kind = 'team'
  join public.roles n on n.name = 'Διαχείριση χωρίς ποσά (τεστ)' and n.kind = 'team'
 where rp.permission not in ('finance.amounts', 'finance.cost');
insert into public.role_permissions (role_id, permission, scope)
select r.id, g.code, 'all'
  from (values ('audit.view'), ('finance.amounts')) as g (code)
  join public.roles r on r.name = 'Ίχνος με ποσά (τεστ)' and r.kind = 'team';
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a4', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000a5', 'Ίχνος με ποσά (τεστ)'),
    ('00000000-0000-0000-0000-0000000000a6', 'Διαχείριση χωρίς ποσά (τεστ)'),
    ('00000000-0000-0000-0000-0000000000a7', 'Διαχείριση'),
    ('00000000-0000-0000-0000-0000000000a8', 'Παραγωγή')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Δεδομένα (χωρίς triggers) ─────────────
set local session_replication_role = replica;

insert into public.clients (id, name, contact_name, contact_email) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', 'Μαρία', 'a@example.com');
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας Πελάτης', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

insert into public.audit_log (at, actor_id, action, entity, entity_id, before, after) values
  -- Κρυφά ποσά και κόστος
  ('2030-01-14 09:00+00', '00000000-0000-0000-0000-0000000000a1', 'update', 'catalogue_item_amounts', 't-mask',
   '{"item_id": "t-mask", "price": 100}', '{"item_id": "t-mask", "price": 120}'),
  ('2030-01-14 09:01+00', '00000000-0000-0000-0000-0000000000a1', 'update', 'catalogue_item_costs', 't-mask',
   '{"item_id": "t-mask", "hours_shoot": 2, "hours_edit": 3, "direct_cost": 40, "direct_cost_note": "Μετακίνηση"}',
   '{"item_id": "t-mask", "hours_shoot": 4, "hours_edit": 3, "direct_cost": 40, "direct_cost_note": "Μετακίνηση"}'),
  ('2030-01-14 09:02+00', '00000000-0000-0000-0000-0000000000a1', 'event', 'invoices', 't-mask',
   '{"number": "A-9", "net": 100, "vat": 24, "total": 124, "mark": "1"}',
   '{"event": "corrected", "reason": "Λάθος", "changes": [{"field": "total", "from": 124, "to": 136}, {"field": "mark", "from": "1", "to": "2"}], "number": "A-9", "net": 110, "vat": 26, "total": 136, "mark": "2"}'),
  -- Μόνο Ιδιοκτήτη
  ('2030-01-14 10:00+00', null, 'insert', 'email_outbox', 't-own', null, '{"to": "x@example.com"}'),
  ('2030-01-14 10:01+00', null, 'insert', 'email_log', 't-own', null, '{"to": "x@example.com"}'),
  ('2030-01-14 10:02+00', '00000000-0000-0000-0000-0000000000a1', 'event', 'gdpr', 't-own', null, '{"event": "exported"}'),
  ('2030-01-14 10:03+00', '00000000-0000-0000-0000-0000000000a1', 'insert', 'gdpr_requests', 't-own', null, '{"kind": "export"}'),
  ('2030-01-14 10:04+00', '00000000-0000-0000-0000-0000000000a1', 'insert', 'subscriptions', 't-own', null,
   '{"provider": "Πάροχος", "monthly_cost": 30}'),
  -- Δράστες: Ιδιοκτήτης, Σύστημα, ανωνυμοποιημένος, Χρήστης πελάτη
  ('2030-01-14 11:00+00', '00000000-0000-0000-0000-0000000000a1', 'update', 'company_settings', 't-who',
   '{"name": "Παλιό"}', '{"name": "Νέο"}'),
  ('2030-01-14 11:01+00', null, 'update', 'company_settings', 't-who', '{"name": "Νέο"}', '{"name": "Νεότερο"}'),
  ('2030-01-14 11:02+00', '00000000-0000-0000-0000-0000000000a8', 'delete', 'company_settings', 't-who',
   '{"name": "Νεότερο"}', null),
  ('2030-01-14 11:03+00', '00000000-0000-0000-0000-0000000000b1', 'event', 'agreements', 't-who', null,
   '{"event": "changes_requested"}'),
  -- Περίοδοι σε ώρα Αθήνας: η αρχή των 7 ημερών είναι 2030-01-09 00:00 Αθήνα = 2030-01-08 22:00 UTC
  ('2030-01-15 09:00+00', null, 'update', 'company_settings', 't-period', '{"a": 1}', '{"a": 2}'),
  ('2030-01-08 22:30+00', null, 'update', 'company_settings', 't-period', '{"a": 2}', '{"a": 3}'),
  ('2030-01-08 21:30+00', null, 'update', 'company_settings', 't-period', '{"a": 3}', '{"a": 4}'),
  ('2029-12-20 10:00+00', null, 'update', 'company_settings', 't-period', '{"a": 4}', '{"a": 5}'),
  ('2029-11-01 10:00+00', null, 'update', 'company_settings', 't-period', '{"a": 5}', '{"a": 6}'),
  -- Στοιχείο και τα παιδιά του: η Συμφωνία t-ag, τα ποσά της, και μια άλλη Συμφωνία
  ('2030-01-13 08:00+00', '00000000-0000-0000-0000-0000000000a1', 'insert', 'agreements', 't-ag', null,
   '{"id": "t-ag", "title": "Social Α"}'),
  ('2030-01-13 08:01+00', '00000000-0000-0000-0000-0000000000a1', 'insert', 'agreement_amounts', 't-ag', null,
   '{"agreement_id": "t-ag", "discount_percent": 10, "discount_months": 2, "dissolution_fee": 0, "vat_rate": 24}'),
  ('2030-01-13 08:02+00', '00000000-0000-0000-0000-0000000000a1', 'insert', 'agreements', 't-ag2', null,
   '{"id": "t-ag2", "title": "Άλλη"}');

-- Σελίδες: 55 γραμμές, δύο με την ίδια στιγμή (το id κρίνει τη σειρά).
insert into public.audit_log (at, actor_id, action, entity, entity_id, after)
select timestamptz '2030-01-10 12:00+00' - make_interval(mins => case when g = 2 then 1 else g end), null, 'update',
       'bank_accounts', 't-page', jsonb_build_object('n', g)
  from generate_series(1, 55) g;

set local session_replication_role = origin;

-- ───────────── Άρνηση: ανώνυμος (δεν έχει EXECUTE) ─────────────
set local role anon;
select throws_ok($$ select public.audit_trail() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει το Ίχνος');
select throws_ok($$ select public.audit_trail_options() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τις επιλογές');
select throws_ok($$ select public.audit_trail_export() $$, '42501', null, 'Ο ανώνυμος δεν εξάγει το Ίχνος');
reset role;

-- ───────────── Άρνηση: χωρίς «Βλέπει ίχνος ενεργειών» (ίδιο λάθος για ό,τι υπάρχει και ό,τι όχι) ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok($$ select public.audit_trail() $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια',
  'Οι Πωλήσεις δεν βλέπουν το Ίχνος');
select throws_ok($$ select public.audit_trail('{"entity": "clients", "id": "00000000-0000-0000-0000-0000000000c1"}') $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Πωλήσεις: Πελάτης που υπάρχει → ίδιο λάθος');
select throws_ok($$ select public.audit_trail('{"entity": "clients", "id": "00000000-0000-0000-0000-0000000000ff"}') $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Πωλήσεις: Πελάτης που δεν υπάρχει → ίδιο λάθος');
select throws_ok($$ select public.audit_trail_options() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν τις επιλογές');
select throws_ok($$ select public.audit_trail_export() $$, '42501', null, 'Οι Πωλήσεις δεν εξάγουν το Ίχνος');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select throws_ok($$ select public.audit_trail() $$, '42501', null, 'Η Παραγωγή δεν βλέπει το Ίχνος');
select throws_ok($$ select public.audit_trail_options() $$, '42501', null, 'Η Παραγωγή δεν βλέπει τις επιλογές');
select throws_ok($$ select public.audit_trail_export() $$, '42501', null, 'Η Παραγωγή δεν εξάγει το Ίχνος');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok($$ select public.audit_trail() $$, '42501', null, 'Ο Λογιστής δεν βλέπει το Ίχνος');
select throws_ok($$ select public.audit_trail_options() $$, '42501', null, 'Ο Λογιστής δεν βλέπει τις επιλογές');
select throws_ok($$ select public.audit_trail_export() $$, '42501', null,
  'Ο Λογιστής δεν εξάγει το Ίχνος (έχει «Εξάγει δεδομένα», όχι «Βλέπει ίχνος»)');
select is(
  (select count(*)::int from jsonb_array_elements(authz.export_datasets(null, date '2030-01-15') -> 'items') i
    where i ->> 'code' = 'audit'),
  0, 'Ο Λογιστής δεν βλέπει το Ίχνος στη λίστα της M2');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok($$ select public.audit_trail() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει το Ίχνος');
select throws_ok($$ select public.audit_trail_options() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει τις επιλογές');
select throws_ok($$ select public.audit_trail_export() $$, '42501', null, 'Ο Χρήστης πελάτη δεν εξάγει το Ίχνος');

select is(
  (select count(*)::int from public.audit_log a
    where a.entity = 'report_exports' and a.after ->> 'subject' = 'audit'),
  0, 'Καμία άρνηση δεν γράφει Ίχνος εξαγωγής');

-- ───────────── Κρυφά ποσά και κόστος ─────────────
-- Διαχείριση χωρίς ποσά: η γραμμή φαίνεται, τα κλειδιά ποσών και κόστους γυρίζουν ως δείκτης, χωρίς τιμή.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a6","role":"authenticated"}', true);
select set_config('t.m', authz.audit_trail_list('{"id": "t-mask"}', null, null, timestamptz '2030-01-15 10:00+00')::text, true);
select is(
  (select string_agg(i ->> 'entity', ',' order by n) from jsonb_array_elements(current_setting('t.m')::jsonb -> 'items')
     with ordinality x (i, n)),
  'invoices,catalogue_item_costs,catalogue_item_amounts', 'Χωρίς ποσά: οι γραμμές ποσών και κόστους φαίνονται');
select is(
  (select (i #>> '{before,price}') || '|' || (i #>> '{after,price}') || '|' || (i -> 'changed')::text
     from jsonb_array_elements(current_setting('t.m')::jsonb -> 'items') i where i ->> 'entity' = 'catalogue_item_amounts'),
  '{"$hidden": "amount"}|{"$hidden": "amount"}|["price"]', 'Χωρίς ποσά: «κρυφό ποσό» και ότι άλλαξε η τιμή, χωρίς την τιμή');
select is(
  (select (i #>> '{after,hours_shoot}') || '|' || (i #>> '{after,direct_cost_note}') || '|' || (i #>> '{after,item_id}')
     from jsonb_array_elements(current_setting('t.m')::jsonb -> 'items') i where i ->> 'entity' = 'catalogue_item_costs'),
  '{"$hidden": "cost"}|{"$hidden": "cost"}|t-mask', 'Χωρίς κόστος: «κρυφό κόστος», τα υπόλοιπα πεδία μένουν');
select is(
  (select (i #>> '{after,total}') || '|' || (i #>> '{after,changes,0,from}') || '|' || (i #>> '{after,changes,0,to}') || '|'
          || (i #>> '{after,changes,1,to}') || '|' || (i #>> '{after,number}')
     from jsonb_array_elements(current_setting('t.m')::jsonb -> 'items') i where i ->> 'entity' = 'invoices'),
  '{"$hidden": "amount"}|{"$hidden": "amount"}|{"$hidden": "amount"}|2|A-9',
  'Διόρθωση Τιμολογίου: κρυφά και τα ποσά της λίστας αλλαγών, ο αριθμός και η ΜΑΡΚ μένουν');
select ok(
  (select string_agg(coalesce(i -> 'before', 'null')::text || coalesce(i -> 'after', 'null')::text, ' ')
     from jsonb_array_elements(current_setting('t.m')::jsonb -> 'items') i) !~ '[0-9]{2}',
  'Καμία τιμή ποσού ή κόστους δεν φεύγει από τη βάση (πριν και μετά χωρίς κανέναν αριθμό)');

-- Με ποσά χωρίς κόστος: η τιμή φαίνεται, το κόστος όχι.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
select set_config('t.m', authz.audit_trail_list('{"id": "t-mask"}', null, null, timestamptz '2030-01-15 10:00+00')::text, true);
select is(
  (select string_agg(coalesce(i #>> '{after,price}', '') || coalesce(i #>> '{after,hours_shoot}', ''), ',' order by n)
     from jsonb_array_elements(current_setting('t.m')::jsonb -> 'items') with ordinality x (i, n)
    where i ->> 'entity' like 'catalogue_item_%'),
  '{"$hidden": "cost"},120', 'Με ποσά χωρίς κόστος: η τιμή φαίνεται, οι ώρες όχι');

-- Ο Ιδιοκτήτης βλέπει τις τιμές.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('t.m', authz.audit_trail_list('{"id": "t-mask"}', null, null, timestamptz '2030-01-15 10:00+00')::text, true);
select is(
  (select string_agg(coalesce(i #>> '{after,price}', i #>> '{after,hours_shoot}', i #>> '{after,changes,0,to}'), ','
                     order by n)
     from jsonb_array_elements(current_setting('t.m')::jsonb -> 'items') with ordinality x (i, n)),
  '136,4,120', 'Ο Ιδιοκτήτης βλέπει ποσά και κόστος');

-- ───────────── Μόνο Ιδιοκτήτη ─────────────
select is(
  (select string_agg(i ->> 'entity', ',' order by i ->> 'entity')
     from jsonb_array_elements(authz.audit_trail_list('{"id": "t-own"}', null, null,
                                                      timestamptz '2030-01-15 10:00+00') -> 'items') i),
  'email_log,email_outbox,gdpr,gdpr_requests,subscriptions', 'Ο Ιδιοκτήτης βλέπει email, GDPR και συνδρομές');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a7","role":"authenticated"}', true);
select is(
  jsonb_array_length(authz.audit_trail_list('{"id": "t-own"}', null, null, timestamptz '2030-01-15 10:00+00') -> 'items'),
  0, 'Η Διαχείριση δεν βλέπει email, GDPR ή συνδρομές');
select is(
  authz.audit_trail_list('{"entity": "gdpr_requests", "id": "t-own"}', null, null, timestamptz '2030-01-15 10:00+00'),
  authz.audit_trail_list('{"entity": "gdpr_requests", "id": "t-none"}', null, null, timestamptz '2030-01-15 10:00+00'),
  'Η Διαχείριση παίρνει την ίδια απάντηση για στοιχείο που δεν φαίνεται και στοιχείο που δεν υπάρχει');
select is(
  (select count(*)::int from jsonb_array_elements(authz.audit_trail_options() -> 'entities') e
    where e ->> 'code' in ('email_outbox', 'email_log', 'gdpr', 'gdpr_requests', 'subscriptions')),
  0, 'Οι επιλογές της Διαχείρισης δεν έχουν τα στοιχεία μόνο Ιδιοκτήτη');
select is(
  (select count(*)::int from jsonb_array_elements(authz.audit_trail_options() -> 'entities') e
    where e ->> 'code' in ('catalogue_item_amounts', 'invoices', 'agreement_costs')),
  3, 'Οι επιλογές έχουν τα στοιχεία με ποσά και κόστος');

-- ───────────── Δράστες και ετικέτες ─────────────
select set_config('t.w', authz.audit_trail_list('{"id": "t-who"}', null, null, timestamptz '2030-01-15 10:00+00')::text, true);
select is(
  (select string_agg((i ->> 'actorName') || ':' || (i ->> 'action'), ',' order by n)
     from jsonb_array_elements(current_setting('t.w')::jsonb -> 'items') with ordinality x (i, n)),
  'Κώστας Πελάτης:event,Ανωνυμοποιημένος Χρήστης 7:delete,Σύστημα:update,Γιώργος:update',
  'Το τρέχον όνομα του δράστη: Χρήστης πελάτη, ανωνυμοποιημένος, Σύστημα, Χρήστης ομάδας');
select is(
  (select (i ->> 'entityLabel') || '|' || (i ->> 'areaLabel') || '|' || (i ->> 'subject')
     from jsonb_array_elements(current_setting('t.w')::jsonb -> 'items') with ordinality x (i, n) where n = 4),
  'Στοιχεία Εταιρείας|Ρυθμίσεις|Νέο', 'Ετικέτα, περιοχή και όνομα του στοιχείου από τον κατάλογο');
select is(
  (select string_agg(i ->> 'actorName', ',')
     from jsonb_array_elements(authz.audit_trail_list(
            '{"id": "t-who", "who": "00000000-0000-0000-0000-0000000000a1"}', null, null,
            timestamptz '2030-01-15 10:00+00') -> 'items') i),
  'Γιώργος', 'Φίλτρο «πρόσωπο»');
select is(
  (select string_agg(i ->> 'actorName', ',')
     from jsonb_array_elements(authz.audit_trail_list('{"id": "t-who", "who": "system"}', null, null,
                                                      timestamptz '2030-01-15 10:00+00') -> 'items') i),
  'Σύστημα', 'Φίλτρο «Σύστημα»: μόνο ό,τι έγινε χωρίς Χρήστη');
select is(
  (select string_agg(i ->> 'action', ',')
     from jsonb_array_elements(authz.audit_trail_list('{"id": "t-who", "action": "delete"}', null, null,
                                                      timestamptz '2030-01-15 10:00+00') -> 'items') i),
  'delete', 'Φίλτρο «είδος ενέργειας»');
select is(
  (select count(*)::int
     from jsonb_array_elements(authz.audit_trail_list('{"id": "t-who", "area": "settings"}', null, null,
                                                      timestamptz '2030-01-15 10:00+00') -> 'items') i),
  3, 'Φίλτρο «περιοχή»: μόνο οι Ρυθμίσεις, όχι η Συμφωνία');
select is(
  jsonb_array_length(authz.audit_trail_list('{"id": "t-who", "area": "nowhere"}', null, null,
                                            timestamptz '2030-01-15 10:00+00') -> 'items'),
  0, 'Άγνωστη περιοχή: καμία γραμμή, όχι λάθος');
select throws_ok(
  $$ select authz.audit_trail_list('{"action": "drop"}', null, null, timestamptz '2030-01-15 10:00+00') $$,
  'P0001', 'Άγνωστο φίλτρο', 'Άγνωστο είδος ενέργειας → P0001');
select throws_ok(
  $$ select authz.audit_trail_list('{"period": "90d"}', null, null, timestamptz '2030-01-15 10:00+00') $$,
  'P0001', 'Άγνωστο φίλτρο', 'Άγνωστη περίοδος → P0001');
select throws_ok(
  $$ select authz.audit_trail_list('{"who": "κάποιος"}', null, null, timestamptz '2030-01-15 10:00+00') $$,
  'P0001', 'Άγνωστο φίλτρο', 'Πρόσωπο που δεν είναι id → P0001');

-- ───────────── Στοιχείο με τα παιδιά του ─────────────
select set_config('t.a', authz.audit_trail_list('{"entity": "agreements", "id": "t-ag"}', null, null,
                                                timestamptz '2030-01-15 10:00+00')::text, true);
select is(
  (select string_agg(i ->> 'entity', ',' order by n) from jsonb_array_elements(current_setting('t.a')::jsonb -> 'items')
     with ordinality x (i, n)),
  'agreement_amounts,agreements', 'Το στοιχείο φέρνει και τα παιδιά του (τα ποσά της Συμφωνίας), όχι άλλες Συμφωνίες');
select is(
  (current_setting('t.a')::jsonb -> 'subject')::text, '{"name": "Social Α", "label": "Συμφωνία"}',
  'Η απάντηση λέει ποιο στοιχείο είναι (για το chip)');

-- ───────────── Περίοδοι σε ώρα Αθήνας ─────────────
select is(
  (select string_agg(i #>> '{after,a}', ',' order by n)
     from jsonb_array_elements(authz.audit_trail_list('{"id": "t-period", "period": "7d"}', null, null,
                                                      timestamptz '2030-01-15 10:00+00') -> 'items') with ordinality x (i, n)),
  '2,3', '7 μέρες: από τα μεσάνυχτα Αθήνας της 9/1 (00:30 Αθήνα μέσα, 23:30 της 8/1 έξω)');
select is(
  (select string_agg(i #>> '{after,a}', ',' order by n)
     from jsonb_array_elements(authz.audit_trail_list('{"id": "t-period", "period": "30d"}', null, null,
                                                      timestamptz '2030-01-15 10:00+00') -> 'items') with ordinality x (i, n)),
  '2,3,4,5', '30 μέρες: από τις 17/12 ώρα Αθήνας');
select is(
  jsonb_array_length(authz.audit_trail_list('{"id": "t-period"}', null, null, timestamptz '2030-01-15 10:00+00') -> 'items'),
  5, 'Όλο: χωρίς όριο');

-- ───────────── Σελίδες των 50 (keyset) ─────────────
select set_config('t.p1', authz.audit_trail_list('{"id": "t-page"}', null, null, timestamptz '2030-01-15 10:00+00')::text, true);
select is(
  jsonb_array_length(current_setting('t.p1')::jsonb -> 'items') || '|' || (current_setting('t.p1')::jsonb ->> 'hasMore'),
  '50|true', 'Πρώτη σελίδα: 50 γραμμές και «υπάρχουν παλαιότερες»');
select is(
  (select string_agg(i #>> '{after,n}', ',' order by n) from jsonb_array_elements(current_setting('t.p1')::jsonb -> 'items')
     with ordinality x (i, n) where n <= 3),
  '2,1,3', 'Νεότερη πρώτη· στην ίδια στιγμή πρώτο το μεγαλύτερο id');
select set_config('t.p2', authz.audit_trail_list('{"id": "t-page"}',
  (current_setting('t.p1')::jsonb #>> '{items,49,at}')::timestamptz,
  (current_setting('t.p1')::jsonb #>> '{items,49,id}')::bigint, timestamptz '2030-01-15 10:00+00')::text, true);
select is(
  (select string_agg(i #>> '{after,n}', ',' order by n) from jsonb_array_elements(current_setting('t.p2')::jsonb -> 'items')
     with ordinality x (i, n)) || '|' || (current_setting('t.p2')::jsonb ->> 'hasMore'),
  '51,52,53,54,55|false', 'Δεύτερη σελίδα: οι υπόλοιπες 5, χωρίς επικάλυψη, τέλος');

-- ───────────── Σύμβαση καταλόγου ─────────────
reset role;
select is_empty(
  $$ select m[1] from regexp_matches(pg_get_functiondef('authz.audit_entity_allowed(text)'::regprocedure),
                                     'when ''([a-z_]+)'' then', 'g') m
     except select e.entity from public.audit_entities e $$,
  'Κάθε στοιχείο του allowlist έχει γραμμή στον κατάλογο');
select is_empty(
  $$ select e.entity from public.audit_entities e
     except select m[1] from regexp_matches(pg_get_functiondef('authz.audit_entity_allowed(text)'::regprocedure),
                                            'when ''([a-z_]+)'' then', 'g') m $$,
  'Κάθε γραμμή του καταλόγου είναι στο allowlist');
select ok(
  (select count(distinct m[1]) from regexp_matches(pg_get_functiondef('authz.audit_entity_allowed(text)'::regprocedure),
                                                   'when ''([a-z_]+)'' then', 'g') m) >= 86,
  'Ο έλεγχος βρήκε ολόκληρο το allowlist');
select is_empty(
  $$ select c.relname from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid = t.tgrelid
      where t.tgfoid = 'authz.audit_row()'::regprocedure
     except select e.entity from public.audit_entities e $$,
  'Κάθε πίνακας με trigger Ίχνους έχει γραμμή στον κατάλογο');
select is_empty(
  $$ select e.entity from public.audit_entities e
      where e.area is null or e.amount_keys is null or e.cost_keys is null or length(trim(e.label)) = 0 $$,
  'Κάθε στοιχείο έχει περιοχή, ετικέτα και δηλωμένα κλειδιά ποσών και κόστους (ή κανένα)');
select is_empty(
  $$ select e.entity || '.' || k from public.audit_entities e cross join unnest(e.amount_keys || e.cost_keys) k
      where to_regclass('public.' || e.entity) is not null
        and not exists (select 1 from information_schema.columns c
                         where c.table_schema = 'public' and c.table_name = e.entity and c.column_name = k) $$,
  'Τα δηλωμένα κλειδιά είναι στήλες του πίνακα');
select is_empty(
  $$ select e.entity from public.audit_entities e
      where e.visibility = 'masked' and cardinality(e.amount_keys) + cardinality(e.cost_keys) = 0 $$,
  'Όποιο στοιχείο φαίνεται με απόκρυψη έχει κλειδιά να κρύψει');
select is(
  (select string_agg(e.entity, ',' order by e.entity) from public.audit_entities e where e.visibility = 'owner'),
  'email_log,email_outbox,gdpr,gdpr_requests,subscriptions', 'Μόνο Ιδιοκτήτη: email, GDPR, συνδρομές');

-- ───────────── Εξαγωγή: Ίχνος πριν από τα δεδομένα ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a6","role":"authenticated"}', true);
select set_config('t.x', authz.audit_trail_export('{"id": "t-mask", "period": "30d"}', 'csv',
                                                  timestamptz '2030-01-15 10:00+00')::text, true);
select is(
  (select (a.after ->> 'kind') || '|' || (a.after ->> 'subject') || '|' || (a.after ->> 'rows') || '|' || (a.after ->> 'format')
          || '|' || (a.after #>> '{filters,id}') || '|' || (a.after #>> '{filters,period}') || '|' || a.actor_id::text
     from public.audit_log a
    where a.entity = 'report_exports' and a.entity_id = '00000000-0000-0000-0000-0000000000a6'
    order by a.id desc limit 1),
  'dataset|audit|3|csv|t-mask|30d|00000000-0000-0000-0000-0000000000a6',
  'Η εξαγωγή γράφεται στο Ίχνος: ποιος, τι, φίλτρα, γραμμές, μορφή');
select is(
  (select (r #>> '{after,price}') from jsonb_array_elements(current_setting('t.x')::jsonb -> 'rows') r
    where r ->> 'entity' = 'catalogue_item_amounts') || '|' || (current_setting('t.x')::jsonb ->> 'truncated'),
  '{"$hidden": "amount"}|false', 'Η εξαγωγή έχει την ίδια απόκρυψη με την οθόνη');
select throws_ok(
  $$ select authz.audit_trail_export('{}', 'pdf', timestamptz '2030-01-15 10:00+00') $$,
  'P0001', 'Άγνωστη μορφή αρχείου', 'Άγνωστη μορφή → P0001');
select is(
  (select count(*)::int from jsonb_array_elements(authz.export_datasets(null, date '2030-01-15') -> 'items') i
    where i ->> 'code' = 'audit' and (i ->> 'usesPeriod') = 'false' and (i ->> 'rowCount')::int > 0),
  1, 'Με «Βλέπει ίχνος» το Ίχνος είναι σύνολο της M2');

-- ───────────── Η εφαρμογή (authenticated) και τα κλειστά ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select public.audit_trail('{"period": "7d"}') $$, 'Η εφαρμογή καλεί τη λίστα');
select lives_ok($$ select public.audit_trail_options() $$, 'Η εφαρμογή καλεί τις επιλογές');
select throws_ok($$ select authz.audit_trail_list('{}', null, null, now()) $$, '42501', null,
  'Οι authz.audit_trail_* είναι κλειστές για την εφαρμογή (μόνο μέσω public RPC)');
reset role;

select is(
  (select count(*)::int from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'authz' and (p.proname like 'audit\_trail%' or p.proname in ('audit_mask', 'audit_changed_keys',
                                                                                    'audit_subject', 'audit_period_start'))
      and (pg_catalog.has_function_privilege('anon', p.oid, 'execute')
           or pg_catalog.has_function_privilege('authenticated', p.oid, 'execute'))),
  0, 'Καμία νέα authz.audit_* δεν εκτελείται από anon ή authenticated');
select is(
  (select count(*)::int from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'audit\_trail%'
      and (pg_catalog.has_function_privilege('anon', p.oid, 'execute')
           or not p.prosecdef or not ('search_path=""' = any (coalesce(p.proconfig, '{}'))))),
  0, 'Τα public.audit_trail*: security definer, search_path κενό, όχι για τον ανώνυμο');

select * from finish();
rollback;
