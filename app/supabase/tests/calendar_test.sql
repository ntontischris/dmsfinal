-- Ημερολόγιο (C2β, #134): Κλεισμένος χρόνος, μετατροπή σε Γύρισμα, Ημερολόγιο και Σύνδεσμος ημερολογίου (ICS).
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή. Η αλυσίδα της Συμφωνίας είναι ίδια με το booking_test.
-- Ημερομηνίες: η εβδομάδα 2027-01-04 έως 2027-01-10 (Ώρα Ελλάδας, +02:00 τον Ιανουάριο)· ο Σύνδεσμος χρησιμοποιεί
-- «σήμερα + n» γιατί το feed κοιτάζει 30 μέρες πίσω έως 180 μπροστά.
begin;
select plan(104);
-- ───────────── Βοηθητικά ─────────────
-- Ώρα Ελλάδας: η μέρα «σήμερα + n» στις «hh:mm».
create function public.t_day(p_days integer, p_time time) returns timestamptz
language sql stable
as $$ select (((now() at time zone 'Europe/Athens')::date + p_days) + p_time) at time zone 'Europe/Athens'; $$;

-- Εβδομαδιαίο Ωράριο: όλες οι μέρες ανοιχτές από p_opens έως p_closes.
create function public.t_week_all(p_opens text, p_closes text) returns jsonb
language sql stable
as $$
  select jsonb_agg(jsonb_build_object('dow', d, 'isOpen', true, 'opens', p_opens, 'closes', p_closes) order by d)
    from generate_series(1, 7) d;
$$;

-- ───────────── Χρήστες ─────────────
-- e1 Ιδιοκτήτης · e4 Λογιστής (χωρίς Κράτηση) · e6 Πελάτης f1 («Κράτηση») · e8 Πελάτης f2 («Κράτηση»)
-- e9 Πελάτης f1 («Χωρίς δικαιώματα»)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'client@example.com'),
  ('00000000-0000-0000-0000-0000000000e8', 'other-client@example.com'),
  ('00000000-0000-0000-0000-0000000000e9', 'no-rights@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'Κώστας', 'accountant@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e4', 'Λογιστής')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

insert into public.roles (name, kind) values ('Κράτηση', 'client'), ('Χωρίς δικαιώματα', 'client');
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.book', 'all' from public.roles r where r.name = 'Κράτηση' and r.kind = 'client';

insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'Κυψέλη Καφέ', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000e1'),
  ('00000000-0000-0000-0000-0000000000f2', 'Ταβέρνα Αρμύρα', '', 'Ναύπλιο', null, 'Κώστας Αρμύρας', 'armyra@example.com', '27520 33333', '00000000-0000-0000-0000-0000000000e1');

insert into public.client_users (client_id, user_id, name, role_id, is_current)
select c.client_id::uuid, c.user_id::uuid, c.name, r.id, true
  from (values
    ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e6', 'Μαρία Παπαδάκη', 'Κράτηση'),
    ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e8', 'Νίκος Αρμύρας', 'Κράτηση'),
    ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e9', 'Χωρίς Δικαίωμα', 'Χωρίς δικαιώματα')
  ) as c (client_id, user_id, name, role_name)
  join public.roles r on r.name = c.role_name and r.kind = 'client';

insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select o.id::uuid, o.client::uuid, o.title, (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'), '00000000-0000-0000-0000-0000000000e1', 'Πρόταση',
       (now() at time zone 'Europe/Athens')::date + 3
  from (values
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'Εφάπαξ Α'),
    ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000f2', 'Εφάπαξ Β')
  ) as o (id, client, title);

insert into public.catalogue_items (id, kind, billing, name, name_en, unit, retired_at) values
  ('00000000-0000-0000-0000-0000000000d2', 'package', 'one_off', 'Εφάπαξ πακέτο (τεστ)', 'One-off (test)', '', null);
insert into public.catalogue_item_amounts (item_id, price) values ('00000000-0000-0000-0000-0000000000d2', 500);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost) values
  ('00000000-0000-0000-0000-0000000000d2', 4, 6, 0);
insert into public.catalogue_item_provisions (item_id, kind_id, quantity)
select '00000000-0000-0000-0000-0000000000d2', k.id, 1 from public.provision_kinds k where k.code = 'shoot';
insert into public.cost_months (month, expenses_total, productive_hours)
values (date_trunc('month', now() at time zone 'Europe/Athens')::date, 8800, 220);

create function public.t_pk(p_code text) returns uuid
language sql stable
as $$ select k.id from public.provision_kinds k where k.code = p_code; $$;

-- Συμφωνία Α (μία Παροχή shoot × 20, ειδοποίηση 24 ώρες, ακύρωση 0 ώρες μέχρι να την αλλάξει το τεστ).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select set_config('t.shoot', public.t_pk('shoot')::text, true);
select set_config('t.a', public.agreement_create('00000000-0000-0000-0000-0000000000c1', 'one_off', 'Εφάπαξ Α')::text, true);
update public.agreements set filming_notice_hours = 24, filming_cancel_hours = 0 where id = current_setting('t.a')::uuid;
select public.agreement_update_basics(current_setting('t.a')::uuid, 'Εφάπαξ Α', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, null);
select public.agreement_add_catalogue_line(current_setting('t.a')::uuid, '00000000-0000-0000-0000-0000000000d2', 20);
select public.agreement_set_recipients(current_setting('t.a')::uuid, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.a')::uuid, (now() at time zone 'Europe/Athens')::date, 'Μαρία Παπαδάκη', (now() at time zone 'Europe/Athens')::date, 'a.pdf');
select set_config('t.b', public.agreement_create('00000000-0000-0000-0000-0000000000c2', 'one_off', 'Εφάπαξ Β')::text, true);
update public.agreements set filming_notice_hours = 24, filming_cancel_hours = 720 where id = current_setting('t.b')::uuid;
select public.agreement_update_basics(current_setting('t.b')::uuid, 'Εφάπαξ Β', 'el', (now() at time zone 'Europe/Athens')::date + 5, null, null);
select public.agreement_add_catalogue_line(current_setting('t.b')::uuid, '00000000-0000-0000-0000-0000000000d2', 5);
select public.agreement_set_recipients(current_setting('t.b')::uuid, '[{"name":"Νίκος Αρμύρας","email":"other-client@example.com","is_signatory":true}]'::jsonb);
select public.agreement_sign_outside(current_setting('t.b')::uuid, (now() at time zone 'Europe/Athens')::date, 'Νίκος Αρμύρας', (now() at time zone 'Europe/Athens')::date, 'b.pdf');


-- ───────────── Ομάδα και ρυθμίσεις του Ημερολογίου (μετά την αλυσίδα του booking_test) ─────────────
-- e2 Διαχείριση (όλα, με «Κλείνει χρόνο άλλων») · e3 Παραγωγή (Υπεύθυνος της εσωτερικής Παραγωγής) ·
-- e5 Κράτηση ομάδας (μόνο «Κλείνει Γύρισμα», χωρίς «Κλείνει χρόνο άλλων»)
create function public.t_as(p_user uuid) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e2', 'manager@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'bookings@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e2', 'Νίκος', 'manager@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000e5', 'Άννα', 'bookings@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e2', 'Διαχείριση'),
    ('00000000-0000-0000-0000-0000000000e3', 'Παραγωγή')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';
insert into public.roles (name, kind) values ('Κράτηση ομάδας', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'filming.book', 'all' from public.roles r where r.name = 'Κράτηση ομάδας' and r.kind = 'team';
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000e5', r.id from public.roles r where r.name = 'Κράτηση ομάδας';

-- Ωράριο: κάθε μέρα 09:00–19:00, χωρητικότητα 1, διάρκειες 2, 3 και 4 ώρες.
select public.t_as('00000000-0000-0000-0000-0000000000e1');
select public.booking_hours_save(jsonb_build_object('week', public.t_week_all('09:00', '19:00'), 'capacity', 1, 'durations', '[2,3,4]'::jsonb, 'stepMinutes', 60));

-- Εσωτερική Παραγωγή με Υπεύθυνο τον e3, και Γυρίσματα όπως θα τα έβλεπε η ομάδα.
with new_production as (
  insert into public.productions (title, owner_id)
  values ('Εσωτερική Παραγωγή', '00000000-0000-0000-0000-0000000000e3') returning id
)
select set_config('t.pint', id::text, true) from new_production;
insert into public.filmings (production_id, starts_at, hours, origin, state)
values (current_setting('t.pint')::uuid, timestamptz '2027-01-05 09:00:00+02', 2, 'team', 'scheduled');
select set_config('t.f1', (select id::text from public.filmings where starts_at = timestamptz '2027-01-05 09:00:00+02'), true);
insert into public.filmings (production_id, starts_at, hours, origin, state)
values (current_setting('t.pint')::uuid, timestamptz '2027-01-04 09:00:00+02', 10, 'team', 'scheduled');
insert into public.filmings (production_id, starts_at, hours, origin, state, cancelled_at, cancelled_side, cancelled_reason)
values (current_setting('t.pint')::uuid, timestamptz '2027-01-08 10:00:00+02', 2, 'team', 'cancelled', now(), 'team', 'Δοκιμή');
insert into public.filming_crew (filming_id, user_id)
values (current_setting('t.f1')::uuid, '00000000-0000-0000-0000-0000000000e4');

-- Πελατικά Γυρίσματα της Συμφωνίας Α (Κυψέλη Καφέ, Πελάτης f1). Τα t_day ζουν μέσα στο feed.
insert into public.filmings (production_id, client_id, kind_id, starts_at, hours, origin, state, is_extra, client_note)
select pr.id, pr.client_id, current_setting('t.shoot')::uuid, timestamptz '2027-01-06 10:00:00+02', 2, 'client', 'pending', false, null
  from public.productions pr
 where pr.agreement_id = current_setting('t.a')::uuid and pr.period_id is null;
select set_config('t.f2', (select id::text from public.filmings where starts_at = timestamptz '2027-01-06 10:00:00+02'), true);
insert into public.filmings (production_id, client_id, kind_id, starts_at, hours, origin, state, is_extra, client_note)
select pr.id, pr.client_id, current_setting('t.shoot')::uuid, public.t_day(5, time '10:00'), 2, 'client', 'pending', false, null
  from public.productions pr
 where pr.agreement_id = current_setting('t.a')::uuid and pr.period_id is null;
insert into public.filmings (production_id, client_id, kind_id, starts_at, hours, origin, state, is_extra, client_note,
                             cancelled_at, cancelled_side)
select pr.id, pr.client_id, current_setting('t.shoot')::uuid, public.t_day(7, time '10:00'), 2, 'client', 'cancelled', false, null,
       now(), 'client'
  from public.productions pr
 where pr.agreement_id = current_setting('t.a')::uuid and pr.period_id is null;
select set_config('t.fcx', (select id::text from public.filmings where starts_at = public.t_day(7, time '10:00')), true);

-- ───────────── Δικαιώματα: 42501 για ανώνυμο ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e1');
reset role;
set local role anon;
select throws_ok($$ select public.calendar_view(date '2027-01-04', date '2027-01-10') $$, '42501', null, 'Ο ανώνυμος δεν βλέπει το Ημερολόγιο');
select throws_ok($$ select public.blocked_time_save(null, null, timestamptz '2027-01-05 10:00:00+02', timestamptz '2027-01-05 11:00:00+02', false, null) $$, '42501', null, 'Ο ανώνυμος δεν αποθηκεύει κλεισμένο χρόνο');
select throws_ok($$ select public.blocked_time_delete(gen_random_uuid()) $$, '42501', null, 'Ο ανώνυμος δεν σβήνει κλεισμένο χρόνο');
select throws_ok($$ select public.blocked_time_view(gen_random_uuid()) $$, '42501', null, 'Ο ανώνυμος δεν βλέπει κλεισμένο χρόνο');
select throws_ok($$ select public.filming_crew_blocked(now(), 1) $$, '42501', null, 'Ο ανώνυμος δεν βλέπει προειδοποίηση Συνεργείου');
select throws_ok($$ select public.calendar_link_status() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Σύνδεσμο');
select throws_ok($$ select public.calendar_link_renew() $$, '42501', null, 'Ο ανώνυμος δεν ανανεώνει Σύνδεσμο');
select throws_ok($$ select public.calendar_link_revoke() $$, '42501', null, 'Ο ανώνυμος δεν ανακαλεί Σύνδεσμο');
select ok(public.calendar_feed('άκυρο') is null, 'Άκυρο token δίνει κενό feed, χωρίς σφάλμα');
reset role;

-- ───────────── Κλειστοί πίνακες ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
select throws_ok($$ select count(*) from public.blocked_times $$, '42501', null, 'Ο κλεισμένος χρόνος δεν διαβάζεται απευθείας');
select throws_ok($$ select count(*) from public.calendar_links $$, '42501', null, 'Οι Σύνδεσμοι δεν διαβάζονται απευθείας');
reset role;

-- ───────────── Κλεισμένος χρόνος: Ιδιοκτήτης ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
select set_config('t.bt', public.blocked_time_save(null, '00000000-0000-0000-0000-0000000000e3', timestamptz '2027-01-05 10:00:00+02', timestamptz '2027-01-05 12:00:00+02', false, 'Ραντεβού γιατρού')::text, true);
select is(public.blocked_time_view(current_setting('t.bt')::uuid) ->> 'title', 'Ραντεβού γιατρού', 'Ο Ιδιοκτήτης βλέπει τον τίτλο κλεισμένου χρόνου άλλου');
select is(public.blocked_time_view(current_setting('t.bt')::uuid) ->> 'canEdit', 'true', 'Ο Ιδιοκτήτης αλλάζει κλεισμένο χρόνο άλλου');
select is(public.blocked_time_view(current_setting('t.bt')::uuid) ->> 'userName', 'Πέτρος', 'Ο κλεισμένος χρόνος δείχνει το όνομα του ατόμου');
select is(public.blocked_time_view(current_setting('t.bt')::uuid) ->> 'canConvert', 'true', 'Ο Ιδιοκτήτης μπορεί να μετατρέψει τον κλεισμένο χρόνο σε Γύρισμα');
select set_config('t.ba', public.blocked_time_save(null, '00000000-0000-0000-0000-0000000000e2', timestamptz '2027-01-07 15:00:00+02', timestamptz '2027-01-08 09:00:00+02', true, 'Άδεια')::text, true);
select ok((public.blocked_time_view(current_setting('t.ba')::uuid) ->> 'startsAt')::timestamptz = timestamptz '2027-01-06 22:00:00+00', 'Η μέρα ολόκληρη αρχίζει τα μεσάνυχτα Ώρας Ελλάδας της πρώτης μέρας');
select ok((public.blocked_time_view(current_setting('t.ba')::uuid) ->> 'endsAt')::timestamptz = timestamptz '2027-01-08 22:00:00+00', 'Η μέρα ολόκληρη τελειώνει τα μεσάνυχτα μετά την τελευταία μέρα');
select is(public.blocked_time_view(current_setting('t.ba')::uuid) ->> 'allDay', 'true', 'Η μέρα ολόκληρη σημειώνεται ως όλη μέρα');
select throws_ok($$ select public.blocked_time_save(null, '00000000-0000-0000-0000-0000000000e3', timestamptz '2027-01-05 12:00:00+02', timestamptz '2027-01-05 10:00:00+02', false, null) $$, 'P0001', 'Η λήξη είναι μετά την αρχή', 'Λήξη πριν από την αρχή απορρίπτεται');
select throws_ok($$ select public.blocked_time_save(null, '00000000-0000-0000-0000-0000000000e3', timestamptz '2027-01-05 10:00:00+02', timestamptz '2027-03-10 10:00:00+02', false, null) $$, 'P0001', 'Ο κλεισμένος χρόνος είναι έως 60 μέρες', 'Κλεισμένος χρόνος πάνω από 60 μέρες απορρίπτεται');
select throws_ok($$ select public.blocked_time_save(null, '00000000-0000-0000-0000-0000000000e3', null::timestamptz, timestamptz '2027-01-05 10:00:00+02', false, null) $$, 'P0001', 'Γράψε αρχή και τέλος', 'Κλεισμένος χρόνος χωρίς αρχή απορρίπτεται');
select throws_ok($$ select public.blocked_time_save(null, '00000000-0000-0000-0000-0000000000e3', timestamptz '2027-01-05 10:00:00+02', timestamptz '2027-01-05 11:00:00+02', false, repeat('x', 121)) $$, 'P0001', 'Ο τίτλος έχει έως 120 χαρακτήρες', 'Τίτλος πάνω από 120 χαρακτήρες απορρίπτεται');
select throws_ok($$ select public.blocked_time_save(null, gen_random_uuid(), timestamptz '2027-01-05 10:00:00+02', timestamptz '2027-01-05 11:00:00+02', false, null) $$, 'P0001', 'Ο Χρήστης ομάδας δεν βρέθηκε', 'Κλεισμένος χρόνος για άγνωστο άτομο απορρίπτεται');
select throws_ok($$ select public.blocked_time_save(current_setting('t.bt')::uuid, '00000000-0000-0000-0000-0000000000e1', timestamptz '2027-01-05 10:00:00+02', timestamptz '2027-01-05 12:00:00+02', false, null) $$, 'P0001', 'Ο κλεισμένος χρόνος δεν αλλάζει άτομο', 'Η αλλαγή δεν μεταφέρει τον χρόνο σε άλλο άτομο');
select set_config('t.bt_upd', public.blocked_time_save(current_setting('t.bt')::uuid, null, timestamptz '2027-01-05 10:00:00+02', timestamptz '2027-01-05 13:00:00+02', false, 'Ραντεβού γιατρού')::text, true);
select is(current_setting('t.bt_upd'), current_setting('t.bt'), 'Η αλλαγή κρατά την ίδια γραμμή');
select ok((public.blocked_time_view(current_setting('t.bt')::uuid) ->> 'endsAt')::timestamptz = timestamptz '2027-01-05 11:00:00+00', 'Η αλλαγή ώρας αποθηκεύεται');
reset role;

-- ───────────── Κλεισμένος χρόνος: Παραγωγή και Λογιστής ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e3');
set local role authenticated;
select set_config('t.bs', public.blocked_time_save(null, null, timestamptz '2027-01-05 14:00:00+02', timestamptz '2027-01-05 16:00:00+02', false, 'Δικό μου')::text, true);
select is(public.blocked_time_view(current_setting('t.bs')::uuid) ->> 'title', 'Δικό μου', 'Ο καθένας βλέπει τον δικό του τίτλο');
select throws_ok($$ select public.blocked_time_save(null, '00000000-0000-0000-0000-0000000000e4', timestamptz '2027-01-05 17:00:00+02', timestamptz '2027-01-05 18:00:00+02', false, 'Όχι') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Παραγωγή δεν κλείνει χρόνο άλλου');
select ok((public.blocked_time_view(current_setting('t.ba')::uuid) ->> 'title') is null, 'Η Παραγωγή βλέπει κλεισμένο χρόνο άλλου χωρίς τίτλο');
select is(public.blocked_time_view(current_setting('t.ba')::uuid) ->> 'canEdit', 'false', 'Η Παραγωγή δεν αλλάζει κλεισμένο χρόνο άλλου');
select throws_ok($$ select public.blocked_time_save(current_setting('t.ba')::uuid, null, timestamptz '2027-01-07 15:00:00+02', timestamptz '2027-01-08 09:00:00+02', true, 'Αλλαγή') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ξένος κλεισμένος χρόνος χωρίς «Κλείνει χρόνο άλλων» δεν αλλάζει');
select set_config('t.tmp', public.blocked_time_save(null, null, timestamptz '2027-01-09 10:00:00+02', timestamptz '2027-01-09 11:00:00+02', false, null)::text, true);
select lives_ok($$ select public.blocked_time_delete(current_setting('t.tmp')::uuid) $$, 'Ο Χρήστης σβήνει τον δικό του κλεισμένο χρόνο');
select throws_ok($$ select public.blocked_time_view(current_setting('t.tmp')::uuid) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο σβησμένος κλεισμένος χρόνος δεν βρίσκεται');
select is(public.blocked_time_view(current_setting('t.bs')::uuid) ->> 'canConvert', 'false', 'Χωρίς «Κλείνει Γύρισμα» δεν μετατρέπει κλεισμένο χρόνο');
reset role;

select public.t_as('00000000-0000-0000-0000-0000000000e4');
set local role authenticated;
select set_config('t.be4', public.blocked_time_save(null, null, timestamptz '2027-01-05 10:00:00+02', timestamptz '2027-01-05 11:00:00+02', false, 'Ιατρικές')::text, true);
select is(public.blocked_time_view(current_setting('t.be4')::uuid) ->> 'title', 'Ιατρικές', 'Ο Λογιστής βλέπει τον δικό του κλεισμένο χρόνο');
select throws_ok($$ select public.blocked_time_view(current_setting('t.bt')::uuid) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Λογιστής δεν βλέπει κλεισμένο χρόνο άλλου');
select throws_ok($$ select public.blocked_time_delete(current_setting('t.bt')::uuid) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ο Λογιστής δεν σβήνει κλεισμένο χρόνο άλλου χωρίς «Κλείνει χρόνο άλλων»');
reset role;

-- ───────────── Μετατροπή σε Γύρισμα ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
select set_config('t.conv', public.filming_create(current_setting('t.a')::uuid, timestamptz '2027-01-05 14:00:00+02', 2, current_setting('t.shoot')::uuid, null, null, current_setting('t.bs')::uuid)::text, true);
select is(public.filming_view(current_setting('t.conv')::uuid) ->> 'origin', 'blocked_time', 'Η μετατροπή γράφει origin blocked_time');
select throws_ok($$ select public.blocked_time_view(current_setting('t.bs')::uuid) $$, 'P0001', 'Ο κλεισμένος χρόνος δεν βρέθηκε', 'Η μετατροπή σβήνει τον κλεισμένο χρόνο');
select public.t_as('00000000-0000-0000-0000-0000000000e5');
select throws_ok($$ select public.filming_create(current_setting('t.a')::uuid, timestamptz '2027-01-05 18:00:00+02', 1, current_setting('t.shoot')::uuid, null, null, current_setting('t.bt')::uuid) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η μετατροπή κλεισμένου χρόνου άλλου χωρίς ορατότητα δίνει 42501');
reset role;

-- ───────────── Ημερολόγιο: ομάδα, Παραγωγή, Λογιστής, Πελάτης ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
select is(jsonb_array_length(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'filmings'), 4, 'Ο Ιδιοκτήτης βλέπει τα τέσσερα ενεργά Γυρίσματα της εβδομάδας');
select is(jsonb_array_length(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'blocked'), 3, 'Ο Ιδιοκτήτης βλέπει όλον τον κλεισμένο χρόνο με τίτλους');
select is(jsonb_array_length(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'busy'), 0, 'Ο Ιδιοκτήτης δεν παίρνει «Απασχολημένος»');
select is(jsonb_array_length(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'days'), 7, 'Η εβδομάδα έχει 7 μέρες');
select is(public.calendar_view(date '2027-01-04', date '2027-01-10') ->> 'canBlockOthers', 'true', 'Ο Ιδιοκτήτης κλείνει χρόνο άλλων');
select is(jsonb_array_length(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'team'), 5, 'Η λίστα ομάδας έχει τα πέντε ενεργά μέλη');
select is((select d ->> 'status' from jsonb_array_elements(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'days') d where d ->> 'day' = '2027-01-06'), 'holiday', 'Η 6η Ιανουαρίου είναι αργία');
select is((select d ->> 'holidayName' from jsonb_array_elements(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'days') d where d ->> 'day' = '2027-01-06'), 'Θεοφάνεια', 'Η αργία έχει το όνομά της');
select is((select d ->> 'status' from jsonb_array_elements(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'days') d where d ->> 'day' = '2027-01-04'), 'open', 'Η Δευτέρα 4 Ιανουαρίου είναι ανοιχτή');
select is((select f ->> 'title' from jsonb_array_elements(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'filmings') f where f ->> 'state' = 'pending'), 'Κυψέλη Καφέ', 'Το Γύρισμα του πελάτη έχει το όνομα του πελάτη');
reset role;

select public.t_as('00000000-0000-0000-0000-0000000000e3');
set local role authenticated;
select is(jsonb_array_length(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'filmings'), 2, 'Η Παραγωγή βλέπει τα δικά της Γυρίσματα');
select is(jsonb_array_length(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'blocked'), 1, 'Η Παραγωγή βλέπει μόνο τον δικό της κλεισμένο χρόνο');
select is(jsonb_array_length(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'busy'), 3, 'Η Παραγωγή βλέπει «Απασχολημένος» για άλλους και για το Συνεργείο');
select is(public.calendar_view(date '2027-01-04', date '2027-01-10') ->> 'canBlockOthers', 'false', 'Η Παραγωγή δεν κλείνει χρόνο άλλων');
select ok(position('Άδεια' in (public.calendar_view(date '2027-01-04', date '2027-01-10'))::text) = 0 and position('Ιατρικές' in (public.calendar_view(date '2027-01-04', date '2027-01-10'))::text) = 0, 'Ο τίτλος του κλεισμένου χρόνου άλλων δεν φαίνεται στην Παραγωγή');
reset role;

select public.t_as('00000000-0000-0000-0000-0000000000e4');
set local role authenticated;
select is(jsonb_array_length(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'filmings'), 0, 'Ο Λογιστής δεν βλέπει Γυρίσματα');
select is(jsonb_array_length(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'blocked'), 1, 'Ο Λογιστής βλέπει μόνο τον δικό του κλεισμένο χρόνο');
select is(jsonb_array_length(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'busy'), 0, 'Ο Λογιστής δεν βλέπει «Απασχολημένος»');
reset role;

select public.t_as('00000000-0000-0000-0000-0000000000e6');
set local role authenticated;
select is(jsonb_array_length(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'filmings'), 2, 'Ο Πελάτης βλέπει μόνο τα δικά του Γυρίσματα');
select is((select d ->> 'status' from jsonb_array_elements(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'days') d where d ->> 'day' = '2027-01-04'), 'full', 'Ο Πελάτης βλέπει γεμάτη μέρα όταν καμία ώρα δεν χωράει');
select is((select d ->> 'status' from jsonb_array_elements(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'days') d where d ->> 'day' = '2027-01-05'), 'free', 'Ο Πελάτης βλέπει ελεύθερη μέρα όταν χωράει ώρα');
select is((select d ->> 'status' from jsonb_array_elements(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'days') d where d ->> 'day' = '2027-01-06'), 'holiday', 'Ο Πελάτης βλέπει την αργία');
select is(public.calendar_view(date '2027-01-04', date '2027-01-10') ->> 'canBook', 'true', 'Ο Πελάτης με «Κλείνει Γύρισμα» μπορεί να κλείσει');
select throws_ok($$ select public.calendar_view(date '2027-01-01', date '2027-03-10') $$, 'P0001', 'Το Ημερολόγιο δείχνει έως 62 μέρες', 'Περίοδος πάνω από 62 μέρες απορρίπτεται');
reset role;

select public.t_as('00000000-0000-0000-0000-0000000000e9');
set local role authenticated;
select is(jsonb_array_length(public.calendar_view(date '2027-01-04', date '2027-01-10') -> 'filmings'), 2, 'Πελάτης χωρίς δικαιώματα βλέπει τα Γυρίσματα του Πελάτη του');
select is(public.calendar_view(date '2027-01-04', date '2027-01-10') ->> 'canBook', 'false', 'Πελάτης χωρίς «Κλείνει Γύρισμα» δεν κλείνει');
select throws_ok($$ select public.blocked_time_save(null, null, timestamptz '2027-01-05 10:00:00+02', timestamptz '2027-01-05 11:00:00+02', false, null) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Πελάτης δεν κλείνει χρόνο');
select throws_ok($$ select public.blocked_time_view(gen_random_uuid()) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Πελάτης δεν βλέπει κλεισμένο χρόνο');
select throws_ok($$ select public.filming_crew_blocked(timestamptz '2027-01-05 10:00:00+02', 1) $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Πελάτης δεν βλέπει προειδοποίηση Συνεργείου');
reset role;

-- ───────────── Συνεργείο: κλεισμένος χρόνος μέλους ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
select is((public.filming_view(current_setting('t.f1')::uuid) -> 'crew' -> 0 ->> 'isBlocked'), 'true', 'Το μέλος με κλεισμένο χρόνο σημειώνεται στο Συνεργείο');
select ok('00000000-0000-0000-0000-0000000000e4'::uuid = any (public.filming_crew_blocked(timestamptz '2027-01-05 10:30:00+02', 1)), 'Η προειδοποίηση βρίσκει το μέλος με κλεισμένο χρόνο');
reset role;
select is(authz.user_blocked_at('00000000-0000-0000-0000-0000000000e3', timestamptz '2027-01-05 10:30:00+02', timestamptz '2027-01-05 11:00:00+02'), true, 'Ο κλεισμένος χρόνος τέμνει το διάστημα');
select is(authz.user_blocked_at('00000000-0000-0000-0000-0000000000e3', timestamptz '2027-01-05 13:00:00+02', timestamptz '2027-01-05 14:00:00+02'), false, 'Η λήξη δεν μετράει ως επικάλυψη');

-- ───────────── Σύνδεσμος ημερολογίου: Πελάτης ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e6');
set local role authenticated;
select is(public.calendar_link_status() ->> 'exists', 'false', 'Πριν από τη δημιουργία δεν υπάρχει Σύνδεσμος');
select set_config('t.tok1', public.calendar_link_renew(), true);
select is(length(current_setting('t.tok1')), 43, 'Το token έχει 32 bytes σε base64url');
select is(public.calendar_link_status() ->> 'exists', 'true', 'Μετά τη δημιουργία υπάρχει Σύνδεσμος');
select is(public.calendar_feed(current_setting('t.tok1')) ->> 'name', 'Μαρία Παπαδάκη', 'Το feed δίνει το όνομα του Χρήστη');
select ok(position('(αναμένει) Κυψέλη Καφέ' in (public.calendar_feed(current_setting('t.tok1')))::text) > 0, 'Το αναμένει φαίνεται με «(αναμένει)» στον τίτλο');
select ok(position(current_setting('t.fcx') in (public.calendar_feed(current_setting('t.tok1')))::text) = 0, 'Το ακυρωμένο Γύρισμα δεν μπαίνει στο feed');
select ok(not exists (select 1 from jsonb_array_elements(public.calendar_feed(current_setting('t.tok1')) -> 'events') e where e ->> 'description' is not null), 'Το feed του Πελάτη δεν έχει εσωτερικό σημείωμα ή κείμενο συνεργείου');
select ok(position('Γιώργος' in (public.calendar_feed(current_setting('t.tok1')))::text) = 0 and position('Κώστας' in (public.calendar_feed(current_setting('t.tok1')))::text) = 0, 'Το feed του Πελάτη δεν έχει ονόματα μελών του Συνεργείου');
select set_config('t.tok2', public.calendar_link_renew(), true);
select ok(public.calendar_feed(current_setting('t.tok1')) is null, 'Ο παλιός Σύνδεσμος σταματά μετά την ανανέωση');
select ok(public.calendar_feed(current_setting('t.tok2')) is not null, 'Ο νέος Σύνδεσμος δουλεύει');
select lives_ok($$ select public.calendar_link_revoke() $$, 'Η ανάκληση του Συνδέσμου δουλεύει');
select ok(public.calendar_feed(current_setting('t.tok2')) is null, 'Ο ανακληθείς Σύνδεσμος δεν δίνει τίποτα');
select is(public.calendar_link_status() ->> 'exists', 'false', 'Μετά την ανάκληση δεν υπάρχει Σύνδεσμος');
reset role;

-- ───────────── Σύνδεσμος ημερολογίου: μέλος ομάδας ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e3');
set local role authenticated;
select set_config('t.bt_feed', public.blocked_time_save(null, null, public.t_day(3, time '10:00'), public.t_day(3, time '11:00'), false, 'Προσωπικό')::text, true);
select set_config('t.tok3', public.calendar_link_renew(), true);
select is(public.calendar_feed(current_setting('t.tok3')) ->> 'name', 'Πέτρος', 'Ο Σύνδεσμος ομάδας δίνει το όνομα του μέλους');
select ok(position('Προσωπικό' in (public.calendar_feed(current_setting('t.tok3')))::text) > 0, 'Ο δικός μου κλεισμένος χρόνος μπαίνει στο feed με τον τίτλο');
select ok(position('Άδεια' in (public.calendar_feed(current_setting('t.tok3')))::text) = 0, 'Ο κλεισμένος χρόνος άλλων δεν μπαίνει στο feed του μέλους');
select set_config('t.bt_long', public.blocked_time_save(null, null, public.t_day(-40, time '10:00'), public.t_day(19, time '10:00'), false, 'Μακρύ')::text, true);
select ok(position('Μακρύ' in (public.calendar_feed(current_setting('t.tok3')))::text) > 0, 'Κλεισμένος χρόνος που ξεκίνησε πριν από το παράθυρο και τελειώνει μετά μπαίνει στο feed');
select set_config('t.bt_allday', public.blocked_time_save(null, null, public.t_day(4, time '12:00'), public.t_day(4, time '12:00'), true, 'Ολοήμερο')::text, true);
select is((select e ->> 'allDay' from jsonb_array_elements(public.calendar_feed(current_setting('t.tok3')) -> 'events') e where e ->> 'summary' = 'Ολοήμερο'), 'true', 'Η μέρα ολόκληρη μπαίνει στο feed ως όλη μέρα');
reset role;

select public.t_as('00000000-0000-0000-0000-0000000000e4');
set local role authenticated;
select set_config('t.tok4', public.calendar_link_renew(), true);
select ok(position(current_setting('t.f1') in (public.calendar_feed(current_setting('t.tok4')))::text) > 0, 'Το μέλος του Συνεργείου βλέπει το Γύρισμα στο feed του');
reset role;
update public.filming_crew set response = 'declined', reason = 'Δοκιμή', responded_at = now()
 where filming_id = current_setting('t.f1')::uuid and user_id = '00000000-0000-0000-0000-0000000000e4';
select ok(position(current_setting('t.f1') in (public.calendar_feed(current_setting('t.tok4')))::text) = 0, 'Το Γύρισμα που αρνήθηκε το μέλος δεν μπαίνει στο feed του');

-- ───────────── Σταμάτημα: απενεργοποίηση, μπλοκάρισμα, αποθήκευση μόνο hash ─────────────
select public.t_as('00000000-0000-0000-0000-0000000000e6');
set local role authenticated;
select set_config('t.tok6', public.calendar_link_renew(), true);
reset role;
select lives_ok($$ update public.team_users set is_active = false where user_id = '00000000-0000-0000-0000-0000000000e3' $$, 'Η απενεργοποίηση του μέλους περνά');
select ok(public.calendar_feed(current_setting('t.tok3')) is null, 'Απενεργοποιημένο μέλος δεν παίρνει feed');
select public.t_as('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
select throws_ok($$ select public.blocked_time_save(current_setting('t.bt')::uuid, null, timestamptz '2027-01-05 10:00:00+02', timestamptz '2027-01-05 12:00:00+02', false, 'Ραντεβού γιατρού') $$, 'P0001', 'Ο Χρήστης ομάδας δεν βρέθηκε', 'Η αλλαγή κλεισμένου χρόνου ανενεργού μέλους απορρίπτεται');
reset role;
select lives_ok($$ update auth.users set banned_until = now() + interval '1 day' where id = '00000000-0000-0000-0000-0000000000e6' $$, 'Ο Πελάτης μπλοκάρεται');
select ok(public.calendar_feed(current_setting('t.tok6')) is null, 'Μπλοκαρισμένος Χρήστης δεν παίρνει feed');
select is((select token_hash from public.calendar_links where user_id = '00000000-0000-0000-0000-0000000000e6'), encode(sha256(convert_to(current_setting('t.tok6'), 'UTF8')), 'hex'), 'Αποθηκεύεται μόνο το sha256 του token');

-- ───────────── Πελάτης χωρίς ενεργό Πελάτη ─────────────
select lives_ok($$ update public.clients set archived_at = now() where id = '00000000-0000-0000-0000-0000000000f2' $$, 'Ο Πελάτης f2 αρχειοθετείται');
select public.t_as('00000000-0000-0000-0000-0000000000e8');
set local role authenticated;
select throws_ok($$ select public.calendar_view(date '2027-01-04', date '2027-01-10') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Πελάτης με αρχειοθετημένο Πελάτη δεν βλέπει το Ημερολόγιο');
select throws_ok($$ select public.calendar_link_renew() $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Πελάτης με αρχειοθετημένο Πελάτη δεν παίρνει Σύνδεσμο');
reset role;

select public.t_as('00000000-0000-0000-0000-0000000000e9');
set local role authenticated;
select set_config('t.tok9', public.calendar_link_renew(), true);
reset role;
select ok(public.calendar_feed(current_setting('t.tok9')) is not null, 'Ο Χρήστης πελάτη με ενεργή συμμετοχή παίρνει feed');
update public.client_users set removed_at = now() where user_id = '00000000-0000-0000-0000-0000000000e9';
select ok(public.calendar_feed(current_setting('t.tok9')) is null, 'Μετά την αφαίρεση της συμμετοχής το feed δεν δίνει τίποτα');

select * from finish();
rollback;
