-- Παραδοτέα, πλευρά ομάδας (H1, H2, G2 Παραδοτέα): Παραδοτέο ανήκει σε Παραγωγή, έχει είδος Παροχής πλήθους,
-- Εκδόσεις με link, σχόλια, απόφαση χρέωσης και ακύρωση. Κεφ. 3 (Παραδοτέα), ADR 0007, 0008, 0010.
-- Ο πελάτης (#142), οι Κανόνες (#141) και τα email και οι αυτοματισμοί (#143) έρχονται μετά· εδώ οι προεπιλογές είναι σταθερές.
--
-- Αρχές:
--  • Οι πίνακες είναι κλειστοί για την εφαρμογή (RLS χωρίς policies, χωρίς grants)· όλα περνούν από τα public.deliverable* RPC.
--  • Η κατάσταση του Παραδοτέου βγαίνει από την τελευταία Έκδοση (authz.deliverable_state)· δεν αποθηκεύεται.
--  • Δικαίωμα: deliverables.work (all, ή mine = όσα με αφορούν), deliverables.review (all), finance.cost για τη χρέωση.
--    Έλεγχος Δικαιώματος ΠΡΩΤΑ (42501, χωρίς oracle ύπαρξης), όπως στο filming_gate.
--  • Παροχές: το Παραδοτέο μετράει στο υπόλοιπο της Περιόδου μέσω της authz.kind_units (επεκτάθηκε εδώ)· μόνο είδη πλήθους.
--  • Ίχνος: οι τρεις πίνακες ελέγχονται από authz.audit_entity_allowed. Ποσά και κόστος δεν μπαίνουν εδώ.

-- ───────────── Πίνακες ─────────────

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions (id),
  -- Μόνο είδη πλήθους (measure is null)· ο έλεγχος γίνεται στη deliverable_create.
  kind_id uuid not null references public.provision_kinds (id),
  title text not null check (length(trim(title)) > 0 and length(title) <= 200),
  assignee_id uuid references public.team_users (user_id),
  filming_id uuid references public.filmings (id),
  -- Η Περίοδος της Παραγωγής τη στιγμή της δημιουργίας· null για εφάπαξ και Εσωτερικές.
  period_id uuid references public.agreement_periods (id),
  charge text not null check (charge in ('included', 'free', 'charged', 'pending')),
  charge_reason text check (charge_reason is null or length(trim(charge_reason)) > 0),
  deadline date,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason text check (cancel_reason is null or length(trim(cancel_reason)) > 0),
  cancel_outcome text check (cancel_outcome in ('consumed', 'returned')),
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check ((cancelled_at is null) = (cancel_reason is null)),
  check ((cancelled_at is null) = (cancel_outcome is null)),
  check (cancelled_at is null or approved_at is null)
);

create index deliverables_production_idx on public.deliverables (production_id);
create index deliverables_assignee_idx on public.deliverables (assignee_id);
create index deliverables_filming_idx on public.deliverables (filming_id);
create index deliverables_period_kind_idx on public.deliverables (period_id, kind_id);

create table public.deliverable_versions (
  deliverable_id uuid not null references public.deliverables (id),
  number integer not null check (number >= 1),
  url text not null check (length(url) between 1 and 2000),
  host text not null check (length(host) between 1 and 200),
  state text not null check (state in ('in_review', 'returned', 'awaiting_client', 'approved', 'changes_requested', 'superseded')),
  note text check (note is null or length(trim(note)) > 0),
  review_note text check (review_note is null or length(trim(review_note)) > 0),
  created_at timestamptz not null default now(),
  created_by uuid,
  sent_at timestamptz,
  sent_by uuid,
  answered_at timestamptz,
  answered_by uuid,
  answer_note text check (answer_note is null or length(trim(answer_note)) > 0),
  link_broken_at timestamptz,
  primary key (deliverable_id, number)
);

create table public.deliverable_comments (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null,
  version_number integer not null,
  body text not null check (length(trim(body)) between 1 and 2000),
  at_seconds integer check (at_seconds is null or at_seconds between 0 and 86399),
  is_internal boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid,
  foreign key (deliverable_id, version_number) references public.deliverable_versions (deliverable_id, number)
);

create index deliverable_comments_version_idx on public.deliverable_comments (deliverable_id, version_number);

alter table public.deliverables enable row level security;
alter table public.deliverable_versions enable row level security;
alter table public.deliverable_comments enable row level security;

revoke all on table public.deliverables, public.deliverable_versions, public.deliverable_comments from anon, authenticated;

-- ───────────── Κανόνες και προεπιλογές (σταθερά μέχρι το #141) ─────────────

-- Εσωτερικός έλεγχος: ενεργός. Το #141 θα τη διαβάζει από πίνακα.
create function authz.deliverable_rule_internal_review() returns boolean
language sql stable set search_path = ''
as $$ select true; $$;

-- Εργάσιμες μέρες προθεσμίας ανά είδος Παροχής.
create function authz.deliverable_kind_days(p_kind uuid) returns integer
language sql stable set search_path = ''
as $$
  select case (select k.code from public.provision_kinds k where k.id = p_kind)
    when 'reel' then 5
    when 'video' then 10
    when 'photo' then 3
    when 'podcast_episode' then 5
    else 5
  end;
$$;

-- Η n-οστή εργάσιμη μέρα μετά την p_from (Δευτέρα ως Παρασκευή, χωρίς αργίες).
create function authz.add_working_days(p_from date, p_days integer) returns date
language plpgsql stable set search_path = ''
as $$
declare
  v_day date := p_from;
  v_left integer := p_days;
begin
  while v_left > 0 loop
    v_day := v_day + 1;
    if public.is_working_day(v_day) then
      v_left := v_left - 1;
    end if;
  end loop;
  return v_day;
end;
$$;

-- Προθεσμία που ξεκινά τώρα: χωρίς Γύρισμα, ή με Γύρισμα που έγινε. Αλλιώς null (περιμένει το Γύρισμα).
create function authz.deliverable_deadline_for(p_kind uuid, p_filming uuid) returns date
language sql stable set search_path = ''
as $$
  select case
    when p_filming is null or exists (select 1 from public.filmings f where f.id = p_filming and f.state = 'done')
      then authz.add_working_days(public.sales_today(), authz.deliverable_kind_days(p_kind))
  end;
$$;

-- ───────────── Βοηθητικές συναρτήσεις ─────────────

-- Η κατάσταση του Παραδοτέου: ακυρωμένο, αλλιώς draft χωρίς Έκδοση, αλλιώς η κατάσταση της τελευταίας Έκδοσης.
create function authz.deliverable_state(p_deliverable uuid) returns text
language sql stable set search_path = ''
as $$
  select case
           when d.cancelled_at is not null then 'cancelled'
           else coalesce((
             select v.state from public.deliverable_versions v
              where v.deliverable_id = d.id
              order by v.number desc limit 1
           ), 'draft')
         end
    from public.deliverables d
   where d.id = p_deliverable;
$$;

-- Ο αριθμός της τελευταίας Έκδοσης (null αν δεν υπάρχει).
create function authz.deliverable_current_number(p_deliverable uuid) returns integer
language sql stable set search_path = ''
as $$
  select max(v.number) from public.deliverable_versions v where v.deliverable_id = p_deliverable;
$$;

-- Host επιτρεπτής πλατφόρμας. Μόνο https, λίστα επιτρεπτών hosts (Π5). Αλλιώς P0001.
create function authz.deliverable_host(p_url text) returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v_host text;
begin
  if length(coalesce(p_url, '')) > 2000 then
    raise exception 'Το link είναι πολύ μεγάλο' using errcode = 'P0001';
  end if;
  v_host := substring(lower(coalesce(p_url, '')) from '^https://([^/?#\s]+)');
  if v_host is null then
    raise exception 'Το link θέλει https' using errcode = 'P0001';
  end if;
  v_host := regexp_replace(v_host, '^www\.', '');
  if v_host not in ('drive.google.com', 'docs.google.com', 'vimeo.com', 'youtube.com', 'youtu.be') then
    raise exception 'Το link δεν είναι από επιτρεπτή πλατφόρμα' using errcode = 'P0001';
  end if;
  return v_host;
end;
$$;

-- Με αφορά, για το Δικαίωμα p_perm: όλα, ή όσα έχουν ως υπεύθυνο ή Μέλος.
create function authz.deliverable_in_scope(p_deliverable uuid, p_perm text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case authz.scope(p_perm)
    when 'all' then true
    when 'mine' then exists (
      select 1 from public.deliverables d
       where d.id = p_deliverable
         and (d.assignee_id = auth.uid() or authz.is_production_participant(d.production_id))
    )
    else false
  end;
$$;

-- Η Παραγωγή είναι μέσα στο Εύρος του Δικαιώματος p_perm (για δημιουργία Παραδοτέου).
create function authz.production_in_scope(p_production uuid, p_perm text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case authz.scope(p_perm)
    when 'all' then true
    when 'mine' then authz.is_production_participant(p_production)
    else false
  end;
$$;

-- Έλεγχος Δικαιώματος ΠΡΩΤΑ, μετά ύπαρξη, μετά Εύρος. Για ανύπαρκτη Παραγωγή: P0001 μόνο σε Εύρος «όλα».
create function authz.require_production_scope(p_production uuid, p_perm text) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if authz.scope(p_perm) is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_production is null or not exists (select 1 from public.productions p where p.id = p_production) then
    if authz.scope(p_perm) = 'all' then
      raise exception 'Η Παραγωγή δεν βρέθηκε' using errcode = 'P0001';
    end if;
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if not authz.production_in_scope(p_production, p_perm) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Έλεγχος Δικαιώματος ΠΡΩΤΑ, μετά ύπαρξη, μετά Εύρος, για ενέργειες σε υπάρχον Παραδοτέο.
create function authz.deliverable_gate(p_deliverable uuid, p_perm text) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if authz.scope(p_perm) is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_deliverable is null or not exists (select 1 from public.deliverables d where d.id = p_deliverable) then
    if authz.scope(p_perm) = 'all' then
      raise exception 'Το Παραδοτέο δεν βρέθηκε' using errcode = 'P0001';
    end if;
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if not authz.deliverable_in_scope(p_deliverable, p_perm) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Βλέπει ο Χρήστης το Παραδοτέο: Εύρος στην εργασία ή στον έλεγχο. Χωρίς κανένα από τα δύο, 42501 πρώτα.
create function authz.require_deliverable_view(p_deliverable uuid) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if authz.scope('deliverables.work') is null and authz.scope('deliverables.review') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_deliverable is null or not exists (select 1 from public.deliverables d where d.id = p_deliverable) then
    if coalesce(authz.scope('deliverables.work'), '') = 'all' or coalesce(authz.scope('deliverables.review'), '') = 'all' then
      raise exception 'Το Παραδοτέο δεν βρέθηκε' using errcode = 'P0001';
    end if;
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if not (authz.deliverable_in_scope(p_deliverable, 'deliverables.work')
          or authz.deliverable_in_scope(p_deliverable, 'deliverables.review')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Το Γύρισμα (αν δίνεται) ανήκει στην ίδια Παραγωγή και δεν έχει κλείσει ως ακυρωμένο ή απορριμμένο.
create function authz.check_deliverable_filming(p_production uuid, p_filming uuid) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_filming is null then
    return;
  end if;
  if not exists (
    select 1 from public.filmings f
     where f.id = p_filming and f.production_id = p_production and f.state not in ('cancelled', 'rejected')
  ) then
    raise exception 'Το Γύρισμα δεν ανήκει στην Παραγωγή' using errcode = 'P0001';
  end if;
end;
$$;

-- Ο Υπεύθυνος του Παραδοτέου είναι ενεργός Χρήστης ομάδας. Αν δεν είναι Μέλος ή Υπεύθυνος, γίνεται Μέλος «από ανάθεση».
create function authz.check_deliverable_assignee(p_production uuid, p_assignee uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_assignee is null then
    return;
  end if;
  if not exists (select 1 from public.team_users u where u.user_id = p_assignee and u.is_active) then
    raise exception 'Ο υπεύθυνος δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.productions p where p.id = p_production and p.owner_id = p_assignee)
     or exists (select 1 from public.production_members m where m.production_id = p_production and m.user_id = p_assignee) then
    return;
  end if;
  insert into public.production_members (production_id, user_id, added_by) values (p_production, p_assignee, auth.uid());
  perform authz.production_event(p_production, 'member_added', jsonb_build_object('user_id', p_assignee, 'reason', 'assignment'));
end;
$$;

-- Μονάδες που καταναλώνει (used) ή δεσμεύει (reserved) ένα Παραδοτέο πλήθους. Μόνο charge 'included'.
-- Περίοδος (p_period) ή, για εφάπαξ, η Συμφωνία με p_period null (όπως στα Γυρίσματα, authz.kind_filmings).
-- Δεσμευμένα: μη ακυρωμένα και μη εγκεκριμένα. Καταναλωμένα: εγκεκριμένα, ή ακυρωμένα με outcome 'consumed'.
create function authz.deliverable_units(p_agreement uuid, p_period uuid, p_kind uuid, p_stage text) returns numeric
language sql stable security definer set search_path = ''
as $$
  select count(*)::numeric
    from public.deliverables d
    join public.productions pr on pr.id = d.production_id
   where pr.agreement_id = p_agreement
     and (case when p_period is not null then d.period_id = p_period else d.period_id is null end)
     and d.kind_id = p_kind
     and d.charge = 'included'
     and case
           when p_stage = 'reserved' then d.cancelled_at is null and d.approved_at is null
           else (d.approved_at is not null) or (d.cancelled_at is not null and d.cancel_outcome = 'consumed')
         end;
$$;

-- Κάρτα Παραδοτέου για λίστες και σελίδα. Η ουρά και η σελίδα Παραγωγής παίρνουν από εδώ τα πεδία τους.
create function authz.deliverable_card(p_deliverable uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  d public.deliverables;
  v_production public.productions;
  v_latest public.deliverable_versions;
  v_state text;
  v_today date := public.sales_today();
  v_rounds_used integer;
  v_rounds_limit integer;
  v_days integer := 0;
  v_late boolean;
begin
  select * into d from public.deliverables x where x.id = p_deliverable;
  if not found then
    return null;
  end if;
  select * into v_production from public.productions p where p.id = d.production_id;
  select * into v_latest from public.deliverable_versions v where v.deliverable_id = d.id order by v.number desc limit 1;
  v_state := authz.deliverable_state(d.id);
  select count(*) into v_rounds_used from public.deliverable_versions v where v.deliverable_id = d.id and v.state = 'changes_requested';
  select r.rounds into v_rounds_limit from public.agreement_revision_limits r
   where r.agreement_id = v_production.agreement_id and r.kind_id = d.kind_id;
  v_late := d.deadline is not null and d.deadline < v_today and v_state not in ('approved', 'awaiting_client', 'cancelled');
  if v_state = 'awaiting_client' and v_latest.sent_at is not null then
    v_days := v_today - (v_latest.sent_at at time zone 'Europe/Athens')::date;
  elsif v_state = 'in_review' and v_latest.created_at is not null then
    v_days := v_today - (v_latest.created_at at time zone 'Europe/Athens')::date;
  end if;
  return jsonb_build_object(
    'id', d.id,
    'title', d.title,
    'productionId', v_production.id,
    'production', v_production.title,
    'client', (select c.name from public.clients c where c.id = v_production.client_id),
    'kind', (select k.label from public.provision_kinds k where k.id = d.kind_id),
    'kindId', d.kind_id,
    'assigneeId', d.assignee_id,
    'assigneeName', (select u.name from public.team_users u where u.user_id = d.assignee_id),
    'filmingId', d.filming_id,
    'deadline', d.deadline,
    'isLate', v_late,
    'state', v_state,
    'daysWaiting', v_days,
    'overLimit', v_rounds_limit is not null and v_rounds_used >= v_rounds_limit,
    'linkBroken', v_latest.link_broken_at is not null,
    'versionCount', (select count(*) from public.deliverable_versions v where v.deliverable_id = d.id),
    'roundsUsed', v_rounds_used,
    'roundsLimit', v_rounds_limit,
    'charge', d.charge,
    'chargeReason', d.charge_reason,
    'approvedAt', d.approved_at,
    'cancelledAt', d.cancelled_at,
    'cancelReason', d.cancel_reason,
    'cancelOutcome', d.cancel_outcome
  );
end;
$$;

-- Εκδόσεις με τα σχόλιά τους, νεότερη πρώτη.
create function authz.deliverable_versions_json(p_deliverable uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'number', v.number, 'url', v.url, 'host', v.host, 'state', v.state, 'note', v.note,
           'reviewNote', v.review_note, 'createdAt', v.created_at, 'sentAt', v.sent_at,
           'answeredAt', v.answered_at, 'answerNote', v.answer_note, 'linkBroken', v.link_broken_at is not null,
           'comments', (
             select coalesce(jsonb_agg(jsonb_build_object(
                      'id', c.id, 'body', c.body, 'atSeconds', c.at_seconds, 'isInternal', c.is_internal,
                      'createdAt', c.created_at, 'authorName', u.name
                    ) order by c.created_at, c.id), '[]'::jsonb)
               from public.deliverable_comments c
               left join public.team_users u on u.user_id = c.created_by
              where c.deliverable_id = v.deliverable_id and c.version_number = v.number
           )
         ) order by v.number desc), '[]'::jsonb)
    from public.deliverable_versions v
   where v.deliverable_id = p_deliverable;
$$;

-- Τι μπορεί να κάνει ο Χρήστης στο Παραδοτέο τώρα.
create function authz.deliverable_viewer_can(p_deliverable uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_state text := authz.deliverable_state(p_deliverable);
  v_work boolean := authz.deliverable_in_scope(p_deliverable, 'deliverables.work');
  v_review boolean := authz.deliverable_in_scope(p_deliverable, 'deliverables.review');
  v_internal boolean;
  v_pending boolean;
begin
  select p.client_id is null into v_internal
    from public.deliverables d join public.productions p on p.id = d.production_id
   where d.id = p_deliverable;
  v_pending := exists (select 1 from public.deliverables d where d.id = p_deliverable and d.charge = 'pending');
  return jsonb_build_object(
    'addVersion', v_work and v_state not in ('approved', 'cancelled'),
    'send', v_review and v_state = 'in_review',
    'return', v_review and v_state = 'in_review',
    'approveInternal', v_review and coalesce(v_internal, false) and v_state in ('in_review', 'awaiting_client'),
    'cancel', v_work and v_state not in ('approved', 'cancelled'),
    'comment', v_work and v_state not in ('draft', 'cancelled'),
    'decideCharge', authz.has('finance.cost') and v_pending,
    'edit', v_work and v_state <> 'cancelled'
  );
end;
$$;

-- Παροχές πλήθους: προστέθηκαν τα Παραδοτέα (δεσμευμένα και καταναλωμένα) στο ίδιο μέτρημα με τα Γυρίσματα.
create or replace function authz.kind_units(p_agreement uuid, p_period uuid, p_kind uuid, p_stage text) returns numeric
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_measure text := (select k.measure from public.provision_kinds k where k.id = p_kind);
begin
  if v_measure = 'per_hour' then
    return coalesce((
      select sum(coalesce(f.actual_hours, f.hours))
        from authz.kind_filmings(p_agreement, p_period, p_kind, p_stage) f
    ), 0);
  end if;
  if v_measure = 'per_day' then
    return (
      select count(distinct (f.starts_at at time zone 'Europe/Athens')::date)
        from authz.kind_filmings(p_agreement, p_period, p_kind, p_stage) f
       where p_stage = 'used' or not exists (
         select 1 from authz.kind_filmings(p_agreement, p_period, p_kind, 'used') u
          where (u.starts_at at time zone 'Europe/Athens')::date = (f.starts_at at time zone 'Europe/Athens')::date)
    );
  end if;
  return (select count(*)::numeric from authz.kind_filmings(p_agreement, p_period, p_kind, p_stage) f)
         + authz.deliverable_units(p_agreement, p_period, p_kind, p_stage);
end;
$$;

-- Η Παραγωγή έχει δουλειά αν έχει Γύρισμα ενεργό ή εγκεκριμένο Παραδοτέο. Αλλιώς δεν ακυρώνεται.
create or replace function authz.production_has_work(p_production uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
           select 1 from public.filmings f
            where f.production_id = p_production and f.state not in ('cancelled', 'rejected')
         )
      or exists (
           select 1 from public.deliverables d
            where d.production_id = p_production and d.approved_at is not null
         );
$$;

-- Γύρισμα που γίνεται «έγινε» γεμίζει τις κενές προθεσμίες των Παραδοτέων του (Π3).
create function authz.deliverables_fill_deadlines() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.deliverables d
     set deadline = authz.add_working_days(public.sales_today(), authz.deliverable_kind_days(d.kind_id))
   where d.filming_id = new.id and d.deadline is null and d.cancelled_at is null;
  return new;
end;
$$;

create trigger filmings_done_fill_deadlines after update of state on public.filmings
  for each row when (new.state = 'done' and old.state is distinct from new.state)
  execute function authz.deliverables_fill_deadlines();

-- ───────────── Κανόνες (triggers) ─────────────

create trigger deliverables_stamp before insert or update on public.deliverables
  for each row execute function authz.stamp_equipment_row();

create trigger deliverables_audit after insert or delete on public.deliverables
  for each row execute function authz.audit_row('id');
create trigger deliverables_audit_update after update on public.deliverables
  for each row when (old.* is distinct from new.*) execute function authz.audit_row('id');

create trigger deliverable_versions_audit after insert or delete on public.deliverable_versions
  for each row execute function authz.audit_row('deliverable_id');
create trigger deliverable_versions_audit_update after update on public.deliverable_versions
  for each row when (old.* is distinct from new.*) execute function authz.audit_row('deliverable_id');

create trigger deliverable_comments_audit after insert or delete on public.deliverable_comments
  for each row execute function authz.audit_row('deliverable_id');
create trigger deliverable_comments_audit_update after update on public.deliverable_comments
  for each row when (old.* is distinct from new.*) execute function authz.audit_row('deliverable_id');

-- ───────────── Ίχνος ─────────────

-- Ξαναγράφεται ΟΛΟΚΛΗΡΗ η λίστα (default deny). Προστέθηκαν τα Παραδοτέα, οι Εκδόσεις και τα σχόλιά τους, χωρίς ποσά.
create or replace function authz.audit_entity_allowed(p_entity text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_entity
    -- Κατάλογος: ποσά και κόστος
    when 'catalogue_item_costs' then authz.has('finance.cost')
    when 'cost_months' then authz.has('finance.cost')
    when 'cost_settings' then authz.has('finance.cost')
    when 'catalogue_item_amounts' then authz.has('finance.amounts')
    -- Πρόσβαση και Ρυθμίσεις
    when 'roles' then true
    when 'role_permissions' then true
    when 'team_users' then true
    when 'team_user_roles' then true
    when 'company_settings' then true
    when 'bank_accounts' then true
    when 'readiness_confirmations' then true
    when 'system_state' then true
    -- Πωλήσεις: λίστες και ρυθμίσεις
    when 'sales_stages' then true
    when 'sales_sources' then true
    when 'sales_loss_reasons' then true
    when 'sales_activity_kinds' then true
    when 'sales_settings' then true
    -- Πωλήσεις: Πελάτες και Ευκαιρίες (το Εύρος κρίνεται ανά εγγραφή στο authz.audit_row_allowed)
    when 'clients' then true
    when 'client_duplicate_flags' then true
    when 'opportunities' then true
    when 'access_requests' then true
    -- Κατάλογος
    when 'provision_kinds' then true
    when 'catalogue_items' then true
    when 'catalogue_item_provisions' then true
    -- Συμφωνίες: ποσά και κόστος
    when 'agreement_line_costs' then authz.has('finance.cost')
    when 'agreement_costs' then authz.has('finance.cost') and authz.has('finance.amounts')
    when 'agreement_amounts' then authz.has('finance.amounts')
    when 'agreement_line_amounts' then authz.has('finance.amounts')
    when 'agreement_defaults' then authz.has('finance.amounts')
    -- Συμφωνίες: χωρίς ποσά (Σύνδεσμοι, κωδικοί, εξερχόμενα, έγγραφα και αναθεωρήσεις δεν γράφονται ποτέ στο Ίχνος)
    when 'agreements' then true
    when 'agreement_revision_limits' then true
    when 'agreement_milestones' then true
    when 'agreement_lines' then true
    when 'agreement_line_provisions' then true
    when 'agreement_recipients' then true
    when 'agreement_signatures' then true
    -- Εξοπλισμός: χωρίς ποσά
    when 'equipment_categories' then true
    when 'equipment_items' then true
    when 'equipment_templates' then true
    when 'equipment_template_items' then true
    -- Περίοδοι και Παραγωγές: χωρίς ποσά
    when 'agreement_periods' then true
    when 'agreement_period_provisions' then true
    when 'productions' then true
    when 'production_members' then true
    -- Γυρίσματα: χωρίς ποσά
    when 'filmings' then true
    when 'filming_crew' then true
    when 'filming_equipment' then true
    when 'crew_templates' then true
    when 'crew_template_members' then true
    when 'filming_settings' then true
    -- Ωράριο κρατήσεων: μόνο για όσους ορίζουν το Ωράριο
    when 'booking_week' then authz.has('settings.manage')
    when 'booking_exceptions' then authz.has('settings.manage')
    -- Προσκλήσεις, Χρήστες πελάτη και ουρά email (#107): χωρίς ποσά· το email μόνο για τον Ιδιοκτήτη
    when 'access' then true
    when 'invitations' then true
    when 'client_users' then true
    when 'email_outbox' then authz.is_owner()
    when 'email_log' then authz.is_owner()
    -- Κλεισμένος χρόνος: με τίτλο μόνο για όσους κλείνουν χρόνο άλλων
    when 'blocked_times' then authz.has('calendar.block_others')
    when 'filming_sheets' then true
    when 'filming_sheet_versions' then true
    when 'google_calendar' then authz.has('calendar.google')
    when 'google_deletions' then authz.has('calendar.google')
    -- Παραδοτέα: χωρίς ποσά
    when 'deliverables' then true
    when 'deliverable_versions' then true
    when 'deliverable_comments' then true
    else false
  end;
$$;

-- ───────────── Ανάγνωση ─────────────

-- Ουρά Παραδοτέων (H1). 'mine': σε εκκρεμότητα του Εύρους (πρόχειρα, επιστραμμένα, ζητήθηκαν αλλαγές).
-- 'review': σε εσωτερικό έλεγχο. 'client': στον πελάτη, με μέρες αναμονής. Μόνο ανοιχτές Παραγωγές, μη ακυρωμένα.
create function public.deliverables_queue_view(p_view text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_perm text := case when p_view = 'review' then 'deliverables.review' else 'deliverables.work' end;
begin
  if p_view not in ('mine', 'review', 'client') then
    raise exception 'Άγνωστη ουρά Παραδοτέων' using errcode = 'P0001';
  end if;
  perform authz.require(v_perm);
  return (
    select coalesce(jsonb_agg(q.card order by (q.card->>'daysWaiting')::integer desc, q.card->>'id'), '[]'::jsonb)
      from (
        select authz.deliverable_card(d.id) as card
          from public.deliverables d
          join public.productions p on p.id = d.production_id
         where p.state = 'open'
           and d.cancelled_at is null
           and authz.deliverable_in_scope(d.id, v_perm)
           and case p_view
                 when 'mine' then authz.deliverable_state(d.id) in ('draft', 'returned', 'changes_requested')
                 when 'review' then authz.deliverable_state(d.id) = 'in_review'
                 else authz.deliverable_state(d.id) = 'awaiting_client'
               end
      ) q
  );
end;
$$;

-- Σελίδα Παραδοτέου (H2): κάρτα, Εκδόσεις με σχόλια, Περιθώριο, ενέργειες και απόφαση χρέωσης.
create function public.deliverable_view(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_card jsonb;
begin
  perform authz.require_deliverable_view(p_id);
  v_card := authz.deliverable_card(p_id);
  return v_card || jsonb_build_object(
    'versions', authz.deliverable_versions_json(p_id),
    'can', authz.deliverable_viewer_can(p_id),
    'pendingCharge', v_card->>'charge' = 'pending'
  );
end;
$$;

-- Υποψήφια για νέο Παραδοτέο σε μια Παραγωγή: είδη πλήθους με υπόλοιπο, υπεύθυνοι, Γυρίσματα.
create function public.deliverable_candidates(p_production uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_period uuid;
begin
  perform authz.require_production_scope(p_production, 'deliverables.work');
  select p.period_id into v_period from public.productions p where p.id = p_production;
  return jsonb_build_object(
    'kinds', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', k.id, 'label', k.label, 'unit', k.unit,
               'balance', (select b.balance from authz.period_balance(v_period, k.id) b)
             ) order by k.sort, k.id), '[]'::jsonb)
        from public.provision_kinds k
       where k.measure is null and k.retired_at is null
    ),
    'assignees', (
      select coalesce(jsonb_agg(jsonb_build_object('id', u.user_id, 'name', u.name) order by lower(u.name), u.user_id), '[]'::jsonb)
        from public.team_users u
       where u.is_active
    ),
    'filmings', (
      select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'startsAt', f.starts_at, 'state', f.state) order by f.starts_at, f.id), '[]'::jsonb)
        from public.filmings f
       where f.production_id = p_production and f.state not in ('cancelled', 'rejected')
    )
  );
end;
$$;

-- ───────────── Εγγραφή ─────────────

-- Νέο Παραδοτέο (Π4, Π3): μόνο σε ανοιχτή Παραγωγή. Χωρίς υπόλοιπο, «χωρίς χρέωση» με λόγο ή «χρεώνεται» (pending).
create function public.deliverable_create(
  p_production uuid, p_kind uuid, p_title text, p_assignee uuid, p_filming uuid, p_charge text, p_charge_reason text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_reason text := nullif(trim(coalesce(p_charge_reason, '')), '');
  v_production public.productions;
  v_charge text;
  v_id uuid;
begin
  perform authz.require_production_scope(p_production, 'deliverables.work');
  select * into v_production from public.productions p where p.id = p_production;
  perform authz.require_production_open(p_production);
  if not exists (select 1 from public.provision_kinds k where k.id = p_kind and k.measure is null) then
    raise exception 'Το είδος δεν μετράει σε πλήθος' using errcode = 'P0001';
  end if;
  if length(v_title) = 0 or length(v_title) > 200 then
    raise exception 'Το Παραδοτέο θέλει τίτλο έως 200 χαρακτήρες' using errcode = 'P0001';
  end if;
  perform authz.check_deliverable_filming(p_production, p_filming);
  perform authz.check_deliverable_assignee(p_production, p_assignee);
  if v_production.client_id is null then
    v_charge := 'free';
    v_reason := null;
  elsif v_production.agreement_id is not null and coalesce(
          authz.filming_available(v_production.agreement_id, v_production.period_id, p_kind), 0) > 0 then
    v_charge := 'included';
    v_reason := null;
  elsif p_charge = 'pending' then
    v_charge := 'pending';
    v_reason := null;
  elsif p_charge = 'free' and v_reason is not null then
    v_charge := 'free';
  else
    raise exception 'Χωρίς υπόλοιπο Παροχής θέλει «χωρίς χρέωση» με λόγο ή «χρεώνεται»' using errcode = 'P0001';
  end if;
  insert into public.deliverables (production_id, kind_id, title, assignee_id, filming_id, period_id, charge, charge_reason, deadline)
  values (p_production, p_kind, v_title, p_assignee, p_filming, v_production.period_id, v_charge, v_reason,
          authz.deliverable_deadline_for(p_kind, p_filming))
  returning id into v_id;
  return v_id;
end;
$$;

-- Ενημέρωση: τίτλος, υπεύθυνος, Γύρισμα. Η προθεσμία μένει, εκτός αν δεν υπήρχε και αλλάζει το Γύρισμα.
create function public.deliverable_update(p_id uuid, p_title text, p_assignee uuid, p_filming uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_title text := trim(coalesce(p_title, ''));
  v_row public.deliverables;
begin
  perform authz.deliverable_gate(p_id, 'deliverables.work');
  select * into v_row from public.deliverables d where d.id = p_id for update;
  if v_row.cancelled_at is not null then
    raise exception 'Το Παραδοτέο έχει ακυρωθεί' using errcode = 'P0001';
  end if;
  if length(v_title) = 0 or length(v_title) > 200 then
    raise exception 'Το Παραδοτέο θέλει τίτλο έως 200 χαρακτήρες' using errcode = 'P0001';
  end if;
  perform authz.check_deliverable_filming(v_row.production_id, p_filming);
  perform authz.check_deliverable_assignee(v_row.production_id, p_assignee);
  update public.deliverables d
     set title = v_title,
         assignee_id = p_assignee,
         filming_id = p_filming,
         deadline = case
                      when p_filming is distinct from v_row.filming_id and v_row.deadline is null
                        then authz.deliverable_deadline_for(v_row.kind_id, p_filming)
                      else v_row.deadline
                    end
   where d.id = p_id;
end;
$$;

-- Νέα Έκδοση (Π2, Π5). Ελεγκτής ή εσωτερικός έλεγχος off: αναμένει πελάτη. Αλλιώς: εσωτερικό έλεγχο.
create function public.deliverable_version_add(p_id uuid, p_url text, p_note text) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_url text := trim(coalesce(p_url, ''));
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_host text;
  v_number integer;
  v_direct boolean;
begin
  perform authz.deliverable_gate(p_id, 'deliverables.work');
  perform 1 from public.deliverables d where d.id = p_id for update;
  if authz.deliverable_state(p_id) in ('approved', 'cancelled') then
    raise exception 'Το Παραδοτέο δεν δέχεται νέα Έκδοση' using errcode = 'P0001';
  end if;
  v_host := authz.deliverable_host(v_url);
  v_direct := authz.has('deliverables.review') or not authz.deliverable_rule_internal_review();
  update public.deliverable_versions v
     set state = 'superseded'
   where v.deliverable_id = p_id and v.state in ('in_review', 'awaiting_client');
  v_number := coalesce(authz.deliverable_current_number(p_id), 0) + 1;
  insert into public.deliverable_versions (deliverable_id, number, url, host, state, note, created_by, sent_at, sent_by)
  values (p_id, v_number, v_url, v_host,
          case when v_direct then 'awaiting_client' else 'in_review' end, v_note, auth.uid(),
          case when v_direct then now() end, case when v_direct then auth.uid() end);
  return v_number;
end;
$$;

-- Στείλε στον πελάτη (Π2): από εσωτερικό έλεγχο σε αναμονή πελάτη. Το email έρχεται στο #142.
create function public.deliverable_version_send(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.deliverable_gate(p_id, 'deliverables.review');
  perform 1 from public.deliverables d where d.id = p_id for update;
  if authz.deliverable_state(p_id) <> 'in_review' then
    raise exception 'Μόνο Έκδοση σε εσωτερικό έλεγχο στέλνεται' using errcode = 'P0001';
  end if;
  update public.deliverable_versions v
     set state = 'awaiting_client', sent_at = now(), sent_by = auth.uid()
   where v.deliverable_id = p_id and v.number = authz.deliverable_current_number(p_id);
end;
$$;

-- Επέστρεψε από τον έλεγχο, με σημείωση υποχρεωτική.
create function public.deliverable_version_return(p_id uuid, p_note text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  perform authz.deliverable_gate(p_id, 'deliverables.review');
  perform 1 from public.deliverables d where d.id = p_id for update;
  if v_note is null then
    raise exception 'Η επιστροφή θέλει σημείωση' using errcode = 'P0001';
  end if;
  if authz.deliverable_state(p_id) <> 'in_review' then
    raise exception 'Μόνο Έκδοση σε εσωτερικό έλεγχο επιστρέφεται' using errcode = 'P0001';
  end if;
  update public.deliverable_versions v
     set state = 'returned', review_note = v_note
   where v.deliverable_id = p_id and v.number = authz.deliverable_current_number(p_id);
end;
$$;

-- Ενέκρινε εσωτερικά (Π2): μόνο σε Εσωτερική Παραγωγή.
create function public.deliverable_approve_internal(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
begin
  perform authz.deliverable_gate(p_id, 'deliverables.review');
  perform 1 from public.deliverables d where d.id = p_id for update;
  select p.client_id into v_client from public.deliverables d join public.productions p on p.id = d.production_id where d.id = p_id;
  if v_client is not null then
    raise exception 'Μόνο Εσωτερική Παραγωγή εγκρίνεται εσωτερικά' using errcode = 'P0001';
  end if;
  if authz.deliverable_state(p_id) not in ('in_review', 'awaiting_client') then
    raise exception 'Η Έκδοση δεν είναι σε έλεγχο' using errcode = 'P0001';
  end if;
  update public.deliverable_versions v
     set state = 'approved', answered_at = now(), answered_by = auth.uid()
   where v.deliverable_id = p_id and v.number = authz.deliverable_current_number(p_id);
  update public.deliverables d set approved_at = now(), approved_by = auth.uid() where d.id = p_id;
end;
$$;

-- Διόρθωση link της τρέχουσας Έκδοσης: καθαρίζει το «δεν ανοίγει».
create function public.deliverable_link_fix(p_id uuid, p_url text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_url text := trim(coalesce(p_url, ''));
  v_host text;
begin
  perform authz.deliverable_gate(p_id, 'deliverables.work');
  perform 1 from public.deliverables d where d.id = p_id for update;
  if authz.deliverable_state(p_id) = 'cancelled' then
    raise exception 'Το Παραδοτέο έχει ακυρωθεί' using errcode = 'P0001';
  end if;
  if authz.deliverable_current_number(p_id) is null then
    raise exception 'Το Παραδοτέο δεν έχει Έκδοση' using errcode = 'P0001';
  end if;
  v_host := authz.deliverable_host(v_url);
  update public.deliverable_versions v
     set url = v_url, host = v_host, link_broken_at = null
   where v.deliverable_id = p_id and v.number = authz.deliverable_current_number(p_id);
end;
$$;

-- Ακύρωση με λόγο (Π7): «καταναλώθηκε» ή «επιστρέφει στην Περίοδο». Όχι σε εγκεκριμένο.
create function public.deliverable_cancel(p_id uuid, p_reason text, p_outcome text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  perform authz.deliverable_gate(p_id, 'deliverables.work');
  perform 1 from public.deliverables d where d.id = p_id for update;
  if v_reason is null then
    raise exception 'Η ακύρωση θέλει λόγο' using errcode = 'P0001';
  end if;
  if p_outcome not in ('consumed', 'returned') then
    raise exception 'Η ακύρωση θέλει «καταναλώθηκε» ή «επιστρέφει»' using errcode = 'P0001';
  end if;
  if authz.deliverable_state(p_id) = 'cancelled' then
    raise exception 'Το Παραδοτέο έχει ήδη ακυρωθεί' using errcode = 'P0001';
  end if;
  if authz.deliverable_state(p_id) = 'approved' then
    raise exception 'Το εγκεκριμένο Παραδοτέο δεν ακυρώνεται' using errcode = 'P0001';
  end if;
  update public.deliverables d
     set cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = v_reason, cancel_outcome = p_outcome
   where d.id = p_id;
end;
$$;

-- Σχόλιο σε υπάρχουσα Έκδοση, με προαιρετικό χρόνο mm:ss (σε δευτερόλεπτα) και εσωτερικό σήμα.
create function public.deliverable_comment_add(
  p_id uuid, p_version integer, p_body text, p_at_seconds integer, p_internal boolean
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_body text := trim(coalesce(p_body, ''));
  v_id uuid;
begin
  perform authz.deliverable_gate(p_id, 'deliverables.work');
  if length(v_body) = 0 or length(v_body) > 2000 then
    raise exception 'Το σχόλιο θέλει κείμενο έως 2000 χαρακτήρες' using errcode = 'P0001';
  end if;
  if p_at_seconds is not null and p_at_seconds not between 0 and 86399 then
    raise exception 'Ο χρόνος του σχολίου είναι εκτός ορίων' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.deliverable_versions v where v.deliverable_id = p_id and v.number = p_version) then
    raise exception 'Η Έκδοση δεν βρέθηκε' using errcode = 'P0001';
  end if;
  insert into public.deliverable_comments (deliverable_id, version_number, body, at_seconds, is_internal, created_by)
  values (p_id, p_version, v_body, p_at_seconds, coalesce(p_internal, false), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Απόφαση χρέωσης (finance.cost): από «χρεώνεται» (pending) σε «χρεώνεται» ή «χωρίς χρέωση» με λόγο.
create function public.deliverable_charge_decide(p_id uuid, p_charge text, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_charge text;
begin
  perform authz.deliverable_gate(p_id, 'finance.cost');
  select d.charge into v_charge from public.deliverables d where d.id = p_id for update;
  if v_charge <> 'pending' then
    raise exception 'Η χρέωση έχει ήδη αποφασιστεί' using errcode = 'P0001';
  end if;
  if p_charge not in ('charged', 'free') then
    raise exception 'Η χρέωση θέλει «χρεώνεται» ή «χωρίς χρέωση»' using errcode = 'P0001';
  end if;
  if p_charge = 'free' and v_reason is null then
    raise exception 'Το «χωρίς χρέωση» θέλει λόγο' using errcode = 'P0001';
  end if;
  update public.deliverables d
     set charge = p_charge, charge_reason = case when p_charge = 'free' then v_reason end
   where d.id = p_id;
end;
$$;

-- ───────────── Σελίδα Παραγωγής ─────────────

-- Σελίδα Παραγωγής (G2): + Παραδοτέα (μόνο για ομάδα) με την κάρτα τους.
create or replace function public.production_view(p_production uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_team boolean := authz.is_team_user();
begin
  perform authz.require_production_viewer();
  if not authz.can_see_production(p_production) then
    if coalesce(authz.scope('productions.manage'), '') = 'all' then
      perform authz.require_production(p_production);
    end if;
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.production_card(p_production) || authz.production_detail(p_production, v_team)
    || jsonb_build_object('filmings', (
         select coalesce(jsonb_agg(jsonb_build_object(
                  'id', f.id, 'startsAt', f.starts_at, 'hours', f.hours, 'state', f.state, 'isExtra', f.is_extra,
                  'kind', (select k.label from public.provision_kinds k where k.id = f.kind_id)
                ) order by f.starts_at, f.id), '[]'::jsonb)
           from public.filmings f
          where f.production_id = p_production and authz.can_see_filming(f.id)
       ))
    || jsonb_build_object('deliverables', case when v_team then (
         select coalesce(jsonb_agg(authz.deliverable_card(d.id) order by d.created_at, d.id), '[]'::jsonb)
           from public.deliverables d
          where d.production_id = p_production
       ) else '[]'::jsonb end);
end;
$$;

-- ───────────── Ακύρωση Παραγωγής (τελευταίος ορισμός) ─────────────

-- Ακύρωση με λόγο, μόνο όσο δεν έγινε δουλειά (Π8). Τα ανοιχτά Παραδοτέα (μη εγκεκριμένα, μη ακυρωμένα)
-- ακυρώνονται με outcome 'returned' ώστε η Παροχή να επιστρέψει στην Περίοδο.
create or replace function public.production_cancel(p_production uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_state text;
begin
  perform authz.production_writable(p_production);
  if v_reason is null then
    raise exception 'Η ακύρωση θέλει λόγο' using errcode = 'P0001';
  end if;
  select p.state into v_state from public.productions p where p.id = p_production for update;
  if v_state <> 'open' then
    raise exception 'Μόνο ανοιχτή Παραγωγή ακυρώνεται' using errcode = 'P0001';
  end if;
  if authz.production_has_work(p_production) then
    raise exception 'Η Παραγωγή έχει δουλειά και δεν ακυρώνεται' using errcode = 'P0001';
  end if;
  update public.deliverables d
     set cancelled_at = now(), cancelled_by = auth.uid(),
         cancel_reason = 'Ακυρώθηκε η Παραγωγή', cancel_outcome = 'returned'
   where d.production_id = p_production and d.cancelled_at is null and d.approved_at is null;
  update public.productions p
     set state = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), cancelled_reason = v_reason
   where p.id = p_production;
  perform authz.production_event(p_production, 'cancelled', jsonb_build_object('reason', v_reason));
end;
$$;

-- ───────────── Δικαιώματα ─────────────

-- Όλα τα νέα authz κλειστά· οι RPC τρέχουν ως ιδιοκτήτης και τα καλούν μέσα τους.
revoke all on function
  authz.deliverable_rule_internal_review(), authz.deliverable_kind_days(uuid), authz.add_working_days(date, integer),
  authz.deliverable_deadline_for(uuid, uuid), authz.deliverable_state(uuid), authz.deliverable_current_number(uuid),
  authz.deliverable_host(text), authz.deliverable_in_scope(uuid, text), authz.production_in_scope(uuid, text),
  authz.require_production_scope(uuid, text), authz.deliverable_gate(uuid, text), authz.require_deliverable_view(uuid),
  authz.check_deliverable_filming(uuid, uuid), authz.check_deliverable_assignee(uuid, uuid),
  authz.deliverable_units(uuid, uuid, uuid, text), authz.deliverable_card(uuid), authz.deliverable_versions_json(uuid),
  authz.deliverable_viewer_can(uuid), authz.deliverables_fill_deadlines()
  from public, anon, authenticated;

-- Οι RPC της εφαρμογής: ο έλεγχος Δικαιώματος γίνεται μέσα τους.
revoke all on function
  public.deliverables_queue_view(text), public.deliverable_view(uuid), public.deliverable_candidates(uuid),
  public.deliverable_create(uuid, uuid, text, uuid, uuid, text, text), public.deliverable_update(uuid, text, uuid, uuid),
  public.deliverable_version_add(uuid, text, text), public.deliverable_version_send(uuid),
  public.deliverable_version_return(uuid, text), public.deliverable_approve_internal(uuid),
  public.deliverable_link_fix(uuid, text), public.deliverable_cancel(uuid, text, text),
  public.deliverable_comment_add(uuid, integer, text, integer, boolean), public.deliverable_charge_decide(uuid, text, text)
  from public, anon;
grant execute on function
  public.deliverables_queue_view(text), public.deliverable_view(uuid), public.deliverable_candidates(uuid),
  public.deliverable_create(uuid, uuid, text, uuid, uuid, text, text), public.deliverable_update(uuid, text, uuid, uuid),
  public.deliverable_version_add(uuid, text, text), public.deliverable_version_send(uuid),
  public.deliverable_version_return(uuid, text), public.deliverable_approve_internal(uuid),
  public.deliverable_link_fix(uuid, text), public.deliverable_cancel(uuid, text, text),
  public.deliverable_comment_add(uuid, integer, text, integer, boolean), public.deliverable_charge_decide(uuid, text, text)
  to authenticated;
