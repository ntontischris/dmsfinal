-- Εργασίες με κατάσταση και προτεραιότητα, «Οι εργασίες μου», Σήμερα, Ημερολόγιο, ειδοποίηση ανάθεσης, Στάδια Παραγωγής,
-- φόρτος ανά άτομο, τιμή και Τιμολογητέα της Παραγωγής (L2). Φανταστικοί Χρήστες και στοιχεία· όλα μέσα στη συναλλαγή.
begin;
select plan(49);

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης · e2 Παραγωγή · e3 Πωλήσεις · e4 μέλος ομάδας χωρίς Ρόλο (μοντέρ) · e5 Διαχείριση · e6 Χρήστης πελάτη
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'editor@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'manager@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'maria@kypseli.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'Λίνα', 'editor@example.com'),
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

insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'Κυψέλη Καφέ', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000e3');
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'Μηνιαίο καφέ',
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000e3', 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3;
insert into public.catalogue_items (id, kind, billing, name, name_en, unit, retired_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'package', 'monthly', 'Μηνιαίο πακέτο (τεστ)', 'Monthly (test)', '', null);
insert into public.catalogue_item_amounts (item_id, price) values ('00000000-0000-0000-0000-0000000000d1', 1000);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost) values ('00000000-0000-0000-0000-0000000000d1', 6, 14, 0);

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

select public.t_as('e1');
select set_config('t.today', ((now() at time zone 'Europe/Athens')::date)::text, true);
select set_config('t.a1', public.agreement_create('00000000-0000-0000-0000-0000000000c1', 'monthly', 'Μηνιαίο καφέ')::text, true);
select public.agreement_update_basics(current_setting('t.a1')::uuid, 'Μηνιαίο καφέ', 'el', current_setting('t.today')::date + 5, null, 6);
select public.agreement_add_catalogue_line(current_setting('t.a1')::uuid, '00000000-0000-0000-0000-0000000000d1', 1);
select public.agreement_set_recipients(current_setting('t.a1')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a1')::uuid, current_setting('t.today')::date, 'Μαρία Παπαδάκη', date '2027-03-01', 'contract.pdf');
select set_config('t.pa1', (select pr.id::text from public.productions pr
                              join public.agreement_periods pe on pe.id = pr.period_id
                             where pe.agreement_id = current_setting('t.a1')::uuid and pe.n = 1), true);
select public.production_transfer(current_setting('t.pa1')::uuid, '00000000-0000-0000-0000-0000000000e2');
select set_config('t.pi', public.production_create_internal('Showreel τεστ', '00000000-0000-0000-0000-0000000000e1')::text, true);
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e6', 'Μαρία Παπαδάκη',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true);

-- ───────────── Κατάσταση και προτεραιότητα ─────────────
select set_config('t.t1', public.production_task_add(current_setting('t.pi')::uuid, 'Μοντάζ τίτλων',
  '00000000-0000-0000-0000-0000000000e4', current_setting('t.today')::date + 1)::text, true);
select set_config('t.t2', public.production_task_add(current_setting('t.pi')::uuid, 'Χρωματική διόρθωση',
  '00000000-0000-0000-0000-0000000000e4', current_setting('t.today')::date + 10)::text, true);
select is((select e.value ->> 'status' from jsonb_array_elements(authz.production_tasks_json(current_setting('t.pi')::uuid)) e (value)
            where e.value ->> 'id' = current_setting('t.t1')), 'todo', 'Νέα Εργασία: «να γίνει»');
select is((select e.value ->> 'priority' from jsonb_array_elements(authz.production_tasks_json(current_setting('t.pi')::uuid)) e (value)
            where e.value ->> 'id' = current_setting('t.t1')), 'normal', 'Νέα Εργασία: κανονική προτεραιότητα');
select public.production_task_set_priority(current_setting('t.t2')::uuid, 'high');
select is((select priority from public.production_tasks where id = current_setting('t.t2')::uuid), 'high',
  'Ο διαχειριστής της Παραγωγής ορίζει υψηλή προτεραιότητα');
select throws_ok($$ select public.production_task_set_priority(current_setting('t.t2')::uuid, 'urgent') $$, 'P0001', null,
  'Άγνωστη προτεραιότητα απορρίπτεται');
select throws_ok($$ select public.production_task_set_status(current_setting('t.t2')::uuid, 'paused') $$, 'P0001', null,
  'Άγνωστη κατάσταση απορρίπτεται');

-- Ο υπεύθυνος (μέλος ομάδας χωρίς Δικαίωμα Παραγωγών) αλλάζει την κατάσταση της δικής του Εργασίας.
select public.t_as('e4');
select public.production_task_set_status(current_setting('t.t1')::uuid, 'doing');
select ok((select started_at is not null and done_at is null from public.production_tasks where id = current_setting('t.t1')::uuid),
  'Ο υπεύθυνος βάζει «σε εξέλιξη»');
select public.production_task_set_status(current_setting('t.t1')::uuid, 'done');
select ok((select done_at is not null and done_by = '00000000-0000-0000-0000-0000000000e4'::uuid
             from public.production_tasks where id = current_setting('t.t1')::uuid),
  'Ο υπεύθυνος βάζει «έγινε» με ώρα και χρήστη');
select public.production_task_set_status(current_setting('t.t1')::uuid, 'todo');
select ok((select started_at is null and done_at is null and done_by is null
             from public.production_tasks where id = current_setting('t.t1')::uuid),
  'Η επιστροφή σε «να γίνει» καθαρίζει έναρξη και ολοκλήρωση');
select throws_ok($$ select public.production_task_set_priority(current_setting('t.t1')::uuid, 'low') $$, '42501', null,
  'Ο υπεύθυνος χωρίς Δικαίωμα Παραγωγών δεν αλλάζει προτεραιότητα');
select public.t_as('e1');
select set_config('t.t3', public.production_task_add(current_setting('t.pi')::uuid, 'Μουσική', null, null)::text, true);
select public.t_as('e4');
select throws_ok($$ select public.production_task_set_status(current_setting('t.t3')::uuid, 'done') $$, '42501', null,
  'Ο υπεύθυνος δεν αλλάζει κατάσταση σε Εργασία άλλου');
select public.t_as('e3');
select throws_ok($$ select public.production_task_set_status(current_setting('t.t1')::uuid, 'done') $$, '42501', null,
  'Οι Πωλήσεις δεν αλλάζουν κατάσταση Εργασίας');
select public.t_as('e6');
select throws_ok($$ select public.production_task_set_status(current_setting('t.t1')::uuid, 'done') $$, '42501', null,
  'Ο Χρήστης πελάτη δεν αλλάζει κατάσταση Εργασίας');
set local role anon;
select throws_ok($$ select public.production_task_set_status(current_setting('t.t1')::uuid, 'done') $$, '42501', null,
  'Ο ανώνυμος δεν καλεί την κατάσταση Εργασίας');
reset role;

-- ───────────── «Οι εργασίες μου» ─────────────
select public.t_as('e4');
select is(jsonb_array_length(public.my_tasks_view(current_setting('t.today')::date)), 2,
  'Ο υπεύθυνος βλέπει τις δύο δικές του Εργασίες');
select is(public.my_tasks_view(current_setting('t.today')::date) -> 0 ->> 'id', current_setting('t.t2'),
  'Πρώτα η υψηλή προτεραιότητα');
select is(public.my_tasks_view(current_setting('t.today')::date) -> 0 -> 'production' ->> 'canOpen', 'false',
  'Χωρίς Δικαίωμα Παραγωγών η Παραγωγή δεν ανοίγει από τη λίστα');
select is((select e.value ->> 'isLate' from jsonb_array_elements(public.my_tasks_view(current_setting('t.today')::date + 5)) e (value)
            where e.value ->> 'id' = current_setting('t.t1')), 'true', 'Μετά την προθεσμία η Εργασία καθυστερεί');
select public.t_as('e6');
select throws_ok($$ select public.my_tasks_view(null) $$, '42501', null, 'Ο Χρήστης πελάτη δεν έχει «Οι εργασίες μου»');

-- ───────────── Σήμερα ─────────────
select is(authz.today_count_my_tasks('00000000-0000-0000-0000-0000000000e4', null, now()), 2,
  'Η κάρτα «Οι εργασίες μου» μετράει τις ανοιχτές Εργασίες');
select is(jsonb_array_length(authz.today_items_my_tasks('00000000-0000-0000-0000-0000000000e4', null, now())), 2,
  'Η κάρτα δείχνει τις Εργασίες');
select is(authz.today_count_my_tasks('00000000-0000-0000-0000-0000000000e6', null, now()), null,
  'Ο Χρήστης πελάτη δεν έχει την κάρτα');
select is(authz.today_count_my_tasks('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000f1', now()), null,
  'Η κάρτα δεν εμφανίζεται στη Σήμερα πελάτη');

-- ───────────── Ημερολόγιο ─────────────
select public.t_as('e4');
select is(jsonb_array_length(authz.calendar_tasks(current_setting('t.today')::date, current_setting('t.today')::date + 30)), 2,
  'Το Ημερολόγιο δείχνει τις Εργασίες μου με προθεσμία');
select public.t_as('e3');
select is(jsonb_array_length(authz.calendar_tasks(current_setting('t.today')::date, current_setting('t.today')::date + 30)), 0,
  'Οι Πωλήσεις δεν βλέπουν Εργασίες ξένων Παραγωγών');
select public.t_as('e1');
select ok(authz.calendar_team_view(current_setting('t.today')::date, current_setting('t.today')::date + 30, now(), now() + interval '30 days') ? 'tasks',
  'Η προβολή Ημερολογίου ομάδας έχει Εργασίες');

-- ───────────── Ειδοποίηση ανάθεσης ─────────────
select is((select count(*)::int from public.events e
            where e.type = 'deliverable.assigned' and e.entity = 'production_tasks'
              and e.entity_id = current_setting('t.t1')::uuid
              and e.payload ->> 'assignee_id' = '00000000-0000-0000-0000-0000000000e4'), 1,
  'Η ανάθεση Εργασίας γράφει Γεγονός για τον υπεύθυνο');
select public.production_task_update(current_setting('t.t3')::uuid, 'Μουσική', '00000000-0000-0000-0000-0000000000e5', null);
select is((select count(*)::int from public.events e
            where e.type = 'deliverable.assigned' and e.entity_id = current_setting('t.t3')::uuid), 1,
  'Η αλλαγή υπευθύνου γράφει Γεγονός');
select public.production_task_update(current_setting('t.t3')::uuid, 'Μουσική v2', '00000000-0000-0000-0000-0000000000e5', null);
select is((select count(*)::int from public.events e
            where e.type = 'deliverable.assigned' and e.entity_id = current_setting('t.t3')::uuid), 1,
  'Αλλαγή τίτλου χωρίς νέο υπεύθυνο δεν ξαναειδοποιεί');

-- ───────────── Στάδια ─────────────
select is(jsonb_array_length(public.production_stages_view() -> 'stages'), 5, 'Πέντε αρχικά Στάδια');
select set_config('t.s_new', public.production_stage_save(null, 'Χρωματική')::text, true);
select is((public.production_stages_view() -> 'stages' -> 5 ->> 'label'), 'Χρωματική', 'Νέο Στάδιο μπαίνει τελευταίο');
select throws_ok($$ select public.production_stage_save(null, 'Μοντάζ') $$, 'P0001', null, 'Διπλό όνομα Σταδίου απορρίπτεται');
select public.production_stage_move(current_setting('t.s_new')::uuid, -1);
select is((public.production_stages_view() -> 'stages' -> 4 ->> 'label'), 'Χρωματική', 'Το Στάδιο ανεβαίνει μία θέση');
select public.production_stage_set_active(current_setting('t.s_new')::uuid, false);
select is((public.production_stages_view() -> 'stages' -> 5 ->> 'isActive'), 'false', 'Το αποσυρμένο Στάδιο πάει στο τέλος');
select throws_ok($$ select public.production_set_stage(current_setting('t.pi')::uuid, current_setting('t.s_new')::uuid) $$, 'P0001', null,
  'Αποσυρμένο Στάδιο δεν ορίζεται σε Παραγωγή');
select public.production_set_stage(current_setting('t.pi')::uuid, (select id from public.production_stages where label = 'Μοντάζ'));
select is(authz.production_card(current_setting('t.pi')::uuid) -> 'stage' ->> 'label', 'Μοντάζ', 'Η κάρτα Παραγωγής δείχνει το Στάδιο');
select public.t_as('e2');
select throws_ok($$ select public.production_stage_save(null, 'Δικό μου') $$, '42501', null,
  'Χωρίς Ρυθμίσεις δεν φτιάχνεται Στάδιο');
select throws_ok($$ select public.production_set_stage(current_setting('t.pi')::uuid, null) $$, '42501', null,
  'Ξένη Παραγωγή δεν αλλάζει Στάδιο');
select public.production_set_stage(current_setting('t.pa1')::uuid, (select id from public.production_stages where label = 'Brief'));
select is((select s.label from public.productions p join public.production_stages s on s.id = p.stage_id
            where p.id = current_setting('t.pa1')::uuid), 'Brief', 'Ο υπεύθυνος της Παραγωγής αλλάζει Στάδιο');
select public.t_as('e3');
select throws_ok($$ select public.production_stages_view() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν τα Στάδια');
select public.t_as('e1');
set local role authenticated;
select throws_ok($$ select count(*) from public.production_stages $$, '42501', null, 'Ο πίνακας Σταδίων δεν διαβάζεται απευθείας');
reset role;

-- ───────────── Φόρτος ─────────────
select public.t_as('e5');
select is((select (e.value ->> 'tasks')::int from jsonb_array_elements(public.productions_workload(current_setting('t.today')::date)) e (value)
            where e.value ->> 'userId' = '00000000-0000-0000-0000-0000000000e4'), 2, 'Ο φόρτος μετράει τις ανοιχτές Εργασίες');
select is((select (e.value ->> 'productions')::int from jsonb_array_elements(public.productions_workload(current_setting('t.today')::date)) e (value)
            where e.value ->> 'userId' = '00000000-0000-0000-0000-0000000000e2'), 1, 'Ο φόρτος μετράει τις Παραγωγές του υπευθύνου');
select public.t_as('e2');
select throws_ok($$ select public.productions_workload(null) $$, '42501', null, 'Εύρος «δικά μου» δεν βλέπει φόρτο');
select public.t_as('e3');
select throws_ok($$ select public.productions_workload(null) $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν φόρτο');

-- ───────────── Τιμή και Τιμολογητέα ─────────────
select public.t_as('e1');
insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net)
select '00000000-0000-0000-0000-0000000000f1', current_setting('t.a1')::uuid, 'period', p.period_id, 'Περίοδος 1 (τεστ)',
       current_setting('t.today')::date + 5, 1000
  from public.productions p where p.id = current_setting('t.pa1')::uuid
on conflict (reason, source_id) do nothing;
select ok((public.production_money_view(current_setting('t.pa1')::uuid) ->> 'price')::numeric > 0, 'Η Παραγωγή δείχνει την τιμή της Περιόδου');
select is(public.production_money_view(current_setting('t.pa1')::uuid) ->> 'priceOf', 'period', 'Μηνιαία: τιμή Περιόδου');
select is(jsonb_array_length(public.production_money_view(current_setting('t.pa1')::uuid) -> 'billables'), 1,
  'Η Παραγωγή δείχνει το Τιμολογητέο της Περιόδου της');
select is(public.production_money_view(current_setting('t.pi')::uuid) ->> 'price', null, 'Η Εσωτερική Παραγωγή δεν έχει τιμή');
select public.t_as('e2');
select throws_ok($$ select public.production_money_view(current_setting('t.pa1')::uuid) $$, '42501', null,
  'Χωρίς «Βλέπει ποσά» δεν φαίνεται η τιμή');

select * from finish();
rollback;
