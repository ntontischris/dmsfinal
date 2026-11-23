-- Σήμερα: έως δέκα γραμμές ανά κάρτα. Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
-- Σταθερό p_now: 2026-03-10 10:00 UTC (Αθήνα: Τρίτη 10/3).
begin;
select plan(6);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 δεύτερο ενεργό μέλος ομάδας (χωρίς αυτό η κάρτα «Χωρίς υπεύθυνο» κρύβεται) · b1 Χρήστης πελάτη
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'member@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@client-one.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Σοφία', 'member@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- ───────────── Δεδομένα (χωρίς triggers: μόνο ό,τι διαβάζουν οι κάρτες) ─────────────
set session_replication_role = replica;

insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Καφέ Αθηνά', 'Μαρία Παπαδάκη', 'maria@athina.example.gr', null);
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';

-- 12 ληξιπρόθεσμα τιμολόγια (έληξαν 1/3, σήμερα 10/3, χωρίς πληρωμές)
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path, voided_at, void_reason)
select ('00000000-0000-0000-0000-0000000001' || lpad(n::text, 2, '0'))::uuid,
       '00000000-0000-0000-0000-0000000000c1', 'invoice', 'Ζ-' || lpad(n::text, 2, '0'),
       date '2026-02-01', date '2026-03-01', 100, 24, 124, 'today-rows-test/' || n || '.pdf', null, null
  from generate_series(1, 12) n;

-- 12 ανοιχτές Παραγωγές χωρίς υπεύθυνο (η κάρτα «Χωρίς υπεύθυνο» τις μετρά μέσω του productions.manage του Ιδιοκτήτη)
insert into public.productions (id, title, client_id, agreement_id, owner_id, state, delivered_at, delivered_note)
select ('00000000-0000-0000-0000-0000000002' || lpad(n::text, 2, '0'))::uuid,
       'Χωρίς υπεύθυνο ' || n, null, null, null, 'open', null, null
  from generate_series(1, 12) n;

reset session_replication_role;

-- ───────────── Ιδιοκτήτης: έως 10 γραμμές, το πλήθος ολόκληρο ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select is(jsonb_array_length(public.today_card('overdue_invoices', timestamptz '2026-03-10 10:00+00') -> 'items'), 10,
  '12 ληξιπρόθεσμα: 10 γραμμές στην κάρτα');
select is(public.today_card('overdue_invoices', timestamptz '2026-03-10 10:00+00') ->> 'count', '12',
  'Το πλήθος της κάρτας μένει 12');
select is(jsonb_array_length(public.today_card('unassigned', timestamptz '2026-03-10 10:00+00') -> 'items'), 10,
  '12 χωρίς υπεύθυνο: 10 γραμμές στην κάρτα');
select is(public.today_card('unassigned', timestamptz '2026-03-10 10:00+00') ->> 'count', '12',
  'Το πλήθος «Χωρίς υπεύθυνο» μένει 12');

-- ───────────── Άρνηση: Χρήστης πελάτη δεν παίρνει την κάρτα ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.today_card('overdue_invoices', timestamptz '2026-03-10 10:00+00') $$, '42501', null,
  'Ο Χρήστης πελάτη δεν ανοίγει τα Ληξιπρόθεσμα');
select throws_ok($$ select public.today_card('unassigned', timestamptz '2026-03-10 10:00+00') $$, '42501', null,
  'Ο Χρήστης πελάτη δεν ανοίγει «Χωρίς υπεύθυνο»');
reset role;

select * from finish();
rollback;
