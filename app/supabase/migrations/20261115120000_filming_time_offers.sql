-- Γυρίσματα: «Προτείνω άλλη ώρα» (οδηγός «Εγκρίνω αιτήματα γυρίσματος», βήματα 2β και ⏳3).
--
-- Αρχές:
--  • Η ομάδα στέλνει στον Πελάτη 1–5 ελεύθερες ώρες για ένα αίτημα που περιμένει απάντηση (νέα κράτηση, μετάθεση,
--    ακύρωση μετά το Όριο). Η κράτηση του Πελάτη μένει όπως είναι μέχρι να διαλέξει.
--  • Ο Πελάτης διαλέγει μία στη σελίδα του Γυρίσματος: το Γύρισμα πάει εκεί και κλείνει χωρίς νέα έγκριση. Η βάση
--    ξαναελέγχει την ώρα τη στιγμή του πατήματος· όσες πιάστηκαν δεν φαίνονται πια.
--  • Όσο υπάρχει πρόταση, το αίτημα δεν είναι στην ουρά «Αναμένουν έγκριση» ούτε στη Σήμερα, και ο Κανόνας «χωρίς
--    απάντηση» δεν το εγκρίνει/απορρίπτει αυτόματα (η ομάδα απάντησε).
--  • Οι προτεινόμενες ώρες δεν δεσμεύουν χωρητικότητα.

create table public.filming_offers (
  filming_id uuid primary key references public.filmings (id) on delete cascade,
  times timestamptz[] not null check (cardinality(times) between 1 and 5),
  hours numeric not null check (hours > 0),
  note text check (note is null or length(note) <= 1000),
  offered_at timestamptz not null default now(),
  offered_by uuid
);

alter table public.filming_offers enable row level security;
revoke all on table public.filming_offers from anon, authenticated;

-- Το Γύρισμα έχει αίτημα που μπορεί να απαντηθεί με πρόταση ώρας.
create function authz.filming_offer_open(f public.filmings) returns boolean
language sql stable set search_path = ''
as $$
  select f.state = 'pending'
      or (f.state = 'scheduled' and (f.cancel_request_at is not null or f.reschedule_starts_at is not null));
$$;

-- Μία ώρα χωράει ακόμα: μελλοντική, μέσα στο Ωράριο και με χώρο.
create function authz.offer_time_free(p_starts timestamptz, p_hours numeric, p_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select p_starts > now() and authz.slot_problem(p_starts, p_hours, p_id, false) is null; $$;

-- ───────────── Ομάδα ─────────────

create function public.filming_offer_times(p_id uuid, p_times timestamptz[], p_note text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_hours numeric;
  v_time timestamptz;
  v_times timestamptz[];
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  perform authz.require('filming.approve');
  perform authz.filming_gate(p_id, authz.can_approve_filming(), 'filming.approve');
  perform pg_advisory_xact_lock(hashtext('dms.booking'));
  select x.* into f from public.filmings x where x.id = p_id for update;
  if not authz.filming_offer_open(f) then
    raise exception 'Αυτό το Γύρισμα δεν περιμένει απάντηση' using errcode = 'P0001';
  end if;
  v_times := array(select distinct t from unnest(coalesce(p_times, '{}')) t order by t);
  if cardinality(v_times) not between 1 and 5 then
    raise exception 'Διάλεξε από 1 έως 5 ώρες' using errcode = 'P0001';
  end if;
  v_hours := coalesce(f.reschedule_hours, f.hours);
  foreach v_time in array v_times loop
    if not authz.offer_time_free(v_time, v_hours, p_id) then
      raise exception 'Μία από τις ώρες δεν είναι πια ελεύθερη· ξαναδιάλεξε' using errcode = 'P0001';
    end if;
  end loop;
  insert into public.filming_offers (filming_id, times, hours, note, offered_by)
  values (p_id, v_times, v_hours, v_note, auth.uid())
  on conflict (filming_id) do update
    set times = excluded.times, hours = excluded.hours, note = excluded.note,
        offered_at = now(), offered_by = excluded.offered_by;
  perform authz.filming_event(p_id, 'times_offered', jsonb_build_object('times', to_jsonb(v_times)));
end;
$$;

create function public.filming_offer_withdraw(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('filming.approve');
  perform authz.filming_gate(p_id, authz.can_approve_filming(), 'filming.approve');
  delete from public.filming_offers o where o.filming_id = p_id;
  if found then
    perform authz.filming_event(p_id, 'offer_withdrawn', '{}'::jsonb);
  end if;
end;
$$;

-- Οι πρώτες p_count ελεύθερες ώρες μετά τη ζητημένη (και μετά το τώρα), μέσα στο Ωράριο, έως 30 μέρες μπροστά.
create function public.filming_offer_candidates(p_id uuid, p_count integer) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_hours numeric;
  v_from timestamptz;
  v_day date;
  v_time timestamptz;
  v_found timestamptz[] := '{}';
begin
  perform authz.require('filming.approve');
  perform authz.filming_gate(p_id, authz.can_approve_filming(), 'filming.approve');
  select x.* into f from public.filmings x where x.id = p_id;
  v_hours := coalesce(f.reschedule_hours, f.hours);
  v_from := greatest(coalesce(f.reschedule_starts_at, f.starts_at), now());
  v_day := (v_from at time zone 'Europe/Athens')::date;
  for i in 0..30 loop
    exit when cardinality(v_found) >= least(greatest(p_count, 1), 5);
    for v_time in select t from authz.day_candidates(v_day + i, v_hours) t order by t loop
      exit when cardinality(v_found) >= least(greatest(p_count, 1), 5);
      if v_time > v_from and authz.offer_time_free(v_time, v_hours, p_id) then
        v_found := v_found || v_time;
      end if;
    end loop;
  end loop;
  return jsonb_build_object('times', to_jsonb(v_found), 'hours', v_hours);
end;
$$;

-- ───────────── Ομάδα και Πελάτης ─────────────

-- Η πρόταση που ισχύει, με όσες ώρες είναι ακόμα ελεύθερες· null αν δεν υπάρχει ή δεν τη βλέπει ο Χρήστης.
create function public.filming_offer_view(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
  o public.filming_offers;
begin
  if not (authz.can_approve_filming() or authz.is_client_of_filming(p_id)) then
    return null;
  end if;
  select x.* into f from public.filmings x where x.id = p_id;
  select x.* into o from public.filming_offers x where x.filming_id = p_id;
  if o.filming_id is null or not authz.filming_offer_open(f) then
    return null;
  end if;
  return jsonb_build_object(
    'times', coalesce((select jsonb_agg(t order by t) from unnest(o.times) t
                        where authz.offer_time_free(t, o.hours, p_id)), '[]'::jsonb),
    'offered', cardinality(o.times),
    'hours', o.hours,
    'note', o.note,
    'offeredAt', o.offered_at);
end;
$$;

-- ───────────── Πελάτης ─────────────

create function public.filming_pick_offer(p_id uuid, p_starts timestamptz) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
  o public.filming_offers;
begin
  perform authz.require_client_permission('c.book');
  perform authz.filming_gate(p_id, authz.is_client_of_filming(p_id), 'c.book');
  perform pg_advisory_xact_lock(hashtext('dms.booking'));
  select x.* into f from public.filmings x where x.id = p_id for update;
  select x.* into o from public.filming_offers x where x.filming_id = p_id for update;
  if o.filming_id is null or not authz.filming_offer_open(f) then
    raise exception 'Δεν υπάρχει πια πρόταση ώρας για αυτό το Γύρισμα' using errcode = 'P0001';
  end if;
  if not (p_starts = any (o.times)) then
    raise exception 'Αυτή η ώρα δεν είναι στις προτεινόμενες' using errcode = 'P0001';
  end if;
  if not authz.offer_time_free(p_starts, o.hours, p_id) then
    raise exception 'Η ώρα πιάστηκε μόλις τώρα· διάλεξε άλλη' using errcode = 'P0001';
  end if;
  update public.filmings x
     set cancel_request_at = null, cancel_request_by = null, cancel_request_reason = null
   where x.id = p_id and x.cancel_request_at is not null;
  perform authz.filming_move(p_id, p_starts, o.hours);
  if f.state = 'pending' then
    update public.filmings x set state = 'scheduled', approved_at = now(), approved_by = o.offered_by where x.id = p_id;
    perform authz.filming_event(p_id, 'approved', jsonb_build_object('offer', true));
  end if;
  delete from public.filming_offers x where x.filming_id = p_id;
  perform authz.filming_event(p_id, 'offer_picked', jsonb_build_object('startsAt', p_starts));
end;
$$;

-- ───────────── Η ουρά δεν δείχνει όσα περιμένουν τον Πελάτη ─────────────

-- Αντικαθιστά το 20261016110000: ίδιο, χωρίς τα Γυρίσματα με πρόταση ώρας.
create or replace function authz.today_filming_approvals_rows()
returns table (id uuid, title text, starts_at timestamptz, kind text)
language sql stable security definer set search_path = ''
as $$
  select f.id, coalesce(c.name, pr.title) || ': κράτηση', f.starts_at, 'booking'
    from public.filmings f
    join public.productions pr on pr.id = f.production_id
    left join public.clients c on c.id = f.client_id
   where f.state = 'pending'
     and not exists (select 1 from public.filming_offers o where o.filming_id = f.id)
  union all
  select f.id, coalesce(c.name, pr.title) || ': ζητά ακύρωση', f.starts_at, 'cancel'
    from public.filmings f
    join public.productions pr on pr.id = f.production_id
    join public.agreements a on a.id = pr.agreement_id
    left join public.clients c on c.id = f.client_id
   where f.state = 'scheduled' and f.cancel_request_at is not null
     and not exists (select 1 from public.filming_offers o where o.filming_id = f.id)
  union all
  select f.id, coalesce(c.name, pr.title) || ': ζητά μετάθεση', least(f.starts_at, f.reschedule_starts_at), 'reschedule'
    from public.filmings f
    join public.productions pr on pr.id = f.production_id
    left join public.clients c on c.id = f.client_id
   where f.state = 'scheduled' and f.reschedule_starts_at is not null
     and not exists (select 1 from public.filming_offers o where o.filming_id = f.id);
$$;

-- Αντικαθιστά το 20261010120000: ίδιο, χωρίς τα Γυρίσματα με πρόταση ώρας.
create or replace function public.filming_queue_view() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_no_answer integer := (select s.no_answer_hours from public.filming_settings s where s.id);
  v_pending jsonb;
  v_requests jsonb;
  v_reschedules jsonb;
begin
  perform authz.require('filming.approve');
  if not authz.can_approve_filming() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(x.entry order by x.created_at, x.id), '[]'::jsonb) into v_pending
    from (
      select f.id, f.created_at, jsonb_build_object(
          'id', f.id, 'startsAt', f.starts_at, 'hours', f.hours, 'createdAt', f.created_at,
          'waitingHours', round((extract(epoch from (now() - f.created_at)) / 3600)::numeric, 1),
          'waitingLong', (now() - f.created_at) > make_interval(hours => v_no_answer),
          'client', (select jsonb_build_object('id', c.id, 'name', c.name) from public.clients c where c.id = f.client_id),
          'production', (select jsonb_build_object('id', pr.id, 'title', pr.title) from public.productions pr where pr.id = f.production_id),
          'provision', authz.filming_balance_json(f.id)
        ) as entry
        from public.filmings f
       where f.state = 'pending'
         and not exists (select 1 from public.filming_offers o where o.filming_id = f.id)
    ) x;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', f.id, 'startsAt', f.starts_at, 'hours', f.hours,
           'requestedAt', f.cancel_request_at, 'reason', f.cancel_request_reason,
           'client', (select jsonb_build_object('id', c.id, 'name', c.name) from public.clients c where c.id = f.client_id),
           'production', (select jsonb_build_object('id', pr.id, 'title', pr.title) from public.productions pr where pr.id = f.production_id),
           'willBurn', a.late_cancel_burns
         ) order by f.cancel_request_at, f.id), '[]'::jsonb)
    into v_requests
    from public.filmings f
    join public.productions pr on pr.id = f.production_id
    join public.agreements a on a.id = pr.agreement_id
   where f.state = 'scheduled' and f.cancel_request_at is not null
     and not exists (select 1 from public.filming_offers o where o.filming_id = f.id);
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', f.id, 'startsAt', f.starts_at, 'hours', f.hours,
           'newStartsAt', f.reschedule_starts_at, 'newHours', f.reschedule_hours, 'requestedAt', f.reschedule_requested_at,
           'client', (select jsonb_build_object('id', c.id, 'name', c.name) from public.clients c where c.id = f.client_id),
           'production', (select jsonb_build_object('id', pr.id, 'title', pr.title) from public.productions pr where pr.id = f.production_id),
           'slotProblem', case when f.reschedule_starts_at <= now() then 'Η νέα ώρα πέρασε'
                               else authz.slot_problem(f.reschedule_starts_at, f.reschedule_hours, f.id, true) end
         ) order by f.reschedule_requested_at, f.id), '[]'::jsonb)
    into v_reschedules
    from public.filmings f
   where f.state = 'scheduled' and f.reschedule_starts_at is not null
     and not exists (select 1 from public.filming_offers o where o.filming_id = f.id);
  return jsonb_build_object('pending', v_pending, 'cancelRequests', v_requests, 'rescheduleRequests', v_reschedules);
end;
$$;

-- Αντικαθιστά το 20261114111000: ίδιο, αλλά αναμένον Γύρισμα με πρόταση ώρας δεν είναι «χωρίς απάντηση».
create or replace function public.filming_rules_apply(p_now timestamptz default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  s public.filming_settings;
  v_id uuid;
  v_hours numeric;
  v_reason text;
  v_approved integer := 0;
  v_rejected integer := 0;
  v_done integer := 0;
begin
  select x.* into s from public.filming_settings x where x.id;
  if s.no_answer_action in ('approve', 'reject') then
    v_reason := format('Αυτόματα: χωρίς απάντηση σε %s ώρες', s.no_answer_hours);
    for v_id in
      select f.id from public.filmings f
       where f.state = 'pending' and f.created_at <= v_now - make_interval(hours => s.no_answer_hours)
         and not exists (select 1 from public.filming_offers o where o.filming_id = f.id)
       order by f.created_at, f.id
         for update skip locked
    loop
      if s.no_answer_action = 'approve' then
        update public.filmings f set state = 'scheduled', approved_at = v_now where f.id = v_id;
        perform authz.filming_event(v_id, 'approved', jsonb_build_object('auto', true));
        v_approved := v_approved + 1;
      else
        update public.filmings f set state = 'rejected', rejected_at = v_now, rejected_reason = v_reason where f.id = v_id;
        perform authz.filming_event(v_id, 'rejected', jsonb_build_object('reason', v_reason, 'auto', true));
        v_rejected := v_rejected + 1;
      end if;
    end loop;
  end if;
  if s.done_marking = 'auto' then
    for v_id, v_hours in
      select f.id, f.hours from public.filmings f
       where f.state = 'scheduled'
         and authz.today_work_day(authz.filming_end(f.starts_at, f.hours)) < authz.today_work_day(v_now)
         and not authz.filming_was_undone(f.id)
       order by f.starts_at, f.id
         for update skip locked
    loop
      update public.filmings f
         set state = 'done', done_at = v_now, actual_hours = v_hours, burned = false
       where f.id = v_id;
      perform authz.filming_event(v_id, 'done', jsonb_build_object('actualHours', v_hours, 'auto', true));
      v_done := v_done + 1;
    end loop;
  end if;
  return jsonb_build_object('approved', v_approved, 'rejected', v_rejected, 'done', v_done);
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function authz.filming_offer_open(public.filmings) from public, anon, authenticated;
revoke all on function authz.offer_time_free(timestamptz, numeric, uuid) from public, anon, authenticated;

revoke all on function public.filming_offer_times(uuid, timestamptz[], text) from public, anon;
revoke all on function public.filming_offer_withdraw(uuid) from public, anon;
revoke all on function public.filming_offer_candidates(uuid, integer) from public, anon;
revoke all on function public.filming_offer_view(uuid) from public, anon;
revoke all on function public.filming_pick_offer(uuid, timestamptz) from public, anon;
grant execute on function public.filming_offer_times(uuid, timestamptz[], text) to authenticated;
grant execute on function public.filming_offer_withdraw(uuid) to authenticated;
grant execute on function public.filming_offer_candidates(uuid, integer) to authenticated;
grant execute on function public.filming_offer_view(uuid) to authenticated;
grant execute on function public.filming_pick_offer(uuid, timestamptz) to authenticated;
