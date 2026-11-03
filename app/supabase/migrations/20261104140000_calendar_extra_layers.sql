-- Ημερολόγιο (A5): δύο νέες στρώσεις και το φίλτρο ατόμου (owner 02.1, «επιλογή 3»).
-- Blueprint 03-processes/04 «Τι βλέπει ο καθένας στο Ημερολόγιο (A5)» και «Φίλτρα για την ομάδα»· prototype
-- `screens/a5-filters.tsx`.
--
-- Αρχές:
--  • Επόμενα βήματα: τα ανοιχτά Επόμενα βήματα των Ευκαιριών, τη μέρα τους. Μόνο όσες Ευκαιρίες βλέπει ο Χρήστης
--    (authz.can_see_opportunity_row, ίδιος κανόνας με τις Πωλήσεις). Ο Ιδιοκτήτης βλέπει όλες.
--  • Προθεσμίες: τα Παραδοτέα με προθεσμία που δεν ακυρώθηκαν και δεν εγκρίθηκαν, σε ανοιχτή Παραγωγή. Μόνο όσα βλέπει
--    ο Χρήστης (authz.deliverable_in_scope για εργασία ή έλεγχο, ίδιο με τη σελίδα του Παραδοτέου).
--  • Φίλτρο ατόμου: κάθε Γύρισμα δίνει τα μέλη του Συνεργείου μόνο σε όποιον βλέπει το Συνεργείο (authz.can_see_crew).
--    Η λίστα ατόμων δίνεται μόνο σε όσους βλέπουν άλλους (Κλείνει χρόνο άλλων ή Βλέπει διαθεσιμότητα ομάδας).
--  • Ο Πελάτης δεν παίρνει τίποτα από αυτά (authz.calendar_client_view δεν αλλάζει).
--  • Μόνο ανάγνωση· κανένας πίνακας, κανένα νέο Δικαίωμα.

-- ───────────── Γυρίσματα: Συνεργείο για το φίλτρο ατόμου ─────────────

-- Αντικαθιστά το 20261011100000: και τα μέλη του Συνεργείου (χωρίς όσους είπαν «δεν μπορώ»), μόνο σε όποιον τα βλέπει.
create or replace function authz.calendar_team_filmings(p_from timestamptz, p_to timestamptz) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', f.id, 'startsAt', f.starts_at, 'hours', f.hours, 'state', f.state,
           'title', coalesce(cl.name, pr.title),
           'isMine', authz.is_filming_participant(f.id) or authz.is_client_manager(f.client_id),
           'crewIds', case when authz.can_see_crew(f.id) then (
             select coalesce(jsonb_agg(c.user_id order by c.user_id), '[]'::jsonb)
               from public.filming_crew c
              where c.filming_id = f.id and c.response <> 'declined'
           ) else '[]'::jsonb end
         ) order by f.starts_at, f.id), '[]'::jsonb)
    from public.filmings f
    join public.productions pr on pr.id = f.production_id
    left join public.clients cl on cl.id = f.client_id
   where authz.can_see_filming(f.id)
     and f.state in ('pending', 'scheduled', 'done', 'no_show')
     and f.starts_at >= p_from and f.starts_at < p_to;
$$;

-- ───────────── Επόμενα βήματα και Προθεσμίες ─────────────

-- Τα Επόμενα βήματα των ανοιχτών Ευκαιριών που βλέπει ο Χρήστης, στις μέρες p_from..p_to.
create function authz.calendar_next_steps(p_from date, p_to date) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', o.id, 'day', o.next_step_due, 'step', o.next_step, 'opportunityTitle', o.title,
           'clientName', c.name, 'managerId', o.manager_id, 'managerName', u.name,
           'isMine', coalesce(o.manager_id = auth.uid(), false)
         ) order by o.next_step_due, o.id), '[]'::jsonb)
    from public.opportunities o
    join public.clients c on c.id = o.client_id
    left join public.team_users u on u.user_id = o.manager_id
   where o.outcome = 'open'
     and o.next_step_due between p_from and p_to
     and authz.can_see_opportunity_row(o.client_id, o.manager_id);
$$;

-- Οι προθεσμίες των Παραδοτέων που βλέπει ο Χρήστης, στις μέρες p_from..p_to. Ακυρωμένα και εγκεκριμένα φεύγουν.
create function authz.calendar_deadlines(p_from date, p_to date) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', d.id, 'day', d.deadline, 'title', d.title, 'clientName', coalesce(c.name, p.title),
           'assigneeId', d.assignee_id, 'assigneeName', u.name,
           'isMine', coalesce(d.assignee_id = auth.uid(), false)
         ) order by d.deadline, d.id), '[]'::jsonb)
    from public.deliverables d
    join public.productions p on p.id = d.production_id
    left join public.clients c on c.id = p.client_id
    left join public.team_users u on u.user_id = d.assignee_id
   where d.deadline between p_from and p_to
     and d.cancelled_at is null and d.approved_at is null
     and p.state = 'open'
     and (authz.deliverable_in_scope(d.id, 'deliverables.work') or authz.deliverable_in_scope(d.id, 'deliverables.review'));
$$;

-- Τα άτομα του φίλτρου: τα ενεργά μέλη, μόνο για όσους βλέπουν άλλους. Αλλιώς κενό (το φίλτρο δεν φαίνεται).
create function authz.calendar_people() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when authz.has('calendar.block_others') or authz.has('calendar.availability') then (
    select coalesce(jsonb_agg(jsonb_build_object('userId', u.user_id, 'name', u.name)
                              order by lower(u.name), u.user_id), '[]'::jsonb)
      from public.team_users u
     where u.is_active
  ) else '[]'::jsonb end;
$$;

-- Αντικαθιστά το 20261011100000: και οι δύο στρώσεις, ο ίδιος ο Χρήστης («Εγώ») και τα άτομα του φίλτρου.
create or replace function authz.calendar_team_view(
  p_from date, p_to date, p_from_at timestamptz, p_to_at timestamptz
) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'filmings', authz.calendar_team_filmings(p_from_at, p_to_at),
    'blocked', authz.calendar_team_blocked(p_from_at, p_to_at),
    'busy', authz.calendar_busy(p_from_at, p_to_at),
    'nextSteps', authz.calendar_next_steps(p_from, p_to),
    'deadlines', authz.calendar_deadlines(p_from, p_to),
    'days', authz.calendar_team_days(p_from, p_to),
    'canBlockOthers', authz.has('calendar.block_others'),
    'canBook', authz.has('filming.book'),
    'team', authz.calendar_team_members(),
    'people', authz.calendar_people(),
    'me', auth.uid()
  );
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.calendar_next_steps(date, date), authz.calendar_deadlines(date, date), authz.calendar_people()
  from public, anon, authenticated;
