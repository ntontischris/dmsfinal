-- Χρώμα και εικονίδιο ανά Είδος κλεισμένου χρόνου (owner 02, σχέδιο «3B»): κάθε Είδος φαίνεται στο Ημερολόγιο ως
-- γεμάτο κουτάκι στο χρώμα του, με το εικονίδιό του μπροστά από τον τίτλο. Αλλάζουν στις Ρυθμίσεις › Γυρίσματα (O4).
--
-- Αρχές:
--  • Το χρώμα είναι ΚΛΕΙΔΙ μιας μικρής σταθερής παλέτας του σχεδίου (teal, green, amber, violet, grey, blue, pink, red),
--    όχι hex: οι πραγματικές αποχρώσεις ζουν στα tokens της νέας εμφάνισης, για σκοτεινό και φωτεινό θέμα.
--  • Το εικονίδιο είναι σύντομο κείμενο (emoji ή γράμματα, έως 4 χαρακτήρες) ή κενό.
--  • Ίδια ιδιωτικότητα με το Είδος: χρώμα και εικονίδιο φτάνουν μόνο όπου φτάνει και η ονομασία του Είδους (ο ίδιος και
--    όσοι «Κλείνουν χρόνο άλλων»). Οι υπόλοιποι βλέπουν «Απασχολημένος» με το ουδέτερο ύφος (authz.calendar_busy δεν αλλάζει).
--  • Προσθετικό: οι στήλες έχουν προεπιλογή, τα πέντε αρχικά Είδη παίρνουν τις τιμές του σχεδίου (μόνο αν έχουν ακόμη
--    την αρχική ονομασία), κάθε άλλο μένει «grey» χωρίς εικονίδιο.

-- ───────────── Παλέτα και στήλες ─────────────

-- Τα κλειδιά της παλέτας του σχεδίου. Ίδια λίστα με το `KIND_COLORS` της εφαρμογής (src/modules/calendar/kind-style.ts).
create function authz.is_blocked_kind_color(p_color text) returns boolean
language sql immutable set search_path = ''
as $$
  select p_color = any (array['teal', 'green', 'amber', 'violet', 'grey', 'blue', 'pink', 'red']);
$$;

alter table public.blocked_time_kinds
  add column color text not null default 'grey' check (authz.is_blocked_kind_color(color)),
  add column icon text check (icon is null or char_length(icon) between 1 and 4);

update public.blocked_time_kinds k
   set color = v.color, icon = v.icon
  from (values ('Ρεπό', 'teal', '🌙'),
               ('Άδεια', 'green', '🏖'),
               ('Ραντεβού', 'amber', '🤝'),
               ('Τηλεφώνημα', 'violet', '📞'),
               ('Άλλο', 'grey', '•')) as v (label, color, icon)
 where k.label = v.label;

-- ───────────── Ύφος Είδους: RPC ─────────────

-- Χρώμα (κλειδί παλέτας) και εικονίδιο ενός Είδους. Κενό εικονίδιο = χωρίς εικονίδιο. Και για αποσυρμένο Είδος
-- (ο παλιός κλεισμένος χρόνος το κρατά).
create function public.blocked_time_kind_style(p_id uuid, p_color text, p_icon text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_icon text := nullif(btrim(coalesce(p_icon, '')), '');
begin
  perform authz.require('settings.manage');
  if p_color is null or not authz.is_blocked_kind_color(p_color) then
    raise exception 'Διάλεξε χρώμα από την παλέτα' using errcode = 'P0001';
  end if;
  if v_icon is not null and char_length(v_icon) > 4 then
    raise exception 'Το εικονίδιο έχει έως 4 χαρακτήρες' using errcode = 'P0001';
  end if;
  update public.blocked_time_kinds k
     set color = p_color, icon = v_icon, updated_at = now(), updated_by = auth.uid()
   where k.id = p_id;
  if not found then
    raise exception 'Το Είδος δεν βρέθηκε' using errcode = 'P0001';
  end if;
end;
$$;

-- Αντικαθιστά το 20261104130000: και το χρώμα και το εικονίδιο.
create or replace function public.blocked_time_kinds_view() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.is_team_user() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(
             jsonb_build_object('id', k.id, 'label', k.label, 'retired', k.retired_at is not null,
                                'color', k.color, 'icon', k.icon)
             order by k.retired_at is not null, k.sort, k.label, k.id
           ), '[]'::jsonb)
      from public.blocked_time_kinds k
  );
end;
$$;

-- ───────────── Κλεισμένος χρόνος: χρώμα και εικονίδιο δίπλα στο Είδος ─────────────

-- Αντικαθιστά το 20261104130000: και το ύφος του Είδους, μόνο σε όσους βλέπουν τον τίτλο.
create or replace function public.blocked_time_view(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  b public.blocked_times;
  v_full boolean;
  k public.blocked_time_kinds;
begin
  b := authz.require_blocked_viewer(p_id);
  v_full := authz.can_see_blocked_title(b.user_id);
  select * into k from public.blocked_time_kinds x where x.id = b.kind_id;
  return jsonb_build_object(
    'id', b.id,
    'userId', b.user_id,
    'userName', (select u.name from public.team_users u where u.user_id = b.user_id),
    'startsAt', b.starts_at,
    'endsAt', b.ends_at,
    'allDay', b.all_day,
    'title', case when v_full then b.title end,
    'kindId', case when v_full then b.kind_id end,
    'kindLabel', case when v_full then k.label end,
    'kindColor', case when v_full then k.color end,
    'kindIcon', case when v_full then k.icon end,
    'canEdit', v_full,
    'canConvert', v_full and authz.has('filming.book')
  );
end;
$$;

-- Αντικαθιστά το 20261104130000: και το ύφος του Είδους. Οι γραμμές εδώ είναι ήδη μόνο όσες βλέπει ο Χρήστης με τίτλο.
create or replace function authz.calendar_team_blocked(p_from timestamptz, p_to timestamptz) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', b.id, 'userId', b.user_id, 'userName', u.name, 'startsAt', b.starts_at, 'endsAt', b.ends_at,
           'allDay', b.all_day, 'title', b.title, 'isMine', b.user_id = auth.uid(),
           'kindId', b.kind_id, 'kindLabel', k.label, 'kindColor', k.color, 'kindIcon', k.icon
         ) order by b.starts_at, b.id), '[]'::jsonb)
    from public.blocked_times b
    join public.team_users u on u.user_id = b.user_id
    left join public.blocked_time_kinds k on k.id = b.kind_id
   where b.starts_at < p_to and b.ends_at > p_from
     and authz.can_see_blocked_title(b.user_id);
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function authz.is_blocked_kind_color(text) from public, anon, authenticated;

revoke all on function public.blocked_time_kind_style(uuid, text, text) from public, anon;
grant execute on function public.blocked_time_kind_style(uuid, text, text) to authenticated;
