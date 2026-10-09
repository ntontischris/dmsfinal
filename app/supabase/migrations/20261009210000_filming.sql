-- Γυρίσματα (E1–E4, E6, E7): οντότητα Γυρίσματος, μηχανή καταστάσεων, Παροχές, Συνεργείο, Δέσμευση Εξοπλισμού,
-- Κανόνες γυρισμάτων. Κεφ. 3 (Γυρίσματα), ADR 0007, 0010, 0015, 0018 και το ticket #125.
--
-- Αρχές:
--  • Η Κατάσταση είναι σταθερή (pending, scheduled, done, no_show, cancelled, rejected). Οι Κανόνες και οι Όροι της Συμφωνίας
--    ορίζουν πώς περνά το Γύρισμα από τη μία στην άλλη. Κάθε αλλαγή Κατάστασης γίνεται μόνο από τα RPC.
--  • Κλειστό Γύρισμα (done, no_show, cancelled, rejected) δεν αλλάζει. Η μόνη εξαίρεση είναι η αναίρεση «έγινε»/«δεν έγινε»
--    (filming_undo_outcome), που ανοίγει ρητά το trigger με τοπική ρύθμιση συναλλαγής.
--  • Η Παροχή δεν αποθηκεύεται ως υπόλοιπο: υπολογίζεται από τα Γυρίσματα (authz.kind_units) μέσα στην Περίοδο της μέρας.
--    Τρόπος μέτρησης: per_filming (1 ανά Γύρισμα), per_hour (ώρες, πραγματικές όπου υπάρχουν), per_day (1 ανά μέρα Athens).
--    Είδος χωρίς Τρόπο μέτρησης μετράει ως per_filming.
--  • Ώρες στη βάση: timestamptz. Η μέρα του Γυρίσματος (Περίοδος, Παραγωγή, «σήμερα») υπολογίζεται σε Ώρα Ελλάδας.
--  • Οι πίνακες είναι κλειστοί για την εφαρμογή (RLS χωρίς policies, χωρίς grants): διαβάζονται και γράφονται μόνο από τα
--    public.filming* και public.crew_template* RPC, που ελέγχουν το Δικαίωμα και το Εύρος στο σώμα τους (security definer).
--  • Δικαιώματα: filming.view, filming.book, filming.approve, filming.crew, equipment.reserve, settings.manage. Κανένα νέο.
--  • Εύρος «όσα με αφορούν» (mine): Μέλος ή Υπεύθυνος της Παραγωγής, μέλος του Συνεργείου του Γυρίσματος, ή Υπεύθυνος του Πελάτη.
--    Πωλήσεις βλέπουν Γύρισμα χωρίς Συνεργείο και Εξοπλισμό. Πελάτης βλέπει μόνο τα δικά του, χωρίς Συνεργείο και ιστορικό.
--  • Ίχνος: κάθε μετάβαση γράφει γεγονός με τον λόγο της. Ποσά και κόστος δεν μπαίνουν εδώ.
--  • Μη αναστρέψιμο σημείο: η Παραγωγή δεν δέχεται νέα Γυρίσματα όταν έχει παραδοθεί ή ακυρωθεί.
--  • ΕΚΤΟΣ (C2): Ωράριο κρατήσεων, Χωρητικότητα, Αργίες, Κλεισμένος χρόνος, Δελτίο, Ημερολόγιο, ICS, E5, μετάθεση από πελάτη,
--    αυτόματες ενέργειες χωρίς scheduler, Google. Τα σημεία σύνδεσης για αυτά υπάρχουν ως stubs (filming_slot_open,
--    user_blocked_at).

-- ───────────── Πίνακες ─────────────

create table public.filmings (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions (id),
  -- null για εφάπαξ, για Εσωτερική Παραγωγή και για έξτρα Γύρισμα εκτός Περιόδου.
  period_id uuid references public.agreement_periods (id),
  -- null = Εσωτερική Παραγωγή.
  client_id uuid references public.clients (id),
  -- null = χωρίς Παροχή (Εσωτερική ή έξτρα χωρίς είδος).
  kind_id uuid references public.provision_kinds (id),
  starts_at timestamptz not null,
  -- Από 0,5 έως 12 ώρες, ανά μισή ώρα.
  hours numeric(4, 1) not null check (hours >= 0.5 and hours <= 12 and hours * 2 = trunc(hours * 2)),
  actual_hours numeric(4, 1) check (actual_hours is null or (actual_hours > 0 and actual_hours <= 24)),
  location text check (location is null or length(trim(location)) > 0),
  origin text not null check (origin in ('client', 'team', 'blocked_time')),
  state text not null default 'pending' check (state in ('pending', 'scheduled', 'done', 'no_show', 'cancelled', 'rejected')),
  -- Έξτρα: ξεπέρασε την Παροχή της Περιόδου ή δεν έχει Παροχή. Δεν καταναλώνει υπόλοιπο.
  is_extra boolean not null default false,
  -- Η Παροχή καίγεται (αργή ακύρωση ή «δεν έγινε», όπως ορίζουν οι Όροι).
  burned boolean not null default false,
  client_note text check (client_note is null or length(trim(client_note)) > 0),
  internal_note text check (internal_note is null or length(trim(internal_note)) > 0),
  approved_at timestamptz,
  approved_by uuid,
  rejected_at timestamptz,
  rejected_by uuid,
  rejected_reason text check (rejected_reason is null or length(trim(rejected_reason)) > 0),
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancelled_side text check (cancelled_side in ('team', 'client')),
  cancelled_reason text check (cancelled_reason is null or length(trim(cancelled_reason)) > 0),
  cancel_request_at timestamptz,
  cancel_request_by uuid,
  cancel_request_reason text check (cancel_request_reason is null or length(trim(cancel_request_reason)) > 0),
  done_at timestamptz,
  done_by uuid,
  no_show_at timestamptz,
  no_show_by uuid,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check ((state = 'done') = (done_at is not null)),
  check ((state = 'done') = (actual_hours is not null)),
  check ((state = 'no_show') = (no_show_at is not null)),
  check ((state = 'rejected') = (rejected_at is not null)),
  check (state <> 'rejected' or rejected_reason is not null),
  check ((state = 'cancelled') = (cancelled_at is not null)),
  check (state <> 'cancelled' or cancelled_side is not null),
  check (client_id is null or kind_id is not null or is_extra)
);

create index filmings_production_idx on public.filmings (production_id);
create index filmings_period_kind_idx on public.filmings (period_id, kind_id);
create index filmings_client_idx on public.filmings (client_id);
create index filmings_state_starts_idx on public.filmings (state, starts_at);

create table public.filming_crew (
  filming_id uuid not null references public.filmings (id),
  user_id uuid not null references public.team_users (user_id),
  response text not null default 'pending' check (response in ('pending', 'confirmed', 'declined')),
  reason text check (reason is null or length(trim(reason)) > 0),
  responded_at timestamptz,
  added_by uuid,
  added_at timestamptz not null default now(),
  primary key (filming_id, user_id),
  check ((response = 'declined') = (reason is not null)),
  check ((response = 'pending') = (responded_at is null))
);

create index filming_crew_user_idx on public.filming_crew (user_id);

create table public.filming_equipment (
  filming_id uuid not null references public.filmings (id),
  item_id uuid not null references public.equipment_items (id),
  added_by uuid,
  added_at timestamptz not null default now(),
  primary key (filming_id, item_id)
);

create index filming_equipment_item_idx on public.filming_equipment (item_id);

create table public.crew_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  note text check (note is null or length(trim(note)) > 0),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create unique index crew_templates_name_lower on public.crew_templates (lower(name));

create table public.crew_template_members (
  template_id uuid not null references public.crew_templates (id),
  user_id uuid not null references public.team_users (user_id),
  primary key (template_id, user_id)
);

-- Μία γραμμή: οι Κανόνες γυρισμάτων (ADR 0015). Ο admin αλλάζει τις επιλογές, δεν φτιάχνει δικές του.
create table public.filming_settings (
  id boolean primary key default true check (id),
  booking_needs_approval boolean not null default true,
  no_answer_action text not null default 'none' check (no_answer_action in ('none', 'approve', 'reject')),
  no_answer_hours integer not null default 24 check (no_answer_hours between 1 and 720),
  horizon_days integer not null default 60 check (horizon_days between 1 and 365),
  allow_outside_period boolean not null default false,
  reschedule_needs_approval boolean not null default true,
  equipment_conflict text not null default 'warn' check (equipment_conflict in ('warn', 'block')),
  client_sees_equipment boolean not null default false,
  sheet_sending text not null default 'manual' check (sheet_sending in ('manual', 'auto')),
  change_resets_confirmations boolean not null default true,
  done_marking text not null default 'manual' check (done_marking in ('manual', 'auto')),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into public.filming_settings default values;

alter table public.filmings enable row level security;
alter table public.filming_crew enable row level security;
alter table public.filming_equipment enable row level security;
alter table public.crew_templates enable row level security;
alter table public.crew_template_members enable row level security;
alter table public.filming_settings enable row level security;

-- ───────────── Βοηθητικά ─────────────

-- Τέλος Γυρίσματος (έναρξη + διάρκεια). Το half-open διάστημα [έναρξη, τέλος) κρίνει τις επικαλύψεις.
create function authz.filming_end(p_starts timestamptz, p_hours numeric) returns timestamptz
language sql stable set search_path = ''
as $$ select p_starts + (round(p_hours * 60))::integer * interval '1 minute'; $$;

-- Γεγονός για το Ίχνος του Γυρίσματος (action 'event'), με τον λόγο στο detail.
create function authz.filming_event(p_filming uuid, p_event text, p_detail jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (auth.uid(), 'event', 'filmings', p_filming::text, jsonb_build_object('event', p_event) || coalesce(p_detail, '{}'::jsonb));
end;
$$;

-- Ελέγχει τη διάρκεια και την ώρα έναρξης: από 0,5 έως 12 ώρες, ανά μισή ώρα.
create function authz.require_filming_slot(p_starts timestamptz, p_hours numeric) returns void
language plpgsql stable set search_path = ''
as $$
begin
  if p_starts is null then
    raise exception 'Γράψε μέρα και ώρα' using errcode = 'P0001';
  end if;
  if p_hours is null or p_hours < 0.5 or p_hours > 12 or p_hours * 2 <> trunc(p_hours * 2) then
    raise exception 'Η διάρκεια είναι από 0,5 έως 12 ώρες, ανά μισή ώρα' using errcode = 'P0001';
  end if;
end;
$$;

-- Κάθε στοιχείο λίστας μπαίνει μία φορά, και κανένα δεν είναι null.
create function authz.assert_distinct_ids(p_ids uuid[]) returns void
language plpgsql stable set search_path = ''
as $$
begin
  if exists (select 1 from unnest(coalesce(p_ids, '{}'::uuid[])) x where x is null)
     or (select count(distinct x) from unnest(coalesce(p_ids, '{}'::uuid[])) x) <> cardinality(coalesce(p_ids, '{}'::uuid[])) then
    raise exception 'Κάθε στοιχείο μπαίνει μία φορά' using errcode = 'P0001';
  end if;
end;
$$;

-- Το Γύρισμα είναι ανοιχτό (αναμένει έγκριση ή προγραμματισμένο). Αλλιώς P0001.
create function authz.require_open_filming(p_filming uuid) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.filmings f where f.id = p_filming and f.state in ('pending', 'scheduled')) then
    raise exception 'Το Γύρισμα έχει κλείσει και δεν αλλάζει' using errcode = 'P0001';
  end if;
end;
$$;

-- Η Παραγωγή δέχεται νέα Γυρίσματα (ανοιχτή). Αλλιώς P0001.
create function authz.require_production_open(p_production uuid) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.productions pr where pr.id = p_production and pr.state = 'open') then
    raise exception 'Η Παραγωγή δεν δέχεται νέα Γυρίσματα' using errcode = 'P0001';
  end if;
end;
$$;

-- Η Συμφωνία είναι υπογεγραμμένη ή ενεργή. Αλλιώς P0001.
create function authz.require_agreement_bookable(a public.agreements) returns void
language plpgsql stable set search_path = ''
as $$
begin
  if a.state not in ('signed', 'active') then
    raise exception 'Η Συμφωνία δεν είναι ενεργή' using errcode = 'P0001';
  end if;
end;
$$;

-- Η Παροχή του Γυρίσματος: διάλεξε είδος με Τρόπο μέτρησης, που το δίνει η Συμφωνία. Αλλιώς P0001.
create function authz.filming_check_kind(p_agreement uuid, p_kind uuid) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_kind is null then
    raise exception 'Διάλεξε την Παροχή που θα καταναλώσει το Γύρισμα' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.provision_kinds k where k.id = p_kind and k.measure is not null and k.retired_at is null) then
    raise exception 'Η Παροχή δεν μετράει Γυρίσματα' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.agreement_lines l
      join public.agreement_line_provisions lp on lp.line_id = l.id
     where l.agreement_id = p_agreement and lp.kind_id = p_kind
  ) then
    raise exception 'Η Συμφωνία δεν έχει αυτή την Παροχή' using errcode = 'P0001';
  end if;
end;
$$;

-- Η Περίοδος είναι ανοιχτή για τον πελάτη: η τρέχουσα, ή η αμέσως επόμενη (η πρώτη μελλοντική).
create function authz.period_is_open(p_period uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
      from public.agreement_periods t
     where t.id = p_period
       and (
         (t.starts <= public.sales_today() and t.ends >= public.sales_today())
         or (t.starts > public.sales_today() and not exists (
               select 1 from public.agreement_periods x
                where x.agreement_id = t.agreement_id and x.starts > public.sales_today() and x.starts < t.starts))
       )
  );
$$;

-- Πού πέφτει το Γύρισμα: Παραγωγή και Περίοδος της μέρας (Ώρα Ελλάδας). Εφάπαξ: η μοναδική Παραγωγή, χωρίς Περίοδο.
-- Εκτός Περιόδου: μόνο αν το επιτρέπουν οι Κανόνες· τότε η Παραγωγή είναι της τελευταίας Περιόδου και το Γύρισμα έξτρα.
-- Χωρίς γραμμή: η μέρα δεν πέφτει πουθενά.
create function authz.filming_place(p_agreement uuid, p_starts_at timestamptz)
returns table (r_production uuid, r_period uuid, r_outside boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_kind text;
  v_day date := (p_starts_at at time zone 'Europe/Athens')::date;
  v_period uuid;
  v_allow boolean;
begin
  select a.kind into v_kind from public.agreements a where a.id = p_agreement;
  if v_kind is null then
    return;
  end if;
  if v_kind = 'one_off' then
    return query select pr.id, null::uuid, false from public.productions pr
      where pr.agreement_id = p_agreement and pr.period_id is null;
    return;
  end if;
  select pe.id into v_period from public.agreement_periods pe
   where pe.agreement_id = p_agreement and v_day between pe.starts and pe.ends;
  if v_period is not null then
    return query select pr.id, v_period, false from public.productions pr where pr.period_id = v_period;
    return;
  end if;
  select s.allow_outside_period into v_allow from public.filming_settings s where s.id;
  if coalesce(v_allow, false) then
    return query select pr.id, null::uuid, true
      from public.productions pr
      join public.agreement_periods pe on pe.id = pr.period_id
     where pe.agreement_id = p_agreement
     order by pe.n desc
     limit 1;
  end if;
end;
$$;

-- Γύρισμα της Παροχής που μετράει στον Τρόπο μέτρησης (στάδιο used ή reserved). Εξαιρούνται τα έξτρα.
-- Περίοδος (p_period) ή, για εφάπαξ, η Συμφωνία με p_period null.
create function authz.kind_filmings(p_agreement uuid, p_period uuid, p_kind uuid, p_stage text)
returns setof public.filmings
language sql stable security definer set search_path = ''
as $$
  select f.*
    from public.filmings f
   where f.kind_id = p_kind
     and not f.is_extra
     and (case when p_period is not null then f.period_id = p_period
               else f.period_id is null and exists (
                 select 1 from public.productions pr
                   join public.agreements a on a.id = pr.agreement_id
                  where pr.id = f.production_id and a.id = p_agreement and a.kind = 'one_off') end)
     and (case when p_stage = 'used' then f.state = 'done' or (f.state in ('cancelled', 'no_show') and f.burned)
               else f.state in ('pending', 'scheduled') end);
$$;

-- Μονάδες μιας Παροχής από τα Γυρίσματα ενός σταδίου (used ή reserved), με τον Τρόπο μέτρησης.
-- per_hour: ώρες (πραγματικές όπου υπάρχουν). per_day: μέρες Athens· στο reserved αφαιρούνται οι μέρες που έχουν ήδη used.
create function authz.kind_units(p_agreement uuid, p_period uuid, p_kind uuid, p_stage text) returns numeric
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
  return (select count(*)::numeric from authz.kind_filmings(p_agreement, p_period, p_kind, p_stage) f);
end;
$$;

-- Παροχές που καταναλώθηκαν πριν από το σύστημα (υπογραφή εκτός συστήματος, παλιά έναρξη). Ανήκουν στην πρώτη Περίοδο.
create function authz.signed_used(p_agreement uuid, p_kind uuid) returns numeric
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(u.used), 0)::numeric
    from public.agreement_signatures s
    cross join lateral jsonb_to_recordset(s.used_provisions) as u (kind_id uuid, used integer)
   where s.agreement_id = p_agreement and u.kind_id = p_kind;
$$;

-- ───────────── Σημεία σύνδεσης (hooks) ─────────────

-- Καταναλωμένες Παροχές μιας Περιόδου (Γυρίσματα «έγινε» ή burned, συν ό,τι ήρθε από υπογραφή εκτός συστήματος).
drop function authz.period_provision_used(uuid, uuid);
create function authz.period_provision_used(p_period uuid, p_kind uuid) returns numeric
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_agreement uuid;
  v_first boolean;
begin
  select pe.agreement_id, pe.n = 1 into v_agreement, v_first from public.agreement_periods pe where pe.id = p_period;
  if not found then
    return 0;
  end if;
  return authz.kind_units(v_agreement, p_period, p_kind, 'used')
         + case when v_first then authz.signed_used(v_agreement, p_kind) else 0 end;
end;
$$;

-- Δεσμευμένες Παροχές μιας Περιόδου (Γυρίσματα αναμένει έγκριση ή προγραμματισμένο).
drop function authz.period_provision_reserved(uuid, uuid);
create function authz.period_provision_reserved(p_period uuid, p_kind uuid) returns numeric
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_agreement uuid;
begin
  select pe.agreement_id into v_agreement from public.agreement_periods pe where pe.id = p_period;
  if not found then
    return 0;
  end if;
  return authz.kind_units(v_agreement, p_period, p_kind, 'reserved');
end;
$$;

-- Έχει η Παραγωγή Γύρισμα που δεν ακυρώθηκε ή δεν απορρίφθηκε; Αν ναι δεν ακυρώνεται.
create or replace function authz.production_has_work(p_production uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.filmings f
     where f.production_id = p_production and f.state not in ('cancelled', 'rejected')
  );
$$;

-- Είναι το αντικείμενο δεσμευμένο σε ανοιχτό Γύρισμα;
create or replace function authz.equipment_item_reserved(p_item uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.filming_equipment fe
      join public.filmings f on f.id = fe.filming_id
     where fe.item_id = p_item and f.state in ('pending', 'scheduled')
  );
$$;

-- Κλεισμένος χρόνος (C2): stub, δεν μπλοκάρει τίποτα ακόμα.
create function authz.user_blocked_at(p_user uuid, p_from timestamptz, p_to timestamptz) returns boolean
language sql stable set search_path = ''
as $$ select false; $$;

-- Ωράριο και Χωρητικότητα (C2): stub, κάθε ώρα είναι ανοιχτή ακόμα.
create function authz.filming_slot_open(p_starts timestamptz, p_hours numeric) returns boolean
language sql stable set search_path = ''
as $$ select true; $$;

-- ───────────── Εύρος και Δικαιώματα ─────────────

-- Μέλος ή Υπεύθυνος της Παραγωγής, ή μέλος του Συνεργείου του Γυρίσματος.
create function authz.is_filming_crew(p_filming uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.filming_crew c where c.filming_id = p_filming and c.user_id = auth.uid());
$$;

create function authz.is_filming_participant(p_filming uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.filmings f
     where f.id = p_filming
       and (authz.is_production_participant(f.production_id) or authz.is_filming_crew(f.id))
  );
$$;

-- Υπεύθυνος του Πελάτη (Πωλήσεις «όσα με αφορούν»).
create function authz.is_client_manager(p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.clients c where c.id = p_client and c.manager_id = auth.uid());
$$;

-- Ο Χρήστης είναι ο Πελάτης του Γυρίσματος (σύνδεση Πελάτη, μέχρι το #107 μέσω authz.client_user_client_id).
create function authz.is_client_of_filming(p_filming uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.filmings f
     where f.id = p_filming and f.client_id is not null and f.client_id = authz.client_user_client_id()
  );
$$;

-- Βλέπει ο Χρήστης το Γύρισμα (Γ8).
create function authz.can_see_filming(p_filming uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.filmings f
     where f.id = p_filming
       and case
         when authz.is_team_user() then
           coalesce(authz.scope('filming.view') = 'all', false)
           or (coalesce(authz.scope('filming.view') = 'mine', false)
               and (authz.is_filming_participant(f.id) or authz.is_client_manager(f.client_id)))
         else f.client_id is not null and f.client_id = authz.client_user_client_id()
       end
  );
$$;

-- Βλέπει ο Χρήστης το Συνεργείο και τον Εξοπλισμό (Γ8: Πωλήσεις όχι).
create function authz.can_see_crew(p_filming uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.is_team_user() and (
    coalesce(authz.scope('filming.view') = 'all', false)
    or (coalesce(authz.scope('filming.view') = 'mine', false) and authz.is_filming_participant(p_filming))
  );
$$;

-- Δικαίωμα ομάδας «όλα», ή «όσα με αφορούν» για το Γύρισμα. Κοινό για Συνεργείο και Εξοπλισμό.
create function authz.scope_covers_filming(p_perm text, p_filming uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.is_team_user() and (
    coalesce(authz.scope(p_perm) = 'all', false)
    or (coalesce(authz.scope(p_perm) = 'mine', false) and authz.is_filming_participant(p_filming))
  );
$$;

create function authz.can_crew_filming(p_filming uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select authz.scope_covers_filming('filming.crew', p_filming); $$;

create function authz.can_reserve_for_filming(p_filming uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select authz.scope_covers_filming('equipment.reserve', p_filming); $$;

-- Κλείνει ή ακυρώνει ο Χρήστης Γύρισμα του Πελάτη (ομάδα): «όλα», ή Υπεύθυνος του Πελάτη.
create function authz.can_book_for_client(p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.is_team_user() and (
    coalesce(authz.scope('filming.book') = 'all', false)
    or (coalesce(authz.scope('filming.book') = 'mine', false) and authz.is_client_manager(p_client))
  );
$$;

create function authz.can_book_filming(p_filming uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.filmings f where f.id = p_filming and authz.can_book_for_client(f.client_id)
  );
$$;

create function authz.can_approve_filming() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(authz.scope('filming.approve') = 'all', false); $$;

create function authz.require_filming_viewer() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if authz.is_team_user() then
    perform authz.require('filming.view');
  elsif authz.client_user_client_id() is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Ύπαρξη πρώτα, Εύρος μετά. Για «όλα» το «δεν βρέθηκε» (P0001)· για όλους τους άλλους ίδια άρνηση (42501) για ανύπαρκτο και ξένο.
create function authz.filming_gate(p_filming uuid, p_allowed boolean, p_perm text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_filming is null or not exists (select 1 from public.filmings f where f.id = p_filming) then
    if coalesce(authz.scope(p_perm) = 'all', false) then
      raise exception 'Το Γύρισμα δεν βρέθηκε' using errcode = 'P0001';
    end if;
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if not coalesce(p_allowed, false) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Η Συμφωνία του πελάτη που συνδέεται. Αλλιώς 42501 (και για ανύπαρκτη και για ξένη Συμφωνία).
create function authz.client_agreement(p_agreement uuid) returns public.agreements
language plpgsql stable security definer set search_path = ''
as $$
declare
  a public.agreements;
begin
  select x.* into a
    from public.agreements x
    join public.opportunities o on o.id = x.opportunity_id
   where x.id = p_agreement and o.client_id = authz.client_user_client_id();
  if not found then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return a;
end;
$$;

-- Η Συμφωνία του Πελάτη για κράτηση από την ομάδα. Ανύπαρκτη: P0001 μόνο για «όλα», αλλιώς 42501.
create function authz.team_agreement_for_booking(p_agreement uuid) returns public.agreements
language plpgsql stable security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_client uuid;
begin
  select x.* into a from public.agreements x where x.id = p_agreement;
  if not found then
    if coalesce(authz.scope('filming.book') = 'all', false) then
      raise exception 'Η Συμφωνία δεν βρέθηκε' using errcode = 'P0001';
    end if;
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select o.client_id into v_client from public.opportunities o where o.id = a.opportunity_id;
  if not authz.can_book_for_client(v_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return a;
end;
$$;

-- ───────────── Επικαλύψεις και υπόλοιπα ─────────────

-- Το αντικείμενο είναι δεσμευμένο σε άλλο ανοιχτό Γύρισμα που επικαλύπτεται στην ώρα.
create function authz.item_clash(p_filming uuid, p_item uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
      from public.filmings f
      join public.filmings g on g.id <> f.id and g.state in ('pending', 'scheduled')
      join public.filming_equipment ge on ge.filming_id = g.id and ge.item_id = p_item
     where f.id = p_filming and f.state in ('pending', 'scheduled')
       and g.starts_at < authz.filming_end(f.starts_at, f.hours)
       and f.starts_at < authz.filming_end(g.starts_at, g.hours)
  );
$$;

create function authz.filming_has_conflict(p_filming uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.filming_equipment fe
     where fe.filming_id = p_filming and authz.item_clash(p_filming, fe.item_id)
  );
$$;

-- Το άτομο είναι στο Συνεργείο άλλου ανοιχτού Γυρίσματος που επικαλύπτεται στην ώρα.
create function authz.crew_clash(p_user uuid, p_filming uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
      from public.filmings f
      join public.filmings g on g.id <> f.id and g.state in ('pending', 'scheduled')
      join public.filming_crew gc on gc.filming_id = g.id and gc.user_id = p_user
     where f.id = p_filming and f.state in ('pending', 'scheduled')
       and g.starts_at < authz.filming_end(f.starts_at, f.hours)
       and f.starts_at < authz.filming_end(g.starts_at, g.hours)
  );
$$;

-- Υπόλοιπο μιας Περιόδου για ένα είδος Παροχής (Π3). Δεν αποθηκεύεται.
-- Κάθε Περίοδος: given (από τις Παροχές της, 0 αν δεν δίνει)· leftover = given − used − reserved.
-- Μεταφερόμενο (carried) ακολουθεί τους Όρους της Συμφωνίας: lost = 0· next_period = leftover της αμέσως προηγούμενης·
-- accumulate = άθροισμα των leftover όλων των προηγούμενων. balance = given + carried − used − reserved.
-- Πολιτική αρνητικού υπολοίπου: το leftover μπορεί να είναι αρνητικό· για μεταφορά μετράει ως 0.
-- Ξαναγράφεται: οι τύποι γίνονται numeric (τα ώρες του Τρόπου «ανά ώρα» έχουν δεκαδικά).
drop function authz.period_balance(uuid, uuid);
create function authz.period_balance(p_period uuid, p_kind uuid)
returns table (given numeric, carried numeric, used numeric, reserved numeric, balance numeric)
language sql stable security definer set search_path = ''
as $$
  with target as (
    select pe.agreement_id, pe.n from public.agreement_periods pe where pe.id = p_period
  ), ledger as (
    select pe.n,
           coalesce(pp.given, 0)::numeric as given_count,
           authz.period_provision_used(pe.id, p_kind) as used_count,
           authz.period_provision_reserved(pe.id, p_kind) as reserved_count
      from public.agreement_periods pe
      join target t on t.agreement_id = pe.agreement_id and pe.n <= t.n
      left join public.agreement_period_provisions pp on pp.period_id = pe.id and pp.kind_id = p_kind
  ), leftover as (
    select l.n, l.given_count, l.used_count, l.reserved_count,
           l.given_count - l.used_count - l.reserved_count as left_count
      from ledger l
  )
  select cur.given_count::numeric, carry.amount::numeric, cur.used_count::numeric, cur.reserved_count::numeric,
         (cur.given_count + carry.amount - cur.used_count - cur.reserved_count)::numeric
    from leftover cur
    join target t on t.n = cur.n
    join public.agreements a on a.id = t.agreement_id
    cross join lateral (
      select (case a.unused_provisions
        when 'next_period' then coalesce((select greatest(prev.left_count, 0) from leftover prev where prev.n = cur.n - 1), 0)
        when 'accumulate' then coalesce((select greatest(sum(prev.left_count), 0) from leftover prev where prev.n < cur.n), 0)
        else 0
      end)::numeric as amount
    ) carry;
$$;

-- Εφάπαξ Συμφωνία: δεν έχει Περιόδους. Δίνει ό,τι υπόσχονται οι γραμμές της, μείον ό,τι καταναλώθηκε ή δεσμεύτηκε.
create function authz.one_off_balance_row(p_agreement uuid, p_kind uuid)
returns table (r_given numeric, r_used numeric, r_reserved numeric, r_balance numeric)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_given numeric;
  v_used numeric;
  v_reserved numeric;
begin
  select coalesce(sum(l.quantity * lp.quantity), 0)::numeric into v_given
    from public.agreement_lines l
    join public.agreement_line_provisions lp on lp.line_id = l.id
   where l.agreement_id = p_agreement and lp.kind_id = p_kind;
  v_used := authz.kind_units(p_agreement, null, p_kind, 'used');
  v_reserved := authz.kind_units(p_agreement, null, p_kind, 'reserved');
  return query select v_given, v_used, v_reserved, v_given - v_used - v_reserved;
end;
$$;

-- Διαθέσιμο υπόλοιπο για κράτηση: της Περιόδου, ή της εφάπαξ Συμφωνίας.
create function authz.filming_available(p_agreement uuid, p_period uuid, p_kind uuid) returns numeric
language sql stable security definer set search_path = ''
as $$
  select case when p_period is null then (select o.r_balance from authz.one_off_balance_row(p_agreement, p_kind) o)
              else (select b.balance from authz.period_balance(p_period, p_kind) b) end;
$$;

-- Πόσο καταναλώνει ένα νέο Γύρισμα: 1 (ανά Γύρισμα ή ανά μέρα, αν η μέρα δεν έχει ήδη Γύρισμα), ή οι ώρες (ανά ώρα).
create function authz.filming_need(p_agreement uuid, p_period uuid, p_kind uuid, p_hours numeric, p_starts timestamptz)
returns numeric
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_measure text := (select k.measure from public.provision_kinds k where k.id = p_kind);
  v_day date := (p_starts at time zone 'Europe/Athens')::date;
begin
  if p_kind is null then
    return 0;
  end if;
  if v_measure = 'per_hour' then
    return p_hours;
  end if;
  if v_measure = 'per_day' and (
       exists (select 1 from authz.kind_filmings(p_agreement, p_period, p_kind, 'used') f
                where (f.starts_at at time zone 'Europe/Athens')::date = v_day)
    or exists (select 1 from authz.kind_filmings(p_agreement, p_period, p_kind, 'reserved') f
                where (f.starts_at at time zone 'Europe/Athens')::date = v_day)
  ) then
    return 0;
  end if;
  return 1;
end;
$$;

-- Το Γύρισμα είναι μέσα στο Όριο ακύρωσης; Μέσα = ο πελάτης ακυρώνει ή μεταθέτει μόνος του.
create function authz.before_cancel_limit(p_filming uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
      from public.filmings f
      join public.productions pr on pr.id = f.production_id
      join public.agreements a on a.id = pr.agreement_id
     where f.id = p_filming and f.starts_at - now() > make_interval(hours => a.filming_cancel_hours)
  );
$$;

-- ───────────── Κανόνες γυρισμάτων (ρυθμίσεις) ─────────────

create function authz.setting_bool(p_json jsonb, p_key text, p_current boolean) returns boolean
language plpgsql immutable set search_path = ''
as $$
begin
  if not (p_json ? p_key) then
    return p_current;
  end if;
  if jsonb_typeof(p_json -> p_key) <> 'boolean' then
    raise exception 'Μη έγκυρη τιμή στους Κανόνες γυρισμάτων' using errcode = 'P0001';
  end if;
  return (p_json ->> p_key)::boolean;
end;
$$;

create function authz.setting_int(p_json jsonb, p_key text, p_current integer, p_min integer, p_max integer) returns integer
language plpgsql immutable set search_path = ''
as $$
declare
  v_value integer;
begin
  if not (p_json ? p_key) then
    return p_current;
  end if;
  if jsonb_typeof(p_json -> p_key) <> 'number' then
    raise exception 'Μη έγκυρη τιμή στους Κανόνες γυρισμάτων' using errcode = 'P0001';
  end if;
  v_value := (p_json ->> p_key)::integer;
  if v_value < p_min or v_value > p_max then
    raise exception 'Η τιμή είναι εκτός ορίων στους Κανόνες γυρισμάτων' using errcode = 'P0001';
  end if;
  return v_value;
end;
$$;

create function authz.setting_text(p_json jsonb, p_key text, p_current text, p_allowed text[]) returns text
language plpgsql immutable set search_path = ''
as $$
begin
  if not (p_json ? p_key) then
    return p_current;
  end if;
  if jsonb_typeof(p_json -> p_key) <> 'string' or not (p_json ->> p_key = any (p_allowed)) then
    raise exception 'Μη έγκυρη επιλογή στους Κανόνες γυρισμάτων' using errcode = 'P0001';
  end if;
  return p_json ->> p_key;
end;
$$;

-- ───────────── Κανόνες (triggers, και για τον service role) ─────────────

create trigger filmings_stamp before insert or update on public.filmings
  for each row execute function authz.stamp_equipment_row();
create trigger filming_settings_stamp before insert or update on public.filming_settings
  for each row execute function authz.stamp_equipment_row();
create trigger crew_templates_stamp before insert or update on public.crew_templates
  for each row execute function authz.stamp_equipment_row();

-- Σύνδεση Γυρίσματος: Πελάτης ίδιος με της Παραγωγής, Περίοδος μόνο αν είναι της Παραγωγής, Παροχή για Γύρισμα Πελάτη.
create function authz.guard_filming_links() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_production public.productions;
begin
  select p.* into v_production from public.productions p where p.id = new.production_id;
  if new.client_id is distinct from v_production.client_id then
    raise exception 'Ο Πελάτης του Γυρίσματος δεν είναι της Παραγωγής του' using errcode = 'P0001';
  end if;
  if new.period_id is not null and new.period_id is distinct from v_production.period_id then
    raise exception 'Η Περίοδος δεν είναι της Παραγωγής του Γυρίσματος' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger filmings_links_guard before insert or update on public.filmings
  for each row execute function authz.guard_filming_links();

-- Γύρισμα δεν σβήνεται (ακυρώνεται). Κλειστό Γύρισμα δεν αλλάζει, εκτός από την αναίρεση «έγινε»/«δεν έγινε».
create function authz.guard_filming_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Τα Γυρίσματα δεν σβήνονται, ακυρώνονται' using errcode = 'P0001';
  end if;
  if old.state in ('done', 'no_show', 'cancelled', 'rejected') and not (
       old.state in ('done', 'no_show') and new.state = 'scheduled'
       and coalesce(current_setting('authz.filming_undo', true), '') = 'on') then
    raise exception 'Το Γύρισμα έχει κλείσει και δεν αλλάζει' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger filmings_change_guard before update or delete on public.filmings
  for each row execute function authz.guard_filming_change();

-- Συνεργείο και Εξοπλισμός ενός κλειστού Γυρίσματος δεν αλλάζουν.
create function authz.guard_filming_children() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_filming uuid := case when tg_op = 'DELETE' then old.filming_id else new.filming_id end;
begin
  if not exists (select 1 from public.filmings f where f.id = v_filming and f.state in ('pending', 'scheduled')) then
    raise exception 'Το Γύρισμα έχει κλείσει και δεν αλλάζει' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger filming_crew_children_guard before insert or update or delete on public.filming_crew
  for each row execute function authz.guard_filming_children();
create trigger filming_equipment_children_guard before insert or update or delete on public.filming_equipment
  for each row execute function authz.guard_filming_children();

create function authz.guard_filming_settings() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  raise exception 'Οι Κανόνες γυρισμάτων δεν σβήνονται' using errcode = 'P0001';
  return null;
end;
$$;

create trigger filming_settings_guard before delete on public.filming_settings
  for each row execute function authz.guard_filming_settings();

-- Αποσυρμένο αντικείμενο: οι μελλοντικές Δεσμεύσεις σε ανοιχτά Γυρίσματα αποδεσμεύονται και γράφεται γεγονός.
create function authz.release_retired_equipment() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_filming uuid;
begin
  for v_filming in
    delete from public.filming_equipment fe
     using public.filmings f
     where fe.item_id = new.id and f.id = fe.filming_id
       and f.state in ('pending', 'scheduled') and f.starts_at > now()
    returning fe.filming_id
  loop
    perform authz.filming_event(v_filming, 'equipment_changed', jsonb_build_object('removed', new.id, 'reason', 'retired'));
  end loop;
  return new;
end;
$$;

create trigger equipment_items_retire_release after update of status on public.equipment_items
  for each row when (new.status = 'retired' and old.status is distinct from 'retired')
  execute function authz.release_retired_equipment();

-- Αντικείμενο που έχει έστω μία Δέσμευση δεν διαγράφεται (μόνο αποσύρεται), ούτε το παλιό ιστορικό της Δέσμευσης.
create or replace function authz.guard_equipment_item_delete() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if authz.equipment_item_reserved(old.id) or exists (select 1 from public.filming_equipment fe where fe.item_id = old.id) then
    raise exception 'Το αντικείμενο έχει Δέσμευση, αποσύρεται και δεν διαγράφεται' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

-- ───────────── Ίχνος ενεργειών ─────────────

create trigger filmings_audit after insert or update or delete on public.filmings
  for each row execute function authz.audit_row('id');
create trigger filming_crew_audit after insert or update or delete on public.filming_crew
  for each row execute function authz.audit_row('filming_id');
create trigger filming_equipment_audit after insert or update or delete on public.filming_equipment
  for each row execute function authz.audit_row('filming_id');
create trigger crew_templates_audit after insert or update or delete on public.crew_templates
  for each row execute function authz.audit_row('id');
create trigger crew_template_members_audit after insert or update or delete on public.crew_template_members
  for each row execute function authz.audit_row('template_id');
create trigger filming_settings_audit after insert or update or delete on public.filming_settings
  for each row execute function authz.audit_row('id');

-- Ξαναγράφεται ΟΛΟΚΛΗΡΗ η λίστα (default deny). Προστέθηκαν οι έξι πίνακες των Γυρισμάτων, χωρίς ποσά.
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
    else false
  end;
$$;

-- ───────────── Κάρτες και ανάγνωση ─────────────

-- Το Γύρισμα για τη λίστα (E1, και το Ιστορικό της). Το Συνεργείο φαίνεται μόνο σε όσους βλέπουν Συνεργείο.
create function authz.filming_signals(p_filming uuid, p_internal boolean) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'equipmentConflict', p_internal and authz.filming_has_conflict(f.id),
    'isExtra', f.is_extra,
    'cancelRequest', f.cancel_request_at is not null,
    'crewDeclined', p_internal and exists (select 1 from public.filming_crew c where c.filming_id = f.id and c.response = 'declined')
  )
  from public.filmings f
  where f.id = p_filming;
$$;

create function authz.filming_row(p_filming uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', f.id,
    'startsAt', f.starts_at,
    'hours', f.hours,
    'state', f.state,
    'client', (select jsonb_build_object('id', c.id, 'name', c.name) from public.clients c where c.id = f.client_id),
    'production', (select jsonb_build_object('id', pr.id, 'title', pr.title) from public.productions pr where pr.id = f.production_id),
    'crew', case when authz.can_see_crew(f.id) then jsonb_build_object(
        'confirmed', (select count(*) from public.filming_crew c where c.filming_id = f.id and c.response = 'confirmed'),
        'total', (select count(*) from public.filming_crew c where c.filming_id = f.id)) end,
    'signals', authz.filming_signals(f.id, authz.can_see_crew(f.id))
  )
  from public.filmings f
  where f.id = p_filming;
$$;

-- Κάρτα Παροχής του Γυρίσματος: υπόλοιπο της Περιόδου (ή της εφάπαξ), χωρίς ποσά.
create function authz.filming_balance_json(p_filming uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_agreement uuid;
  v_balance jsonb;
begin
  select x.* into f from public.filmings x where x.id = p_filming;
  if not found then
    return null;
  end if;
  if f.kind_id is null then
    return null;
  end if;
  select pr.agreement_id into v_agreement from public.productions pr where pr.id = f.production_id;
  if v_agreement is null then
    return null;
  end if;
  if f.period_id is not null then
    select jsonb_build_object('given', b.given, 'carried', b.carried, 'used', b.used, 'reserved', b.reserved, 'balance', b.balance)
      into v_balance from authz.period_balance(f.period_id, f.kind_id) b;
  elsif exists (select 1 from public.agreements a where a.id = v_agreement and a.kind = 'one_off') then
    select jsonb_build_object('given', o.r_given, 'carried', 0, 'used', o.r_used, 'reserved', o.r_reserved, 'balance', o.r_balance)
      into v_balance from authz.one_off_balance_row(v_agreement, f.kind_id) o;
  else
    return null;
  end if;
  return v_balance || (
    select jsonb_build_object('kind', jsonb_build_object('id', k.id, 'label', k.label, 'measure', k.measure))
      from public.provision_kinds k where k.id = f.kind_id
  );
end;
$$;

create function authz.filming_crew_json(p_filming uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'userId', c.user_id, 'name', u.name, 'response', c.response, 'reason', c.reason, 'respondedAt', c.responded_at
         ) order by lower(u.name), c.user_id), '[]'::jsonb)
    from public.filming_crew c
    join public.team_users u on u.user_id = c.user_id
   where c.filming_id = p_filming;
$$;

-- Εξοπλισμός του Γυρίσματος. Η σύγκρουση φαίνεται μόνο στην ομάδα (δεν αποκαλύπτει άλλα Γυρίσματα στον πελάτη).
create function authz.filming_equipment_json(p_filming uuid, p_internal boolean) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'itemId', i.id, 'name', i.name, 'status', i.status,
           'conflict', p_internal and authz.item_clash(p_filming, i.id)
         ) order by lower(i.name), i.id), '[]'::jsonb)
    from public.filming_equipment fe
    join public.equipment_items i on i.id = fe.item_id
   where fe.filming_id = p_filming;
$$;

-- Ιστορικό από το Ίχνος (νεότερο πρώτο, έως 100). Διαβάζει το Ίχνος ΕΣΚΕΜΕΝΑ (παρακάμπτει το RLS του audit_log)· μόνο για ομάδα με Συνεργείο.
create function authz.filming_history(p_filming uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(h.entry order by h.at desc, h.id desc), '[]'::jsonb)
    from (
      select a.id, a.at, jsonb_build_object(
          'at', a.at, 'action', a.action, 'event', a.after ->> 'event',
          'actor_name', hu.name, 'before', a.before, 'after', a.after
        ) as entry
        from public.audit_log a
        left join public.team_users hu on hu.user_id = a.actor_id
       where a.entity in ('filmings', 'filming_crew', 'filming_equipment') and a.entity_id = p_filming::text
       order by a.at desc, a.id desc
       limit 100
    ) h;
$$;

-- Τι μπορεί να κάνει ο Χρήστης στο Γύρισμα, με την κατάστασή του τώρα.
create function authz.filming_viewer_can(p_filming uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_team boolean := authz.is_team_user();
  v_open boolean;
  v_approve boolean;
  v_book boolean;
  v_crew boolean;
  v_equipment boolean;
begin
  select x.* into f from public.filmings x where x.id = p_filming;
  if not found then
    return '{}'::jsonb;
  end if;
  v_open := f.state in ('pending', 'scheduled');
  v_approve := v_team and authz.can_approve_filming();
  v_book := v_team and v_open and authz.can_book_filming(f.id);
  v_crew := v_team and v_open and authz.can_crew_filming(f.id);
  v_equipment := v_team and v_open and authz.can_reserve_for_filming(f.id);
  return jsonb_build_object(
    'approve', v_approve and f.state = 'pending',
    'reject', v_approve and f.state = 'pending',
    'cancel', v_book,
    'reschedule', v_book,
    'markDone', v_crew and f.state = 'scheduled',
    'markNoShow', v_crew and f.state = 'scheduled',
    'undo', v_approve and f.state in ('done', 'no_show'),
    'crew', v_crew,
    'equipment', v_equipment,
    'decideCancel', v_approve and f.state = 'scheduled' and f.cancel_request_at is not null,
    'clientCancel', authz.is_client_of_filming(f.id) and v_open and (f.state = 'pending' or authz.before_cancel_limit(f.id)),
    'requestCancel', authz.is_client_of_filming(f.id) and f.state = 'scheduled'
                     and f.cancel_request_at is null and not authz.before_cancel_limit(f.id)
  );
end;
$$;

-- Η πλήρης κάρτα του Γυρίσματος (E3). Ο πελάτης βλέπει: τα στοιχεία του, την Παροχή, τις ώρες του και τη δική του σημείωση.
create function authz.filming_card(p_filming uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_internal boolean := authz.can_see_crew(p_filming);
  v_client_equipment boolean := coalesce((select s.client_sees_equipment from public.filming_settings s where s.id), false);
  v_sees_equipment boolean := v_internal or (authz.is_client_of_filming(p_filming) and v_client_equipment);
begin
  select x.* into f from public.filmings x where x.id = p_filming;
  return jsonb_build_object(
    'id', f.id, 'startsAt', f.starts_at, 'hours', f.hours, 'actualHours', f.actual_hours, 'location', f.location,
    'origin', f.origin, 'state', f.state, 'isExtra', f.is_extra, 'burned', f.burned,
    'kind', (select jsonb_build_object('id', k.id, 'label', k.label, 'measure', k.measure) from public.provision_kinds k where k.id = f.kind_id),
    'client', (select jsonb_build_object('id', c.id, 'name', c.name) from public.clients c where c.id = f.client_id),
    'production', (select jsonb_build_object('id', pr.id, 'title', pr.title, 'isInternal', pr.client_id is null)
                     from public.productions pr where pr.id = f.production_id),
    'agreement', (select jsonb_build_object('id', a.id, 'title', a.title, 'kind', a.kind, 'filmingCancelHours', a.filming_cancel_hours)
                    from public.productions pr join public.agreements a on a.id = pr.agreement_id
                   where pr.id = f.production_id),
    'period', (select jsonb_build_object('n', pe.n, 'starts', pe.starts, 'ends', pe.ends,
                                         'state', authz.period_state(pe.starts, pe.ends))
                 from public.agreement_periods pe where pe.id = f.period_id),
    'clientNote', f.client_note,
    'internalNote', case when v_internal then f.internal_note end,
    'approvedAt', f.approved_at,
    'rejectedAt', f.rejected_at,
    'rejectedReason', f.rejected_reason,
    'cancelledAt', f.cancelled_at,
    'cancelledSide', f.cancelled_side,
    'cancelledReason', f.cancelled_reason,
    'cancelRequest', case when f.cancel_request_at is null then null
                          else jsonb_build_object('at', f.cancel_request_at, 'reason', f.cancel_request_reason) end,
    'doneAt', f.done_at,
    'noShowAt', f.no_show_at,
    'provision', authz.filming_balance_json(f.id),
    'crew', case when v_internal then authz.filming_crew_json(f.id) else '[]'::jsonb end,
    'equipment', case when v_sees_equipment then authz.filming_equipment_json(f.id, v_internal) else '[]'::jsonb end,
    'history', case when v_internal then authz.filming_history(f.id) else '[]'::jsonb end,
    'signals', authz.filming_signals(f.id, v_internal),
    'viewerCan', authz.filming_viewer_can(f.id)
  );
end;
$$;

-- Ποιες Συμφωνίες μπορεί να κλείσει ο Χρήστης, με τα στοιχεία κράτησης (E4). Το υπόλοιπο είναι της τρέχουσας ή επόμενης Περιόδου.
create function authz.agreement_booking_json(p_agreement uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_period uuid;
  v_settings public.filming_settings;
begin
  select x.* into a from public.agreements x where x.id = p_agreement;
  select s.* into v_settings from public.filming_settings s where s.id;
  select pe.id into v_period from public.agreement_periods pe
   where pe.agreement_id = p_agreement and authz.period_is_open(pe.id)
   order by pe.n limit 1;
  return jsonb_build_object(
    'id', a.id, 'title', a.title, 'kind', a.kind,
    'client', (select jsonb_build_object('id', c.id, 'name', c.name)
                 from public.opportunities o join public.clients c on c.id = o.client_id
                where o.id = a.opportunity_id),
    'noticeHours', a.filming_notice_hours,
    'cancelHours', a.filming_cancel_hours,
    'horizonDays', v_settings.horizon_days,
    'bookingNeedsApproval', v_settings.booking_needs_approval,
    'period', (select jsonb_build_object('id', pe.id, 'n', pe.n, 'starts', pe.starts, 'ends', pe.ends)
                 from public.agreement_periods pe where pe.id = v_period),
    'kinds', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', k.id, 'label', k.label, 'measure', k.measure, 'defaultHours', k.default_hours,
               'balance', case when v_period is null and a.kind = 'monthly' then null
                               else authz.filming_available(a.id, v_period, k.id) end
             ) order by k.sort, k.id)
        from (select distinct lp.kind_id
                from public.agreement_lines l
                join public.agreement_line_provisions lp on lp.line_id = l.id
               where l.agreement_id = a.id) g
        join public.provision_kinds k on k.id = g.kind_id
       where k.measure is not null and k.retired_at is null
    ), '[]'::jsonb)
  );
end;
$$;

-- Λίστα Γυρισμάτων (E1). Καρτέλες: open, pending, needs_outcome, closed, all. Σελίδα έως 100.
create function public.filmings_view(p_tab text default 'open', p_limit integer default 100) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_rows jsonb;
begin
  perform authz.require_filming_viewer();
  if p_tab is null or p_tab not in ('open', 'pending', 'needs_outcome', 'closed', 'all') then
    raise exception 'Άγνωστη καρτέλα Γυρισμάτων' using errcode = 'P0001';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Η σελίδα έχει από 1 ως 100 γραμμές' using errcode = 'P0001';
  end if;
  select coalesce(jsonb_agg(authz.filming_row(f.id) order by f.starts_at, f.id), '[]'::jsonb)
    into v_rows
    from (
      select x.* from public.filmings x
       where authz.can_see_filming(x.id) and case p_tab
         when 'open' then x.state in ('pending', 'scheduled')
         when 'pending' then x.state = 'pending'
         when 'needs_outcome' then x.state = 'scheduled' and x.starts_at < now()
         when 'closed' then x.state in ('done', 'no_show', 'cancelled', 'rejected')
         else true
       end
       order by x.starts_at, x.id
       limit p_limit
    ) f;
  return v_rows;
end;
$$;

-- Σήμα «περιμένει» και η ουρά έγκρισης (E2): αναμένουν έγκριση (παλαιότερο πρώτο) και αιτήματα ακύρωσης μετά το Όριο.
create function public.filming_queue_view() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_no_answer integer := (select s.no_answer_hours from public.filming_settings s where s.id);
  v_pending jsonb;
  v_requests jsonb;
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
   where f.state = 'scheduled' and f.cancel_request_at is not null;
  return jsonb_build_object('pending', v_pending, 'cancelRequests', v_requests);
end;
$$;

-- Σελίδα Γυρίσματος (E3).
create function public.filming_view(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require_filming_viewer();
  perform authz.filming_gate(p_id, authz.can_see_filming(p_id), 'filming.view');
  return authz.filming_card(p_id);
end;
$$;

-- Τα Γυρίσματά μου (E6): όσα έχω στο Συνεργείο και είναι ανοιχτά.
create function public.filming_mine_view() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.is_team_user() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', f.id, 'startsAt', f.starts_at, 'hours', f.hours, 'location', f.location, 'state', f.state,
        'note', f.internal_note, 'myResponse', c.response, 'myReason', c.reason,
        'production', jsonb_build_object('id', pr.id, 'title', pr.title),
        'client', (select jsonb_build_object('id', cl.id, 'name', cl.name) from public.clients cl where cl.id = f.client_id)
      ) order by f.starts_at, f.id)
      from public.filming_crew c
      join public.filmings f on f.id = c.filming_id
      join public.productions pr on pr.id = f.production_id
     where c.user_id = auth.uid() and f.state in ('pending', 'scheduled')
  ), '[]'::jsonb);
end;
$$;

-- Επιλογές κράτησης (E4): Συμφωνίες που μπορούν να κλείσουν, με τα είδη Παροχής και το υπόλοιπό τους.
create function public.filming_new_options(p_client uuid default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid := authz.client_user_client_id();
begin
  if v_client is null and not (authz.is_team_user() and authz.has('filming.book')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(authz.agreement_booking_json(a.id) order by c.name, a.title, a.id)
      from public.agreements a
      join public.opportunities o on o.id = a.opportunity_id
      join public.clients c on c.id = o.client_id
     where a.state in ('signed', 'active')
       and (case when v_client is not null then c.id = v_client
                 else authz.can_book_for_client(c.id) and (p_client is null or c.id = p_client) end)
  ), '[]'::jsonb);
end;
$$;

-- ───────────── Εγγραφή: Γυρίσματα ─────────────

-- Κλείσιμο από τον πελάτη (c.book). Προγραμματισμένο αν δεν θέλει έγκριση ο Κανόνας· αλλιώς αναμένει έγκριση.
create function public.filming_book(
  p_agreement uuid, p_starts_at timestamptz, p_hours numeric, p_kind uuid, p_location text, p_note text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  s public.filming_settings;
  v_place record;
  v_state text;
  v_id uuid;
begin
  a := authz.client_agreement(p_agreement);
  perform authz.require_agreement_bookable(a);
  perform authz.require_filming_slot(p_starts_at, p_hours);
  perform authz.filming_check_kind(a.id, p_kind);
  select x.* into s from public.filming_settings x where x.id;
  if p_starts_at <= now() + make_interval(hours => a.filming_notice_hours) then
    raise exception 'Η κράτηση θέλει προειδοποίηση τουλάχιστον % ωρών', a.filming_notice_hours using errcode = 'P0001';
  end if;
  if (p_starts_at at time zone 'Europe/Athens')::date > public.sales_today() + s.horizon_days then
    raise exception 'Η κράτηση γίνεται το πολύ % μέρες μπροστά', s.horizon_days using errcode = 'P0001';
  end if;
  if not authz.filming_slot_open(p_starts_at, p_hours) then
    raise exception 'Η ώρα δεν είναι διαθέσιμη' using errcode = 'P0001';
  end if;
  select * into v_place from authz.filming_place(a.id, p_starts_at);
  if not found then
    raise exception 'Η μέρα δεν πέφτει σε Περίοδο της Συμφωνίας' using errcode = 'P0001';
  end if;
  if v_place.r_period is not null and not authz.period_is_open(v_place.r_period) then
    raise exception 'Η Περίοδος δεν άνοιξε' using errcode = 'P0001';
  end if;
  perform authz.require_production_open(v_place.r_production);
  if not v_place.r_outside and authz.filming_available(a.id, v_place.r_period, p_kind)
       < authz.filming_need(a.id, v_place.r_period, p_kind, p_hours, p_starts_at) then
    raise exception 'Οι Παροχές της Περιόδου τελείωσαν· στείλε Αίτημα στην ομάδα' using errcode = 'P0001';
  end if;
  v_state := case when s.booking_needs_approval or v_place.r_outside then 'pending' else 'scheduled' end;
  insert into public.filmings (
    production_id, period_id, client_id, kind_id, starts_at, hours, location, origin, state, is_extra, client_note
  ) values (
    v_place.r_production, v_place.r_period, authz.client_user_client_id(), p_kind, p_starts_at, p_hours,
    nullif(trim(coalesce(p_location, '')), ''), 'client', v_state, v_place.r_outside,
    nullif(trim(coalesce(p_note, '')), '')
  )
  returning id into v_id;
  perform authz.filming_event(v_id, 'booked', jsonb_build_object('state', v_state, 'extra', v_place.r_outside));
  return v_id;
end;
$$;

-- Ομάδα κλείνει Γύρισμα για Πελάτη (filming.book). Πάντα προγραμματισμένο. Έξτρα αν τελείωσε η Παροχή ή δεν δίνεται Παροχή.
create function public.filming_create(
  p_agreement uuid, p_starts_at timestamptz, p_hours numeric, p_kind uuid, p_location text, p_note text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_client uuid;
  v_place record;
  v_id uuid;
begin
  perform authz.require('filming.book');
  a := authz.team_agreement_for_booking(p_agreement);
  perform authz.require_agreement_bookable(a);
  perform authz.require_filming_slot(p_starts_at, p_hours);
  if p_kind is not null then
    perform authz.filming_check_kind(a.id, p_kind);
  end if;
  if not authz.filming_slot_open(p_starts_at, p_hours) then
    raise exception 'Η ώρα δεν είναι διαθέσιμη' using errcode = 'P0001';
  end if;
  select o.client_id into v_client from public.opportunities o where o.id = a.opportunity_id;
  select * into v_place from authz.filming_place(a.id, p_starts_at);
  if not found then
    raise exception 'Η μέρα δεν πέφτει σε Περίοδο της Συμφωνίας' using errcode = 'P0001';
  end if;
  perform authz.require_production_open(v_place.r_production);
  insert into public.filmings (
    production_id, period_id, client_id, kind_id, starts_at, hours, location, origin, state, is_extra, internal_note
  ) values (
    v_place.r_production, v_place.r_period, v_client, p_kind, p_starts_at, p_hours,
    nullif(trim(coalesce(p_location, '')), ''), 'team', 'scheduled',
    v_place.r_outside or p_kind is null
      or authz.filming_available(a.id, v_place.r_period, p_kind)
         < authz.filming_need(a.id, v_place.r_period, p_kind, p_hours, p_starts_at),
    nullif(trim(coalesce(p_note, '')), '')
  )
  returning id into v_id;
  perform authz.filming_event(v_id, 'created', jsonb_build_object('origin', 'team'));
  return v_id;
end;
$$;

-- Γύρισμα της εσωτερικής Παραγωγής (χωρίς Πελάτη, χωρίς Παροχή). Μόνο για Εύρος «όλα».
create function public.filming_create_internal(
  p_production uuid, p_starts_at timestamptz, p_hours numeric, p_location text, p_note text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform authz.require('filming.book');
  if coalesce(authz.scope('filming.book') = 'all', false) is not true then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.require_production(p_production);
  if exists (select 1 from public.productions pr where pr.id = p_production and pr.client_id is not null) then
    raise exception 'Η Παραγωγή έχει Πελάτη· τα Γυρίσματά της κλείνονται από τη Συμφωνία' using errcode = 'P0001';
  end if;
  perform authz.require_production_open(p_production);
  perform authz.require_filming_slot(p_starts_at, p_hours);
  insert into public.filmings (production_id, starts_at, hours, location, origin, state, internal_note)
  values (p_production, p_starts_at, p_hours, nullif(trim(coalesce(p_location, '')), ''), 'team', 'scheduled',
          nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_id;
  perform authz.filming_event(v_id, 'created', jsonb_build_object('origin', 'team', 'internal', true));
  return v_id;
end;
$$;

-- ───────────── Μεταβάσεις ─────────────

create function public.filming_approve(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_state text;
begin
  perform authz.require('filming.approve');
  perform authz.filming_gate(p_id, authz.can_approve_filming(), 'filming.approve');
  select f.state into v_state from public.filmings f where f.id = p_id for update;
  if v_state <> 'pending' then
    raise exception 'Μόνο γύρισμα που αναμένει έγκριση εγκρίνεται' using errcode = 'P0001';
  end if;
  update public.filmings f set state = 'scheduled', approved_at = now(), approved_by = auth.uid() where f.id = p_id;
  perform authz.filming_event(p_id, 'approved', '{}'::jsonb);
end;
$$;

create function public.filming_reject(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_state text;
begin
  perform authz.require('filming.approve');
  perform authz.filming_gate(p_id, authz.can_approve_filming(), 'filming.approve');
  if v_reason is null then
    raise exception 'Η απόρριψη θέλει λόγο' using errcode = 'P0001';
  end if;
  select f.state into v_state from public.filmings f where f.id = p_id for update;
  if v_state <> 'pending' then
    raise exception 'Μόνο γύρισμα που αναμένει έγκριση απορρίπτεται' using errcode = 'P0001';
  end if;
  update public.filmings f
     set state = 'rejected', rejected_at = now(), rejected_by = auth.uid(), rejected_reason = v_reason
   where f.id = p_id;
  perform authz.filming_event(p_id, 'rejected', jsonb_build_object('reason', v_reason));
end;
$$;

-- Ακύρωση από την ομάδα (filming.book): πάντα επιστρέφει η Παροχή.
create function public.filming_cancel(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_state text;
begin
  perform authz.require('filming.book');
  perform authz.filming_gate(p_id, authz.can_book_filming(p_id), 'filming.book');
  if v_reason is null then
    raise exception 'Η ακύρωση θέλει λόγο' using errcode = 'P0001';
  end if;
  select f.state into v_state from public.filmings f where f.id = p_id for update;
  if v_state not in ('pending', 'scheduled') then
    raise exception 'Μόνο ανοιχτό Γύρισμα ακυρώνεται' using errcode = 'P0001';
  end if;
  update public.filmings f
     set state = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), cancelled_side = 'team',
         cancelled_reason = v_reason, burned = false, cancel_request_at = null, cancel_request_by = null,
         cancel_request_reason = null
   where f.id = p_id;
  perform authz.filming_event(p_id, 'cancelled', jsonb_build_object('side', 'team', 'reason', v_reason));
end;
$$;

-- Ακύρωση από τον πελάτη: πάντα όσο αναμένει έγκριση· αλλιώς μόνο μέσα στο Όριο ακύρωσης.
create function public.filming_client_cancel(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_state text;
begin
  if authz.client_user_client_id() is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.filming_gate(p_id, authz.is_client_of_filming(p_id), 'c.book');
  select f.state into v_state from public.filmings f where f.id = p_id for update;
  if v_state not in ('pending', 'scheduled') then
    raise exception 'Μόνο ανοιχτό Γύρισμα ακυρώνεται' using errcode = 'P0001';
  end if;
  if v_state = 'scheduled' and not authz.before_cancel_limit(p_id) then
    raise exception 'Μετά το Όριο ακύρωσης ζήτησε ακύρωση από την ομάδα' using errcode = 'P0001';
  end if;
  update public.filmings f
     set state = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), cancelled_side = 'client',
         cancelled_reason = nullif(trim(coalesce(p_reason, '')), ''), burned = false
   where f.id = p_id;
  perform authz.filming_event(p_id, 'cancelled', jsonb_build_object('side', 'client', 'reason', nullif(trim(coalesce(p_reason, '')), '')));
end;
$$;

-- Αίτημα ακύρωσης του πελάτη μετά το Όριο (ένα εκκρεμές κάθε φορά).
create function public.filming_request_cancel(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
begin
  if authz.client_user_client_id() is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.filming_gate(p_id, authz.is_client_of_filming(p_id), 'c.book');
  select x.* into f from public.filmings x where x.id = p_id for update;
  if f.state <> 'scheduled' then
    raise exception 'Μόνο προγραμματισμένο Γύρισμα έχει αίτημα ακύρωσης' using errcode = 'P0001';
  end if;
  if authz.before_cancel_limit(p_id) then
    raise exception 'Μέσα στο Όριο ακύρωσης ακυρώνεις μόνος σου' using errcode = 'P0001';
  end if;
  if f.cancel_request_at is not null then
    raise exception 'Υπάρχει ήδη αίτημα ακύρωσης για αυτό το Γύρισμα' using errcode = 'P0001';
  end if;
  update public.filmings x
     set cancel_request_at = now(), cancel_request_by = auth.uid(), cancel_request_reason = nullif(trim(coalesce(p_reason, '')), '')
   where x.id = p_id;
  perform authz.filming_event(p_id, 'cancel_requested', jsonb_build_object('reason', nullif(trim(coalesce(p_reason, '')), '')));
end;
$$;

-- Απόφαση στο αίτημα ακύρωσης (filming.approve). Δεκτό: ακυρώνεται από τον πελάτη, με Παροχή που καίγεται αν το ορίζει η Συμφωνία.
create function public.filming_decide_cancel_request(p_id uuid, p_accept boolean, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_burn boolean;
begin
  perform authz.require('filming.approve');
  perform authz.filming_gate(p_id, authz.can_approve_filming(), 'filming.approve');
  select x.* into f from public.filmings x where x.id = p_id for update;
  if f.state <> 'scheduled' or f.cancel_request_at is null then
    raise exception 'Δεν υπάρχει αίτημα ακύρωσης για αυτό το Γύρισμα' using errcode = 'P0001';
  end if;
  if coalesce(p_accept, false) then
    select coalesce(a.late_cancel_burns, false) into v_burn
      from public.productions pr join public.agreements a on a.id = pr.agreement_id
     where pr.id = f.production_id;
    update public.filmings x
       set state = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), cancelled_side = 'client',
           cancelled_reason = f.cancel_request_reason, burned = coalesce(v_burn, false),
           cancel_request_at = null, cancel_request_by = null, cancel_request_reason = null
     where x.id = p_id;
    perform authz.filming_event(p_id, 'cancel_request_decided', jsonb_build_object('accepted', true, 'burned', coalesce(v_burn, false)));
  else
    update public.filmings x
       set cancel_request_at = null, cancel_request_by = null, cancel_request_reason = null
     where x.id = p_id;
    perform authz.filming_event(p_id, 'cancel_request_decided', jsonb_build_object('accepted', false, 'reason', nullif(trim(coalesce(p_reason, '')), '')));
  end if;
end;
$$;

-- Μετάθεση από την ομάδα. Αν αλλάξει μήνας αλλάζει Περίοδος και Παραγωγή. Μηδενίζει τις απαντήσεις αν ο Κανόνας το λέει.
create function public.filming_reschedule(p_id uuid, p_starts_at timestamptz, p_hours numeric) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  f public.filmings;
  v_agreement uuid;
  v_place record;
  v_extra boolean;
  v_reset boolean;
begin
  perform authz.require('filming.book');
  perform authz.filming_gate(p_id, authz.can_book_filming(p_id), 'filming.book');
  select x.* into f from public.filmings x where x.id = p_id for update;
  if f.state not in ('pending', 'scheduled') then
    raise exception 'Μόνο ανοιχτό Γύρισμα μετατίθεται' using errcode = 'P0001';
  end if;
  perform authz.require_filming_slot(p_starts_at, p_hours);
  select pr.agreement_id into v_agreement from public.productions pr where pr.id = f.production_id;
  if v_agreement is null then
    update public.filmings x set starts_at = p_starts_at, hours = p_hours where x.id = p_id;
  else
    select * into v_place from authz.filming_place(v_agreement, p_starts_at);
    if not found then
      raise exception 'Η νέα μέρα δεν πέφτει σε Περίοδο της Συμφωνίας' using errcode = 'P0001';
    end if;
    perform authz.require_production_open(v_place.r_production);
    v_extra := f.is_extra;
    if v_place.r_production is distinct from f.production_id or v_place.r_period is distinct from f.period_id then
      v_extra := v_place.r_outside or f.kind_id is null or not authz.filming_available(v_agreement, v_place.r_period, f.kind_id) >= authz.filming_need(v_agreement, v_place.r_period, f.kind_id, p_hours, p_starts_at);
    end if;
    update public.filmings x
       set production_id = v_place.r_production, period_id = v_place.r_period, starts_at = p_starts_at,
           hours = p_hours, is_extra = v_extra
     where x.id = p_id;
  end if;
  select coalesce(s.change_resets_confirmations, false) into v_reset from public.filming_settings s where s.id;
  if v_reset then
    update public.filming_crew c set response = 'pending', reason = null, responded_at = null where c.filming_id = p_id;
  end if;
  perform authz.filming_event(p_id, 'rescheduled', jsonb_build_object('from', f.starts_at, 'to', p_starts_at, 'hours', p_hours));
end;
$$;

-- «Έγινε» με πραγματικές ώρες (filming.crew). Καταναλώνει Παροχή (per_hour με τις πραγματικές ώρες).
create function public.filming_mark_done(p_id uuid, p_actual_hours numeric) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_state text;
begin
  perform authz.require('filming.crew');
  perform authz.filming_gate(p_id, authz.can_crew_filming(p_id), 'filming.crew');
  if p_actual_hours is null or p_actual_hours <= 0 or p_actual_hours > 24 or round(p_actual_hours, 1) <> p_actual_hours then
    raise exception 'Γράψε τις πραγματικές ώρες: από 0,1 έως 24, με μία δεκαδική' using errcode = 'P0001';
  end if;
  select f.state into v_state from public.filmings f where f.id = p_id for update;
  if v_state <> 'scheduled' then
    raise exception 'Μόνο προγραμματισμένο Γύρισμα σημειώνεται «έγινε»' using errcode = 'P0001';
  end if;
  update public.filmings f
     set state = 'done', done_at = now(), done_by = auth.uid(), actual_hours = p_actual_hours, burned = false
   where f.id = p_id;
  perform authz.filming_event(p_id, 'done', jsonb_build_object('actualHours', p_actual_hours));
end;
$$;

-- «Δεν έγινε» (filming.crew). Καίει Παροχή αν το ορίζουν οι Όροι της Συμφωνίας.
create function public.filming_mark_no_show(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_state text;
  v_burn boolean;
begin
  perform authz.require('filming.crew');
  perform authz.filming_gate(p_id, authz.can_crew_filming(p_id), 'filming.crew');
  select f.state into v_state from public.filmings f where f.id = p_id for update;
  if v_state <> 'scheduled' then
    raise exception 'Μόνο προγραμματισμένο Γύρισμα σημειώνεται «δεν έγινε»' using errcode = 'P0001';
  end if;
  select coalesce(a.no_show_burns, false) into v_burn
    from public.filmings f
    join public.productions pr on pr.id = f.production_id
    left join public.agreements a on a.id = pr.agreement_id
   where f.id = p_id;
  update public.filmings f
     set state = 'no_show', no_show_at = now(), no_show_by = auth.uid(), burned = coalesce(v_burn, false)
   where f.id = p_id;
  perform authz.filming_event(p_id, 'no_show', jsonb_build_object('burned', coalesce(v_burn, false)));
end;
$$;

-- Αναίρεση «έγινε»/«δεν έγινε» με λόγο (filming.approve). Το Γύρισμα ξαναγίνεται προγραμματισμένο.
create function public.filming_undo_outcome(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_state text;
begin
  perform authz.require('filming.approve');
  perform authz.filming_gate(p_id, authz.can_approve_filming(), 'filming.approve');
  if v_reason is null then
    raise exception 'Η αναίρεση θέλει λόγο' using errcode = 'P0001';
  end if;
  select f.state into v_state from public.filmings f where f.id = p_id for update;
  if v_state not in ('done', 'no_show') then
    raise exception 'Μόνο «έγινε» ή «δεν έγινε» αναιρείται' using errcode = 'P0001';
  end if;
  perform set_config('authz.filming_undo', 'on', true);
  update public.filmings f
     set state = 'scheduled', done_at = null, done_by = null, actual_hours = null,
         no_show_at = null, no_show_by = null, burned = false
   where f.id = p_id;
  perform set_config('authz.filming_undo', 'off', true);
  perform authz.filming_event(p_id, 'outcome_undone', jsonb_build_object('from', v_state, 'reason', v_reason));
end;
$$;

-- ───────────── Συνεργείο ─────────────

-- Κοινός κανόνας για Συνεργείο (ρητό και από Πρότυπο). Ρητό: μπλοκάρει αν κάποιος έχει άλλο Γύρισμα. Πρότυπο: παραλείπει.
create function authz.filming_crew_write(p_filming uuid, p_users uuid[], p_lenient boolean) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
  v_name text;
  v_valid uuid[] := '{}';
  v_skipped jsonb := '[]'::jsonb;
  v_added uuid[];
  v_removed uuid[];
  v_reset boolean := coalesce((select s.change_resets_confirmations from public.filming_settings s where s.id), false);
begin
  perform authz.assert_distinct_ids(p_users);
  foreach v_user in array coalesce(p_users, '{}'::uuid[]) loop
    select u.name into v_name from public.team_users u where u.user_id = v_user and u.is_active;
    if not found then
      if p_lenient then
        v_skipped := v_skipped || jsonb_build_object('userId', v_user, 'reason', 'inactive');
        continue;
      end if;
      raise exception 'Ο Χρήστης δεν βρέθηκε' using errcode = 'P0001';
    end if;
    if authz.crew_clash(v_user, p_filming) then
      if p_lenient then
        v_skipped := v_skipped || jsonb_build_object('userId', v_user, 'name', v_name, 'reason', 'busy');
        continue;
      end if;
      raise exception 'Το άτομο % έχει άλλο Γύρισμα αυτή την ώρα', v_name using errcode = 'P0001';
    end if;
    v_valid := v_valid || v_user;
  end loop;
  v_added := array(select x from unnest(v_valid) x
                    where not exists (select 1 from public.filming_crew c where c.filming_id = p_filming and c.user_id = x));
  v_removed := array(select c.user_id from public.filming_crew c
                      where c.filming_id = p_filming and c.user_id <> all (v_valid));
  delete from public.filming_crew c where c.filming_id = p_filming and c.user_id = any (v_removed);
  insert into public.filming_crew (filming_id, user_id, added_by)
  select p_filming, x, auth.uid() from unnest(v_added) x;
  insert into public.production_members (production_id, user_id, added_by)
  select f.production_id, x, auth.uid()
    from public.filmings f cross join unnest(v_added) x
   where f.id = p_filming
     and not exists (select 1 from public.productions pr where pr.id = f.production_id and pr.owner_id = x)
  on conflict (production_id, user_id) do nothing;
  if cardinality(v_added) > 0 or cardinality(v_removed) > 0 then
    if v_reset then
      update public.filming_crew c set response = 'pending', reason = null, responded_at = null where c.filming_id = p_filming;
    end if;
    perform authz.filming_event(p_filming, 'crew_changed',
      jsonb_build_object('added', to_jsonb(v_added), 'removed', to_jsonb(v_removed)));
  end if;
  return jsonb_build_object('skipped', v_skipped);
end;
$$;

-- Ορίζει το Συνεργείο (filming.crew). Ο καθένας που μπαίνει γίνεται Μέλος της Παραγωγής.
create function public.filming_crew_set(p_id uuid, p_user_ids uuid[]) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('filming.crew');
  perform authz.filming_gate(p_id, authz.can_crew_filming(p_id), 'filming.crew');
  perform authz.require_open_filming(p_id);
  perform authz.filming_crew_write(p_id, p_user_ids, false);
end;
$$;

-- Η απάντηση του μέλους: «επιβεβαιώνω» ή «δεν μπορώ» με λόγο. Δεν αλλάζει το Γύρισμα.
create function public.filming_crew_respond(p_id uuid, p_response text, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not authz.is_team_user() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if not exists (select 1 from public.filming_crew c where c.filming_id = p_id and c.user_id = auth.uid()) then
    raise exception 'Δεν είσαι στο Συνεργείο αυτού του Γυρίσματος' using errcode = '42501';
  end if;
  if p_response not in ('confirmed', 'declined') then
    raise exception 'Άγνωστη απάντηση' using errcode = 'P0001';
  end if;
  if p_response = 'declined' and v_reason is null then
    raise exception 'Το «δεν μπορώ» θέλει λόγο' using errcode = 'P0001';
  end if;
  perform authz.require_open_filming(p_id);
  update public.filming_crew c
     set response = p_response,
         reason = case when p_response = 'declined' then v_reason else null end,
         responded_at = now()
   where c.filming_id = p_id and c.user_id = auth.uid();
  if p_response = 'declined' then
    perform authz.filming_event(p_id, 'crew_declined', jsonb_build_object('user_id', auth.uid(), 'reason', v_reason));
  end if;
end;
$$;

-- Πρότυπα συνεργείου (filming.crew, οποιοδήποτε Εύρος). Η διαγραφή δεν αλλάζει Γυρίσματα.
create function authz.crew_template_check(p_users uuid[]) returns void
language plpgsql stable set search_path = ''
as $$
begin
  if cardinality(coalesce(p_users, '{}'::uuid[])) = 0 then
    raise exception 'Ένα Πρότυπο συνεργείου θέλει τουλάχιστον ένα άτομο' using errcode = 'P0001';
  end if;
  perform authz.assert_distinct_ids(p_users);
  if exists (select 1 from unnest(p_users) x
              where not exists (select 1 from public.team_users u where u.user_id = x and u.is_active)) then
    raise exception 'Κάποιο άτομο του Προτύπου δεν βρέθηκε' using errcode = 'P0001';
  end if;
end;
$$;

create function public.crew_templates_view() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('filming.crew');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name, 'note', t.note,
        'members', coalesce((
          select jsonb_agg(jsonb_build_object('userId', u.user_id, 'name', u.name) order by lower(u.name), u.user_id)
            from public.crew_template_members m
            join public.team_users u on u.user_id = m.user_id
           where m.template_id = t.id
        ), '[]'::jsonb)
      ) order by lower(t.name), t.id)
      from public.crew_templates t
  ), '[]'::jsonb);
end;
$$;

create function public.crew_template_create(p_name text, p_note text, p_user_ids uuid[]) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_id uuid;
begin
  perform authz.require('filming.crew');
  if length(v_name) = 0 then
    raise exception 'Το Πρότυπο θέλει όνομα' using errcode = 'P0001';
  end if;
  perform authz.crew_template_check(p_user_ids);
  begin
    insert into public.crew_templates (name, note)
    values (v_name, nullif(trim(coalesce(p_note, '')), ''))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Υπάρχει ήδη Πρότυπο με αυτό το όνομα' using errcode = 'P0001';
  end;
  insert into public.crew_template_members (template_id, user_id)
  select v_id, x from unnest(p_user_ids) x;
  return v_id;
end;
$$;

create function public.crew_template_update(p_id uuid, p_name text, p_note text, p_user_ids uuid[]) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
begin
  perform authz.require('filming.crew');
  if length(v_name) = 0 then
    raise exception 'Το Πρότυπο θέλει όνομα' using errcode = 'P0001';
  end if;
  perform 1 from public.crew_templates t where t.id = p_id for update;
  if not found then
    raise exception 'Το Πρότυπο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  perform authz.crew_template_check(p_user_ids);
  begin
    update public.crew_templates t
       set name = v_name, note = nullif(trim(coalesce(p_note, '')), '')
     where t.id = p_id;
  exception when unique_violation then
    raise exception 'Υπάρχει ήδη Πρότυπο με αυτό το όνομα' using errcode = 'P0001';
  end;
  delete from public.crew_template_members m where m.template_id = p_id;
  insert into public.crew_template_members (template_id, user_id)
  select p_id, x from unnest(p_user_ids) x;
end;
$$;

create function public.crew_template_delete(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('filming.crew');
  perform 1 from public.crew_templates t where t.id = p_id for update;
  if not found then
    raise exception 'Το Πρότυπο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  delete from public.crew_template_members m where m.template_id = p_id;
  delete from public.crew_templates t where t.id = p_id;
end;
$$;

-- Εφαρμογή Προτύπου συνεργείου: ίδιο με το ρητό Συνεργείο, αλλά παραλείπει όσους δεν μπορούν, και λέει ποιοι.
create function public.filming_crew_apply_template(p_id uuid, p_template uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('filming.crew');
  perform authz.filming_gate(p_id, authz.can_crew_filming(p_id), 'filming.crew');
  perform authz.require_open_filming(p_id);
  if not exists (select 1 from public.crew_templates t where t.id = p_template) then
    raise exception 'Το Πρότυπο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  return authz.filming_crew_write(p_id, array(
    select m.user_id from public.crew_template_members m where m.template_id = p_template
  ), true);
end;
$$;

-- ───────────── Δέσμευση Εξοπλισμού ─────────────

-- Η λογική των δύο εγγραφών: διαθέσιμο, χωρίς ήδη δεσμευμένο, και σύγκρουση κατά τον Κανόνα.
-- Ρητά (p_lenient false): μπλοκάρει αν ο Κανόνας μπλοκάρει. Πρότυπο (p_lenient true): παραλείπει.
-- p_replace: η λίστα αντικαθιστά (set)· αλλιώς προστίθεται (apply).
create function authz.filming_equipment_write(p_filming uuid, p_items uuid[], p_replace boolean, p_lenient boolean)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_item uuid;
  v_status text;
  v_name text;
  v_block boolean := coalesce((select s.equipment_conflict = 'block' from public.filming_settings s where s.id), false);
  v_added uuid[] := '{}';
  v_skipped jsonb := '[]'::jsonb;
  v_conflicts uuid[] := '{}';
  v_removed uuid[] := '{}';
begin
  perform authz.assert_distinct_ids(p_items);
  if exists (select 1 from unnest(coalesce(p_items, '{}'::uuid[])) x
              where not exists (select 1 from public.equipment_items i where i.id = x)) then
    raise exception 'Κάποιο αντικείμενο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  foreach v_item in array coalesce(p_items, '{}'::uuid[]) loop
    if exists (select 1 from public.filming_equipment fe where fe.filming_id = p_filming and fe.item_id = v_item) then
      continue;
    end if;
    select i.status, i.name into v_status, v_name from public.equipment_items i where i.id = v_item;
    if v_status <> 'available' then
      v_skipped := v_skipped || jsonb_build_object('itemId', v_item, 'name', v_name, 'reason', 'unavailable');
      continue;
    end if;
    if authz.item_clash(p_filming, v_item) then
      if v_block then
        if p_lenient then
          v_skipped := v_skipped || jsonb_build_object('itemId', v_item, 'name', v_name, 'reason', 'conflict');
          continue;
        end if;
        raise exception 'Το αντικείμενο % είναι δεσμευμένο σε άλλο Γύρισμα αυτή την ώρα', v_name using errcode = 'P0001';
      end if;
      v_conflicts := v_conflicts || v_item;
    end if;
    v_added := v_added || v_item;
  end loop;
  if p_replace then
    v_removed := array(select fe.item_id from public.filming_equipment fe
                        where fe.filming_id = p_filming and fe.item_id <> all (coalesce(p_items, '{}'::uuid[])));
    delete from public.filming_equipment fe where fe.filming_id = p_filming and fe.item_id = any (v_removed);
  end if;
  insert into public.filming_equipment (filming_id, item_id, added_by)
  select p_filming, x, auth.uid() from unnest(v_added) x;
  if cardinality(v_added) > 0 or cardinality(v_removed) > 0 then
    perform authz.filming_event(p_filming, 'equipment_changed',
      jsonb_build_object('added', to_jsonb(v_added), 'removed', to_jsonb(v_removed)));
  end if;
  if cardinality(v_conflicts) > 0 then
    perform authz.filming_event(p_filming, 'equipment_conflict', jsonb_build_object('items', to_jsonb(v_conflicts)));
  end if;
  return jsonb_build_object('added', to_jsonb(v_added), 'skipped', v_skipped, 'conflicts', to_jsonb(v_conflicts));
end;
$$;

-- Ορίζει τον Εξοπλισμό του Γυρίσματος (equipment.reserve, Εύρος «όλα» ή «όσα με αφορούν»).
create function public.filming_equipment_set(p_id uuid, p_item_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('equipment.reserve');
  perform authz.filming_gate(p_id, authz.can_reserve_for_filming(p_id), 'equipment.reserve');
  perform authz.require_open_filming(p_id);
  return authz.filming_equipment_write(p_id, p_item_ids, true, false);
end;
$$;

-- Προσθήκη Προτύπου εξοπλισμού σε Γύρισμα: όσα υπάρχουν αγνοούνται, όσα δεν είναι διαθέσιμα ή συγκρούονται παραλείπονται.
create function public.filming_equipment_apply_template(p_id uuid, p_template uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('equipment.reserve');
  perform authz.filming_gate(p_id, authz.can_reserve_for_filming(p_id), 'equipment.reserve');
  perform authz.require_open_filming(p_id);
  if not exists (select 1 from public.equipment_templates t where t.id = p_template) then
    raise exception 'Το Πρότυπο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  return authz.filming_equipment_write(p_id, array(
    select te.item_id from public.equipment_template_items te where te.template_id = p_template
  ), false, true);
end;
$$;

-- Δέσμευση αντικειμένου σε Γύρισμα (F2). Επιστρέφει true αν έγινε σύγκρουση (με «προειδοποιεί»).
create function public.equipment_item_reserve(p_item uuid, p_filming uuid) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_status text;
  v_name text;
  v_clash boolean;
  v_block boolean := coalesce((select s.equipment_conflict = 'block' from public.filming_settings s where s.id), false);
begin
  perform authz.require('equipment.reserve');
  perform authz.filming_gate(p_filming, authz.can_reserve_for_filming(p_filming), 'equipment.reserve');
  perform authz.require_open_filming(p_filming);
  select i.status, i.name into v_status, v_name from public.equipment_items i where i.id = p_item;
  if not found then
    raise exception 'Το αντικείμενο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if v_status <> 'available' then
    raise exception 'Το αντικείμενο δεν είναι διαθέσιμο' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.filming_equipment fe where fe.filming_id = p_filming and fe.item_id = p_item) then
    raise exception 'Το αντικείμενο είναι ήδη δεσμευμένο σε αυτό το Γύρισμα' using errcode = 'P0001';
  end if;
  v_clash := authz.item_clash(p_filming, p_item);
  if v_clash and v_block then
    raise exception 'Σύγκρουση εξοπλισμού: το αντικείμενο είναι δεσμευμένο σε άλλο Γύρισμα αυτή την ώρα' using errcode = 'P0001';
  end if;
  insert into public.filming_equipment (filming_id, item_id, added_by) values (p_filming, p_item, auth.uid());
  perform authz.filming_event(p_filming, 'equipment_changed', jsonb_build_object('added', jsonb_build_array(p_item)));
  if v_clash then
    perform authz.filming_event(p_filming, 'equipment_conflict', jsonb_build_object('items', jsonb_build_array(p_item)));
  end if;
  return coalesce(v_clash, false);
end;
$$;

-- Αποδέσμευση αντικειμένου από Γύρισμα (F2).
create function public.equipment_item_release(p_item uuid, p_filming uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('equipment.reserve');
  perform authz.filming_gate(p_filming, authz.can_reserve_for_filming(p_filming), 'equipment.reserve');
  perform authz.require_open_filming(p_filming);
  delete from public.filming_equipment fe where fe.filming_id = p_filming and fe.item_id = p_item;
  if not found then
    raise exception 'Το αντικείμενο δεν είναι δεσμευμένο σε αυτό το Γύρισμα' using errcode = 'P0001';
  end if;
  perform authz.filming_event(p_filming, 'equipment_changed', jsonb_build_object('removed', jsonb_build_array(p_item)));
end;
$$;

-- ───────────── Κανόνες γυρισμάτων (ρυθμίσεις, E-ρυθμίσεις) ─────────────

create function authz.filming_settings_json() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'bookingNeedsApproval', s.booking_needs_approval,
    'noAnswerAction', s.no_answer_action,
    'noAnswerHours', s.no_answer_hours,
    'horizonDays', s.horizon_days,
    'allowOutsidePeriod', s.allow_outside_period,
    'rescheduleNeedsApproval', s.reschedule_needs_approval,
    'equipmentConflict', s.equipment_conflict,
    'clientSeesEquipment', s.client_sees_equipment,
    'sheetSending', s.sheet_sending,
    'changeResetsConfirmations', s.change_resets_confirmations,
    'doneMarking', s.done_marking
  )
  from public.filming_settings s where s.id;
$$;

create function public.filming_settings_view() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('settings.manage');
  return authz.filming_settings_json();
end;
$$;

-- Αποθήκευση Κανόνων. Μερική ενημέρωση: ό,τι λείπει από το αντικείμενο μένει όπως είναι.
create function public.filming_settings_save(p_settings jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s public.filming_settings;
  v jsonb := coalesce(p_settings, '{}'::jsonb);
begin
  perform authz.require('settings.manage');
  if jsonb_typeof(v) <> 'object' then
    raise exception 'Οι Κανόνες γυρισμάτων θέλουν αντικείμενο' using errcode = 'P0001';
  end if;
  select x.* into s from public.filming_settings x where x.id;
  update public.filming_settings x set
    booking_needs_approval = authz.setting_bool(v, 'bookingNeedsApproval', s.booking_needs_approval),
    no_answer_action = authz.setting_text(v, 'noAnswerAction', s.no_answer_action, array['none', 'approve', 'reject']),
    no_answer_hours = authz.setting_int(v, 'noAnswerHours', s.no_answer_hours, 1, 720),
    horizon_days = authz.setting_int(v, 'horizonDays', s.horizon_days, 1, 365),
    allow_outside_period = authz.setting_bool(v, 'allowOutsidePeriod', s.allow_outside_period),
    reschedule_needs_approval = authz.setting_bool(v, 'rescheduleNeedsApproval', s.reschedule_needs_approval),
    equipment_conflict = authz.setting_text(v, 'equipmentConflict', s.equipment_conflict, array['warn', 'block']),
    client_sees_equipment = authz.setting_bool(v, 'clientSeesEquipment', s.client_sees_equipment),
    sheet_sending = authz.setting_text(v, 'sheetSending', s.sheet_sending, array['manual', 'auto']),
    change_resets_confirmations = authz.setting_bool(v, 'changeResetsConfirmations', s.change_resets_confirmations),
    done_marking = authz.setting_text(v, 'doneMarking', s.done_marking, array['manual', 'auto'])
   where x.id;
end;
$$;

-- Υποψήφια μέλη Συνεργείου (E3, E7): ενεργοί Χρήστες ομάδας. Μόνο για filming.crew.
create function public.filming_crew_candidates() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('filming.crew');
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', u.user_id, 'name', u.name) order by lower(u.name), u.user_id)
      from public.team_users u
     where u.is_active
  ), '[]'::jsonb);
end;
$$;

-- Υποψήφια αντικείμενα για Δέσμευση (E3): όσα δεν έχουν αποσυρθεί. Η διαθεσιμότητα ελέγχεται στη δέσμευση.
create function public.filming_equipment_candidates() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('equipment.reserve');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', i.id, 'name', i.name, 'code', i.code, 'status', i.status, 'categoryName', c.name
           ) order by lower(i.name), i.id)
      from public.equipment_items i
      join public.equipment_categories c on c.id = i.category_id
     where i.status <> 'retired'
  ), '[]'::jsonb);
end;
$$;

-- ───────────── Παραγωγή και Εξοπλισμός: οι οθόνες που επεκτείνονται ─────────────

-- Σελίδα Παραγωγής (G2): + λίστα Γυρισμάτων της Παραγωγής όσα βλέπει ο Χρήστης.
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
       ));
end;
$$;

-- Σελίδα αντικειμένου (F2): + Επόμενη Δέσμευση και λίστα ανοιχτών Γυρισμάτων με σήμα σύγκρουσης.
create or replace function public.equipment_item_view(p_item uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_item jsonb;
begin
  perform authz.require('equipment.view');
  select jsonb_build_object(
      'id', i.id, 'name', i.name, 'code', i.code, 'note', i.note,
      'status', i.status, 'status_note', i.status_note,
      'category_id', c.id, 'category_name', c.name, 'category_retired', c.retired_at is not null,
      'updated_at', i.updated_at, 'updated_by_name', u.name,
      'templates', coalesce((
        select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) order by lower(t.name), t.id)
          from public.equipment_template_items ti
          join public.equipment_templates t on t.id = ti.template_id
         where ti.item_id = i.id
      ), '[]'::jsonb),
      -- Διαβάζει το Ίχνος με security definer ΕΣΚΕΜΕΝΑ (παρακάμπτει το RLS του audit_log)· το module δεν έχει ποσά.
      -- Κάθε μελλοντική στήλη κόστους ή αξίας στο equipment_items δεν πρέπει να εμφανίζεται εδώ.
      'history', coalesce((
        select jsonb_agg(h.entry order by h.at desc)
          from (
            select a.at, jsonb_build_object(
                'at', a.at, 'action', a.action, 'event', a.after ->> 'event',
                'actor_name', hu.name, 'before', a.before, 'after', a.after
              ) as entry
              from public.audit_log a
              left join public.team_users hu on hu.user_id = a.actor_id
             where a.entity = 'equipment_items' and a.entity_id = p_item::text
             order by a.at desc, a.id desc
             limit 100
          ) h
      ), '[]'::jsonb),
      -- Γυρίσματα (Γ6): ανοιχτά, με σήμα σύγκρουσης. Ο σύνδεσμος στο Γύρισμα μόνο όσοι το βλέπουν.
      'nextReservation', (
        select jsonb_build_object(
            'filmingId', case when authz.can_see_filming(f.id) then f.id end,
            'startsAt', f.starts_at, 'hours', f.hours, 'state', f.state)
          from public.filming_equipment fe
          join public.filmings f on f.id = fe.filming_id
         where fe.item_id = i.id and f.state in ('pending', 'scheduled') and f.starts_at >= now()
         order by f.starts_at, f.id
         limit 1
      ),
      'reservations', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'filmingId', case when authz.can_see_filming(f.id) then f.id end,
                 'startsAt', f.starts_at, 'hours', f.hours, 'state', f.state,
                 'conflict', authz.item_clash(f.id, i.id)
               ) order by f.starts_at, f.id)
          from public.filming_equipment fe
          join public.filmings f on f.id = fe.filming_id
         where fe.item_id = i.id and f.state in ('pending', 'scheduled')
      ), '[]'::jsonb)
    )
    into v_item
    from public.equipment_items i
    join public.equipment_categories c on c.id = i.category_id
    left join public.team_users u on u.user_id = i.updated_by
   where i.id = p_item;
  if v_item is null then
    raise exception 'Το αντικείμενο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  return v_item;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

-- Καμία συνάρτηση δεν καλείται από ανώνυμο ή συνδεδεμένο Χρήστη χωρίς τον έλεγχο στο σώμα της. Πρώτα κλείνουν όλες.
revoke all on function
  authz.period_provision_used(uuid, uuid),
  authz.period_provision_reserved(uuid, uuid),
  authz.period_balance(uuid, uuid),
  authz.production_has_work(uuid),
  authz.equipment_item_reserved(uuid),
  authz.user_blocked_at(uuid, timestamptz, timestamptz),
  authz.filming_slot_open(timestamptz, numeric),
  authz.filming_end(timestamptz, numeric),
  authz.filming_event(uuid, text, jsonb),
  authz.require_filming_slot(timestamptz, numeric),
  authz.assert_distinct_ids(uuid[]),
  authz.require_open_filming(uuid),
  authz.require_production_open(uuid),
  authz.require_agreement_bookable(public.agreements),
  authz.filming_check_kind(uuid, uuid),
  authz.period_is_open(uuid),
  authz.filming_place(uuid, timestamptz),
  authz.kind_filmings(uuid, uuid, uuid, text),
  authz.kind_units(uuid, uuid, uuid, text),
  authz.signed_used(uuid, uuid),
  authz.is_filming_crew(uuid),
  authz.is_filming_participant(uuid),
  authz.is_client_manager(uuid),
  authz.is_client_of_filming(uuid),
  authz.can_see_filming(uuid),
  authz.can_see_crew(uuid),
  authz.scope_covers_filming(text, uuid),
  authz.can_crew_filming(uuid),
  authz.can_reserve_for_filming(uuid),
  authz.can_book_for_client(uuid),
  authz.can_book_filming(uuid),
  authz.can_approve_filming(),
  authz.require_filming_viewer(),
  authz.filming_gate(uuid, boolean, text),
  authz.client_agreement(uuid),
  authz.team_agreement_for_booking(uuid),
  authz.item_clash(uuid, uuid),
  authz.filming_has_conflict(uuid),
  authz.crew_clash(uuid, uuid),
  authz.one_off_balance_row(uuid, uuid),
  authz.filming_available(uuid, uuid, uuid),
  authz.filming_need(uuid, uuid, uuid, numeric, timestamptz),
  authz.before_cancel_limit(uuid),
  authz.setting_bool(jsonb, text, boolean),
  authz.setting_int(jsonb, text, integer, integer, integer),
  authz.setting_text(jsonb, text, text, text[]),
  authz.guard_filming_links(),
  authz.guard_filming_change(),
  authz.guard_filming_children(),
  authz.guard_filming_settings(),
  authz.release_retired_equipment(),
  authz.filming_signals(uuid, boolean),
  authz.filming_row(uuid),
  authz.filming_balance_json(uuid),
  authz.filming_crew_json(uuid),
  authz.filming_equipment_json(uuid, boolean),
  authz.filming_history(uuid),
  authz.filming_viewer_can(uuid),
  authz.filming_card(uuid),
  authz.agreement_booking_json(uuid),
  authz.filming_crew_write(uuid, uuid[], boolean),
  authz.crew_template_check(uuid[]),
  authz.filming_equipment_write(uuid, uuid[], boolean, boolean),
  authz.filming_settings_json(),
  public.filmings_view(text, integer),
  public.filming_queue_view(),
  public.filming_view(uuid),
  public.filming_mine_view(),
  public.filming_new_options(uuid),
  public.filming_book(uuid, timestamptz, numeric, uuid, text, text),
  public.filming_create(uuid, timestamptz, numeric, uuid, text, text),
  public.filming_create_internal(uuid, timestamptz, numeric, text, text),
  public.filming_approve(uuid),
  public.filming_reject(uuid, text),
  public.filming_cancel(uuid, text),
  public.filming_client_cancel(uuid, text),
  public.filming_request_cancel(uuid, text),
  public.filming_decide_cancel_request(uuid, boolean, text),
  public.filming_reschedule(uuid, timestamptz, numeric),
  public.filming_mark_done(uuid, numeric),
  public.filming_mark_no_show(uuid),
  public.filming_undo_outcome(uuid, text),
  public.filming_crew_set(uuid, uuid[]),
  public.filming_crew_respond(uuid, text, text),
  public.crew_templates_view(),
  public.crew_template_create(text, text, uuid[]),
  public.crew_template_update(uuid, text, text, uuid[]),
  public.crew_template_delete(uuid),
  public.filming_crew_apply_template(uuid, uuid),
  public.filming_equipment_set(uuid, uuid[]),
  public.filming_equipment_apply_template(uuid, uuid),
  public.equipment_item_reserve(uuid, uuid),
  public.equipment_item_release(uuid, uuid),
  public.filming_settings_view(),
  public.filming_settings_save(jsonb),
  public.filming_crew_candidates(),
  public.filming_equipment_candidates()
  from public, anon, authenticated;

grant execute on function
  public.filmings_view(text, integer),
  public.filming_queue_view(),
  public.filming_view(uuid),
  public.filming_mine_view(),
  public.filming_new_options(uuid),
  public.filming_book(uuid, timestamptz, numeric, uuid, text, text),
  public.filming_create(uuid, timestamptz, numeric, uuid, text, text),
  public.filming_create_internal(uuid, timestamptz, numeric, text, text),
  public.filming_approve(uuid),
  public.filming_reject(uuid, text),
  public.filming_cancel(uuid, text),
  public.filming_client_cancel(uuid, text),
  public.filming_request_cancel(uuid, text),
  public.filming_decide_cancel_request(uuid, boolean, text),
  public.filming_reschedule(uuid, timestamptz, numeric),
  public.filming_mark_done(uuid, numeric),
  public.filming_mark_no_show(uuid),
  public.filming_undo_outcome(uuid, text),
  public.filming_crew_set(uuid, uuid[]),
  public.filming_crew_respond(uuid, text, text),
  public.crew_templates_view(),
  public.crew_template_create(text, text, uuid[]),
  public.crew_template_update(uuid, text, text, uuid[]),
  public.crew_template_delete(uuid),
  public.filming_crew_apply_template(uuid, uuid),
  public.filming_equipment_set(uuid, uuid[]),
  public.filming_equipment_apply_template(uuid, uuid),
  public.equipment_item_reserve(uuid, uuid),
  public.equipment_item_release(uuid, uuid),
  public.filming_settings_view(),
  public.filming_settings_save(jsonb),
  public.filming_crew_candidates(),
  public.filming_equipment_candidates()
  to authenticated;

-- Οι πίνακες είναι κλειστοί: διαβάζονται και γράφονται μόνο από τις συναρτήσεις παραπάνω.
revoke all on table
  public.filmings, public.filming_crew, public.filming_equipment, public.crew_templates,
  public.crew_template_members, public.filming_settings
  from anon, authenticated;
