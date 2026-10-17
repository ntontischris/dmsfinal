-- Ομάδα Νβ #208: Αιτήματα GDPR (μητρώο, προθεσμία σε ώρα Αθήνας, κάρτα Σήμερα), εξαγωγή χωρίς Εσωτερικά Μηνύματα και
-- με Ίχνος, ανωνυμοποίηση (άρνηση, σβησμένα πεδία, ό,τι μένει, Ίχνος χωρίς τα σβησμένα). Άρνηση για κάθε RPC.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι ημερομηνίες είναι σταθερές (p_today / p_now) στις authz.*,
-- που καλούνται ως superuser με τον Χρήστη στα claims· η άρνηση ελέγχεται μέσω των public RPC.
begin;
select plan(136);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Διαχείριση · a3 Παραγωγή · a4 Λένα (απενεργοποιημένη, Παραγωγή) · a5 Πέτρος (ενεργός, Παραγωγή)
-- b1 Κώστας (Χρήστης πελάτη του c1) · b2 Ελένη (αφαιρέθηκε από τον c1, δεν ανήκει σε κανέναν Πελάτη)
-- c1 Κυψέλη Καφέ (Επαφή Μαρία) · c2 Φούρνος (η Επαφή του είναι ο b1, ενεργός Χρήστης πελάτη)
insert into auth.users (id, email, encrypted_password, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com', 'x', '{}'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin@example.com', 'x', '{}'),
  ('00000000-0000-0000-0000-0000000000a3', 'production@example.com', 'x', '{}'),
  ('00000000-0000-0000-0000-0000000000a4', 'lena@example.com', 'x', '{"name": "Λένα"}'),
  ('00000000-0000-0000-0000-0000000000a5', 'petros@example.com', 'x', '{}'),
  ('00000000-0000-0000-0000-0000000000b1', 'kostas@client-one.example.gr', 'x', '{}'),
  ('00000000-0000-0000-0000-0000000000b2', 'eleni@client-one.example.gr', 'secret-hash', '{"name": "Ελένη"}');
insert into public.team_users (user_id, name, email, is_active) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com', true),
  ('00000000-0000-0000-0000-0000000000a2', 'Δημήτρης', 'admin@example.com', true),
  ('00000000-0000-0000-0000-0000000000a3', 'Ρένα', 'production@example.com', true),
  ('00000000-0000-0000-0000-0000000000a4', 'Λένα Λάμπρου', 'lena@example.com', false),
  ('00000000-0000-0000-0000-0000000000a5', 'Πέτρος', 'petros@example.com', true);
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Διαχείριση'),
               ('00000000-0000-0000-0000-0000000000a3', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a4', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a5', 'Παραγωγή')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Δεδομένα (άμεσες εγγραφές, χωρίς triggers) ─────────────
set local session_replication_role = replica;
insert into public.clients (id, name, contact_name, contact_email, contact_phone) values
  ('00000000-0000-0000-0000-0000000000c1', 'Κυψέλη Καφέ', 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '6900000001'),
  ('00000000-0000-0000-0000-0000000000c2', 'Φούρνος', 'Κώστας', 'kostas@client-one.example.gr', '');
insert into public.client_users (client_id, user_id, name, role_id, is_current, removed_at)
select '00000000-0000-0000-0000-0000000000c1', x.id::uuid, x.name, r.id, x.removed is null, x.removed::timestamptz
  from (values ('00000000-0000-0000-0000-0000000000b1', 'Κώστας', null),
               ('00000000-0000-0000-0000-0000000000b2', 'Ελένη Νικολάου', '2026-02-01 10:00+00')) as x (id, name, removed)
  cross join public.roles r where r.name = 'Πλήρης' and r.kind = 'client';
-- Συνομιλία του c1: δημόσιο της Ελένης, Εσωτερικό της ομάδας, διαγραμμένο, δημόσιο της ομάδας
insert into public.messages (client_id, author_id, author_kind, body, is_internal, deleted_at, deleted_by) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'client', 'Γεια σας από την Ελένη', false, null, null),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'team', 'Εσωτερικό: μη το δει ο πελάτης', true, null, null),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'client', 'Σβησμένο μήνυμα', false,
   timestamptz '2026-02-02 10:00+00', '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'team', 'Καλώς ήρθατε', false, null, null);
-- Μια υπογεγραμμένη Συμφωνία με την Ελένη Υπογράφουσα, κι ένα Τιμολόγιο του c1
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-0000000000c1', 'Μηνιαία Παρουσία',
       (select s.id from public.sales_stages s where s.code = 'new'), (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a1', 'Κλήση', date '2027-01-01';
insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, payment_days, unused_provisions,
                               filming_notice_hours, filming_cancel_hours, late_cancel_burns, no_show_burns, signed_at)
values ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'one_off', 'Βίντεο εγκαινίων', 'signed',
        'signed', date '2026-03-01', 15, 'lost', 48, 48, false, false, timestamptz '2026-01-20 10:00+00');
insert into public.agreement_recipients (agreement_id, position, name, email, is_signatory) values
  ('00000000-0000-0000-0000-000000000201', 1, 'Ελένη Νικολάου', 'eleni@client-one.example.gr', true);
insert into public.agreement_signatures (agreement_id, method, signed_name, signed_on, document_hash, reference) values
  ('00000000-0000-0000-0000-000000000201', 'outside', 'Ελένη Νικολάου', date '2026-01-20', 'h', 'Χαρτί');
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'Α-12', date '2026-01-25', date '2026-02-09',
   100, 24, 124, 'c1/a-12.pdf');
-- Προσωπικά της Ελένης
insert into public.calendar_links (user_id, token_hash) values ('00000000-0000-0000-0000-0000000000b2', 'hash-b2');
insert into public.today_prefs (user_id, hidden) values ('00000000-0000-0000-0000-0000000000b2', '{x}');
insert into public.client_user_settings (user_id, language) values ('00000000-0000-0000-0000-0000000000b2', 'en');
insert into public.notifications (user_id, title, body) values ('00000000-0000-0000-0000-0000000000b2', 'Νέο μήνυμα', 'Κείμενο');
insert into public.assistant_conversations (id, audience, user_id, client_id) values
  ('00000000-0000-0000-0000-000000000401', 'client', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1');
insert into public.assistant_messages (conversation_id, role, content) values
  ('00000000-0000-0000-0000-000000000401', 'user', 'Πότε είναι το γύρισμα;');
insert into public.email_log (kind, to_email, subject, status) values ('test', 'Eleni@client-one.example.gr', 'Δοκιμή', 'sent');
insert into public.email_outbox (kind, to_name, to_email, status) values ('test', 'Ελένη', 'eleni@client-one.example.gr', 'pending');
insert into public.invitations (kind, email, name, role_ids, client_id, status, accepted_at, user_id)
select 'client', 'eleni@client-one.example.gr', 'Ελένη Νικολάου', array[r.id], '00000000-0000-0000-0000-0000000000c1',
       'accepted', timestamptz '2026-01-02 10:00+00', '00000000-0000-0000-0000-0000000000b2'
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';
-- Ο λογαριασμός της Ελένης: αλλαγή email σε εκκρεμότητα, ταυτότητα και συνεδρία
update auth.users set email_change = 'eleni-new@client-one.example.gr', phone_change = '306900000002'
 where id = '00000000-0000-0000-0000-0000000000b2';
insert into auth.identities (id, provider_id, user_id, identity_data, provider) values
  (gen_random_uuid(), 'b2', '00000000-0000-0000-0000-0000000000b2', '{}', 'email');
insert into auth.sessions (id, user_id) values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000b2');
-- Μια Συμφωνία που ΔΕΝ υπογράφηκε, με την Ελένη παραλήπτρια και Σύνδεσμο (σε δική της Ευκαιρία)
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-0000000000c1', 'Νέα πρόταση',
       (select s.id from public.sales_stages s where s.code = 'new'), (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a1', 'Κλήση', date '2027-01-01';
insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, payment_days, unused_provisions,
                               filming_notice_hours, filming_cancel_hours, late_cancel_burns, no_show_burns)
values ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102', 'one_off', 'Νέα πρόταση', 'proposal',
        'sent', date '2026-03-01', 15, 'lost', 48, 48, false, false);
insert into public.agreement_recipients (agreement_id, position, name, email, is_signatory) values
  ('00000000-0000-0000-0000-000000000202', 1, 'Ελένη Νικολάου', 'eleni@client-one.example.gr', true);
insert into public.agreement_links (agreement_id, recipient_name, recipient_email, is_signatory, revision, token_hash) values
  ('00000000-0000-0000-0000-000000000202', 'Ελένη Νικολάου', 'eleni@client-one.example.gr', true, 1, 'hash-link-202');
-- Κείμενα άλλων που την αναφέρουν: Γεγονός, Ειδοποίηση του Ιδιοκτήτη, email της ουράς (ένα εκκρεμές, ένα σταλμένο)
insert into public.events (type, entity, entity_id, case_key, payload)
select (select t.code from public.event_types t order by t.code limit 1), 'client_users', null, 't:gdpr:b2',
       '{"userName": "Ελένη Νικολάου", "user_id": "00000000-0000-0000-0000-0000000000b2"}'::jsonb;
insert into public.events (type, entity, entity_id, case_key, payload)
select (select t.code from public.event_types t order by t.code limit 1), 'client_users', null, 't:gdpr:other',
       '{"userName": "Ελένη Νικολάου", "user_id": "00000000-0000-0000-0000-0000000000b1"}'::jsonb;
insert into public.notifications (user_id, title, body) values
  ('00000000-0000-0000-0000-0000000000a1', 'Νέο μήνυμα από Ελένη Νικολάου', 'Η Λένα Λάμπρου έκλεισε χρόνο');
insert into public.email_outbox (kind, to_name, to_email, status, payload, handled_at) values
  ('test', 'Γιώργος', 'owner@example.com', 'pending', '{"text": "Ρώτησε η Ελένη Νικολάου"}', null),
  ('test', 'Γιώργος', 'owner@example.com', 'sent', '{"text": "Ρώτησε η Ελένη Νικολάου"}', now());
-- Παλιές γραμμές του Ίχνους με τα στοιχεία τους (οι triggers είναι σβηστοί εδώ, άρα γράφονται με το χέρι)
insert into public.audit_log (action, entity, entity_id, before, after) values
  ('update', 'client_users', '00000000-0000-0000-0000-0000000000c1',
   '{"client_id": "00000000-0000-0000-0000-0000000000c1", "user_id": "00000000-0000-0000-0000-0000000000b2", "name": "Ελένη Νικολάου", "removed_at": null}',
   '{"client_id": "00000000-0000-0000-0000-0000000000c1", "user_id": "00000000-0000-0000-0000-0000000000b2", "name": "Ελένη Νικολάου", "removed_at": "2026-02-01"}'),
  ('insert', 'client_users', '00000000-0000-0000-0000-0000000000c1', null,
   '{"client_id": "00000000-0000-0000-0000-0000000000c1", "user_id": "00000000-0000-0000-0000-0000000000b1", "name": "Κώστας"}'),
  ('insert', 'invitations', '00000000-0000-0000-0000-000000000501', null,
   '{"email": "eleni@client-one.example.gr", "name": "Ελένη Νικολάου", "status": "pending"}'),
  ('update', 'clients', '00000000-0000-0000-0000-0000000000c1',
   '{"name": "Κυψέλη Καφέ", "city": "Αθήνα", "contact_name": "Μαρία Παπαδάκη", "contact_email": "maria@kypseli.example.gr", "contact_phone": "6900000001"}',
   '{"name": "Κυψέλη Καφέ", "city": "Πειραιάς", "contact_name": "Μαρία Παπαδάκη", "contact_email": "maria@kypseli.example.gr", "contact_phone": "6900000001"}');
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

create function public.t_uid(p_last text) returns uuid
language sql immutable
as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;

-- ───────────── Μητρώο καρτών ─────────────
select is((select grp || '/' || kind || '/' || audience || '/' || sort from public.today_cards where code = 'gdpr'),
  'decide/action/team/150', 'Η κάρτα «GDPR με προθεσμία» είναι στο μητρώο, κάρτα ενέργειας της ομάδας');
select ok(not (select needs_second_person from public.today_cards where code = 'gdpr'),
  'Λειτουργεί και με έναν Ιδιοκτήτη μόνο');

select is(
  (select count(*)::int from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'authz' and (p.proname like 'gdpr\_%' or p.proname like '%\_gdpr')
      and (pg_catalog.has_function_privilege('anon', p.oid, 'execute')
           or pg_catalog.has_function_privilege('authenticated', p.oid, 'execute'))),
  0, 'Καμία authz.*gdpr* δεν εκτελείται από anon ή authenticated');

-- ───────────── Άρνηση: ανώνυμος, Διαχείριση, άλλος Ρόλος ομάδας, Χρήστης πελάτη ─────────────
set local role anon;
select throws_ok($$ select public.gdpr_register() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει το μητρώο');
select throws_ok($$ select public.gdpr_anonymize('client_user', '00000000-0000-0000-0000-0000000000b2', 'Ελένη Νικολάου') $$,
  '42501', null, 'Ο ανώνυμος δεν ανωνυμοποιεί');

set local role authenticated;
select public.t_as('a2');
select throws_ok($$ select public.gdpr_register() $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια',
  'Η Διαχείριση δεν βλέπει το μητρώο');
select throws_ok($$ select public.gdpr_request_create('export', 'client', '00000000-0000-0000-0000-0000000000c1') $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Διαχείριση δεν καταγράφει αίτημα');
select throws_ok($$ select public.gdpr_request_complete(gen_random_uuid()) $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Διαχείριση δεν κλείνει αίτημα');
select throws_ok($$ select public.gdpr_subjects() $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια',
  'Η Διαχείριση δεν βλέπει τα υποκείμενα');
select throws_ok($$ select public.gdpr_export('client', '00000000-0000-0000-0000-0000000000c1') $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Διαχείριση δεν εξάγει Πελάτη');
select throws_ok($$ select public.gdpr_export('client', gen_random_uuid()) $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ίδιο σφάλμα για Πελάτη που δεν υπάρχει');
select throws_ok($$ select public.gdpr_export(null, null) $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ίδιο σφάλμα για κενά ορίσματα');
select throws_ok($$ select public.gdpr_anonymize('client_user', '00000000-0000-0000-0000-0000000000b2', 'Ελένη Νικολάου') $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Η Διαχείριση δεν ανωνυμοποιεί');
select throws_ok($$ select public.gdpr_anonymize('team_user', gen_random_uuid(), 'x') $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Ίδιο σφάλμα για πρόσωπο που δεν υπάρχει');

select public.t_as('a3');
select throws_ok($$ select public.gdpr_register() $$, '42501', null, 'Η Παραγωγή δεν βλέπει το μητρώο');
select throws_ok($$ select public.gdpr_request_create('export', 'client', '00000000-0000-0000-0000-0000000000c1') $$, '42501', null,
  'Η Παραγωγή δεν καταγράφει αίτημα');
select throws_ok($$ select public.gdpr_request_complete(gen_random_uuid()) $$, '42501', null, 'Η Παραγωγή δεν κλείνει αίτημα');
select throws_ok($$ select public.gdpr_subjects() $$, '42501', null, 'Η Παραγωγή δεν βλέπει τα υποκείμενα');
select throws_ok($$ select public.gdpr_export('team_user', '00000000-0000-0000-0000-0000000000a3') $$, '42501', null,
  'Η Παραγωγή δεν εξάγει ούτε τον εαυτό της');
select throws_ok($$ select public.gdpr_anonymize('team_user', '00000000-0000-0000-0000-0000000000a4', 'Λένα Λάμπρου') $$, '42501', null,
  'Η Παραγωγή δεν ανωνυμοποιεί');

select public.t_as('b1');
select throws_ok($$ select public.gdpr_register() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει το μητρώο');
select throws_ok($$ select public.gdpr_request_create('export', 'client_user', '00000000-0000-0000-0000-0000000000b1') $$, '42501', null,
  'Ο Χρήστης πελάτη δεν καταγράφει αίτημα');
select throws_ok($$ select public.gdpr_request_complete(gen_random_uuid()) $$, '42501', null, 'Ο Χρήστης πελάτη δεν κλείνει αίτημα');
select throws_ok($$ select public.gdpr_subjects() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει τα υποκείμενα');
select throws_ok($$ select public.gdpr_export('client', '00000000-0000-0000-0000-0000000000c1') $$, '42501', null,
  'Ο Χρήστης πελάτη δεν εξάγει τον Πελάτη του');
select throws_ok($$ select public.gdpr_anonymize('client_user', '00000000-0000-0000-0000-0000000000b1', 'Κώστας') $$, '42501', null,
  'Ο Χρήστης πελάτη δεν ανωνυμοποιεί');

-- ───────────── Ιδιοκτήτης: κενά και άγνωστα ─────────────
select public.t_as('a1');
select throws_ok($$ select public.gdpr_request_create('export', 'client', null) $$, 'P0001', 'Το πρόσωπο ή ο Πελάτης δεν βρέθηκε',
  'Κενό υποκείμενο: δεν βρέθηκε');
select throws_ok($$ select public.gdpr_request_create('export', 'team_user', gen_random_uuid()) $$, 'P0001',
  'Το πρόσωπο ή ο Πελάτης δεν βρέθηκε', 'Άγνωστο υποκείμενο: δεν βρέθηκε');
select throws_ok($$ select public.gdpr_request_create('export', 'client_user', '00000000-0000-0000-0000-0000000000a1') $$, 'P0001',
  'Το πρόσωπο ή ο Πελάτης δεν βρέθηκε', 'Ο Χρήστης ομάδας δεν είναι Χρήστης πελάτη');
select throws_ok($$ select public.gdpr_request_create('delete', 'client', '00000000-0000-0000-0000-0000000000c1') $$, 'P0001', null,
  'Άγνωστο είδος αιτήματος');
select throws_ok($$ select public.gdpr_request_create('anonymize', 'client', '00000000-0000-0000-0000-0000000000c1') $$, 'P0001',
  'Ο Πελάτης ως επιχείρηση δεν ανωνυμοποιείται· διάλεξε την Επαφή ή έναν Χρήστη πελάτη', 'Ο Πελάτης δεν ανωνυμοποιείται');
select throws_ok($$ select public.gdpr_request_complete(null) $$, 'P0001', 'Το αίτημα δεν βρέθηκε', 'Κενό αίτημα');
select throws_ok($$ select public.gdpr_request_complete(gen_random_uuid()) $$, 'P0001', 'Το αίτημα δεν βρέθηκε', 'Άγνωστο αίτημα');
select throws_ok($$ select public.gdpr_export('client', gen_random_uuid()) $$, 'P0001', 'Το πρόσωπο ή ο Πελάτης δεν βρέθηκε',
  'Άγνωστος Πελάτης στην εξαγωγή');
select throws_ok($$ select public.gdpr_export('everything', '00000000-0000-0000-0000-0000000000c1') $$, 'P0001', null,
  'Άγνωστο είδος εξαγωγής');
select throws_ok($$ select public.gdpr_anonymize('team_user', null, 'x') $$, 'P0001', 'Το πρόσωπο δεν βρέθηκε',
  'Κενό πρόσωπο στην ανωνυμοποίηση');
reset role;

-- ───────────── Ν6 Προθεσμία σε ώρα Αθήνας (σταθερό σήμερα) ─────────────
select throws_ok($$ select authz.gdpr_request_create('export', 'client', '00000000-0000-0000-0000-0000000000c1',
                                                     date '2026-04-02', '', date '2026-04-01') $$, 'P0001',
  'Η ημερομηνία λήψης δεν μπορεί να είναι μετά από σήμερα', 'Η λήψη δεν είναι στο μέλλον');
select is(authz.today_count_gdpr(public.t_uid('a1'), null, timestamptz '2026-03-31 21:30+00'), 0,
  'Χωρίς ανοιχτό αίτημα: 0 για τον Ιδιοκτήτη (το null σημαίνει «καμία πρόσβαση»)');
set local role authenticated;
select public.t_as('a1');
select public.today_prefs_set(array['gdpr'], array['gdpr']);
select is((select c ->> 'count' || ' · ' || (c ->> 'hidden') || ' · ' || n
             from jsonb_array_elements(public.today_counts() -> 'cards') with ordinality x (c, n) where c ->> 'code' = 'gdpr'),
  '0 · true · 1', 'Η κάρτα με 0 μένει στα πλήθη, και η Προσαρμογή κρατά θέση και «κρυφή»');
select public.today_prefs_reset();
reset role;
select set_config('t.r1', authz.gdpr_request_create('export', 'client', '00000000-0000-0000-0000-0000000000c1', null,
  'Με email', date '2026-01-31')::text, true);
select set_config('t.r2', authz.gdpr_request_create('anonymize', 'client_user', '00000000-0000-0000-0000-0000000000b2',
  date '2026-03-01', '', date '2026-03-31')::text, true);
select is((select received_on || ' → ' || deadline from public.gdpr_requests where id = current_setting('t.r1')::uuid),
  '2026-01-31 → 2026-02-28', 'Χωρίς λήψη: σήμερα· 31/1 + 1 μήνας = 28/2');
select is((select deadline from public.gdpr_requests where id = current_setting('t.r2')::uuid), date '2026-04-01',
  'Λήψη 1/3 → προθεσμία 1/4');
select is((select array_agg((r ->> 'daysLeft')::integer order by n)
             from jsonb_array_elements(authz.gdpr_requests_view(date '2026-03-31') -> 'requests') with ordinality x (r, n)),
  array[-31, 1], 'Οι μέρες που μένουν: κατά προθεσμία, αρνητικές όταν έληξε');
select is(authz.gdpr_requests_view(date '2026-03-31') -> 'requests' -> 1 ->> 'subjectLabel', 'Ελένη Νικολάου',
  'Το όνομα του υποκειμένου από την πηγή του');
select is(authz.today_count_gdpr(public.t_uid('a1'), null, timestamptz '2026-03-31 21:30+00'), 2,
  'Ο Ιδιοκτήτης μετρά τα δύο ανοιχτά');
select is(authz.today_count_gdpr(public.t_uid('a2'), null, timestamptz '2026-03-31 21:30+00'), null,
  'Η Διαχείριση δεν έχει την κάρτα');
select is(authz.today_count_gdpr(public.t_uid('a1'), '00000000-0000-0000-0000-0000000000c1', timestamptz '2026-03-31 21:30+00'), null,
  'Κάρτα ομάδας με Πελάτη: null');
select throws_ok($$ select authz.today_items_gdpr(public.t_uid('a2'), null, now()) $$, '42501', null,
  'Τα στοιχεία της κάρτας: άρνηση για τη Διαχείριση');
-- 31/3 21:30 UTC = 1/4 00:30 Αθήνα: η προθεσμία 1/4 είναι σήμερα (σε UTC θα ήταν αύριο)
select is(authz.today_items_gdpr(public.t_uid('a1'), null, timestamptz '2026-03-31 21:30+00') -> 1 ->> 'subtitle', 'λήγει σήμερα',
  'Σήμερα σε ώρα Αθήνας');
select is(authz.today_items_gdpr(public.t_uid('a1'), null, timestamptz '2026-03-31 20:30+00') -> 1 ->> 'subtitle', 'λήγει αύριο',
  '23:30 Αθήνα: ακόμη 31/3');
select is((select array_agg(i ->> 'subtitle' || ':' || (i ->> 'urgent') order by n)
             from jsonb_array_elements(authz.today_items_gdpr(public.t_uid('a1'), null, timestamptz '2026-03-31 21:30+00'))
                  with ordinality x (i, n)),
  array['έληξε:true', 'λήγει σήμερα:true'], 'Κατά προθεσμία, επείγον όταν έληξε ή λήγει σε έως 1 μέρα');
select is(authz.today_items_gdpr(public.t_uid('a1'), null, timestamptz '2026-03-31 21:30+00') -> 0 ->> 'title',
  'Εξαγωγή: Κυψέλη Καφέ', 'Τίτλος: είδος και υποκείμενο');
select is(authz.today_items_gdpr(public.t_uid('a1'), null, timestamptz '2026-03-31 21:30+00') -> 0 ->> 'link', '/app/team/gdpr',
  'Η κάρτα ανοίγει το μητρώο');

-- RLS: ο Ιδιοκτήτης βλέπει τις γραμμές, η Διαχείριση καμία
set local role authenticated;
select public.t_as('a1');
select is((select count(*)::integer from public.gdpr_requests), 2, 'Ο Ιδιοκτήτης διαβάζει το μητρώο');
select public.t_as('a2');
select is((select count(*)::integer from public.gdpr_requests), 0, 'Η Διαχείριση δεν παίρνει καμία γραμμή');
select throws_ok($$ insert into public.gdpr_requests (kind, subject_kind, subject_client_id, received_on)
                    values ('export', 'client', '00000000-0000-0000-0000-0000000000c1', current_date) $$, '42501', null,
  'Κανείς δεν γράφει απευθείας στο μητρώο');
select public.t_as('a1');
select ok((public.gdpr_register() -> 'requests') is not null, 'Το RPC του μητρώου απαντά στον Ιδιοκτήτη');
reset role;

-- Ολοκλήρωση
select throws_ok(format($$ select authz.gdpr_request_complete(%L, date '2026-01-30', null, date '2026-03-31') $$,
                        current_setting('t.r1')), 'P0001', 'Η ολοκλήρωση είναι από τη λήψη ως σήμερα', 'Όχι πριν από τη λήψη');
select lives_ok(format($$ select authz.gdpr_request_complete(%L, null, 'Στάλθηκε το ZIP', date '2026-02-10') $$,
                       current_setting('t.r1')), 'Ο Ιδιοκτήτης κλείνει το αίτημα');
select is((select completed_on || ' · ' || note from public.gdpr_requests where id = current_setting('t.r1')::uuid),
  '2026-02-10 · Στάλθηκε το ZIP', 'Ολοκλήρωση σήμερα, με σημείωση');
select throws_ok(format($$ select authz.gdpr_request_complete(%L, null, null, date '2026-03-31') $$, current_setting('t.r1')),
  'P0001', 'Το αίτημα έχει ήδη ολοκληρωθεί', 'Δεν κλείνει δεύτερη φορά');
select is(authz.today_count_gdpr(public.t_uid('a1'), null, timestamptz '2026-03-31 21:30+00'), 1,
  'Το ολοκληρωμένο φεύγει από την κάρτα');
select is(authz.gdpr_requests_view(date '2026-03-31') -> 'requests' -> 1 ->> 'completedOn', '2026-02-10',
  'Το ολοκληρωμένο μένει στο μητρώο, μετά τα ανοιχτά');

-- ───────────── Ν7 Εξαγωγή ─────────────
select set_config('t.audit', (select coalesce(max(id), 0)::text from public.audit_log), true);
set local role authenticated;
select public.t_as('a1');
select set_config('t.client', public.gdpr_export('client', '00000000-0000-0000-0000-0000000000c1')::text, true);
select set_config('t.person', public.gdpr_export('client_user', '00000000-0000-0000-0000-0000000000b2')::text, true);
reset role;
select is((select array_agg(k order by k) from jsonb_object_keys(current_setting('t.client')::jsonb -> 'sections') k),
  array['agreements', 'deliverableComments', 'deliverables', 'details', 'filmings', 'invoices', 'messages', 'receipts', 'users'],
  'Πελάτης: όλες οι ενότητες');
select is((select array_agg(m ->> 'body' order by n)
             from jsonb_array_elements(current_setting('t.client')::jsonb -> 'sections' -> 'messages') with ordinality x (m, n)),
  array['Γεια σας από την Ελένη', 'Καλώς ήρθατε'], 'Η Συνομιλία χωρίς Εσωτερικά και χωρίς διαγραμμένα');
select ok(current_setting('t.client') not like '%Εσωτερικό: μη το δει%', 'Κανένα Εσωτερικό Μήνυμα πουθενά στην εξαγωγή');
select is(current_setting('t.client')::jsonb -> 'sections' -> 'invoices' -> 0 ->> 'pdfPath', 'c1/a-12.pdf',
  'Τα Τιμολόγια με τη διαδρομή του PDF');
select is((select array_agg(u ->> 'email' order by n)
             from jsonb_array_elements(current_setting('t.client')::jsonb -> 'sections' -> 'users') with ordinality x (u, n)),
  array['kostas@client-one.example.gr', 'eleni@client-one.example.gr'], 'Οι Χρήστες του Πελάτη, και οι αφαιρεμένοι');
select is(current_setting('t.client')::jsonb -> 'subject', '{"kind": "client", "id": "00000000-0000-0000-0000-0000000000c1",
  "label": "Κυψέλη Καφέ"}'::jsonb, 'Το υποκείμενο της εξαγωγής');
select is((select array_agg(k order by k) from jsonb_object_keys(current_setting('t.person')::jsonb -> 'sections') k),
  array['agreementRoles', 'assistant', 'deliverableComments', 'details', 'memberships', 'messages'], 'Πρόσωπο: οι ενότητές του');
select is(current_setting('t.person')::jsonb -> 'sections' -> 'details' ->> 'email', 'eleni@client-one.example.gr',
  'Τα στοιχεία του προσώπου');
select is((select count(*)::integer from public.audit_log a
            where a.id > current_setting('t.audit')::bigint and a.entity = 'gdpr' and a.after ->> 'event' = 'exported'), 2,
  'Κάθε εξαγωγή γράφεται στο Ίχνος');
select is((select a.after from public.audit_log a
            where a.id > current_setting('t.audit')::bigint and a.entity = 'gdpr' and a.entity_id = '00000000-0000-0000-0000-0000000000c1'),
  '{"event": "exported", "subjectKind": "client", "sections": {"users": 2, "details": 1, "filmings": 0, "invoices": 1,
    "messages": 2, "receipts": 0, "agreements": 2, "deliverables": 0, "deliverableComments": 0}}'::jsonb,
  'Το Ίχνος έχει μόνο τα πλήθη, όχι τα δεδομένα');

-- ───────────── Ν8 Ανωνυμοποίηση: λόγοι «δεν γίνεται» ─────────────
set local role authenticated;
select public.t_as('a1');
select is((select jsonb_object_agg(u ->> 'id', coalesce(u ->> 'block', '-'))
             from jsonb_array_elements(public.gdpr_subjects() -> 'teamUsers') u
            where u ->> 'id' in ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5')),
  '{"00000000-0000-0000-0000-0000000000a4": "-", "00000000-0000-0000-0000-0000000000a5": "active"}'::jsonb,
  'Η οθόνη ξέρει από τη βάση ποιος ανωνυμοποιείται');
select is((select jsonb_object_agg(c ->> 'name', coalesce(c ->> 'contactBlock', '-'))
             from jsonb_array_elements(public.gdpr_subjects() -> 'clients') c),
  '{"Κυψέλη Καφέ": "-", "Φούρνος": "contact_is_user"}'::jsonb, 'Επαφή που είναι ενεργός Χρήστης πελάτη: δεν γίνεται');
select throws_ok($$ select public.gdpr_anonymize('team_user', '00000000-0000-0000-0000-0000000000a5', 'Πέτρος') $$, 'P0001',
  'Ανωνυμοποιείται μόνο απενεργοποιημένος Χρήστης ομάδας. Πρώτα Απενεργοποίηση.', 'Όχι ενεργός Χρήστης ομάδας');
select throws_ok($$ select public.gdpr_anonymize('client_user', '00000000-0000-0000-0000-0000000000b1', 'Κώστας') $$, 'P0001',
  'Ο Χρήστης πελάτη ανήκει ακόμη σε Πελάτη. Πρώτα αφαίρεση από κάθε Πελάτη.', 'Όχι Χρήστης πελάτη που ανήκει σε Πελάτη');
select throws_ok($$ select public.gdpr_anonymize('contact', '00000000-0000-0000-0000-0000000000c2', 'Κώστας') $$, 'P0001',
  'Η Επαφή είναι και ενεργός Χρήστης πελάτη. Πρώτα αφαίρεση από τον Πελάτη.', 'Όχι Επαφή που είναι ενεργός Χρήστης');
select throws_ok($$ select public.gdpr_anonymize('client', '00000000-0000-0000-0000-0000000000c1', 'Κυψέλη Καφέ') $$, 'P0001',
  'Ανωνυμοποιείται μόνο Χρήστης ομάδας, Χρήστης πελάτη ή Επαφή· ο Πελάτης ως επιχείρηση όχι.', 'Όχι ο Πελάτης ως επιχείρηση');
select throws_ok($$ select public.gdpr_anonymize('client_user', '00000000-0000-0000-0000-0000000000b2', 'Ελένη') $$, 'P0001',
  'Το όνομα δεν ταιριάζει. Γράψε το ακριβώς όπως φαίνεται.', 'Λάθος όνομα: τίποτα δεν αλλάζει');
select throws_ok($$ select public.gdpr_anonymize('client_user', '00000000-0000-0000-0000-0000000000b2', null) $$, 'P0001',
  'Το όνομα δεν ταιριάζει. Γράψε το ακριβώς όπως φαίνεται.', 'Χωρίς όνομα: τίποτα δεν αλλάζει');
reset role;
select is((select name from public.client_users where user_id = public.t_uid('b2')), 'Ελένη Νικολάου',
  'Μετά τις αρνήσεις το όνομα μένει');

-- ───────────── Ν8 Ανωνυμοποίηση Χρήστη πελάτη ─────────────
select set_config('t.audit', (select max(id)::text from public.audit_log), true);
select set_config('t.messages', (select count(*)::text from public.messages), true);
set local role authenticated;
select public.t_as('a1');
select set_config('t.anon', public.gdpr_anonymize('client_user', '00000000-0000-0000-0000-0000000000b2', '  Ελένη Νικολάου ')::text, true);
reset role;
select set_config('t.n', current_setting('t.anon')::jsonb ->> 'n', true);
select is(current_setting('t.anon')::jsonb ->> 'name', 'Ανωνυμοποιημένος Χρήστης ' || current_setting('t.n'),
  'Το νέο όνομα με τον αύξοντα αριθμό');
select is((select array_agg(distinct name) from public.client_users where user_id = public.t_uid('b2')),
  array['Ανωνυμοποιημένος Χρήστης ' || current_setting('t.n')], 'Το όνομα άλλαξε σε κάθε συμμετοχή');
select is((select email::text from auth.users where id = public.t_uid('b2')),
  'anonymized-' || current_setting('t.n') || '@anonymized.invalid', 'Ο λογαριασμός παίρνει email-placeholder');
select ok((select banned_until > timestamptz '2999-01-01' and encrypted_password = '' and raw_user_meta_data = '{}'::jsonb
             from auth.users where id = public.t_uid('b2')), 'Μόνιμο ban, χωρίς κωδικό και χωρίς στοιχεία στο προφίλ εισόδου');
select ok(exists (select 1 from auth.users where id = public.t_uid('b2')), 'Ο λογαριασμός δεν διαγράφεται');
select is((select count(*)::integer from public.calendar_links where user_id = public.t_uid('b2'))
        + (select count(*)::integer from public.today_prefs where user_id = public.t_uid('b2'))
        + (select count(*)::integer from public.client_user_settings where user_id = public.t_uid('b2'))
        + (select count(*)::integer from public.notifications where user_id = public.t_uid('b2'))
        + (select count(*)::integer from public.assistant_conversations where user_id = public.t_uid('b2')), 0,
  'Σβήνουν Σύνδεσμος ημερολογίου, προτιμήσεις, γλώσσα, Ειδοποιήσεις και Συζητήσεις με τον Βοηθό');
select is((select count(*)::integer from public.assistant_messages
            where conversation_id = '00000000-0000-0000-0000-000000000401'), 0, 'Και τα μηνύματα των Συζητήσεων');
select is((select count(*)::integer from public.email_log where lower(to_email) = 'eleni@client-one.example.gr')
        + (select count(*)::integer from public.email_outbox where lower(to_email) = 'eleni@client-one.example.gr')
        + (select count(*)::integer from public.invitations where lower(email) = 'eleni@client-one.example.gr'), 0,
  'Η διεύθυνση δεν μένει στο Ιστορικό αποστολών, στην ουρά ή στις προσκλήσεις');
select is((select status || ' · ' || to_name from public.email_outbox where to_email like 'anonymized-%'),
  'cancelled · Ανωνυμοποιημένος Χρήστης ' || current_setting('t.n'), 'Το email που περίμενε ακυρώνεται');
select is((select count(*)::text from public.messages), current_setting('t.messages'), 'Τα Μηνύματα μένουν');
select is((select count(*)::integer from public.messages where author_id = public.t_uid('b2')), 1, 'Και το δικό της');
select is((select r.email || ' · ' || s.signed_name from public.agreement_recipients r
             join public.agreement_signatures s on s.agreement_id = r.agreement_id
            where r.agreement_id = '00000000-0000-0000-0000-000000000201'),
  'eleni@client-one.example.gr · Ελένη Νικολάου', 'Η υπογεγραμμένη Συμφωνία μένει όπως υπογράφηκε');
select is((select count(*)::integer from public.invoices where client_id = '00000000-0000-0000-0000-0000000000c1'), 1,
  'Τα Τιμολόγια μένουν');
select is((select count(*)::integer from public.audit_log a where a.id > current_setting('t.audit')::bigint), 2,
  'Δύο γραμμές στο Ίχνος (ανωνυμοποίηση, καθάρισμα), καμία γραμμή-γραμμή με το «πριν»');
select is((select a.after - 'rows' from public.audit_log a
            where a.id > current_setting('t.audit')::bigint and a.after ->> 'event' = 'audit_scrubbed'),
  jsonb_build_object('event', 'audit_scrubbed', 'subjectKind', 'client_user', 'n', current_setting('t.n')::integer),
  'Το καθάρισμα του Ίχνους γράφεται μόνο με αριθμούς');
select is((select (a.after ->> 'rows')::integer from public.audit_log a
            where a.id > current_setting('t.audit')::bigint and a.after ->> 'event' = 'audit_scrubbed'), 2,
  'Καθαρίστηκαν οι δύο παλιές γραμμές της (συμμετοχή, πρόσκληση)');
select is((select a.entity || ' ' || a.entity_id || ' ' || a.after::text from public.audit_log a
            where a.id > current_setting('t.audit')::bigint and a.after ->> 'event' = 'anonymized'),
  'gdpr 00000000-0000-0000-0000-0000000000b2 ' || jsonb_build_object('event', 'anonymized', 'subjectKind', 'client_user',
                                                                       'n', current_setting('t.n')::integer)::text,
  'Το Ίχνος χωρίς τα σβησμένα στοιχεία');
select is(current_setting('gdpr.anonymizing', true), 'off', 'Το Ίχνος γράφει ξανά κανονικά μετά');
select is((select count(*)::integer from public.audit_log a
            where concat(a.before::text, a.after::text) ~* 'Ελένη Νικολάου|eleni@client-one'), 0,
  'Καμία γραμμή του Ίχνους δεν κρατά πια το όνομα ή το email της');
select is((select a.after ->> 'name' from public.audit_log a
            where a.entity = 'client_users' and a.after ->> 'user_id' = '00000000-0000-0000-0000-0000000000b2'),
  'Ανωνυμοποιημένος Χρήστης ' || current_setting('t.n'), 'Η παλιά γραμμή γράφει το νέο όνομα');
select is((select a.after ->> 'removed_at' from public.audit_log a
            where a.entity = 'client_users' and a.after ->> 'user_id' = '00000000-0000-0000-0000-0000000000b2'),
  '2026-02-01', 'Τα άλλα κλειδιά της μένουν');
select is((select a.after ->> 'name' from public.audit_log a
            where a.entity = 'client_users' and a.after ->> 'user_id' = '00000000-0000-0000-0000-0000000000b1'),
  'Κώστας', 'Η γραμμή άλλου Χρήστη δεν αλλάζει');
select is((select count(*)::integer from auth.identities where user_id = public.t_uid('b2'))
        + (select count(*)::integer from auth.sessions where user_id = public.t_uid('b2')), 0,
  'Σβήνουν ταυτότητες και συνεδρίες του λογαριασμού');
select is((select coalesce(email_change, '') || '|' || coalesce(phone_change, '') from auth.users where id = public.t_uid('b2')),
  '|', 'Καμία αλλαγή email ή τηλεφώνου σε εκκρεμότητα');
select is((select r.name || ' · ' || r.email || ' · ' || l.recipient_name || ' · ' || l.recipient_email
             from public.agreement_recipients r join public.agreement_links l on l.agreement_id = r.agreement_id
            where r.agreement_id = '00000000-0000-0000-0000-000000000202'),
  'Ανωνυμοποιημένος Χρήστης ' || current_setting('t.n') || ' · anonymized-' || current_setting('t.n') || '@anonymized.invalid · '
    || 'Ανωνυμοποιημένος Χρήστης ' || current_setting('t.n') || ' · anonymized-' || current_setting('t.n') || '@anonymized.invalid',
  'Στη Συμφωνία που δεν υπογράφηκε: παραλήπτης και Σύνδεσμος παίρνουν το νέο όνομα');
select is((select payload ->> 'userName' from public.events where case_key = 't:gdpr:b2'),
  'Ανωνυμοποιημένος Χρήστης ' || current_setting('t.n'), 'Το Γεγονός που την αναφέρει παίρνει το νέο όνομα');
select is((select payload ->> 'userName' from public.events where case_key = 't:gdpr:other'), 'Ελένη Νικολάου',
  'Γεγονός που δεν την αναφέρει με το id της μένει');
select is((select title from public.notifications where user_id = public.t_uid('a1') and body like '%έκλεισε χρόνο'),
  'Νέο μήνυμα από Ανωνυμοποιημένος Χρήστης ' || current_setting('t.n'), 'Η Ειδοποίηση άλλου Χρήστη παίρνει το νέο όνομα');
select is((select array_agg(status || ': ' || (payload ->> 'text') order by status) from public.email_outbox
            where to_email = 'owner@example.com'),
  array['pending: Ρώτησε η Ανωνυμοποιημένος Χρήστης ' || current_setting('t.n'), 'sent: Ρώτησε η Ελένη Νικολάου'],
  'Email της ουράς: όσο δεν στάλθηκε αλλάζει, το σταλμένο μένει');
select is((select subject || ' · ' || to_email from public.email_log where kind = 'test'),
  'Δοκιμή · anonymized-' || current_setting('t.n') || '@anonymized.invalid',
  'Ιστορικό αποστολών: το θέμα μένει, η διεύθυνση κρύβεται');
set local role authenticated;
select public.t_as('a1');
select throws_ok($$ select public.gdpr_anonymize('client_user', '00000000-0000-0000-0000-0000000000b2',
                    (select current_setting('t.anon')::jsonb ->> 'name')) $$, 'P0001', 'Έχει ήδη ανωνυμοποιηθεί',
  'Δεύτερη φορά δεν γίνεται');
select is(authz_label_through_register.v, 'Ανωνυμοποιημένος Χρήστης ' || current_setting('t.n'),
  'Το μητρώο δείχνει το νέο όνομα')
  from (select public.gdpr_register() -> 'requests' -> 0 ->> 'subjectLabel' as v) authz_label_through_register;
reset role;
select throws_ok($$ insert into public.client_users (client_id, user_id, name, role_id)
                    select '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', 'Ξανά', r.id
                      from public.roles r where r.name = 'Πλήρης' and r.kind = 'client' $$, 'P0001',
  'Ο Χρήστης έχει ανωνυμοποιηθεί· δεν ενεργοποιείται ξανά', 'Δεν ξαναμπαίνει σε Πελάτη');

-- ───────────── Το Ίχνος μένει αμετάβλητο έξω από την ανωνυμοποίηση ─────────────
select throws_ok($$ update public.audit_log set after = after || '{"name": "Ανωνυμοποιημένος Χρήστης 1"}'
                     where id = (select max(id) from public.audit_log where entity = 'client_users') $$,
  'P0001', 'Το Ίχνος ενεργειών δέχεται μόνο προσθήκες', 'Χωρίς την ανωνυμοποίηση καμία αλλαγή, ούτε σε όνομα');
select set_config('gdpr.anonymizing', 'on', true);
select throws_ok($$ update public.audit_log set entity_id = 'x' where id = (select max(id) from public.audit_log) $$,
  'P0001', 'Το Ίχνος ενεργειών δέχεται μόνο προσθήκες', 'Και μέσα σε αυτήν: όχι αλλαγή σε άλλο πεδίο');
select throws_ok($$ update public.audit_log set after = after || '{"name": "Κάποιος άλλος"}'
                     where id = (select max(id) from public.audit_log where entity = 'client_users') $$,
  'P0001', 'Το Ίχνος ενεργειών δέχεται μόνο προσθήκες', 'Και μέσα σε αυτήν: όνομα μόνο προς το «Ανωνυμοποιημένος Χρήστης N»');
select throws_ok($$ delete from public.audit_log where id = (select max(id) from public.audit_log) $$,
  'P0001', 'Το Ίχνος ενεργειών δέχεται μόνο προσθήκες', 'Και μέσα σε αυτήν: καμία διαγραφή');
select set_config('gdpr.anonymizing', 'off', true);
select throws_ok($$ insert into public.invitations (kind, email, name, role_ids)
                    select 'team', 'anonymized-1@anonymized.invalid', 'Χ', array[r.id] from public.roles r
                     where r.name = 'Παραγωγή' and r.kind = 'team' $$, 'P0001', 'Αυτή η διεύθυνση δεν δέχεται προσκλήσεις',
  'Η διεύθυνση ανωνυμοποιημένου λογαριασμού δεν προσκαλείται');
select throws_ok($$ insert into public.team_users (user_id, name, email, is_active)
                    values ('00000000-0000-0000-0000-0000000000b2', 'Ξανά', 'x@example.com', true) $$, 'P0001',
  'Ο Χρήστης έχει ανωνυμοποιηθεί· δεν ενεργοποιείται ξανά', 'Ούτε μπαίνει στην ομάδα');

-- ───────────── Ν8 Ανωνυμοποίηση Χρήστη ομάδας ─────────────
set local role authenticated;
select public.t_as('a1');
select set_config('t.lena', public.gdpr_anonymize('team_user', '00000000-0000-0000-0000-0000000000a4', 'Λένα Λάμπρου')::text, true);
reset role;
select is((select name || ' · ' || email || ' · ' || is_active from public.team_users where user_id = public.t_uid('a4')),
  (current_setting('t.lena')::jsonb ->> 'name') || ' · anonymized-' || (current_setting('t.lena')::jsonb ->> 'n')
    || '@anonymized.invalid · false', 'Όνομα και email του Χρήστη ομάδας σβήνουν, μένει απενεργοποιημένος');
select ok((current_setting('t.lena')::jsonb ->> 'n')::integer > current_setting('t.n')::integer, 'Ο αριθμός N αυξάνει');
select is((select email::text from auth.users where id = public.t_uid('a4')),
  'anonymized-' || (current_setting('t.lena')::jsonb ->> 'n') || '@anonymized.invalid', 'Και ο λογαριασμός εισόδου');
select throws_ok($$ update public.team_users set is_active = true where user_id = '00000000-0000-0000-0000-0000000000a4' $$,
  'P0001', 'Ο Χρήστης έχει ανωνυμοποιηθεί· δεν ενεργοποιείται ξανά', 'Δεν επανενεργοποιείται');
select is((select count(*)::integer from public.audit_log a
            where a.id > current_setting('t.audit')::bigint and a.entity = 'team_users'), 0,
  'Καμία νέα γραμμή team_users με το παλιό email στο Ίχνος');
set local role authenticated;
select public.t_as('a2');
select is((select count(*)::integer from public.audit_log a
            where a.entity = 'team_users' and a.entity_id = '00000000-0000-0000-0000-0000000000a4'
              and a.after ->> 'name' = current_setting('t.lena')::jsonb ->> 'name'
              and a.after ->> 'email' = 'anonymized-' || (current_setting('t.lena')::jsonb ->> 'n') || '@anonymized.invalid'), 1,
  'Η Διαχείριση στο Ίχνος βλέπει το νέο όνομα και το placeholder στη γραμμή της Λένας');
select is((select count(*)::integer from public.audit_log a
            where concat(a.before::text, a.after::text) ~* 'Λένα Λάμπρου|lena@example.com'), 0,
  'και κανένα παλιό όνομα ή email');
reset role;
select is((select body from public.notifications where user_id = public.t_uid('a1') and body like '%έκλεισε χρόνο'),
  'Η ' || (current_setting('t.lena')::jsonb ->> 'name') || ' έκλεισε χρόνο', 'Και στην Ειδοποίηση του Ιδιοκτήτη');

-- ───────────── Ν8 Ανωνυμοποίηση Επαφής ─────────────
set local role authenticated;
select public.t_as('a1');
select set_config('t.contact', public.gdpr_anonymize('contact', '00000000-0000-0000-0000-0000000000c1', 'Μαρία Παπαδάκη')::text, true);
reset role;
select is((select contact_name || ' · ' || contact_email || ' · [' || contact_phone || '] · ' || name from public.clients
            where id = '00000000-0000-0000-0000-0000000000c1'),
  (current_setting('t.contact')::jsonb ->> 'name') || ' · anonymized-' || (current_setting('t.contact')::jsonb ->> 'n')
    || '@anonymized.invalid · [] · Κυψέλη Καφέ', 'Η Επαφή σβήνει· ο Πελάτης ως επιχείρηση μένει');
select is((select count(*)::integer from public.gdpr_anonymizations), 3, 'Τρεις ανωνυμοποιήσεις, χωρίς κανένα στοιχείο τους');
select is((select count(*)::integer from public.audit_log a
            where a.id > current_setting('t.audit')::bigint and a.entity = 'clients'), 0,
  'Καμία νέα γραμμή clients με τα παλιά στοιχεία στο Ίχνος');
select is((select count(*)::integer from public.audit_log a
            where concat(a.before::text, a.after::text) ~* 'Μαρία Παπαδάκη|maria@kypseli|6900000001'), 0,
  'Οι παλιές γραμμές χάνουν όνομα, email και τηλέφωνο της Επαφής');
select is((select (a.before ->> 'name') || ' · ' || (a.after ->> 'city') || ' · ' || coalesce(a.after ->> 'contact_phone', 'null')
             from public.audit_log a where a.entity = 'clients' and a.after ->> 'city' = 'Πειραιάς'),
  'Κυψέλη Καφέ · Πειραιάς · null', 'Ο Πελάτης ως επιχείρηση και τα άλλα πεδία μένουν στο Ίχνος');
set local role authenticated;
select public.t_as('a1');
select is((select c ->> 'contactBlock' from jsonb_array_elements(public.gdpr_subjects() -> 'clients') c
            where c ->> 'id' = '00000000-0000-0000-0000-0000000000c1'), 'anonymized', 'Η οθόνη ξέρει ότι έγινε');
select public.t_as('a2');
select is((select count(*)::integer from public.audit_log where entity in ('gdpr', 'gdpr_requests')), 0,
  'Η Διαχείριση δεν βλέπει τα GDPR στο Ίχνος');
select public.t_as('a1');
select ok((select count(*)::integer from public.audit_log where entity in ('gdpr', 'gdpr_requests')) >= 7,
  'Ο Ιδιοκτήτης τα βλέπει');
reset role;

select * from finish();
rollback;
