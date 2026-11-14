-- Σωστοί παραλήπτες Ειδοποιήσεων και τα έξι Γεγονότα «συνδέεται αργότερα» (L1: c1, c5, b5, b13, d2, d5, e2).
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Γυρίσματα και ημερομηνίες υπολογίζονται από σήμερα.
begin;
select plan(35);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Παραγωγή (Υπεύθυνος Παραγωγής) · a3 Πωλήσεις (Υπεύθυνος Πελάτη 1, Ευκαιρίας) · a4 Διαχείριση (μοντέρ)
-- b1 Χρήστης πελάτη 1 «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'manager@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@kypseli.example.gr');
insert into public.team_users (user_id, name, email, language, is_active, deactivated_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com', 'el', true, null),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'production@example.com', 'el', true, null),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com', 'el', true, null),
  ('00000000-0000-0000-0000-0000000000a4', 'Νίκος', 'manager@example.com', 'el', true, null);
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a4', 'Διαχείριση')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000d1', 'Κυψέλη Καφέ', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000d2', 'Γυμναστήριο Κίνηση', '', 'Αθήνα', null, 'Κώστας Κίνης', 'kostas@kinisi.example.gr', '210 2222222', '00000000-0000-0000-0000-0000000000a1');
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 'Μηνιαίο καφέ',
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a3', 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3;
insert into public.catalogue_items (id, kind, billing, name, name_en, unit, retired_at) values
  ('00000000-0000-0000-0000-0000000000e2', 'package', 'monthly', 'Μηνιαίο πακέτο (τεστ)', 'Monthly (test)', '', null);
insert into public.catalogue_item_amounts (item_id, price) values ('00000000-0000-0000-0000-0000000000e2', 1000);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost) values ('00000000-0000-0000-0000-0000000000e2', 6, 14, 0);
insert into public.catalogue_item_provisions (item_id, kind_id, quantity)
select '00000000-0000-0000-0000-0000000000e2', k.id, p.qty
  from (values ('shoot', 2), ('reel', 8)) as p (code, qty)
  join public.provision_kinds k on k.code = p.code;
insert into public.cost_months (month, expenses_total, productive_hours)
values (date_trunc('month', now() at time zone 'Europe/Athens')::date, 8800, 220);

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

create function public.t_count(p_last text, p_type text) returns integer
language sql
as $$
  select count(*)::integer from public.notifications n join public.events e on e.id = n.event_id
   where n.user_id = public.t_uid(p_last) and e.type = p_type;
$$;

create function public.t_body(p_last text, p_type text) returns text
language sql
as $$
  select n.body from public.notifications n join public.events e on e.id = n.event_id
   where n.user_id = public.t_uid(p_last) and e.type = p_type order by e.id desc limit 1;
$$;

create function public.t_events(p_type text) returns integer
language sql
as $$ select count(*)::integer from public.events e where e.type = p_type; $$;

create function public.t_mails(p_email text, p_subject text) returns integer
language sql
as $$
  select count(*)::integer from public.email_outbox o
   where o.kind = 'automation' and o.to_email = p_email and o.payload ->> 'subject' like p_subject;
$$;

create function public.t_run() returns jsonb
language sql
as $$ select public.events_process(); $$;

-- ───────────── Συμφωνία, Παραγωγή, Παραδοτέο ─────────────
select public.t_as('a1');
select set_config('t.ag', public.agreement_create('00000000-0000-0000-0000-0000000000e1', 'monthly', 'Μηνιαίο καφέ')::text, true);
select public.agreement_update_basics(current_setting('t.ag')::uuid, 'Μηνιαίο καφέ', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, 6);
select public.agreement_add_catalogue_line(current_setting('t.ag')::uuid, '00000000-0000-0000-0000-0000000000e2', 1);
select public.agreement_set_recipients(current_setting('t.ag')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.ag')::uuid, (now() at time zone 'Europe/Athens')::date, 'Μαρία Παπαδάκη', date '2027-03-01', 'contract.pdf');
select set_config('t.pa', (select pr.id::text from public.productions pr
                             join public.agreement_periods pe on pe.id = pr.period_id
                            where pe.agreement_id = current_setting('t.ag')::uuid and pe.n = 1), true);
select public.production_transfer(current_setting('t.pa')::uuid, '00000000-0000-0000-0000-0000000000a2');

insert into public.client_users (client_id, user_id, name, role_id, is_current, removed_at)
select '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true, null
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

select set_config('t.d1', gen_random_uuid()::text, true);
insert into public.deliverables (id, production_id, kind_id, title, charge, assignee_id)
values (current_setting('t.d1')::uuid, current_setting('t.pa')::uuid, (select k.id from public.provision_kinds k where k.code = 'reel'),
        'Reel καφέ', 'included', '00000000-0000-0000-0000-0000000000a4');

-- Ό,τι γράφτηκε στην προετοιμασία δεν μας αφορά (εκτός από την υπογραφή, που ξαναπαίζει στο b13).
update public.events set processed_at = now() where processed_at is null;

-- ───────────── Κατάλογος ─────────────
select is((select count(*)::integer from public.event_types
            where code in ('deliverable.client_commented', 'filming.crew_assigned', 'client.access_decided') and is_wired),
  3, 'Τα τρία νέα Γεγονότα υπάρχουν και είναι συνδεδεμένα');
select is((select array_agg(code order by code) from public.event_types where not is_wired), null::text[],
  'Κανένα Γεγονός του καταλόγου δεν μένει «συνδέεται αργότερα»');
select is((select count(*)::integer from public.automations
            where is_initial and event_type in ('proposal.link_opened', 'agreement.signed') and not is_enabled),
  0, 'b13: «Άνοιξε την πρόταση» και «Υπογράφηκε η Συμφωνία» είναι ενεργοί');

-- ───────────── Δικαιώματα ─────────────
select public.t_as('a1');
set local role authenticated;
select throws_ok($$ select * from authz.ts_billable_open(now(), now()) $$, '42501', null,
  'Η πηγή «Τιμολογητέο σε αναμονή» δεν τρέχει από authenticated');
select throws_ok($$ select authz.ev_cost_payload(gen_random_uuid()) $$, '42501', null,
  'Τα στοιχεία κόστους των Γεγονότων δεν διαβάζονται από authenticated');
reset role;

-- ───────────── c1: απάντηση και σχόλιο πελάτη → Ανατεθειμένος ─────────────
select public.t_as('a2');
insert into public.deliverable_versions (deliverable_id, number, url, host, state, created_by, sent_at, sent_by)
values (current_setting('t.d1')::uuid, 1, 'https://drive.example.com/v1', 'drive.example.com', 'awaiting_client',
        public.t_uid('a2'), now(), public.t_uid('a2'));
select public.t_run();
select public.t_as('b1');
update public.deliverable_versions set state = 'changes_requested', answered_at = now(), answered_by = public.t_uid('b1')
 where deliverable_id = current_setting('t.d1')::uuid and number = 1;
insert into public.deliverable_comments (deliverable_id, version_number, body, at_seconds, is_internal, created_by) values
  (current_setting('t.d1')::uuid, 1, 'Πιο γρήγορο μοντάζ στην αρχή', 5, false, public.t_uid('b1')),
  (current_setting('t.d1')::uuid, 1, 'Και πιο δυνατή μουσική', 20, false, public.t_uid('b1'));
select public.t_run();
select is(public.t_count('a4', 'deliverable.client_answered'), 1, 'Η απάντηση του πελάτη φτάνει στον Ανατεθειμένο (μοντέρ)');
select is(public.t_count('a2', 'deliverable.client_answered'), 1, 'και στον Υπεύθυνο της Παραγωγής, όπως πριν');
select is(public.t_count('a4', 'deliverable.client_commented'), 1, 'Δύο σχόλια στην ίδια Έκδοση: μία Ειδοποίηση στον Ανατεθειμένο');
select is(public.t_body('a4', 'deliverable.client_commented'),
  'Ο Κυψέλη Καφέ σχολίασε την Έκδοση 1 του Reel καφέ: Πιο γρήγορο μοντάζ στην αρχή', 'Το κείμενο έχει την Έκδοση και το σχόλιο');
select is(public.t_count('a2', 'deliverable.client_commented'), 1, 'Το σχόλιο φτάνει και στον Υπεύθυνο της Παραγωγής');
select is(public.t_count('b1', 'deliverable.client_commented'), 0, 'Ο πελάτης δεν ειδοποιείται για το δικό του σχόλιο');

select public.t_as('a2');
insert into public.deliverable_comments (deliverable_id, version_number, body, is_internal, created_by) values
  (current_setting('t.d1')::uuid, 1, 'Εσωτερική σημείωση', true, public.t_uid('a2')),
  (current_setting('t.d1')::uuid, 1, 'Απάντηση της ομάδας', false, public.t_uid('a2'));
select is(public.t_events('deliverable.client_commented'), 1, 'Σχόλια της ομάδας (εσωτερικά ή όχι) δεν είναι «σχόλιο πελάτη»');

-- ───────────── c5: μέλος στο Συνεργείο ─────────────
select set_config('t.f1', gen_random_uuid()::text, true);
select set_config('t.f2', gen_random_uuid()::text, true);
insert into public.filmings (id, production_id, client_id, kind_id, starts_at, hours, origin, state) values
  (current_setting('t.f1')::uuid, current_setting('t.pa')::uuid, '00000000-0000-0000-0000-0000000000d1',
   (select k.id from public.provision_kinds k where k.code = 'shoot'), date_trunc('hour', now()) + interval '10 days', 2, 'team', 'pending'),
  (current_setting('t.f2')::uuid, current_setting('t.pa')::uuid, '00000000-0000-0000-0000-0000000000d1',
   (select k.id from public.provision_kinds k where k.code = 'shoot'), date_trunc('hour', now()) - interval '10 days', 2, 'team', 'pending');
insert into public.filming_crew (filming_id, user_id, added_by) values
  (current_setting('t.f1')::uuid, public.t_uid('a3'), public.t_uid('a2')),
  (current_setting('t.f1')::uuid, public.t_uid('a2'), public.t_uid('a2')),
  (current_setting('t.f2')::uuid, public.t_uid('a4'), public.t_uid('a2'));
select public.t_run();
select is(public.t_count('a3', 'filming.crew_assigned'), 1, 'Όποιος μπαίνει στο Συνεργείο παίρνει Ειδοποίηση');
select is(public.t_mails('sales@example.com', 'Μπήκες στο Συνεργείο · %'), 1, 'και email');
select is(public.t_count('a2', 'filming.crew_assigned'), 0, 'Όποιος βάζει τον εαυτό του δεν ειδοποιείται');
select is(public.t_count('a4', 'filming.crew_assigned'), 0, 'Γύρισμα που πέρασε: καμία Ειδοποίηση');
select is((select n.link from public.notifications n join public.events e on e.id = n.event_id
            where n.user_id = public.t_uid('a3') and e.type = 'filming.crew_assigned'),
  '/app/filming/mine', 'Το link πάει στα «Τα Γυρίσματά μου»');

-- ───────────── b5: απόφαση για αίτημα πρόσβασης ─────────────
select set_config('t.r1', gen_random_uuid()::text, true);
insert into public.access_requests (id, client_id, requester_id, topic, source_id)
values (current_setting('t.r1')::uuid, '00000000-0000-0000-0000-0000000000d2', public.t_uid('a3'), 'Βίντεο γυμναστηρίου',
        (select s.id from public.sales_sources s where s.code = 'phone'));
select public.t_as('a4');
update public.access_requests set status = 'rejected', decided_by = public.t_uid('a4'), decided_at = now(),
       decision_comment = 'Τον έχει ήδη ο Ιδιοκτήτης'
 where id = current_setting('t.r1')::uuid;
select public.t_run();
select is(public.t_body('a3', 'client.access_decided'),
  'Το αίτημά σου για τον Γυμναστήριο Κίνηση απορρίφθηκε. Τον έχει ήδη ο Ιδιοκτήτης', 'Ο πωλητής μαθαίνει την απόφαση και το σχόλιο');
select is((select n.link from public.notifications n join public.events e on e.id = n.event_id
            where n.user_id = public.t_uid('a3') and e.type = 'client.access_decided'),
  '/app/pipeline', 'Απόρριψη: link στο Pipeline');

-- ───────────── b13: Υπογράφηκε η Συμφωνία → Υπεύθυνος Ευκαιρίας ─────────────
update public.events set processed_at = null where type = 'agreement.signed';
select public.t_run();
select is(public.t_count('a3', 'agreement.signed'), 1, 'Ο Υπεύθυνος της Ευκαιρίας μαθαίνει την υπογραφή');

-- ───────────── d2: νέο Τιμολογητέο ─────────────
select public.t_as('a4');
select set_config('t.bl', gen_random_uuid()::text, true);
insert into public.billables (id, client_id, agreement_id, reason, source_id, label, billable_on, net)
values (current_setting('t.bl')::uuid, '00000000-0000-0000-0000-0000000000d1', current_setting('t.ag')::uuid, 'extra_filming',
        gen_random_uuid(), 'Επιπλέον Γύρισμα', public.sales_today(), 300);
select public.t_run();
select is(public.t_count('a1', 'billable.created'), 1, 'Νέο Τιμολογητέο → όσοι «Εκδίδουν Τιμολόγια»');
select is(public.t_count('a2', 'billable.created'), 0, 'όχι η Παραγωγή');
select is(public.t_count('a3', 'billable.created'), 0, 'όχι ο Υπεύθυνος Πελάτη');

-- ───────────── e2: Τιμολογητέο σε αναμονή ─────────────
select is((select count(*)::integer from authz.ts_billable_open(now() - interval '2 days', now() + interval '1 day')
            where entity_id = current_setting('t.bl')::uuid),
  1, 'Το ανοιχτό Τιμολογητέο είναι περίπτωση αναμονής, με άγκυρα τη μέρα του');
select is((select count(*)::integer from authz.timed_cases('billable.open_waiting', now() - interval '2 days', now() + interval '1 day')
            where entity_id = current_setting('t.bl')::uuid),
  1, 'Ο επεξεργαστής το βρίσκει');

-- ───────────── d5: Είσπραξη ─────────────
select public.t_as('a1');
select public.receipt_register('00000000-0000-0000-0000-0000000000d1', public.sales_today(), 250,
  (select m.id from public.payment_methods m where m.retired_at is null order by m.sort limit 1), '');
select public.t_run();
select is(public.t_mails('b1@kypseli.example.gr', 'Λάβαμε την πληρωμή σας'), 1, 'Ο πελάτης παίρνει email «Λάβαμε την πληρωμή σας»');
select is(public.t_count('a3', 'receipt.registered'), 1, 'Ο Υπεύθυνος Πελάτη μαθαίνει την πληρωμή');
select is(public.t_count('a1', 'receipt.registered'), 0, 'Όποιος την καταχώρισε δεν ειδοποιείται');

select set_config('t.rc', public.receipt_register('00000000-0000-0000-0000-0000000000d1', public.sales_today(), 99,
  (select m.id from public.payment_methods m where m.retired_at is null order by m.sort limit 1), '')::text, true);
update public.receipts set deleted_at = now(), delete_reason = 'Λάθος ποσό' where id = current_setting('t.rc')::uuid;
select public.t_run();
select is(public.t_mails('b1@kypseli.example.gr', 'Λάβαμε την πληρωμή σας'), 1, 'Σβησμένη Είσπραξη: κανένα email');

-- ───────────── e2: κόστος Παραγωγής ─────────────
select public.t_as('a4');
update public.production_costs set shoot_hours = 40, shoot_confirmed_at = now(), shoot_confirmed_by = public.t_uid('a4')
 where production_id = current_setting('t.pa')::uuid;
update public.production_costs set direct_cost = 10 where production_id = current_setting('t.pa')::uuid;
select public.t_run();
select is(public.t_count('a1', 'production.cost_overrun'), 1, 'Υπέρβαση ωρών → όσοι βλέπουν κόστος, μία φορά ανά Παραγωγή');
select is(public.t_events('production.cost_overrun'), 1, 'Δεύτερη αλλαγή με υπέρβαση: κανένα δεύτερο Γεγονός');

update public.productions set state = 'delivered', delivered_at = now(), delivered_note = 'Παραδόθηκε' where id = current_setting('t.pa')::uuid;
select public.t_run();
select is(public.t_count('a1', 'production.delivered_without_hours'), 1, 'Παράδοση χωρίς ώρες μοντάζ → όσοι βλέπουν κόστος');

-- ───────────── e2: φόρμα της Ιστοσελίδας ─────────────
select set_config('request.jwt.claims', '', true);
set local role service_role;
select set_config('t.o1', public.sales_intake_form(
  '{"name":"Οδοντιατρείο Φως","contact_name":"Ελένη","contact_email":"eleni@fos.example.gr"}'::jsonb, 'Βίντεο γνωριμίας')::text, true);
reset role;
select public.t_run();
select is((select count(*)::integer from public.events e
            where e.type = 'opportunity.form_submitted' and e.entity_id = current_setting('t.o1')::uuid),
  1, 'Η φόρμα της Ιστοσελίδας γράφει Γεγονός');
select ok((select count(*) from public.notifications n join public.events e on e.id = n.event_id
            where e.type = 'opportunity.form_submitted') > 0, 'και κάποιος της ομάδας ειδοποιείται');

select public.t_as('a3');
insert into public.opportunities (client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000d1', 'Χειροκίνητη', (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'web'), public.t_uid('a3'), 'Τηλέφωνο',
       (now() at time zone 'Europe/Athens')::date + 3;
select is(public.t_events('opportunity.form_submitted'), 1, 'Πηγή «Ιστοσελίδα» από την ομάδα δεν είναι φόρμα');

select * from finish();
rollback;
