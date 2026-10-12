-- Τιμολόγια (I2) και Καταχώρηση (I3), Iγ #152: άρνηση ανά ρόλο, καταχώρηση με προειδοποιήσεις και ΑΦΜ, πιστωτικά,
-- κάλυψη Τιμολογητέων (και «πέρα»), κατανομή Εισπράξεων, καταστάσεις (σενάριο 3 του blueprint), Είσπραξη πριν από Τιμολόγιο,
-- email ανά Χρήστη πελάτη, λήψη PDF και κλειστός πίνακας. Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή.
-- Οι ημερομηνίες είναι σταθερές (2026), εκτός από ένα Τιμολόγιο που εκδίδεται «σήμερα» για τον Τζίρο μήνα· ένα άλλο έχει
-- ημερομηνίες του 2099 ώστε να μην είναι ποτέ ληξιπρόθεσμο.
begin;
select plan(76);

-- ───────────── Χρήστες ─────────────
-- i1 Ιδιοκτήτης · i2 Λογιστής (ανάγνωση) · i3 Πωλήσεις · i4 Διαχείριση (χωρίς «Καταχωρεί Τιμολόγια»)
-- k1 Χρήστης πελάτη Α με «Πλήρης» · k2 Χρήστης πελάτη Α χωρίς «Βλέπει Οικονομικά» · k3 Χρήστης πελάτη Β με «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'k1@client-a.example.gr'),
  ('00000000-0000-0000-0000-0000000000b2', 'k2@client-a.example.gr'),
  ('00000000-0000-0000-0000-0000000000b3', 'k3@client-b.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Ελένη', 'accountant@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Δημήτρης', 'admin@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a2', 'Λογιστής'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις'),
    ('00000000-0000-0000-0000-0000000000a4', 'Διαχείριση')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

-- Πελάτες Α, Β, Γ με ΑΦΜ φανταστικά.
insert into public.clients (id, name, afm, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', '123456789', 'Μαρία Παπαδάκη', 'a@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', '987654321', 'Νίκος Κίνης', 'b@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c3', 'Πελάτης Γ', '555555555', 'Ελένη Γεωργίου', 'c@example.com', '00000000-0000-0000-0000-0000000000a3');

-- Ρόλος πελάτη χωρίς «Βλέπει Οικονομικά».
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

-- Βοηθητικό των τεστ: «ανεβάζει» ένα PDF (γραμμή στο storage.objects) και επιστρέφει τη διαδρομή του.
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

-- Βοηθητικό των τεστ: καταχωρεί Τιμολόγιο με τυχαίο PDF και επιστρέφει το id.
create function public.t_reg(
  p_client uuid, p_kind text, p_number text, p_issue date, p_net numeric, p_vat numeric, p_total numeric,
  p_credit uuid default null
) returns uuid
language sql
as $$
  select (public.invoice_register(jsonb_build_object(
    'clientId', p_client, 'kind', p_kind, 'number', p_number, 'issueDate', p_issue,
    'net', p_net, 'vat', p_vat, 'total', p_total, 'creditFor', p_credit,
    'pdfPath', public.t_pdf()
  ))->>'id')::uuid;
$$;

-- ───────────── Άρνηση ανά ρόλο ─────────────
set local role anon;
select throws_ok($$ select public.invoices_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τα Τιμολόγια');
select throws_ok(
  $$ select public.invoice_pdf_path('00000000-0000-0000-0000-00000000dead') $$,
  '42501', null, 'Ο ανώνυμος δεν παίρνει PDF'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok($$ select public.invoices_view() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει τη λίστα Τιμολογίων της ομάδας');
select throws_ok(
  $$ select public.invoice_register('{}'::jsonb) $$,
  '42501', null, 'Ο Χρήστης πελάτη δεν καταχωρεί Τιμολόγια'
);
select throws_ok(
  $$ select public.invoice_draft_context(current_setting('t.a')::uuid) $$,
  '42501', null, 'Ο Χρήστης πελάτη δεν παίρνει υπόδειγμα καταχώρησης'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok($$ select public.invoices_view() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν τα Τιμολόγια');
select throws_ok(
  $$ select public.invoice_register('{}'::jsonb) $$,
  '42501', null, 'Οι Πωλήσεις δεν καταχωρούν Τιμολόγια'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select throws_ok(
  $$ select public.invoice_register('{}'::jsonb) $$,
  '42501', null, 'Η Διαχείριση δεν καταχωρεί Τιμολόγια'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok(
  $$ select public.invoice_register('{}'::jsonb) $$,
  '42501', null, 'Ο Λογιστής δεν καταχωρεί Τιμολόγια'
);
select throws_ok($$ select public.invoice_upload_slot() $$, '42501', null, 'Ο Λογιστής δεν παίρνει θέση για PDF');
select lives_ok($$ select public.invoices_view() $$, 'Ο Λογιστής διαβάζει τα Τιμολόγια');

set local role authenticated;
select throws_ok($$ select * from public.invoices $$, '42501', null, 'Ο κλειστός πίνακας των Τιμολογίων δεν διαβάζεται');
reset role;

-- ───────────── Θέση PDF και άκυρες διαδρομές ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select matches(
  public.invoice_upload_slot()->>'path', '^pending/[0-9a-f-]{36}\.pdf$',
  'Η θέση του PDF έχει τη μορφή pending/<uuid>.pdf'
);
select throws_ok(
  $$ select public.invoice_register(jsonb_build_object(
       'clientId', current_setting('t.a'), 'kind', 'invoice', 'number', 'X-1', 'issueDate', '2026-06-03',
       'net', 10, 'vat', 2.4, 'total', 12.4, 'pdfPath', 'other/not-pending.pdf')) $$,
  'P0001', null, 'Διαδρομή εκτός pending/ απορρίπτεται'
);
select throws_ok(
  $$ select public.invoice_register(jsonb_build_object(
       'clientId', current_setting('t.a'), 'kind', 'invoice', 'number', 'X-1', 'issueDate', '2026-06-03',
       'net', 10, 'vat', 2.4, 'total', 12.4, 'pdfPath', 'pending/../secret.pdf')) $$,
  'P0001', null, 'Διαδρομή με ../ απορρίπτεται'
);
select throws_ok(
  $$ select public.invoice_register(jsonb_build_object(
       'clientId', current_setting('t.a'), 'kind', 'invoice', 'number', 'X-1', 'issueDate', '2026-06-03',
       'net', 10, 'vat', 2.4, 'total', 12.4, 'pdfPath', 'pending/' || gen_random_uuid()::text || '.pdf')) $$,
  'P0001', null, 'Διαδρομή χωρίς ανεβασμένο PDF απορρίπτεται'
);

-- ───────────── Συμφωνία και Τιμολογητέα του Α ─────────────
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο Α',
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a3', 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3;
select set_config('t.agr', public.agreement_create('00000000-0000-0000-0000-0000000000d1', 'monthly', 'Μηνιαίο Α')::text, true);
set session_replication_role = replica;
update public.agreements set payment_days = 20 where id = current_setting('t.agr')::uuid;
update public.agreement_amounts set vat_rate = 13 where agreement_id = current_setting('t.agr')::uuid;
reset session_replication_role;
insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net) values
  ('00000000-0000-0000-0000-0000000000c1', current_setting('t.agr')::uuid, 'period', gen_random_uuid(), 'Περίοδος Ιούνιος', date '2026-06-01', 1300),
  ('00000000-0000-0000-0000-0000000000c1', current_setting('t.agr')::uuid, 'period', gen_random_uuid(), 'Περίοδος Ιούλιος', date '2026-07-01', 1000),
  ('00000000-0000-0000-0000-0000000000c1', current_setting('t.agr')::uuid, 'period', gen_random_uuid(), 'Περίοδος Αύγουστος', date '2026-08-01', 500);

select is(
  (public.invoice_draft_context(current_setting('t.a')::uuid)->>'paymentDays')::int, 20,
  'Οι μέρες πληρωμής προσυμπληρώνονται από τη Συμφωνία του παλαιότερου ανοιχτού Τιμολογητέου'
);
select is(
  (public.invoice_draft_context(current_setting('t.a')::uuid)->>'vatRate')::numeric, 13::numeric,
  'Ο αναμενόμενος ΦΠΑ είναι της Συμφωνίας, όχι σταθερός'
);
select is(
  (public.invoice_draft_context(current_setting('t.a')::uuid)->>'toInvoice')::numeric, 2800::numeric,
  'Το «Προς τιμολόγηση» του Πελάτη είναι το άθροισμα των ανοιχτών Τιμολογητέων'
);
select is(
  public.invoice_draft_context(current_setting('t.a')::uuid)->>'clientTaxId', '123456789',
  'Το υπόδειγμα δίνει το ΑΦΜ του Πελάτη'
);

-- ───────────── Τιμολόγιο 1: καλύπτει το παλαιότερο Τιμολογητέο ─────────────
select set_config('t.inv1', (public.invoice_register(jsonb_build_object(
  'clientId', current_setting('t.a'), 'kind', 'invoice', 'number', '87', 'issueDate', '2026-06-03',
  'net', 1300, 'vat', 312, 'total', 1612, 'pdfTaxId', '123456789',
  'pdfPath', public.t_pdf()))->>'id'), true);
select is(
  (select i.due_date from public.invoices i where i.id = current_setting('t.inv1')::uuid), date '2026-06-23',
  'Η λήξη = έκδοση + 20 μέρες πληρωμής της Συμφωνίας'
);
select is(
  (select (c->>'open')::numeric from jsonb_array_elements(public.billables_view()->'clients') c
    where c->>'clientId' = current_setting('t.a')), 1500::numeric,
  'Το καθαρό 1.300 € καλύπτει το παλαιότερο Τιμολογητέο: μένουν 1.500 € ανοιχτά'
);
select public.events_process();
select is(
  (select count(*)::int from public.email_outbox o join public.automations a on a.id::text = o.payload ->> 'automationId'
    where o.kind = 'automation' and a.event_type = 'invoice.registered' and o.payload -> 'details' ->> 'invoiceId' = current_setting('t.inv1'))::text || '/' || (select count(*) from public.email_outbox where kind = 'invoice_registered')::text,
  '1/0', 'Email μόνο στον Χρήστη πελάτη με «Βλέπει Οικονομικά» (όχι στον k2), μόνο από τον Αυτοματισμό'
);
select is(
  (select o.to_email from public.email_outbox o join public.automations a on a.id::text = o.payload ->> 'automationId'
    where o.kind = 'automation' and a.event_type = 'invoice.registered' and o.payload -> 'details' ->> 'invoiceId' = current_setting('t.inv1')),
  'k1@client-a.example.gr', 'Ο παραλήπτης είναι ο k1'
);
select is(
  (select (o.payload -> 'details' ->> 'number') || ' ' || (o.payload -> 'details' ->> 'pdfPath' like 'pending/%.pdf')::text from public.email_outbox o join public.automations a on a.id::text = o.payload ->> 'automationId'
    where o.kind = 'automation' and a.event_type = 'invoice.registered' and o.payload -> 'details' ->> 'invoiceId' = current_setting('t.inv1')),
  '87 true', 'Το μπλοκ του email έχει τον αριθμό του Τιμολογίου και το PDF'
);
select throws_ok(
  $$ select public.invoice_register(jsonb_build_object(
       'clientId', current_setting('t.a'), 'kind', 'invoice', 'number', '87-β', 'issueDate', '2026-06-03',
       'net', 1, 'vat', 0.24, 'total', 1.24,
       'pdfPath', (select i.pdf_path from public.invoices i where i.id = current_setting('t.inv1')::uuid))) $$,
  'P0001', null, 'Το ίδιο PDF δεν καταχωρείται δύο φορές'
);

-- ───────────── Τιμολόγιο 2: πέρα από τα Τιμολογητέα ─────────────
select set_config('t.inv2', public.t_reg(current_setting('t.a')::uuid, 'invoice', '88', date '2026-06-10', 1700, 408, 2108)::text, true);
select is(
  (select i.due_date from public.invoices i where i.id = current_setting('t.inv2')::uuid), date '2026-06-30',
  'Η λήξη του δεύτερου Τιμολογίου ακολουθεί την ίδια Συμφωνία'
);
select is(
  (select (c->>'beyond')::numeric from jsonb_array_elements(public.billables_view()->'clients') c
    where c->>'clientId' = current_setting('t.a')), 200::numeric,
  'Καθαρό 3.000 € έναντι Τιμολογητέων 2.800 €: τιμολογήθηκε 200 € πέρα'
);
select is(
  (select (c->>'count')::int from jsonb_array_elements(public.billables_view()->'clients') c
    where c->>'clientId' = current_setting('t.a')), 0,
  'Ο Πελάτης χωρίς ανοιχτά Τιμολογητέα φαίνεται μόνο για το «πέρα»'
);

-- ───────────── Είσπραξη πριν από Τιμολόγιο (Γ) και έλεγχος ΑΦΜ ─────────────
select public.receipt_register(current_setting('t.c')::uuid, date '2026-07-01', 500, current_setting('t.bank')::uuid, 'Προκαταβολή');
select throws_ok(
  $$ select public.invoice_register(jsonb_build_object(
       'clientId', current_setting('t.c'), 'kind', 'invoice', 'number', 'C-1', 'issueDate', '2026-07-10',
       'net', 400, 'vat', 0, 'total', 400, 'pdfTaxId', '111111111',
       'pdfPath', public.t_pdf())) $$,
  'P0001', null, 'Άλλο ΑΦΜ στο PDF χωρίς επιβεβαίωση δεν καταχωρείται'
);
select lives_ok(
  $$ select public.invoice_register(jsonb_build_object(
       'clientId', current_setting('t.c'), 'kind', 'invoice', 'number', 'C-1', 'issueDate', '2026-07-10',
       'net', 400, 'vat', 0, 'total', 400, 'pdfTaxId', '111111111', 'taxIdConfirmed', true,
       'pdfPath', public.t_pdf())) $$,
  'Με επιβεβαίωση το άλλο ΑΦΜ περνά'
);
select set_config('t.c1', (select i.id::text from public.invoices i where i.client_id = current_setting('t.c')::uuid and i.number = 'C-1'), true);
select is(
  (select s.status from authz.invoice_standings(current_setting('t.c')::uuid, date '2026-07-11') s
    where s.invoice_id = current_setting('t.c1')::uuid),
  'paid', 'Η Είσπραξη που μπήκε πριν από το Τιμολόγιο το εξοφλεί μόλις καταχωρηθεί'
);
select is(
  (select count(*)::int from authz.client_open_invoices(current_setting('t.c')::uuid)), 0,
  'Μετά την εξόφληση δεν μένει ανοιχτό Τιμολόγιο'
);

-- ───────────── Σενάριο 3: Εισπράξεις, ληξιπρόθεσμο και πιστωτικό (Β) ─────────────
select set_config('t.ba', public.t_reg(current_setting('t.b')::uuid, 'invoice', 'A-1', date '2026-05-02', 1100, 264, 1364)::text, true);
select set_config('t.bb', public.t_reg(current_setting('t.b')::uuid, 'invoice', 'B-1', date '2026-06-02', 1100, 264, 1364)::text, true);
select public.receipt_register(current_setting('t.b')::uuid, date '2026-06-10', 1364, current_setting('t.bank')::uuid, '');
select public.receipt_register(current_setting('t.b')::uuid, date '2026-06-20', 500, current_setting('t.bank')::uuid, 'Μερική');
select set_config('t.bc', public.t_reg(current_setting('t.b')::uuid, 'credit', 'P-1', date '2026-06-25', 100, 24, 124, current_setting('t.bb')::uuid)::text, true);

select is(
  (select i.due_date from public.invoices i where i.id = current_setting('t.ba')::uuid), date '2026-05-17',
  'Χωρίς Συμφωνία η λήξη παίρνει τις μέρες πληρωμής των Όρων (15)'
);
select is(
  (select i.due_date from public.invoices i where i.id = current_setting('t.bc')::uuid), null,
  'Το πιστωτικό δεν έχει λήξη'
);
select is(
  (select s.status from authz.invoice_standings(current_setting('t.b')::uuid, date '2026-06-16') s
    where s.invoice_id = current_setting('t.ba')::uuid),
  'paid', 'Η Είσπραξη 1.364 € εξοφλεί πρώτα το παλαιότερο (Α)'
);
select is(
  (select s.owed from authz.invoice_standings(current_setting('t.b')::uuid, date '2026-06-16') s
    where s.invoice_id = current_setting('t.bb')::uuid),
  1240::numeric, 'Το πιστωτικό 124 € μειώνει την οφειλή του Β σε 1.240 €'
);
select is(
  (select s.paid from authz.invoice_standings(current_setting('t.b')::uuid, date '2026-06-16') s
    where s.invoice_id = current_setting('t.bb')::uuid),
  500::numeric, 'Η μερική Είσπραξη 500 € πάει στο Β'
);
select is(
  (select s.remaining from authz.invoice_standings(current_setting('t.b')::uuid, date '2026-06-16') s
    where s.invoice_id = current_setting('t.bb')::uuid),
  740::numeric, 'Το υπόλοιπο του Β είναι 740 €'
);
select is(
  (select s.status from authz.invoice_standings(current_setting('t.b')::uuid, date '2026-06-16') s
    where s.invoice_id = current_setting('t.bb')::uuid),
  'partial', 'Πριν από τη λήξη, το Β με μερική Είσπραξη είναι μερικώς εξοφλημένο'
);
select is(
  (select s.status from authz.invoice_standings(current_setting('t.b')::uuid, date '2026-06-18') s
    where s.invoice_id = current_setting('t.bb')::uuid),
  'overdue', 'Μετά τη λήξη (17 Ιουνίου) το Β είναι ληξιπρόθεσμο'
);
select is(
  (select s.status from authz.invoice_standings(current_setting('t.b')::uuid, date '2026-06-18') s
    where s.invoice_id = current_setting('t.bc')::uuid),
  'credit', 'Το πιστωτικό έχει κατάσταση «πιστωτικό»'
);
select is(
  (select count(*)::int from authz.client_open_invoices(current_setting('t.b')::uuid)), 1,
  'Ανοιχτό μένει μόνο το Β'
);
select is(
  (select o.number from authz.client_open_invoices(current_setting('t.b')::uuid) o), 'B-1',
  'Το ανοιχτό Τιμολόγιο είναι το B-1'
);
select is(
  (public.receipt_preview(current_setting('t.b')::uuid, 1000)->'settles'->0->>'amount')::numeric, 740::numeric,
  'Η προεπισκόπηση Είσπραξης δείχνει ότι θα εξοφλήσει το υπόλοιπο 740 €'
);
select is(
  (public.receipt_preview(current_setting('t.b')::uuid, 1000)->>'surplus')::numeric, 260::numeric,
  'Ό,τι περισσεύει (260 €) είναι υπέρ του Πελάτη'
);

-- ───────────── Πιστωτικά: όρια και δέσιμο ─────────────
select throws_ok(
  format($$ select public.t_reg(%L::uuid, 'credit', 'P-2', date '2026-06-26', 1050, 250, 1300, %L::uuid) $$,
         current_setting('t.b'), current_setting('t.bb')),
  'P0001', null, 'Πιστωτικά πάνω από το σύνολο του Τιμολογίου (124 + 1.300 > 1.364) δεν καταχωρούνται'
);
select throws_ok(
  format($$ select public.t_reg(%L::uuid, 'credit', 'P-3', date '2026-06-26', 10, 2.4, 12.4, %L::uuid) $$,
         current_setting('t.b'), current_setting('t.inv1')),
  'P0001', null, 'Πιστωτικό δεν δένεται με Τιμολόγιο άλλου Πελάτη'
);
select throws_ok(
  format($$ select public.t_reg(%L::uuid, 'credit', 'P-4', date '2026-06-26', 10, 2.4, 12.4) $$, current_setting('t.b')),
  'P0001', null, 'Το πιστωτικό θέλει Τιμολόγιο που διορθώνει'
);
select throws_ok(
  format($$ select public.t_reg(%L::uuid, 'invoice', 'B-9', date '2026-06-26', 10, 2.4, 12.4, %L::uuid) $$,
         current_setting('t.b'), current_setting('t.bb')),
  'P0001', null, 'Μόνο το πιστωτικό δένεται με άλλο Τιμολόγιο'
);

-- ───────────── Γ: ένα ακόμα μέλλον και ένα σημερινό Τιμολόγιο ─────────────
select set_config('t.c2', public.t_reg(current_setting('t.c')::uuid, 'invoice', 'C-2', date '2099-01-01', 300, 0, 300)::text, true);
select public.t_reg(current_setting('t.c')::uuid, 'invoice', 'C-3', public.sales_today(), 50, 12, 62);
select is(
  (select s.remaining from authz.invoice_standings(current_setting('t.c')::uuid) s where s.invoice_id = current_setting('t.c2')::uuid),
  262::numeric, 'Οι 500 € καλύπτουν C-1 (400), C-3 (62) και 38 € του C-2: υπόλοιπο 262 €'
);
select is(
  (select s.status from authz.invoice_standings(current_setting('t.c')::uuid) s where s.invoice_id = current_setting('t.c2')::uuid),
  'partial', 'Το C-2 με λήξη το 2099 είναι μερικώς εξοφλημένο, ποτέ ληξιπρόθεσμο'
);

-- ───────────── Λίστα I2 ─────────────
select is(
  (public.invoices_view()->'totals'->>'unpaid')::numeric, 4722::numeric,
  'Ανεξόφλητα: 1.612 + 2.108 + 740 + 262'
);
select is((public.invoices_view()->'totals'->>'unpaidCount')::int, 4, 'Τέσσερα ανεξόφλητα Τιμολόγια');
select is(
  (public.invoices_view()->'totals'->>'overdue')::numeric, 4460::numeric,
  'Ληξιπρόθεσμα: 1.612 + 2.108 + 740'
);
select is((public.invoices_view()->'totals'->>'overdueCount')::int, 3, 'Τρία ληξιπρόθεσμα Τιμολόγια');
select is(
  (public.invoices_view()->'totals'->>'turnoverMonth')::numeric, 50::numeric,
  'Ο Τζίρος του μήνα είναι το καθαρό του Τιμολογίου που εκδόθηκε σήμερα'
);
select is((public.invoices_view()->'counts'->>'all')::int, 8, 'Οκτώ Τιμολόγια συνολικά');
select is(jsonb_array_length(public.invoices_view('credit')->'items'), 1, 'Το φίλτρο «πιστωτικά» δίνει ένα');
select is(
  public.invoices_view('credit')->'items'->0->>'creditForNumber', 'B-1',
  'Το πιστωτικό δείχνει ποιο Τιμολόγιο διορθώνει'
);
select is(jsonb_array_length(public.invoices_view('overdue')->'items'), 3, 'Το φίλτρο «ληξιπρόθεσμα» δίνει τρία');
select throws_ok($$ select public.invoices_view('άγνωστο') $$, 'P0001', null, 'Άγνωστο φίλτρο απορρίπτεται');

-- ───────────── Λήψη PDF ─────────────
select is(
  public.invoice_pdf_path(current_setting('t.inv1')::uuid),
  (select i.pdf_path from public.invoices i where i.id = current_setting('t.inv1')::uuid),
  'Η ομάδα με Οικονομικά και ποσά παίρνει τη διαδρομή του PDF'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is(
  public.invoice_pdf_path(current_setting('t.inv1')::uuid),
  (select i.pdf_path from public.invoices i where i.id = current_setting('t.inv1')::uuid),
  'Ο Λογιστής παίρνει τη διαδρομή του PDF'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is(
  public.invoice_pdf_path(current_setting('t.inv1')::uuid),
  (select i.pdf_path from public.invoices i where i.id = current_setting('t.inv1')::uuid),
  'Ο Χρήστης πελάτη με «Βλέπει Οικονομικά» παίρνει το PDF του δικού του Πελάτη'
);
select throws_ok(
  $$ select public.invoice_pdf_path('00000000-0000-0000-0000-00000000dead') $$,
  '42501', null, 'Για ανύπαρκτο Τιμολόγιο ο Χρήστης πελάτη παίρνει 42501 (χωρίς oracle ύπαρξης)'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}', true);
select throws_ok(
  $$ select public.invoice_pdf_path(current_setting('t.inv1')::uuid) $$,
  '42501', null, 'Ο πελάτης Β δεν παίρνει το PDF Τιμολογίου του Πελάτη Α'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select throws_ok(
  $$ select public.invoice_pdf_path(current_setting('t.inv1')::uuid) $$,
  '42501', null, 'Χρήστης πελάτη χωρίς «Βλέπει Οικονομικά» δεν παίρνει PDF'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok(
  $$ select public.invoice_pdf_path(current_setting('t.inv1')::uuid) $$,
  '42501', null, 'Οι Πωλήσεις δεν παίρνουν PDF'
);

-- ───────────── Ακυρωμένο: φεύγει από τα πάντα, ο πελάτης δεν το βλέπει ───────────── (η ροή ακύρωσης είναι στο Iε)
update public.invoices
   set voided_at = now(), voided_by = '00000000-0000-0000-0000-0000000000a1', void_reason = 'Διπλή καταχώριση'
 where id = current_setting('t.inv2')::uuid;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok(
  $$ select public.invoice_pdf_path(current_setting('t.inv2')::uuid) $$,
  '42501', null, 'Ο πελάτης δεν παίρνει PDF ακυρωμένου Τιμολογίου'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select isnt(
  public.invoice_pdf_path(current_setting('t.inv2')::uuid), null,
  'Η ομάδα βλέπει το PDF και του ακυρωμένου'
);
select is(
  (select count(*)::int from authz.invoice_standings(current_setting('t.a')::uuid)), 1,
  'Το ακυρωμένο φεύγει από τις καταστάσεις'
);
select is(
  (select (c->>'open')::numeric from jsonb_array_elements(public.billables_view()->'clients') c
    where c->>'clientId' = current_setting('t.a')), 1500::numeric,
  'Το ακυρωμένο δεν καλύπτει πια Τιμολογητέα: ξανανοίγουν'
);

-- ───────────── Ίχνος ─────────────
select is(
  (select count(*)::int from public.audit_log l
    where l.entity = 'invoices' and l.entity_id = current_setting('t.inv1') and l.action = 'insert'),
  1, 'Η καταχώρηση γράφεται στο Ίχνος'
);
select is(authz.audit_entity_allowed('invoices'), true, 'Ο Ιδιοκτήτης βλέπει Ίχνος Τιμολογίων');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is(authz.audit_entity_allowed('invoices'), false, 'Ο Χρήστης πελάτη (χωρίς ποσά ομάδας) δεν βλέπει Ίχνος Τιμολογίων');

select * from finish();
rollback;
