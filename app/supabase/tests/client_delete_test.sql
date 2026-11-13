-- Διαγραφή Πελάτη που μπήκε κατά λάθος: public.client_delete και public.client_delete_state.
-- Άρνηση (anon, χωρίς «Διαγράφει Πελάτες»), λάθος όνομα, κάθε κύριος λόγος «δεν σβήνεται», επιτυχής διαγραφή με ό,τι
-- σβήνει μαζί (Ευκαιρίες, Δραστηριότητες, σήματα «Πιθανό διπλό», Αιτήματα, Γεγονότα, Ειδοποιήσεις, Βοηθός) και Ίχνος.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι κλειστοί πίνακες διαβάζονται μόνο μετά από reset role.
begin;
select plan(33);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Διαχείριση («Διαγράφει Πελάτες», a7) · a3 Πωλήσεις (δεν «Διαγράφει Πελάτες») · b1 Χρήστης πελάτη του c4
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'kostas@client-four.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Δημήτρης', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Σοφία', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Διαχείριση'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Δεδομένα (άμεσες εγγραφές, χωρίς triggers) ─────────────
-- c1 Λάθος Καφέ: μόνο πρόχειρο πωλήσεων (σβήνεται) · c2 Συμφωνία · c3 Τιμολόγιο · c4 Χρήστης πελάτη · c5 email στον πελάτη
-- c6 σε αυτόν συγχωνεύτηκε ο c7 · c8 αίτημα GDPR · c9 ο άλλος Πελάτης του «Πιθανό διπλό» με τον c1 (μένει)
set local session_replication_role = replica;
insert into public.clients (id, name, contact_name, contact_email, manager_id, archived_at, merged_into_id)
select x.id::uuid, x.name, 'Επαφή', x.email, '00000000-0000-0000-0000-0000000000a1', x.archived::timestamptz, x.merged::uuid
  from (values
    ('00000000-0000-0000-0000-0000000000c1', 'Λάθος Καφέ', 'c1@example.com', null, null),
    ('00000000-0000-0000-0000-0000000000c2', 'Με Συμφωνία', 'c2@example.com', null, null),
    ('00000000-0000-0000-0000-0000000000c3', 'Με Τιμολόγιο', 'c3@example.com', null, null),
    ('00000000-0000-0000-0000-0000000000c4', 'Με Χρήστη', 'c4@example.com', null, null),
    ('00000000-0000-0000-0000-0000000000c5', 'Με email', 'c5@example.com', null, null),
    ('00000000-0000-0000-0000-0000000000c6', 'Ενιαίος', 'c6@example.com', null, null),
    ('00000000-0000-0000-0000-0000000000c7', 'Συγχωνευμένος', 'c7@example.com', '2026-01-05 10:00+00',
     '00000000-0000-0000-0000-0000000000c6'),
    ('00000000-0000-0000-0000-0000000000c8', 'Με GDPR', 'c8@example.com', null, null),
    ('00000000-0000-0000-0000-0000000000c9', 'Λάθος Καφές', 'c9@example.com', null, null)
  ) as x (id, name, email, archived, merged);

-- Ευκαιρίες: e1 και η συνέχειά της e3 στον c1 · e2 με Συμφωνία στον c2
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due,
                                  follows_opportunity_id)
select x.id::uuid, x.client_id::uuid, x.title,
       (select s.id from public.sales_stages s where s.code = 'new'), (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a1', 'Κλήση', date '2099-01-01', x.follows::uuid
  from (values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Πρώτη', null),
               ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000c1', 'Συνέχεια',
                '00000000-0000-0000-0000-0000000000e1'),
               ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c2', 'Μηνιαίο', null))
       as x (id, client_id, title, follows);
insert into public.opportunity_activities (opportunity_id, client_id, occurred_at, actor_id, kind_id, event, body) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', timestamptz '2026-02-01 10:00+00',
   '00000000-0000-0000-0000-0000000000a1', (select k.id from public.sales_activity_kinds k where k.code = 'call'), null, 'Κλήση'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000c1', timestamptz '2026-02-02 10:00+00',
   '00000000-0000-0000-0000-0000000000a1', null, 'created', '');
insert into public.client_duplicate_flags (client_id, matches_client_id, reason) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c9', 'name'),
  ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000c1', 'name');
insert into public.access_requests (client_id, requester_id, topic, source_id)
values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'Καμπάνια',
        (select s.id from public.sales_sources s where s.code = 'phone'));
insert into public.events (type, entity, entity_id, case_key, client_id)
select (select t.code from public.event_types t order by t.code limit 1), 'opportunities', '00000000-0000-0000-0000-0000000000e1'::uuid,
       't:delete:e1', '00000000-0000-0000-0000-0000000000c1'::uuid;
insert into public.notifications (user_id, client_id, title, body, link) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'Νέα Ευκαιρία', 'Κείμενο', null),
  ('00000000-0000-0000-0000-0000000000a1', null, 'Επόμενο βήμα', 'Κείμενο', '/app/clients/00000000-0000-0000-0000-0000000000c1');
-- Email προς την ομάδα για τον c1 (δεν μπλοκάρει, μένει χωρίς Πελάτη) · email προς τον πελάτη του c5 (μπλοκάρει)
insert into public.automation_sends (automation_id, case_key, recipient_key, channel, client_id)
select (select a.id from public.automations a order by a.id limit 1), x.case_key, x.recipient, 'email', x.client_id::uuid
  from (values ('t:delete:team', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1'),
               ('t:delete:client', 'visitor@example.com', '00000000-0000-0000-0000-0000000000c5'))
       as x (case_key, recipient, client_id);
insert into public.assistant_conversations (id, audience, user_id, client_id) values
  ('00000000-0000-0000-0000-000000000401', 'client', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1');

insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, payment_days, unused_provisions,
                               filming_notice_hours, filming_cancel_hours, late_cancel_burns, no_show_burns)
values ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-0000000000e2', 'one_off', 'Πρόταση', 'proposal',
        'draft', date '2099-03-01', 15, 'lost', 48, 48, false, false);
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-0000000000c3', 'invoice', 'Τ-1', date '2026-01-25',
   date '2026-02-09', 100, 24, 124, 'c3/t-1.pdf');
insert into public.client_users (client_id, user_id, name, role_id, removed_at)
select '00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id,
       timestamptz '2026-02-01 10:00+00'
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';
insert into public.gdpr_requests (kind, subject_kind, subject_client_id, received_on)
values ('export', 'client', '00000000-0000-0000-0000-0000000000c8', date '2026-01-10');
set local session_replication_role = origin;

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- ───────────── Άρνηση ─────────────

set local role anon;
select throws_ok($$ select public.client_delete('00000000-0000-0000-0000-0000000000c1', 'Λάθος Καφέ') $$, '42501', null,
  'Ο ανώνυμος δεν διαγράφει Πελάτη');
select throws_ok($$ select public.client_delete_state('00000000-0000-0000-0000-0000000000c1') $$, '42501', null,
  'Ο ανώνυμος δεν βλέπει αν σβήνεται');

set local role authenticated;
select public.t_as('a3');
select throws_ok($$ select public.client_delete('00000000-0000-0000-0000-0000000000c1', 'Λάθος Καφέ') $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν «Διαγράφουν Πελάτες»');
select throws_ok($$ select public.client_delete_state('00000000-0000-0000-0000-0000000000c1') $$, '42501',
  'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Οι Πωλήσεις δεν βλέπουν αν σβήνεται');

-- a7: η Διαχείριση «Διαγράφει Πελάτες» (Δικαίωμα από migration, αλλάζει από τους Ρόλους).
select public.t_as('a2');
select is(public.client_delete_state('00000000-0000-0000-0000-0000000000c1'),
  '{"canDelete": true, "deleteBlock": null}'::jsonb, 'Η Διαχείριση βλέπει ότι ο Πελάτης σβήνεται');

-- ───────────── Ιδιοκτήτης: έλεγχοι πριν από τη διαγραφή ─────────────

select public.t_as('a1');
select throws_ok($$ select public.client_delete(gen_random_uuid(), 'x') $$, 'P0001', 'Ο Πελάτης δεν βρέθηκε',
  'Άγνωστος Πελάτης');
select throws_ok($$ select public.client_delete('00000000-0000-0000-0000-0000000000c1', 'Λάθος Καφές') $$, 'P0001',
  'Γράψε ακριβώς το όνομα του Πελάτη', 'Λάθος όνομα επιβεβαίωσης');
select throws_ok($$ select public.client_delete('00000000-0000-0000-0000-0000000000c1', null) $$, 'P0001',
  'Γράψε ακριβώς το όνομα του Πελάτη', 'Χωρίς όνομα επιβεβαίωσης');

select is(public.client_delete_state('00000000-0000-0000-0000-0000000000c1'),
  '{"canDelete": true, "deleteBlock": null}'::jsonb, 'Ο Πελάτης με μόνο πρόχειρο πωλήσεων σβήνεται');
select is(public.client_delete_state('00000000-0000-0000-0000-0000000000c2'),
  '{"canDelete": false, "deleteBlock": "Έχει Συμφωνία"}'::jsonb, 'Η οθόνη δείχνει τον λόγο: Συμφωνία');
select is(public.client_delete_state('00000000-0000-0000-0000-0000000000c3') ->> 'deleteBlock', 'Έχει Τιμολόγια ή Εισπράξεις',
  'Η οθόνη δείχνει τον λόγο: Τιμολόγιο');
select is(public.client_delete_state('00000000-0000-0000-0000-0000000000c9'),
  '{"canDelete": true, "deleteBlock": null}'::jsonb, 'Το σήμα «Πιθανό διπλό» δεν μπλοκάρει');

select throws_ok($$ select public.client_delete('00000000-0000-0000-0000-0000000000c2', 'Με Συμφωνία') $$, 'P0001',
  'Έχει Συμφωνία', 'Δεν σβήνεται Πελάτης με Συμφωνία');
select throws_ok($$ select public.client_delete('00000000-0000-0000-0000-0000000000c3', 'Με Τιμολόγιο') $$, 'P0001',
  'Έχει Τιμολόγια ή Εισπράξεις', 'Δεν σβήνεται Πελάτης με Τιμολόγιο');
select throws_ok($$ select public.client_delete('00000000-0000-0000-0000-0000000000c4', 'Με Χρήστη') $$, 'P0001',
  'Έχει Χρήστες πελάτη ή προσκλήσεις', 'Δεν σβήνεται Πελάτης με Χρήστη πελάτη (και αφαιρεμένο)');
select throws_ok($$ select public.client_delete('00000000-0000-0000-0000-0000000000c5', 'Με email') $$, 'P0001',
  'Του έχουν σταλεί email', 'Δεν σβήνεται Πελάτης που του στάλθηκε email');
select throws_ok($$ select public.client_delete('00000000-0000-0000-0000-0000000000c6', 'Ενιαίος') $$, 'P0001',
  'Άλλος Πελάτης συγχωνεύτηκε σε αυτόν', 'Δεν σβήνεται Πελάτης στον οποίο συγχωνεύτηκε άλλος');
select throws_ok($$ select public.client_delete('00000000-0000-0000-0000-0000000000c7', 'Συγχωνευμένος') $$, 'P0001',
  'Ο Πελάτης έχει συγχωνευτεί σε άλλον', 'Δεν σβήνεται ο συγχωνευμένος Πελάτης');
select throws_ok($$ select public.client_delete('00000000-0000-0000-0000-0000000000c8', 'Με GDPR') $$, 'P0001',
  'Έχει αίτημα GDPR', 'Δεν σβήνεται Πελάτης με αίτημα GDPR');

reset role;
select is((select count(*)::int from public.clients where id in ('00000000-0000-0000-0000-0000000000c1',
           '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c4',
           '00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000c7',
           '00000000-0000-0000-0000-0000000000c8')), 8, 'Οι απορρίψεις δεν άλλαξαν κανέναν Πελάτη');
select is((select count(*)::int from public.opportunities where client_id in ('00000000-0000-0000-0000-0000000000c1',
           '00000000-0000-0000-0000-0000000000c2')), 3, 'Ούτε τις Ευκαιρίες τους');
select is((select count(*)::int from public.audit_log where action = 'delete' and entity = 'clients'), 0,
  'Καμία γραμμή διαγραφής στο Ίχνος');

-- ───────────── Επιτυχής διαγραφή ─────────────

set local role authenticated;
select public.t_as('a1');
select lives_ok($$ select public.client_delete('00000000-0000-0000-0000-0000000000c1', '  Λάθος Καφέ  ') $$,
  'Ο Ιδιοκτήτης σβήνει τον Πελάτη (το όνομα συγκρίνεται χωρίς κενά στις άκρες)');

reset role;
select is((select count(*)::int from public.clients where id = '00000000-0000-0000-0000-0000000000c1'), 0, 'Ο Πελάτης έφυγε');
select is((select count(*)::int from public.opportunities
            where id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e3')), 0,
  'Οι Ευκαιρίες του έφυγαν (και η συνέχεια)');
select is((select count(*)::int from public.opportunity_activities where client_id = '00000000-0000-0000-0000-0000000000c1'), 0,
  'Οι Δραστηριότητές του έφυγαν');
select is((select count(*)::int from public.client_duplicate_flags
            where '00000000-0000-0000-0000-0000000000c1' in (client_id, matches_client_id)), 0,
  'Τα σήματα «Πιθανό διπλό» έφυγαν και προς τις δύο μεριές');
select is((select count(*)::int from public.access_requests where client_id = '00000000-0000-0000-0000-0000000000c1'), 0,
  'Τα Αιτήματα πρόσβασης έφυγαν');
select is((select count(*)::int from public.events where case_key = 't:delete:e1')
          + (select count(*)::int from public.notifications where title in ('Νέα Ευκαιρία', 'Επόμενο βήμα')), 0,
  'Γεγονότα και Ειδοποιήσεις του έφυγαν (και με σύνδεσμο)');
select is((select client_id from public.automation_sends where case_key = 't:delete:team'), null,
  'Το email προς την ομάδα μένει στο ιστορικό, χωρίς Πελάτη');
select is((select count(*)::int from public.assistant_conversations where id = '00000000-0000-0000-0000-000000000401'), 0,
  'Η Συζήτηση με τον Βοηθό έφυγε');
select is((select count(*)::int from public.clients where id = '00000000-0000-0000-0000-0000000000c9'), 1,
  'Ο άλλος Πελάτης του «Πιθανό διπλό» μένει');
select is((select before ->> 'name' from public.audit_log
            where action = 'delete' and entity = 'clients' and entity_id = '00000000-0000-0000-0000-0000000000c1'
              and actor_id = '00000000-0000-0000-0000-0000000000a1'), 'Λάθος Καφέ',
  'Μία γραμμή διαγραφής στο Ίχνος, με τον Πελάτη στο «πριν»');

select * from finish();
rollback;
