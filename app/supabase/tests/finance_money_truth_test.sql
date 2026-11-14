-- Οικονομικά «λένε την αλήθεια» (L3): ποσοστά παρακράτησης (άρνηση, κλειστός πίνακας, αλλαγή, απόσυρση), Είσπραξη
-- δεμένη σε Τιμολόγια, η παρακράτηση κλείνει Τιμολόγιο, η σελίδα Τιμολογίου με τις πληρωμές του, η υπενθύμιση
-- Τιμολογητέου μόνο όταν στάλθηκε, και η Καρτέλα των δικών τους Πελατών για τις Πωλήσεις.
-- Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή. Οι ημερομηνίες είναι σταθερές και η «σήμερα» δίνεται ρητά.
begin;
select plan(49);

-- ───────────── Χρήστες και Πελάτες ─────────────
-- a1 Ιδιοκτήτης · a3 Πωλήσεις. Ο Α ανήκει στις Πωλήσεις, οι Β, Γ, Δ στον Ιδιοκτήτη.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'sales@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Άννα', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000a3', 'Πωλήσεις')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

insert into public.clients (id, name, afm, contact_name, contact_email, manager_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'Πελάτης Α', '123456789', 'Μαρία Π', 'a@example.com', '00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000c2', 'Πελάτης Β', '987654321', 'Νίκος Κ', 'b@example.com', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000c3', 'Πελάτης Γ', '555555555', 'Ελένη Γ', 'c@example.com', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000c4', 'Πελάτης Δ', '444444444', 'Πέτρος Δ', 'd@example.com', '00000000-0000-0000-0000-0000000000a1');

select set_config('t.bank', (select m.id::text from public.payment_methods m where m.label = 'Τραπεζική κατάθεση'), true);
select set_config('t.r20', (select w.id::text from public.withholding_rates w where w.percent = 20), true);

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

create function public.t_reg(p_client uuid, p_number text, p_issue date, p_net numeric, p_vat numeric, p_total numeric,
                             p_due date default null) returns uuid
language sql
as $$
  select (public.invoice_register(jsonb_build_object(
    'clientId', p_client, 'kind', 'invoice', 'number', p_number, 'issueDate', p_issue, 'dueDate', p_due,
    'net', p_net, 'vat', p_vat, 'total', p_total, 'pdfPath', public.t_pdf()
  ))->>'id')::uuid;
$$;

create function public.t_status(p_invoice uuid) returns text
language sql security definer set search_path = ''
as $$
  select s.status from authz.invoice_standings(null, date '2026-06-15') s where s.invoice_id = p_invoice;
$$;

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.withholding_rates_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει ποσοστά παρακράτησης');
select throws_ok($$ select public.receipt_record('{}'::jsonb) $$, '42501', null, 'Ο ανώνυμος δεν καταχωρεί Είσπραξη');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select count(*) from public.withholding_rates $$, '42501', null, 'Ο πίνακας ποσοστών είναι κλειστός');
select throws_ok($$ select * from authz.receipt_applications(null) $$, '42501', null, 'Η κατανομή δεν καλείται απευθείας');
reset role;
select throws_ok($$ select public.withholding_rates_view() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν ποσοστά');
select throws_ok($$ select public.withholding_rate_save(null, 'Τεστ', 10) $$, '42501', null, 'Οι Πωλήσεις δεν αλλάζουν ποσοστά');
select throws_ok(
  $$ select public.receipt_record(jsonb_build_object('clientId', '00000000-0000-0000-0000-0000000000c1')) $$,
  '42501', null, 'Οι Πωλήσεις δεν καταχωρούν Είσπραξη'
);

-- ───────────── Ποσοστά ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(jsonb_array_length(public.withholding_rates_view()), 1, 'Αρχικά ένα ποσοστό (20%)');
select set_config('t.r3', public.withholding_rate_save(null, 'Παρακράτηση 3%', 3)::text, true);
select is(jsonb_array_length(public.withholding_rates_view()), 2, 'Νέο ποσοστό');
select throws_ok($$ select public.withholding_rate_save(null, 'παρακράτηση 3%', 4) $$, 'P0001', null, 'Όχι δύο ενεργά με ίδια ονομασία');
select throws_ok($$ select public.withholding_rate_save(null, 'Λάθος', 100) $$, 'P0001', null, 'Ποσοστό κάτω από 100');
select throws_ok($$ select public.withholding_rate_save(null, 'Λάθος', 1.234) $$, 'P0001', null, 'Έως 2 δεκαδικά');
select lives_ok(format($$ select public.withholding_rate_save(%L, 'Παρακράτηση 3%%', 4) $$, current_setting('t.r3')), 'Αλλάζει το ποσοστό');
select lives_ok(format($$ select public.withholding_rate_retire(%L) $$, current_setting('t.r3')), 'Αποσύρεται');
select is(
  (select (x ->> 'retired')::boolean from jsonb_array_elements(public.withholding_rates_view()) x where x ->> 'id' = current_setting('t.r3')),
  true, 'Φαίνεται ως αποσυρμένο'
);
select lives_ok(format($$ select public.withholding_rate_restore(%L) $$, current_setting('t.r3')), 'Επανέρχεται');
select is(
  (select count(*)::integer from public.audit_log a
    where a.entity = 'withholding_rates' and a.entity_id = current_setting('t.r3')),
  4, 'Κάθε αλλαγή ποσοστού μένει στο ίχνος'
);

-- ───────────── Είσπραξη: έλεγχοι ─────────────
select set_config('t.b1', public.t_reg('00000000-0000-0000-0000-0000000000c2', 'B-1', date '2026-06-01', 1000, 240, 1240, date '2026-06-30')::text, true);
select set_config('t.b2', public.t_reg('00000000-0000-0000-0000-0000000000c2', 'B-2', date '2026-06-05', 500, 120, 620, date '2026-07-05')::text, true);
select set_config('t.c1', public.t_reg('00000000-0000-0000-0000-0000000000c3', 'Γ-1', date '2026-06-01', 100, 0, 100, date '2026-06-30')::text, true);

select throws_ok(
  format($$ select public.receipt_record(jsonb_build_object('receivedOn', '2026-06-10', 'amount', 10, 'methodId', %L)) $$,
         current_setting('t.bank')),
  'P0001', 'Διάλεξε Πελάτη', 'Η Είσπραξη θέλει Πελάτη ρητά'
);
select throws_ok(
  format($$ select public.receipt_record(jsonb_build_object('clientId', '00000000-0000-0000-0000-0000000000c2',
           'receivedOn', '2026-06-10', 'amount', 10, 'methodId', %L, 'invoiceIds', jsonb_build_array(%L))) $$,
         current_setting('t.bank'), current_setting('t.c1')),
  'P0001', 'Ένα από τα Τιμολόγια δεν ανήκει στον Πελάτη ή έχει ακυρωθεί', 'Δεν δένεται με Τιμολόγιο άλλου Πελάτη'
);
select throws_ok(
  format($$ select public.receipt_record(jsonb_build_object('clientId', '00000000-0000-0000-0000-0000000000c2',
           'receivedOn', '2026-06-10', 'amount', 10, 'methodId', %L, 'withholdingId', %L)) $$,
         current_setting('t.bank'), current_setting('t.r20')),
  'P0001', 'Γράψε το ποσό της παρακράτησης', 'Ποσοστό χωρίς ποσό παρακράτησης δεν περνά'
);

-- ───────────── Δέσιμο: η Είσπραξη πάει στο Τιμολόγιο που δείχνει ─────────────
-- B-1 1.240 (1/6), B-2 620 (5/6). Είσπραξη 620 δεμένη στο B-2: εξοφλείται το B-2, όχι μερικώς το B-1.
select set_config('t.rb2', public.receipt_record(jsonb_build_object(
  'clientId', '00000000-0000-0000-0000-0000000000c2', 'receivedOn', '2026-06-10', 'amount', 620,
  'methodId', current_setting('t.bank'), 'note', '', 'invoiceIds', jsonb_build_array(current_setting('t.b2'))))::text, true);
select is(public.t_status(current_setting('t.b2')::uuid), 'paid', 'Το δεμένο Τιμολόγιο εξοφλήθηκε');
select is(public.t_status(current_setting('t.b1')::uuid), 'unpaid', 'Το παλαιότερο μένει απλήρωτο');

-- Παρακράτηση 20% στο καθαρό 1.000: ο Πελάτης στέλνει 1.040, κρατά 200 → το B-1 κλείνει.
select set_config('t.rb1', public.receipt_record(jsonb_build_object(
  'clientId', '00000000-0000-0000-0000-0000000000c2', 'receivedOn', '2026-06-12', 'amount', 1040,
  'methodId', current_setting('t.bank'), 'withheld', 200, 'withholdingId', current_setting('t.r20'),
  'invoiceIds', jsonb_build_array(current_setting('t.b1'))))::text, true);
select is(public.t_status(current_setting('t.b1')::uuid), 'paid', 'Η παρακράτηση κλείνει το Τιμολόγιο');
select is((public.client_ledger_view('00000000-0000-0000-0000-0000000000c2') ->> 'balance')::numeric, 0::numeric,
  'Η Καρτέλα μηδενίζει με την παρακράτηση');
select is(
  (select count(*)::integer from jsonb_array_elements(public.client_ledger_view('00000000-0000-0000-0000-0000000000c2') -> 'entries') e
    where e ->> 'kind' = 'withheld' and (e ->> 'credit')::numeric = 200),
  1, 'Η παρακράτηση είναι δική της κίνηση στην Καρτέλα'
);
select is(
  (select (x ->> 'balance')::numeric from jsonb_array_elements(public.clients_with_finance()) x
    where x ->> 'id' = '00000000-0000-0000-0000-0000000000c2'),
  0::numeric, 'Η λίστα Καρτελών αφαιρεί την παρακράτηση'
);
select is(
  (select x -> 'invoiceNumbers' from jsonb_array_elements(public.receipts_view('00000000-0000-0000-0000-0000000000c2')) x
    where x ->> 'id' = current_setting('t.rb1')),
  '["B-1"]'::jsonb, 'Η λίστα Εισπράξεων δείχνει τα δεμένα Τιμολόγια'
);
select is(
  (select (x ->> 'withheld')::numeric from jsonb_array_elements(public.receipts_view('00000000-0000-0000-0000-0000000000c2')) x
    where x ->> 'id' = current_setting('t.rb1')),
  200::numeric, 'Η λίστα Εισπράξεων δείχνει την παρακράτηση'
);

-- ───────────── Σελίδα Τιμολογίου ─────────────
select is(public.invoice_payments(current_setting('t.b1')::uuid, date '2026-06-15') ->> 'status', 'paid', 'Κατάσταση στη σελίδα');
select is((public.invoice_payments(current_setting('t.b1')::uuid, date '2026-06-15') ->> 'remaining')::numeric, 0::numeric, 'Υπόλοιπο 0');
select is(
  (public.invoice_payments(current_setting('t.b1')::uuid, date '2026-06-15') -> 'payments' -> 0 ->> 'applied')::numeric,
  1240::numeric, 'Η πληρωμή του με εξοφλητική αξία μετρητά + παρακράτηση'
);
select is(
  (public.invoice_payments(current_setting('t.b1')::uuid, date '2026-06-15') -> 'payments' -> 0 ->> 'linked')::boolean,
  true, 'Φαίνεται ότι η Είσπραξη δείχνει αυτό το Τιμολόγιο'
);

-- ───────────── Διόρθωση ─────────────
select throws_ok(
  format($$ select public.receipt_amend(jsonb_build_object('id', %L, 'reason', 'Τίποτα', 'receivedOn', '2026-06-12',
           'amount', 1040, 'methodId', %L, 'note', '', 'withheld', 200, 'withholdingId', %L, 'invoiceIds', jsonb_build_array(%L))) $$,
         current_setting('t.rb1'), current_setting('t.bank'), current_setting('t.r20'), current_setting('t.b1')),
  'P0001', 'Δεν άλλαξε τίποτα στην Είσπραξη', 'Διόρθωση χωρίς αλλαγή δεν περνά'
);
select lives_ok(
  format($$ select public.receipt_amend(jsonb_build_object('id', %L, 'reason', 'Δεν έγινε παρακράτηση', 'receivedOn', '2026-06-12',
           'amount', 1040, 'methodId', %L, 'note', '', 'withheld', 0, 'invoiceIds', jsonb_build_array(%L))) $$,
         current_setting('t.rb1'), current_setting('t.bank'), current_setting('t.b1')),
  'Η παρακράτηση αφαιρείται με αιτιολογία'
);
select is(public.t_status(current_setting('t.b1')::uuid), 'partial', 'Χωρίς παρακράτηση το B-1 μένει μερικώς πληρωμένο');
select is((public.invoice_payments(current_setting('t.b1')::uuid, date '2026-06-15') ->> 'remaining')::numeric, 200::numeric,
  'Λείπουν 200');

-- ───────────── Χωρίς δέσιμο: όπως πριν, παλαιότερο πρώτα· ό,τι περισσεύει από δέσιμο πάει κι αυτό στο παλαιότερο ─────────────
select set_config('t.c2', public.t_reg('00000000-0000-0000-0000-0000000000c3', 'Γ-2', date '2026-06-02', 100, 0, 100, date '2026-06-30')::text, true);
select public.receipt_record(jsonb_build_object(
  'clientId', '00000000-0000-0000-0000-0000000000c3', 'receivedOn', '2026-06-10', 'amount', 150, 'methodId', current_setting('t.bank')));
select is(public.t_status(current_setting('t.c1')::uuid), 'paid', 'Χωρίς δέσιμο: το παλαιότερο πρώτα');
select is(public.t_status(current_setting('t.c2')::uuid), 'partial', 'Χωρίς δέσιμο: το νεότερο μερικώς');

select set_config('t.d1', public.t_reg('00000000-0000-0000-0000-0000000000c4', 'Δ-1', date '2026-06-01', 100, 0, 100, date '2026-06-30')::text, true);
select set_config('t.d2', public.t_reg('00000000-0000-0000-0000-0000000000c4', 'Δ-2', date '2026-06-02', 100, 0, 100, date '2026-06-30')::text, true);
select public.receipt_record(jsonb_build_object(
  'clientId', '00000000-0000-0000-0000-0000000000c4', 'receivedOn', '2026-06-10', 'amount', 150, 'methodId', current_setting('t.bank'),
  'invoiceIds', jsonb_build_array(current_setting('t.d2'))));
select is(public.t_status(current_setting('t.d2')::uuid), 'paid', 'Δεμένο: εξοφλείται πρώτο');
select is(public.t_status(current_setting('t.d1')::uuid), 'partial', 'Το περίσσευμα πάει στο παλαιότερο');

-- ───────────── Υπενθύμιση Τιμολογητέου μόνο όταν στάλθηκε ─────────────
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο Α',
       (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'),
       '00000000-0000-0000-0000-0000000000a3', 'Πρόταση', (now() at time zone 'Europe/Athens')::date + 3;
select set_config('t.agr', public.agreement_create('00000000-0000-0000-0000-0000000000d1', 'monthly', 'Μηνιαίο Α')::text, true);
insert into public.billables (id, client_id, agreement_id, reason, source_id, label, billable_on, net) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', current_setting('t.agr')::uuid, 'period',
   gen_random_uuid(), 'Περίοδος Ιούνιος', date '2026-06-01', 1300);

select is(
  (select i -> 'lastReminderAt' from jsonb_array_elements(public.billables_view() -> 'clients') c,
          jsonb_array_elements(c -> 'items') i where i ->> 'id' = '00000000-0000-0000-0000-0000000000e1'),
  'null'::jsonb, 'Χωρίς αποστολή δεν φαίνεται υπενθύμιση'
);
insert into public.automations (id, event_type, channel, recipient_kind, recipient_user_ids, timing, wait_minutes, body_el) values
  ('00000000-0000-0000-0000-0000000000f1', 'billable.open_waiting', 'notification', 'users',
   array['00000000-0000-0000-0000-0000000000a1']::uuid[], 'wait', 43200, 'Τεστ');
insert into public.automation_sends (automation_id, case_key, recipient_key, channel, created_at) values
  ('00000000-0000-0000-0000-0000000000f1', 'billable.open_waiting:00000000-0000-0000-0000-0000000000e1:30',
   '00000000-0000-0000-0000-0000000000a1', 'notification', timestamptz '2026-07-01 09:00+03');
select is(
  (select (i ->> 'lastReminderAt')::timestamptz from jsonb_array_elements(public.billables_view() -> 'clients') c,
          jsonb_array_elements(c -> 'items') i where i ->> 'id' = '00000000-0000-0000-0000-0000000000e1'),
  timestamptz '2026-07-01 09:00+03', 'Μετά την αποστολή φαίνεται η πραγματική ημερομηνία'
);

-- Η σελίδα Τιμολογίου δείχνει τη Συμφωνία του Τιμολογητέου που κάλυψε.
select set_config('t.a1', public.t_reg('00000000-0000-0000-0000-0000000000c1', 'A-1', date '2026-06-03', 1300, 312, 1612, date '2026-06-30')::text, true);
select is(
  public.invoice_payments(current_setting('t.a1')::uuid, date '2026-06-15') -> 'agreements' -> 0 ->> 'id',
  current_setting('t.agr'), 'Η σελίδα Τιμολογίου δείχνει τη Συμφωνία του'
);
select throws_ok($$ select public.invoice_payments('00000000-0000-0000-0000-000000000999') $$, 'P0001', null, 'Άγνωστο Τιμολόγιο');

-- ───────────── Πωλήσεις: Καρτέλα μόνο των δικών τους Πελατών ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is((public.client_ledger_view('00000000-0000-0000-0000-0000000000c1') ->> 'balance')::numeric, 1612::numeric,
  'Οι Πωλήσεις βλέπουν την Καρτέλα Πελάτη τους');
select is(public.client_ledger_view('00000000-0000-0000-0000-0000000000c1') -> 'toInvoice', 'null'::jsonb,
  'Χωρίς «Προς τιμολόγηση» για τις Πωλήσεις');
select throws_ok($$ select public.client_ledger_view('00000000-0000-0000-0000-0000000000c2') $$, '42501', null,
  'Οι Πωλήσεις δεν βλέπουν Καρτέλα άλλου υπευθύνου');
select throws_ok($$ select public.client_ledger_view() $$, '42501', null, 'Οι Πωλήσεις διαλέγουν πάντα Πελάτη');
select throws_ok(format($$ select public.invoice_payments(%L) $$, current_setting('t.a1')), '42501', null,
  'Οι Πωλήσεις δεν ανοίγουν τη σελίδα Τιμολογίου');

select * from finish();
rollback;
