-- Ταχύτητα (2026-11-05): το υπόλοιπο Παροχών μιας Περιόδου (authz.period_balance) μετράει όλες τις Περιόδους της
-- Συμφωνίας με ένα πέρασμα, αντί για δύο κλήσεις (Έγινε, Δεσμευμένο) ανά προηγούμενη Περίοδο. Ο παλιός τρόπος ήταν
-- τετραγωνικός: η «εικόνα» ενός Πελάτη με 24 μήνες έκανε εκατοντάδες κλήσεις.
--
-- Ίδιοι κανόνες με την authz.kind_units (που μένει για όσους τη χρησιμοποιούν):
--  • ανά ώρα: άθροισμα ωρών (πραγματικές, αλλιώς προγραμματισμένες),
--  • ανά μέρα: διαφορετικές μέρες Αθήνας· στο Δεσμευμένο δεν μετράει μέρα που ήδη Έγινε,
--  • αλλιώς: Γυρίσματα + Παραδοτέα «μέσα στο πακέτο»,
--  • Έγινε στην 1η Περίοδο: και όσα δηλώθηκαν στην υπογραφή (authz.signed_used).
-- Ελέγχθηκε στην παραγωγή (συναλλαγή που ακυρώθηκε): ίδιο αποτέλεσμα σε όλες τις 210 Περιόδους × Είδη, 1.666 → 210ms.

create or replace function authz.kind_units_by_period(p_agreement uuid, p_kind uuid)
returns table (period_id uuid, n integer, used numeric, reserved numeric)
language sql stable security definer set search_path = ''
as $$
  with pe as (
    select pe.id, pe.n from public.agreement_periods pe where pe.agreement_id = p_agreement
  ), fl as (
    select f.period_id,
           coalesce(f.actual_hours, f.hours) as hrs,
           (f.starts_at at time zone 'Europe/Athens')::date as day,
           case when f.state = 'done' or (f.state in ('cancelled', 'no_show') and f.burned) then 'used'
                when f.state in ('pending', 'scheduled') then 'reserved' end as stage
      from public.filmings f
     where f.kind_id = p_kind and not f.is_extra and f.period_id in (select pe.id from pe)
  ), dl as (
    select d.period_id,
           case when d.cancelled_at is null and d.approved_at is null then 'reserved'
                when d.approved_at is not null or (d.cancelled_at is not null and d.cancel_outcome = 'consumed') then 'used'
           end as stage
      from public.deliverables d
      join public.productions pr on pr.id = d.production_id
     where pr.agreement_id = p_agreement and d.kind_id = p_kind and d.charge = 'included'
       and d.period_id in (select pe.id from pe)
  )
  select pe.id,
         pe.n,
         (case k.measure
            when 'per_hour' then coalesce((select sum(fl.hrs) from fl where fl.period_id = pe.id and fl.stage = 'used'), 0)
            when 'per_day' then (select count(distinct fl.day) from fl where fl.period_id = pe.id and fl.stage = 'used')
            else (select count(*) from fl where fl.period_id = pe.id and fl.stage = 'used')
               + (select count(*) from dl where dl.period_id = pe.id and dl.stage = 'used')
          end)::numeric
         + case when pe.n = 1 then authz.signed_used(p_agreement, p_kind) else 0 end,
         (case k.measure
            when 'per_hour' then coalesce((select sum(fl.hrs) from fl where fl.period_id = pe.id and fl.stage = 'reserved'), 0)
            when 'per_day' then (
              select count(distinct fl.day) from fl
               where fl.period_id = pe.id and fl.stage = 'reserved'
                 and not exists (select 1 from fl u where u.period_id = pe.id and u.stage = 'used' and u.day = fl.day))
            else (select count(*) from fl where fl.period_id = pe.id and fl.stage = 'reserved')
               + (select count(*) from dl where dl.period_id = pe.id and dl.stage = 'reserved')
          end)::numeric
    from pe
    left join public.provision_kinds k on k.id = p_kind
$$;

create or replace function authz.period_balance(p_period uuid, p_kind uuid)
returns table (given numeric, carried numeric, used numeric, reserved numeric, balance numeric)
language sql stable security definer set search_path = ''
as $$
  with target as (
    select pe.agreement_id, pe.n from public.agreement_periods pe where pe.id = p_period
  ), ledger as (
    select u.n,
           coalesce(pp.given, 0)::numeric as given_count,
           u.used as used_count,
           u.reserved as reserved_count
      from target t
      cross join lateral authz.kind_units_by_period(t.agreement_id, p_kind) u
      left join public.agreement_period_provisions pp on pp.period_id = u.period_id and pp.kind_id = p_kind
     where u.n <= t.n
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
