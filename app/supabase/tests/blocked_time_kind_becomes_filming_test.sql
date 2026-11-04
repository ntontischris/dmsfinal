-- «Μετατροπή σε Γύρισμα» ανά Είδος (owner 02, γύρος 3): ποια Είδη γίνονται Γύρισμα, η ρύθμιση στις Ρυθμίσεις και το
-- canConvert του κλεισμένου χρόνου. Φανταστικά δεδομένα. Ημερομηνία: 2027-01-12 (Ώρα Ελλάδας, +02:00 τον Ιανουάριο).
begin;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'crew@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'Πέτρος', 'crew@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values ('00000000-0000-0000-0000-0000000000b1', 'Ιδιοκτήτης'),
               ('00000000-0000-0000-0000-0000000000b2', 'Παραγωγή')) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

create function public.t_as(p_last text) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    format('{"sub":"00000000-0000-0000-0000-0000000000%s","role":"authenticated"}', p_last), true);
end;
$$;

create function public.t_kind_id(p_label text) returns uuid
language sql
as $$ select (k ->> 'id')::uuid from jsonb_array_elements(public.blocked_time_kinds_view()) k where k ->> 'label' = p_label; $$;

-- Κλεισμένος χρόνος του Ιδιοκτήτη με αυτό το Είδος (ή χωρίς), και το canConvert του.
create function public.t_can_convert(p_kind uuid, p_hour int) returns boolean
language sql
as $$
  select (public.blocked_time_view(public.blocked_time_save(null, null,
            timestamptz '2027-01-12 00:00+02' + make_interval(hours => p_hour),
            timestamptz '2027-01-12 00:00+02' + make_interval(hours => p_hour + 1),
            false, null, p_kind)) ->> 'canConvert')::boolean;
$$;

set local role authenticated;
select public.t_as('b1');

-- ───────────── Αρχικές τιμές ─────────────
select is((select string_agg(k ->> 'label', ',' order by o)
             from jsonb_array_elements(public.blocked_time_kinds_view()) with ordinality x (k, o)
            where (k ->> 'becomesFilming')::boolean),
  'Ραντεβού,Άλλο', 'Από τα αρχικά Είδη μόνο το Ραντεβού και το Άλλο γίνονται Γύρισμα');

-- ───────────── canConvert ─────────────
select is(public.t_can_convert(public.t_kind_id('Ρεπό'), 8), false, 'Το Ρεπό δεν δείχνει «Μετατροπή σε Γύρισμα»');
select is(public.t_can_convert(public.t_kind_id('Άδεια'), 9), false, 'Η Άδεια δεν δείχνει «Μετατροπή σε Γύρισμα»');
select is(public.t_can_convert(public.t_kind_id('Ραντεβού'), 10), true, 'Το Ραντεβού δείχνει «Μετατροπή σε Γύρισμα»');
select is(public.t_can_convert(null, 11), true, 'Κλεισμένος χρόνος χωρίς Είδος κρατά τη «Μετατροπή»');

-- ───────────── Ρύθμιση ─────────────
select lives_ok(format('select public.blocked_time_kind_style(%L, %L, %L, true)', public.t_kind_id('Ρεπό'), 'teal', '🌙'),
  'Ο Ιδιοκτήτης ανοίγει τη «Μετατροπή» για το Ρεπό');
select is(public.t_can_convert(public.t_kind_id('Ρεπό'), 12), true, 'Μετά τη ρύθμιση το Ρεπό δείχνει «Μετατροπή»');

select lives_ok(format('select public.blocked_time_kind_style(%L, %L, %L)', public.t_kind_id('Ρεπό'), 'teal', '🌙'),
  'Κλήση χωρίς τέταρτο όρισμα: η ρύθμιση μένει ως έχει');

select public.t_as('b2');
select throws_ok(format('select public.blocked_time_kind_style(%L, %L, null, false)', public.t_kind_id('Ραντεβού'), 'amber'),
  '42501', 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια', 'Χωρίς «Διαχειρίζεται Ρυθμίσεις» δεν αλλάζει η ρύθμιση');

select * from finish();
rollback;
