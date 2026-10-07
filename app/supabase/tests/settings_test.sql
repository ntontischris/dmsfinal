-- Ρυθμίσεις › Εταιρεία και Έλεγχος ετοιμότητας (κεφ. 5). Φανταστικοί Χρήστες και στοιχεία.
begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'sales@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000c2', 'Δημήτρης', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'Άννα', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000c1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000c2', 'Διαχείριση'),
    ('00000000-0000-0000-0000-0000000000c3', 'Πωλήσεις')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

set local role authenticated;

-- ───────────── Διαχείριση ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select lives_ok(
  $$ update public.company_settings set legal_name = 'Δοκιμαστική Παραγωγές Ι.Κ.Ε.', trade_name = 'Δοκιμή', address = 'Οδός 1, Αθήνα',
       phone = '2100000000', email = 'info@example.com', signatory_name = 'Γιώργος Δοκιμής', signatory_title = 'Διαχειριστής' $$,
  'Η Διαχείριση αλλάζει τα στοιχεία της εταιρείας'
);
select throws_ok(
  $$ update public.company_settings set tax_id = '099999999' $$,
  'P0001', null, 'Η Διαχείριση δεν αλλάζει το ΑΦΜ'
);
select throws_ok(
  $$ update public.company_settings set vat_rate = 13 $$,
  'P0001', null, 'Η Διαχείριση δεν αλλάζει τον ΦΠΑ'
);
select throws_ok(
  $$ insert into public.bank_accounts (bank_name, holder, iban) values ('Τράπεζα', 'Δοκιμή', 'GR1601101250000000012300695') $$,
  '42501', null, 'Η Διαχείριση δεν προσθέτει λογαριασμό τραπέζης'
);
select is(
  (select done from public.readiness() where item = 'company_details'), true,
  'Τα στοιχεία εταιρείας φεύγουν από τα «εκκρεμεί» μόλις συμπληρωθούν'
);
select is((select count(*)::int from public.readiness()), 11, 'Ο Έλεγχος ετοιμότητας έχει 11 γραμμές');

-- ───────────── Ιδιοκτήτης ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select lives_ok(
  $$ update public.company_settings set tax_id = '099999999', tax_office = 'Α΄ Αθηνών', gemi = '123456789000' $$,
  'Ο Ιδιοκτήτης αλλάζει τα φορολογικά στοιχεία'
);
select throws_ok(
  $$ update public.company_settings set tax_id = '123' $$,
  '23514', null, 'Το ΑΦΜ θέλει 9 ψηφία'
);
select lives_ok(
  $$ insert into public.bank_accounts (bank_name, holder, iban, is_default) values ('Τράπεζα', 'Δοκιμή', 'GR1601101250000000012300695', true) $$,
  'Ο Ιδιοκτήτης προσθέτει τον προεπιλεγμένο λογαριασμό'
);
select throws_ok(
  $$ insert into public.bank_accounts (bank_name, holder, iban, is_default) values ('Άλλη', 'Δοκιμή', 'GR9601401330133002320001867', true) $$,
  '23505', null, 'Ένας μόνο προεπιλεγμένος λογαριασμός'
);
select throws_ok(
  $$ update public.system_state set opened_at = now(), opened_by = '00000000-0000-0000-0000-0000000000c1' $$,
  'P0001', null, 'Με «εκκρεμεί» το σύστημα δεν ανοίγει σε πελάτες'
);
select ok(
  (select count(*) > 0 from public.audit_log where entity = 'company_settings'
     and actor_id = '00000000-0000-0000-0000-0000000000c1' and after ->> 'tax_id' = '099999999'),
  'Η αλλαγή του ΑΦΜ γράφεται στο Ίχνος με το πριν και το μετά'
);

-- ───────────── Πωλήσεις ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select is((select count(*)::int from public.readiness()), 0, 'Οι Πωλήσεις δεν βλέπουν τον Έλεγχο ετοιμότητας');
select is(
  (select legal_name from public.company_settings), 'Δοκιμαστική Παραγωγές Ι.Κ.Ε.',
  'Τα στοιχεία της εταιρείας τα βλέπει όλη η ομάδα'
);

select * from finish();
rollback;
