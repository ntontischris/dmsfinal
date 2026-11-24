-- «Πώς πληρώνω» (Τ3): public.payment_info δίνει τον προεπιλεγμένο λογαριασμό τραπέζης και την επικοινωνία της εταιρείας
-- στην ομάδα και στον Χρήστη πελάτη με «Βλέπει Οικονομικά». Αρνήσεις: ανώνυμος, Χρήστης πελάτη χωρίς Οικονομικά,
-- χρήστης χωρίς ομάδα ή Πελάτη. Χωρίς λογαριασμό: bank = null. Φανταστικά δεδομένα· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(9);

-- t1 Ιδιοκτήτης · k1 Χρήστης πελάτη με «Πλήρης» · k2 Χρήστης πελάτη χωρίς «Βλέπει Οικονομικά» · x1 χωρίς τίποτα
insert into auth.users (id, email) values
  ('f0ab2405-79ce-40bc-914f-34820c1bd433', 'owner@example.com'),
  ('f89bca49-3c6f-4358-9745-08828aa6514f', 'k1@client.example.gr'),
  ('34f328e0-13c2-4c55-a6c7-e312cb64d5e6', 'k2@client.example.gr'),
  ('9889abd5-9e5c-4de4-81f3-d39842e159a0', 'nobody@example.com');
insert into public.team_users (user_id, name, email) values
  ('f0ab2405-79ce-40bc-914f-34820c1bd433', 'Γιώργος', 'owner@example.com');
insert into public.team_user_roles (user_id, role_id)
select 'f0ab2405-79ce-40bc-914f-34820c1bd433'::uuid, r.id
  from public.roles r where r.name = 'Ιδιοκτήτης' and r.kind = 'team';

insert into public.clients (id, name, afm, contact_name, contact_email, manager_id) values
  ('1f7cc163-d12b-4832-9e32-237066233971', 'Πελάτης Α', '123456789', 'Μαρία Παπαδάκη', 'a@example.com',
   'f0ab2405-79ce-40bc-914f-34820c1bd433');

insert into public.roles (name, description, kind, is_owner, is_builtin) values
  ('Χωρίς Οικονομικά (τεστ)', 'Τεστ: Χρήστης πελάτη χωρίς Οικονομικά.', 'client', false, false);
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'c.productions', 'all' from public.roles r where r.name = 'Χωρίς Οικονομικά (τεστ)';
insert into public.client_users (client_id, user_id, name, role_id, is_current) values
  ('1f7cc163-d12b-4832-9e32-237066233971', 'f89bca49-3c6f-4358-9745-08828aa6514f', 'Κώστας',
   (select r.id from public.roles r where r.name = 'Πλήρης' and r.kind = 'client'), true),
  ('1f7cc163-d12b-4832-9e32-237066233971', '34f328e0-13c2-4c55-a6c7-e312cb64d5e6', 'Λία',
   (select r.id from public.roles r where r.name = 'Χωρίς Οικονομικά (τεστ)' and r.kind = 'client'), true);

update public.company_settings
   set trade_name = 'Εταιρεία Δοκιμής', phone = '2100000000', email = 'info@example.com'
 where id;

-- ───────────── Αρνήσεις ─────────────
set local role anon;
select throws_ok($$ select public.payment_info() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει οδηγίες πληρωμής');
reset role;

select set_config('request.jwt.claims', '{"sub":"34f328e0-13c2-4c55-a6c7-e312cb64d5e6","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.payment_info() $$, '42501', null, 'Χρήστης πελάτη χωρίς «Βλέπει Οικονομικά» δεν βλέπει οδηγίες πληρωμής');
reset role;

select set_config('request.jwt.claims', '{"sub":"9889abd5-9e5c-4de4-81f3-d39842e159a0","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.payment_info() $$, '42501', null, 'Χρήστης χωρίς ομάδα ή Πελάτη δεν βλέπει οδηγίες πληρωμής');
reset role;

-- ───────────── Χωρίς λογαριασμό τραπέζης ─────────────
select set_config('request.jwt.claims', '{"sub":"f89bca49-3c6f-4358-9745-08828aa6514f","role":"authenticated"}', true);
set local role authenticated;
select is(jsonb_typeof(public.payment_info()->'bank'), 'null', 'Χωρίς λογαριασμό ο πελάτης παίρνει bank = null');
select is(
  public.payment_info()->'company',
  '{"name": "Εταιρεία Δοκιμής", "phone": "2100000000", "email": "info@example.com"}'::jsonb,
  'Ο πελάτης βλέπει πώς επικοινωνεί με την εταιρεία'
);
reset role;

-- ───────────── Με λογαριασμό τραπέζης ─────────────
insert into public.bank_accounts (bank_name, holder, iban, is_default, retired_at) values
  ('Παλιά Τράπεζα', 'Εταιρεία Δοκιμής', 'GR9601101250000000012300696', false, now());
insert into public.bank_accounts (bank_name, holder, iban, is_default) values
  ('Τράπεζα Δοκιμής', 'Εταιρεία Δοκιμής', 'GR1601101250000000012300695', true);

set local role authenticated;
select is(
  public.payment_info()->'bank',
  '{"holder": "Εταιρεία Δοκιμής", "bank": "Τράπεζα Δοκιμής", "iban": "GR1601101250000000012300695"}'::jsonb,
  'Ο πελάτης βλέπει τον προεπιλεγμένο λογαριασμό'
);
select ok(not (public.payment_info()->'company' ? 'taxId'), 'Ο πελάτης δεν παίρνει ΑΦΜ ή άλλα στοιχεία της εταιρείας');
reset role;

select set_config('request.jwt.claims', '{"sub":"f0ab2405-79ce-40bc-914f-34820c1bd433","role":"authenticated"}', true);
set local role authenticated;
select is(public.payment_info()->'bank'->>'iban', 'GR1601101250000000012300695', 'Η ομάδα βλέπει τον ίδιο λογαριασμό');
select is(public.payment_info()->'company'->>'name', 'Εταιρεία Δοκιμής', 'Η ομάδα βλέπει το όνομα της εταιρείας');
reset role;

select * from finish();
rollback;
