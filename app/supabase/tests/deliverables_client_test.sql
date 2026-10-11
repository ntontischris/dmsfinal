-- Παραδοτέα, πλευρά πελάτη (H3, H4, #142): ορατότητα, απαντήσεις (Π6), γύροι και overLimit (Π1), Αιτήματα μετά την έγκριση (Π4),
-- link που δεν ανοίγει, σχόλια χωρίς εσωτερικά, τελικά αρχεία, email ανά Χρήστη με «Εγκρίνει Παραδοτέα», κλειστοί πίνακες.
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή. Οι ημερομηνίες είναι ανεξάρτητες από τη μέρα εκτέλεσης.
begin;
select plan(79);

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης · e2 Παραγωγή (Υπεύθυνος της Παραγωγής 1) · e3 Πωλήσεις · e5 Διαχείριση
-- e6 Χρήστης πελάτη 1 με «Πλήρης» · e7 Χρήστης πελάτη 1 με ρόλο χωρίς «Εγκρίνει Παραδοτέα» · e8 Χρήστης πελάτη 2 με «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'manager@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'maria@kypseli.example.gr'),
  ('00000000-0000-0000-0000-0000000000e7', 'nikos@kypseli.example.gr'),
  ('00000000-0000-0000-0000-0000000000e8', 'kostas@other.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'Νίκος', 'manager@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e2', 'Παραγωγή'),
    ('00000000-0000-0000-0000-0000000000e3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000e5', 'Διαχείριση')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Πελάτες 1 και 2, με ευκαιρίες και μηνιαίο πακέτο (shoot 2, reel 8).
insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'Κυψέλη Καφέ', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000e3'),
  ('00000000-0000-0000-0000-0000000000f2', 'Γυμναστήριο Αρμύρας', '', 'Αθήνα', null, 'Κώστας Αρμύρας', 'kostas@other.example.gr', '210 2222222', '00000000-0000-0000-0000-0000000000e3');
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'Μηνιαίο καφέ',
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000e3', 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3;
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000f2', 'Μηνιαίο γυμναστήριο',
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000e3', 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3;
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

-- Ρόλος τεστ: Χρήστης πελάτη με «Βλέπει Παραγωγές» και χωρίς «Εγκρίνει Παραδοτέα».
insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Μόνο προβολή (τεστ)', 'Τεστ: Χρήστης πελάτη χωρίς έγκριση.', 'client', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.productions', 'all' from public.roles r where r.name = 'Μόνο προβολή (τεστ)';

-- Βοηθητικά των τεστ: ο κωδικός ενός είδους Παροχής· αλλαγή Χρήστη με το κωδικό του (τα δύο τελευταία ψηφία).
create function public.t_pk(p_code text) returns uuid
language sql stable
as $$ select k.id from public.provision_kinds k where k.code = p_code; $$;

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- ───────────── Συμφωνίες, Περίοδοι και Παραγωγές ─────────────
select public.t_as('e1');
select set_config('t.a1', public.agreement_create('00000000-0000-0000-0000-0000000000c1', 'monthly', 'Μηνιαίο καφέ')::text, true);
select public.agreement_update_basics(current_setting('t.a1')::uuid, 'Μηνιαίο καφέ', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, 6);
select public.agreement_add_catalogue_line(current_setting('t.a1')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_set_recipients(current_setting('t.a1')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a1')::uuid, (now() at time zone 'Europe/Athens')::date, 'Μαρία Παπαδάκη', date '2027-03-01', 'contract.pdf');
select set_config('t.a2', public.agreement_create('00000000-0000-0000-0000-0000000000c2', 'monthly', 'Μηνιαίο γυμναστήριο')::text, true);
select public.agreement_update_basics(current_setting('t.a2')::uuid, 'Μηνιαίο γυμναστήριο', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, 6);
select public.agreement_add_catalogue_line(current_setting('t.a2')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_set_recipients(current_setting('t.a2')::uuid, '[{"name":"Κώστας Αρμύρας","email":"kostas@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a2')::uuid, (now() at time zone 'Europe/Athens')::date, 'Κώστας Αρμύρας', date '2027-03-01', 'contract.pdf');

select set_config('t.reel', public.t_pk('reel')::text, true);
select set_config('t.pa1', (select pr.id::text from public.productions pr
                              join public.agreement_periods pe on pe.id = pr.period_id
                             where pe.agreement_id = current_setting('t.a1')::uuid and pe.n = 1), true);
select set_config('t.pb1', (select pr.id::text from public.productions pr
                              join public.agreement_periods pe on pe.id = pr.period_id
                             where pe.agreement_id = current_setting('t.a2')::uuid and pe.n = 1), true);
select public.production_transfer(current_setting('t.pa1')::uuid, '00000000-0000-0000-0000-0000000000e2');
select set_config('t.pi', public.production_create_internal('Showreel τεστ', '00000000-0000-0000-0000-0000000000e1')::text, true);

-- Χρήστες πελάτη: e6 «Πλήρης» της Κυψέλης, e7 χωρίς έγκριση στην Κυψέλη, e8 «Πλήρης» του Γυμναστηρίου.
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e6', 'Μαρία Παπαδάκη',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e7', 'Νίκος Ρέας',
   (select r.id from public.roles r where r.name = 'Μόνο προβολή (τεστ)'), true),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e8', 'Κώστας Αρμύρας',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true);

-- ───────────── Ομάδα: Παραδοτέα και Εκδόσεις ─────────────
select public.t_as('e1');
select set_config('t.d1', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid,
  'Reel Καφέ', null, null, null, null)::text, true);
select set_config('t.di', public.deliverable_create(current_setting('t.pi')::uuid, current_setting('t.reel')::uuid,
  'Showreel', null, null, null, null)::text, true);
select is(public.deliverable_version_add(current_setting('t.d1')::uuid, 'https://drive.google.com/file/d/abc1', 'v1'), 1,
  'Ο Ιδιοκτήτης στέλνει κατευθείαν: η v1 περιμένει τον πελάτη');
select is((select count(*)::int from public.email_outbox
            where kind = 'deliverable_version_sent' and payload->>'deliverableId' = current_setting('t.d1')),
  1, 'Μία γραμμή email για τον Χρήστη πελάτη με «Εγκρίνει Παραδοτέα»');
select is((select to_email from public.email_outbox
            where kind = 'deliverable_version_sent' and payload->>'deliverableId' = current_setting('t.d1')),
  'maria@kypseli.example.gr', 'Το email πάει στην διεύθυνση του Χρήστη με «Εγκρίνει Παραδοτέα»');

select public.t_as('e2');
select set_config('t.d2', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid,
  'Reel δεύτερο', null, null, null, null)::text, true);
select is(public.deliverable_version_add(current_setting('t.d2')::uuid, 'https://vimeo.com/111', null), 1,
  'Η Έκδοση της Παραγωγής περνά από εσωτερικό έλεγχο');
select is((select state from public.deliverable_versions
            where deliverable_id = current_setting('t.d2')::uuid and number = 1), 'in_review',
  'Χωρίς Δικαίωμα ελέγχου η Έκδοση μένει σε εσωτερικό έλεγχο');

-- ───────────── Ορατότητα ─────────────
select public.t_as('e6');
select is(jsonb_array_length(public.client_deliverables_view() -> 'awaitingYou'), 1,
  'Περιμένουν εσένα: μόνο η σταλμένη Έκδοση');
select is(jsonb_array_length(public.client_deliverables_view() -> 'periods'), 1,
  'Τα Παραδοτέα ομαδοποιούνται ανά Περίοδο');
select is(public.client_deliverable_view(current_setting('t.d2')::uuid) ->> 'state', 'in_progress',
  'Έκδοση σε εσωτερικό έλεγχο φαίνεται «σε εργασία»');
select is(jsonb_array_length(public.client_deliverable_view(current_setting('t.d2')::uuid) -> 'versions'), 0,
  'Ο πελάτης δεν βλέπει Έκδοση που δεν έχει σταλεί');
select throws_ok($$ select public.client_deliverable_view(current_setting('t.di')::uuid) $$, '42501', null,
  'Ο πελάτης δεν βλέπει Παραδοτέο Εσωτερικής Παραγωγής');
select ok(not (public.client_deliverable_view(current_setting('t.d1')::uuid) ?| array['deadline', 'assigneeName', 'charge', 'isLate', 'daysWaiting', 'filmingId']),
  'Ο πελάτης δεν βλέπει προθεσμία, υπεύθυνο ή χρέωση');
select is(public.client_deliverable_view(current_setting('t.d1')::uuid) ->> 'state', 'awaiting_you',
  'Η σταλμένη Έκδοση γράφει «αναμένει εσένα»');

select public.t_as('e8');
select throws_ok($$ select public.client_deliverable_view(current_setting('t.d1')::uuid) $$, '42501', null,
  'Πελάτης 2 δεν βλέπει Παραδοτέο του Πελάτη 1');
select is(jsonb_array_length(public.client_deliverables_view() -> 'periods'), 0,
  'Πελάτης 2 δεν βλέπει Παραδοτέα του Πελάτη 1 στη λίστα');

select public.t_as('e7');
select is(public.client_deliverable_view(current_setting('t.d1')::uuid) -> 'can' ->> 'answer', 'false',
  'Χωρίς «Εγκρίνει Παραδοτέα» δεν υπάρχει απάντηση');
select throws_ok($$ select public.deliverable_client_answer(current_setting('t.d1')::uuid, true, null) $$, '42501', null,
  'Χρήστης χωρίς «Εγκρίνει Παραδοτέα» δεν απαντά');

select public.t_as('e1');
select throws_ok($$ select public.deliverable_client_answer(current_setting('t.d1')::uuid, true, null) $$, '42501', null,
  'Ο Ιδιοκτήτης δεν απαντά στη θέση του πελάτη');

-- ───────────── Απαντήσεις, γύροι και overLimit (Π1, Π6) ─────────────
select public.t_as('e8');
select throws_ok($$ select public.deliverable_client_answer(current_setting('t.d1')::uuid, true, null) $$, '42501', null,
  'Πελάτης 2 δεν απαντά σε Παραδοτέο που δεν βλέπει');

select public.t_as('e6');
select throws_ok($$ select public.deliverable_client_answer(current_setting('t.d1')::uuid, false, null) $$, 'P0001',
  'Η ζήτηση αλλαγών θέλει σημείωση', 'Η ζήτηση αλλαγών θέλει σημείωση');
select lives_ok($$ select public.deliverable_client_answer(current_setting('t.d1')::uuid, false, 'Θέλω πιο γρήγορο ρυθμό') $$,
  'Η ζήτηση αλλαγών με σημείωση περνά');
select ok((select public.is_working_day(d.deadline) and d.deadline >= public.sales_today() + 2
             from public.deliverables d where d.id = current_setting('t.d1')::uuid),
  'Η νέα προθεσμία είναι εργάσιμη και τουλάχιστον δύο μέρες μετά σήμερα');
select is(public.client_deliverable_view(current_setting('t.d1')::uuid) ->> 'state', 'changes_requested',
  'Μετά τις αλλαγές η κατάσταση είναι «χρειάζεται αλλαγές»');
select throws_ok($$ select public.deliverable_client_answer(current_setting('t.d1')::uuid, true, null) $$, 'P0001',
  'Απάντησε ήδη ο/η Μαρία Παπαδάκη', 'Η δεύτερη απάντηση παίρνει όνομα του πρώτου (Π6)');
select is(public.client_deliverable_view(current_setting('t.d1')::uuid) ->> 'roundsUsed', '1',
  'Η ζητηθείσα αλλαγή μετράει γύρο');
select is(public.client_deliverable_view(current_setting('t.d1')::uuid) ->> 'roundsLimit', '2',
  'Το όριο αλλαγών έρχεται από τη Συμφωνία (reel 2)');
select is(public.client_deliverable_view(current_setting('t.d1')::uuid) ->> 'overLimit', 'false',
  'Κάτω από το όριο δεν υπάρχει προειδοποίηση χρέωσης');

-- ───────────── Νέα Έκδοση, έγκριση και τελική έγκριση ─────────────
select public.t_as('e1');
select is(public.deliverable_version_add(current_setting('t.d1')::uuid, 'https://drive.google.com/file/d/abc2', 'v2'), 2,
  'Η v2 πάει κατευθείαν στον πελάτη');
select public.t_as('e6');
select lives_ok($$ select public.deliverable_client_answer(current_setting('t.d1')::uuid, true, null) $$,
  'Ο πελάτης εγκρίνει τη v2');
select is(public.client_deliverable_view(current_setting('t.d1')::uuid) ->> 'state', 'approved',
  'Η εγκεκριμένη Έκδοση γράφει «εγκρίθηκε»');
select is(public.client_deliverable_view(current_setting('t.d1')::uuid) ->> 'finalFilesUrl', 'https://drive.google.com/file/d/abc2',
  'Τα τελικά αρχεία είναι το link της εγκεκριμένης Έκδοσης');
select throws_ok($$ select public.deliverable_client_answer(current_setting('t.d1')::uuid, false, 'Άλλαξα γνώμη') $$, 'P0001',
  'Απάντησε ήδη ο/η Μαρία Παπαδάκη', 'Η έγκριση είναι τελική');

-- ───────────── Αίτημα αλλαγής μετά την έγκριση (Π4) ─────────────
select set_config('t.r1', public.deliverable_request_change(current_setting('t.d1')::uuid, 'Αλλαγή τίτλου')::text, true);
select isnt(current_setting('t.r1'), '', 'Το «Ζητώ αλλαγή» σε εγκεκριμένο ανοίγει Αίτημα');
select throws_ok($$ select public.deliverable_request_change(current_setting('t.d1')::uuid, 'Δεύτερο') $$, 'P0001',
  'Υπάρχει ήδη ανοιχτό αίτημα για αυτό το Παραδοτέο', 'Ένα ανοιχτό Αίτημα τη φορά');
select throws_ok($$ select public.deliverable_request_change(current_setting('t.d2')::uuid, 'Νέα ιδέα') $$, 'P0001',
  'Μόνο εγκεκριμένο Παραδοτέο ζητά αλλαγή μετά την έγκριση', 'Αίτημα μόνο σε εγκεκριμένο Παραδοτέο');
select public.t_as('e7');
select throws_ok($$ select public.deliverable_request_change(current_setting('t.d1')::uuid, 'Νέα ιδέα') $$, '42501', null,
  'Χωρίς «Εγκρίνει Παραδοτέα» δεν ζητείται αλλαγή');
select public.t_as('e3');
select throws_ok($$ select public.deliverable_request_decide(current_setting('t.r1')::uuid, 'round', null) $$, '42501', null,
  'Πωλήσεις δεν αποφασίζουν Αιτήματα');
select public.t_as('e6');
select throws_ok($$ select public.deliverable_request_decide(current_setting('t.r1')::uuid, 'round', null) $$, '42501', null,
  'Ο πελάτης δεν αποφασίζει Αιτήματα');
select public.t_as('e1');
select lives_ok($$ select public.deliverable_request_decide(current_setting('t.r1')::uuid, 'round', 'Δεκτό ως γύρος') $$,
  'Ο Ιδιοκτήτης δέχεται το Αίτημα ως γύρο');
select is(public.deliverable_view(current_setting('t.d1')::uuid) ->> 'state', 'changes_requested',
  'Το ξανανοιγμένο Παραδοτέο γράφει «χρειάζεται αλλαγές» για την ομάδα');
select public.t_as('e6');
select is(public.client_deliverable_view(current_setting('t.d1')::uuid) ->> 'state', 'in_progress',
  'Το ξανανοιγμένο Παραδοτέο φαίνεται στον πελάτη «σε εργασία»');
select is(public.client_deliverable_view(current_setting('t.d1')::uuid) ->> 'roundsUsed', '2',
  'Το δεκτό γύρος μετράει στο όριο (μία Έκδοση και ένα Αίτημα)');
select is(public.client_deliverable_view(current_setting('t.d1')::uuid) ->> 'overLimit', 'true',
  'Στο όριο ο επόμενος γύρος προειδοποιείται ως χρεώσιμος');
select public.t_as('e1');
select throws_ok($$ select public.deliverable_request_decide(current_setting('t.r1')::uuid, 'round', null) $$, 'P0001',
  'Το αίτημα έχει ήδη αποφασιστεί', 'Η απόφαση γράφεται μία φορά');

-- «Χρεώνεται» δεν μετράει γύρο και δεν αλλάζει τη χρέωση του Παραδοτέου
select public.t_as('e1');
select is(public.deliverable_version_add(current_setting('t.d1')::uuid, 'https://drive.google.com/file/d/abc3', null), 3,
  'Νέα Έκδοση μετά από δεκτό γύρο');
select public.t_as('e6');
select lives_ok($$ select public.deliverable_client_answer(current_setting('t.d1')::uuid, true, null) $$,
  'Ο πελάτης εγκρίνει τη v3');
select set_config('t.r2', public.deliverable_request_change(current_setting('t.d1')::uuid, 'Αλλαγή μουσικής')::text, true);
select public.t_as('e2');
select throws_ok($$ select public.deliverable_request_decide(current_setting('t.r2')::uuid, 'charged', null) $$, '42501', null,
  'Το «χρεώνεται» θέλει Δικαίωμα να βλέπεις ποσά');
select public.t_as('e5');
select lives_ok($$ select public.deliverable_request_decide(current_setting('t.r2')::uuid, 'charged', 'Έξτρα αναθεώρηση') $$,
  'Η Διαχείριση χρεώνει το Αίτημα');
select is((select charge from public.deliverables where id = current_setting('t.d1')::uuid), 'included',
  'Η χρέωση του Παραδοτέου δεν αλλάζει με «χρεώνεται»');
select public.t_as('e6');
select is(public.client_deliverable_view(current_setting('t.d1')::uuid) ->> 'roundsUsed', '2',
  'Το «χρεώνεται» δεν μετράει γύρο');
select is((select decision from public.deliverable_requests where id = current_setting('t.r2')::uuid), 'charged',
  'Η απόφαση «χρεώνεται» καταγράφεται στο Αίτημα');

-- «Νέο Παραδοτέο»: το αρχικό μένει εγκεκριμένο, το νέο δεσμεύει Παροχή
select public.t_as('e1');
select is(public.deliverable_version_add(current_setting('t.d1')::uuid, 'https://drive.google.com/file/d/abc4', null), 4,
  'Νέα Έκδοση για το τελευταίο Αίτημα');
select public.t_as('e6');
select lives_ok($$ select public.deliverable_client_answer(current_setting('t.d1')::uuid, true, null) $$,
  'Ο πελάτης εγκρίνει τη v4');
select set_config('t.r3', public.deliverable_request_change(current_setting('t.d1')::uuid, 'Νέο reel για τον ίδιο πελάτη')::text, true);
select public.t_as('e1');
select lives_ok($$ select public.deliverable_request_decide(current_setting('t.r3')::uuid, 'new_deliverable', 'Νέο Παραδοτέο') $$,
  'Η ομάδα ανοίγει νέο Παραδοτέο από το Αίτημα');
select set_config('t.dn', coalesce((select new_deliverable_id::text from public.deliverable_requests where id = current_setting('t.r3')::uuid), ''), true);
select isnt(current_setting('t.dn'), '', 'Το Αίτημα δείχνει το νέο Παραδοτέο');
select is((select approved_at is not null from public.deliverables where id = current_setting('t.d1')::uuid), true,
  'Το αρχικό Παραδοτέο μένει εγκεκριμένο');
select is((select charge from public.deliverables where id = current_setting('t.dn')::uuid), 'included',
  'Το νέο Παραδοτέο δεσμεύει Παροχή της Περιόδου');
select is((select count(*)::int from public.deliverables
            where production_id = current_setting('t.pa1')::uuid and title = 'Reel Καφέ'), 2,
  'Το νέο Παραδοτέο ανήκει στην ίδια Παραγωγή και είδος');

-- ───────────── Link που δεν ανοίγει, σχόλια ─────────────
select public.t_as('e6');
select lives_ok($$ select public.deliverable_report_link(current_setting('t.d1')::uuid, 1) $$,
  'Ο πελάτης σημειώνει «το link δεν ανοίγει» σε σταλμένη Έκδοση');
select is((select (v->>'linkBroken')::boolean from jsonb_array_elements(public.client_deliverable_view(current_setting('t.d1')::uuid) -> 'versions') v
            where (v->>'number')::int = 1), true, 'Το «link δεν ανοίγει» φαίνεται στην Έκδοση');
select public.t_as('e8');
select throws_ok($$ select public.deliverable_report_link(current_setting('t.d1')::uuid, 1) $$, '42501', null,
  'Άλλος πελάτης δεν σημειώνει link');
select public.t_as('e7');
select lives_ok($$ select public.deliverable_report_link(current_setting('t.d1')::uuid, 1) $$,
  'Χρήστης με «Βλέπει Παραγωγές» σημειώνει link που δεν ανοίγει');
select public.t_as('e6');
select throws_ok($$ select public.deliverable_report_link(current_setting('t.d2')::uuid, 1) $$, 'P0001',
  'Η Έκδοση δεν βρέθηκε', 'Το link μη σταλμένης Έκδοσης δεν σημειώνεται');
select set_config('t.c1', public.deliverable_client_comment(current_setting('t.d1')::uuid, 1,
  'Στα 0:65 το χρώμα είναι σκοτεινό', 65)::text, true);
select ok(current_setting('t.c1') <> '', 'Το σχόλιο με χρόνο καταχωρείται');
select throws_ok($$ select public.deliverable_client_comment(current_setting('t.d2')::uuid, 1, 'Σχόλιο', null) $$, 'P0001',
  'Η Έκδοση δεν βρέθηκε', 'Δεν σχολιάζεται Έκδοση που δεν έχει σταλεί');
select throws_ok($$ select public.deliverable_client_comment(current_setting('t.d1')::uuid, 1, 'Σχόλιο', 90000) $$, 'P0001',
  null, 'Ο χρόνος του σχολίου έξω από 24 ώρες απορρίπτεται');
select public.t_as('e1');
select set_config('t.c2', public.deliverable_comment_add(current_setting('t.d1')::uuid, 1,
  'Εσωτερικό: να ρωτήσουμε για το χρώμα', null, true)::text, true);
select public.t_as('e6');
select is((select jsonb_array_length(v->'comments') from jsonb_array_elements(public.client_deliverable_view(current_setting('t.d1')::uuid) -> 'versions') v
            where (v->>'number')::int = 1), 1, 'Τα εσωτερικά σχόλια δεν φαίνονται στον πελάτη');

-- ───────────── Τελικά αρχεία ─────────────
select public.t_as('e1');
select lives_ok($$ select public.deliverable_final_files_set(current_setting('t.d1')::uuid, 'https://vimeo.com/123456') $$,
  'Η ομάδα ορίζει τα τελικά αρχεία της εγκεκριμένης Παραγωγής');
select throws_ok($$ select public.deliverable_final_files_set(current_setting('t.d1')::uuid, 'http://vimeo.com/1') $$, 'P0001',
  null, 'Τα τελικά αρχεία θέλουν https');
select throws_ok($$ select public.deliverable_final_files_set(current_setting('t.d2')::uuid, 'https://vimeo.com/2') $$, 'P0001',
  null, 'Τα τελικά αρχεία μόνο για εγκεκριμένο Παραδοτέο');
select public.t_as('e6');
select is(public.client_deliverable_view(current_setting('t.d1')::uuid) ->> 'finalFilesUrl', 'https://vimeo.com/123456',
  'Ο πελάτης βλέπει τα τελικά αρχεία που όρισε η ομάδα');
select public.t_as('e3');
select throws_ok($$ select public.deliverable_final_files_set(current_setting('t.d1')::uuid, 'https://vimeo.com/3') $$, '42501', null,
  'Πωλήσεις δεν ορίζουν τελικά αρχεία');

-- ───────────── Αποστολή, email και κλειστοί πίνακες ─────────────
select public.t_as('e1');
select lives_ok($$ select public.deliverable_version_send(current_setting('t.d2')::uuid) $$,
  'Ο Ελεγκτής στέλνει την Έκδοση της Παραγωγής στον πελάτη');
select is((select count(*)::int from public.email_outbox where payload->>'deliverableId' = current_setting('t.d2')), 1,
  'Η αποστολή στέλνει email στον Χρήστη πελάτη');
select is((select count(*)::int from public.email_outbox
            where kind = 'deliverable_version_sent' and payload->>'deliverableId' = current_setting('t.d1')), 4,
  'Κάθε Έκδοση που στάλθηκε στον πελάτη έχει μία γραμμή email');
select is((select count(*)::int from public.email_outbox
            where payload->>'deliverableId' = current_setting('t.d1') and to_email = 'nikos@kypseli.example.gr'), 0,
  'Ο Χρήστης χωρίς «Εγκρίνει Παραδοτέα» δεν παίρνει email');
select public.t_as('e6');
select is(jsonb_array_length(public.client_deliverables_view() -> 'awaitingYou'), 1,
  'Περιμένουν εσένα: η νέα σταλμένη Έκδοση (το εγκεκριμένο δεν περιμένει)');
select public.t_as('e6');
select is(public.client_deliverable_view(current_setting('t.d2')::uuid) ->> 'state', 'awaiting_you',
  'Η σταλμένη Έκδοση περιμένει εσένα');

select set_config('request.jwt.claims', '{}', true);
set local role authenticated;
select throws_ok($$ select count(*) from public.deliverable_requests $$, '42501', 'permission denied for table deliverable_requests',
  'Ο πίνακας Αιτημάτων δεν διαβάζεται από την εφαρμογή');
reset role;
set local role anon;
select throws_ok($$ select public.client_deliverables_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Παραδοτέα πελάτη');
reset role;

select * from finish();
rollback;
