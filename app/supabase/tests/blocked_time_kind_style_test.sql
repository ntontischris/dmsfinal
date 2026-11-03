-- Χρώμα και εικονίδιο ανά Είδος κλεισμένου χρόνου (owner 02, σχέδιο «3B»): αρχικές τιμές, αλλαγή από τις Ρυθμίσεις,
-- και ποιος τα βλέπει. Φανταστικά δεδομένα. Ημερομηνία: 2027-01-05 (Ώρα Ελλάδας, +02:00 τον Ιανουάριο).
begin;
select plan(16);

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

-- Το Είδος με αυτή την ονομασία, όπως το δίνει η λίστα (ο πίνακας είναι κλειστός).
create function public.t_kind(p_label text) returns jsonb
language sql
as $$ select k from jsonb_array_elements(public.blocked_time_kinds_view()) k where k ->> 'label' = p_label; $$;

select set_config('t.meet', (select k.id::text from public.blocked_time_kinds k where k.label = 'Ραντεβού'), true);

-- ───────────── Αρχικές τιμές ─────────────
set local role authenticated;
select public.t_as('a2');
select is((select string_agg((k ->> 'color') || ' ' || (k ->> 'icon'), ',' order by o)
             from jsonb_array_elements(public.blocked_time_kinds_view()) with ordinality x (k, o)),
  'teal 🌙,green 🏖,amber 🤝,violet 📞,grey •', 'Τα πέντε αρχικά Είδη έχουν το χρώμα και το εικονίδιο του σχεδίου');

-- ───────────── Άρνηση ─────────────
select throws_ok(format('select public.blocked_time_kind_style(%L, %L, %L)', current_setting('t.meet'), 'red', '!'),
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Χωρίς «Διαχειρίζεται Ρυθμίσεις» δεν αλλάζει το ύφος');
select throws_ok(format('select public.blocked_time_kind_style(%L, %L, null)', gen_random_uuid(), 'nope'),
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Πρώτα το Δικαίωμα, μετά η τιμή');
select is(public.t_kind('Ραντεβού') ->> 'color', 'amber', 'Η άρνηση δεν άλλαξε τίποτα');

set local role anon;
select throws_ok(format('select public.blocked_time_kind_style(%L, %L, null)', current_setting('t.meet'), 'red'),
  '42501', null, 'Ο ανώνυμος δεν αλλάζει το ύφος');

-- ───────────── Λάθος τιμές ─────────────
set local role authenticated;
select public.t_as('a1');
select throws_ok(format('select public.blocked_time_kind_style(%L, %L, null)', current_setting('t.meet'), '#ff0000'),
  'P0001', 'Διάλεξε χρώμα από την παλέτα', 'Χρώμα εκτός παλέτας (π.χ. hex) απορρίπτεται');
select throws_ok(format('select public.blocked_time_kind_style(%L, null, null)', current_setting('t.meet')),
  'P0001', 'Διάλεξε χρώμα από την παλέτα', 'Χωρίς χρώμα απορρίπτεται');
select throws_ok(format('select public.blocked_time_kind_style(%L, %L, %L)', current_setting('t.meet'), 'red', 'ΠΟΛΥΜΑΚΡΥ'),
  'P0001', 'Το εικονίδιο έχει έως 4 χαρακτήρες', 'Εικονίδιο πάνω από 4 χαρακτήρες απορρίπτεται');
select throws_ok(format('select public.blocked_time_kind_style(%L, %L, null)', gen_random_uuid(), 'red'),
  'P0001', 'Το Είδος δεν βρέθηκε', 'Άγνωστο Είδος απορρίπτεται');

-- ───────────── Αλλαγή (oracle) ─────────────
select lives_ok(format('select public.blocked_time_kind_style(%L, %L, %L)', current_setting('t.meet'), 'pink', ' ☕ '),
  'Ο Ιδιοκτήτης αλλάζει χρώμα και εικονίδιο');
select is(public.t_kind('Ραντεβού') - 'id', '{"label": "Ραντεβού", "retired": false, "color": "pink", "icon": "☕"}'::jsonb,
  'Η λίστα δίνει το νέο χρώμα και το εικονίδιο χωρίς κενά');
select set_config('t.gym', public.blocked_time_kind_save(null, 'Γυμναστήριο')::text, true);
select is(public.t_kind('Γυμναστήριο') - 'id', '{"label": "Γυμναστήριο", "retired": false, "color": "grey", "icon": null}'::jsonb,
  'Νέο Είδος: γκρι, χωρίς εικονίδιο');

-- ───────────── Ποιος βλέπει το ύφος ─────────────
select public.t_as('a2');
select set_config('t.b1', public.blocked_time_save(null, null, timestamptz '2027-01-05 10:00+02', timestamptz '2027-01-05 11:00+02',
  false, 'Γιατρός', current_setting('t.meet')::uuid)::text, true);
select is((select jsonb_build_object('color', v ->> 'kindColor', 'icon', v ->> 'kindIcon')
             from (select public.blocked_time_view(current_setting('t.b1')::uuid) v) x),
  '{"color": "pink", "icon": "☕"}'::jsonb, 'Ο ίδιος βλέπει το ύφος του Είδους του');

select public.t_as('a1');
select is((select b ->> 'kindColor' from jsonb_array_elements(public.calendar_view(date '2027-01-05', date '2027-01-05') -> 'blocked') b
            where b ->> 'id' = current_setting('t.b1')),
  'pink', 'Ο Ιδιοκτήτης βλέπει το χρώμα του κλεισμένου χρόνου άλλου');

select public.t_as('a3');
select ok(position('pink' in public.calendar_view(date '2027-01-05', date '2027-01-05')::text) = 0
          and position('☕' in public.calendar_view(date '2027-01-05', date '2027-01-05')::text) = 0,
  'Η Παραγωγή δεν παίρνει πουθενά στο Ημερολόγιο το χρώμα ή το εικονίδιο του Είδους άλλου');

reset role;
select ok(exists (select 1 from public.audit_log a
                    where a.entity = 'blocked_time_kinds' and a.entity_id = current_setting('t.meet')
                      and a.actor_id = '00000000-0000-0000-0000-0000000000a1' and a.after ->> 'color' = 'pink'),
  'Η αλλαγή ύφους γράφεται στο Ίχνος με τον Χρήστη');

select * from finish();
rollback;
