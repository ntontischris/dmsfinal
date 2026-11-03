-- Οι Συμφωνίες του Χρήστη πελάτη (D1/D2): public.client_agreements_view και public.client_agreement_view.
-- Δικαίωμα «Βλέπει Συμφωνίες» στον τρέχοντα Πελάτη, μόνο οι Συμφωνίες και οι σταλμένες προτάσεις που ισχύουν, τίποτα εσωτερικό.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι ημερομηνίες της ενεργής Συμφωνίας ξεκινούν τον τρέχοντα μήνα,
-- ώστε η πρώτη Περίοδος να είναι πάντα η τρέχουσα. Οι κλειστοί πίνακες δεν διαβάζονται ποτέ ως authenticated.
begin;
select plan(30);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · b1 «Πλήρης» στον Πελάτη 1 · b2 Πελάτης 1 μόνο «Βλέπει Συνομιλία» · b3 «Πλήρης» στον Πελάτη 2
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@client-one.example.gr'),
  ('00000000-0000-0000-0000-0000000000b3', 'b3@client-two.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com');
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000a1', r.id from public.roles r where r.name = 'Ιδιοκτήτης' and r.kind = 'team';
insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Ένα', 'Μαρία Παπαδάκη', 'one@example.com', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Δύο', 'Νίκος Κίνης', 'two@example.com', '00000000-0000-0000-0000-0000000000a1');
insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Μόνο Συνομιλία (τεστ)', 'Τεστ: μόνο διαβάζει τη Συνομιλία.', 'client', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.chatRead', 'all' from public.roles r where r.name = 'Μόνο Συνομιλία (τεστ)';
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select x.client_id::uuid, x.user_id::uuid, x.name, r.id, true
  from (values
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', 'Πλήρης'),
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'Λία', 'Μόνο Συνομιλία (τεστ)'),
    ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b3', 'Πάνος', 'Πλήρης')
  ) as x (client_id, user_id, name, role_name)
  join public.roles r on r.name = x.role_name and r.kind = 'client';

-- ───────────── Συμφωνίες (άμεσες εγγραφές, χωρίς triggers) ─────────────
-- Πελάτης 1: f1 ενεργή μηνιαία (από την 1η του τρέχοντος μήνα, 12 μήνες) · f2 πρόταση σταλμένη που ισχύει ·
-- f3 Σύνταξη · f4 αναμένει Έγκριση · f5 σταλμένη αλλά έληξε · f6 χαμένη. Πελάτης 2: f7 ενεργή.
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select x.id::uuid, x.client_id::uuid, x.title,
       (select s.id from public.sales_stages s where s.code = 'proposal'), (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a1', 'Επόμενο', date '2099-06-01'
  from (values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Ευκαιρία 1'),
               ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c1', 'Ευκαιρία 2'),
               ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000c1', 'Ευκαιρία 3'),
               ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000c1', 'Ευκαιρία 4'),
               ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000c1', 'Ευκαιρία 5'),
               ('00000000-0000-0000-0000-0000000000e6', '00000000-0000-0000-0000-0000000000c1', 'Ευκαιρία 6'),
               ('00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000c2', 'Ευκαιρία 7'))
       as x (id, client_id, title);

set local session_replication_role = replica;
insert into public.agreements (id, opportunity_id, kind, title, state, path, valid_until, start_on, duration_months, end_on,
                               payment_days, unused_provisions, renewal, filming_notice_hours, filming_cancel_hours,
                               late_cancel_burns, no_show_burns, signed_at)
select x.id::uuid, x.opp::uuid, 'monthly', x.title, x.state, x.path, x.valid_until,
       case when x.state = 'active' then date_trunc('month', public.sales_today())::date end, 12,
       case when x.state = 'active' then (date_trunc('month', public.sales_today()) + interval '12 months')::date - 1 end,
       15, 'lost', 'new_opportunity', 48, 24, true, true,
       case when x.state = 'active' then timestamptz '2026-01-10 10:00+00' end
  from (values
    ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1', 'Μηνιαίο Ένα', 'active', 'signed', date '2026-01-20'),
    ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e2', 'Πρόταση σταλμένη', 'proposal', 'sent', date '2999-12-31'),
    ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000e3', 'Πρόταση σε Σύνταξη', 'proposal', 'draft', date '2999-12-31'),
    ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000e4', 'Πρόταση σε Έγκριση', 'proposal', 'awaiting_approval', date '2999-12-31'),
    ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000e5', 'Πρόταση που έληξε', 'proposal', 'sent', date '2000-01-01'),
    ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000e6', 'Πρόταση χαμένη', 'proposal', 'lost', date '2999-12-31'),
    ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000000e7', 'Μηνιαίο Δύο', 'active', 'signed', date '2026-01-20')
  ) as x (id, opp, title, state, path, valid_until);

-- Γραμμή του f1 με ώρες και κόστος (εσωτερικά), αντίγραφο κόστους και Έγκριση: τίποτα από αυτά δεν πρέπει να φανεί.
insert into public.agreement_lines (id, agreement_id, position, line_kind, description) values
  ('00000000-0000-0000-0000-000000000b11', '00000000-0000-0000-0000-0000000000f1', 1, 'free', 'Reels');
insert into public.agreement_line_amounts (line_id, unit_price) values ('00000000-0000-0000-0000-000000000b11', 1000);
insert into public.agreement_line_costs (line_id, hours_shoot, hours_edit, direct_cost)
values ('00000000-0000-0000-0000-000000000b11', 7, 9, 333);
insert into public.agreement_line_provisions (line_id, kind_id, quantity)
select '00000000-0000-0000-0000-000000000b11', k.id, 4 from public.provision_kinds k where k.code = 'reel';
insert into public.agreement_costs (agreement_id, hour_cost, multiplier_min, multiplier_target, multiplier_max, price,
                                    discounted_price, estimated_cost, is_low_margin)
values ('00000000-0000-0000-0000-0000000000f1', 55, 1.5, 2, 3, 1000, 900, 444, true);
insert into public.agreement_revisions (agreement_id, number, summary, approval_state, comment, sent_at) values
  ('00000000-0000-0000-0000-0000000000f1', 1, 'Πρώτη', 'approved', 'Εσωτερικό σχόλιο Έγκρισης', timestamptz '2026-01-05 10:00+00'),
  ('00000000-0000-0000-0000-0000000000f2', 1, 'Πρώτη', null, '', timestamptz '2026-02-05 10:00+00');
insert into public.agreement_recipients (agreement_id, position, name, email, is_signatory) values
  ('00000000-0000-0000-0000-0000000000f2', 1, 'Μαρία Παπαδάκη', 'one@example.com', true);
insert into public.agreement_documents (agreement_id, revision, document, hash) values
  ('00000000-0000-0000-0000-0000000000f1', 1,
   '{"title": "Μηνιαίο Ένα", "language": "el", "totals": {"net": 1000, "discounted_net": 900, "discount_months": 1}}', 'h1'),
  ('00000000-0000-0000-0000-0000000000f2', 1,
   '{"title": "Πρόταση σταλμένη", "language": "el", "totals": {"net": 500, "discounted_net": 500, "discount_months": 0}}', 'h2'),
  ('00000000-0000-0000-0000-0000000000f7', 1,
   '{"title": "Μηνιαίο Δύο", "language": "el", "totals": {"net": 700, "discounted_net": 700, "discount_months": 0}}', 'h7');
insert into public.agreement_signatures (agreement_id, method, signed_name, signed_on, document_hash, reference, ip)
values ('00000000-0000-0000-0000-0000000000f1', 'outside', 'Μαρία Παπαδάκη', date '2026-01-10', 'h1', 'Εσωτερική αναφορά', '10.0.0.1');
insert into public.agreement_periods (id, agreement_id, n, starts, ends, is_partial, gives_provisions)
select '00000000-0000-0000-0000-000000000a11', '00000000-0000-0000-0000-0000000000f1', 1,
       date_trunc('month', public.sales_today())::date, (date_trunc('month', public.sales_today()) + interval '1 month')::date - 1,
       false, true;
insert into public.agreement_period_provisions (period_id, kind_id, given)
select '00000000-0000-0000-0000-000000000a11', k.id, 4 from public.provision_kinds k where k.code = 'reel';
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

create function public.t_id(p_last text) returns uuid
language sql immutable
as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;

create function public.t_ids(p jsonb) returns text[]
language sql immutable
as $$ select coalesce(array_agg(i ->> 'id' order by n), '{}') from jsonb_array_elements(p) with ordinality x (i, n); $$;

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.client_agreements_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Συμφωνίες πελάτη');
select throws_ok($$ select public.client_agreement_view('00000000-0000-0000-0000-0000000000f1') $$, '42501', null,
  'Ο ανώνυμος δεν ανοίγει Συμφωνία πελάτη');
reset role;

select public.t_as('a1');
select throws_ok($$ select public.client_agreements_view() $$, '42501', null, 'Η ομάδα δεν έχει όψη Χρήστη πελάτη (λίστα)');
select throws_ok($$ select public.client_agreement_view(public.t_id('f1')) $$, '42501', null,
  'Η ομάδα δεν έχει όψη Χρήστη πελάτη (σελίδα)');

select public.t_as('b2');
select throws_ok($$ select public.client_agreements_view() $$, '42501', null,
  'Χρήστης πελάτη χωρίς «Βλέπει Συμφωνίες» δεν βλέπει τη λίστα');
select throws_ok($$ select public.client_agreement_view(public.t_id('f1')) $$, '42501', null,
  'Χρήστης πελάτη χωρίς «Βλέπει Συμφωνίες» δεν ανοίγει Συμφωνία');

-- ───────────── Λίστα (oracle) ─────────────
select public.t_as('b1');
set local role authenticated;
select lives_ok($$ select public.client_agreements_view() $$, 'Ο authenticated με «Βλέπει Συμφωνίες» διαβάζει τη λίστα');
reset role;
select is(public.t_ids(public.client_agreements_view() -> 'items'),
  array['00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f1'],
  'Μόνο η σταλμένη πρόταση (πρώτη) και η ενεργή· όχι Σύνταξη, Έγκριση, ληγμένη, χαμένη ή του άλλου Πελάτη');
select is(public.client_agreements_view() -> 'items' -> 0 ->> 'state', 'proposal', 'Η πρόταση φαίνεται ως πρόταση');
select is(public.client_agreements_view() -> 'items' -> 0 ->> 'validUntil', '2999-12-31', 'Η πρόταση έχει «Ισχύει ως»');
select ok(public.client_agreements_view() -> 'items' -> 0 ->> 'sentAt' is not null, 'Η πρόταση έχει ημερομηνία αποστολής');
select is((public.client_agreements_view() -> 'items' -> 1 ->> 'net')::numeric, 1000::numeric,
  'Το ποσό είναι το καθαρό του εγγράφου');
select is(public.client_agreements_view() -> 'items' -> 1 ->> 'state', 'active', 'Η υπογεγραμμένη που ξεκίνησε είναι ενεργή');
select is((public.client_agreements_view() -> 'items' -> 1 -> 'current' ->> 'n')::integer, 1, 'Η τρέχουσα Περίοδος είναι η 1η');
select is((public.client_agreements_view() -> 'items' -> 1 -> 'current' -> 'provisions' -> 0 ->> 'balance')::numeric, 4::numeric,
  'Στην τρέχουσα Περίοδο μένουν και τα 4 reel');
select is(public.client_agreements_view() -> 'items' -> 1 ->> 'validUntil', null, 'Η Συμφωνία δεν έχει «Ισχύει ως»');

-- ───────────── Σελίδα: τι δεν φαίνεται ─────────────
select is(public.client_agreement_view(public.t_id('f3')), null, 'Η πρόταση σε Σύνταξη δεν φαίνεται');
select is(public.client_agreement_view(public.t_id('f4')), null, 'Η πρόταση που αναμένει Έγκριση δεν φαίνεται');
select is(public.client_agreement_view(public.t_id('f5')), null, 'Η πρόταση που έληξε δεν φαίνεται');
select is(public.client_agreement_view(public.t_id('f6')), null, 'Η χαμένη πρόταση δεν φαίνεται');
select is(public.client_agreement_view(public.t_id('f7')), null, 'Η Συμφωνία άλλου Πελάτη δεν φαίνεται');
select is(public.client_agreement_view('00000000-0000-0000-0000-00000000ffff'), null, 'Άγνωστη Συμφωνία: null');
select ok(
  not (public.client_agreement_view(public.t_id('f1')) ?| array['cost', 'revisions', 'recipients', 'deviations', 'opportunity',
                                                                'outbox_pending', 'change_requests', 'lines', 'can'])
  and public.client_agreement_view(public.t_id('f1'))::text not like all
      (array['%estimated%', '%multiplier%', '%hours%', '%direct_cost%', '%Εσωτερικ%', '%10.0.0.1%', '%margin%']),
  'Καμία εσωτερική πληροφορία: κόστος, ώρες, Εγκρίσεις, αναφορά υπογραφής, IP, παραλήπτες');

-- ───────────── Σελίδα: oracle ─────────────
select is(public.client_agreement_view(public.t_id('f1')) -> 'document',
  '{"title": "Μηνιαίο Ένα", "language": "el", "totals": {"net": 1000, "discounted_net": 900, "discount_months": 1}}'::jsonb,
  'Το έγγραφο είναι αυτό που υπογράφηκε, όπως στον Σύνδεσμο');
select is(jsonb_array_length(public.client_agreement_view(public.t_id('f1')) -> 'periods'), 12, 'Δώδεκα Περίοδοι');
select is(
  array[(public.client_agreement_view(public.t_id('f1')) -> 'periods' -> 0 ->> 'amount')::numeric,
        (public.client_agreement_view(public.t_id('f1')) -> 'periods' -> 1 ->> 'amount')::numeric],
  array[900, 1000]::numeric[], 'Ο πρώτος μήνας με την έκπτωση, ο δεύτερος χωρίς');
select is(public.client_agreement_view(public.t_id('f1')) -> 'signature',
  jsonb_build_object('signedName', 'Μαρία Παπαδάκη', 'signedOn', '2026-01-10'), 'Ποιος υπέγραψε και πότε');
select is(public.client_agreement_view(public.t_id('f2')) -> 'document' ->> 'title', 'Πρόταση σταλμένη',
  'Η σταλμένη πρόταση ανοίγει με το έγγραφό της');

-- ───────────── Άλλος Πελάτης ─────────────
select public.t_as('b3');
select is(public.t_ids(public.client_agreements_view() -> 'items'), array['00000000-0000-0000-0000-0000000000f7'],
  'Ο Χρήστης του Πελάτη 2 βλέπει μόνο τη δική του');
select is(public.client_agreement_view(public.t_id('f1')), null, 'Ο Χρήστης του Πελάτη 2 δεν ανοίγει Συμφωνία του Πελάτη 1');

select * from finish();
rollback;
