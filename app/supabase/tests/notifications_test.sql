-- Ειδοποιήσεις Kα #170: κατάλογος, ουρά Γεγονότων, Αυτοματισμοί, επεξεργαστής, Προτιμήσεις και RPC καμπανακιού.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι ώρες των Γυρισμάτων είναι σταθερές· ο καθαρισμός περνά p_now.
begin;
select plan(73);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Παραγωγή (Υπεύθυνος Παραγωγής, γλώσσα en) · a3 Πωλήσεις (Υπεύθυνος Πελάτη 1) · a4 Διαχείριση
-- a5 Διαχείριση απενεργοποιημένος · b1, b2, b3 Χρήστες πελάτη 1 «Πλήρης» (ο b3 και στον Πελάτη 2) · b5 αφαιρεμένος · f9 χωρίς πρόσβαση
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'manager@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'old@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@kypseli.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@kypseli.example.gr'),
  ('00000000-0000-0000-0000-0000000000b3', 'b3@kypseli.example.gr'),
  ('00000000-0000-0000-0000-0000000000b5', 'b5@kypseli.example.gr'),
  ('00000000-0000-0000-0000-0000000000f9', 'nobody@example.com');
insert into public.team_users (user_id, name, email, language, is_active, deactivated_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com', 'el', true, null),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'production@example.com', 'en', true, null),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com', 'el', true, null),
  ('00000000-0000-0000-0000-0000000000a4', 'Νίκος', 'manager@example.com', 'el', true, null),
  ('00000000-0000-0000-0000-0000000000a5', 'Σοφία', 'old@example.com', 'el', false, now());
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a4', 'Διαχείριση'),
    ('00000000-0000-0000-0000-0000000000a5', 'Διαχείριση')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Πελάτης 1 με Υπεύθυνο την a3· Πελάτης 2 χωρίς Υπεύθυνο.
insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000d1', 'Κυψέλη Καφέ', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000d2', 'Γυμναστήριο Κίνηση', '', 'Αθήνα', null, 'Κώστας Κίνης', 'kostas@kinisi.example.gr', '210 2222222', null);
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

-- Ειδοποιήσεις ενός Χρήστη για ένα είδος Γεγονότος (ως postgres, ποτέ ως authenticated).
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

create function public.t_unread(p_last text) returns integer
language sql
as $$ select count(*)::integer from public.notifications n where n.user_id = public.t_uid(p_last) and n.read_at is null; $$;

create function public.t_run() returns jsonb
language sql
as $$ select public.events_process(); $$;

create function public.t_auto(p_type text, p_target text) returns uuid
language sql
as $$
  select a.id from public.automations a
   where a.event_type = p_type and a.is_initial and coalesce(a.recipient_relative, a.recipient_permission) = p_target;
$$;

-- ───────────── Συμφωνία, Παραγωγή, Γύρισμα, Παραδοτέο ─────────────
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
select x.client_id::uuid, x.user_id::uuid, x.name, r.id, x.is_current, x.removed_at
  from (values
    ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', true, null::timestamptz),
    ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b2', 'Λία', true, null),
    ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b3', 'Ελπίδα', true, null),
    ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b3', 'Ελπίδα', false, null),
    ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b5', 'Στέλιος', false, now())
  ) as x (client_id, user_id, name, is_current, removed_at)
  join public.roles r on r.name = 'Πλήρης' and r.kind = 'client';

select set_config('t.f1', gen_random_uuid()::text, true);
insert into public.filmings (id, production_id, client_id, kind_id, starts_at, hours, origin, state)
values (current_setting('t.f1')::uuid, current_setting('t.pa')::uuid, '00000000-0000-0000-0000-0000000000d1',
        (select k.id from public.provision_kinds k where k.code = 'shoot'), timestamptz '2027-02-10 10:00+00', 2, 'client', 'pending');
insert into public.filming_crew (filming_id, user_id) values (current_setting('t.f1')::uuid, '00000000-0000-0000-0000-0000000000a1');
select set_config('t.d1', gen_random_uuid()::text, true);
insert into public.deliverables (id, production_id, kind_id, title, charge, assignee_id)
values (current_setting('t.d1')::uuid, current_setting('t.pa')::uuid, (select k.id from public.provision_kinds k where k.code = 'reel'),
        'Reel καφέ', 'included', '00000000-0000-0000-0000-0000000000a1');

update public.company_settings set trade_name = 'Στούντιο Τεστ' where id;

-- Ό,τι γράφτηκε στην προετοιμασία δεν μας αφορά.
update public.events set processed_at = now() where processed_at is null;

-- Αυτοματισμοί τεστ (πέρα από τους αρχικούς).
insert into public.automations (event_type, channel, recipient_kind, recipient_relative, recipient_user_ids, subject_el, body_el, body_en, sort)
values
  ('deliverable.version_sent', 'notification', 'relative', 'client', '{}', null, 'Νέα Έκδοση {version} του {deliverable}', '', 1),
  ('proposal.low_margin', 'notification', 'relative', 'opportunity_owner', '{}', null, 'Περιθώριο {proposal}', '', 2),
  ('filming.booked', 'notification', 'users', null,
   '{00000000-0000-0000-0000-0000000000b1,00000000-0000-0000-0000-0000000000a3}', null, 'Κράτηση {filming}', '', 2),
  ('deliverable.review_pending', 'notification', 'relative', 'production_owner', '{}', null, 'Έλεγχος {deliverable}', '', 0),
  ('filming.crew_declined', 'email', 'relative', 'production_owner', '{}', 'Δεν μπορεί {member}', 'Ο/Η {member} δεν μπορεί.', '', 2);

-- ───────────── Δικαιώματα ─────────────
set local role anon;
select throws_ok($$ select public.events_process() $$, '42501', null, 'Ο ανώνυμος δεν τρέχει τον επεξεργαστή');
select throws_ok($$ select public.notifications_bell() $$, '42501', null, 'Ο ανώνυμος δεν έχει καμπανάκι');
reset role;

select public.t_as('a1');
set local role authenticated;
select throws_ok($$ select public.events_process() $$, '42501', null, 'Ο Ιδιοκτήτης (authenticated) δεν τρέχει τον επεξεργαστή: μόνο service_role');
select throws_ok($$ select * from public.events $$, '42501', null, 'Ο πίνακας events είναι κλειστός');
select throws_ok($$ select * from public.event_types $$, '42501', null, 'Ο πίνακας event_types είναι κλειστός');
select throws_ok($$ select * from public.automations $$, '42501', null, 'Ο πίνακας automations είναι κλειστός');
select throws_ok($$ select * from public.automation_optouts $$, '42501', null, 'Ο πίνακας automation_optouts είναι κλειστός');
select throws_ok($$ select * from public.notifications $$, '42501', null, 'Ο πίνακας notifications είναι κλειστός');
select throws_ok($$ select * from public.automation_sends $$, '42501', null, 'Ο πίνακας automation_sends είναι κλειστός');
reset role;

select public.t_as('f9');
select throws_ok($$ select public.notifications_bell() $$, '42501', null, 'Χωρίς ομάδα και χωρίς Πελάτη: κανένα καμπανάκι');

-- ───────────── Κατάλογος και συνέπεια Αυτοματισμών ─────────────
select is((select count(*)::integer from public.event_types), 58, 'Ο κατάλογος έχει τα 58 Γεγονότα του prototype');
select is((select count(*)::integer from public.event_types where is_wired and kind <> 'instant'), 0,
  'Κανένα «με ημερομηνία» ή «αναμονής» δεν είναι συνδεδεμένο ακόμα');
select is((select count(*)::integer from public.automations where is_initial and channel = 'email'), 0,
  'Κανένας αρχικός Αυτοματισμός email στο Kα');
select throws_ok($$ insert into public.automations (event_type, channel, recipient_kind, recipient_relative, body_el)
                   values ('filming.booked', 'notification', 'relative', 'client', 'x') $$,
  'P0001', null, 'Ο «πελάτης» δεν είναι παραλήπτης εσωτερικού Γεγονότος');
select throws_ok($$ insert into public.automations (event_type, channel, recipient_kind, body_el)
                   values ('message.created', 'notification', 'visitor', 'x') $$,
  'P0001', null, 'Επισκέπτης μόνο σε Γεγονός με Επισκέπτη');
select throws_ok($$ insert into public.automations (event_type, channel, recipient_kind, recipient_permission, body_el)
                   values ('filming.booked', 'notification', 'permission', 'no.such', 'x') $$,
  '23503', null, 'Δικαίωμα μόνο από τον κατάλογο');

-- ───────────── Β: ο πελάτης έκλεισε Γύρισμα ─────────────
select public.t_as('b1');
select authz.filming_event(current_setting('t.f1')::uuid, 'booked', '{"state":"pending"}'::jsonb);
select is((select type || ' ' || case_key || ' ' || actor_id from public.events order by id desc limit 1),
  'filming.booked filming.booked:' || current_setting('t.f1') || ' 00000000-0000-0000-0000-0000000000b1',
  'Το helper του Γυρίσματος γράφει Γεγονός στην ουρά, με περίπτωση και actor');
select is((select count(*)::integer from public.events where processed_at is null), 1, 'Ένα ανεπεξέργαστο Γεγονός');
select authz.filming_event(current_setting('t.f1')::uuid, 'booked', '{"state":"scheduled"}'::jsonb);
select is((select count(*)::integer from public.events where processed_at is null), 1,
  'Κράτηση χωρίς ανάγκη έγκρισης δεν είναι το Γεγονός «αναμένει έγκριση»');
select public.t_run();
select is(public.t_count('a4', 'filming.booked'), 1, 'Η Διαχείριση (Εγκρίνει κράτηση) παίρνει Ειδοποίηση');
select is(public.t_count('a1', 'filming.booked'), 1, 'Ο Ιδιοκτήτης παίρνει Ειδοποίηση');
select is(public.t_count('a5', 'filming.booked'), 0, 'Ο απενεργοποιημένος δεν παίρνει');
select is(public.t_count('a3', 'filming.booked'), 1, 'Ονομαστικός παραλήπτης της ομάδας παίρνει');
select is(public.t_count('b1', 'filming.booked'), 0, 'Εσωτερικό Γεγονός δεν πάει ποτέ σε Χρήστη πελάτη');
select is(public.t_body('a1', 'filming.booked'), 'Ο Κυψέλη Καφέ έκλεισε Γύρισμα στις 10/02/2027 12:00. Αναμένει έγκριση.',
  'Το κείμενο με μεταβλητές, σε ώρα Ελλάδας');
select is((select n.title || ' ' || n.link from public.notifications n join public.events e on e.id = n.event_id
            where n.user_id = public.t_uid('a1') and e.type = 'filming.booked'),
  'Ο πελάτης έκλεισε Γύρισμα (αναμένει έγκριση) /app/filming/' || current_setting('t.f1'),
  'Τίτλος η ετικέτα του Γεγονότος· link προς το Γύρισμα');

select public.t_as('b1');
select authz.filming_event(current_setting('t.f1')::uuid, 'booked', '{"state":"pending"}'::jsonb);
select public.t_run();
select is(public.t_count('a4', 'filming.booked'), 1, 'Η ίδια περίπτωση δεύτερη φορά: καμία δεύτερη αποστολή');
select is((select count(*)::integer from public.automation_sends
            where automation_id = public.t_auto('filming.booked', 'filming.approve')),
  2, 'Ένα σημάδι ανά παραλήπτη (Ιδιοκτήτης, Διαχείριση)');

-- ───────────── Β: «δεν μπορώ», γλώσσα en και κανάλι email ─────────────
select public.t_as('a1');
select authz.filming_event(current_setting('t.f1')::uuid, 'crew_declined',
  jsonb_build_object('user_id', '00000000-0000-0000-0000-0000000000a1', 'reason', 'Ταξίδι'));
select public.t_run();
select is(public.t_body('a2', 'filming.crew_declined') like 'Γιώργος cannot make the filming %', true,
  'Ο Υπεύθυνος της Παραγωγής παίρνει Ειδοποίηση στη γλώσσα του (en)');
select is(public.t_count('a1', 'filming.crew_declined'), 0, 'Όποιος έκανε την ενέργεια δεν ειδοποιείται');
select is((select count(*)::integer from public.email_outbox where kind = 'automation' and to_email = 'production@example.com'),
  1, 'Το κανάλι email γράφει μία γραμμή kind automation');
select is((select locale || ' ' || (payload ->> 'subject') || ' ' || (payload ?& array['body', 'link', 'automationId'])::text
             from public.email_outbox where kind = 'automation' and to_email = 'production@example.com'),
  'el Δεν μπορεί Γιώργος true', 'Χωρίς αγγλικό κείμενο φεύγει το ελληνικό· payload με subject, body, link, automationId');

-- ───────────── Γ: νέα Έκδοση προς τον πελάτη ─────────────
select public.t_as('a2');
insert into public.deliverable_versions (deliverable_id, number, url, host, state, created_by, sent_at, sent_by)
values (current_setting('t.d1')::uuid, 1, 'https://drive.example.com/v1', 'drive.example.com', 'awaiting_client',
        public.t_uid('a2'), now(), public.t_uid('a2'));
select public.t_run();
select is((select count(*)::integer from public.notifications n join public.events e on e.id = n.event_id
            where e.type = 'deliverable.version_sent'
              and n.user_id in (public.t_uid('b1'), public.t_uid('b2'), public.t_uid('b3'))),
  3, '«Ο πελάτης» = και οι 3 Χρήστες πελάτη');
select is(public.t_count('b5', 'deliverable.version_sent'), 0, 'Ο αφαιρεμένος Χρήστης πελάτη δεν παίρνει');
select is((select n.body || ' ' || n.link from public.notifications n join public.events e on e.id = n.event_id
            where n.user_id = public.t_uid('b1') and e.type = 'deliverable.version_sent'),
  'Νέα Έκδοση 1 του Reel καφέ /app/deliverables/' || current_setting('t.d1'), 'Κείμενο και link για τον πελάτη');

-- ───────────── Γ: εσωτερικός έλεγχος (κενό en → el) ─────────────
select public.t_as('a1');
insert into public.deliverable_versions (deliverable_id, number, url, host, state, created_by)
values (current_setting('t.d1')::uuid, 2, 'https://drive.example.com/v2', 'drive.example.com', 'in_review', public.t_uid('a1'));
select public.t_run();
select is(public.t_body('a2', 'deliverable.review_pending'), 'Έλεγχος Reel καφέ', 'Γλώσσα en με κενό en: φεύγει το el');
select is(public.t_count('a4', 'deliverable.review_pending'), 1, 'Ο αρχικός Αυτοματισμός πάει σε όσους ελέγχουν Παραδοτέα');

-- ───────────── Γ: σβησμένος Αυτοματισμός ─────────────
update public.automations set is_enabled = false where id = public.t_auto('deliverable.link_broken', 'assignee');
select public.t_as('b1');
update public.deliverable_versions set link_broken_at = now() where deliverable_id = current_setting('t.d1')::uuid and number = 1;
select public.t_run();
select is(public.t_count('a1', 'deliverable.link_broken'), 0, 'Σβησμένος Αυτοματισμός: τίποτα στον Ανατεθειμένο');
select is(public.t_count('a2', 'deliverable.link_broken'), 1, 'Ο δεύτερος Αυτοματισμός του ίδιου Γεγονότος δουλεύει');

-- ───────────── Ε: Μηνύματα ─────────────
select public.t_as('b1');
insert into public.messages (client_id, author_id, author_kind, body)
values ('00000000-0000-0000-0000-0000000000d1', public.t_uid('b1'), 'client', 'Πότε είναι το επόμενο γύρισμα;');
select public.t_as('b3');
insert into public.messages (client_id, author_id, author_kind, body)
values ('00000000-0000-0000-0000-0000000000d2', public.t_uid('b3'), 'client', 'Καλημέρα από το γυμναστήριο');
select public.t_as('a1');
insert into public.messages (client_id, author_id, author_kind, body)
values ('00000000-0000-0000-0000-0000000000d2', public.t_uid('a1'), 'team', 'Καλημέρα από την ομάδα');
insert into public.messages (client_id, author_id, author_kind, body, is_internal, mentions)
values ('00000000-0000-0000-0000-0000000000d1', public.t_uid('a1'), 'team', 'Δες το @Πέτρος', true,
        array[public.t_uid('a1'), public.t_uid('a2')]);
select public.t_run();
select is(public.t_body('a3', 'message.created'), 'Νέο Μήνυμα από Κώστας: Πότε είναι το επόμενο γύρισμα;',
  'Νέο Μήνυμα πελάτη → Υπεύθυνος Πελάτη');
select is(public.t_count('b2', 'message.created'), 0, 'Μήνυμα πελάτη δεν ειδοποιεί τους συναδέλφους του');
select is((select count(*)::integer from public.notifications n join public.events e on e.id = n.event_id
            where n.user_id = public.t_uid('a4') and e.type = 'message.created' and e.client_id = '00000000-0000-0000-0000-0000000000d2'),
  1, 'Πελάτης χωρίς Υπεύθυνο → όσοι «Μεταβιβάζουν Υπεύθυνο»');
select is(public.t_count('a2', 'message.mentioned'), 1, '@αναφορά σε Εσωτερικό → ο αναφερόμενος');
select is(public.t_count('a1', 'message.mentioned'), 0, 'Όποιος ανέφερε τον εαυτό του δεν ειδοποιείται');

-- ───────────── Δ: χαμηλό περιθώριο (Γεγονός κόστους) ─────────────
select public.t_as('a4');
insert into public.audit_log (actor_id, action, entity, entity_id, after)
values (public.t_uid('a4'), 'event', 'agreement_costs', current_setting('t.ag'), '{"event":"low_margin","revision":1}');
select public.t_run();
select is(public.t_count('a1', 'proposal.low_margin'), 1, 'Χαμηλό περιθώριο → όσοι βλέπουν κόστος');
select is(public.t_count('a4', 'proposal.low_margin'), 0, 'Ο actor εξαιρείται');
select is(public.t_count('a3', 'proposal.low_margin'), 0, 'Γεγονός κόστους δεν πάει σε όποιον δεν βλέπει κόστος, ό,τι κι αν λέει ο Αυτοματισμός');

-- ───────────── Α: Έγκριση πρότασης ─────────────
select public.t_as('a3');
select authz.agreement_event(current_setting('t.ag')::uuid, 'approval_requested', '{"revision":9}'::jsonb);
select is((select case_key from public.events order by id desc limit 1),
  'proposal.approval_requested:' || current_setting('t.ag') || ':r9', 'Η περίπτωση είναι η αναθεώρηση');
select public.t_run();
select is(public.t_count('a4', 'proposal.approval_requested'), 1, 'Ζητήθηκε Έγκριση → όσοι «Παρεκκλίνουν»');

-- ───────────── Προτιμήσεις ─────────────
select public.t_as('b1');
select throws_ok(format('select public.set_notification_pref(%L, false)', public.t_auto('request.closed', 'client')),
  'P0001', null, 'Ο Χρήστης πελάτη δεν σβήνει απαραίτητο Αυτοματισμό');
select lives_ok(format('select public.set_notification_pref(%L, false)', public.t_auto('message.created', 'client')),
  'Ο Χρήστης πελάτη σβήνει μη απαραίτητο');
select is((select x ->> 'receive' from jsonb_array_elements(public.my_notification_prefs()) x
            where x ->> 'automationId' = public.t_auto('message.created', 'client')::text),
  'false', 'Οι Προτιμήσεις δείχνουν ότι δεν το λαμβάνει');
select throws_ok(format('select public.set_notification_pref(%L, false)', public.t_auto('filming.booked', 'filming.approve')),
  '42501', null, 'Ο Χρήστης πελάτη δεν αγγίζει Αυτοματισμό της ομάδας');
select public.t_as('a4');
select lives_ok(format('select public.set_notification_pref(%L, false)', public.t_auto('filming.booked', 'filming.approve')),
  'Η ομάδα σβήνει ό,τι θέλει');
select public.t_as('b1');
select set_config('t.f2', gen_random_uuid()::text, true);
insert into public.filmings (id, production_id, client_id, kind_id, starts_at, hours, origin, state)
values (current_setting('t.f2')::uuid, current_setting('t.pa')::uuid, '00000000-0000-0000-0000-0000000000d1',
        (select k.id from public.provision_kinds k where k.code = 'shoot'), timestamptz '2027-02-17 10:00+00', 2, 'client', 'pending');
select authz.filming_event(current_setting('t.f2')::uuid, 'booked', '{"state":"pending"}'::jsonb);
select public.t_run();
select is(public.t_count('a4', 'filming.booked'), 1, 'Μετά το σβήσιμο η ομάδα δεν παίρνει (μένει μόνο η παλιά)');
select is(public.t_count('a1', 'filming.booked'), 2, 'Οι υπόλοιποι παίρνουν κανονικά');

-- ───────────── Σφάλμα σε ένα Γεγονός ─────────────
insert into public.events (type, entity, entity_id, case_key, client_id, payload)
values ('filming.crew_declined', 'filmings', current_setting('t.f1')::uuid, 'test:bad', '00000000-0000-0000-0000-0000000000d1',
        '{"production_id":"όχι-uuid"}');
select public.t_as('a3');
select authz.emit_event('proposal.approval_requested', 'agreements', current_setting('t.ag')::uuid, 'test:good', null, '{}'::jsonb);
select public.t_run();
select is((select attempts from public.events where case_key = 'test:bad'), 1, 'Σφάλμα: attempts + 1');
select is((select processed_at is null and last_error is not null from public.events where case_key = 'test:bad'), true,
  'Σφάλμα: μένει ανεπεξέργαστο με το λάθος');
select is((select processed_at is not null from public.events where case_key = 'test:good'), true,
  'Τα επόμενα Γεγονότα επεξεργάζονται κανονικά');

-- ───────────── Καμπανάκι και σελίδα ─────────────
select public.t_as('a3');
select is((public.notifications_bell() ->> 'unread')::integer, public.t_unread('a3'), 'Ο μετρητής μετράει τις αδιάβαστες του Χρήστη');
select is(jsonb_array_length(public.notifications_bell() -> 'latest'), least(public.t_unread('a3'), 5), 'Οι τελευταίες, έως 5');
select set_config('t.n', (select n.id::text from public.notifications n join public.events e on e.id = n.event_id
                           where n.user_id = public.t_uid('a3') and e.type = 'message.created'), true);
select is(public.notification_open(current_setting('t.n')::uuid), '/app/messages/00000000-0000-0000-0000-0000000000d1',
  'Το άνοιγμα επιστρέφει το link');
select is((select read_at is not null from public.notifications where id = current_setting('t.n')::uuid), true,
  'Το άνοιγμα τη σημειώνει διαβασμένη');
select public.t_as('a1');
select throws_ok(format('select public.notification_open(%L)', current_setting('t.n')), '42501', null,
  'Ξένη Ειδοποίηση: 42501');
select throws_ok($$ select public.notification_open(gen_random_uuid()) $$, '42501', null,
  'Ανύπαρκτη Ειδοποίηση: το ίδιο 42501');
select public.t_as('a3');
select set_config('t.u', public.t_unread('a3')::text, true);
select is(public.notifications_mark_all_read(), current_setting('t.u')::integer, '«Όλες διαβασμένες» σημειώνει όσες έμεναν');
select is((public.notifications_bell() ->> 'unread')::integer, 0, 'Μετά: μηδέν αδιάβαστες');
select throws_ok($$ select public.notifications_list('maybe') $$, 'P0001', null, 'Το φίλτρο είναι unread ή all');
select is((select (x ->> 'hasMore')::boolean and jsonb_array_length(x -> 'items') = 1
             from (select public.notifications_list('all', null, 1) as x) y), true,
  'Σελίδα με όριο 1: μία γραμμή και «Παλαιότερες»');

-- Ο Χρήστης πελάτη σε δύο Πελάτες βλέπει μόνο του τρέχοντος.
select public.t_as('b3');
select is(jsonb_array_length(public.notifications_list('all') -> 'items'), 1, 'Ο b3 στον Πελάτη 1 βλέπει μόνο τη δική του');
update public.client_users set is_current = false where user_id = public.t_uid('b3');
update public.client_users set is_current = true
 where user_id = public.t_uid('b3') and client_id = '00000000-0000-0000-0000-0000000000d2';
select is(public.notifications_list('all') -> 'items' -> 0 ->> 'body', 'Νέο Μήνυμα από την Στούντιο Τεστ: Καλημέρα από την ομάδα',
  'Στον Πελάτη 2 βλέπει μόνο του Πελάτη 2');
select is(jsonb_array_length(public.notifications_list('all') -> 'items'), 1, 'Και μόνο αυτή');

-- ───────────── Καθαρισμός 90 ημερών ─────────────
select public.events_process(100, now() + interval '91 days');
select is((select count(*)::integer from public.notifications), 0, 'Οι Ειδοποιήσεις παλαιότερες από 90 μέρες σβήνονται');

select * from finish();
rollback;
