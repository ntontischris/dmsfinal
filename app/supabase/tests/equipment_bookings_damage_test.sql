-- Εξοπλισμός (c10): ανοιχτές Δεσμεύσεις για το μητρώο (επόμενο Γύρισμα, ελεύθερο σε μια μέρα) και σήμανση βλάβης
-- από τη σελίδα του Γυρίσματος. Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(18);

create function public.t_as(p_user text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_user), true);
end;
$$;

create function public.t_at(p_days integer, p_time time) returns timestamptz
language sql stable
as $$ select (((now() at time zone 'Europe/Athens')::date + p_days) + p_time) at time zone 'Europe/Athens'; $$;

-- e1 Ιδιοκτήτης · e4 μέλος ομάδας χωρίς Ρόλο · e6 λογαριασμός εκτός ομάδας
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'editor@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'outsider@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e4', 'Λίνα', 'editor@example.com');
insert into public.team_user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000e1', r.id from public.roles r where r.name = 'Ιδιοκτήτης' and r.kind = 'team';

insert into public.productions (id, title, owner_id)
values ('00000000-0000-0000-0000-0000000000a1', 'Εσωτερική Παραγωγή', '00000000-0000-0000-0000-0000000000e1');
insert into public.equipment_categories (id, name) values ('00000000-0000-0000-0000-0000000000c1', 'Κάμερες (τεστ)');
insert into public.equipment_items (id, category_id, name, status, status_note) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Κάμερα Α (τεστ)', 'available', null),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'Κάμερα Β (τεστ)', 'available', null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'Φακός (τεστ)', 'available', null),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c1', 'Φωτιστικό (τεστ)', 'retired', null);

-- f1 προγραμματισμένο σε 5 μέρες · f2 αναμένει σε 6 · f3 ακυρωμένο · f4 προγραμματισμένο χθες (έχει τελειώσει)
insert into public.filmings (id, production_id, starts_at, hours, origin, state) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', public.t_at(5, '10:00'), 3, 'team', 'scheduled'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a1', public.t_at(6, '10:00'), 2, 'team', 'pending'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000a1', public.t_at(-1, '10:00'), 2, 'team', 'scheduled');
insert into public.filmings (id, production_id, starts_at, hours, origin, state) values
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000a1', public.t_at(7, '10:00'), 2, 'team', 'scheduled');
insert into public.filming_equipment (filming_id, item_id) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000d2'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000d3'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000d3'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d4');
-- Ακύρωση μετά τη Δέσμευση (κλειστό Γύρισμα δεν παίρνει εξοπλισμό).
update public.filmings set state = 'cancelled', cancelled_at = now(), cancelled_side = 'team', cancelled_reason = 'Ακύρωση δοκιμής'
 where id = '00000000-0000-0000-0000-0000000000f3';

-- ───────────── Δικαιώματα ─────────────
set local role anon;
select throws_ok($$ select public.equipment_bookings_view() $$, '42501', null, 'Ο ανώνυμος δεν βλέπει τις Δεσμεύσεις');
select throws_ok($$ select public.filming_equipment_report_damage('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'Σπασμένο') $$,
                 '42501', null, 'Ο ανώνυμος δεν σημειώνει βλάβη');
reset role;

select public.t_as('e4');
set local role authenticated;
select throws_ok($$ select public.equipment_bookings_view() $$, '42501', null, 'Χωρίς «Βλέπει Εξοπλισμό» δεν βλέπει τις Δεσμεύσεις');
select throws_ok($$ select public.filming_equipment_report_damage('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'Σπασμένο') $$,
                 '42501', null, 'Μέλος χωρίς Δικαίωμα στο Γύρισμα δεν σημειώνει βλάβη');
reset role;

select public.t_as('e6');
set local role authenticated;
select throws_ok($$ select public.filming_equipment_report_damage('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'Σπασμένο') $$,
                 '42501', null, 'Λογαριασμός εκτός ομάδας δεν σημειώνει βλάβη');
reset role;

-- ───────────── Ανοιχτές Δεσμεύσεις ─────────────
select public.t_as('e1');
set local role authenticated;
select set_config('t.b', public.equipment_bookings_view()::text, true);
select is((select count(*)::int from jsonb_array_elements(current_setting('t.b')::jsonb)), 3,
          'Μόνο ανοιχτά Γυρίσματα που δεν έχουν τελειώσει (όχι ακυρωμένο, όχι χθεσινό)');
select is((select e ->> 'state' from jsonb_array_elements(current_setting('t.b')::jsonb) e where e ->> 'itemId' = '00000000-0000-0000-0000-0000000000d2'),
          'pending', 'Το αναμένον Γύρισμα κρατά το αντικείμενο');
select is((select e ->> 'filmingId' from jsonb_array_elements(current_setting('t.b')::jsonb) e where e ->> 'itemId' = '00000000-0000-0000-0000-0000000000d1'),
          '00000000-0000-0000-0000-0000000000f1', 'Όποιος βλέπει το Γύρισμα παίρνει και τον σύνδεσμο');
select ok(not exists (select 1 from jsonb_array_elements(public.equipment_bookings_view(public.t_at(30, '00:00'))) e),
          'Με «τώρα» σε έναν μήνα δεν μένει ανοιχτή Δέσμευση');
select is((select count(*)::int from jsonb_array_elements(public.equipment_bookings_view(public.t_at(-2, '00:00'))) e
            where e ->> 'itemId' = '00000000-0000-0000-0000-0000000000d3'), 1,
          'Με «τώρα» πριν από το χθεσινό Γύρισμα, εκείνο μετράει (p_now)');

-- ───────────── Σήμανση βλάβης ─────────────
select throws_ok($$ select public.filming_equipment_report_damage('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d2', 'Σπασμένο') $$,
                 'P0001', 'Το αντικείμενο δεν είναι δεσμευμένο σε αυτό το Γύρισμα', 'Μόνο αντικείμενο του Γυρίσματος');
select throws_ok($$ select public.filming_equipment_report_damage('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', '  ') $$,
                 'P0001', 'Γράψε τι έπαθε το αντικείμενο', 'Η βλάβη θέλει περιγραφή');
select throws_ok($$ select public.filming_equipment_report_damage('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d4', 'Καμένο') $$,
                 'P0001', 'Το αντικείμενο έχει αποσυρθεί', 'Αποσυρμένο αντικείμενο δεν σημειώνεται');
select lives_ok($$ select public.filming_equipment_report_damage('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'Σπασμένη οθόνη') $$,
                'Ο Ιδιοκτήτης σημειώνει βλάβη');
select throws_ok($$ select public.filming_equipment_report_damage('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'Ξανά') $$,
                 'P0001', 'Το αντικείμενο είναι ήδη σε επισκευή', 'Δεύτερη σήμανση απορρίπτεται');
reset role;

select is((select status || ' / ' || status_note from public.equipment_items where id = '00000000-0000-0000-0000-0000000000d1'),
          'in_repair / Σπασμένη οθόνη', 'Το αντικείμενο γίνεται «Σε επισκευή» με τον λόγο');
select is((select a.after ->> 'filmingId' from public.audit_log a
            where a.entity = 'equipment_items' and a.entity_id = '00000000-0000-0000-0000-0000000000d1'
              and a.action = 'event' and a.after ->> 'event' = 'status_changed'),
          '00000000-0000-0000-0000-0000000000f1', 'Το Ίχνος του αντικειμένου γράφει την αλλαγή με το Γύρισμα');
select is((select a.actor_id::text from public.audit_log a
            where a.entity = 'equipment_items' and a.entity_id = '00000000-0000-0000-0000-0000000000d1'
              and a.action = 'event' and a.after ->> 'event' = 'status_changed'),
          '00000000-0000-0000-0000-0000000000e1', 'και ποιος τη σημείωσε');

select * from finish();
rollback;
