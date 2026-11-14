-- Λογότυπο εταιρείας (e1): θέση → καταχώριση → αντικατάσταση → αφαίρεση, ο Έλεγχος ετοιμότητας,
-- και αρνήσεις σε όποιον δεν «Διαχειρίζεται Ρυθμίσεις». Φανταστικοί Χρήστες· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(17);

-- c2 Διαχείριση · c3 Πωλήσεις · c6 χωρίς ομάδα
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c2', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000c6', 'client@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000c2', 'Δημήτρης', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'Άννα', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000c2', 'Διαχείριση'),
    ('00000000-0000-0000-0000-0000000000c3', 'Πωλήσεις')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

set local role authenticated;

-- ───────────── Διαχείριση ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select set_config('t.first', public.company_logo_slot('png'), true);
select matches(current_setting('t.first'), '^logo/[0-9a-f-]{36}\.png$', 'Η θέση είναι νέα διαδρομή στον φάκελο logo/');
select throws_ok($$ select public.company_logo_slot('svg') $$, 'P0001', null, 'SVG δεν γίνεται δεκτό');
select throws_ok($$ select public.company_logo_attach('../other/file.png', 'image/png') $$,
  'P0001', null, 'Διαδρομή εκτός logo/ απορρίπτεται');
select is(public.company_logo_attach(current_setting('t.first'), 'image/png'), null, 'Πρώτο λογότυπο: δεν υπάρχει παλιό αρχείο');
select is((select done from public.readiness() where item = 'logo'), true, 'Ο Έλεγχος ετοιμότητας βλέπει το λογότυπο');
select isnt(public.company_logo_version(), null, 'Το κέλυφος παίρνει έκδοση του λογότυπου');

select set_config('t.second', public.company_logo_slot('webp'), true);
select is(public.company_logo_attach(current_setting('t.second'), 'image/webp'), current_setting('t.first'),
  'Η αντικατάσταση επιστρέφει το παλιό αρχείο για σβήσιμο');
select is(public.company_logo_remove(), current_setting('t.second'), 'Η αφαίρεση επιστρέφει το αρχείο που σβήνεται');
select is((select done from public.readiness() where item = 'logo'), false, 'Χωρίς λογότυπο η γραμμή ξαναγίνεται «εκκρεμεί»');
select is(public.company_logo_version(), null, 'Χωρίς λογότυπο δεν υπάρχει έκδοση');

-- ───────────── Αρνήσεις ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select throws_ok($$ select public.company_logo_slot('png') $$, '42501', null, 'Οι Πωλήσεις δεν παίρνουν θέση');
select throws_ok($$ select public.company_logo_attach(current_setting('t.first'), 'image/png') $$,
  '42501', null, 'Οι Πωλήσεις δεν καταχωρίζουν λογότυπο');
select throws_ok($$ select public.company_logo_remove() $$, '42501', null, 'Οι Πωλήσεις δεν αφαιρούν το λογότυπο');
select is(public.company_logo_version(), null, 'Οι Πωλήσεις διαβάζουν μόνο την έκδοση για το κέλυφος');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c6","role":"authenticated"}', true);
select throws_ok($$ select public.company_logo_slot('png') $$, '42501', null, 'Ο Χρήστης χωρίς ομάδα δεν παίρνει θέση');

reset role;
set local role anon;
select throws_ok($$ select public.company_logo_slot('png') $$, '42501', null, 'Ο ανώνυμος δεν καλεί τη θέση');
select throws_ok($$ select public.company_logo_version() $$, '42501', null, 'Ο ανώνυμος δεν καλεί την έκδοση');
reset role;

select * from finish();
rollback;
