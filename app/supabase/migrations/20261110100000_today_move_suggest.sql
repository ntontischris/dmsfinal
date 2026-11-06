-- Σήμερα ως ενημέρωση, κομμάτι 4 (#241 Σ9): ακύρωση ↔ μετάθεση στις γραμμές της κάρτας «Γυρίσματα προς έγκριση».
--
-- Μια ακύρωση αφήνει κενή τη θέση S (η ώρα και οι ώρες του Γυρίσματος που ακυρώνεται): είτε αίτημα ακύρωσης σε αναμονή
-- (scheduled + cancel_request_at) είτε ήδη ακυρωμένο Γύρισμα (cancelled), πάντα με S στο μέλλον. Αν ένα ανοιχτό αίτημα
-- μετάθεσης (scheduled + reschedule_starts_at) άλλου Πελάτη έχει διάρκεια (reschedule_hours) που χωρά στο S, και η ώρα S
-- χωρά στο Ωράριο και στη Χωρητικότητα χωρίς ΚΑΙ τα δύο Γυρίσματα (authz.today_slot_fits), η γραμμή παίρνει το πεδίο
--   suggest = { filming_id: το Γύρισμα της μετάθεσης, client: ο Πελάτης της μετάθεσης, starts_at: S,
--               is_freed: η θέση άδειασε ήδη (η ακύρωση εγκρίθηκε), link: η σελίδα του Γυρίσματος της μετάθεσης }
--  • Γραμμή ακύρωσης: η πρώτη μετάθεση που χωρά (με σειρά αιτήματος).
--  • Γραμμή μετάθεσης: η πρώτη θέση που αδειάζει ή άδειασε και τη χωρά (με σειρά ώρας).
-- Τίποτα δεν εφαρμόζεται μόνο του: είναι μόνο πρόταση. Ο πελάτης ζήτησε άλλη ώρα (reschedule_starts_at)· η πρόταση λέει
-- μόνο ότι η θέση «χωράει», ποτέ ότι τη θέλει. Χωρίς πρόταση το πεδίο λείπει (οι υπόλοιπες γραμμές μένουν ίδιες).
-- Δικαίωμα: όπως η κάρτα (authz.today_filming_approvals_open)· χωρίς αυτό 42501.
--
-- Γιατί όχι σκέτο authz.slot_problem: εξαιρεί ένα μόνο Γύρισμα. Το Γύρισμα που ακυρώνεται μετρά ακόμα (είναι scheduled),
-- και η μετάθεση μετρά με την αιτούμενη ώρα της· όταν ο πελάτης ζήτησε ακριβώς το S, θα μετρούσε δύο φορές. Το
-- authz.today_slot_fits κάνει τους ίδιους ελέγχους Ωραρίου και Χωρητικότητας (όχι διάρκειας/βήματος: αυτά είναι μόνο
-- για τον πελάτη, όπως στη μετάθεση από την ομάδα) με λίστα εξαιρέσεων. Για ήδη ακυρωμένη θέση δίνει ό,τι και το
-- authz.slot_problem (το τεστ το ελέγχει ως μαντείο).

-- ───────────── Θέση χωρίς κάποια Γυρίσματα ─────────────

-- Ίδιο με το authz.slot_load, με πολλές εξαιρέσεις.
create function authz.slot_load_without(p_starts timestamptz, p_ends timestamptz, p_exclude uuid[]) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  return (
    with spans as (
      select f.starts_at as span_start, authz.filming_end(f.starts_at, f.hours) as span_end
        from public.filmings f
       where f.state in ('pending', 'scheduled') and not (f.id = any (p_exclude))
      union all
      select f.reschedule_starts_at, authz.filming_end(f.reschedule_starts_at, f.reschedule_hours)
        from public.filmings f
       where f.state in ('pending', 'scheduled') and f.reschedule_starts_at is not null
         and not (f.id = any (p_exclude))
    ), points as (
      select p_starts as at_time
      union
      select sp.span_start from spans sp where sp.span_start >= p_starts and sp.span_start < p_ends
    )
    select coalesce(max((
        select count(*) from spans sp where sp.span_start <= pt.at_time and pt.at_time < sp.span_end
      )), 0)::integer
      from points pt);
end;
$$;

-- Η ώρα χωρά στο Ωράριο της μέρας και στη Χωρητικότητα, χωρίς τα Γυρίσματα p_exclude (ίδια σειρά με το authz.slot_problem).
create function authz.today_slot_fits(p_starts timestamptz, p_hours numeric, p_exclude uuid[]) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  h record;
  v_day date := (p_starts at time zone 'Europe/Athens')::date;
  v_end timestamptz := authz.filming_end(p_starts, p_hours);
begin
  select * into h from authz.day_hours(v_day);
  if not coalesce(h.is_open, false) then
    return false;
  end if;
  if p_starts < ((v_day + h.opens) at time zone 'Europe/Athens') or v_end > ((v_day + h.closes) at time zone 'Europe/Athens') then
    return false;
  end if;
  return authz.slot_load_without(p_starts, v_end, p_exclude) < h.capacity;
end;
$$;

-- Η πρόταση μιας γραμμής (kind cancel ή reschedule), ή null.
create function authz.today_move_suggestion(p_id uuid, p_kind text, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  f public.filmings;
  r record;
begin
  select x.* into f from public.filmings x where x.id = p_id;
  if not found or f.state <> 'scheduled' then
    return null;
  end if;
  if p_kind = 'cancel' then
    if f.cancel_request_at is null or f.starts_at <= p_now then
      return null;
    end if;
    select m.id, c.name into r
      from public.filmings m
      join public.clients c on c.id = m.client_id
     where m.state = 'scheduled' and m.reschedule_starts_at is not null and m.id <> f.id
       and m.client_id is distinct from f.client_id
       and m.reschedule_hours <= f.hours
       and authz.today_slot_fits(f.starts_at, m.reschedule_hours, array[f.id, m.id])
     order by m.reschedule_requested_at, m.id
     limit 1;
    if not found then
      return null;
    end if;
    return jsonb_build_object('filming_id', r.id, 'client', r.name, 'starts_at', f.starts_at, 'is_freed', false,
                              'link', '/app/filming/' || r.id);
  end if;
  if p_kind = 'reschedule' then
    if f.reschedule_starts_at is null or f.client_id is null then
      return null;
    end if;
    select s.starts_at, s.state = 'cancelled' as is_freed into r
      from public.filmings s
     where s.id <> f.id and s.starts_at > p_now
       and ((s.state = 'scheduled' and s.cancel_request_at is not null) or s.state = 'cancelled')
       and s.client_id is distinct from f.client_id
       and f.reschedule_hours <= s.hours
       and authz.today_slot_fits(s.starts_at, f.reschedule_hours, array[s.id, f.id])
     order by s.starts_at, s.id
     limit 1;
    if not found then
      return null;
    end if;
    return jsonb_build_object('filming_id', f.id, 'client', (select c.name from public.clients c where c.id = f.client_id),
                              'starts_at', r.starts_at, 'is_freed', r.is_freed, 'link', '/app/filming/' || f.id);
  end if;
  return null;
end;
$$;

-- ───────────── Η κάρτα ─────────────

create or replace function authz.today_items_filming_approvals(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_filming_approvals_open(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', x.kind || ':' || x.id::text, 'title', x.title,
             'subtitle', null, 'at', x.starts_at, 'urgent', x.starts_at <= p_now + interval '24 hours',
             'waiting_since', case x.kind when 'booking' then f.created_at
                                          when 'cancel' then f.cancel_request_at
                                          else f.reschedule_requested_at end,
             'slot_free', case when x.kind = 'booking' then authz.slot_problem(f.starts_at, f.hours, f.id, false) is null end,
             'link', '/app/filming/queue')
             || jsonb_strip_nulls(jsonb_build_object('suggest', authz.today_move_suggestion(x.id, x.kind, p_now)))
           order by x.starts_at, x.kind, x.id)
      from (select * from authz.today_filming_approvals_rows() r order by r.starts_at, r.kind, r.id limit 3) x
      join public.filmings f on f.id = x.id),
    '[]'::jsonb);
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.slot_load_without(timestamptz, timestamptz, uuid[]), authz.today_slot_fits(timestamptz, numeric, uuid[]),
  authz.today_move_suggestion(uuid, text, timestamptz)
  from public, anon, authenticated;
