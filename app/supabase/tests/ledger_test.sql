-- Καρτέλα Πελάτη (I5), όψη πελάτη και ληξιπρόθεσμα, Iδ #153: άρνηση ανά ρόλο, Σενάριο 1 και 3 του blueprint (τρέχον υπόλοιπο),
-- προκαταβολή → αρνητικό υπόλοιπο, ακυρωμένα και διαγραμμένα εκτός Καρτέλας, «Προς τιμολόγηση» μόνο για την ομάδα,
-- email ληξιπρόθεσμου μία φορά και μετά τις 09:00 Αθήνας. Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
-- Όλες οι ημερομηνίες είναι σταθερές (2026) και η ώρα του ελέγχου χρονισμών δίνεται ρητά, άρα το τεστ δεν εξαρτάται από τη μέρα εκτέλεσης.
-- Το ληξιπρόθεσμο είναι πλέον Αυτοματισμός «με ημερομηνία» (Kγ #172): email kind «automation» με σημάδι στο automation_sends.
begin;
select plan(47);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Λογιστής · a3 Πωλήσεις
-- b1 Χρήστης πελάτη Α με «Πλήρης» · b2 Χρήστης πελάτη Α χωρίς «Βλέπει Οικονομικά» · b3 Χρήστης πελάτη Β με «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'k2@client-a.example.gr'),
  ('00000000-0000-0000-0000-0000000000b3', 'k3@client-b.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ελένη', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

insert into public.clients (id, name, afm, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', '123456789', 'Μαρία Παπαδάκη', 'a@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', '987654321', 'Νίκος Κίνης', 'b@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c3', 'Πελάτης Γ', '555555555', 'Ελένη Γεωργίου', 'c@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c4', 'Πελάτης Δ', '444444444', 'Πέτρος Δ', 'd@example.com', '00000000-0000-0000-0000-0000000000a3');

insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Μόνο προβολή (τεστ)', 'Τεστ: Χρήστης πελάτη χωρίς Οικονομικά.', 'client', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.productions', 'all' from public.roles r where r.name = 'Μόνο προβολή (τεστ)';
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Κώστας',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b2', 'Λία',
   (select r.id from public.roles r where r.name = 'Μόνο προβολή (τεστ)' and r.kind = 'client'), true),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b3', 'Πάνος',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true);

select set_config('t.a', '00000000-0000-0000-0000-0000000000c1', true);
select set_config('t.b', '00000000-0000-0000-0000-0000000000c2', true);
select set_config('t.c', '00000000-0000-0000-0000-0000000000c3', true);
select set_config('t.bank', (select m.id::text from public.payment_methods m where m.label = 'Τραπεζική κατάθεση'), true);

create function public.t_pdf() returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_path text := 'pending/' || gen_random_uuid()::text || '.pdf';
begin
  insert into storage.objects (bucket_id, name) values ('invoices', v_path);
  return v_path;
end;
$$;
grant execute on function public.t_pdf() to authenticated;

create function public.t_reg(
  p_client uuid, p_kind text, p_number text, p_issue date, p_net numeric, p_vat numeric, p_total numeric,
  p_credit uuid default null, p_due date default null
) returns uuid
language sql
as $$
  select (public.invoice_register(jsonb_build_object(
    'clientId', p_client, 'kind', p_kind, 'number', p_number, 'issueDate', p_issue, 'dueDate', p_due,
    'net', p_net, 'vat', p_vat, 'total', p_total, 'creditFor', p_credit,
    'pdfPath', public.t_pdf()
  ))->>'id')::uuid;
$$;

-- ───────────── Άρνηση ανά ρόλο ─────────────
set local role anon;
select throws_ok($$ select public.client_ledger_view(current_setting('t.a')::uuid) $$, '42501', null, 'Ο ανώνυμος δεν βλέπει Καρτέλα');
select throws_ok($$ select public.clients_with_finance() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τη λίστα Καρτελών');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok(
  $$ select public.client_ledger_view(current_setting('t.b')::uuid) $$,
  '42501', null, 'Ο Χρήστης πελάτη Α δεν βλέπει την Καρτέλα του Β'
);
select throws_ok($$ select public.clients_with_finance() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει τη λίστα Καρτελών της ομάδας');
set local role authenticated;
select throws_ok($$ select public.automations_scan() $$, '42501', null, 'Ο authenticated δεν τρέχει τον έλεγχο χρονισμών');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select throws_ok($$ select public.client_ledger_view() $$, '42501', null, 'Χρήστης πελάτη χωρίς «Βλέπει Οικονομικά» δεν βλέπει Καρτέλα');
select throws_ok($$ select public.client_invoices_view() $$, '42501', null, 'Χρήστης πελάτη χωρίς «Βλέπει Οικονομικά» δεν βλέπει Τιμολόγια');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok($$ select public.client_ledger_view(current_setting('t.a')::uuid) $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν Καρτέλα');
select throws_ok($$ select public.clients_with_finance() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν τη λίστα Καρτελών');
select throws_ok($$ select public.client_invoices_view() $$, '42501', null, 'Η ομάδα δεν έχει όψη Χρήστη πελάτη');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$ select public.client_ledger_view() $$, 'P0001', null, 'Η ομάδα πρέπει να διαλέξει Πελάτη');

-- ───────────── Δεδομένα: Συμφωνία και Τιμολογητέα του Α ─────────────
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο Α',
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a3', 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3;
select set_config('t.agr', public.agreement_create('00000000-0000-0000-0000-0000000000d1', 'monthly', 'Μηνιαίο Α')::text, true);
insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net) values
  ('00000000-0000-0000-0000-0000000000c1', current_setting('t.agr')::uuid, 'period', gen_random_uuid(), 'Περίοδος Ιούνιος', date '2026-06-01', 1300),
  ('00000000-0000-0000-0000-0000000000c1', current_setting('t.agr')::uuid, 'period', gen_random_uuid(), 'Περίοδος Αύγουστος', date '2026-08-01', 500);

-- Σενάριο 1: Τιμολόγιο 1.300 + 312 ΦΠΑ = 1.612 € στον Α. Ένα ακυρωμένο Τιμολόγιο και μία διαγραμμένη Είσπραξη δεν μετρούν.
select public.t_reg(current_setting('t.a')::uuid, 'invoice', '87', date '2026-06-03', 1300, 312, 1612, null, date '2026-06-23');
select set_config('t.x', public.t_reg(current_setting('t.a')::uuid, 'invoice', 'X-1', date '2026-06-04', 100, 0, 100)::text, true);
update public.invoices set voided_at = now(), void_reason = 'Λάθος καταχώριση' where id = current_setting('t.x')::uuid;
select set_config('t.del', public.receipt_register(current_setting('t.a')::uuid, date '2026-06-05', 300, current_setting('t.bank')::uuid, 'Λάθος')::text, true);
select public.receipt_delete(current_setting('t.del')::uuid, 'Λάθος ποσό');

-- Σενάριο 3: Β. Α-1 1.364 (2/5), Β-1 1.364 (2/6), Είσπραξη 1.364 (10/6), Είσπραξη 500 (20/6), πιστωτικό 124 στο Β-1 (25/6).
select set_config('t.ba', public.t_reg(current_setting('t.b')::uuid, 'invoice', 'A-1', date '2026-05-02', 1100, 264, 1364)::text, true);
select set_config('t.bb', public.t_reg(current_setting('t.b')::uuid, 'invoice', 'B-1', date '2026-06-02', 1100, 264, 1364, null, date '2026-06-17')::text, true);
select public.receipt_register(current_setting('t.b')::uuid, date '2026-06-10', 1364, current_setting('t.bank')::uuid, '');
select public.receipt_register(current_setting('t.b')::uuid, date '2026-06-20', 500, current_setting('t.bank')::uuid, 'Μερική');
select public.t_reg(current_setting('t.b')::uuid, 'credit', 'P-1', date '2026-06-25', 100, 24, 124, current_setting('t.bb')::uuid);

-- Προκαταβολή: Είσπραξη χωρίς Τιμολόγιο στον Γ.
select public.receipt_register(current_setting('t.c')::uuid, date '2026-07-01', 500, current_setting('t.bank')::uuid, 'Προκαταβολή');

-- ───────────── Καρτέλα για την ομάδα ─────────────
select is(
  (public.client_ledger_view(current_setting('t.a')::uuid)->>'balance')::numeric, 1612::numeric,
  'Σενάριο 1: το υπόλοιπο μετά το Τιμολόγιο είναι 1.612 €'
);
select is(
  jsonb_array_length(public.client_ledger_view(current_setting('t.a')::uuid)->'entries'), 1,
  'Το ακυρωμένο Τιμολόγιο και η διαγραμμένη Είσπραξη λείπουν από τις κινήσεις'
);
select is(
  (public.client_ledger_view(current_setting('t.a')::uuid)->'entries'->0->>'kind') || '|' ||
  (public.client_ledger_view(current_setting('t.a')::uuid)->'entries'->0->>'label'),
  'invoice|Τιμολόγιο 87', 'Η κίνηση είναι χρέωση Τιμολογίου με ετικέτα'
);
select is(
  trim_scale((public.client_ledger_view(current_setting('t.a')::uuid)->'toInvoice'->>'amount')::numeric)::text || '|' ||
  (public.client_ledger_view(current_setting('t.a')::uuid)->'toInvoice'->>'count'),
  '500|1', 'Η ομάδα βλέπει «Προς τιμολόγηση»: μένουν 500 € σε 1 Τιμολογητέο'
);
select is(
  (public.client_ledger_view(current_setting('t.b')::uuid)->>'balance')::numeric, 740::numeric,
  'Σενάριο 3: μετά το πιστωτικό το υπόλοιπο είναι 740 €'
);
select is(
  (select string_agg(trim_scale((e->>'running')::numeric)::text, '|' order by o)
     from jsonb_array_elements(public.client_ledger_view(current_setting('t.b')::uuid)->'entries') with ordinality as t(e, o)),
  '1364|2728|1364|864|740', 'Τρέχον υπόλοιπο ανά κίνηση, κατά ημερομηνία'
);
select is(
  (public.client_ledger_view(current_setting('t.b')::uuid)->>'overdue')::numeric, 740::numeric,
  'Ληξιπρόθεσμο το υπόλοιπο 740 € του Β-1'
);
select is(
  (select string_agg(e->>'label', '|' order by o)
     from jsonb_array_elements(public.client_ledger_view(current_setting('t.b')::uuid)->'entries') with ordinality as t(e, o)),
  'Τιμολόγιο A-1|Τιμολόγιο B-1|Είσπραξη|Είσπραξη (Μερική)|Πιστωτικό P-1', 'Η ομάδα βλέπει τις ετικέτες με τη σημείωση της Είσπραξης'
);
select is(
  (select string_agg(e->>'kind', '|' order by o)
     from jsonb_array_elements(public.client_ledger_view(current_setting('t.b')::uuid)->'entries') with ordinality as t(e, o)),
  'invoice|invoice|payment|payment|credit', 'Τα είδη κινήσεων'
);
select is(
  (public.client_ledger_view(current_setting('t.c')::uuid)->>'balance')::numeric, (-500)::numeric,
  'Προκαταβολή: αρνητικό υπόλοιπο, υπέρ του πελάτη'
);
select is(
  (public.client_ledger_view(current_setting('t.c')::uuid)->'entries'->0->>'kind') || '|' ||
  (public.client_ledger_view(current_setting('t.c')::uuid)->'entries'->0->>'label'),
  'payment|Είσπραξη (Προκαταβολή)', 'Η προκαταβολή είναι πίστωση χωρίς Τιμολόγιο'
);
select is(
  (public.client_ledger_view(current_setting('t.c')::uuid)->'entries'->0->>'running')::numeric, (-500)::numeric,
  'Το τρέχον υπόλοιπο της προκαταβολής είναι -500 €'
);

select is(jsonb_array_length(public.clients_with_finance()), 3, 'Η λίστα έχει μόνο Πελάτες με κινήσεις (Α, Β, Γ)');
select is(
  (select (x->>'balance')::numeric from jsonb_array_elements(public.clients_with_finance()) x where x->>'id' = current_setting('t.c')),
  (-500)::numeric, 'Η λίστα δείχνει το υπόλοιπο του Γ'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select lives_ok($$ select public.client_ledger_view(current_setting('t.a')::uuid) $$, 'Ο Λογιστής διαβάζει την Καρτέλα');
select lives_ok($$ select public.clients_with_finance() $$, 'Ο Λογιστής διαβάζει τη λίστα Καρτελών');

-- ───────────── Όψη Χρήστη πελάτη ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is(jsonb_typeof(public.client_ledger_view()->'toInvoice'), 'null', 'Ο πελάτης δεν βλέπει «Προς τιμολόγηση»');
select is((public.client_ledger_view()->>'clientId'), current_setting('t.a'), 'Χωρίς όρισμα ο πελάτης παίρνει τη δική του Καρτέλα');
select lives_ok($$ select public.client_ledger_view(current_setting('t.a')::uuid) $$, 'Ο πελάτης μπορεί να ζητήσει ρητά τον δικό του Πελάτη');
select is((public.client_ledger_view()->>'balance')::numeric, 1612::numeric, 'Ο πελάτης βλέπει το υπόλοιπο 1.612 €');
select is(jsonb_array_length(public.client_invoices_view()->'items'), 1, 'Ο πελάτης δεν βλέπει το ακυρωμένο Τιμολόγιο');
select ok(
  not (public.client_invoices_view() ? 'totals') and not (public.client_invoices_view()->'items'->0 ? 'clientName'),
  'Η όψη πελάτη δεν έχει σύνολα εταιρείας ούτε στήλη Πελάτη'
);
select is((public.client_invoices_view()->'items'->0->>'remaining')::numeric, 1612::numeric, 'Η όψη πελάτη δείχνει το υπόλοιπο του Τιμολογίου');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}', true);
select is(
  (select string_agg(e->>'label', '|' order by o)
     from jsonb_array_elements(public.client_ledger_view()->'entries') with ordinality as t(e, o)),
  'Τιμολόγιο A-1|Τιμολόγιο B-1|Είσπραξη|Είσπραξη|Πιστωτικό P-1', 'Ο πελάτης δεν βλέπει τις εσωτερικές σημειώσεις των Εισπράξεων'
);
select is(
  (select string_agg(i->>'number', '|' order by o)
     from jsonb_array_elements(public.client_invoices_view()->'items') with ordinality as t(i, o)),
  'P-1|B-1|A-1', 'Ο πελάτης βλέπει Τιμολόγια και πιστωτικά, νεότερο πρώτα'
);

-- ───────────── Ληξιπρόθεσμα: μία φορά, μετά τις 09:00 Αθήνας ─────────────
reset role;
insert into public.bank_accounts (bank_name, holder, iban, is_default)
values ('Τράπεζα Δοκιμής', 'Εταιρεία Δοκιμής', 'GR1601101250000000012300695', true);

-- Τα email ληξιπρόθεσμου (ως postgres, ποτέ ως authenticated).
create function public.t_overdue() returns setof public.email_outbox
language sql
as $$
  select o.* from public.email_outbox o join public.automation_sends s on s.email_outbox_id = o.id
   where s.case_key like 'invoice.overdue:%';
$$;

set local role service_role;
select public.automations_scan('2026-06-18 05:59:00+00');
reset role;
select is((select count(*)::int from public.t_overdue()), 0, 'Στις 08:59 Αθήνας δεν στέλνεται τίποτα');
set local role service_role;
select public.automations_scan('2026-06-18 06:00:00+00');
reset role;
select is((select count(*)::int from public.t_overdue()), 1, 'Στις 09:00 Αθήνας μπαίνει ένα email για το ληξιπρόθεσμο Β-1');
set local role service_role;
select public.automations_scan('2026-06-18 07:00:00+00');
reset role;
select is((select count(*)::int from public.t_overdue()), 1, 'Δεύτερος έλεγχος: τίποτα, μία φορά ανά Τιμολόγιο');

select is((select o.to_email from public.t_overdue() o), 'k3@client-b.example.gr',
  'Ο παραλήπτης είναι ο Χρήστης πελάτη του Β με «Βλέπει Οικονομικά»');
select is((select o.payload->>'subject' from public.t_overdue() o), 'Ληξιπρόθεσμο τιμολόγιο B-1', 'Το θέμα έχει τον αριθμό');
select ok((select o.payload->>'body' like '%Υπόλοιπο: 740,00 €%' from public.t_overdue() o), 'Το κείμενο έχει το υπόλοιπο');
select ok((select o.payload->>'body' like '%IBAN GR1601101250000000012300695%' from public.t_overdue() o),
  'Το κείμενο έχει τα στοιχεία πληρωμής του προεπιλεγμένου λογαριασμού');
select is(
  (select count(*)::int from public.automation_sends s where s.case_key like 'invoice.overdue:' || current_setting('t.ba') || ':%'),
  0, 'Το εξοφλημένο Α-1 δεν ειδοποιείται'
);

set local role service_role;
select public.automations_scan('2026-06-24 06:00:00+00');
reset role;
select is((select count(*)::int from public.t_overdue()), 2, 'Την επόμενη λήξη (το 87 του Α) μπαίνει ένα νέο email');
select is(
  (select string_agg(o.to_email, ',') from public.t_overdue() o where o.payload->>'subject' = 'Ληξιπρόθεσμο τιμολόγιο 87'),
  'k1@client-a.example.gr', 'Μόνο ο Χρήστης πελάτη με «Βλέπει Οικονομικά» (όχι ο k2)'
);
select is((select count(*)::int from public.t_overdue() o where o.payload->>'subject' = 'Ληξιπρόθεσμο τιμολόγιο B-1'), 1,
  'Το Β-1 δεν ξαναστάλθηκε');

select * from finish();
rollback;
