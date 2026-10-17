-- Αναφορές Ρβ (#199): οι τρεις Αναφορές πωλήσεων της M1. Κεφ. 2 «Αναφορές: λεπτομέρειες κανόνων», Δέσμη Ρ (Ρ1, Ρ3–Ρ5).
--
-- Αρχές:
--  • Καμία νέα αποθήκευση· μόνο ανάγνωση. Κάθε Αναφορά = ένα public.report_sales_* RPC (security definer, search_path = '')
--    που καλεί την authz.* υλοποίησή της· ο έλεγχος Δικαιώματος γίνεται ΠΡΩΤΟΣ (authz.report_sales_access).
--  • Πρόσβαση (Ρ1): «Βλέπει Αναφορές» + «Διαχειρίζεται Πελάτες και Ευκαιρίες» (οι Ευκαιρίες δεν έχουν χωριστό «Βλέπει»· ο
--    Λογιστής βλέπει Πελάτες, όχι Ευκαιρίες), αλλιώς 42501. Οι γραμμές περνούν από το authz.can_see_opportunity_row του
--    module Πωλήσεις. Εύρος «όλα» = και τα δύο Δικαιώματα με «όλα»· αλλιώς (Α) μόνο οι Ευκαιρίες όπου ο Χρήστης είναι
--    Υπεύθυνος, άρα οι «Χωρίς υπεύθυνο» δεν φαίνονται.
--  • Ποσά: με «Βλέπει ποσά» «όλα», ή με οποιοδήποτε «Βλέπει ποσά» όταν το Εύρος είναι Α (όλες οι γραμμές είναι δικές του).
--    Εύρος «όλα» με «Βλέπει ποσά» μόνο Α → χωρίς ποσά (τα σύνολα θα ανακάτευαν δικές του και ξένες Ευκαιρίες).
--    Χωρίς ποσά μένουν τα πλήθη, και η σειρά των γραμμών δεν εξαρτάται ποτέ από ποσό.
--  • Αξία Ευκαιρίας (Ρ5): το σύνολο της τελευταίας πρότασης, δηλαδή η τιμή της Συμφωνίας της Ευκαιρίας από το
--    authz.agreement_figures (ζωντανή όσο είναι πρόταση, το αντίγραφο μετά την υπογραφή), όπως το total της agreements_list.
--    Μηνιαία και εφάπαξ μένουν χωριστές. Χωρίς Συμφωνία → null («—»), αλλά μετρά στο πλήθος.
--  • Πωλητής (Ρ4): φίλτρο p_seller = Υπεύθυνος της Ευκαιρίας. Το φίλτρο και η στήλη «Υπεύθυνος» φαίνονται (showSeller) μόνο
--    με Εύρος «όλα» και πάνω από έναν ενεργό Χρήστη που μπορεί να γίνει Υπεύθυνος (ίδιος κανόνας με την
--    public.sales_assignable_users). Με Εύρος Α ένας ξένος Πωλητής δίνει ό,τι και ένας άγνωστος: καμία γραμμή.
--  • Περίοδοι (Ρ3): authz.report_period* του Ρα· μετρά όλη η Περίοδος (from..to), σε ώρα Ελλάδας.

-- ───────────── Πρόσβαση ─────────────

-- Αναφορά πωλήσεων: «Βλέπει Αναφορές» + «Διαχειρίζεται Πελάτες και Ευκαιρίες», αλλιώς 42501.
-- is_all = Εύρος «όλα»· amounts = φαίνονται τα ποσά.
create function authz.report_sales_access(out is_all boolean, out amounts boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (authz.has('reports.view') and authz.has('clients.manage')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  is_all := coalesce(authz.scope('reports.view') = 'all' and authz.scope('clients.manage') = 'all', false);
  amounts := coalesce(authz.scope('finance.amounts') = 'all', false) or (authz.has('finance.amounts') and not is_all);
end;
$$;

-- Οι ενεργοί Χρήστες που μπορούν να γίνουν Υπεύθυνοι (ο κανόνας της public.sales_assignable_users, χωρίς το Δικαίωμα
-- ανάθεσης του θεατή: εδώ μετράμε μόνο αν υπάρχουν πάνω από ένας).
create function authz.report_sellers()
returns table (user_id uuid, name text)
language sql stable security definer set search_path = ''
as $$
  select u.user_id, u.name
    from public.team_users u
   where u.is_active and authz.user_scope(u.user_id, 'clients.manage') is not null;
$$;

-- { isScoped, showSeller, seller: { id, name } | null, sellers: [{ id, name }] }
-- sellers και seller μόνο όταν φαίνεται το φίλτρο· seller = ο Πωλητής του φίλτρου μόνο αν είναι στη λίστα.
create function authz.report_seller_json(p_all boolean, p_seller uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  with s as (
    select r.user_id, r.name from authz.report_sellers() r
  ), shown as (
    select p_all and (select count(*) from s) > 1 as v
  )
  select jsonb_build_object(
    'isScoped', not p_all,
    'showSeller', sh.v,
    'seller', case when sh.v then (select jsonb_build_object('id', s.user_id, 'name', s.name) from s where s.user_id = p_seller) end,
    'sellers', case when sh.v then coalesce((
      select jsonb_agg(jsonb_build_object('id', s.user_id, 'name', s.name) order by s.name, s.user_id) from s
    ), '[]'::jsonb) else '[]'::jsonb end
  )
  from shown sh;
$$;

-- Οι Ευκαιρίες που βλέπει ο θεατής σε αυτό το Εύρος, με τον Πωλητή του φίλτρου, και η αξία της πρότασής τους.
-- kind/price null = χωρίς Συμφωνία. created_on/closed_on σε ώρα Ελλάδας.
create function authz.report_opportunities(p_all boolean, p_seller uuid)
returns table (
  opportunity_id uuid, title text, client_name text, stage_id uuid, source_id uuid, manager_name text, outcome text,
  loss_reason_id uuid, created_on date, closed_on date, closed_at timestamptz, next_step_due date, kind text, price numeric
)
language sql stable security definer set search_path = ''
as $$
  select o.id, o.title, c.name, o.stage_id, o.source_id, u.name, o.outcome, o.loss_reason_id,
         (o.created_at at time zone 'Europe/Athens')::date, (o.closed_at at time zone 'Europe/Athens')::date, o.closed_at,
         o.next_step_due, a.kind,
         case when a.id is not null then (select f.price from authz.agreement_figures(a.id) f) end
    from public.opportunities o
    join public.clients c on c.id = o.client_id
    left join public.team_users u on u.user_id = o.manager_id
    left join public.agreements a on a.opportunity_id = o.id
   where authz.can_see_opportunity_row(o.client_id, o.manager_id)
     and (p_all or coalesce(o.manager_id = auth.uid(), false))
     and (p_seller is null or coalesce(o.manager_id = p_seller, false));
$$;

-- ───────────── Ανοιχτές Ευκαιρίες ανά Στάδιο (πάντα σήμερα) ─────────────

-- { amounts, isScoped, showSeller, seller, sellers,
--   stages: [{ stageId, label, count, monthly, oneOff, withoutProposal }],
--   rows: [{ opportunityId, title, clientName, stageId, stageLabel, managerName, kind, value, nextStepDue }],
--   totals: { count, monthly, oneOff, withoutProposal } }
-- Στάδια: τα ενεργά, και όποιο αποσυρμένο έχει ακόμα ανοιχτή Ευκαιρία, με τη σειρά των Ρυθμίσεων.
-- monthly/oneOff/value null χωρίς ποσά. managerName null = «Χωρίς υπεύθυνο». Γραμμές κατά Στάδιο και Επόμενο βήμα.
create function authz.report_sales_pipeline(p_seller uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_all boolean;
  v_amounts boolean;
begin
  select a.is_all, a.amounts into v_all, v_amounts from authz.report_sales_access() a;
  return (
    with opp as (
      select o.* from authz.report_opportunities(v_all, p_seller) o where o.outcome = 'open'
    ), stages as (
      select s.id, s.label, s.sort from public.sales_stages s
       where s.retired_at is null or exists (select 1 from opp o where o.stage_id = s.id)
    ), per as (
      select s.id, s.label, s.sort,
             count(o.opportunity_id) as cnt,
             coalesce(sum(o.price) filter (where o.kind = 'monthly'), 0) as monthly,
             coalesce(sum(o.price) filter (where o.kind = 'one_off'), 0) as one_off,
             count(o.opportunity_id) filter (where o.kind is null) as no_proposal
        from stages s left join opp o on o.stage_id = s.id
       group by s.id, s.label, s.sort
    )
    select authz.report_seller_json(v_all, p_seller) || jsonb_build_object(
      'amounts', v_amounts,
      'stages', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'stageId', p.id, 'label', p.label, 'count', p.cnt,
                 'monthly', case when v_amounts then p.monthly end,
                 'oneOff', case when v_amounts then p.one_off end,
                 'withoutProposal', p.no_proposal
               ) order by p.sort, p.id)
          from per p
      ), '[]'::jsonb),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'opportunityId', o.opportunity_id, 'title', o.title, 'clientName', o.client_name,
                 'stageId', o.stage_id, 'stageLabel', s.label, 'managerName', o.manager_name,
                 'kind', o.kind, 'value', case when v_amounts then o.price end, 'nextStepDue', o.next_step_due
               ) order by s.sort, o.next_step_due, o.title, o.opportunity_id)
          from opp o join stages s on s.id = o.stage_id
      ), '[]'::jsonb),
      'totals', jsonb_build_object(
        'count', (select count(*) from opp),
        'monthly', case when v_amounts then (select coalesce(sum(o.price), 0) from opp o where o.kind = 'monthly') end,
        'oneOff', case when v_amounts then (select coalesce(sum(o.price), 0) from opp o where o.kind = 'one_off') end,
        'withoutProposal', (select count(*) from opp o where o.kind is null)
      )
    )
  );
end;
$$;

-- ───────────── Κερδισμένες και χαμένες ─────────────

-- { period, amounts, isScoped, showSeller, seller, sellers,
--   totals: { won, lost, winRate, wonMonthly, wonOneOff },
--   lossReasons: [{ reasonId, label, count }],
--   rows: [{ opportunityId, title, clientName, managerName, outcome, closedOn, lossReason, kind, value }] }
-- Κατά ημερομηνία Έκβασης (closed_at, ώρα Ελλάδας). winRate = won / (won + lost), 4 δεκαδικά, null χωρίς έκβαση.
-- Λόγοι απώλειας: περισσότερες πρώτα. Γραμμές: πιο πρόσφατη Έκβαση πρώτα. Ποσά null χωρίς «Βλέπει ποσά».
create function authz.report_sales_results(p_period text, p_seller uuid, p_today date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_all boolean;
  v_amounts boolean;
  v_from date;
  v_to date;
begin
  select a.is_all, a.amounts into v_all, v_amounts from authz.report_sales_access() a;
  select p.from_date, p.to_date into v_from, v_to from authz.report_period(p_period, p_today) p;
  return (
    with opp as (
      select o.* from authz.report_opportunities(v_all, p_seller) o
       where o.outcome in ('won', 'lost') and o.closed_on between v_from and v_to
    ), counts as (
      select count(*) filter (where o.outcome = 'won') as won, count(*) filter (where o.outcome = 'lost') as lost from opp o
    )
    select authz.report_seller_json(v_all, p_seller) || jsonb_build_object(
      'period', authz.report_period_json(p_period, p_today),
      'amounts', v_amounts,
      'totals', (
        select jsonb_build_object(
          'won', c.won, 'lost', c.lost,
          'winRate', case when c.won + c.lost > 0 then round(c.won::numeric / (c.won + c.lost), 4) end,
          'wonMonthly', case when v_amounts then
            (select coalesce(sum(o.price), 0) from opp o where o.outcome = 'won' and o.kind = 'monthly') end,
          'wonOneOff', case when v_amounts then
            (select coalesce(sum(o.price), 0) from opp o where o.outcome = 'won' and o.kind = 'one_off') end
        ) from counts c
      ),
      'lossReasons', coalesce((
        select jsonb_agg(jsonb_build_object('reasonId', x.id, 'label', x.label, 'count', x.cnt) order by x.cnt desc, x.sort, x.id)
          from (select r.id, r.label, r.sort, count(*) as cnt
                  from opp o join public.sales_loss_reasons r on r.id = o.loss_reason_id
                 group by r.id, r.label, r.sort) x
      ), '[]'::jsonb),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'opportunityId', o.opportunity_id, 'title', o.title, 'clientName', o.client_name,
                 'managerName', o.manager_name, 'outcome', o.outcome, 'closedOn', o.closed_on, 'lossReason', r.label,
                 'kind', o.kind, 'value', case when v_amounts then o.price end
               ) order by o.closed_at desc, o.opportunity_id)
          from opp o left join public.sales_loss_reasons r on r.id = o.loss_reason_id
      ), '[]'::jsonb)
    )
  );
end;
$$;

-- ───────────── Πηγές Ευκαιριών ─────────────

-- { period, isScoped, showSeller, seller, sellers,
--   rows: [{ sourceId, label, opened, open, won, lost, winRate }],
--   totals: { opened, open, won, lost, winRate },
--   opportunities: [{ opportunityId, title, clientName, sourceLabel, managerName, outcome, createdOn }] }
-- Οι Ευκαιρίες που άνοιξαν μέσα στην Περίοδο (created_at, ώρα Ελλάδας), ανά Πηγή, με την Έκβασή τους σήμερα.
-- Μόνο πλήθη, άρα δεν θέλει «Βλέπει ποσά». Πηγές με τις περισσότερες πρώτα, μετά με τη σειρά των Ρυθμίσεων.
create function authz.report_sales_sources(p_period text, p_seller uuid, p_today date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_all boolean;
  v_from date;
  v_to date;
begin
  select a.is_all into v_all from authz.report_sales_access() a;
  select p.from_date, p.to_date into v_from, v_to from authz.report_period(p_period, p_today) p;
  return (
    with opp as (
      select o.* from authz.report_opportunities(v_all, p_seller) o where o.created_on between v_from and v_to
    ), per as (
      select s.id, s.label, s.sort, count(*) as opened,
             count(*) filter (where o.outcome = 'open') as open_count,
             count(*) filter (where o.outcome = 'won') as won_count,
             count(*) filter (where o.outcome = 'lost') as lost_count
        from opp o join public.sales_sources s on s.id = o.source_id
       group by s.id, s.label, s.sort
    ), tot as (
      select count(*) as opened,
             count(*) filter (where o.outcome = 'open') as open_count,
             count(*) filter (where o.outcome = 'won') as won_count,
             count(*) filter (where o.outcome = 'lost') as lost_count
        from opp o
    )
    select authz.report_seller_json(v_all, p_seller) || jsonb_build_object(
      'period', authz.report_period_json(p_period, p_today),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'sourceId', p.id, 'label', p.label, 'opened', p.opened, 'open', p.open_count, 'won', p.won_count, 'lost', p.lost_count,
                 'winRate', case when p.won_count + p.lost_count > 0 then round(p.won_count::numeric / (p.won_count + p.lost_count), 4) end
               ) order by p.opened desc, p.sort, p.id)
          from per p
      ), '[]'::jsonb),
      'totals', (
        select jsonb_build_object(
          'opened', t.opened, 'open', t.open_count, 'won', t.won_count, 'lost', t.lost_count,
          'winRate', case when t.won_count + t.lost_count > 0 then round(t.won_count::numeric / (t.won_count + t.lost_count), 4) end
        ) from tot t
      ),
      'opportunities', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'opportunityId', o.opportunity_id, 'title', o.title, 'clientName', o.client_name,
                 'sourceLabel', s.label, 'managerName', o.manager_name, 'outcome', o.outcome, 'createdOn', o.created_on
               ) order by o.created_on desc, o.title, o.opportunity_id)
          from opp o join public.sales_sources s on s.id = o.source_id
      ), '[]'::jsonb)
    )
  );
end;
$$;

-- ───────────── RPC της εφαρμογής (σήμερα = ώρα Ελλάδας) ─────────────

create function public.report_sales_pipeline(p_seller uuid default null) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.report_sales_pipeline(p_seller); $$;

create function public.report_sales_results(p_period text default null, p_seller uuid default null) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.report_sales_results(p_period, p_seller, public.sales_today()); $$;

create function public.report_sales_sources(p_period text default null, p_seller uuid default null) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.report_sales_sources(p_period, p_seller, public.sales_today()); $$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.report_sales_access(), authz.report_sellers(), authz.report_seller_json(boolean, uuid),
  authz.report_opportunities(boolean, uuid), authz.report_sales_pipeline(uuid),
  authz.report_sales_results(text, uuid, date), authz.report_sales_sources(text, uuid, date)
  from public, anon, authenticated;

revoke all on function
  public.report_sales_pipeline(uuid), public.report_sales_results(text, uuid), public.report_sales_sources(text, uuid)
  from public, anon, authenticated;

grant execute on function
  public.report_sales_pipeline(uuid), public.report_sales_results(text, uuid), public.report_sales_sources(text, uuid)
  to authenticated;
