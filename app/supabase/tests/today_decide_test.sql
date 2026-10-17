-- Σήμερα Σβ #181: οι κάρτες «περιμένει απόφαση» (Προτάσεις προς έγκριση, Γυρίσματα προς έγκριση, Διαγραφές από το Google,
-- Χωρίς υπεύθυνο). Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Σταθερό p_now: 2026-03-03 10:00 UTC.
begin;
select plan(41);

-- ───────────── Μητρώο ─────────────
select is((select array_agg(c.code order by c.sort) from public.today_cards c where c.grp = 'decide' and c.sort between 100 and 199),
  array['proposal_approvals', 'filming_approvals', 'google_deletions', 'unassigned', 'gdpr'],
  'Οι τέσσερις κάρτες στη ζώνη της ομάδας decide, και η «GDPR με προθεσμία» (#208) στο τέλος');
select is((select array_agg(c.code order by c.sort) from public.today_cards c where c.grp = 'decide' and c.needs_second_person),
  array['proposal_approvals', 'unassigned'], 'Κανόνας 8: Προτάσεις προς έγκριση και Χωρίς υπεύθυνο θέλουν δεύτερο άνθρωπο');

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 όλες οι αποφάσεις χωρίς ποσά · a3 Πωλήσεις · a4 ομάδα χωρίς Ρόλο · a5 μόνο calendar.google ·
-- b1 Χρήστης πελάτη του Πελάτη 1
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'decider@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'nobody@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'calendar@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr');
insert into public.team_users (user_id, name, email, is_active, deactivated_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a2', 'Δήμητρα', 'decider@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a4', 'Πέτρος', 'nobody@example.com', true, null),
  ('00000000-0000-0000-0000-0000000000a5', 'Ελένη', 'calendar@example.com', true, null);
insert into public.roles (name, description, kind, is_owner, is_builtin)
values ('Αποφάσεις χωρίς ποσά (τεστ)', 'Τεστ: εγκρίνει και αναθέτει, χωρίς ποσά.', 'team', false, false),
       ('Μόνο Google (τεστ)', 'Τεστ: μόνο το αμφίδρομο ημερολόγιο Google.', 'team', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, x.perm, 'all' from public.roles r
 cross join (values ('agreements.deviate'), ('filming.approve'), ('calendar.google'), ('clients.transfer')) x (perm)
 where r.name = 'Αποφάσεις χωρίς ποσά (τεστ)';
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'calendar.google', 'all' from public.roles r where r.name = 'Μόνο Google (τεστ)';
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Αποφάσεις χωρίς ποσά (τεστ)'),
               ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
               ('00000000-0000-0000-0000-0000000000a5', 'Μόνο Google (τεστ)')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Ένα', 'Μαρία Παπαδάκη', 'one@example.com', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Δύο', 'Νίκος Κίνης', 'two@example.com', null);
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

-- ───────────── Εκκρεμότητες (άμεσες εγγραφές, χωρίς triggers) ─────────────
set local session_replication_role = replica;
-- Ευκαιρίες: d1 χωρίς Υπεύθυνο (ουρά) · d2, d3, d4 με Υπεύθυνο (για τις Συμφωνίες)
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due, created_at)
select x.id::uuid, x.client_id::uuid, x.title,
       (select s.id from public.sales_stages s where s.code = 'new'), (select s.id from public.sales_sources s where s.code = 'phone'),
       x.manager::uuid, 'Επόμενο', date '2027-06-01', x.created_at::timestamptz
  from (values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c2', 'Βίντεο γνωριμίας', null,
                '2026-03-01 09:00+00'),
               ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'Πρόταση με Παρέκκλιση',
                '00000000-0000-0000-0000-0000000000a1', '2026-02-01 09:00+00'),
               ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'Εφάπαξ βίντεο',
                '00000000-0000-0000-0000-0000000000a1', '2026-02-01 09:00+00'),
               ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c1', 'Πρόταση που λήγει',
                '00000000-0000-0000-0000-0000000000a1', '2026-02-01 09:00+00'))
       as x (id, client_id, title, manager, created_at);
-- Αιτήματα πρόσβασης: ένα σε αναμονή (της Άννας), ένα που απορρίφθηκε
insert into public.access_requests (id, client_id, requester_id, topic, source_id, status, decided_at, decision_comment, created_at)
select x.id::uuid, '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3', x.topic,
       (select s.id from public.sales_sources s where s.code = 'phone'), x.status, x.decided_at::timestamptz, x.comment,
       x.created_at::timestamptz
  from (values ('00000000-0000-0000-0000-0000000000e1', 'Καμπάνια', 'pending', null, '', '2026-03-02 09:00+00'),
               ('00000000-0000-0000-0000-0000000000e2', 'Παλιό', 'rejected', '2026-02-02 09:00+00', 'Όχι', '2026-02-01 09:00+00'))
       as x (id, topic, status, decided_at, comment, created_at);
-- Συμφωνίες: f1 πρόταση που αναμένει έγκριση (2 × 750 € = 1.500 €) · f3 αναμένει έγκριση και λήγει αύριο ·
-- f2 υπογεγραμμένη εφάπαξ, με Παραγωγή
insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, payment_days, unused_provisions,
                               filming_notice_hours, filming_cancel_hours, late_cancel_burns, no_show_burns, signed_at)
values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d2', 'one_off', 'Βίντεο με έκπτωση', 'proposal',
   'awaiting_approval', date '2026-04-01', 15, 'lost', 48, 48, false, false, null),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000d3', 'one_off', 'Εφάπαξ βίντεο', 'signed',
   'signed', date '2026-04-01', 15, 'lost', 48, 48, false, false, timestamptz '2026-02-10 10:00+00'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000d4', 'one_off', 'Πρόταση που λήγει', 'proposal',
   'awaiting_approval', date '2026-03-04', 15, 'lost', 48, 48, false, false, null);
insert into public.agreement_revisions (agreement_id, number, approval_state, requested_by, requested_at)
values ('00000000-0000-0000-0000-0000000000f1', 1, 'pending', '00000000-0000-0000-0000-0000000000a3', timestamptz '2026-03-02 08:00+00'),
       ('00000000-0000-0000-0000-0000000000f3', 1, 'pending', '00000000-0000-0000-0000-0000000000a3', timestamptz '2026-03-02 09:00+00');
insert into public.agreement_lines (id, agreement_id, position, line_kind, description, quantity)
values ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-0000000000f1', 1, 'free', 'Βίντεο', 2);
insert into public.agreement_line_amounts (line_id, unit_price) values ('00000000-0000-0000-0000-000000000301', 750.00);
insert into public.productions (id, title, client_id, agreement_id, owner_id) values
  ('00000000-0000-0000-0000-000000000101', 'Εφάπαξ βίντεο', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a1');
insert into public.productions (id, title, owner_id) values
  ('00000000-0000-0000-0000-000000000102', 'Εσωτερική Παραγωγή', '00000000-0000-0000-0000-0000000000a1');
-- Γυρίσματα: g1 αναμένει, αύριο νωρίς (επείγον) · g2 αναμένει, σε μία εβδομάδα · g3 ζητά ακύρωση · g4 προγραμματισμένο ·
-- g5 ζητά ακύρωση σε Εσωτερική Παραγωγή (δεν είναι στην ουρά, όπως στο filming_queue_view)
insert into public.filmings (id, production_id, client_id, is_extra, starts_at, hours, origin, state, approved_at,
                             cancel_request_at, cancel_request_reason)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-0000000000c1', true,
   timestamptz '2026-03-03 20:00+00', 2, 'client', 'pending', null, null, null),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-0000000000c1', true,
   timestamptz '2026-03-10 10:00+00', 2, 'client', 'pending', null, null, null),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-0000000000c1', true,
   timestamptz '2026-03-05 10:00+00', 2, 'client', 'scheduled', timestamptz '2026-02-20 10:00+00',
   timestamptz '2026-03-02 10:00+00', 'Άλλαξε το πρόγραμμα'),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-0000000000c1', true,
   timestamptz '2026-03-04 10:00+00', 2, 'team', 'scheduled', timestamptz '2026-02-20 10:00+00', null, null),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000102', null, true,
   timestamptz '2026-03-06 10:00+00', 2, 'team', 'scheduled', timestamptz '2026-02-20 10:00+00',
   timestamptz '2026-03-02 10:00+00', 'Λάθος μέρα');
-- g6 ζητά μετάθεση: τώρα στις 8/3, η νέα ώρα αύριο στις 05:00 (σε λιγότερες από 24 ώρες)
insert into public.filmings (id, production_id, client_id, is_extra, starts_at, hours, origin, state, approved_at,
                             reschedule_starts_at, reschedule_hours, reschedule_requested_at, reschedule_requested_by)
values ('00000000-0000-0000-0000-000000000206', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-0000000000c1', true,
        timestamptz '2026-03-08 10:00+00', 2, 'client', 'scheduled', timestamptz '2026-02-20 10:00+00',
        timestamptz '2026-03-04 05:00+00', 2, timestamptz '2026-03-02 12:00+00', '00000000-0000-0000-0000-0000000000b1');
-- Διαγραφές από το Google: g4 λήγει σε 5 ώρες (επείγον) · g2 σε 2 μέρες · g1 λύθηκε
insert into public.google_deletions (filming_id, event_id, detected_at, deadline_at, resolved_at, resolution) values
  ('00000000-0000-0000-0000-000000000204', 'ev4', timestamptz '2026-03-02 15:00+00', timestamptz '2026-03-03 15:00+00', null, null),
  ('00000000-0000-0000-0000-000000000202', 'ev2', timestamptz '2026-03-03 09:00+00', timestamptz '2026-03-05 09:00+00', null, null),
  ('00000000-0000-0000-0000-000000000201', 'ev1', timestamptz '2026-03-01 09:00+00', timestamptz '2026-03-02 09:00+00',
   timestamptz '2026-03-01 12:00+00', 'restored');
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

-- Τα πλήθη των τεσσάρων καρτών για έναν Χρήστη (και Πελάτη), στη σειρά του μητρώου.
create function public.t_counts(p_last text, p_client uuid) returns integer[]
language sql
as $$
  select array[authz.today_count_proposal_approvals(public.t_uid(p_last), p_client, timestamptz '2026-03-03 10:00+00'),
               authz.today_count_filming_approvals(public.t_uid(p_last), p_client, timestamptz '2026-03-03 10:00+00'),
               authz.today_count_google_deletions(public.t_uid(p_last), p_client, timestamptz '2026-03-03 10:00+00'),
               authz.today_count_unassigned(public.t_uid(p_last), p_client, timestamptz '2026-03-03 10:00+00')];
$$;

create function public.t_field(p jsonb, p_key text) returns text[]
language sql immutable
as $$ select coalesce(array_agg(i ->> p_key order by n), '{}') from jsonb_array_elements(p) with ordinality x (i, n); $$;

-- ───────────── Χωρίς Δικαίωμα ─────────────
set local role anon;
select throws_ok($$ select public.today_card('unassigned') $$, '42501', null, 'Ο ανώνυμος δεν ανοίγει την κάρτα');
reset role;

select public.t_as('a4');
set local role authenticated;
select throws_ok($$ select authz.today_count_unassigned(auth.uid(), null, now()) $$, '42501', null,
  'Οι συναρτήσεις κάρτας δεν καλούνται απευθείας');
select throws_ok($$ select public.today_card('filming_approvals') $$, '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια',
  'Χωρίς filming.approve: η κάρτα δεν ανοίγει');
reset role;

select is(public.t_counts('a4', null), array[null, null, null, null]::integer[], 'Χρήστης ομάδας χωρίς Ρόλο: καμία κάρτα (null)');
select throws_ok($$ select authz.today_items_google_deletions(public.t_uid('a4'), null, timestamptz '2026-03-03 10:00+00') $$,
  '42501', null, 'Χωρίς calendar.google: τα items ρίχνουν 42501');
select throws_ok($$ select authz.today_items_proposal_approvals(public.t_uid('a4'), null, timestamptz '2026-03-03 10:00+00') $$,
  '42501', null, 'Χωρίς agreements.deviate: τα items ρίχνουν 42501');

-- Εύρος: η Άννα (Πωλήσεις) βλέπει στο RLS το δικό της Αίτημα πρόσβασης, αλλά δεν έχει την ουρά «Χωρίς υπεύθυνο».
select is(authz.today_count_unassigned(public.t_uid('a3'), null, timestamptz '2026-03-03 10:00+00'), null,
  'Πωλητής χωρίς clients.transfer: χωρίς κάρτα Χωρίς υπεύθυνο');
select is(authz.today_count_proposal_approvals(public.t_uid('a3'), null, timestamptz '2026-03-03 10:00+00'), null,
  'Πωλητής χωρίς agreements.deviate: χωρίς κάρτα Προτάσεις προς έγκριση');

-- Πελάτης: κάρτες ομάδας, άρα null με p_client· τα items 42501· το RPC δεν δέχεται άλλον Πελάτη ως όρισμα.
select is(public.t_counts('b1', '00000000-0000-0000-0000-0000000000c1'), array[null, null, null, null]::integer[],
  'Χρήστης πελάτη: καμία από τις τέσσερις κάρτες');
select is(public.t_counts('a1', '00000000-0000-0000-0000-0000000000c2'), array[null, null, null, null]::integer[],
  'Με p_client (άλλου Πελάτη) καμία κάρτα ομάδας δεν μετρά');
select throws_ok($$ select authz.today_items_unassigned(public.t_uid('b1'), '00000000-0000-0000-0000-0000000000c1',
                                                        timestamptz '2026-03-03 10:00+00') $$,
  '42501', null, 'Χρήστης πελάτη: τα items ρίχνουν 42501');
select public.t_as('b1');
select throws_ok($$ select public.today_card('proposal_approvals') $$, '42501', null, 'Ο πελάτης δεν ανοίγει κάρτα ομάδας');

-- ───────────── Προτάσεις προς έγκριση ─────────────
select is(public.t_counts('a1', null), array[2, 4, 2, 2], 'Ιδιοκτήτης: 2 προτάσεις, 4 Γυρίσματα, 2 διαγραφές, 2 χωρίς υπεύθυνο');
select is(public.t_counts('a2', null), array[2, 4, 2, 2], 'Ίδια πλήθη με Εύρος «όλα» και χωρίς ποσά');
select is(public.t_counts('a5', null), array[null, null, 2, null]::integer[], 'Μόνο calendar.google: μόνο οι Διαγραφές από το Google');
select is(public.t_field(authz.today_items_proposal_approvals(public.t_uid('a1'), null, timestamptz '2026-03-03 10:00+00'), 'id'),
  array['00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f1'],
  'Πρώτα η πρόταση που λήγει, μετά η παλαιότερη αίτηση');
select is(public.t_field(authz.today_items_proposal_approvals(public.t_uid('a1'), null, timestamptz '2026-03-03 10:00+00'), 'urgent'),
  array['true', 'false'], 'Επείγουσα η πρόταση που λήγει ως αύριο (ώρα Ελλάδας)');
select is(public.t_field(authz.today_items_proposal_approvals(public.t_uid('a1'), null, timestamptz '2026-03-01 21:59+00'), 'urgent'),
  array['false', 'false'], 'Δύο μέρες πριν από τη λήξη (ώρα Ελλάδας): όχι επείγουσα');
select is(authz.today_items_proposal_approvals(public.t_uid('a1'), null, timestamptz '2026-03-03 10:00+00') -> 1 ->> 'amount_cents',
  '150000', 'Με finance.amounts: το ποσό των γραμμών σε λεπτά');
select is((select count(*)::integer
             from jsonb_array_elements(authz.today_items_proposal_approvals(public.t_uid('a2'), null, timestamptz '2026-03-03 10:00+00')) i
            where i ? 'amount_cents'), 0, 'Χωρίς finance.amounts: κανένα ποσό');

-- ───────────── Γυρίσματα προς έγκριση ─────────────
select is(public.t_field(authz.today_items_filming_approvals(public.t_uid('a1'), null, timestamptz '2026-03-03 10:00+00'), 'id'),
  array['booking:00000000-0000-0000-0000-000000000201', 'reschedule:00000000-0000-0000-0000-000000000206',
        'cancel:00000000-0000-0000-0000-000000000203'],
  'Κρατήσεις, μεταθέσεις και ακυρώσεις, τα πιο κοντινά πρώτα· όχι το προγραμματισμένο ούτε η Εσωτερική');
select is(public.t_field(authz.today_items_filming_approvals(public.t_uid('a1'), null, timestamptz '2026-03-03 10:00+00'), 'urgent'),
  array['true', 'true', 'false'], 'Επείγον σε έως 24 ώρες: η κράτηση απόψε και η νέα ώρα της μετάθεσης');
select is(public.t_field(authz.today_items_filming_approvals(public.t_uid('a1'), null, timestamptz '2026-03-03 10:00+00'), 'title'),
  array['Πελάτης Ένα: κράτηση', 'Πελάτης Ένα: ζητά μετάθεση', 'Πελάτης Ένα: ζητά ακύρωση'], 'Τι ζητά ο κάθε Πελάτης');
select is(public.t_field(authz.today_items_filming_approvals(public.t_uid('a1'), null, timestamptz '2026-03-04 21:00+00'), 'urgent'),
  array['true', 'true', 'true'], 'Περασμένο Γύρισμα: και πάλι επείγον');

-- ───────────── Διαγραφές από το Google ─────────────
select is(public.t_field(authz.today_items_google_deletions(public.t_uid('a1'), null, timestamptz '2026-03-03 10:00+00'), 'id'),
  array['00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000202'],
  'Οι ανοιχτές διαγραφές, όποια λήγει νωρίτερα πρώτα· όχι η λυμένη');
select is(public.t_field(authz.today_items_google_deletions(public.t_uid('a1'), null, timestamptz '2026-03-03 10:00+00'), 'urgent'),
  array['true', 'false'], 'Επείγον με λιγότερες από 12 ώρες ως την προθεσμία');
select is(public.t_field(authz.today_items_google_deletions(public.t_uid('a1'), null, timestamptz '2026-03-04 22:00+00'), 'urgent'),
  array['true', 'true'], 'Με 11 ώρες ως την προθεσμία: επείγον');

-- ───────────── Χωρίς υπεύθυνο ─────────────
select is(public.t_field(authz.today_items_unassigned(public.t_uid('a2'), null, timestamptz '2026-03-03 10:00+00'), 'id'),
  array['opportunity:00000000-0000-0000-0000-0000000000d1', 'request:00000000-0000-0000-0000-0000000000e1'],
  'Η Ευκαιρία χωρίς Υπεύθυνο και το Αίτημα σε αναμονή, τα παλαιότερα πρώτα');
select is(public.t_field(authz.today_items_unassigned(public.t_uid('a2'), null, timestamptz '2026-03-03 10:00+00'), 'subtitle'),
  array['Πελάτης Δύο', 'Άννα ζητά πρόσβαση'], 'Ο Πελάτης της Ευκαιρίας, ο πωλητής του Αιτήματος');
select is(public.t_field(authz.today_items_unassigned(public.t_uid('a2'), null, timestamptz '2026-03-03 10:00+00'), 'urgent'),
  array['false', 'false'], 'Χωρίς υπεύθυνο: τίποτα επείγον (κανόνας 5)');

-- ───────────── Ποσά μόνο στις Προτάσεις, σύνδεσμοι προς τις ουρές ─────────────
select is((select count(*)::integer
             from (values (authz.today_items_filming_approvals(public.t_uid('a1'), null, timestamptz '2026-03-03 10:00+00')),
                          (authz.today_items_google_deletions(public.t_uid('a1'), null, timestamptz '2026-03-03 10:00+00')),
                          (authz.today_items_unassigned(public.t_uid('a1'), null, timestamptz '2026-03-03 10:00+00'))) v (items)
             cross join jsonb_array_elements(v.items) i
            where i ? 'amount_cents'), 0, 'Καμία από τις άλλες τρεις κάρτες δεν δείχνει ποσά');
select is((select array_agg(distinct i ->> 'link' order by i ->> 'link')
             from (values (authz.today_items_proposal_approvals(public.t_uid('a1'), null, timestamptz '2026-03-03 10:00+00')),
                          (authz.today_items_filming_approvals(public.t_uid('a1'), null, timestamptz '2026-03-03 10:00+00')),
                          (authz.today_items_google_deletions(public.t_uid('a1'), null, timestamptz '2026-03-03 10:00+00')),
                          (authz.today_items_unassigned(public.t_uid('a1'), null, timestamptz '2026-03-03 10:00+00'))) v (items)
             cross join jsonb_array_elements(v.items) i),
  array['/app/agreements/approvals', '/app/calendar/google-deletions', '/app/filming/queue', '/app/unassigned'],
  'Κάθε γραμμή οδηγεί στην ουρά της');

-- ───────────── Μέσα από τα public RPC ─────────────
select public.t_as('a2');
select is(public.today_card('filming_approvals', timestamptz '2026-03-03 10:00+00') ->> 'count', '4',
  'Το today_card ανοίγει την κάρτα για όποιον εγκρίνει');
select is((select array_agg(c ->> 'code' order by n)
             from jsonb_array_elements(public.today_counts(timestamptz '2026-03-03 10:00+00') -> 'cards') with ordinality x (c, n)
            where c ->> 'grp' = 'decide'),
  array['proposal_approvals', 'filming_approvals', 'google_deletions', 'unassigned'], 'Στο today_counts, στην κοινή σειρά');
select is((select (c ->> 'count')::integer
             from jsonb_array_elements(public.today_counts(timestamptz '2026-03-03 10:00+00') -> 'cards') c
            where c ->> 'code' = 'unassigned'), 2, 'Το πλήθος Χωρίς υπεύθυνο στα πλήθη');
select public.t_as('a3');
select is((select count(*)::integer
             from jsonb_array_elements(public.today_counts(timestamptz '2026-03-03 10:00+00') -> 'cards') c
            where c ->> 'code' in ('proposal_approvals', 'unassigned')), 0, 'Ο πωλητής δεν παίρνει αυτές τις κάρτες');
select throws_ok($$ select public.today_card('unassigned') $$, '42501', null, 'Ο πωλητής δεν ανοίγει το Χωρίς υπεύθυνο');

-- ───────────── Ένας άνθρωπος (κανόνας 8) ─────────────
select public.t_as('a1');
update public.team_users set is_active = false, deactivated_at = now()
 where user_id <> '00000000-0000-0000-0000-0000000000a1';
select is((select array_agg(c ->> 'code' order by n)
             from jsonb_array_elements(public.today_counts(timestamptz '2026-03-03 10:00+00') -> 'cards') with ordinality x (c, n)
            where c ->> 'grp' = 'decide'),
  array['filming_approvals', 'google_deletions'], 'Με έναν Χρήστη ομάδας: χωρίς Προτάσεις προς έγκριση και Χωρίς υπεύθυνο');
select throws_ok($$ select public.today_card('unassigned') $$, '42501', null, 'Με έναν Χρήστη ομάδας: Χωρίς υπεύθυνο 42501');

select * from finish();
rollback;
