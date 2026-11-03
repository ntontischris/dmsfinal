-- Είδη κλεισμένου χρόνου (owner 02, «επιλογή 3»): λίστα, αλλαγή από τις Ρυθμίσεις, Είδος στον κλεισμένο χρόνο και
-- ποιος το βλέπει. Φανταστικά δεδομένα. Ημερομηνία: 2027-01-05 (Ώρα Ελλάδας, +02:00 τον Ιανουάριο).
begin;
select plan(24);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Παραγωγή (κλείνει δικό του χρόνο) · a3 Παραγωγή (βλέπει διαθεσιμότητα, όχι τίτλους)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'crew@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'other@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'crew@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Ελένη', 'other@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a3', 'Παραγωγή')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- Τα id των αρχικών Ειδών, πριν γίνουμε Χρήστες (ο πίνακας είναι κλειστός).
select set_config('t.meet', (select k.id::text from public.blocked_time_kinds k where k.label = 'Ραντεβού'), true);

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.blocked_time_kinds_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τα Είδη');

set local role authenticated;
select public.t_as('a2');
select throws_ok($$ select public.blocked_time_kind_save(null, 'Γυμναστήριο') $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Χωρίς «Διαχειρίζεται Ρυθμίσεις» δεν προσθέτει Είδος');
select throws_ok($$ select public.blocked_time_kind_retire(gen_random_uuid()) $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Πρώτα το Δικαίωμα, μετά η ύπαρξη');
select throws_ok(format('select public.blocked_time_kind_restore(%L)', current_setting('t.meet')),
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Χωρίς «Διαχειρίζεται Ρυθμίσεις» δεν επαναφέρει Είδος');

-- ───────────── Η λίστα ─────────────
select is((select string_agg(k ->> 'label', ',' order by o) from jsonb_array_elements(public.blocked_time_kinds_view()) with ordinality x (k, o)),
  'Ρεπό,Άδεια,Ραντεβού,Τηλεφώνημα,Άλλο', 'Η ομάδα βλέπει τα πέντε αρχικά Είδη με τη σειρά τους');

-- ───────────── Αλλαγές από τις Ρυθμίσεις ─────────────
select public.t_as('a1');
select set_config('t.gym', public.blocked_time_kind_save(null, 'Γυμναστήριο')::text, true);
select is((select k ->> 'label' from jsonb_array_elements(public.blocked_time_kinds_view()) with ordinality x (k, o) order by o desc limit 1),
  'Γυμναστήριο', 'Το νέο Είδος μπαίνει τελευταίο');
select throws_ok($$ select public.blocked_time_kind_save(null, ' ραντεβού ') $$,
  'P0001', 'Υπάρχει ήδη ενεργό Είδος με αυτή την ονομασία', 'Ίδια ονομασία (άλλα κεφαλαία, κενά) απορρίπτεται');
select throws_ok($$ select public.blocked_time_kind_save(null, '   ') $$,
  'P0001', 'Γράψε ονομασία Είδους από 1 έως 40 χαρακτήρες', 'Κενή ονομασία απορρίπτεται');
select lives_ok(format('select public.blocked_time_kind_save(%L, %L)', current_setting('t.gym'), 'Προπόνηση'), 'Μετονομασία');

-- ───────────── Είδος στον κλεισμένο χρόνο ─────────────
select public.t_as('a2');
select set_config('t.b1', public.blocked_time_save(null, null, timestamptz '2027-01-05 10:00+02', timestamptz '2027-01-05 11:00+02',
  false, 'Γιατρός', current_setting('t.meet')::uuid)::text, true);
select is(public.blocked_time_view(current_setting('t.b1')::uuid) ->> 'kindLabel', 'Ραντεβού', 'Ο ίδιος βλέπει το Είδος του');
select throws_ok(format('select public.blocked_time_save(null, null, %L, %L, false, null, %L)',
    '2027-01-05 12:00+02', '2027-01-05 13:00+02', gen_random_uuid()),
  'P0001', 'Το Είδος δεν βρέθηκε ή έχει αποσυρθεί', 'Άγνωστο Είδος απορρίπτεται');
select set_config('t.b0', public.blocked_time_save(null, null, timestamptz '2027-01-05 14:00+02', timestamptz '2027-01-05 15:00+02',
  false, null)::text, true);
select ok((public.blocked_time_view(current_setting('t.b0')::uuid) ->> 'kindId') is null,
  'Χωρίς Είδος (π.χ. παλιά φόρμα, παλιός κλεισμένος χρόνος): μένει κενό');

select public.t_as('a1');
select lives_ok(format('select public.blocked_time_kind_retire(%L)', current_setting('t.meet')), 'Απόσυρση Είδους');
select throws_ok(format('select public.blocked_time_kind_retire(%L)', current_setting('t.meet')),
  'P0001', 'Το Είδος δεν βρέθηκε ή είναι ήδη αποσυρμένο', 'Δεύτερη απόσυρση απορρίπτεται');

select public.t_as('a2');
select is((select (k ->> 'retired')::boolean from jsonb_array_elements(public.blocked_time_kinds_view()) k where k ->> 'id' = current_setting('t.meet')),
  true, 'Το αποσυρμένο Είδος φαίνεται ως αποσυρμένο');
select throws_ok(format('select public.blocked_time_save(null, null, %L, %L, false, null, %L)',
    '2027-01-05 16:00+02', '2027-01-05 17:00+02', current_setting('t.meet')),
  'P0001', 'Το Είδος δεν βρέθηκε ή έχει αποσυρθεί', 'Νέος κλεισμένος χρόνος δεν παίρνει αποσυρμένο Είδος');
select lives_ok(format('select public.blocked_time_save(%L, null, %L, %L, false, %L, %L)', current_setting('t.b1'),
    '2027-01-05 10:00+02', '2027-01-05 11:30+02', 'Γιατρός', current_setting('t.meet')),
  'Αλλαγή ώρας κρατά το Είδος που είχε, ακόμη κι αν αποσύρθηκε');
select is(public.blocked_time_view(current_setting('t.b1')::uuid) ->> 'kindLabel', 'Ραντεβού', 'Το Είδος έμεινε');

-- ───────────── Ποιος βλέπει το Είδος ─────────────
select public.t_as('a1');
select is((select b ->> 'kindLabel' from jsonb_array_elements(public.calendar_view(date '2027-01-05', date '2027-01-05') -> 'blocked') b
            where b ->> 'id' = current_setting('t.b1')),
  'Ραντεβού', 'Ο Ιδιοκτήτης βλέπει το Είδος του κλεισμένου χρόνου άλλου');

select public.t_as('a3');
select is((select count(*)::integer from jsonb_array_elements(public.calendar_view(date '2027-01-05', date '2027-01-05') -> 'blocked')),
  0, 'Η Παραγωγή δεν βλέπει τον κλεισμένο χρόνο άλλου με τίτλο ή Είδος');
select is((select array_agg(distinct key order by key) from jsonb_array_elements(public.calendar_view(date '2027-01-05', date '2027-01-05') -> 'busy') b,
             jsonb_object_keys(b) key),
  array['endsAt', 'startsAt', 'userId', 'userName'], 'Οι άλλοι βλέπουν μόνο «Απασχολημένος»: όνομα και ώρα, χωρίς Είδος');
select ok(position('Ραντεβού' in public.calendar_view(date '2027-01-05', date '2027-01-05')::text) = 0,
  'Η ονομασία του Είδους δεν φτάνει πουθενά στο Ημερολόγιο της Παραγωγής');

-- ───────────── Επαναφορά και Ίχνος ─────────────
select public.t_as('a1');
select lives_ok(format('select public.blocked_time_kind_restore(%L)', current_setting('t.meet')), 'Επαναφορά Είδους');

reset role;
select ok(exists (select 1 from public.audit_log a where a.entity = 'blocked_time_kinds' and a.entity_id = current_setting('t.gym')),
  'Η προσθήκη Είδους γράφεται στο Ίχνος');

select * from finish();
rollback;
