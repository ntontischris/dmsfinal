-- Πρόβλεψη πωλήσεων (χάρτης b3) και αλλαγή Υπεύθυνου μίας Ευκαιρίας (χάρτης b2). Κεφ. 2, ADR 0009.
--
-- Αρχές:
--  • Κάθε ανοιχτή Ευκαιρία έχει Αξία, Πιθανότητα και Αναμενόμενο κλείσιμο.
--      – Αξία: η εκτίμηση του Υπεύθυνου (opportunity_amounts, χωριστός πίνακας γιατί είναι ποσό: «Βλέπει ποσά»)· αν δεν
--        γραφτεί, η τελευταία πρόταση (τιμή της Συμφωνίας από authz.agreement_figures, μηνιαία × μήνες διάρκειας).
--      – Πιθανότητα: της Ευκαιρίας αν γραφτεί, αλλιώς η προεπιλογή του Σταδίου της (sales_stages.probability, ρυθμίζεται
--        στις Ρυθμίσεις › Πωλήσεις), αλλιώς 0.
--      – Σταθμισμένη αξία = Αξία × Πιθανότητα / 100.
--  • Τα αλλάζει όποιος δουλεύει την Ευκαιρία (authz.can_work_opportunity: ο Υπεύθυνος ή Εύρος «όλα», δηλαδή και ο
--    Ιδιοκτήτης). Την Αξία μόνο αν βλέπει και ποσά.
--  • public.sales_pipeline_value(p_today): ΤΟ σύνολο της ανοιχτής πρόβλεψης για όποιον το ζητά (π.χ. Σήμερα).
--    public.sales_pipeline_rows(p_today): η ίδια πρόβλεψη ανά Ευκαιρία (κάρτες Pipeline).
--  • Αλλαγή Υπεύθυνου μίας ανοιχτής Ευκαιρίας: όποιος «Μεταφέρει Πελάτες», ή ο ίδιος ο Υπεύθυνός της που τη δίνει σε άλλον.
--    Η Δραστηριότητα «ανάθεση» γράφεται ήδη από τον trigger authz.log_opportunity_events.

-- ───────────── Στήλες ─────────────

alter table public.sales_stages
  add column probability smallint check (probability between 0 and 100);

update public.sales_stages set probability = case code
  when 'new' then 10
  when 'first_contact' then 20
  when 'meeting' then 40
  when 'proposal' then 60
  when 'negotiation' then 80
end
where code is not null;

alter table public.opportunities
  add column probability smallint check (probability between 0 and 100),
  add column expected_close date;

create table public.opportunity_amounts (
  opportunity_id uuid primary key references public.opportunities (id) on delete cascade,
  estimated_value numeric(12, 2) not null check (estimated_value >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

alter table public.opportunity_amounts enable row level security;

create policy "Την εκτιμώμενη Αξία τη βλέπει όποιος βλέπει την Ευκαιρία και ποσά"
  on public.opportunity_amounts for select to authenticated
  using (authz.has('finance.amounts') and authz.can_see_opportunity(opportunity_id));

revoke all on table public.opportunity_amounts from anon;
revoke insert, update, delete, truncate on table public.opportunity_amounts from authenticated;

-- ───────────── Πρόβλεψη ανά Ευκαιρία ─────────────

-- Οι ανοιχτές Ευκαιρίες που βλέπει ο θεατής, με Αξία (null χωρίς «Βλέπει ποσά» ή χωρίς εκτίμηση και πρόταση),
-- πηγή της Αξίας ('estimate' | 'proposal' | null), Πιθανότητα και Αναμενόμενο κλείσιμο.
-- is_late = το Αναμενόμενο κλείσιμο πέρασε (πριν από p_today).
create function authz.sales_pipeline_rows(p_today date)
returns table (
  opportunity_id uuid, manager_id uuid, value numeric, value_source text, probability smallint,
  probability_source text, weighted numeric, expected_close date, is_late boolean
)
language sql stable security definer set search_path = ''
as $$
  with o as (
    select o.id, o.manager_id, o.probability, o.expected_close, s.probability as stage_probability,
           (select m.estimated_value from public.opportunity_amounts m where m.opportunity_id = o.id) as estimate,
           (select case when a.kind = 'monthly' then f.price * a.duration_months else f.price end
              from public.agreements a cross join lateral authz.agreement_figures(a.id) f
             where a.opportunity_id = o.id) as proposal
      from public.opportunities o
      join public.sales_stages s on s.id = o.stage_id
     where o.outcome = 'open' and authz.can_see_opportunity_row(o.client_id, o.manager_id)
  ), v as (
    select o.*,
           authz.has('finance.amounts') as amounts,
           coalesce(o.probability, o.stage_probability, 0)::smallint as p
      from o
  )
  select v.id, v.manager_id,
         case when v.amounts then coalesce(v.estimate, v.proposal) end,
         case when not v.amounts then null
              when v.estimate is not null then 'estimate'
              when v.proposal is not null then 'proposal' end,
         v.p,
         case when v.probability is not null then 'opportunity'
              when v.stage_probability is not null then 'stage' end,
         case when v.amounts then round(coalesce(v.estimate, v.proposal) * v.p / 100, 2) end,
         v.expected_close,
         coalesce(v.expected_close < p_today, false)
    from v;
$$;

create function public.sales_pipeline_rows(p_today date default null)
returns table (
  opportunity_id uuid, value numeric, value_source text, probability smallint, probability_source text,
  weighted numeric, expected_close date, is_late boolean
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require('clients.manage');
  return query
    select r.opportunity_id, r.value, r.value_source, r.probability, r.probability_source, r.weighted,
           r.expected_close, r.is_late
      from authz.sales_pipeline_rows(coalesce(p_today, public.sales_today())) r;
end;
$$;

-- ───────────── Σύνολο πρόβλεψης (για Σήμερα / KPIs) ─────────────

-- { amounts, open, valued, total, weighted, thisMonth: { count, weighted }, late }
--  • open: ανοιχτές Ευκαιρίες που βλέπει ο θεατής · valued: όσες έχουν Αξία.
--  • total / weighted: Σ Αξίας / Σ σταθμισμένης Αξίας (null χωρίς «Βλέπει ποσά»).
--  • thisMonth: όσες έχουν Αναμενόμενο κλείσιμο μέσα στον μήνα του p_today (weighted null χωρίς ποσά).
--  • late: όσες έχουν Αναμενόμενο κλείσιμο πριν από το p_today.
-- Χωρίς «Διαχειρίζεται Πελάτες και Ευκαιρίες» → 42501.
create function public.sales_pipeline_value(p_today date default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, public.sales_today());
  v_amounts boolean := authz.has('finance.amounts');
begin
  perform authz.require('clients.manage');
  return (
    with r as (select * from authz.sales_pipeline_rows(v_today)),
         m as (select * from r where date_trunc('month', r.expected_close::timestamp) = date_trunc('month', v_today::timestamp))
    select jsonb_build_object(
      'amounts', v_amounts,
      'open', (select count(*) from r),
      'valued', (select count(*) from r where r.value is not null),
      'total', case when v_amounts then (select coalesce(sum(r.value), 0) from r) end,
      'weighted', case when v_amounts then (select coalesce(sum(r.weighted), 0) from r) end,
      'thisMonth', jsonb_build_object(
        'count', (select count(*) from m),
        'weighted', case when v_amounts then (select coalesce(sum(m.weighted), 0) from m) end
      ),
      'late', (select count(*) from r where r.is_late)
    )
  );
end;
$$;

-- ───────────── Εγγραφή πρόβλεψης ─────────────

-- p_value null = καμία εκτίμηση (η Αξία πέφτει στην πρόταση)· p_probability null = του Σταδίου.
-- p_keep_value = true: η Αξία μένει όπως είναι (για όποιον δεν βλέπει ποσά).
create function public.sales_set_forecast(
  p_opportunity uuid, p_value numeric, p_probability integer, p_expected_close date, p_keep_value boolean default false
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.can_work_opportunity(p_opportunity) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if not exists (select 1 from public.opportunities o where o.id = p_opportunity and o.outcome = 'open') then
    raise exception 'Μια κλεισμένη Ευκαιρία δεν αλλάζει' using errcode = 'P0001';
  end if;
  if p_value is not null and p_value < 0 then
    raise exception 'Η Αξία δεν μπορεί να είναι αρνητική' using errcode = 'P0001';
  end if;
  if p_probability is not null and p_probability not between 0 and 100 then
    raise exception 'Η Πιθανότητα είναι από 0 έως 100%%' using errcode = 'P0001';
  end if;

  update public.opportunities set probability = p_probability, expected_close = p_expected_close
   where id = p_opportunity;

  if p_keep_value then
    return;
  end if;
  if not authz.has('finance.amounts') then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_value is null then
    delete from public.opportunity_amounts where opportunity_id = p_opportunity;
  else
    insert into public.opportunity_amounts (opportunity_id, estimated_value, updated_by)
    values (p_opportunity, round(p_value, 2), auth.uid())
    on conflict (opportunity_id) do update
      set estimated_value = excluded.estimated_value, updated_at = now(), updated_by = excluded.updated_by;
  end if;
end;
$$;

-- ───────────── Αλλαγή Υπεύθυνου μίας Ευκαιρίας (b2) ─────────────

-- Μόνο ανοιχτή Ευκαιρία με Υπεύθυνο (η «Χωρίς υπεύθυνο» ανατίθεται από την ουρά, sales_assign_opportunity).
-- Ο νέος Υπεύθυνος ελέγχεται από τον authz.guard_opportunity. Ο Υπεύθυνος του Πελάτη δεν αλλάζει.
create function public.sales_set_opportunity_manager(p_opportunity uuid, p_to uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_opp public.opportunities;
begin
  select * into v_opp from public.opportunities o where o.id = p_opportunity;
  if not found or not authz.can_see_opportunity_row(v_opp.client_id, v_opp.manager_id) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if not (authz.has('clients.transfer')
          or (authz.has('clients.manage') and coalesce(v_opp.manager_id = auth.uid(), false))) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if v_opp.outcome <> 'open' then
    raise exception 'Μια κλεισμένη Ευκαιρία δεν αλλάζει' using errcode = 'P0001';
  end if;
  if v_opp.manager_id is null then
    raise exception 'Η Ευκαιρία περιμένει Υπεύθυνο· ανατίθεται από το «Χωρίς υπεύθυνο»' using errcode = 'P0001';
  end if;
  if p_to is null then
    raise exception 'Διάλεξε νέο Υπεύθυνο' using errcode = 'P0001';
  end if;
  if p_to = v_opp.manager_id then
    return;
  end if;
  update public.opportunities set manager_id = p_to where id = p_opportunity;
end;
$$;

-- Σε ποιον δίνει ο Υπεύθυνος την Ευκαιρία του: ενεργοί Χρήστες που διαχειρίζονται Πελάτες. Για όποιον διαχειρίζεται
-- Πελάτες (η sales_assignable_users δίνει λίστα μόνο σε όποιον «Μεταβιβάζει Υπεύθυνο»).
create function public.sales_handoff_candidates()
returns table (user_id uuid, name text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require('clients.manage');
  return query
    select u.user_id, u.name
      from public.team_users u
     where u.is_active and authz.user_scope(u.user_id, 'clients.manage') is not null
     order by u.name, u.user_id;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function authz.sales_pipeline_rows(date) from public, anon, authenticated;
revoke all on function
  public.sales_pipeline_rows(date), public.sales_pipeline_value(date),
  public.sales_set_forecast(uuid, numeric, integer, date, boolean),
  public.sales_set_opportunity_manager(uuid, uuid), public.sales_handoff_candidates()
  from public, anon, authenticated;
grant execute on function
  public.sales_pipeline_rows(date), public.sales_pipeline_value(date),
  public.sales_set_forecast(uuid, numeric, integer, date, boolean),
  public.sales_set_opportunity_manager(uuid, uuid), public.sales_handoff_candidates()
  to authenticated;
