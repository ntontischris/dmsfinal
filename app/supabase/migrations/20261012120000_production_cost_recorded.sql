-- Κόστος και ώρες (G3, #144), διόρθωση: η γραμμή κόστους φέρνει και τα καταχωρημένα (πρόχειρα ή επιβεβαιωμένα) ώρες
-- και άμεσο κόστος, όπως γράφτηκαν. Το `actual` μένει ως είναι (εκτίμηση όσο δεν έχει επιβεβαιωθεί)· το `recorded`
-- τροφοδοτεί τη φόρμα, ώστε ένα πρόχειρο να μην εμφανίζεται ξανά ως εκτίμηση. Null = δεν έχει γραφτεί ποτέ.

create or replace function authz.production_cost_row(p_production uuid) returns jsonb
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
    'recorded', jsonb_build_object('shootHours', f.shoot_hours, 'editHours', f.edit_hours, 'directCost', f.direct_cost),
    'hoursComplete', f.shoot_confirmed_at is not null and f.edit_confirmed_at is not null,
    'signals', jsonb_build_object(
      'lowMargin', f.low_margin,
      'overrun', (f.act_shoot + f.act_edit) > (f.estimate_shoot_hours + f.estimate_edit_hours) * (1 + f.overrun_percent / 100)
                 or f.low_margin)
  )
  from flagged f;
$$;
