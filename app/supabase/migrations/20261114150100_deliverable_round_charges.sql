-- Γύρος αλλαγών πέρα από το Όριο (c8): η ομάδα αποφασίζει «χρεώνεται» ή «χωρίς χρέωση».
--
-- • Όταν μια Έκδοση γίνεται «χρειάζεται αλλαγές» και οι γύροι που καταναλώθηκαν ξεπερνούν το Όριο αλλαγών της
--   Συμφωνίας, ανοίγει μια εκκρεμής χρέωση γύρου (μία ανά Έκδοση).
-- • Τα Αιτήματα δεν ανοίγουν χρέωση γύρου: εκεί η επιλογή «χρεώνεται» υπάρχει ήδη στην απόφαση.
-- • «Χρεώνεται» → γεννιέται Χρέωση «Έξτρα αναθεώρηση» στο επόμενο τρέξιμο των Χρεώσεων (ίδια τιμή με τα Αιτήματα).
-- • «Χωρίς χρέωση» θέλει λόγο. Η απόφαση γράφεται με ποιος και πότε, και φαίνεται στη σελίδα του Παραδοτέου.
-- • Η ειδοποίηση «Ξεπεράστηκε το Όριο αλλαγών» υπάρχει ήδη (deliverable.limit_exceeded)· εδώ δεν προστίθεται Γεγονός.

create table public.deliverable_round_charges (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null,
  version_number integer not null,
  round integer not null check (round > 0),
  rounds_limit integer not null check (rounds_limit >= 0),
  decision text check (decision in ('charged', 'free')),
  reason text,
  decided_at timestamptz,
  decided_by uuid,
  created_at timestamptz not null default now(),
  foreign key (deliverable_id, version_number) references public.deliverable_versions (deliverable_id, number),
  unique (deliverable_id, version_number),
  check ((decision is null) = (decided_at is null) and (decision is null) = (decided_by is null)),
  check (decision is distinct from 'free' or length(trim(coalesce(reason, ''))) > 0)
);

create index deliverable_round_charges_pending_idx on public.deliverable_round_charges (deliverable_id) where decision is null;

alter table public.deliverable_round_charges enable row level security;
revoke all on table public.deliverable_round_charges from anon, authenticated;

-- Το Όριο αλλαγών του Παραδοτέου από τη Συμφωνία της Παραγωγής (κενό = χωρίς Όριο).
create function authz.deliverable_rounds_limit(p_deliverable uuid) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  return (
    select r.rounds from public.deliverables d
      join public.productions p on p.id = d.production_id
      join public.agreement_revision_limits r on r.agreement_id = p.agreement_id and r.kind_id = d.kind_id
     where d.id = p_deliverable
  );
end;
$$;

-- Έκδοση → «χρειάζεται αλλαγές» πέρα από το Όριο: ανοίγει εκκρεμής χρέωση γύρου.
create function authz.deliverable_round_charge_open() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_limit integer;
  v_used integer;
begin
  if new.state <> 'changes_requested' or old.state = 'changes_requested' then
    return null;
  end if;
  v_limit := authz.deliverable_rounds_limit(new.deliverable_id);
  v_used := authz.deliverable_rounds_used(new.deliverable_id);
  if v_limit is not null and v_used > v_limit then
    insert into public.deliverable_round_charges (deliverable_id, version_number, round, rounds_limit)
    values (new.deliverable_id, new.number, v_used, v_limit)
    on conflict (deliverable_id, version_number) do nothing;
  end if;
  return null;
end;
$$;

create trigger deliverable_versions_round_charge after update of state on public.deliverable_versions
  for each row execute function authz.deliverable_round_charge_open();

-- Οι χρεώσεις γύρων του Παραδοτέου, παλαιότερη πρώτη.
create function authz.deliverable_round_charges_json(p_deliverable uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', g.id, 'version', g.version_number, 'round', g.round, 'roundsLimit', g.rounds_limit,
             'decision', g.decision, 'reason', g.reason, 'decidedAt', g.decided_at,
             'decidedByName', (select t.name from public.team_users t where t.user_id = g.decided_by),
             'createdAt', g.created_at
           ) order by g.created_at, g.id), '[]'::jsonb)
      from public.deliverable_round_charges g
     where g.deliverable_id = p_deliverable
  );
end;
$$;

-- Απόφαση για μια χρέωση γύρου. Ίδιο Δικαίωμα με τη χρέωση Παραδοτέου (Ποσά).
create function public.deliverable_round_charge_decide(p_id uuid, p_decision text, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.deliverable_round_charges;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  select * into v_row from public.deliverable_round_charges g where g.id = p_id;
  perform authz.deliverable_gate(v_row.deliverable_id, 'finance.amounts');
  perform authz.require_deliverable_open(v_row.deliverable_id);
  select * into v_row from public.deliverable_round_charges g where g.id = p_id for update;
  if authz.deliverable_state(v_row.deliverable_id) = 'cancelled' then
    raise exception 'Το Παραδοτέο έχει ακυρωθεί' using errcode = 'P0001';
  end if;
  if v_row.decision is not null then
    raise exception 'Η χρέωση του γύρου έχει ήδη αποφασιστεί' using errcode = 'P0001';
  end if;
  if p_decision is null or p_decision not in ('charged', 'free') then
    raise exception 'Η χρέωση θέλει «χρεώνεται» ή «χωρίς χρέωση»' using errcode = 'P0001';
  end if;
  if p_decision = 'free' and v_reason is null then
    raise exception 'Το «χωρίς χρέωση» θέλει λόγο' using errcode = 'P0001';
  end if;
  update public.deliverable_round_charges g
     set decision = p_decision, reason = v_reason, decided_at = now(), decided_by = auth.uid()
   where g.id = p_id;
end;
$$;

-- ───────────── Ξαναγράφονται: σελίδα Παραδοτέου, ουρά χρεώσεων, Σήμερα, Χρεώσεις ─────────────

create or replace function public.deliverable_view(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_card jsonb;
begin
  perform authz.require_deliverable_view(p_id);
  v_card := authz.deliverable_card(p_id);
  return v_card || jsonb_build_object(
    'versions', authz.deliverable_versions_json(p_id),
    'can', authz.deliverable_viewer_can(p_id) || jsonb_build_object(
      'decideRoundCharge', authz.deliverable_in_scope(p_id, 'finance.amounts')
                           and authz.deliverable_state(p_id) <> 'cancelled'),
    'pendingCharge', v_card->>'charge' = 'pending',
    'history', authz.deliverable_history(p_id),
    'requests', authz.deliverable_requests_json(p_id),
    'roundCharges', authz.deliverable_round_charges_json(p_id),
    'finalFilesUrl', (select d.final_files_url from public.deliverables d where d.id = p_id)
  );
end;
$$;

-- Ουρά «χρέωση περιμένει απόφαση»: Παραδοτέο εκτός Παροχής ή γύρος πέρα από το Όριο.
create or replace function public.deliverables_pending_charges() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if authz.scope('finance.amounts') is distinct from 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(authz.deliverable_card(d.id) order by d.created_at, d.id), '[]'::jsonb)
      from public.deliverables d
      join public.productions p on p.id = d.production_id
     where d.cancelled_at is null and p.state = 'open'
       and (d.charge = 'pending'
            or exists (select 1 from public.deliverable_round_charges g
                        where g.deliverable_id = d.id and g.decision is null))
  );
end;
$$;

create or replace function authz.today_pending_charges(p_now timestamptz)
returns table (id uuid, title text, subtitle text, deadline date, urgent boolean, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select d.id, d.title, concat_ws(' · ', c.name, p.title), d.deadline,
         coalesce(d.deadline <= (p_now at time zone 'Europe/Athens')::date + 1, false), d.created_at
    from public.deliverables d
    join public.productions p on p.id = d.production_id
    left join public.clients c on c.id = p.client_id
   where d.cancelled_at is null and p.state = 'open'
     and (d.charge = 'pending'
          or exists (select 1 from public.deliverable_round_charges g
                      where g.deliverable_id = d.id and g.decision is null));
$$;

-- Έξτρα αναθεώρηση: από Αιτήματα «χρεώνεται» και από γύρους πέρα από το Όριο με απόφαση «χρεώνεται».
create or replace function authz.billables_from_extra_revisions(p_today date) returns integer
language sql security definer set search_path = ''
as $$
  with src as (
    select r.id as source_id, r.deliverable_id from public.deliverable_requests r where r.decision = 'charged'
    union all
    select g.id, g.deliverable_id from public.deliverable_round_charges g where g.decision = 'charged'
  ), ins as (
    insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net)
    select pr.client_id, a.id, 'extra_revision', s.source_id, 'Έξτρα αναθεώρηση · ' || d.title, p_today, x.net
      from src s
      join public.deliverables d on d.id = s.deliverable_id
      join public.productions pr on pr.id = d.production_id and pr.agreement_id is not null
      join public.agreements a on a.id = pr.agreement_id and a.state in ('signed', 'active', 'expired')
      cross join lateral (select authz.billable_extra_price(a.id, d.kind_id) as net) x
     where d.cancelled_at is null and x.net > 0
    on conflict (reason, source_id) do nothing
    returning 1
  )
  select count(*)::integer from ins;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.deliverable_rounds_limit(uuid), authz.deliverable_round_charge_open(),
  authz.deliverable_round_charges_json(uuid)
  from public, anon, authenticated;

revoke all on function public.deliverable_round_charge_decide(uuid, text, text) from public, anon;
grant execute on function public.deliverable_round_charge_decide(uuid, text, text) to authenticated;
