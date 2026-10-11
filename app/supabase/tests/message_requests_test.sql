-- Μηνύματα Jδ #163: Αιτήματα. Άρνηση ανά ρόλο, δήλωση και ανάθεση (Μ9, Μ10), κλείσιμο, δημιουργία Παραδοτέου / Γυρίσματος σε μία
-- συναλλαγή (Μ11), αλλαγή μετά την έγκριση στη Συνομιλία και στην ουρά (Μ12), «ανοιχτό Χ μέρες» (Μ13), όψεις ομάδας και πελάτη.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι ημερομηνίες Συμφωνίας και Γυρίσματος είναι του 2027· το «ανοιχτό Χ μέρες»
-- ελέγχεται μετακινώντας το declared_at στο παρελθόν.
begin;
select plan(167);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Λογιστής · a3 Πωλήσεις (Υπεύθυνος του Α) · a4 Παραγωγή (Υπεύθυνος της Παραγωγής του Α) · a5 Παραγωγή (ξένος)
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

-- Πελάτης Α (της Άννας) με μηνιαία Συμφωνία. Πελάτης Β χωρίς Υπεύθυνο.
insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@client-a.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000a3');
insert into public.clients (id, name, afm, contact_name, contact_email) values
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', '987654321', 'Νίκος Κίνης', 'b@example.com');
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο δημόσιο',
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a3', 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3;

insert into public.catalogue_items (id, kind, billing, name, name_en, unit, retired_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'package', 'monthly', 'Μηνιαίο πακέτο (τεστ)', 'Monthly (test)', '', null);
insert into public.catalogue_item_amounts (item_id, price) values ('00000000-0000-0000-0000-0000000000d1', 1000);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost) values ('00000000-0000-0000-0000-0000000000d1', 6, 14, 0);
insert into public.catalogue_item_provisions (item_id, kind_id, quantity)
select '00000000-0000-0000-0000-0000000000d1', k.id, p.qty
  from (values ('shoot', 2), ('reel', 8)) as p (code, qty)
  join public.provision_kinds k on k.code = p.code;
insert into public.cost_months (month, expenses_total, productive_hours)
values (date_trunc('month', now() at time zone 'Europe/Athens')::date, 8800, 220);

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

-- Παραγωγή του Πελάτη Β χωρίς Συμφωνία και χωρίς Υπεύθυνο: οι ξένοι κλειδιά παρακάμπτονται μόνο για αυτή την εισαγωγή.
set local session_replication_role = replica;
insert into public.productions (id, title, client_id, agreement_id, owner_id, state) values
  ('00000000-0000-0000-0000-0000000000f2', 'Reel Β', '00000000-0000-0000-0000-0000000000c2', gen_random_uuid(), null, 'open');
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

create function public.t_pk(p_code text) returns uuid
language sql stable
as $$ select k.id from public.provision_kinds k where k.code = p_code; $$;

-- Το Αίτημα ενός Μηνύματος όπως φαίνεται στη Συνομιλία του Πελάτη (null αν δεν είναι Αίτημα).
create function public.t_req(p_client text, p_msg text) returns jsonb
language sql
as $$
  select x->'request' from jsonb_array_elements(public.messages_thread(p_client::uuid)->'messages') x
   where x->>'id' = current_setting('t.' || p_msg);
$$;

create function public.t_item(p_view text, p_msg text) returns jsonb
language sql
as $$
  select i from jsonb_array_elements(public.message_requests_view(p_view)->'items') i
   where i->>'messageId' = current_setting('t.' || p_msg);
$$;

-- Μήνυμα πελάτη Α με Αίτημα.
create function public.t_creq(p_key text, p_kind text, p_production text default null) returns void
language plpgsql
as $$
begin
  perform public.t_msg(p_key, jsonb_build_object(
    'clientId', '00000000-0000-0000-0000-0000000000c1', 'productionId', p_production, 'body', 'Αίτημα ' || p_key,
    'request', jsonb_build_object('kind', p_kind)));
end;
$$;

-- ───────────── Συμφωνία και Παραγωγή του Πελάτη Α ─────────────
select public.t_as('a1');
select set_config('t.a', public.agreement_create('00000000-0000-0000-0000-0000000000d2', 'monthly', 'Μηνιαίο τεστ')::text, true);
select public.agreement_update_basics(current_setting('t.a')::uuid, 'Μηνιαίο τεστ', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, 6);
select public.agreement_add_catalogue_line(current_setting('t.a')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_set_recipients(current_setting('t.a')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a')::uuid, (now() at time zone 'Europe/Athens')::date, 'Μαρία Παπαδάκη', date '2027-03-01', 'contract.pdf');
select set_config('t.reel', public.t_pk('reel')::text, true);
select set_config('t.shoot', public.t_pk('shoot')::text, true);
select set_config('t.pa1', (select pr.id::text from public.productions pr
                             join public.agreement_periods pe on pe.id = pr.period_id
                            where pe.agreement_id = current_setting('t.a')::uuid and pe.n = 1), true);
-- Η Παραγωγή του Α περνά στον Νίκο (Παραγωγή, «όσα με αφορούν»).
select public.production_transfer(current_setting('t.pa1')::uuid, '00000000-0000-0000-0000-0000000000a4');

select is((select request_open_days from public.message_settings), 3, 'Προεπιλογή: ανοιχτό 3 μέρες');
select ok(authz.audit_entity_allowed('message_requests'), 'Το Ίχνος καταγράφει τα Αιτήματα (Ιδιοκτήτης με «Βλέπει ίχνος»)');
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'message_requests' and c.relrowsecurity),
  1, 'RLS ενεργό στον πίνακα Αιτημάτων');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'message_requests'), 0, 'Κανένα policy: ο πίνακας είναι κλειστός');

-- ───────────── Άρνηση ανά ρόλο: ανώνυμος, Λογιστής, πίνακας ─────────────
set local role anon;
select throws_ok($$ select public.message_mark_request(gen_random_uuid(), 'other') $$, '42501', null, 'Ο ανώνυμος δεν σημειώνει Αίτημα');
select throws_ok($$ select public.message_request_assign(gen_random_uuid(), null) $$, '42501', null, 'Ο ανώνυμος δεν μεταβιβάζει');
select throws_ok($$ select public.message_request_close(gen_random_uuid(), '{"outcome":"done","comment":"x"}') $$, '42501', null, 'Ο ανώνυμος δεν κλείνει Αίτημα');
select throws_ok($$ select public.message_request_create_deliverable(gen_random_uuid(), '{}') $$, '42501', null, 'Ο ανώνυμος δεν δημιουργεί Παραδοτέο από Αίτημα');
select throws_ok($$ select public.message_request_create_filming(gen_random_uuid(), '{}') $$, '42501', null, 'Ο ανώνυμος δεν δημιουργεί Γύρισμα από Αίτημα');
select throws_ok($$ select public.message_requests_view('open') $$, '42501', null, 'Ο ανώνυμος δεν βλέπει την ουρά');
select throws_ok($$ select public.client_requests_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Αιτήματα πελάτη');
reset role;

select public.t_as('a2');
select throws_ok($$ select public.message_mark_request(gen_random_uuid(), 'other') $$, '42501', null, 'Ο Λογιστής δεν σημειώνει Αίτημα');
select throws_ok($$ select public.message_request_assign(gen_random_uuid(), null) $$, '42501', null, 'Ο Λογιστής δεν μεταβιβάζει');
select throws_ok($$ select public.message_request_close(gen_random_uuid(), '{"outcome":"done","comment":"x"}') $$, '42501', null, 'Ο Λογιστής δεν κλείνει Αίτημα');
select throws_ok($$ select public.message_requests_view('open') $$, '42501', null, 'Ο Λογιστής δεν βλέπει την ουρά');
select throws_ok($$ select public.client_requests_view() $$, '42501', null, 'Ο Λογιστής δεν βλέπει Αιτήματα πελάτη');

select public.t_as('a1');
set local role authenticated;
select throws_ok($$ select * from public.message_requests $$, '42501', null, 'Ο πίνακας Αιτημάτων είναι κλειστός');
reset role;

-- ───────────── Δήλωση από τον πελάτη και ανάθεση (Μ9, Μ10) ─────────────
select public.t_as('b1');
select public.t_creq('r1', 'deliverable', current_setting('t.pa1'));
select public.t_creq('r2', 'other');
select public.t_creq('r5', 'deliverable');
select public.t_creq('r6', 'filming', current_setting('t.pa1'));
select public.t_creq('r10', 'other');
select public.t_msg('p1', '{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"Απλό Μήνυμα"}');
select public.t_msg('p2', '{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"Άλλο απλό Μήνυμα"}');
select public.t_as('b3');
select public.t_msg('r3', '{"clientId":"00000000-0000-0000-0000-0000000000c2","body":"Αίτημα Β","request":{"kind":"other"}}');
select public.t_msg('pb', '{"clientId":"00000000-0000-0000-0000-0000000000c2","productionId":"00000000-0000-0000-0000-0000000000f2","body":"Αίτημα Β με ετικέτα","request":{"kind":"other"}}');

select public.t_as('a1');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r1')->>'assigneeId', '00000000-0000-0000-0000-0000000000a4', 'Με ετικέτα: ο υπεύθυνος της Παραγωγής');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r6')->>'assigneeName', 'Νίκος', 'Με ετικέτα: φαίνεται το όνομα του υπευθύνου');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r2')->>'assigneeId', '00000000-0000-0000-0000-0000000000a3', 'Χωρίς ετικέτα: ο Υπεύθυνος Πελάτη');
select is(public.t_req('00000000-0000-0000-0000-0000000000c2', 'r3')->>'assigneeId', null, 'Χωρίς ετικέτα και χωρίς Υπεύθυνο Πελάτη: Χωρίς υπεύθυνο');
select is(public.t_req('00000000-0000-0000-0000-0000000000c2', 'pb')->>'assigneeId', null, 'Παραγωγή χωρίς υπεύθυνο και Πελάτης χωρίς Υπεύθυνο: Χωρίς υπεύθυνο');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r1')->>'kind', 'deliverable', 'Το είδος αποθηκεύεται');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r1')->>'declaredBy', 'client', 'Δηλώθηκε από τον πελάτη');
select is(jsonb_typeof(public.t_req('00000000-0000-0000-0000-0000000000c1', 'p1')), 'null', 'Το απλό Μήνυμα δεν έχει Αίτημα');

select public.t_as('b2');
select throws_ok(
  $$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"x","request":{"kind":"other"}}') $$,
  '42501', null, 'Ο πελάτης χωρίς c.chatWrite δεν δηλώνει Αίτημα');
select public.t_as('b1');
select throws_ok(
  $$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"x","request":{"kind":"change"}}') $$,
  'P0001', null, 'Η «αλλαγή μετά την έγκριση» δεν δηλώνεται από τη Συνομιλία');
select throws_ok(
  $$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"x","request":{}}') $$,
  'P0001', null, 'Αίτημα χωρίς είδος απορρίπτεται');
select throws_ok(
  $$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"x","request":"other"}') $$,
  'P0001', null, 'Το request πρέπει να είναι αντικείμενο');
select public.t_as('a1');
select throws_ok(
  $$ select public.message_send('{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"x","request":{"kind":"other"}}') $$,
  'P0001', null, 'Η ομάδα δεν δηλώνει Αίτημα κατά την αποστολή');

-- Ο πελάτης δεν βλέπει υπεύθυνο, μέρες ή δυνατότητες.
select public.t_as('b1');
select ok(not (public.t_req('00000000-0000-0000-0000-0000000000c1', 'r2') ? 'assigneeId'), 'Ο πελάτης δεν βλέπει υπεύθυνο');
select ok(not (public.t_req('00000000-0000-0000-0000-0000000000c1', 'r2') ? 'daysOpen'), 'Ο πελάτης δεν βλέπει μέρες');
select ok(not (public.t_req('00000000-0000-0000-0000-0000000000c1', 'r2') ? 'stale'), 'Ο πελάτης δεν βλέπει σήμα προσοχής');
select ok(not (public.t_req('00000000-0000-0000-0000-0000000000c1', 'r2') ? 'canHandle'), 'Ο πελάτης δεν βλέπει δυνατότητες χειρισμού');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r2')->>'state', 'open', 'Ο πελάτης βλέπει την κατάσταση');

-- ───────────── Σημείωση από την ομάδα (Μ9) ─────────────
select public.t_as('a1');
select public.t_msg('tm1', '{"clientId":"00000000-0000-0000-0000-0000000000c1","body":"Από την ομάδα"}');
select throws_ok($$ select public.message_mark_request(current_setting('t.tm1')::uuid, 'other') $$, 'P0001', null, 'Η ομάδα δεν σημειώνει δικό της Μήνυμα');
select public.t_as('a5');
select throws_ok($$ select public.message_mark_request(current_setting('t.p1')::uuid, 'other') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Μη ορατό Μήνυμα: 42501');
select throws_ok($$ select public.message_mark_request(gen_random_uuid(), 'other') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ανύπαρκτο Μήνυμα: το ίδιο 42501');
select public.t_as('b1');
select throws_ok($$ select public.message_mark_request(current_setting('t.p1')::uuid, 'other') $$, '42501', null, 'Ο πελάτης δεν σημειώνει Αίτημα');
select public.t_as('b3');
select throws_ok($$ select public.message_mark_request(current_setting('t.p1')::uuid, 'other') $$, '42501', null, 'Πελάτης άλλου Πελάτη δεν σημειώνει Αίτημα');
select public.t_as('a4');
select throws_ok($$ select public.message_mark_request(current_setting('t.p2')::uuid, 'other') $$, '42501', null, 'Μέλος Παραγωγής δεν βλέπει Μήνυμα χωρίς ετικέτα της Παραγωγής του');
select public.t_as('a3');
select throws_ok($$ select public.message_mark_request(current_setting('t.p1')::uuid, 'change') $$, 'P0001', null, 'Η «αλλαγή μετά την έγκριση» δεν σημειώνεται από τη Συνομιλία');
select throws_ok($$ select public.message_mark_request(current_setting('t.p1')::uuid, null) $$, 'P0001', null, 'Το είδος είναι υποχρεωτικό');
select lives_ok($$ select public.message_mark_request(current_setting('t.p1')::uuid, 'filming') $$, 'Ο Υπεύθυνος του Πελάτη σημειώνει Μήνυμα του πελάτη ως Αίτημα');
select throws_ok($$ select public.message_mark_request(current_setting('t.p1')::uuid, 'other') $$, 'P0001', null, 'Το Μήνυμα που είναι ήδη Αίτημα δεν ξανασημειώνεται');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'p1')->>'declaredBy', 'team', 'Δηλώθηκε από την ομάδα');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'p1')->>'assigneeId', '00000000-0000-0000-0000-0000000000a3', 'Σημειωμένο χωρίς ετικέτα: ο Υπεύθυνος Πελάτη');

-- ───────────── Κλείσιμο ─────────────
select public.t_as('a4');
select throws_ok($$ select public.message_request_close(current_setting('t.r2')::uuid, '{"outcome":"done","comment":"ok"}') $$, '42501', null, 'Μη υπεύθυνος χωρίς clients.transfer δεν κλείνει');
select public.t_as('a5');
select throws_ok($$ select public.message_request_close(current_setting('t.r2')::uuid, '{"outcome":"done","comment":"ok"}') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Μη ορατό Αίτημα: 42501');
select public.t_as('b1');
select throws_ok($$ select public.message_request_close(current_setting('t.r2')::uuid, '{"outcome":"done","comment":"ok"}') $$, '42501', null, 'Ο πελάτης δεν κλείνει Αίτημα');
select public.t_as('b3');
select throws_ok($$ select public.message_request_close(current_setting('t.r2')::uuid, '{"outcome":"done","comment":"ok"}') $$, '42501', null, 'Πελάτης άλλου Πελάτη δεν κλείνει Αίτημα');
select public.t_as('a3');
select throws_ok($$ select public.message_request_close(current_setting('t.r2')::uuid, '{"outcome":"done"}') $$, 'P0001', 'Χρειάζεται τουλάχιστον ένα: σύνδεσμος ή σχόλιο', 'Ολοκλήρωση χωρίς σύνδεσμο ή σχόλιο');
select throws_ok($$ select public.message_request_close(current_setting('t.r2')::uuid, '{"outcome":"done","link":"javascript:alert(1)"}') $$, 'P0001', null, 'Σύνδεσμος javascript: απορρίπτεται');
select throws_ok($$ select public.message_request_close(current_setting('t.r2')::uuid, '{"outcome":"done","link":"http://example.com/a"}') $$, 'P0001', null, 'Σύνδεσμος http:// απορρίπτεται');
select throws_ok($$ select public.message_request_close(current_setting('t.r2')::uuid, '{"outcome":"done","comment":"δες http://example.com"}') $$, 'P0001', null, 'Σχόλιο με http:// απορρίπτεται');
select throws_ok($$ select public.message_request_close(current_setting('t.r2')::uuid, '{"outcome":"rejected"}') $$, 'P0001', 'Η απόρριψη θέλει απάντηση προς τον πελάτη', 'Απόρριψη χωρίς απάντηση');
select throws_ok($$ select public.message_request_close(current_setting('t.r2')::uuid, '{"outcome":"rejected","reply":"   "}') $$, 'P0001', null, 'Απόρριψη με κενή απάντηση');
select throws_ok($$ select public.message_request_close(current_setting('t.r2')::uuid, '{"outcome":"other"}') $$, 'P0001', null, 'Άγνωστο αποτέλεσμα απορρίπτεται');
select throws_ok($$ select public.message_request_close(current_setting('t.tm1')::uuid, '{"outcome":"done","comment":"x"}') $$, 'P0001', 'Το Μήνυμα δεν είναι Αίτημα', 'Μήνυμα που δεν είναι Αίτημα δεν κλείνει');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r2')->>'state', 'open', 'Οι αποτυχίες άφησαν το Αίτημα ανοιχτό');
select lives_ok($$ select public.message_request_close(current_setting('t.r2')::uuid, '{"outcome":"done","link":"https://example.com/reel","comment":"Έτοιμο"}') $$, 'Ο υπεύθυνος ολοκληρώνει με σύνδεσμο και σχόλιο');
select throws_ok($$ select public.message_request_close(current_setting('t.r2')::uuid, '{"outcome":"done","comment":"ξανά"}') $$, 'P0001', 'Το Αίτημα έχει ήδη κλείσει', 'Δεύτερο κλείσιμο απορρίπτεται');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r2')->>'state', 'done', 'Το Αίτημα είναι ολοκληρωμένο');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r2')->>'link', 'https://example.com/reel', 'Ο σύνδεσμος αποθηκεύτηκε');
select is((public.t_req('00000000-0000-0000-0000-0000000000c1', 'r2')->>'canHandle')::boolean, false, 'Κλεισμένο: δεν υπάρχει χειρισμός');
select public.t_as('b1');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r2')->>'comment', 'Έτοιμο', 'Ο πελάτης βλέπει το σχόλιο');
select public.t_as('a1');
select throws_ok($$ select public.message_request_close(current_setting('t.r10')::uuid, '{"outcome":"done","comment":"δες http://x.gr"}') $$, 'P0001', null, 'Σχόλιο με http:// απορρίπτεται και από τον Ιδιοκτήτη');
select lives_ok($$ select public.message_request_close(current_setting('t.r3')::uuid, '{"outcome":"rejected","reply":"Δεν το κάνουμε αυτό"}') $$, 'Όποιος μεταβιβάζει κλείνει και Αίτημα χωρίς υπεύθυνο (απόρριψη)');
select throws_ok($$ select public.message_request_close(current_setting('t.r3')::uuid, '{"outcome":"rejected","reply":"ξανά"}') $$, 'P0001', null, 'Η απόρριψη δεν ξανακλείνει');

-- ───────────── Μεταβίβαση (Μ10) ─────────────
select public.t_as('a3');
select throws_ok($$ select public.message_request_assign(current_setting('t.r5')::uuid, '00000000-0000-0000-0000-0000000000a1') $$, '42501', null, 'Χωρίς clients.transfer δεν μεταβιβάζεις');
select public.t_as('b1');
select throws_ok($$ select public.message_request_assign(current_setting('t.r5')::uuid, null) $$, '42501', null, 'Ο πελάτης δεν μεταβιβάζει');
select public.t_as('a2');
select throws_ok($$ select public.message_request_assign(current_setting('t.r5')::uuid, null) $$, '42501', null, 'Ο Λογιστής δεν μεταβιβάζει');
select public.t_as('a1');
select throws_ok($$ select public.message_request_assign(current_setting('t.r5')::uuid, '00000000-0000-0000-0000-0000000000a2') $$, 'P0001', null, 'Νέος υπεύθυνος χωρίς πρόσβαση στη Συνομιλία (Λογιστής)');
select throws_ok($$ select public.message_request_assign(current_setting('t.r5')::uuid, gen_random_uuid()) $$, 'P0001', null, 'Νέος υπεύθυνος που δεν είναι μέλος της ομάδας');
select lives_ok($$ select public.message_request_assign(current_setting('t.r5')::uuid, '00000000-0000-0000-0000-0000000000a1') $$, 'Μεταβίβαση σε ενεργό μέλος');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r5')->>'assigneeName', 'Γιώργος', 'Ο νέος υπεύθυνος φαίνεται');
select lives_ok($$ select public.message_request_assign(current_setting('t.r5')::uuid, null) $$, 'Μεταβίβαση σε «Χωρίς υπεύθυνο»');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r5')->>'assigneeId', null, 'Το Αίτημα είναι Χωρίς υπεύθυνο');
select throws_ok($$ select public.message_request_assign(current_setting('t.r2')::uuid, null) $$, 'P0001', 'Το Αίτημα έχει ήδη κλείσει', 'Κλεισμένο Αίτημα δεν μεταβιβάζεται');
select throws_ok($$ select public.message_request_assign(current_setting('t.tm1')::uuid, null) $$, 'P0001', 'Το Μήνυμα δεν είναι Αίτημα', 'Μήνυμα που δεν είναι Αίτημα δεν μεταβιβάζεται');
select lives_ok($$ select public.message_set_tag(current_setting('t.r10')::uuid, current_setting('t.pa1')::uuid) $$, 'Αλλαγή ετικέτας σε Αίτημα');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r10')->>'assigneeId', '00000000-0000-0000-0000-0000000000a3', 'Η αλλαγή ετικέτας δεν αλλάζει υπεύθυνο');

-- ───────────── Δημιουργία Παραδοτέου από Αίτημα (Μ11) ─────────────
-- Το r1 περνά στην Άννα (Πωλήσεις), που δεν έχει deliverables.work.
select public.message_request_assign(current_setting('t.r1')::uuid, '00000000-0000-0000-0000-0000000000a3');
select public.t_as('a4');
select throws_ok($$ select public.message_request_close(current_setting('t.r1')::uuid, '{"outcome":"done","comment":"ok"}') $$, '42501', null, 'Ορατό Αίτημα άλλου υπευθύνου: χωρίς clients.transfer δεν κλείνει');
select public.t_as('a3');
select throws_ok(
  $$ select public.message_request_create_deliverable(current_setting('t.r1')::uuid,
       jsonb_build_object('kindId', current_setting('t.reel'), 'title', 'Reel από Αίτημα')) $$,
  '42501', null, 'Χωρίς deliverables.work δεν δημιουργείς Παραδοτέο από Αίτημα');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r1')->>'state', 'open', 'Η αποτυχία άφησε το Αίτημα ανοιχτό');
select is((select count(*)::int from public.deliverables where title = 'Reel από Αίτημα'), 0, 'Η αποτυχία δεν δημιούργησε Παραδοτέο');
select public.t_as('a1');
select throws_ok(
  $$ select public.message_request_create_deliverable(current_setting('t.r10')::uuid,
       jsonb_build_object('kindId', current_setting('t.reel'), 'title', 'Λάθος είδος')) $$,
  'P0001', 'Το Αίτημα δεν είναι για νέο Παραδοτέο', 'Μόνο Αίτημα νέου Παραδοτέου');
select throws_ok(
  $$ select public.message_request_create_deliverable(current_setting('t.r5')::uuid,
       jsonb_build_object('kindId', current_setting('t.reel'), 'title', 'Χωρίς Παραγωγή')) $$,
  'P0001', 'Διάλεξε Παραγωγή για το Παραδοτέο', 'Χωρίς ετικέτα θέλει Παραγωγή');
select throws_ok(
  $$ select public.message_request_create_deliverable(current_setting('t.r5')::uuid,
       jsonb_build_object('productionId', '00000000-0000-0000-0000-0000000000f2', 'kindId', current_setting('t.reel'), 'title', 'Ξένη Παραγωγή')) $$,
  'P0001', 'Η Παραγωγή δεν ανήκει στον Πελάτη του Αιτήματος', 'Η Παραγωγή πρέπει να είναι του Πελάτη του Αιτήματος');
select set_config('t.dg', public.message_request_create_deliverable(current_setting('t.r1')::uuid,
  jsonb_build_object('kindId', current_setting('t.reel'), 'title', 'Reel από Αίτημα'))->>'id', true);
select is((select d.production_id from public.deliverables d where d.id = current_setting('t.dg')::uuid), current_setting('t.pa1')::uuid, 'Το Παραδοτέο ανήκει στην Παραγωγή της ετικέτας');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r1')->>'state', 'done', 'Το Αίτημα έκλεισε στην ίδια συναλλαγή');
select is((public.t_req('00000000-0000-0000-0000-0000000000c1', 'r1')->>'automatic')::boolean, true, 'Έκλεισε μόνο του');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r1')->>'resultKind', 'deliverable', 'Το αποτέλεσμα είναι Παραδοτέο');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r1')->>'resultId', current_setting('t.dg'), 'Το αποτέλεσμα δείχνει το νέο Παραδοτέο');
select throws_ok(
  $$ select public.message_request_create_deliverable(current_setting('t.r1')::uuid,
       jsonb_build_object('kindId', current_setting('t.reel'), 'title', 'Δεύτερο')) $$,
  'P0001', 'Το Αίτημα έχει ήδη κλείσει', 'Κλεισμένο Αίτημα δεν δημιουργεί δεύτερο Παραδοτέο');

-- ───────────── Κλείσιμο Γυρίσματος από Αίτημα (Μ11) ─────────────
select public.t_as('a4');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r6')->>'assigneeId', '00000000-0000-0000-0000-0000000000a4', 'Το r6 ανήκει στον Νίκο');
select throws_ok(
  $$ select public.message_request_create_filming(current_setting('t.r6')::uuid,
       jsonb_build_object('agreementId', current_setting('t.a'), 'startsAt', '2027-03-11T10:00:00+02:00', 'hours', 2, 'kindId', current_setting('t.shoot'))) $$,
  '42501', null, 'Χωρίς filming.book δεν κλείνεις Γύρισμα από Αίτημα');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r6')->>'state', 'open', 'Η αποτυχία άφησε το Αίτημα Γυρίσματος ανοιχτό');
select is((select count(*)::int from public.filmings where production_id = current_setting('t.pa1')::uuid), 0, 'Η αποτυχία δεν δημιούργησε Γύρισμα');
select public.t_as('a1');
select throws_ok(
  $$ select public.message_request_create_filming(current_setting('t.r6')::uuid,
       jsonb_build_object('agreementId', gen_random_uuid(), 'startsAt', '2027-03-11T10:00:00+02:00', 'hours', 2)) $$,
  'P0001', 'Η Συμφωνία δεν ανήκει στον Πελάτη του Αιτήματος', 'Η Συμφωνία πρέπει να είναι του Πελάτη');
select throws_ok(
  $$ select public.message_request_create_filming(current_setting('t.r10')::uuid,
       jsonb_build_object('agreementId', current_setting('t.a'), 'startsAt', '2027-03-11T10:00:00+02:00', 'hours', 2)) $$,
  'P0001', 'Το Αίτημα δεν είναι για Γύρισμα', 'Μόνο Αίτημα Γυρίσματος');
select set_config('t.fg', public.message_request_create_filming(current_setting('t.r6')::uuid,
  jsonb_build_object('agreementId', current_setting('t.a'), 'startsAt', '2027-03-11T10:00:00+02:00', 'hours', 2, 'kindId', current_setting('t.shoot')))->>'id', true);
select is((select count(*)::int from public.filmings where id = current_setting('t.fg')::uuid), 1, 'Το Γύρισμα δημιουργήθηκε');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r6')->>'state', 'done', 'Το Αίτημα Γυρίσματος έκλεισε στην ίδια συναλλαγή');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r6')->>'resultKind', 'filming', 'Το αποτέλεσμα είναι Γύρισμα');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r6')->>'resultId', current_setting('t.fg'), 'Το αποτέλεσμα δείχνει το νέο Γύρισμα');

-- ───────────── Διαγραφή ─────────────
select public.t_as('b1');
select throws_ok($$ select public.message_delete(current_setting('t.r2')::uuid) $$, 'P0001', 'Το Μήνυμα έγινε Αίτημα και δεν διαγράφεται', 'Το Αίτημα δεν διαγράφεται');
select throws_ok($$ select public.message_delete(current_setting('t.p1')::uuid) $$, 'P0001', 'Το Μήνυμα έγινε Αίτημα και δεν διαγράφεται', 'Ούτε Μήνυμα που σημείωσε η ομάδα');
select is((select (x->>'canDelete')::boolean from jsonb_array_elements(public.messages_thread('00000000-0000-0000-0000-0000000000c1')->'messages') x where x->>'id' = current_setting('t.r2')), false, 'Το Αίτημα δεν έχει canDelete');
select is((select (x->>'canDelete')::boolean from jsonb_array_elements(public.messages_thread('00000000-0000-0000-0000-0000000000c1')->'messages') x where x->>'id' = current_setting('t.p2')), true, 'Το απλό Μήνυμα έχει canDelete');
select lives_ok($$ select public.message_delete(current_setting('t.p2')::uuid) $$, 'Το απλό Μήνυμα διαγράφεται');

-- ───────────── Ανοιχτό Χ μέρες (Μ13) ─────────────
update public.message_requests set declared_at = clock_timestamp() - interval '10 days' where message_id = current_setting('t.r10')::uuid;
select public.t_as('a1');
select is((public.t_req('00000000-0000-0000-0000-0000000000c1', 'r10')->>'stale')::boolean, true, 'Ανοιχτό 10 μέρες: χρειάζεται προσοχή');
select cmp_ok((public.t_req('00000000-0000-0000-0000-0000000000c1', 'r10')->>'daysOpen')::int, '>=', 10, 'Οι μέρες είναι ημερολογιακές');
select is((public.t_req('00000000-0000-0000-0000-0000000000c1', 'r5')->>'stale')::boolean, false, 'Φρέσκο Αίτημα: όχι σήμα προσοχής');
select is((public.t_req('00000000-0000-0000-0000-0000000000c1', 'r5')->>'daysOpen')::int, 0, 'Φρέσκο Αίτημα: 0 μέρες');
select is((public.t_item('open', 'r10')->>'stale')::boolean, true, 'Η ουρά δείχνει το σήμα προσοχής');
select is((public.t_req('00000000-0000-0000-0000-0000000000c1', 'r2')->>'stale')::boolean, false, 'Κλεισμένο Αίτημα: όχι σήμα προσοχής');

-- ───────────── Αλλαγή μετά την έγκριση στη Συνομιλία και στην ουρά (Μ12) ─────────────
insert into public.deliverable_requests (deliverable_id, body, created_by)
values (current_setting('t.dg')::uuid, 'Θέλουμε άλλη μουσική', '00000000-0000-0000-0000-0000000000b1');
select is(jsonb_array_length(public.messages_thread('00000000-0000-0000-0000-0000000000c1')->'changeRequests'), 1, 'Ιδιοκτήτης: η αλλαγή φαίνεται στη Συνομιλία');
select is(public.messages_thread('00000000-0000-0000-0000-0000000000c1')->'changeRequests'->0->>'state', 'open', 'Η αλλαγή είναι ανοιχτή');
select is(public.messages_thread('00000000-0000-0000-0000-0000000000c1')->'changeRequests'->0->>'deliverableTitle', 'Reel από Αίτημα', 'Η αλλαγή δείχνει τον τίτλο του Παραδοτέου');
select is(jsonb_array_length(public.messages_thread('00000000-0000-0000-0000-0000000000c2')->'changeRequests'), 0, 'Άλλος Πελάτης: καμία αλλαγή');
select public.t_as('a4');
select is(jsonb_array_length(public.messages_thread('00000000-0000-0000-0000-0000000000c1')->'changeRequests'), 1, 'Υπεύθυνος της Παραγωγής: βλέπει την αλλαγή του Παραδοτέου της');
select is((select count(*)::int from jsonb_array_elements(public.message_requests_view('mine')->'items') i where i->>'kind' = 'change'), 1, 'Ο υπεύθυνος της Παραγωγής την έχει στα «για μένα»');
select is((public.message_requests_view('mine')->'counts'->>'mine')::int, 1, 'Ο μετρητής «για μένα» περιλαμβάνει την αλλαγή');
select public.t_as('a1');
select is((select count(*)::int from jsonb_array_elements(public.message_requests_view('open')->'items') i where i->>'kind' = 'change'), 1, 'Η αλλαγή είναι στα «όλα τα ανοιχτά»');
select is((select i->>'deliverableId' from jsonb_array_elements(public.message_requests_view('open')->'items') i where i->>'kind' = 'change'), current_setting('t.dg'), 'Η αλλαγή δείχνει στο Παραδοτέο');
select is((select count(*)::int from jsonb_array_elements(public.message_requests_view('mine')->'items') i where i->>'kind' = 'change'), 0, 'Οι αλλαγές των άλλων δεν είναι στα δικά μου');
select public.t_as('b1');
select is(jsonb_array_length(public.messages_thread('00000000-0000-0000-0000-0000000000c1')->'changeRequests'), 1, 'Ο πελάτης βλέπει την αλλαγή που ζήτησε');
select is((select count(*)::int from jsonb_array_elements(public.client_requests_view()->'items') i where i->>'kind' = 'change'), 1, 'Η καρτέλα Αιτημάτων του πελάτη έχει την αλλαγή');
select public.t_as('b3');
select is(jsonb_array_length(public.messages_thread('00000000-0000-0000-0000-0000000000c2')->'changeRequests'), 0, 'Ο πελάτης Β δεν βλέπει αλλαγές του Α');

-- Η απόφαση «χρεώνεται» φαίνεται μόνο σε όσους βλέπουν ποσά.
update public.deliverable_requests set decision = 'charged', decided_at = now(), decided_by = '00000000-0000-0000-0000-0000000000a1'
 where deliverable_id = current_setting('t.dg')::uuid;
select public.t_as('a1');
select is(public.messages_thread('00000000-0000-0000-0000-0000000000c1')->'changeRequests'->0->>'decision', 'charged', 'Με finance.amounts φαίνεται το «χρεώνεται»');
select is(public.messages_thread('00000000-0000-0000-0000-0000000000c1')->'changeRequests'->0->>'state', 'done', 'Αποφασισμένη αλλαγή: ολοκληρώθηκε');
select public.t_as('a4');
select is(public.messages_thread('00000000-0000-0000-0000-0000000000c1')->'changeRequests'->0->>'decision', null, 'Χωρίς finance.amounts δεν φαίνεται το «χρεώνεται»');
select public.t_as('b1');
select is(public.messages_thread('00000000-0000-0000-0000-0000000000c1')->'changeRequests'->0->>'decision', null, 'Ο πελάτης δεν βλέπει το «χρεώνεται»');
select public.t_as('a1');
select is((select count(*)::int from jsonb_array_elements(public.message_requests_view('open')->'items') i where i->>'kind' = 'change'), 0, 'Η αποφασισμένη αλλαγή φεύγει από την ουρά');

-- ───────────── Ουρά ομάδας (J1) ─────────────
select public.t_as('a3');
select throws_ok($$ select public.message_requests_view('unassigned') $$, '42501', null, 'Χωρίς clients.transfer δεν βλέπεις «χωρίς υπεύθυνο»');
select public.t_as('a4');
select throws_ok($$ select public.message_requests_view('unassigned') $$, '42501', null, 'Μέλος Παραγωγής δεν βλέπει «χωρίς υπεύθυνο»');
select public.t_as('a1');
select throws_ok($$ select public.message_requests_view('bogus') $$, 'P0001', null, 'Άγνωστη όψη');
select is(jsonb_array_length(public.message_requests_view('unassigned')->'items'), 2, '«Χωρίς υπεύθυνο»: r5 και pb (το r3 έχει κλείσει)');
select is((public.message_requests_view('open')->'counts'->>'unassigned')::int, 2, 'Ο μετρητής «χωρίς υπεύθυνο»');
select is(jsonb_array_length(public.message_requests_view('open')->'items'), 4, 'Όλα τα ανοιχτά: p1, r5, r10, pb');
select is(jsonb_array_length(public.message_requests_view('closed')->'items'), 4, 'Κλεισμένα: r1, r2, r3, r6');
select is((public.message_requests_view('open')->>'solo')::boolean, false, 'Πολλά ενεργά μέλη: όχι solo');
select is(public.message_requests_view('open')->'items'->0->>'clientName', 'Πελάτης Α', 'Η ουρά δείχνει τον Πελάτη');
select is((public.t_item('closed', 'r1')->'closed'->>'automatic')::boolean, true, 'Η ουρά δείχνει ότι το r1 έκλεισε μόνο του');
select is(public.t_item('closed', 'r3')->'closed'->>'reply', 'Δεν το κάνουμε αυτό', 'Η ουρά δείχνει την απάντηση της απόρριψης');
select public.t_as('a3');
select is(jsonb_array_length(public.message_requests_view('mine')->'items'), 2, 'Τα «για μένα» του Υπεύθυνου Πελάτη: p1, r10');
select is((public.message_requests_view('mine')->'counts'->>'mine')::int, 2, 'Ο μετρητής «για μένα»');
select is(public.message_requests_view('mine')->'counts'->>'unassigned', '0', 'Χωρίς clients.transfer ο μετρητής «χωρίς υπεύθυνο» είναι 0');
select public.t_as('a4');
select is(jsonb_array_length(public.message_requests_view('open')->'items'), 1, 'Μέλος Παραγωγής: βλέπει μόνο Αιτήματα με ετικέτα της Παραγωγής του (r10 μετά την ετικέτα)');
select public.t_as('a5');
select is(jsonb_array_length(public.message_requests_view('open')->'items'), 0, 'Μέλος χωρίς Παραγωγή του Πελάτη δεν βλέπει Αιτήματα του Α');

-- ───────────── Όψη πελάτη (J3) ─────────────
select public.t_as('b1');
select is(jsonb_array_length(public.client_requests_view()->'items'), 7, 'Ο πελάτης Α βλέπει τα Αιτήματά του (r1, r2, r5, r6, r10, p1) και την αλλαγή, όχι τα απλά Μηνύματα');
select is((public.client_requests_view()->>'openCount')::int, 3, 'Ανοιχτά του πελάτη: r5, r10, p1');
select is(public.client_requests_view()->'items'->0->>'state', 'open', 'Ανοιχτά πρώτα');
select ok(not (public.client_requests_view()->'items'->0 ? 'assigneeId'), 'Ο πελάτης δεν βλέπει υπεύθυνο στην καρτέλα');
select is((select i->>'resultKind' from jsonb_array_elements(public.client_requests_view()->'items') i where i->>'messageId' = current_setting('t.r1')), 'deliverable', 'Ο πελάτης βλέπει ότι το r1 έγινε Παραδοτέο');
select public.t_as('b2');
select is(jsonb_array_length(public.client_requests_view()->'items'), 7, 'Ο πελάτης με c.chatRead βλέπει τα ίδια Αιτήματα');
select public.t_as('b3');
select is(jsonb_array_length(public.client_requests_view()->'items'), 2, 'Ο πελάτης Β βλέπει μόνο τα δικά του');
select is((select i->>'reply' from jsonb_array_elements(public.client_requests_view()->'items') i where i->>'messageId' = current_setting('t.r3')), 'Δεν το κάνουμε αυτό', 'Ο πελάτης βλέπει την απάντηση της ομάδας');
select is((select i->>'state' from jsonb_array_elements(public.client_requests_view()->'items') i where i->>'messageId' = current_setting('t.r3')), 'rejected', 'Το Αίτημα είναι απορριφθέν');
select public.t_as('a1');
select throws_ok($$ select public.client_requests_view() $$, '42501', null, 'Η ομάδα δεν έχει όψη πελάτη');

-- ───────────── Απενεργοποίηση υπευθύνου (Μ10) ─────────────
select public.t_as('b1');
select public.t_creq('r8', 'other', current_setting('t.pa1'));
select public.t_as('a1');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r8')->>'assigneeId', '00000000-0000-0000-0000-0000000000a4', 'Το νέο Αίτημα πάει στον υπεύθυνο της Παραγωγής');
update public.team_users set is_active = false, deactivated_at = now() where user_id = '00000000-0000-0000-0000-0000000000a4';
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r8')->>'assigneeId', null, 'Με την απενεργοποίηση το ανοιχτό Αίτημα μένει Χωρίς υπεύθυνο');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r6')->>'state', 'done', 'Τα κλεισμένα Αιτήματα δεν αλλάζουν');
select public.t_as('b1');
select public.t_creq('r9', 'other', current_setting('t.pa1'));
select public.t_as('a1');
select is(public.t_req('00000000-0000-0000-0000-0000000000c1', 'r9')->>'assigneeId', '00000000-0000-0000-0000-0000000000a3', 'Ανενεργός υπεύθυνος Παραγωγής: ο Υπεύθυνος Πελάτη');
select throws_ok($$ select public.message_request_assign(current_setting('t.r9')::uuid, '00000000-0000-0000-0000-0000000000a4') $$, 'P0001', null, 'Ανενεργό μέλος δεν αναλαμβάνει Αίτημα');

-- ───────────── Ίχνος ─────────────
select ok((select count(*) from public.audit_log where entity = 'message_requests' and action = 'insert') >= 8, 'Η δήλωση Αιτήματος γράφεται στο Ίχνος');
select ok((select count(*) from public.audit_log where entity = 'message_requests' and action = 'update') >= 3, 'Το κλείσιμο και η μεταβίβαση γράφονται στο Ίχνος');

select * from finish();
rollback;
