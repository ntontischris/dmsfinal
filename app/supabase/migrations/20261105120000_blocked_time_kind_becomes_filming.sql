-- «Μετατροπή σε Γύρισμα» ανά Είδος κλεισμένου χρόνου (owner 02, γύρος 3): ένα Ρεπό ή μια Άδεια δεν γίνεται Γύρισμα, άρα
-- το κουμπί δεν πρέπει να φαίνεται εκεί. Κάθε Είδος έχει τη ρύθμιση «Μπορεί να γίνει Γύρισμα» στις Ρυθμίσεις › Γυρίσματα.
--
-- Αρχές:
--  • Προσθετικό: νέα στήλη με προεπιλογή «όχι». Από τα αρχικά Είδη μόνο το Ραντεβού και το Άλλο γίνονται Γύρισμα
--    (μόνο αν έχουν ακόμη την αρχική ονομασία).
--  • Κλεισμένος χρόνος χωρίς Είδος (π.χ. παλιός ή από το Google) κρατά τη «Μετατροπή», όπως πριν.
--  • Η ρύθμιση αλλάζει μαζί με χρώμα και εικονίδιο: το blocked_time_kind_style παίρνει τέταρτο όρισμα. Κενό = μένει ως έχει,
--    ώστε οι παλιές κλήσεις με τρία ορίσματα να δουλεύουν ίδια.

alter table public.blocked_time_kinds
  add column becomes_filming boolean not null default false;

update public.blocked_time_kinds set becomes_filming = true where label in ('Ραντεβού', 'Άλλο');

-- ───────────── Ύφος Είδους: RPC ─────────────

drop function public.blocked_time_kind_style(uuid, text, text);

create function public.blocked_time_kind_style(p_id uuid, p_color text, p_icon text, p_becomes_filming boolean default null)
returns void
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
     set color = p_color, icon = v_icon, becomes_filming = coalesce(p_becomes_filming, k.becomes_filming),
         updated_at = now(), updated_by = auth.uid()
   where k.id = p_id;
  if not found then
    raise exception 'Το Είδος δεν βρέθηκε' using errcode = 'P0001';
  end if;
end;
$$;

-- Αντικαθιστά το 20261104150000: και το «Μπορεί να γίνει Γύρισμα».
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
                                'color', k.color, 'icon', k.icon, 'becomesFilming', k.becomes_filming)
             order by k.retired_at is not null, k.sort, k.label, k.id
           ), '[]'::jsonb)
      from public.blocked_time_kinds k
  );
end;
$$;

-- Αντικαθιστά το 20261104150000: «Μετατροπή σε Γύρισμα» μόνο όταν το Είδος το επιτρέπει (ή δεν έχει Είδος).
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
    'canConvert', v_full and authz.has('filming.book') and (b.kind_id is null or coalesce(k.becomes_filming, false))
  );
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function public.blocked_time_kind_style(uuid, text, text, boolean) from public, anon;
grant execute on function public.blocked_time_kind_style(uuid, text, text, boolean) to authenticated;
