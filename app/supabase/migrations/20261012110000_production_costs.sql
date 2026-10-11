-- Κόστος και ώρες Παραγωγής (G3, #144): εκτίμηση και πραγματικές ώρες ανά Παραγωγή, άμεσο κόστος, σήματα (χαμηλό
-- περιθώριο, υπέρβαση) και οι ομάδες της οθόνης. Κεφ. 3 (Κατάλογος, Συμφωνία, κόστος), ADR 0008, 0017.
--
-- Αρχές:
--  • Το στιγμιότυπο της εκτίμησης γράφεται μία φορά, όταν η Παραγωγή γεννιέται (από τις γραμμές της Συμφωνίας· η Εσωτερική
--    μένει μηδενική, έως ότου γραφτεί με το χέρι). Η Συμφωνία δεν αλλάζει μετά την υπογραφή, άρα ούτε η εκτίμηση.
--  • Πραγματικό: ό,τι έχει επιβεβαιωθεί· για ό,τι λείπει, η εκτίμηση. Κόστος = (ώρες γυρίσματος + μοντάζ) × Κόστος ώρας + άμεσο.
--  • Κόστος ώρας: του πιο πρόσφατου μήνα που ισχύει σήμερα (authz.current_hour_cost)· αλλιώς το στιγμιότυπο της εκτίμησης.
--    Χωρίς Κόστος ώρας δεν κρίνεται το χαμηλό περιθώριο.
--  • Σήματα είναι ενδείξεις, ποτέ φραγμοί (ADR 0017).
--  • Ο πίνακας είναι κλειστός για την εφαρμογή (RLS χωρίς policies, χωρίς grants)· διαβάζεται και γράφεται μόνο από τα
--    public.production_* RPC, που ελέγχουν το Δικαίωμα στο σώμα τους (security definer, search_path = '').
--  • Δικαιώματα: «Βλέπει κόστος και κερδοφορία» (finance.cost) διαβάζει, «Διαχειρίζεται κόστος» (finance.costManage) γράφει.
--    Κανένα νέο Δικαίωμα.

-- ───────────── Ποσοστό υπέρβασης ─────────────

alter table public.cost_settings
  add column overrun_percent numeric(5, 2) not null default 20 check (overrun_percent between 0 and 500);

-- ───────────── Πίνακας ─────────────

create table public.production_costs (
  production_id uuid primary key references public.productions (id),
  estimate_shoot_hours numeric(6, 1) not null default 0 check (estimate_shoot_hours between 0 and 999),
  estimate_edit_hours numeric(6, 1) not null default 0 check (estimate_edit_hours between 0 and 999),
  estimate_direct_cost numeric(12, 2) not null default 0 check (estimate_direct_cost >= 0 and estimate_direct_cost < 10000000),
  -- Τιμή της Περιόδου (ή συνολική για εφάπαξ)· null για Εσωτερική Παραγωγή.
  estimate_price numeric(12, 2) check (estimate_price is null or (estimate_price >= 0 and estimate_price < 10000000)),
  -- Κόστος ώρας τη στιγμή της εκτίμησης· null αν δεν υπήρχε μήνας Κόστους.
  estimate_hour_cost numeric(10, 2) check (estimate_hour_cost is null or estimate_hour_cost >= 0),
  -- Οι ώρες μένουν όπως γράφτηκαν· μετράνε στο πραγματικό μόνο όταν επιβεβαιωθούν.
  shoot_hours numeric(6, 1) check (shoot_hours between 0 and 999),
  shoot_confirmed_at timestamptz,
  shoot_confirmed_by uuid,
  edit_hours numeric(6, 1) check (edit_hours between 0 and 999),
  edit_confirmed_at timestamptz,
  edit_confirmed_by uuid,
  direct_cost numeric(12, 2) check (direct_cost >= 0 and direct_cost < 10000000),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check (shoot_confirmed_at is null or shoot_hours is not null),
  check (edit_confirmed_at is null or edit_hours is not null)
);

alter table public.production_costs enable row level security;

-- ───────────── Εκτίμηση και στιγμιότυπο ─────────────

-- Σύνολο γραμμών Συμφωνίας: ώρες και άμεσο κόστος ανά Περίοδο (μηνιαία) ή συνολικά (εφάπαξ), όπως το estimated_cost.
create function authz.agreement_estimate(p_agreement uuid)
returns table (shoot_hours numeric, edit_hours numeric, direct_cost numeric)
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(l.quantity * lc.hours_shoot), 0),
         coalesce(sum(l.quantity * lc.hours_edit), 0),
         coalesce(sum(l.quantity * lc.direct_cost), 0)
    from public.agreement_lines l
    left join public.agreement_line_costs lc on lc.line_id = l.id
   where l.agreement_id = p_agreement;
$$;

-- Τιμή που πληρώνει ο Πελάτης για μία Περίοδο, όπως το agreement_view: οι πρώτες discount_months Περίοδοι (n από 0)
-- με την εκπτωμένη τιμή, και κάθε Περίοδος επί το μερίδιό της (μερική Περίοδος). Εφάπαξ: το σύνολο με την έκπτωση της Συμφωνίας.
create function authz.production_period_price(p_agreement uuid, p_period uuid) returns numeric
language plpgsql stable security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_list numeric;
  v_pct numeric := 0;
  v_months integer := 0;
  v_n integer;
  v_share numeric;
begin
  select * into a from public.agreements x where x.id = p_agreement;
  select coalesce(sum(l.quantity * la.unit_price), 0) into v_list
    from public.agreement_lines l join public.agreement_line_amounts la on la.line_id = l.id
   where l.agreement_id = p_agreement;
  select coalesce(m.discount_percent, 0), coalesce(m.discount_months, 0) into v_pct, v_months
    from public.agreement_amounts m where m.agreement_id = p_agreement;
  if a.kind = 'one_off' then
    return round(v_list * (1 - v_pct / 100), 2);
  end if;
  select r.n, r.share into v_n, v_share
    from authz.agreement_period_rows(a.start_on, a.duration_months) r
    join public.agreement_periods ap on ap.id = p_period and r.n + 1 = ap.n;
  return round(
    (case when v_n < v_months then round(v_list * (1 - v_pct / 100), 2) else v_list end) * v_share, 2);
end;
$$;

-- Κάθε νέα Παραγωγή παίρνει τη γραμμή της. Εσωτερική (χωρίς Συμφωνία): μηδενική εκτίμηση και χωρίς τιμή.
create function authz.snapshot_production_cost() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.production_costs (
    production_id, estimate_shoot_hours, estimate_edit_hours, estimate_direct_cost, estimate_price, estimate_hour_cost
  )
  select new.id, e.shoot_hours, e.edit_hours, e.direct_cost,
         case when new.agreement_id is not null then authz.production_period_price(new.agreement_id, new.period_id) end,
         (select h.hour_cost from authz.current_hour_cost() h)
    from authz.agreement_estimate(new.agreement_id) e;
  return null;
end;
$$;

-- Παραγωγές που υπάρχουν ήδη παίρνουν γραμμή, με την εκτίμηση των γραμμών της Συμφωνίας τους.
insert into public.production_costs (
  production_id, estimate_shoot_hours, estimate_edit_hours, estimate_direct_cost, estimate_price, estimate_hour_cost
)
select p.id, e.shoot_hours, e.edit_hours, e.direct_cost,
       case when p.agreement_id is not null then authz.production_period_price(p.agreement_id, p.period_id) end,
       (select h.hour_cost from authz.current_hour_cost() h)
  from public.productions p
 cross join lateral authz.agreement_estimate(p.agreement_id) e;

-- ───────────── Υπολογισμοί ─────────────

-- Ώρες γυρίσματος που προτείνονται: Γυρίσματα «έγινε» × επιβεβαιωμένο Συνεργείο (τουλάχιστον 1).
create function authz.production_suggested_shoot_hours(p_production uuid) returns numeric
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(coalesce(f.actual_hours, f.hours) * greatest(1, (
           select count(*) from public.filming_crew c
            where c.filming_id = f.id and c.response = 'confirmed'))), 0)
    from public.filmings f
   where f.production_id = p_production and f.state = 'done';
$$;

-- Η γραμμή κόστους μιας Παραγωγής (JSON). Ένας μόνο ορισμός· η λίστα και η σελίδα τον καλούν.
create function authz.production_cost_row(p_production uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  with base as (
    select p.id, p.title, p.state, cl.name as client_name, pc.*,
           coalesce((select h.hour_cost from authz.current_hour_cost() h), pc.estimate_hour_cost) as hour_cost,
           (select s.multiplier_min from public.cost_settings s where s.id) as multiplier_min,
           (select s.overrun_percent from public.cost_settings s where s.id) as overrun_percent
      from public.productions p
      join public.production_costs pc on pc.production_id = p.id
      left join public.clients cl on cl.id = p.client_id
     where p.id = p_production
  ), actual as (
    select b.*,
           case when b.shoot_confirmed_at is not null then b.shoot_hours else b.estimate_shoot_hours end as act_shoot,
           case when b.edit_confirmed_at is not null then b.edit_hours else b.estimate_edit_hours end as act_edit,
           coalesce(b.direct_cost, b.estimate_direct_cost) as act_direct
      from base b
  ), priced as (
    select a.*,
           round((a.estimate_shoot_hours + a.estimate_edit_hours) * a.hour_cost + a.estimate_direct_cost, 2) as est_cost,
           round((a.act_shoot + a.act_edit) * a.hour_cost + a.act_direct, 2) as act_cost
      from actual a
  ), flagged as (
    select r.*,
           (r.estimate_price is not null and r.act_cost is not null and r.estimate_price < r.act_cost * r.multiplier_min)
             as low_margin
      from priced r
  )
  select jsonb_build_object(
    'productionId', f.id,
    'title', f.title,
    'client', f.client_name,
    'state', f.state,
    'estimate', jsonb_build_object(
      'shootHours', f.estimate_shoot_hours, 'editHours', f.estimate_edit_hours, 'directCost', f.estimate_direct_cost,
      'price', f.estimate_price, 'cost', f.est_cost),
    'actual', jsonb_build_object(
      'shootHours', f.act_shoot, 'shootConfirmed', f.shoot_confirmed_at is not null,
      'editHours', f.act_edit, 'editConfirmed', f.edit_confirmed_at is not null,
      'directCost', f.act_direct, 'cost', f.act_cost,
      'suggestedShootHours', authz.production_suggested_shoot_hours(f.id)),
    'hourCost', f.hour_cost,
    'hoursComplete', f.shoot_confirmed_at is not null and f.edit_confirmed_at is not null,
    'signals', jsonb_build_object(
      'lowMargin', f.low_margin,
      'overrun', (f.act_shoot + f.act_edit) > (f.estimate_shoot_hours + f.estimate_edit_hours) * (1 + f.overrun_percent / 100)
                 or f.low_margin)
  )
  from flagged f;
$$;

-- Ομάδα της οθόνης G3: πρώτα όσες θέλουν πραγματικές ώρες, μετά τα σήματα υπέρβασης, και οι υπόλοιπες.
create function authz.production_cost_group(p_row jsonb) returns text
language sql immutable set search_path = ''
as $$
  select case
    when p_row ->> 'state' = 'delivered' and not coalesce((p_row ->> 'hoursComplete')::boolean, false) then 'needs_hours'
    when coalesce((p_row #>> '{signals,overrun}')::boolean, false) then 'overrun'
    else 'rest'
  end;
$$;

-- Ώρες και άμεσο κόστος: τα null μένουν όπως είναι· κάθε τιμή εκτός ορίων σταματά την αποθήκευση.
create function authz.require_cost_amounts(p_shoot numeric, p_edit numeric, p_direct numeric) returns void
language plpgsql stable set search_path = ''
as $$
begin
  if p_shoot < 0 or p_shoot > 999 or p_edit < 0 or p_edit > 999 or p_direct < 0 or p_direct >= 10000000 then
    raise exception 'Οι ώρες είναι από 0 έως 999 και το άμεσο κόστος δεν είναι αρνητικό' using errcode = 'P0001';
  end if;
end;
$$;

-- ───────────── Κανόνες (triggers, και για τον service role) ─────────────

create function authz.stamp_production_cost() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger productions_cost_snapshot after insert on public.productions
  for each row execute function authz.snapshot_production_cost();
create trigger production_costs_stamp before insert or update on public.production_costs
  for each row execute function authz.stamp_production_cost();

-- ───────────── Ίχνος ενεργειών ─────────────

create trigger production_costs_audit_insert after insert on public.production_costs
  for each row execute function authz.audit_row('production_id');
create trigger production_costs_audit_update after update on public.production_costs
  for each row
  when ((to_jsonb(old) - 'updated_at' - 'updated_by') is distinct from (to_jsonb(new) - 'updated_at' - 'updated_by'))
  execute function authz.audit_row('production_id');

-- ───────────── Ανάγνωση και γραφή (RPC) ─────────────

-- Λίστα G3 μιας ομάδας· μη ακυρωμένες Παραγωγές μόνο.
create function public.production_costs_view(p_group text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_rows jsonb;
begin
  perform authz.require('finance.cost');
  if p_group is null or p_group not in ('needs_hours', 'overrun', 'rest') then
    raise exception 'Άγνωστη ομάδα κόστους' using errcode = 'P0001';
  end if;
  select coalesce(jsonb_agg(c.cost_row order by c.created_at desc, c.id), '[]'::jsonb) into v_rows
    from (
      select p.id, p.created_at, authz.production_cost_row(p.id) as cost_row
        from public.productions p
       where p.state <> 'cancelled'
    ) c
   where authz.production_cost_group(c.cost_row) = p_group;
  return v_rows;
end;
$$;

-- Μία Παραγωγή (G3): η γραμμή και ό,τι μπορεί να αλλάξει ο Χρήστης. Null αν δεν υπάρχει.
create function public.production_cost_view(p_production uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_row jsonb;
begin
  perform authz.require('finance.cost');
  v_row := authz.production_cost_row(p_production);
  if v_row is null then
    return null;
  end if;
  return v_row || jsonb_build_object('can', jsonb_build_object('edit', authz.can_manage_cost()));
end;
$$;

-- Ώρες γυρίσματος και μοντάζ, και άμεσο κόστος. Επιβεβαίωση τις κάνει πραγματικές· χωρίς επιβεβαίωση μένουν πρόχειρες.
create function public.production_hours_set(
  p_production uuid, p_shoot_hours numeric, p_edit_hours numeric, p_direct_cost numeric,
  p_confirm_shoot boolean, p_confirm_edit boolean
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.can_manage_cost() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.require_cost_amounts(p_shoot_hours, p_edit_hours, p_direct_cost);
  if (coalesce(p_confirm_shoot, false) and p_shoot_hours is null)
     or (coalesce(p_confirm_edit, false) and p_edit_hours is null) then
    raise exception 'Γράψε τις ώρες πριν την επιβεβαίωση' using errcode = 'P0001';
  end if;
  if coalesce(p_confirm_shoot, false) and exists (
       select 1 from public.filmings f where f.production_id = p_production and f.state in ('pending', 'scheduled')) then
    raise exception 'Υπάρχει Γύρισμα που δεν έγινε ακόμη' using errcode = 'P0001';
  end if;
  update public.production_costs pc
     set shoot_hours = p_shoot_hours,
         shoot_confirmed_at = case when coalesce(p_confirm_shoot, false) then coalesce(pc.shoot_confirmed_at, now()) end,
         shoot_confirmed_by = case when coalesce(p_confirm_shoot, false) then coalesce(pc.shoot_confirmed_by, auth.uid()) end,
         edit_hours = p_edit_hours,
         edit_confirmed_at = case when coalesce(p_confirm_edit, false) then coalesce(pc.edit_confirmed_at, now()) end,
         edit_confirmed_by = case when coalesce(p_confirm_edit, false) then coalesce(pc.edit_confirmed_by, auth.uid()) end,
         direct_cost = p_direct_cost
   where pc.production_id = p_production;
  if not found then
    raise exception 'Η Παραγωγή δεν βρέθηκε' using errcode = 'P0001';
  end if;
end;
$$;

-- Εκτίμηση ωρών και άμεσου κόστους· μόνο για Εσωτερική Παραγωγή (η εκτίμηση των Συμφωνιών είναι στιγμιότυπο).
create function public.production_estimate_set(
  p_production uuid, p_shoot_hours numeric, p_edit_hours numeric, p_direct_cost numeric
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.can_manage_cost() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_shoot_hours is null or p_edit_hours is null or p_direct_cost is null then
    raise exception 'Γράψε τις ώρες και το άμεσο κόστος της εκτίμησης' using errcode = 'P0001';
  end if;
  perform authz.require_cost_amounts(p_shoot_hours, p_edit_hours, p_direct_cost);
  update public.production_costs pc
     set estimate_shoot_hours = p_shoot_hours,
         estimate_edit_hours = p_edit_hours,
         estimate_direct_cost = p_direct_cost
    from public.productions p
   where pc.production_id = p_production and p.id = pc.production_id and p.client_id is null;
  if not found then
    raise exception 'Η εκτίμηση γράφεται μόνο σε Εσωτερική Παραγωγή' using errcode = 'P0001';
  end if;
end;
$$;

-- Πόσες Παραγωγές θέλουν πραγματικές ώρες (καρτέλα «Θέλουν ώρες» στη G1).
create function public.production_needs_hours_count() returns bigint
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('finance.cost');
  return (
    select count(*) from public.productions p
     where authz.production_cost_group(authz.production_cost_row(p.id)) = 'needs_hours'
  );
end;
$$;

-- ───────────── Ρυθμίσεις κόστους: ποσοστό υπέρβασης ─────────────

-- Η αλλαγή της υπογραφής της cost_save_multipliers και της cost_hint απαιτεί να πέσουν πρώτα οι παλιές.
drop function public.cost_save_multipliers(numeric, numeric, numeric);
drop function public.cost_hint();

-- Η ένδειξη κόστους διαβάζει και το ποσοστό υπέρβασης.
create function public.cost_hint()
returns table (
  hour_cost_month date, hour_cost numeric, multiplier_min numeric, multiplier_target numeric, multiplier_max numeric,
  overrun_percent numeric
)
language sql stable security definer set search_path = ''
as $$
  select m.month, m.hour_cost, s.multiplier_min, s.multiplier_target, s.multiplier_max, s.overrun_percent
    from public.cost_settings s
    left join lateral (
      select cm.month, cm.hour_cost
        from public.cost_months cm
       where cm.month <= authz.athens_month_start()
       order by cm.month desc
       limit 1
    ) m on true
   where authz.has('finance.cost');
$$;

-- Οι τρεις πολλαπλασιαστές του Εύρους τιμής και, αν δίνεται, το ποσοστό υπέρβασης (null = όπως είναι).
create function public.cost_save_multipliers(
  p_min numeric, p_target numeric, p_max numeric, p_overrun_percent numeric default null
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.can_manage_cost() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_min is null or p_target is null or p_max is null
     or p_min < 1 or p_min > p_target or p_target > p_max or p_max > 20 then
    raise exception 'Οι πολλαπλασιαστές ξεκινούν από 1 και ανεβαίνουν: ελάχιστη, στόχος, μέγιστη' using errcode = 'P0001';
  end if;
  if p_overrun_percent is not null and not (p_overrun_percent between 0 and 500) then
    raise exception 'Το ποσοστό υπέρβασης είναι από 0 έως 500' using errcode = 'P0001';
  end if;
  update public.cost_settings s
     set multiplier_min = p_min, multiplier_target = p_target, multiplier_max = p_max,
         overrun_percent = coalesce(round(p_overrun_percent, 2), s.overrun_percent)
   where s.id
     and (s.multiplier_min, s.multiplier_target, s.multiplier_max, s.overrun_percent)
         is distinct from (
           round(p_min, 2), round(p_target, 2), round(p_max, 2), coalesce(round(p_overrun_percent, 2), s.overrun_percent)
         );
end;
$$;

-- ───────────── Ίχνος: ξαναγράφεται ΟΛΟΚΛΗΡΗ η λίστα (default deny) ─────────────

create or replace function authz.audit_entity_allowed(p_entity text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_entity
    -- Κατάλογος: ποσά και κόστος
    when 'catalogue_item_costs' then authz.has('finance.cost')
    when 'cost_months' then authz.has('finance.cost')
    when 'cost_settings' then authz.has('finance.cost')
    when 'production_costs' then authz.has('finance.cost')
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
    else false
  end;
$$;

-- ───────────── Δικαιώματα ─────────────

-- Βοηθητικές: μόνο τα triggers και οι άλλες συναρτήσεις του module τις καλούν (τρέχουν με τα δικά τους δικαιώματα).
revoke all on function
  authz.agreement_estimate(uuid), authz.production_period_price(uuid, uuid), authz.snapshot_production_cost(),
  authz.stamp_production_cost(),
  authz.production_suggested_shoot_hours(uuid), authz.production_cost_row(uuid), authz.production_cost_group(jsonb),
  authz.require_cost_amounts(numeric, numeric, numeric)
  from public, anon, authenticated;

revoke all on function
  public.production_costs_view(text), public.production_cost_view(uuid),
  public.production_hours_set(uuid, numeric, numeric, numeric, boolean, boolean),
  public.production_estimate_set(uuid, numeric, numeric, numeric), public.production_needs_hours_count(),
  public.cost_hint(), public.cost_save_multipliers(numeric, numeric, numeric, numeric)
  from public, anon;

grant execute on function
  public.production_costs_view(text), public.production_cost_view(uuid),
  public.production_hours_set(uuid, numeric, numeric, numeric, boolean, boolean),
  public.production_estimate_set(uuid, numeric, numeric, numeric), public.production_needs_hours_count(),
  public.cost_hint(), public.cost_save_multipliers(numeric, numeric, numeric, numeric)
  to authenticated;

-- Ο πίνακας είναι κλειστός: διαβάζεται και γράφεται μόνο από τις συναρτήσεις παραπάνω.
revoke all on table public.production_costs from anon, authenticated;
