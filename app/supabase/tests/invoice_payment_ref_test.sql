-- Κωδικός πληρωμής (RF) ανά Τιμολόγιο: άρνηση ανά ρόλο, γράψιμο με κόψιμο κενών, όριο 35, καθάρισμα, Ίχνος,
-- ακυρωμένο δεν αλλάζει, φαίνεται στην ομάδα (invoice_detail) και στον Χρήστη πελάτη (client_invoices_view).
-- Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(17);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a5 βλέπει Οικονομικά και ποσά, δεν καταχωρεί Τιμολόγια · b1 Χρήστης πελάτη Α «Πλήρης»
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-4000-8000-0000000000a3', 'sales@example.com'),
  ('00000000-0000-4000-8000-0000000000a5', 'viewer@example.com'),
  ('00000000-0000-4000-8000-0000000000b1', 'k1@client-a.example.gr');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-4000-8000-0000000000a3', 'Άννα', 'sales@example.com'),
  ('00000000-0000-4000-8000-0000000000a5', 'Θέμης', 'viewer@example.com');
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-4000-8000-0000000000a1'::uuid, r.id from public.roles r where r.name = 'Ιδιοκτήτης' and r.kind = 'team';
insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Οικονομικά μόνο ανάγνωση (τεστ RF)', 'Τεστ: βλέπει ποσά, δεν καταχωρεί Τιμολόγια.', 'team', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, p.permission, 'all'
  from public.roles r, (values ('finance.view'), ('finance.amounts')) as p (permission)
 where r.name = 'Οικονομικά μόνο ανάγνωση (τεστ RF)';
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-4000-8000-0000000000a5'::uuid, r.id from public.roles r where r.name = 'Οικονομικά μόνο ανάγνωση (τεστ RF)';

insert into public.clients (id, name, afm, contact_name, contact_email, manager_id) values
  ('00000000-0000-4000-8000-0000000000c1', 'Πελάτης Α', '123456789', 'Μαρία Παπαδάκη', 'a@example.com', '00000000-0000-4000-8000-0000000000a1');
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 'Κώστας',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true);

-- Βοηθητικά των τεστ (ως postgres): «ανεβάζει» PDF, καταχωρεί Τιμολόγιο, αλλάζει Χρήστη.
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

create function public.t_reg(p_number text) returns uuid
language sql
as $$
  select (public.invoice_register(jsonb_build_object(
    'clientId', '00000000-0000-4000-8000-0000000000c1', 'kind', 'invoice', 'number', p_number,
    'issueDate', date '2026-03-01', 'dueDate', date '2026-03-16',
    'net', 1000, 'vat', 240, 'total', 1240, 'pdfPath', public.t_pdf()
  ))->>'id')::uuid;
$$;

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-4000-8000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

select public.t_as('a1');
select set_config('t.i1', public.t_reg('RF-1')::text, true);
select set_config('t.i2', public.t_reg('RF-2')::text, true);

-- ───────────── Άρνηση ανά ρόλο ─────────────
set local role anon;
select throws_ok($$ select public.invoice_payment_ref_set(current_setting('t.i1')::uuid, 'RF18000000000000000000001') $$,
                 '42501', null, 'Ο ανώνυμος δεν γράφει κωδικό πληρωμής');
reset role;

select public.t_as('b1');
select throws_ok($$ select public.invoice_payment_ref_set(current_setting('t.i1')::uuid, 'RF18000000000000000000001') $$,
                 '42501', null, 'Ο Χρήστης πελάτη δεν γράφει κωδικό πληρωμής');

select public.t_as('a5');
select throws_ok($$ select public.invoice_payment_ref_set(current_setting('t.i1')::uuid, 'RF18000000000000000000001') $$,
                 '42501', null, 'Όποιος δεν καταχωρεί Τιμολόγια δεν γράφει κωδικό πληρωμής');
select throws_ok($$ select public.invoice_payment_ref_set('00000000-0000-4000-8000-0000000000ff'::uuid, 'X') $$,
                 '42501', null, 'Η άρνηση έρχεται πριν από τον έλεγχο ύπαρξης');

-- ───────────── Γράψιμο ─────────────
select public.t_as('a1');
select is(public.invoice_detail(current_setting('t.i1')::uuid) -> 'paymentRef', 'null'::jsonb, 'Χωρίς κωδικό στην αρχή');
select lives_ok($$ select public.invoice_payment_ref_set(current_setting('t.i1')::uuid, '  RF18 0000 0000 0001  ') $$,
                'Ο Ιδιοκτήτης γράφει κωδικό πληρωμής');
select is(public.invoice_detail(current_setting('t.i1')::uuid) ->> 'paymentRef', 'RF18 0000 0000 0001',
          'Ο κωδικός αποθηκεύεται χωρίς κενά στις άκρες');
select is(public.invoice_detail(current_setting('t.i1')::uuid) -> 'trail' -> 1 -> 'changes',
          '[{"field":"paymentRef","from":null,"to":"RF18 0000 0000 0001"}]'::jsonb,
          'Το Ίχνος γράφει παλιό → νέο');
select is(public.invoice_detail(current_setting('t.i1')::uuid) -> 'trail' -> 1 ->> 'action', 'corrected',
          'Η γραμμή του Ίχνους είναι διόρθωση');
select throws_like($$ select public.invoice_payment_ref_set(current_setting('t.i1')::uuid, 'RF18 0000 0000 0001') $$,
                   'Δεν άλλαξε τίποτα%', 'Ίδια τιμή: δεν άλλαξε τίποτα');
select throws_like($$ select public.invoice_payment_ref_set(current_setting('t.i1')::uuid, repeat('9', 36)) $$,
                   '%έως 35 χαρακτήρες%', 'Πάνω από 35 χαρακτήρες: όχι');

-- ───────────── Ο Χρήστης πελάτη το βλέπει ─────────────
select public.t_as('b1');
select is((select x ->> 'paymentRef' from jsonb_array_elements(public.client_invoices_view() -> 'items') x
            where x ->> 'id' = current_setting('t.i1')),
          'RF18 0000 0000 0001', 'Ο Χρήστης πελάτη βλέπει τον κωδικό πληρωμής του Τιμολογίου του');
select is((select x -> 'paymentRef' from jsonb_array_elements(public.client_invoices_view() -> 'items') x
            where x ->> 'id' = current_setting('t.i2')),
          'null'::jsonb, 'Χωρίς κωδικό: null');

-- ───────────── Καθάρισμα και ακυρωμένο ─────────────
select public.t_as('a1');
select lives_ok($$ select public.invoice_payment_ref_set(current_setting('t.i1')::uuid, '   ') $$,
                'Κενό καθαρίζει τον κωδικό');
select is(public.invoice_detail(current_setting('t.i1')::uuid) -> 'paymentRef', 'null'::jsonb, 'Κενό = null');
select lives_ok($$ select public.invoice_void(current_setting('t.i2')::uuid, 'τεστ') $$, 'Ακύρωση του RF-2');
select throws_like($$ select public.invoice_payment_ref_set(current_setting('t.i2')::uuid, 'RF1') $$,
                   '%ακυρωμένη%', 'Ακυρωμένη καταχώριση: ο κωδικός δεν αλλάζει');

select * from finish();
rollback;
