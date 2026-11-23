-- Σήμερα: μετά το «Αργότερα», η κάρτα ξαναγεμίζει (today_card_snooze_headroom). Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
-- Σταθερό p_now: 2026-03-10 10:00 UTC (Αθήνα: Τρίτη 10/3).
begin;
select plan(7);

-- ───────────── Χρήστες: a1 Ιδιοκτήτης (όλα) · a2 δεύτερο ενεργό μέλος ομάδας (χωρίς αυτό η «Χωρίς υπεύθυνο» κρύβεται) ─────────────
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'member@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Σοφία', 'member@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Δεδομένα: 12 ληξιπρόθεσμα τιμολόγια και 12 Παραγωγές χωρίς υπεύθυνο ─────────────
set session_replication_role = replica;

insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Καφέ Αθηνά', 'Μαρία Παπαδάκη', 'maria@athina.example.gr', null);

insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path, voided_at, void_reason)
select ('00000000-0000-0000-0000-0000000001' || lpad(n::text, 2, '0'))::uuid,
       '00000000-0000-0000-0000-0000000000c1', 'invoice', 'Ζ-' || lpad(n::text, 2, '0'),
       date '2026-02-01', date '2026-03-01', 100, 24, 124, 'today-snooze-headroom-test/' || n || '.pdf', null, null
  from generate_series(1, 12) n;

insert into public.productions (id, title, client_id, agreement_id, owner_id, state, delivered_at, delivered_note)
select ('00000000-0000-0000-0000-0000000002' || lpad(n::text, 2, '0'))::uuid,
       'Χωρίς υπεύθυνο ' || n, null, null, null, 'open', null, null
  from generate_series(1, 12) n;

reset session_replication_role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- ───────────── Χωρίς αναβολές: 10 γραμμές ─────────────
select is(jsonb_array_length(public.today_card('overdue_invoices', timestamptz '2026-03-10 10:00+00') -> 'items'), 10,
  'Χωρίς αναβολές: 10 γραμμές στην κάρτα');

-- ───────────── Τρεις αναβολές: η κάρτα δίνει και τις 12 (η εφαρμογή κρατά 9) ─────────────
select authz.today_snooze('00000000-0000-0000-0000-0000000000a1'::uuid,
  'overdue_invoices:' || ('00000000-0000-0000-0000-0000000001' || lpad(n::text, 2, '0')),
  timestamptz '2026-03-10 10:00+00')
  from generate_series(1, 3) n;

select is(jsonb_array_length(public.today_card('overdue_invoices', timestamptz '2026-03-10 10:00+00') -> 'items'), 12,
  'Με τρεις αναβολές: 12 γραμμές από τις 12');
select is(public.today_card('overdue_invoices', timestamptz '2026-03-10 10:00+00') ->> 'count', '12',
  'Το πλήθος της κάρτας μένει 12');

-- ───────────── Κάρτα χωρίς ενεργές αναβολές μένει στα 10· η ληγμένη αναβολή δεν μετρά ─────────────
insert into public.today_snoozes (user_id, item_key, until) values
  ('00000000-0000-0000-0000-0000000000a1', 'unassigned:production:00000000-0000-0000-0000-000000000201',
   timestamptz '2026-03-10 09:00+00');

select is(jsonb_array_length(public.today_card('unassigned', timestamptz '2026-03-10 10:00+00') -> 'items'), 10,
  'Ληγμένη αναβολή δεν ανοίγει θέση: 10 γραμμές «Χωρίς υπεύθυνο»');
select is(public.today_card('unassigned', timestamptz '2026-03-10 10:00+00') ->> 'count', '12',
  'Το πλήθος «Χωρίς υπεύθυνο» μένει 12');

-- ───────────── Οι κλήσεις στην ίδια συναλλαγή δεν αθροίζονται ─────────────
select is(jsonb_array_length(public.today_card('overdue_invoices', timestamptz '2026-03-10 10:00+00') -> 'items'), 12,
  'Δεύτερη κλήση της ίδιας κάρτας: ξανά 12, όχι περισσότερα');
select is(authz.today_rows(), 10, 'Μετά τις κλήσεις, το όριο γραμμών επανέρχεται στο 10');

select * from finish();
rollback;
