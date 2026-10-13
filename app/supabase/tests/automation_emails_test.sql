-- Ειδοποιήσεις Kβ #171: στιγμιαία email μέσα από Αυτοματισμούς, γλώσσα Χρήστη πελάτη, σύνδεσμος διακοπής.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι ώρες των Γυρισμάτων είναι σταθερές (Φεβρουάριος 2027).
-- Η μεταφορά κάθε σημερινού email (απόφαση, μετάθεση, Δελτίο, «δεν μπορώ», Έκδοση, παράδοση, Τιμολόγιο, Αίτημα) ελέγχεται
-- και στα τεστ των modules: η ενέργεια → ένα email kind «automation» στον σωστό παραλήπτη και κανένα με το παλιό kind.
begin;
select plan(25);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Παραγωγή (Υπεύθυνος Παραγωγής) · a3 Πωλήσεις (Υπεύθυνος Πελάτη) · a4 Διαχείριση (Συνεργείο)
-- b1, b2 Χρήστες πελάτη «Πλήρης» (ο b2 διαλέγει αγγλικά και έκλεισε τα Γυρίσματα)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'production@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'crew@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@kypseli.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@kypseli.example.gr');
insert into public.team_users (user_id, name, email, language) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com', 'el'),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'production@example.com', 'el'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com', 'el'),
  ('00000000-0000-0000-0000-0000000000a4', 'Νίκος', 'crew@example.com', 'el');
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
  ('00000000-0000-0000-0000-0000000000d1', 'Κυψέλη Καφέ', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000a3');
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

-- Τα email ενός Γεγονότος (από Αυτοματισμό) προς μία διεύθυνση (ως postgres, ποτέ ως authenticated).
create function public.t_mails(p_type text, p_email text) returns integer
language sql
as $$
  select count(*)::integer from public.email_outbox o join public.automations a on a.id::text = o.payload ->> 'automationId'
   where o.kind = 'automation' and a.event_type = p_type and o.to_email = p_email;
$$;

create function public.t_mail(p_type text, p_email text) returns public.email_outbox
language sql
as $$
  select o.* from public.email_outbox o join public.automations a on a.id::text = o.payload ->> 'automationId'
   where o.kind = 'automation' and a.event_type = p_type and o.to_email = p_email
   order by o.created_at desc limit 1;
$$;

create function public.t_mail_auto(p_type text, p_relative text) returns uuid
language sql
as $$
  select a.id from public.automations a
   where a.event_type = p_type and a.channel = 'email' and a.is_initial and a.recipient_relative = p_relative;
$$;

-- ───────────── Συμφωνία, Παραγωγή, Γύρισμα ─────────────
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

insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000d1', x.user_id::uuid, x.name, r.id, true
  from (values
    ('00000000-0000-0000-0000-0000000000b1', 'Κώστας'),
    ('00000000-0000-0000-0000-0000000000b2', 'Λία')
  ) as x (user_id, name)
  join public.roles r on r.name = 'Πλήρης' and r.kind = 'client';

-- Τα Γυρίσματα τα κλείνει ο b2 (το created_by το γράφει το trigger από τον συνδεδεμένο).
select public.t_as('b2');
select set_config('t.f1', gen_random_uuid()::text, true);
select set_config('t.f2', gen_random_uuid()::text, true);
insert into public.filmings (id, production_id, client_id, kind_id, starts_at, hours, origin, state, created_by)
select x.id::uuid, current_setting('t.pa')::uuid, '00000000-0000-0000-0000-0000000000d1',
       (select k.id from public.provision_kinds k where k.code = 'shoot'), x.starts_at, 2, 'client', 'pending',
       '00000000-0000-0000-0000-0000000000b2'
  from (values (current_setting('t.f1'), timestamptz '2027-02-10 10:00+00'),
               (current_setting('t.f2'), timestamptz '2027-02-17 10:00+00')) as x (id, starts_at);
insert into public.filming_crew (filming_id, user_id) values (current_setting('t.f1')::uuid, '00000000-0000-0000-0000-0000000000a4');
select public.t_as('a1');

-- Ό,τι γράφτηκε στην προετοιμασία δεν μας αφορά.
update public.events set processed_at = now() where processed_at is null;

-- ───────────── Δικαιώματα ─────────────
set local role anon;
select throws_ok($$ select public.my_language() $$, '42501', null, 'Ο ανώνυμος δεν έχει γλώσσα');
select is(public.automation_unsubscribe('x'), '{"status":"done"}'::jsonb, 'Ο ανώνυμος καλεί τη διακοπή (μόνο με token)');
reset role;

select public.t_as('a1');
set local role authenticated;
select throws_ok($$ select * from public.client_user_settings $$, '42501', null, 'Ο πίνακας client_user_settings είναι κλειστός');
select throws_ok($$ select * from public.automation_unsubscribes $$, '42501', null, 'Ο πίνακας automation_unsubscribes είναι κλειστός');
select throws_ok($$ select public.my_language() $$, '42501', null, 'Η γλώσσα εδώ είναι μόνο του Χρήστη πελάτη');
reset role;

-- ───────────── Γλώσσα Χρήστη πελάτη ─────────────
select public.t_as('b2');
select throws_ok($$ select public.set_my_language('de') $$, 'P0001', 'Διάλεξε Ελληνικά ή English', 'Μόνο el ή en');
select lives_ok($$ select public.set_my_language('en') $$, 'Ο Χρήστης πελάτη διαλέγει αγγλικά');
select is(public.my_language(), 'en', 'Η γλώσσα του αποθηκεύεται');

-- ───────────── Αρχικοί Αυτοματισμοί email ─────────────
select is((select count(*)::integer from public.automations where is_initial and channel = 'email' and timing = 'immediate'), 14,
  'Οι 14 αρχικοί Αυτοματισμοί email των στιγμιαίων Γεγονότων (μαζί με το πλαφόν του Βοηθού, #193)');
select is((select is_wired from public.event_types where code = 'invoice.registered'), true, 'Το «Καταχωρήθηκε Τιμολόγιο» συνδέθηκε');

-- ───────────── Απόφαση Γυρίσματος ─────────────
select public.t_as('a1');
select public.filming_approve(current_setting('t.f1')::uuid);
select public.events_process();
select is(public.t_mails('filming.decided', 'b2@kypseli.example.gr')::text || '/' || public.t_mails('filming.decided', 'b1@kypseli.example.gr')::text
            || '/' || (select count(*) from public.email_outbox where kind = 'filming_decision')::text,
  '1/0/0', 'Η έγκριση: email μόνο σε όποιον έκλεισε το Γύρισμα (όχι στον συνάδελφο με «Βλέπει Παραγωγές»), κανένα με το παλιό kind');
select is((select x.locale || ' ' || (x.payload ->> 'subject') from public.t_mail('filming.decided', 'b2@kypseli.example.gr') x),
  'en Devre Media · Your filming on 10/02/2027', 'Ο Χρήστης πελάτη με αγγλικά παίρνει το αγγλικό κείμενο');
select is((select (x.payload -> 'details' ->> 'decision') || ' ' || (x.payload ? 'unsubscribeToken')::text
             from public.t_mail('filming.decided', 'b2@kypseli.example.gr') x),
  'approved false', 'Μπλοκ λεπτομερειών με την απόφαση· απαραίτητο email χωρίς σύνδεσμο διακοπής');

-- Σβησμένος Αυτοματισμός: κανένα email.
update public.automations set is_enabled = false where id = public.t_mail_auto('filming.decided', 'filming_requester');
select public.filming_reject(current_setting('t.f2')::uuid, 'Δεν χωράμε');
select public.events_process();
select is(public.t_mails('filming.decided', 'b2@kypseli.example.gr'), 1, 'Σβησμένος Αυτοματισμός: κανένα email για την απόρριψη');
update public.automations set is_enabled = true where id = public.t_mail_auto('filming.decided', 'filming_requester');

-- ───────────── Μετάθεση και ακύρωση: πελάτης και Συνεργείο ─────────────
select authz.filming_event(current_setting('t.f1')::uuid, 'rescheduled',
  '{"from":"2027-02-10T10:00:00+00:00","to":"2027-02-11T10:00:00+00:00","hours":2,"requested_by":"00000000-0000-0000-0000-0000000000b1"}'::jsonb);
select public.events_process();
select is(public.t_mails('filming.rescheduled', 'b1@kypseli.example.gr')::text || '/' || public.t_mails('filming.rescheduled', 'b2@kypseli.example.gr')::text
          || '/' || public.t_mails('filming.rescheduled', 'crew@example.com')::text,
  '1/0/1', 'Μετάθεση: email στον αιτούντα (όχι στον συνάδελφο) και στο Συνεργείο');
select is((select x.payload -> 'details' ->> 'previousStartsAt' from public.t_mail('filming.rescheduled', 'b1@kypseli.example.gr') x),
  '2027-02-10T10:00:00+00:00', 'Το μπλοκ της μετάθεσης έχει την προηγούμενη ώρα');
select authz.filming_event(current_setting('t.f1')::uuid, 'cancelled', '{}'::jsonb);
select public.events_process();
select is(public.t_mails('filming.cancelled', 'b1@kypseli.example.gr') + public.t_mails('filming.cancelled', 'b2@kypseli.example.gr')
          + public.t_mails('filming.cancelled', 'crew@example.com'), 3, 'Ακύρωση: email στους δύο Χρήστες πελάτη και στο Συνεργείο');

-- Μετακίνηση που έβγαλε νέα έκδοση Δελτίου στην ίδια συναλλαγή: το Συνεργείο παίρνει μόνο το Δελτίο.
insert into public.filming_sheet_versions (filming_id, version, issued_by, change, snapshot)
values (current_setting('t.f1')::uuid, 1, '00000000-0000-0000-0000-0000000000a4', null, '{}'::jsonb);
select authz.filming_event(current_setting('t.f1')::uuid, 'rescheduled',
  '{"from":"2027-02-11T10:00:00+00:00","to":"2027-02-12T10:00:00+00:00","hours":2,"requested_by":"00000000-0000-0000-0000-0000000000b1"}'::jsonb);
select public.events_process();
select is(public.t_mails('filming.rescheduled', 'b1@kypseli.example.gr')::text || '/' || public.t_mails('filming.rescheduled', 'crew@example.com')::text,
  '2/1', 'Μετακίνηση με νέο Δελτίο: ο πελάτης παίρνει τη μετάθεση, το Συνεργείο όχι δεύτερο email');

-- «Δεν μπορώ» από τον τελευταίο εκδότη: πάει στον Υπεύθυνο της Παραγωγής.
select public.t_as('a4');
select authz.filming_event(current_setting('t.f1')::uuid, 'crew_declined',
  '{"user_id":"00000000-0000-0000-0000-0000000000a4","reason":"Ταξίδι"}'::jsonb);
select public.events_process();
select is(public.t_mails('filming.crew_declined', 'production@example.com')::text || '/' || public.t_mails('filming.crew_declined', 'crew@example.com')::text,
  '1/0', '«Δεν μπορώ» του εκδότη: στον Υπεύθυνο της Παραγωγής, όχι στον ίδιο');
select public.t_as('a1');

-- ───────────── Σύνδεσμος διακοπής (μη απαραίτητο: μετακίνηση στο Google) ─────────────
select authz.emit_event('filming.google_moved', 'filmings', current_setting('t.f1')::uuid, 'filming.google_moved:t1', null, '{}'::jsonb);
select public.events_process();
select is((select (x.payload ->> 'unsubscribeToken') ~ '^[0-9a-f]{64}$' from public.t_mail('filming.google_moved', 'b1@kypseli.example.gr') x),
  true, 'Μη απαραίτητο email: έχει token διακοπής');
select set_config('t.tok', (select x.payload ->> 'unsubscribeToken' from public.t_mail('filming.google_moved', 'b1@kypseli.example.gr') x), true);
set local role anon;
select is(public.automation_unsubscribe(current_setting('t.tok')), '{"status":"done"}'::jsonb, 'Η διακοπή με token απαντά «έγινε»');
select is(public.automation_unsubscribe(repeat('0', 64)), public.automation_unsubscribe('όχι-token'),
  'Άκυρο token: ίδια απάντηση, χωρίς oracle');
reset role;
select is((select count(*)::integer from public.automation_optouts
            where user_id = public.t_uid('b1') and automation_id = public.t_mail_auto('filming.google_moved', 'client')),
  1, 'Η διακοπή γράφει «δεν το λαμβάνω» για αυτόν τον Αυτοματισμό');
select authz.emit_event('filming.google_moved', 'filmings', current_setting('t.f1')::uuid, 'filming.google_moved:t2', null, '{}'::jsonb);
select public.events_process();
select is(public.t_mails('filming.google_moved', 'b1@kypseli.example.gr')::text || '/'
          || public.t_mails('filming.google_moved', 'b2@kypseli.example.gr')::text,
  '1/2', 'Μετά τη διακοπή δεν ξαναστέλνεται· ο συνάδελφος το παίρνει κανονικά');

-- Token σε απαραίτητο Αυτοματισμό: αγνοείται.
insert into public.automation_unsubscribes (token_hash, user_id, automation_id)
values (authz.token_hash(repeat('e', 64)), public.t_uid('b1'), public.t_mail_auto('filming.decided', 'filming_requester'));
set local role anon;
select public.automation_unsubscribe(repeat('e', 64));
reset role;
select is((select count(*)::integer from public.automation_optouts
            where user_id = public.t_uid('b1') and automation_id = public.t_mail_auto('filming.decided', 'filming_requester')),
  0, 'Token σε απαραίτητο Αυτοματισμό: δεν σβήνει τίποτα');

select * from finish();
rollback;
