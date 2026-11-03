-- Κλεισμένος χρόνος (A6): προειδοποίηση όταν πέφτει πάνω σε Γύρισμα όπου το άτομο είναι στο Συνεργείο (owner 02.3).
-- Blueprint 03-processes/04 «Κλεισμένος χρόνος (A6)» και prototype `screens/a6-form.tsx` (ConflictWarning).
--
-- Αρχές:
--  • Μόνο προειδοποίηση: η αποθήκευση δεν μπλοκάρεται και το άτομο δεν βγαίνει από το Συνεργείο.
--  • Ίδιος έλεγχος με την αποθήκευση: ομάδα, και ο εαυτός του ή «Κλείνει χρόνο άλλων». Αλλιώς 42501.
--  • Φαίνονται μόνο Γυρίσματα που βλέπει ο Χρήστης (authz.can_see_filming), ανοιχτά (pending, scheduled), όπου το
--    άτομο δεν έχει πει «δεν μπορώ». Η ώρα «όλη μέρα» γίνεται Ώρα Ελλάδας όπως στην αποθήκευση (authz.blocked_span).
--  • Μόνο ανάγνωση, μόνο νέα συνάρτηση· κανένας πίνακας, κανένα νέο Δικαίωμα.

create function public.blocked_time_conflicts(
  p_user uuid, p_starts timestamptz, p_ends timestamptz, p_all_day boolean
) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_user uuid := coalesce(p_user, auth.uid());
  v_span record;
begin
  if not authz.can_block_for(v_user) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select * into v_span from authz.blocked_span(p_starts, p_ends, p_all_day);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', f.id, 'title', coalesce(cl.name, pr.title), 'startsAt', f.starts_at,
             'endsAt', authz.filming_end(f.starts_at, f.hours), 'state', f.state
           ) order by f.starts_at, f.id)
      from public.filming_crew c
      join public.filmings f on f.id = c.filming_id
      join public.productions pr on pr.id = f.production_id
      left join public.clients cl on cl.id = f.client_id
     where c.user_id = v_user and c.response <> 'declined'
       and f.state in ('pending', 'scheduled')
       and f.starts_at < v_span.span_end and authz.filming_end(f.starts_at, f.hours) > v_span.span_start
       and authz.can_see_filming(f.id)
  ), '[]'::jsonb);
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function public.blocked_time_conflicts(uuid, timestamptz, timestamptz, boolean) from public, anon;
grant execute on function public.blocked_time_conflicts(uuid, timestamptz, timestamptz, boolean) to authenticated;
