-- Σήμερα: «Έκλεισες N» (public.today_closed). Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
-- Όλες οι ημερομηνίες είναι σχετικές με τη σημερινή μέρα της Αθήνας, ώστε το τεστ να μην εξαρτάται από ημερομηνία ή τέλος μήνα.
begin;
select plan(9);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 δεύτερο ενεργό μέλος ομάδας (χωρίς αυτό η κάρτα ρόλου κρύβεται)
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

-- ───────────── Δεδομένα ─────────────
set session_replication_role = replica;

insert into public.clients (id, name, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Καφέ Αθηνά', 'Μαρία Παπαδάκη', 'maria@athina.example.gr', null);

-- 12 ληξιπρόθεσμα τιμολόγια: έληξαν πριν 30 μέρες, εκδόθηκαν πριν 60.
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path, voided_at, void_reason)
select ('00000000-0000-0000-0000-0000000001' || lpad(n::text, 2, '0'))::uuid,
       '00000000-0000-0000-0000-0000000000c1', 'invoice', 'Ζ-' || lpad(n::text, 2, '0'),
       (now() at time zone 'Europe/Athens')::date - 60,
       (now() at time zone 'Europe/Athens')::date - 30,
       100, 24, 124, 'today-closed-test/' || n || '.pdf', null, null
  from generate_series(1, 12) n;

reset session_replication_role;

create function public.t_uid(p_last text) returns uuid
language sql immutable as $$ select ('00000000-0000-0000-0000-0000000000' || p_last)::uuid; $$;

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.today_closed() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει το «Έκλεισες»');
reset role;

-- ───────────── Πρώτη κλήση της μέρας: καμία κλεισμένη, γράφεται η αφετηρία ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is(public.today_closed(), '{"closed": 0, "later": 0}'::jsonb, 'Η πρώτη κλήση της μέρας: 0 και 0');
select is((select count(*) from public.today_day_start), 1::bigint, 'Η πρώτη κλήση γράφει τη γραμμή της μέρας');
reset role;

-- Η αφετηρία έχει και τα 12 (πέρα από τις 10 γραμμές της οθόνης).
select is(
  (select count(*) from unnest(authz.today_waiting_keys(public.t_uid('a1'), now())) k
    where k like 'overdue_invoices:%'),
  12::bigint, 'Η αφετηρία έχει και τα 12 ληξιπρόθεσμα, όχι μόνο τις 10 γραμμές');

-- ───────────── Πληρώνονται 3: το 1ο, το 11ο και το 12ο ─────────────
set session_replication_role = replica;
insert into public.receipts (client_id, received_on, amount, method_id, invoice_ids)
select '00000000-0000-0000-0000-0000000000c1', (now() at time zone 'Europe/Athens')::date, 124,
       (select m.id from public.payment_methods m where m.label = 'Τραπεζική κατάθεση'),
       array[('00000000-0000-0000-0000-0000000001' || n)::uuid]
  from unnest(array['01', '11', '12']) n;
reset session_replication_role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is(public.today_closed(), '{"closed": 3, "later": 0}'::jsonb,
  'Πληρώθηκαν 3, και το 11ο και το 12ο: closed = 3');
reset role;

-- ───────────── «Αργότερα» για ένα ακόμα (μένει ανοιχτό, όχι κλεισμένο) ─────────────
select authz.today_snooze(public.t_uid('a1'), 'overdue_invoices:00000000-0000-0000-0000-000000000105', now());

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is(public.today_closed(), '{"closed": 3, "later": 1}'::jsonb,
  'Ένα σε «Αργότερα»: later = 1, το closed μένει 3');
reset role;

-- ───────────── Νέο τιμολόγιο μέσα στη μέρα δεν μετράει ─────────────
set session_replication_role = replica;
insert into public.invoices (id, client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path, voided_at, void_reason)
values ('00000000-0000-0000-0000-000000000199', '00000000-0000-0000-0000-0000000000c1', 'invoice', 'Ζ-99',
        (now() at time zone 'Europe/Athens')::date - 40, (now() at time zone 'Europe/Athens')::date - 20,
        100, 24, 124, 'today-closed-test/99.pdf', null, null);
reset session_replication_role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is(public.today_closed(), '{"closed": 3, "later": 1}'::jsonb,
  'Νέο ληξιπρόθεσμο μέσα στη μέρα δεν αλλάζει το closed');
reset role;

-- ───────────── Άλλος Χρήστης ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.today_day_start where user_id = public.t_uid('a1')), 0::bigint,
  'Άλλος Χρήστης δεν διαβάζει τη γραμμή του Ιδιοκτήτη');
select is(public.today_closed(), '{"closed": 0, "later": 0}'::jsonb,
  'Ο άλλος Χρήστης έχει τη δική του αφετηρία: 0 και 0');
reset role;

select * from finish();
rollback;
