-- Ολοκλήρωση Παραγωγής και Εργασίες (#143): αυτόματη παράδοση μετά την τελευταία έγκριση (μόνο όταν δεν μένει
-- ανοιχτό Γύρισμα ή μη εγκεκριμένο Παραδοτέο), email «Παραδόθηκε», υπενθυμίσεις πελάτη (3 και 7 μέρες, idempotent),
-- Εργασίες Παραγωγής (CRUD, κλειστή Παραγωγή, κλειστοί πίνακες) και μεταφορά στον Υπεύθυνο όταν αφαιρείται Μέλος.
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(47);

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
  ('00000000-0000-0000-0000-0000000000e8', 'kostas@other.example.gr'),
  ('00000000-0000-0000-0000-0000000000e9', 'lia@kypseli.example.gr'),
  ('00000000-0000-0000-0000-0000000000ea', 'eva@gym.example.gr');
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
insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Μόνο κράτηση (τεστ)', 'Τεστ: Χρήστης πελάτη μόνο με Κράτηση.', 'client', false, false),
  ('Μόνο έγκριση (τεστ)', 'Τεστ: Χρήστης πελάτη μόνο με έγκριση Παραδοτέων.', 'client', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.book', 'all' from public.roles r where r.name = 'Μόνο κράτηση (τεστ)';
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.approve', 'all' from public.roles r where r.name = 'Μόνο έγκριση (τεστ)';

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
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e9', 'Λία Κρατήσεων',
   (select r.id from public.roles r where r.name = 'Μόνο κράτηση (τεστ)'), true),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000ea', 'Εύα Έγκρισης',
   (select r.id from public.roles r where r.name = 'Μόνο έγκριση (τεστ)'), true);
-- ───────────── Εργασίες Παραγωγής (Εσωτερική) ─────────────
select public.t_as('e1');
select set_config('t.pi_task1', public.production_task_add(current_setting('t.pi')::uuid, 'Μοντάζ τίτλων', null, null)::text, true);
select is((select count(*)::int from public.production_tasks where production_id = current_setting('t.pi')::uuid), 1,
  'Ο Ιδιοκτήτης προσθέτει Εργασία στην Εσωτερική Παραγωγή');
select set_config('t.pi_task2', public.production_task_add(current_setting('t.pi')::uuid, 'Ηχογράφηση',
  '00000000-0000-0000-0000-0000000000e2', date '2020-01-01')::text, true);
select is((select count(*)::int from public.production_members
            where production_id = current_setting('t.pi')::uuid and user_id = '00000000-0000-0000-0000-0000000000e2'), 1,
  'Ο υπεύθυνος Εργασίας γίνεται Μέλος από ανάθεση');
select throws_ok($$ select public.production_task_add(current_setting('t.pi')::uuid, '   ', null, null) $$, 'P0001', null,
  'Εργασία χωρίς τίτλο απορρίπτεται');
select public.production_task_update(current_setting('t.pi_task1')::uuid, 'Μοντάζ τίτλων v2',
  '00000000-0000-0000-0000-0000000000e2', date '2027-03-01');
select is((select title from public.production_tasks where id = current_setting('t.pi_task1')::uuid), 'Μοντάζ τίτλων v2',
  'Η επεξεργασία αλλάζει τον τίτλο');
select is((select due_date::text from public.production_tasks where id = current_setting('t.pi_task1')::uuid), '2027-03-01',
  'Η επεξεργασία αλλάζει την προθεσμία');
select public.production_task_toggle(current_setting('t.pi_task1')::uuid, true);
select ok((select done_at is not null and done_by = '00000000-0000-0000-0000-0000000000e1'::uuid
             from public.production_tasks where id = current_setting('t.pi_task1')::uuid),
  'Η σήμανση «έγινε» γράφει ώρα και χρήστη');
select public.production_task_toggle(current_setting('t.pi_task1')::uuid, false);
select ok((select done_at is null and done_by is null from public.production_tasks where id = current_setting('t.pi_task1')::uuid),
  'Η σήμανση «όχι» καθαρίζει την ολοκλήρωση');
select throws_ok($$ select public.production_task_toggle(current_setting('t.pi_task1')::uuid, null) $$, 'P0001', null,
  'Σήμανση χωρίς τιμή απορρίπτεται');
select public.production_task_delete(current_setting('t.pi_task2')::uuid);
select public.production_member_remove(current_setting('t.pi')::uuid, '00000000-0000-0000-0000-0000000000e2');
select is((select count(*)::int from public.production_tasks where production_id = current_setting('t.pi')::uuid), 1,
  'Η διαγραφή αφαιρεί την Εργασία');
select ok((select count(*) > 0 from public.audit_log where entity = 'production_tasks'),
  'Οι Εργασίες μπαίνουν στο Ίχνος');

-- ───────────── Δικαιώματα ─────────────
select public.t_as('e2');
select throws_ok($$ select public.production_task_add(current_setting('t.pi')::uuid, 'Ξένη', null, null) $$, '42501', null,
  'Υπεύθυνος Παραγωγής δεν βάζει Εργασία σε ξένη Εσωτερική Παραγωγή');
select public.t_as('e6');
select throws_ok($$ select public.production_task_add(current_setting('t.pa1')::uuid, 'Πελάτης', null, null) $$, '42501', null,
  'Ο Χρήστης πελάτη δεν προσθέτει Εργασία');
select public.t_as('e3');
select throws_ok($$ select public.production_task_add(current_setting('t.pa1')::uuid, 'Πωλήσεις', null, null) $$, '42501', null,
  'Χωρίς Δικαίωμα Παραγωγών δεν προστίθεται Εργασία');
set local role anon;
select throws_ok($$ select public.production_task_add(current_setting('t.pa1')::uuid, 'Ανώνυμη', null, null) $$, '42501', null,
  'Ο ανώνυμος χρήστης δεν καλεί τις Εργασίες');
reset role;
select public.t_as('e1');
set local role authenticated;
select throws_ok($$ select count(*) from public.production_tasks $$, '42501', null,
  'Ο πίνακας Εργασιών δεν διαβάζεται απευθείας');
select throws_ok($$ select count(*) from public.deliverable_reminders $$, '42501', null,
  'Ο πίνακας υπενθυμίσεων δεν διαβάζεται απευθείας');
reset role;

-- ───────────── Χειροκίνητη παράδοση Εσωτερικής και κλειστή Παραγωγή ─────────────
select public.production_deliver(current_setting('t.pi')::uuid, 'Παραδόθηκε στο Drive');
select is((select state from public.productions where id = current_setting('t.pi')::uuid), 'delivered',
  'Η χειροκίνητη παράδοση δουλεύει όπως πριν');
select is((select count(*)::int from public.email_outbox
            where kind = 'production_delivered' and payload->>'productionId' = current_setting('t.pi')), 0,
  'Η Εσωτερική Παραγωγή δεν στέλνει email');
select throws_ok($$ select public.production_task_add(current_setting('t.pi')::uuid, 'Μετά', null, null) $$, 'P0001', null,
  'Σε παραδομένη Παραγωγή δεν προστίθεται Εργασία');
select throws_ok($$ select public.production_task_update(current_setting('t.pi_task1')::uuid, 'Μετά', null, null) $$, 'P0001', null,
  'Σε παραδομένη Παραγωγή δεν επεξεργάζεσαι Εργασία');

-- ───────────── Εργασίες στην Παραγωγή Πελάτη και ορατότητα ─────────────
select public.t_as('e2');
select set_config('t.pa_late', public.production_task_add(current_setting('t.pa1')::uuid, 'Κλείσιμο φακέλου', null,
  date '2020-01-01')::text, true);
select ok((select (e.value ->> 'isLate')::boolean
             from jsonb_array_elements(public.production_view(current_setting('t.pa1')::uuid) -> 'tasks') as e (value)
            where e.value ->> 'id' = current_setting('t.pa_late')),
  'Εργασία με παρελθούσα προθεσμία καθυστερεί');
select public.t_as('e6');
select is(jsonb_array_length(public.production_view(current_setting('t.pa1')::uuid) -> 'tasks'), 0,
  'Ο πελάτης δεν βλέπει Εργασίες');

-- ───────────── Αυτόματη παράδοση ─────────────
select public.t_as('e1');
select set_config('t.d1', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid,
  'Reel Καφέ', null, null, null, null)::text, true);
select set_config('t.d2', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid,
  'Reel δεύτερο', null, null, null, null)::text, true);
select is(public.deliverable_version_add(current_setting('t.d1')::uuid, 'https://drive.google.com/file/d/d1', 'v1'), 1,
  'Η πρώτη Έκδοση περιμένει τον πελάτη');
select is(public.deliverable_version_add(current_setting('t.d2')::uuid, 'https://drive.google.com/file/d/d2', 'v1'), 1,
  'Η δεύτερη Έκδοση περιμένει τον πελάτη');
select public.t_as('e6');
select public.deliverable_client_answer(current_setting('t.d1')::uuid, true, null);
select is((select state from public.productions where id = current_setting('t.pa1')::uuid), 'open',
  'Όσο μένει μη εγκεκριμένο Παραδοτέο η Παραγωγή μένει ανοιχτή');
select public.t_as('e1');
select public.deliverable_cancel(current_setting('t.d2')::uuid, 'Αλλάζει το concept', 'returned');
select is((select state from public.productions where id = current_setting('t.pa1')::uuid), 'open',
  'Η ακύρωση Παραδοτέου δεν παραδίδει την Παραγωγή');
insert into public.filmings (production_id, client_id, period_id, kind_id, starts_at, hours, origin, state)
select p.id, p.client_id, p.period_id, current_setting('t.reel')::uuid, now() + interval '2 days', 2, 'team', 'pending'
  from public.productions p where p.id = current_setting('t.pa1')::uuid;
select set_config('t.d3', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid,
  'Reel τελικό', null, null, null, null)::text, true);
select public.deliverable_version_add(current_setting('t.d3')::uuid, 'https://vimeo.com/333', null);
select public.t_as('e6');
select public.deliverable_client_answer(current_setting('t.d3')::uuid, true, null);
select is((select state from public.productions where id = current_setting('t.pa1')::uuid), 'open',
  'Ανοιχτό Γύρισμα μπλοκάρει την αυτόματη παράδοση');

-- ───────────── Υπενθυμίσεις πελάτη ─────────────
select public.t_as('e1');
select set_config('t.d5', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid,
  'Reel υπενθύμισης', null, null, null, null)::text, true);
select public.deliverable_version_add(current_setting('t.d5')::uuid, 'https://vimeo.com/555', null);
update public.deliverable_versions set sent_at = now() - interval '4 days'
 where deliverable_id = current_setting('t.d5')::uuid;
set local role authenticated;
select throws_ok('select public.deliverable_reminders_enqueue()', '42501', null,
  'Συνδεδεμένος χρήστης δεν καλεί την ουρά υπενθυμίσεων');
reset role;
select is(public.deliverable_reminders_enqueue(), 1, 'Στις 4 μέρες στέλνεται η υπενθύμιση των 3 ημερών');
select is(public.deliverable_reminders_enqueue(), 0, 'Η δεύτερη κλήση δεν ξαναστέλνει');
update public.deliverable_versions set sent_at = now() - interval '8 days'
 where deliverable_id = current_setting('t.d5')::uuid;
select is(public.deliverable_reminders_enqueue(), 1, 'Στις 8 μέρες στέλνεται και η υπενθύμιση των 7 ημερών');
select is((select count(*)::int from public.deliverable_reminders
            where deliverable_id = current_setting('t.d5')::uuid), 2, 'Κάθε ημέρα υπενθύμισης γράφει μία γραμμή');
select is((select count(*)::int from public.email_outbox
            where kind = 'deliverable_reminder' and payload->>'deliverableId' = current_setting('t.d5')), 2,
  'Η υπενθύμιση πάει μόνο σε Χρήστες με «Εγκρίνει Παραδοτέα»');
select is((select count(*)::int from public.deliverable_reminders
            where deliverable_id = current_setting('t.d3')::uuid), 0, 'Εγκεκριμένο Παραδοτέο δεν υπενθυμίζεται');
select public.deliverable_cancel(current_setting('t.d5')::uuid, 'Άλλαξε η σειρά', 'returned');

select set_config('t.d6', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid,
  'Reel δέκα ημερών', null, null, null, null)::text, true);
select public.deliverable_version_add(current_setting('t.d6')::uuid, 'https://vimeo.com/666', null);
update public.deliverable_versions set sent_at = now() - interval '10 days'
 where deliverable_id = current_setting('t.d6')::uuid;
select is(public.deliverable_reminders_enqueue(), 1, 'Στις 10 μέρες φεύγει ένα μόνο email (των 7 ημερών)');
select is((select count(*)::int from public.deliverable_reminders
            where deliverable_id = current_setting('t.d6')::uuid), 2, 'Και οι δύο ημέρες σημειώνονται ως σταλμένες');
select public.deliverable_cancel(current_setting('t.d6')::uuid, 'Τέλος τεστ', 'returned');

select set_config('t.d4', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid,
  'Reel τρίτο', null, null, null, null)::text, true);
select public.deliverable_version_add(current_setting('t.d4')::uuid, 'https://drive.google.com/file/d/d4', null);
update public.filmings set state = 'done', done_at = now(), actual_hours = 2
 where production_id = current_setting('t.pa1')::uuid;
select public.t_as('e6');
select public.deliverable_client_answer(current_setting('t.d4')::uuid, true, null);
select public.t_as('e1');
select is((select state from public.productions where id = current_setting('t.pa1')::uuid), 'delivered',
  'Η τελευταία έγκριση παραδίδει την Παραγωγή αυτόματα');
select is(public.production_view(current_setting('t.pa1')::uuid) ->> 'autoDelivered', 'true',
  'Η κάρτα δείχνει ότι παραδόθηκε αυτόματα');
select ok((select (e.value ->> 'done')::boolean is not true
             from jsonb_array_elements(public.production_view(current_setting('t.pa1')::uuid) -> 'tasks') as e (value)
            where e.value ->> 'id' = current_setting('t.pa_late')),
  'Οι ανοιχτές Εργασίες δεν μπλοκάρουν την αυτόματη παράδοση');
select is((select count(*)::int from public.email_outbox
            where kind = 'production_delivered' and payload->>'productionId' = current_setting('t.pa1')), 2,
  'Email «Παραδόθηκε» σε κάθε Χρήστη πελάτη με «Βλέπει Παραγωγές»');
select is(jsonb_array_length((select payload -> 'deliverables' from public.email_outbox
            where kind = 'production_delivered' and payload->>'productionId' = current_setting('t.pa1') limit 1)), 3,
  'Το email έχει τα μη ακυρωμένα Παραδοτέα');

-- ───────────── Επανάνοιξη, αφαίρεση Μέλους και νέα παράδοση ─────────────
select public.t_as('e2');
select public.production_reopen(current_setting('t.pa1')::uuid, 'Νέα αλλαγή από τον πελάτη');
select is(public.production_view(current_setting('t.pa1')::uuid) ->> 'autoDelivered', 'false',
  'Μετά την επανάνοιξη η κάρτα δεν δείχνει αυτόματη παράδοση');
select public.t_as('e1');
select set_config('t.d6', public.deliverable_create(current_setting('t.pa1')::uuid, current_setting('t.reel')::uuid,
  'Μοντάζ επιστροφής', '00000000-0000-0000-0000-0000000000e5', null, null, null)::text, true);
select set_config('t.pa_task5', public.production_task_add(current_setting('t.pa1')::uuid, 'Τελικός έλεγχος',
  '00000000-0000-0000-0000-0000000000e5', null)::text, true);
select public.t_as('e2');
select public.production_member_remove(current_setting('t.pa1')::uuid, '00000000-0000-0000-0000-0000000000e5');
select is((select assignee_id::text from public.deliverables where id = current_setting('t.d6')::uuid),
  '00000000-0000-0000-0000-0000000000e2', 'Τα Παραδοτέα του αφαιρεθέντος Μέλους πάνε στον Υπεύθυνο');
select is((select assignee_id::text from public.production_tasks where id = current_setting('t.pa_task5')::uuid),
  '00000000-0000-0000-0000-0000000000e2', 'Οι ανοιχτές Εργασίες του αφαιρεθέντος Μέλους πάνε στον Υπεύθυνο');
select throws_ok($$ select public.production_member_remove(current_setting('t.pa1')::uuid, '00000000-0000-0000-0000-0000000000e2') $$,
  'P0001', null, 'Ο Υπεύθυνος δεν αφαιρείται από την Παραγωγή');
select public.production_deliver(current_setting('t.pa1')::uuid, 'Ξαναπαραδίδεται μετά την επανάνοιξη');
select is(public.production_view(current_setting('t.pa1')::uuid) ->> 'autoDelivered', 'false',
  'Η χειροκίνητη παράδοση μετά την επανάνοιξη δεν σημαίνεται ως αυτόματη');
select is((select count(*)::int from public.email_outbox
            where kind = 'production_delivered' and payload->>'productionId' = current_setting('t.pa1')), 4,
  'Η νέα παράδοση ξαναστέλνει το email');

select * from finish();
rollback;
