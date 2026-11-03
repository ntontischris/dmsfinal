-- Κλεισμένος χρόνος (A6, owner 02.3): public.blocked_time_conflicts, η προειδοποίηση «είσαι στο Συνεργείο». Φανταστικά δεδομένα.
-- Ημερομηνίες: 2027-01-05 και 2027-01-06 (Ώρα Ελλάδας, +02:00 τον Ιανουάριο).
begin;
select plan(12);

-- ───────────── Χρήστες ─────────────
-- a1 Ιδιοκτήτης · a2 Παραγωγή (στο Συνεργείο) · a3 Παραγωγή (χωρίς «Κλείνει χρόνο άλλων»)
-- a4 «Μόνο κλείσιμο» («Κλείνει χρόνο άλλων» χωρίς «Βλέπει Γυρίσματα»)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'crew@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'other@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'blocker@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'Πέτρος', 'crew@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'Ελένη', 'other@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'Άννα', 'blocker@example.com');
insert into public.roles (name, kind) values ('Μόνο κλείσιμο', 'team');
insert into public.role_permissions (role_id, permission, scope)
select r.id, 'calendar.block_others', 'all' from public.roles r where r.name = 'Μόνο κλείσιμο' and r.kind = 'team';
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000a1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000a2', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a3', 'Παραγωγή'),
               ('00000000-0000-0000-0000-0000000000a4', 'Μόνο κλείσιμο')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

-- Τα id των Γυρισμάτων που επέστρεψε η συνάρτηση, με τη σειρά τους.
create function public.t_ids(p_rows jsonb) returns uuid[]
language sql immutable
as $$ select coalesce(array_agg((e ->> 'id')::uuid order by o), '{}'::uuid[]) from jsonb_array_elements(p_rows) with ordinality x (e, o); $$;

-- ───────────── Γυρίσματα (Εσωτερική Παραγωγή χωρίς Υπεύθυνο) ─────────────
-- b1 09:00–11:00 προγραμματισμένο (a2) · b2 15:00–17:00 σε αναμονή (a2 επιβεβαίωσε) · b3 12:00 ακυρωμένο (a2)
-- b4 18:00 προγραμματισμένο (a2 «δεν μπορώ») · b5 2027-01-06 09:00 προγραμματισμένο (μόνο a3)
insert into public.productions (id, title) values ('00000000-0000-0000-0000-0000000000c1', 'Εσωτερική Παραγωγή');
insert into public.filmings (id, production_id, starts_at, hours, origin, state) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', '2027-01-05 09:00+02', 2, 'team', 'scheduled'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', '2027-01-05 15:00+02', 2, 'team', 'pending'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000c1', '2027-01-05 18:00+02', 2, 'team', 'scheduled'),
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000000c1', '2027-01-06 09:00+02', 2, 'team', 'scheduled');
-- Το b3 ακυρώνεται αφού μπει το Συνεργείο του: σε κλειστό Γύρισμα η βάση δεν δέχεται αλλαγές.
insert into public.filmings (id, production_id, starts_at, hours, origin, state) values
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c1', '2027-01-05 12:00+02', 2, 'team', 'scheduled');
insert into public.filming_crew (filming_id, user_id, response, reason, responded_at) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'pending', null, null),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2', 'confirmed', null, now()),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a2', 'pending', null, null),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a2', 'declined', 'Δοκιμή', now()),
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000000a3', 'pending', null, null);
update public.filmings
   set state = 'cancelled', cancelled_at = now(), cancelled_side = 'team', cancelled_reason = 'Δοκιμή'
 where id = '00000000-0000-0000-0000-0000000000b3';

-- ───────────── Άρνηση ─────────────
set local role anon;
select throws_ok($$ select public.blocked_time_conflicts(null, '2027-01-05 00:00+02', '2027-01-05 00:00+02', true) $$,
  '42501', null, 'Ο ανώνυμος δεν βλέπει προειδοποίηση');

set local role authenticated;
select public.t_as('a3');
select throws_ok($$ select public.blocked_time_conflicts('00000000-0000-0000-0000-0000000000a2', '2027-01-05 00:00+02', '2027-01-05 00:00+02', true) $$,
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Χωρίς «Κλείνει χρόνο άλλων» δεν βλέπει τα Γυρίσματα άλλου');
select throws_ok($$ select public.blocked_time_conflicts(null, '2027-01-05 11:00+02', '2027-01-05 10:00+02', false) $$,
  'P0001', 'Η λήξη είναι μετά την αρχή', 'Λάθος διάστημα: ίδιο μήνυμα με την αποθήκευση');

-- ───────────── Ο ίδιος ─────────────
select public.t_as('a2');
select is(public.t_ids(public.blocked_time_conflicts(null, '2027-01-05 00:00+02', '2027-01-05 00:00+02', true)),
  array['00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2']::uuid[],
  'Όλη μέρα: τα ανοιχτά Γυρίσματα του Συνεργείου, χωρίς ακυρωμένα και «δεν μπορώ»');
select is(public.t_ids(public.blocked_time_conflicts('00000000-0000-0000-0000-0000000000a2', '2027-01-05 10:30+02', '2027-01-05 11:30+02', false)),
  array['00000000-0000-0000-0000-0000000000b1']::uuid[], 'Μερικές ώρες: μόνο όσα τέμνονται');
select is(public.blocked_time_conflicts(null, '2027-01-05 11:00+02', '2027-01-05 12:00+02', false), '[]'::jsonb,
  'Αρχή στο τέλος του Γυρίσματος: καμία επικάλυψη');
select is(public.t_ids(public.blocked_time_conflicts(null, '2027-01-06 00:00+02', '2027-01-06 00:00+02', true)), '{}'::uuid[],
  'Γύρισμα όπου δεν είναι στο Συνεργείο: δεν φαίνεται');
select is((select e - 'id' from jsonb_array_elements(public.blocked_time_conflicts(null, '2027-01-05 09:30+02', '2027-01-05 10:00+02', false)) e),
  jsonb_build_object('title', 'Εσωτερική Παραγωγή', 'startsAt', timestamptz '2027-01-05 09:00+02',
                     'endsAt', timestamptz '2027-01-05 11:00+02', 'state', 'scheduled'),
  'Κάθε γραμμή: τίτλος, αρχή, τέλος και κατάσταση');

-- ───────────── Για άλλον ─────────────
select public.t_as('a1');
select is(public.t_ids(public.blocked_time_conflicts('00000000-0000-0000-0000-0000000000a2', '2027-01-05 00:00+02', '2027-01-05 00:00+02', true)),
  array['00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2']::uuid[],
  'Ο Ιδιοκτήτης βλέπει τα Γυρίσματα του ατόμου που κλείνει');
select is(public.t_ids(public.blocked_time_conflicts('00000000-0000-0000-0000-0000000000a3', '2027-01-05 00:00+02', '2027-01-06 00:00+02', true)),
  array['00000000-0000-0000-0000-0000000000b5']::uuid[], 'Πολλές μέρες: ως το τέλος της τελευταίας');
select is(public.blocked_time_conflicts(null, '2027-01-05 00:00+02', '2027-01-05 00:00+02', true), '[]'::jsonb,
  'Χωρίς άτομο: ο ίδιος ο Χρήστης (εδώ χωρίς Συνεργείο)');

select public.t_as('a4');
select is(public.blocked_time_conflicts('00000000-0000-0000-0000-0000000000a2', '2027-01-05 00:00+02', '2027-01-05 00:00+02', true), '[]'::jsonb,
  'Χωρίς «Βλέπει Γυρίσματα»: κανένα Γύρισμα δεν φαίνεται');

select * from finish();
rollback;
