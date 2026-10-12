-- Διορθώσεις, ακύρωση και Ετοιμότητα Οικονομικών, Iε #154: άρνηση ανά ρόλο, διόρθωση ποσού με Ίχνος και χωρίς email,
-- πολλά μερικά πιστωτικά ως το σύνολο, ακύρωση (λόγος, πιστωτικά, Καρτέλα, κατανομή), ειδοποίηση ληξιπρόθεσμου χωρίς παραλήπτη και ακύρωσή της.
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή. Ημερομηνίες σταθερές (2026).
begin;
select plan(57);

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
  ('00000000-0000-0000-0000-0000000000b3', 'k3@client-b.example.gr'),
  ('00000000-0000-0000-0000-0000000000a5', 'viewer@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a5', 'Θέμης', 'viewer@example.com'),
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

-- Ρόλος ομάδας με Οικονομικά και ποσά, χωρίς «Βλέπει Ίχνος» (a5).
insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Οικονομικά χωρίς Ίχνος (τεστ)', 'Τεστ: βλέπει ποσά, όχι Ίχνος.', 'team', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, p.permission, 'all'
  from public.roles r, (values ('finance.view'), ('finance.amounts')) as p (permission)
 where r.name = 'Οικονομικά χωρίς Ίχνος (τεστ)';
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000a5'::uuid, r.id from public.roles r where r.name = 'Οικονομικά χωρίς Ίχνος (τεστ)';

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


-- Βοηθητικό των τεστ: καταχωρεί Τιμολόγιο με τυχαίο PDF και ρητή λήξη.
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

-- Βοηθητικά: πληρωμένο και υπόλοιπο ενός Τιμολογίου από την κατανομή (σταθερή ημερομηνία).
create function public.t_rem(p_id uuid) returns numeric
language sql security definer set search_path = ''
as $$ select s.remaining from authz.invoice_standings(null, date '2026-06-18') s where s.invoice_id = p_id $$;
create function public.t_paid(p_id uuid) returns numeric
language sql security definer set search_path = ''
as $$ select s.paid from authz.invoice_standings(null, date '2026-06-18') s where s.invoice_id = p_id $$;
grant execute on function public.t_rem(uuid), public.t_paid(uuid) to authenticated;

-- Δεδομένα: A-1 (1240), A-2 (620) και Είσπραξη 1000 στον Α.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('t.i1', public.t_reg(current_setting('t.a')::uuid, 'invoice', 'A-1', date '2026-03-01', 1000, 240, 1240, null, date '2026-03-16')::text, true);
select set_config('t.i2', public.t_reg(current_setting('t.a')::uuid, 'invoice', 'A-2', date '2026-04-01', 500, 120, 620, null, date '2026-04-16')::text, true);
select public.receipt_register(current_setting('t.a')::uuid, date '2026-04-05', 1000, current_setting('t.bank')::uuid, '');
select set_config('t.mails', (select count(*)::text from public.email_outbox), true);

-- ───────────── Άρνηση ανά ρόλο ─────────────
set local role anon;
select throws_ok($$ select public.invoice_correct(current_setting('t.i1')::uuid, '{"number":"X"}'::jsonb, null) $$, '42501', null, 'Ο ανώνυμος δεν διορθώνει');
select throws_ok($$ select public.invoice_void(current_setting('t.i1')::uuid, 'λόγος') $$, '42501', null, 'Ο ανώνυμος δεν ακυρώνει');
select throws_ok($$ select public.invoice_detail(current_setting('t.i1')::uuid) $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τη σελίδα καταχώρισης');
select throws_ok($$ select public.invoices_voided_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τις ακυρωμένες');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok($$ select public.invoice_detail(current_setting('t.i1')::uuid) $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει τη σελίδα καταχώρισης');
select throws_ok($$ select public.invoices_voided_view() $$, '42501', null, 'Ο Χρήστης πελάτη δεν βλέπει τις ακυρωμένες');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok($$ select public.invoice_detail(current_setting('t.i1')::uuid) $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν τη σελίδα καταχώρισης');
select throws_ok($$ select public.invoices_voided_view() $$, '42501', null, 'Οι Πωλήσεις δεν βλέπουν τις ακυρωμένες');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a4","role":"authenticated"}', true);
select throws_ok($$ select public.invoice_correct(current_setting('t.i1')::uuid, '{"number":"X"}'::jsonb, null) $$, '42501', null, 'Η Διαχείριση δεν διορθώνει');
select throws_ok($$ select public.invoice_void(current_setting('t.i1')::uuid, 'λόγος') $$, '42501', null, 'Η Διαχείριση δεν ακυρώνει');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok($$ select public.invoice_correct(current_setting('t.i1')::uuid, '{"number":"X"}'::jsonb, null) $$, '42501', null, 'Ο Λογιστής δεν διορθώνει');
select throws_ok($$ select public.invoice_void(current_setting('t.i1')::uuid, 'λόγος') $$, '42501', null, 'Ο Λογιστής δεν ακυρώνει');
select is(
  public.invoice_detail(current_setting('t.i1')::uuid)->'can'->>'correct', 'false',
  'Ο Λογιστής διαβάζει τη σελίδα αλλά δεν έχει ενέργειες'
);
select is(public.invoices_voided_view(), '[]'::jsonb, 'Καμία ακυρωμένη ακόμα');

-- ───────────── Διόρθωση ποσού ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(public.t_rem(current_setting('t.i1')::uuid), 240::numeric, 'A-1: υπόλοιπο 240 πριν τη διόρθωση');
select lives_ok(
  $$ select public.invoice_correct(current_setting('t.i1')::uuid,
       '{"net":800,"vat":192,"total":992}'::jsonb, 'λάθος ποσό') $$,
  'Ο Ιδιοκτήτης διορθώνει το ποσό'
);
select is(public.t_rem(current_setting('t.i1')::uuid), 0::numeric, 'A-1: το υπόλοιπο αλλάζει με το νέο σύνολο');
select is(public.t_rem(current_setting('t.i2')::uuid), 612::numeric, 'Η Είσπραξη που περισσεύει πάει στο επόμενο Τιμολόγιο');
select is((select count(*)::text from public.email_outbox), current_setting('t.mails'), 'Η διόρθωση δεν στέλνει email');
select is(jsonb_array_length(public.invoice_detail(current_setting('t.i1')::uuid)->'trail'), 2, 'Ίχνος: καταχώριση και διόρθωση');
select is(public.invoice_detail(current_setting('t.i1')::uuid)->'trail'->1->>'action', 'corrected', 'Η δεύτερη γραμμή είναι η διόρθωση');
select is(public.invoice_detail(current_setting('t.i1')::uuid)->'trail'->1->>'reason', 'λάθος ποσό', 'Το Ίχνος κρατά τον λόγο');
select is(jsonb_array_length(public.invoice_detail(current_setting('t.i1')::uuid)->'trail'->1->'changes'), 3, 'Ίχνος: καθαρό, ΦΠΑ και σύνολο παλιό → νέο');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}', true);
select is(jsonb_array_length(public.invoice_detail(current_setting('t.i1')::uuid)->'trail'), 0, 'Χωρίς «Βλέπει Ίχνος» το Ίχνος είναι κενό');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(public.invoice_detail(current_setting('t.i1')::uuid)->'trail'->0->>'byName', 'Γιώργος', 'Ίχνος: ποιος καταχώρισε');
select throws_ok(
  $$ select public.invoice_correct(current_setting('t.i1')::uuid, '{"total":992}'::jsonb, null) $$,
  'P0001', 'Δεν άλλαξε τίποτα στην καταχώριση', 'Διόρθωση χωρίς αλλαγή → P0001'
);
select throws_ok(
  $$ select public.invoice_correct(current_setting('t.i1')::uuid, '{"dueDate":"2026-02-01"}'::jsonb, null) $$,
  'P0001', null, 'Η λήξη δεν είναι πριν από την έκδοση'
);
select lives_ok(
  $$ select public.invoice_correct(current_setting('t.i1')::uuid, '{"dueDate":"2026-03-20","mark":"400123"}'::jsonb, null) $$,
  'Διόρθωση λήξης και ΜΑΡΚ χωρίς λόγο'
);

-- ───────────── Πιστωτικά ως το σύνολο ─────────────
select set_config('t.cr1', public.t_reg(current_setting('t.a')::uuid, 'credit', 'CR-1', date '2026-04-10', 161.29, 38.71, 200, current_setting('t.i2')::uuid)::text, true);
select set_config('t.cr2', public.t_reg(current_setting('t.a')::uuid, 'credit', 'CR-2', date '2026-04-11', 338.71, 81.29, 420, current_setting('t.i2')::uuid)::text, true);
select throws_ok(
  $$ select public.t_reg(current_setting('t.a')::uuid, 'credit', 'CR-3', date '2026-04-12', 0.81, 0.19, 1, current_setting('t.i2')::uuid) $$,
  'P0001', null, 'Τα μερικά πιστωτικά φτάνουν ως το σύνολο και όχι πέρα'
);
select throws_ok(
  $$ select public.invoice_correct(current_setting('t.cr2')::uuid, '{"total":500}'::jsonb, null) $$,
  'P0001', null, 'Η διόρθωση πιστωτικού τηρεί το όριο του αθροίσματος'
);
select throws_ok(
  $$ select public.invoice_correct(current_setting('t.i2')::uuid, '{"total":500}'::jsonb, null) $$,
  'P0001', null, 'Το σύνολο του Τιμολογίου δεν πέφτει κάτω από τα πιστωτικά του'
);
select throws_ok(
  $$ select public.invoice_correct(current_setting('t.cr1')::uuid, '{"dueDate":"2026-05-01"}'::jsonb, null) $$,
  'P0001', null, 'Το πιστωτικό δεν παίρνει λήξη'
);

-- ───────────── Ακύρωση ─────────────
select throws_ok(
  $$ select public.invoice_void(current_setting('t.i2')::uuid, '  ') $$,
  'P0001', null, 'Ακύρωση χωρίς λόγο → P0001'
);
select throws_ok(
  $$ select public.invoice_void(current_setting('t.i2')::uuid, 'διπλή καταχώριση') $$,
  'P0001', 'Ακύρωσε πρώτα τα πιστωτικά του', 'Τιμολόγιο με πιστωτικά δεν ακυρώνεται'
);
select lives_ok($$ select public.invoice_void(current_setting('t.cr1')::uuid, 'λάθος πιστωτικό') $$, 'Ακύρωση πιστωτικού 1');
select lives_ok($$ select public.invoice_void(current_setting('t.cr2')::uuid, 'λάθος πιστωτικό') $$, 'Ακύρωση πιστωτικού 2');
select set_config('t.i3', public.t_reg(current_setting('t.a')::uuid, 'invoice', 'A-3', date '2026-05-01', 300, 72, 372, null, date '2026-05-16')::text, true);
select set_config('t.mails', (select count(*)::text from public.email_outbox), true);
select lives_ok($$ select public.invoice_void(current_setting('t.i2')::uuid, 'διπλή καταχώριση') $$, 'Ακύρωση του A-2 μετά τα πιστωτικά');
select is((select count(*)::text from public.email_outbox), current_setting('t.mails'), 'Η ακύρωση δεν στέλνει email');
select is(
  (select count(*)::int from public.email_outbox o
    where o.status = 'pending' and o.payload ->> 'invoiceId' = current_setting('t.i2')),
  0, 'Η ακύρωση σταματά τα email του Τιμολογίου που περίμεναν στην ουρά'
);
select is(
  (select count(*)::int from jsonb_array_elements(public.invoices_view('all')->'items') x where x->>'id' = current_setting('t.i2')),
  0, 'Το ακυρωμένο φεύγει από τη λίστα Τιμολογίων'
);
select is(
  (select count(*)::int from jsonb_array_elements(public.client_ledger_view(current_setting('t.a')::uuid)->'entries') x
    where x->>'label' like '%A-2' or x->>'label' like '%CR-%'),
  0, 'Το ακυρωμένο και τα πιστωτικά του φεύγουν από την Καρτέλα'
);
select is(public.t_paid(current_setting('t.i3')::uuid), 8::numeric, 'Η Είσπραξη που περίσσευε πάει στο επόμενο Τιμολόγιο (A-3)');
select is(
  (public.client_ledger_view(current_setting('t.a')::uuid)->>'balance')::numeric,
  (select sum(s.remaining) from authz.invoice_standings(current_setting('t.a')::uuid, date '2026-06-18') s),
  'Η Καρτέλα και η κατανομή συμφωνούν'
);
select is(jsonb_array_length(public.invoices_voided_view()), 3, 'Ακυρωμένες καταχωρίσεις: A-2 και τα δύο πιστωτικά');
select is(
  (select x->>'reason' from jsonb_array_elements(public.invoices_voided_view()) x where x->>'id' = current_setting('t.i2')),
  'διπλή καταχώριση', 'Η λίστα ακυρωμένων έχει τον λόγο'
);
select is(public.invoice_detail(current_setting('t.i2')::uuid)->'voided'->>'by', 'Γιώργος', 'Η σελίδα δείχνει ποιος ακύρωσε');
select is(public.invoice_detail(current_setting('t.i2')::uuid)->'can'->>'void', 'false', 'Το ακυρωμένο δεν έχει ενέργειες');
select throws_ok($$ select public.invoice_correct(current_setting('t.i2')::uuid, '{"number":"X"}'::jsonb, null) $$, 'P0001', null, 'Το ακυρωμένο δεν διορθώνεται');
select throws_ok($$ select public.invoice_void(current_setting('t.i2')::uuid, 'ξανά') $$, 'P0001', null, 'Το ακυρωμένο δεν ακυρώνεται ξανά');
select throws_ok($$ select public.invoice_detail('00000000-0000-0000-0000-00000000dead') $$, 'P0001', null, 'Άγνωστο Τιμολόγιο → P0001');

-- ───────────── Ειδοποίηση ληξιπρόθεσμου χωρίς παραλήπτη και ακύρωση (Αυτοματισμός «με ημερομηνία», Kγ #172) ─────────────
create function public.t_c1_mails() returns setof public.email_outbox
language sql
as $$
  select o.* from public.email_outbox o join public.automation_sends s on s.email_outbox_id = o.id
   where s.case_key like 'invoice.overdue:' || current_setting('t.c1') || ':%';
$$;
select set_config('t.c1', public.t_reg(current_setting('t.c')::uuid, 'invoice', 'C-1', date '2026-06-02', 100, 24, 124, null, date '2026-06-17')::text, true);
select public.automations_scan('2026-06-18 06:00:00+00');
select is((select count(*)::int from public.t_c1_mails()), 0, 'Χωρίς παραλήπτη δεν φεύγει τίποτα');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b4', 'k4@client-c.example.gr');
insert into public.client_users (client_id, user_id, name, role_id, is_current)
select current_setting('t.c')::uuid, '00000000-0000-0000-0000-0000000000b4', 'Ρένα', r.id, true
  from public.roles r where r.name = 'Πλήρης' and r.kind = 'client';
select public.automations_scan('2026-06-25 07:00:00+00');
select is((select count(*)::int from public.t_c1_mails()), 1, 'Χρήστης με «Βλέπει Οικονομικά» που μπαίνει μια εβδομάδα αργότερα παίρνει την ειδοποίηση');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.invoice_void(current_setting('t.c1')::uuid, 'λάθος Πελάτης');
select is((select status from public.t_c1_mails()), 'cancelled', 'Η ακύρωση του Τιμολογίου ακυρώνει το email που περιμένει');
select public.automations_scan('2026-06-25 08:00:00+00');
select is((select count(*)::int from public.t_c1_mails()), 1, 'Ακυρωμένο Τιμολόγιο: τίποτα νέο');

-- ───────────── Ετοιμότητα ─────────────
select is((select done from authz.readiness_items() where item = 'payment_methods'), true, 'Με ενεργό τρόπο είσπραξης η γραμμή είναι έτοιμη');
update public.payment_methods set retired_at = now() where retired_at is null;
select is((select done from authz.readiness_items() where item = 'payment_methods'), false, 'Χωρίς ενεργό τρόπο η γραμμή εκκρεμεί');
select is((select count(*)::int from authz.readiness_items()), 12, 'Ο Έλεγχος ετοιμότητας έχει 12 γραμμές');

select * from finish();
rollback;
