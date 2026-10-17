-- Ειδοποιήσεις Kγ #172: χρονισμοί «με ημερομηνία» και «αναμονής», σύνοψη αδιάβαστων, Ευχές Αργιών, Προγραμματισμένα.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Όλες οι ώρες είναι σταθερές και περνούν ως p_now.
-- Το ληξιπρόθεσμο Τιμολόγιο (μετά τις 09:00, ακύρωση) ελέγχεται στα ledger_test και invoice_corrections_test,
-- οι υπενθυμίσεις Έκδοσης με τα Δικαιώματα πελάτη στο production_completion_test.
begin;
select plan(67);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Παραγωγή (Υπεύθυνος Παραγωγής)
-- b1 Πελάτης 1 «Πλήρης» · b7 Πελάτης 1 μόνο «Βλέπει Συνομιλία» · b8 Πελάτης 1 χωρίς Συνομιλία · b9 Πελάτης 1 αφαιρεμένος
-- b2 Πελάτης 2 (ανενεργός) «Πλήρης» · b3 Πελάτης 3 (υποψήφιος) «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'noamounts@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr'),
  ('00000000-0000-0000-0000-0000000000b7', 'b7@client-one.example.gr'),
  ('00000000-0000-0000-0000-0000000000b8', 'b8@client-one.example.gr'),
  ('00000000-0000-0000-0000-0000000000b9', 'b9@client-one.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@client-two.example.gr'),
  ('00000000-0000-0000-0000-0000000000b3', 'b3@client-three.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άρης', 'noamounts@example.com');
insert into public.roles (name, description, kind, is_owner, is_builtin)
values ('Χωρίς ποσά (τεστ)', 'Τεστ: μέλος ομάδας χωρίς Δικαιώματα.', 'team', false, false);
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000a3', r.id from public.roles r where r.name = 'Χωρίς ποσά (τεστ)';
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'), ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'))
       as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Ένα', 'Μαρία Παπαδάκη', 'one@example.com', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Δύο', 'Νίκος Κίνης', 'two@example.com', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000c3', 'Πελάτης Τρία', 'Ελένη Τρίτη', 'three@example.com', '00000000-0000-0000-0000-0000000000a1');

insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Μόνο ανάγνωση Συνομιλίας (τεστ)', 'Τεστ: μόνο διαβάζει τη Συνομιλία.', 'client', false, false),
  ('Χωρίς Συνομιλία (τεστ)', 'Τεστ: χωρίς Δικαίωμα Συνομιλίας.', 'client', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.chatRead', 'all' from public.roles r where r.name = 'Μόνο ανάγνωση Συνομιλίας (τεστ)';
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.finance', 'all' from public.roles r where r.name = 'Χωρίς Συνομιλία (τεστ)';
insert into public.client_users (client_id, user_id, name, role_id, is_current, removed_at)
select x.client_id::uuid, x.user_id::uuid, x.name, r.id, x.is_current, x.removed_at
  from (values
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', 'Πλήρης', true, null::timestamptz),
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b7', 'Λία', 'Μόνο ανάγνωση Συνομιλίας (τεστ)', true, null),
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b8', 'Δήμητρα', 'Χωρίς Συνομιλία (τεστ)', true, null),
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b9', 'Στέλιος', 'Πλήρης', false, now()),
    ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', 'Πάνος', 'Πλήρης', true, null),
    ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b3', 'Ρένα', 'Πλήρης', true, null)
  ) as x (client_id, user_id, name, role_name, is_current, removed_at)
  join public.roles r on r.name = x.role_name and r.kind = 'client';

update public.company_settings set trade_name = 'Στούντιο Τεστ' where id;

-- ───────────── Συμφωνίες, Περίοδοι, Παραγωγή, Γυρίσματα, Παραδοτέο (άμεσες εγγραφές, χωρίς triggers) ─────────────
-- Πελάτης 1: ενεργές Συμφωνίες Α1 (Περίοδος 2 από 5/2) και Α4 (Περίοδος 2 από 10/2). Πελάτης 2: Συμφωνία που έληξε (ανενεργός).
-- Πελάτης 3: καμία υπογεγραμμένη (υποψήφιος).
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select x.id::uuid, x.client_id::uuid, x.title,
       (select s.id from public.sales_stages s where s.code = 'proposal'), (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a1', 'Επόμενο', date '2027-06-01'
  from (values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο Α1'),
               ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο Α4'),
               ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c2', 'Μηνιαίο Α2'))
       as x (id, client_id, title);

set local session_replication_role = replica;
insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, start_on, duration_months, end_on,
                               payment_days, unused_provisions, renewal, filming_notice_hours, filming_cancel_hours,
                               late_cancel_burns, no_show_burns, signed_at)
values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'monthly', 'Μηνιαίο Α1', 'active', 'signed',
   date '2026-01-01', date '2026-01-05', 12, date '2027-01-04', 15, 'lost', 'new_opportunity', 48, 48, false, false, timestamptz '2026-01-02 10:00+00'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000e4', 'monthly', 'Μηνιαίο Α4', 'active', 'signed',
   date '2026-01-01', date '2026-01-10', 12, date '2027-01-09', 15, 'lost', 'new_opportunity', 48, 48, false, false, timestamptz '2026-01-02 10:00+00'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e2', 'monthly', 'Μηνιαίο Α2', 'expired', 'signed',
   date '2025-06-20', date '2025-07-01', 12, date '2026-06-30', 15, 'lost', 'new_opportunity', 48, 48, false, false, timestamptz '2025-06-25 10:00+00');
insert into public.agreement_periods (id, agreement_id, n, starts, ends, is_partial, gives_provisions) values
  ('00000000-0000-0000-0000-000000000a11', '00000000-0000-0000-0000-0000000000f1', 1, date '2026-01-05', date '2026-02-04', false, true),
  ('00000000-0000-0000-0000-000000000a12', '00000000-0000-0000-0000-0000000000f1', 2, date '2026-02-05', date '2026-03-04', false, true),
  ('00000000-0000-0000-0000-000000000a41', '00000000-0000-0000-0000-0000000000f4', 1, date '2026-01-10', date '2026-02-09', false, true),
  ('00000000-0000-0000-0000-000000000a42', '00000000-0000-0000-0000-0000000000f4', 2, date '2026-02-10', date '2026-03-09', false, true);
insert into public.productions (id, title, client_id, agreement_id, period_id, owner_id, state) values
  ('00000000-0000-0000-0000-0000000000d1', 'Μηνιαίο Ιανουάριος', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000a11', '00000000-0000-0000-0000-0000000000a2', 'open');
insert into public.filmings (id, production_id, client_id, kind_id, starts_at, hours, origin, state, approved_at) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1',
   (select k.id from public.provision_kinds k where k.code = 'shoot'), timestamptz '2026-03-11 10:00 Europe/Athens', 2, 'team', 'scheduled', now()),
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1',
   (select k.id from public.provision_kinds k where k.code = 'shoot'), timestamptz '2026-03-05 10:00 Europe/Athens', 2, 'team', 'scheduled', now()),
  ('00000000-0000-0000-0000-00000000f003', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1',
   (select k.id from public.provision_kinds k where k.code = 'shoot'), timestamptz '2026-10-26 10:00 Europe/Athens', 2, 'team', 'scheduled', now()),
  ('00000000-0000-0000-0000-00000000f004', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1',
   (select k.id from public.provision_kinds k where k.code = 'shoot'), timestamptz '2026-05-20 10:00 Europe/Athens', 2, 'team', 'scheduled', now());
insert into public.filming_crew (filming_id, user_id) values ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000a1');
insert into public.deliverables (id, production_id, kind_id, title, charge) values
  ('00000000-0000-0000-0000-0000000000dd', '00000000-0000-0000-0000-0000000000d1',
   (select k.id from public.provision_kinds k where k.code = 'reel'), 'Reel Απριλίου', 'included');
insert into public.deliverables (id, production_id, kind_id, title, charge, assignee_id, deadline) values
  ('00000000-0000-0000-0000-0000000000de', '00000000-0000-0000-0000-0000000000d1',
   (select k.id from public.provision_kinds k where k.code = 'reel'), 'Reel Μαΐου', 'included',
   '00000000-0000-0000-0000-0000000000a2', date '2026-05-15');
insert into public.deliverable_versions (deliverable_id, number, url, host, state, sent_at) values
  ('00000000-0000-0000-0000-0000000000dd', 1, 'https://vimeo.com/1', 'vimeo.com', 'awaiting_client', timestamptz '2026-04-01 10:00+00');
set local session_replication_role = origin;

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

-- Σημάδια αποστολής ενός είδους Γεγονότος προς έναν Χρήστη.
create function public.t_sent(p_type text, p_last text) returns integer
language sql
as $$
  select count(*)::integer from public.automation_sends s join public.automations a on a.id = s.automation_id
   where a.event_type = p_type and s.recipient_key = '00000000-0000-0000-0000-0000000000' || p_last;
$$;

-- Σημάδια αποστολής ενός είδους Γεγονότος για περιπτώσεις που ταιριάζουν.
create function public.t_cases(p_type text, p_like text) returns integer
language sql
as $$
  select count(*)::integer from public.automation_sends s join public.automations a on a.id = s.automation_id
   where a.event_type = p_type and s.case_key like p_like;
$$;

-- Ώρα σε λεπτά από τη σταθερή αρχή T0 = 2026-01-10 10:00 UTC (σύνοψη).
create function public.t_at(p_min integer) returns timestamptz
language sql immutable
as $$ select timestamptz '2026-01-10 10:00+00' + make_interval(mins => p_min); $$;

create function public.t_msg(p_author text, p_kind text, p_internal boolean, p_min integer) returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into public.messages (id, client_id, author_id, author_kind, body, is_internal, created_at)
  values (v_id, '00000000-0000-0000-0000-0000000000c1', ('00000000-0000-0000-0000-0000000000' || p_author)::uuid,
          p_kind, 'Κείμενο', p_internal, public.t_at(p_min));
  return v_id;
end;
$$;

-- ───────────── Δικαιώματα ─────────────
set local role anon;
select throws_ok($$ select public.automations_scan() $$, '42501', null, 'Ο ανώνυμος δεν τρέχει τον έλεγχο χρονισμών');
select throws_ok($$ select public.holiday_greetings_get() $$, '42501', null, 'Ο ανώνυμος δεν διαβάζει τις Αργίες');
reset role;

select public.t_as('a1');
set local role authenticated;
select throws_ok($$ select public.automations_scan() $$, '42501', null, 'Ο Ιδιοκτήτης (authenticated) δεν τρέχει τον έλεγχο: μόνο service_role');
select throws_ok($$ select * from public.holiday_greetings $$, '42501', null, 'Ο πίνακας holiday_greetings είναι κλειστός');
select throws_ok($$ select * from public.message_digest_marks $$, '42501', null, 'Ο πίνακας message_digest_marks είναι κλειστός');
reset role;

select public.t_as('a2');
select throws_ok($$ select public.holiday_greetings_update('{"removed":[]}') $$, '42501', null, 'Χωρίς automations.manage δεν αλλάζουν οι Αργίες');
select throws_ok($$ select public.automations_upcoming(now(), now() + interval '1 day') $$, '42501', null,
  'Χωρίς automations.manage ή health.view δεν φαίνονται τα Προγραμματισμένα');
select public.t_as('b1');
select throws_ok($$ select public.holiday_greetings_get() $$, '42501', null, 'Ο πελάτης δεν διαβάζει τις Αργίες');

-- ───────────── Κατάλογος ─────────────
select is((select count(*)::integer from public.automations where is_initial and timing <> 'immediate'), 24,
  'Οι αρχικοί χρονισμένοι Αυτοματισμοί (με δύο μέρες υπενθύμισης Έκδοσης και την ανανέωση συνδρομής)');
select is((select wait_minutes from public.automations where event_type = 'message.unread_waiting' and is_initial), 15,
  'Η σύνοψη παίρνει τα λεπτά των Ρυθμίσεων ως αναμονή');
select is((select wait_minutes from public.automations where event_type = 'request.open_waiting' and is_initial), 3 * 1440,
  'Το Αίτημα ανοιχτό παίρνει τις μέρες «χρειάζεται προσοχή» ως αναμονή');
select throws_ok($$ insert into public.automations (event_type, channel, recipient_kind, recipient_relative, timing, offset_days, send_time, body_el)
                   values ('filming.day', 'notification', 'relative', 'self', 'offset', 0, '09:00', 'x') $$,
  'P0001', null, 'Ο «self» υπάρχει μόνο στη σύνοψη');

-- ───────────── Ημέρα Γυρίσματος (−1 στις 17:00 Αθήνας) ─────────────
select public.t_scan('2026-03-10 14:59+00');
select is(public.t_sent('filming.day', 'b1'), 0, 'Στις 16:59 Αθήνας της προηγούμενης δεν φεύγει');
select public.t_scan('2026-03-10 15:00+00');
select is(public.t_sent('filming.day', 'b1'), 1, 'Στις 17:00 Αθήνας φεύγει στον πελάτη');
select is(public.t_sent('filming.day', 'a1'), 1, 'Στις 17:00 Αθήνας φεύγει και στο Συνεργείο');
select is((select o.payload ->> 'subject' from public.email_outbox o join public.automation_sends s on s.email_outbox_id = o.id
            join public.automations a on a.id = s.automation_id
           where a.event_type = 'filming.day' and s.recipient_key = '00000000-0000-0000-0000-0000000000b1'),
  'Αύριο: Γύρισμα στις 10:00', 'Το θέμα έχει την ώρα Αθήνας');
select public.t_scan('2026-03-10 15:05+00');
select is(public.t_cases('filming.day', 'filming.day:00000000-0000-0000-0000-00000000f001:%'), 2, 'Δεύτερος έλεγχος: τίποτα ξανά');

update public.filmings set starts_at = timestamptz '2026-03-12 10:00 Europe/Athens' where id = '00000000-0000-0000-0000-00000000f001';
select public.t_scan('2026-03-11 15:00+00');
select is(public.t_cases('filming.day', 'filming.day:00000000-0000-0000-0000-00000000f001:20260312T080000'), 2,
  'Μετακίνηση: νέα αποστολή για τη νέα ημερομηνία');
select is(public.t_cases('filming.day', 'filming.day:00000000-0000-0000-0000-00000000f001:%'), 4, 'Καμία νέα για την παλιά ημερομηνία');
select is(public.t_cases('filming.day', 'filming.day:00000000-0000-0000-0000-00000000f002:%'), 0,
  'Παράθυρο αναπλήρωσης: Γύρισμα πριν από 5 μέρες δεν στέλνει');

-- Αλλαγή ώρας: 26/10 10:00 Αθήνας (χειμερινή). Η αποστολή είναι 25/10 17:00 Αθήνας = 15:00 UTC (όχι 14:00).
select public.t_scan('2026-10-25 14:00+00');
select is(public.t_cases('filming.day', 'filming.day:00000000-0000-0000-0000-00000000f003:%'), 0, 'DST: στις 14:00 UTC δεν φεύγει');
select public.t_scan('2026-10-25 15:00+00');
select is(public.t_cases('filming.day', 'filming.day:00000000-0000-0000-0000-00000000f003:%'), 1, 'DST: στις 17:00 ώρα Αθήνας φεύγει');

-- ───────────── Περίοδος: −5 και την ημέρα, ανά Συμφωνία ─────────────
create function public.t_period(p_period text, p_offset integer) returns integer
language sql
as $$
  select count(*)::integer from public.automation_sends s join public.automations a on a.id = s.automation_id
   where a.event_type = 'period.opening' and a.offset_days = p_offset and s.case_key like 'period.opening:' || p_period || ':%';
$$;
select public.t_scan('2026-01-31 07:00+00');
select is(public.t_period('00000000-0000-0000-0000-000000000a12', -5), 1, 'Α1: «κλείσε γύρισμα» 5 μέρες πριν από τις 5/2');
select is(public.t_period('00000000-0000-0000-0000-000000000a42', -5), 0, 'Α4: η δική της Περίοδος (10/2) δεν έχει έρθει');
select public.t_scan('2026-02-05 07:00+00');
select is(public.t_period('00000000-0000-0000-0000-000000000a42', -5), 1, 'Α4: «κλείσε γύρισμα» 5 μέρες πριν από τις 10/2');
select is(public.t_period('00000000-0000-0000-0000-000000000a12', 0), 1, 'Α1: email την ημέρα που ανοίγει η Περίοδος');

-- ───────────── Έκδοση αναμένει πελάτη 3 και 7 μέρες ─────────────
select public.t_scan('2026-04-04 09:59+00');
select is(public.t_sent('deliverable.client_waiting', 'b1'), 0, 'Πριν από τις 3 μέρες τίποτα');
select public.t_scan('2026-04-04 10:00+00');
select is(public.t_sent('deliverable.client_waiting', 'b1'), 1, 'Στις 3 μέρες email στον πελάτη');
select is(public.t_sent('deliverable.client_waiting', 'a2'), 1, 'Στις 3 μέρες Ειδοποίηση στον Υπεύθυνο Παραγωγής');
select is(public.t_sent('deliverable.client_waiting', 'b8'), 0, 'Χωρίς «Εγκρίνει Παραδοτέα» τίποτα');
select public.t_scan('2026-04-08 10:00+00');
select is(public.t_sent('deliverable.client_waiting', 'b1'), 2, 'Στις 7 μέρες δεύτερο email');

-- ───────────── Μία Ειδοποίηση ανά περίπτωση και Χρήστη ─────────────
-- Ο Υπεύθυνος Παραγωγής a2 είναι και ο ανατεθειμένος: την ημέρα της προθεσμίας τον βρίσκουν δύο Αυτοματισμοί.
select public.t_scan('2026-05-15 06:00+00');
select is(public.t_sent('deliverable.deadline', 'a2'), 2, 'Δύο Αυτοματισμοί σημειώνουν την περίπτωση για τον ίδιο Χρήστη');
select is((select count(*)::integer from public.notifications n where n.user_id = '00000000-0000-0000-0000-0000000000a2'
            and n.body = 'Σήμερα είναι η προθεσμία του Reel Μαΐου.'), 1, 'Μία μόνο Ειδοποίηση');

-- ───────────── Όχι «αύριο» για κάτι που γίνεται σήμερα ─────────────
select public.t_scan('2026-05-20 06:01+00');
select is(public.t_cases('filming.day', 'filming.day:00000000-0000-0000-0000-00000000f004:%'), 0,
  'Γύρισμα σήμερα στις 10:00, έλεγχος στις 09:01: καμία υπενθύμιση «αύριο»');

-- ───────────── Ποσά μόνο σε όσους βλέπουν ποσά ─────────────
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path) values
  ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'T-1',
   date '2026-06-01', date '2026-07-01', 500, 0, 500, 'invoices/t-1.pdf');
insert into public.automations (event_type, channel, recipient_kind, recipient_user_ids, timing, offset_days, send_time, body_el)
values ('invoice.overdue', 'notification', 'users', '{00000000-0000-0000-0000-0000000000a1,00000000-0000-0000-0000-0000000000a3}',
        'offset', 1, '09:00', 'Υπόλοιπο {amount}');
create function public.t_note(p_type text, p_last text) returns text
language sql
as $$
  select string_agg(n.body, ' | ') from public.notifications n
    join public.automation_sends s on s.notification_id = n.id join public.automations a on a.id = s.automation_id
   where a.event_type = p_type and n.user_id = ('00000000-0000-0000-0000-0000000000' || p_last)::uuid;
$$;
select public.t_scan('2026-07-02 06:00+00');
select is(public.t_note('invoice.overdue', 'a1'), 'Υπόλοιπο 500,00 €', 'Όποιος βλέπει ποσά παίρνει το ποσό (και μία Ειδοποίηση)');
select is(public.t_note('invoice.overdue', 'a3'), 'Υπόλοιπο', 'Χωρίς «Βλέπει ποσά» το ποσό λείπει');
select ok((select o.payload ->> 'body' like '%Υπόλοιπο: 500,00 €%' from public.email_outbox o
             join public.automation_sends s on s.email_outbox_id = o.id join public.automations a on a.id = s.automation_id
            where a.event_type = 'invoice.overdue' and s.recipient_key = '00000000-0000-0000-0000-0000000000b1'),
  'Ο πελάτης με «Βλέπει Οικονομικά» βλέπει το υπόλοιπο');

-- ───────────── Σύνοψη αδιάβαστων (ίδια σενάρια με το message_digest_enqueue) ─────────────
-- m1 ομάδα T0 · m2 εσωτερικό T0+1 · m3 του πελάτη T0 · m4 σβησμένο της ομάδας T0
select public.t_msg('a1', 'team', false, 0);
select public.t_msg('a1', 'team', true, 1);
select public.t_msg('b1', 'client', false, 0);
select set_config('t.m4', public.t_msg('a1', 'team', false, 0)::text, true);
update public.messages set deleted_at = public.t_at(2), deleted_by = '00000000-0000-0000-0000-0000000000a1'
 where id = current_setting('t.m4')::uuid;

select public.t_scan(public.t_at(14));
select is(public.t_cases('message.unread_waiting', '%'), 0, 'Στα 14 λεπτά δεν στέλνει σύνοψη');
select public.t_scan(public.t_at(15));
select is(public.t_sent('message.unread_waiting', 'b1'), 1, 'Στα 15 λεπτά ο πλήρης πελάτης παίρνει ένα email');
select is(public.t_sent('message.unread_waiting', 'b7'), 1, 'Ο πελάτης μόνο ανάγνωσης παίρνει ένα email');
select is(public.t_sent('message.unread_waiting', 'b8') + public.t_sent('message.unread_waiting', 'b9')
          + public.t_sent('message.unread_waiting', 'b2') + public.t_sent('message.unread_waiting', 'a1'), 0,
  'Όχι χωρίς c.chatRead, όχι ο αφαιρεμένος, όχι άλλος Πελάτης, όχι η ομάδα');
select is((select o.payload ->> 'subject' from public.email_outbox o join public.automation_sends s on s.email_outbox_id = o.id
            join public.automations a on a.id = s.automation_id
           where a.event_type = 'message.unread_waiting' and s.recipient_key = '00000000-0000-0000-0000-0000000000b1'),
  'Αδιάβαστα Μηνύματα: 1', 'Εσωτερικά, δικά του και σβησμένα δεν μετρούν');
select public.t_scan(public.t_at(16));
select is(public.t_cases('message.unread_waiting', '%'), 2, 'Δεύτερος έλεγχος: ούτε ένα email ξανά');

select public.t_msg('a1', 'team', false, 20);
select public.t_scan(public.t_at(34));
select is(public.t_cases('message.unread_waiting', '%'), 2, 'Νέο Μήνυμα μετά τη σύνοψη: 14 λεπτά, τίποτα');
select public.t_scan(public.t_at(35));
select is(public.t_cases('message.unread_waiting', '%'), 4, 'Νέο Μήνυμα μετά τη σύνοψη: νέο κύμα στα 15 λεπτά');

select public.t_msg('a1', 'team', false, 60);
select public.t_as('b1');
select public.messages_mark_read('00000000-0000-0000-0000-0000000000c1', public.t_at(61));
select public.t_scan(public.t_at(80));
select is(public.t_sent('message.unread_waiting', 'b1'), 2, 'Το διάβασμα ακυρώνει τη σύνοψη του πελάτη που διάβασε');
select is(public.t_sent('message.unread_waiting', 'b7'), 3, 'Ο πελάτης που δεν διάβασε παίρνει το τρίτο email');

update public.automations set wait_minutes = 30 where event_type = 'message.unread_waiting' and is_initial;
select public.t_msg('a1', 'team', false, 100);
select public.t_scan(public.t_at(125));
select is(public.t_sent('message.unread_waiting', 'b7'), 3, 'Με 30 λεπτά: στα 25 λεπτά δεν στέλνει');
select public.t_scan(public.t_at(130));
select is(public.t_sent('message.unread_waiting', 'b7'), 4, 'Με 30 λεπτά: στα 30 στέλνει');

-- ───────────── Προγραμματισμένα ─────────────
select public.t_as('a1');
select is((select count(*)::integer from jsonb_array_elements(public.automations_upcoming('2026-03-11 00:00+00', '2026-03-12 00:00+00')) x
            where x ->> 'eventType' = 'filming.day' and x ->> 'entityId' = '00000000-0000-0000-0000-00000000f001'), 2,
  'Τα Προγραμματισμένα δείχνουν τις δύο αποστολές της Ημέρας Γυρίσματος');
select is((select (x ->> 'recipients')::integer from jsonb_array_elements(public.automations_upcoming('2026-03-11 00:00+00', '2026-03-12 00:00+00')) x
            join public.automations a on a.id = (x ->> 'automationId')::uuid
           where x ->> 'entityId' = '00000000-0000-0000-0000-00000000f001' and a.recipient_relative = 'client'), 1,
  'Με πλήθος παραληπτών');
select throws_ok($$ select public.automations_upcoming(now(), now() + interval '40 days') $$, 'P0001', null, 'Έως 31 μέρες');

-- ───────────── Αργίες ─────────────
-- Ο b2 γίνεται και Χρήστης του Πελάτη 1: μία ευχή ανά άνθρωπο και αργία.
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'Πάνος', r.id, false
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';
-- Ο b2 διάλεξε αγγλικά: οι χρονισμένες αποστολές ακολουθούν τη γλώσσα του Χρήστη πελάτη (#171).
insert into public.client_user_settings (user_id, language) values ('00000000-0000-0000-0000-0000000000b2', 'en')
on conflict (user_id) do update set language = excluded.language;
select public.t_scan('2026-12-25 06:59+00');
select is(public.t_cases('holiday.greeting', '%:20261224T220000'), 0, 'Στις 08:59 Αθήνας των Χριστουγέννων τίποτα');
select public.t_scan('2026-12-25 07:00+00');
select is(public.t_sent('holiday.greeting', 'b1'), 1, 'Στις 09:00 ευχές στον Χρήστη ενεργού Πελάτη');
select is(public.t_sent('holiday.greeting', 'b2'), 2, 'Ευχές και στον Χρήστη ανενεργού Πελάτη· σημάδι ανά Πελάτη');
select is((select count(*)::integer from public.automation_sends s join public.automations a on a.id = s.automation_id
            where a.event_type = 'holiday.greeting' and s.recipient_key = '00000000-0000-0000-0000-0000000000b2'
              and s.email_outbox_id is not null), 1, 'Ένα μόνο email για τον Χρήστη δύο Πελατών');
select is(public.t_sent('holiday.greeting', 'b3'), 0, 'Όχι στον υποψήφιο Πελάτη');
select ok((select o.payload ->> 'body' like '%χρόνια πολλά για Χριστούγεννα!%' from public.email_outbox o
             join public.automation_sends s on s.email_outbox_id = o.id join public.automations a on a.id = s.automation_id
            where a.event_type = 'holiday.greeting' and s.recipient_key = '00000000-0000-0000-0000-0000000000b1'),
  'Το κείμενο έχει το όνομα της αργίας');
select ok((select o.payload ? 'unsubscribeToken' from public.email_outbox o
             join public.automation_sends s on s.email_outbox_id = o.id join public.automations a on a.id = s.automation_id
            where a.event_type = 'holiday.greeting' and s.recipient_key = '00000000-0000-0000-0000-0000000000b1'),
  'Η ευχή (μη απαραίτητη) έχει σύνδεσμο διακοπής');
select is((select o.locale || ' ' || (o.payload ->> 'subject') from public.email_outbox o
             join public.automation_sends s on s.email_outbox_id = o.id join public.automations a on a.id = s.automation_id
            where a.event_type = 'holiday.greeting' and s.recipient_key = '00000000-0000-0000-0000-0000000000b2'),
  'en Best wishes from Στούντιο Τεστ', 'Η ευχή πάει στη γλώσσα του Χρήστη πελάτη');
select public.t_scan('2026-12-26 07:00+00');
select is(public.t_cases('holiday.greeting', '%:20261225T220000'), 0, 'Σβησμένη αργία (Σύναξη Θεοτόκου): τίποτα');

select public.t_as('a1');
select throws_ok($$ select public.holiday_greetings_update('{"removed":["Άγνωστη"]}') $$, 'P0001', null, 'Σβήνονται μόνο επίσημες αργίες');
select throws_ok($$ select public.holiday_greetings_update('{"added":[{"name":"Λάθος","month":2,"day":30}]}') $$, 'P0001', null,
  'Μη υπαρκτή μέρα: P0001');
select lives_ok($$ select public.holiday_greetings_update(
  '{"removed":["Σύναξη Θεοτόκου","Πρωτοχρονιά"],"added":[{"name":"Γιορτή της εταιρείας","month":12,"day":27}]}') $$,
  'Ο Ιδιοκτήτης σβήνει και προσθέτει αργίες');
select is(jsonb_array_length(public.holiday_greetings_get(2026) -> 'added'), 1, 'Η προσθήκη φαίνεται');
select public.t_scan('2026-12-27 07:00+00');
select is(public.t_sent('holiday.greeting', 'b1'), 2, 'Προσθήκη: φεύγει');
select public.t_scan('2027-01-01 07:00+00');
select is(public.t_cases('holiday.greeting', '%:20261231T220000'), 0, 'Σβησμένη Πρωτοχρονιά: τίποτα');

select * from finish();
rollback;
