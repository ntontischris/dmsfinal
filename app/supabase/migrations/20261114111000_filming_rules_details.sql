-- Γυρίσματα (L2): οι Κανόνες «χωρίς απάντηση» και «έγινε αυτόματα» τρέχουν (c6), η σελίδα Γυρίσματος λέει τι γίνεται με
-- την Παροχή και τη χρέωση (c7), και έχει επαφή στον χώρο, κατάσταση Google και σύνδεσμο αρχείων (c9).
--
-- Αρχές:
--  • filming_rules_apply(p_now): μόνο service role (cron /api/cron/filming-rules). Αναμένον Γύρισμα χωρίς απάντηση για
--    no_answer_hours εγκρίνεται ή απορρίπτεται· προγραμματισμένο με done_marking = 'auto' γίνεται «έγινε» την επόμενη μέρα
--    (Ώρα Ελλάδας) με ώρες τις προγραμματισμένες. Γύρισμα που αναιρέθηκε με το χέρι δεν ξανακλείνει αυτόματα.
--  • Τα στοιχεία του χώρου ζουν σε δικό τους πίνακα: το κλειστό Γύρισμα δεν αλλάζει (guard_filming_change), ενώ ο σύνδεσμος
--    αρχείων μπαίνει συνήθως μετά το «έγινε».
--  • Η σελίδα Γυρίσματος παίρνει «team» μόνο για την ομάδα: στοιχεία χώρου, Google, και τι γίνεται με τη χρέωση (χωρίς ποσά).

-- ───────────── Κανόνες σε εκτέλεση (c6) ─────────────

-- Το Γύρισμα αναιρέθηκε κάποτε με το χέρι («έγινε»/«δεν έγινε» → προγραμματισμένο).
create function authz.filming_was_undone(p_filming uuid) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
begin
  return exists (
    select 1 from public.audit_log l
     where l.entity = 'filmings' and l.entity_id = p_filming::text and l.action = 'event'
       and l.after ->> 'event' = 'outcome_undone');
end;
$$;

create function public.filming_rules_apply(p_now timestamptz default null) returns jsonb
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

-- ───────────── Στοιχεία χώρου (c9) ─────────────

create table public.filming_details (
  filming_id uuid primary key references public.filmings (id),
  contact_name text check (contact_name is null or length(trim(contact_name)) between 1 and 120),
  contact_phone text check (contact_phone is null or length(trim(contact_phone)) between 1 and 40),
  files_url text check (files_url is null or (files_url ~ '^https://[^\s]+$' and length(files_url) <= 1000)),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.filming_details enable row level security;
revoke all on table public.filming_details from anon, authenticated;
-- Χωρίς trigger Ίχνους: το audit_entity_allowed ξαναγράφεται ολόκληρο κάθε φορά και το αλλάζουν κι άλλες lanes.
-- Το ποιος και πότε μένει στη γραμμή (updated_by, updated_at).

-- Επαφή στον χώρο και σύνδεσμος αρχείων. Αλλάζει και σε κλειστό Γύρισμα (τα αρχεία έρχονται μετά το «έγινε»).
-- Τα γράφει όποιος κλείνει το Γύρισμα, όποιος είναι στο Συνεργείο του ή όποιος εγκρίνει Γυρίσματα.
create function public.filming_details_save(
  p_id uuid, p_contact_name text, p_contact_phone text, p_files_url text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := nullif(trim(coalesce(p_contact_name, '')), '');
  v_phone text := nullif(trim(coalesce(p_contact_phone, '')), '');
  v_url text := nullif(trim(coalesce(p_files_url, '')), '');
begin
  if not authz.is_team_user() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.filming_gate(p_id,
    authz.can_book_filming(p_id) or authz.can_crew_filming(p_id) or authz.can_approve_filming(), 'filming.book');
  if v_url is not null and v_url !~ '^https://[^\s]+$' then
    raise exception 'Ο σύνδεσμος αρχείων πρέπει να ξεκινά με https://' using errcode = 'P0001';
  end if;
  if length(coalesce(v_name, '')) > 120 or length(coalesce(v_phone, '')) > 40 or length(coalesce(v_url, '')) > 1000 then
    raise exception 'Πολύ μεγάλο κείμενο' using errcode = 'P0001';
  end if;
  insert into public.filming_details as d (filming_id, contact_name, contact_phone, files_url, updated_at, updated_by)
  values (p_id, v_name, v_phone, v_url, now(), auth.uid())
  on conflict (filming_id) do update
     set contact_name = excluded.contact_name, contact_phone = excluded.contact_phone,
         files_url = excluded.files_url, updated_at = excluded.updated_at, updated_by = excluded.updated_by;
end;
$$;

-- ───────────── Η σελίδα Γυρίσματος: τα στοιχεία της ομάδας ─────────────

-- Κατάσταση στο Google: off (χωρίς ημερολόγιο), error, queued, synced ή none (δεν γράφεται, π.χ. αναμένον).
create function authz.filming_google_json(p_filming uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  o public.google_outbox;
  v_written timestamptz;
begin
  if not exists (select 1 from public.google_calendar g where g.id and g.calendar_id is not null) then
    return jsonb_build_object('state', 'off', 'at', null, 'error', null);
  end if;
  select x.* into o from public.google_outbox x
   where x.entity = 'filming' and x.entity_id = p_filming and x.done_at is null
   order by x.id desc limit 1;
  if found then
    return jsonb_build_object('state', case when o.last_error <> '' then 'error' else 'queued' end,
                              'at', o.created_at, 'error', nullif(o.last_error, ''));
  end if;
  select l.written_at into v_written from public.google_links l where l.entity = 'filming' and l.entity_id = p_filming;
  return jsonb_build_object('state', case when v_written is null then 'none' else 'synced' end, 'at', v_written, 'error', null);
end;
$$;

-- Τι έγινε με τη χρέωση: το Τιμολογητέο του έξτρα Γυρίσματος (none, pending, invoiced) και αν η Συμφωνία καίει
-- την Παροχή στο «δεν έγινε». Χωρίς ποσά.
create function authz.filming_outcome_json(p_filming uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  f public.filmings;
  a public.agreements;
  v_billable uuid;
  v_kind_measure text;
begin
  select x.* into f from public.filmings x where x.id = p_filming;
  select ag.* into a from public.productions pr join public.agreements ag on ag.id = pr.agreement_id
   where pr.id = f.production_id;
  select b.id into v_billable from public.billables b where b.reason = 'extra_filming' and b.source_id = p_filming;
  select k.measure into v_kind_measure from public.provision_kinds k where k.id = f.kind_id;
  return jsonb_build_object(
    'billable', case
      when v_billable is null then 'none'
      when exists (select 1 from authz.billable_covered(f.client_id) c where c.billable_id = v_billable and c.covered > 0)
        then 'invoiced'
      else 'pending' end,
    'extraBillable', f.is_extra and a.id is not null and v_kind_measure = 'per_filming'
                     and coalesce(authz.billable_extra_price(a.id, f.kind_id), 0) > 0,
    'noShowBurns', coalesce(a.no_show_burns, false));
end;
$$;

create function authz.filming_team_json(p_filming uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  d public.filming_details;
begin
  select x.* into d from public.filming_details x where x.filming_id = p_filming;
  return jsonb_build_object(
    'details', jsonb_build_object('contactName', d.contact_name, 'contactPhone', d.contact_phone,
                                  'filesUrl', d.files_url, 'updatedAt', d.updated_at),
    'google', authz.filming_google_json(p_filming),
    'outcome', authz.filming_outcome_json(p_filming),
    'canEditDetails', authz.can_book_filming(p_filming) or authz.can_crew_filming(p_filming) or authz.can_approve_filming());
end;
$$;

-- Αντικαθιστά το 20261018100000: και «team» (μόνο για την ομάδα· ο Πελάτης παίρνει null).
create or replace function public.filming_view(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_filming_viewer();
  perform authz.filming_gate(p_id, authz.can_see_filming(p_id), 'filming.view');
  return authz.filming_card(p_id) || jsonb_build_object(
    'sheet', authz.filming_sheet_summary(p_id),
    'vacancies', case when authz.is_team_user() then authz.filming_vacancies_json(p_id) else '[]'::jsonb end,
    'team', case when authz.is_team_user() then authz.filming_team_json(p_id) end);
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function authz.filming_was_undone(uuid) from public, anon, authenticated;
revoke all on function authz.filming_google_json(uuid) from public, anon, authenticated;
revoke all on function authz.filming_outcome_json(uuid) from public, anon, authenticated;
revoke all on function authz.filming_team_json(uuid) from public, anon, authenticated;

revoke all on function public.filming_rules_apply(timestamptz) from public, anon, authenticated;
grant execute on function public.filming_rules_apply(timestamptz) to service_role;

revoke all on function public.filming_details_save(uuid, text, text, text) from public, anon;
grant execute on function public.filming_details_save(uuid, text, text, text) to authenticated;
