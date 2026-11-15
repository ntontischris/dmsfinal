-- Σήμερα: δείκτες και «ραντάρ κινδύνου» (χάρτης d9, όπως η μπάρα δεικτών του παλιού DMS).
--
-- public.today_kpis(p_today): ένα JSON για την ενημέρωση της ομάδας. Κάθε δείκτης φαίνεται μόνο σε όποιον έχει το Δικαίωμά
-- του· αλλιώς null (καμία άρνηση 42501: η Σήμερα απλώς δεν τον δείχνει).
--  • turnover: Τζίρος του μήνα = καθαρό ποσό (χωρίς ΦΠΑ) των Τιμολογίων που εκδόθηκαν μέσα στον μήνα, μείον τα Πιστωτικά
--    (ίδιος ορισμός με την Αναφορά «Τζίρος και Εισπράξεις»). «Βλέπει Οικονομικά» + «Βλέπει ποσά» με Εύρος «όλα».
--  • pipeline: η ανοιχτή πρόβλεψη πωλήσεων (public.sales_pipeline_value, χάρτης b3): σταθμισμένη Αξία, συνολική Αξία και
--    ανοιχτές Ευκαιρίες. «Διαχειρίζεται Πελάτες και Ευκαιρίες»· ποσά null χωρίς «Βλέπει ποσά» (όπως η πρόβλεψη).
--  • activeProductions: οι ανοιχτές Παραγωγές που βλέπει ο Χρήστης (authz.can_see_production). «Διαχειρίζεται Παραγωγές».
--  • margin: Περιθώριο φέτος = (Έσοδα − Έξοδα) / Έσοδα, μόνο από τους μήνες του έτους (ως σήμερα) που έχουν Έξοδα στο
--    Κόστος (ίδιος κανόνας με την Αναφορά «Έσοδα, Έξοδα και Κέρδος»). Δικαίωμα του Τζίρου + «Βλέπει κόστος».
--  • risks: μόνο όσα έχουν πλήθος > 0, με σταθερή σειρά και σύνδεσμο:
--      cost_overrun      Παραγωγές σε Υπέρβαση κόστους (ο κανόνας και το όριο της G3, ρυθμίζεται στα Οικονομικά)
--      hours_missing     Παραδομένες Παραγωγές χωρίς επιβεβαιωμένες ώρες (η ομάδα «Θέλουν ώρες» της G3)
--      expenses_missing  ο προηγούμενος μήνας δεν έχει Έξοδα στο Κόστος (1)
--      late_opportunities Ευκαιρίες με Αναμενόμενο κλείσιμο που πέρασε
--    Τα ληξιπρόθεσμα Τιμολόγια ΔΕΝ μπαίνουν: τα δείχνει ήδη το κομμάτι «Χρήματα» δίπλα.

create function authz.today_kpis(p_today date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_month date := date_trunc('month', p_today)::date;
  v_year date := date_trunc('year', p_today)::date;
  v_prev date := (date_trunc('month', p_today) - interval '1 month')::date;
  v_finance boolean := coalesce(authz.has('finance.view'), false)
                       and authz.scope('finance.amounts') is not distinct from 'all';
  v_cost boolean := coalesce(authz.has('finance.cost'), false);
  v_sales boolean := coalesce(authz.has('clients.manage'), false);
  v_productions boolean := authz.scope('productions.manage') is not null;
  v_pipeline jsonb;
  v_turnover numeric;
  v_margin jsonb;
  v_groups jsonb;
begin
  if not authz.is_team_user() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if v_finance then
    select coalesce(sum(i.signed_net), 0) into v_turnover
      from authz.report_invoices(p_today) i
     where i.issue_date between v_month and p_today;
  end if;
  if v_finance and v_cost then
    with inv as materialized (
      select i.issue_date, i.signed_net from authz.report_invoices(p_today) i where i.issue_date between v_year and p_today
    ), lines as (
      select m.m,
             (select coalesce(sum(i.signed_net), 0) from inv i where date_trunc('month', i.issue_date) = m.m) as income,
             (select c.expenses_total from public.cost_months c where c.month = m.m) as expenses
        from generate_series(v_year, v_month, interval '1 month') m (m)
    ), known as (
      select coalesce(sum(l.income), 0) as income, coalesce(sum(l.expenses), 0) as expenses, count(*) as months
        from lines l where l.expenses is not null
    )
    select jsonb_build_object(
             'margin', case when k.income > 0 then round((k.income - k.expenses) / k.income, 4) end,
             'months', k.months)
      into v_margin from known k;
  end if;
  if v_sales then
    v_pipeline := public.sales_pipeline_value(p_today);
  end if;
  if v_cost then
    -- Οι ίδιες γραμμές με την κάρτα «Ώρες και Υπέρβαση κόστους» (authz.today_cost_rows, ομάδες της G3).
    select jsonb_build_object(
             'cost_overrun', count(*) filter (where c.grp = 'overrun'),
             'hours_missing', count(*) filter (where c.grp = 'needs_hours'))
      into v_groups
      from authz.today_cost_rows() c;
  end if;
  return jsonb_build_object(
    'month', to_char(v_month, 'YYYY-MM'),
    'turnover', v_turnover,
    'pipeline', case when v_pipeline is not null then jsonb_build_object(
      'weighted', v_pipeline -> 'weighted', 'total', v_pipeline -> 'total', 'open', v_pipeline -> 'open') end,
    'activeProductions', case when v_productions then (
      select count(*)::integer from public.productions p where p.state = 'open' and authz.can_see_production(p.id)) end,
    'margin', v_margin,
    'risks', coalesce((
      select jsonb_agg(jsonb_build_object('code', r.code, 'count', r.n, 'link', r.link) order by r.ord)
        from (values
          (1, 'cost_overrun', (v_groups ->> 'cost_overrun')::integer, '/app/productions/costs'),
          (2, 'hours_missing', (v_groups ->> 'hours_missing')::integer, '/app/productions/costs'),
          (3, 'expenses_missing',
              case when v_cost and not exists (select 1 from public.cost_months c where c.month = v_prev) then 1 else 0 end,
              '/app/finance/expenses?month=' || to_char(v_prev, 'YYYY-MM')),
          (4, 'late_opportunities', (v_pipeline ->> 'late')::integer, '/app/pipeline')
        ) as r (ord, code, n, link)
       where coalesce(r.n, 0) > 0), '[]'::jsonb)
  );
end;
$$;

create function public.today_kpis(p_today date default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  return authz.today_kpis(coalesce(p_today, (now() at time zone 'Europe/Athens')::date));
end;
$$;

revoke all on function authz.today_kpis(date) from public, anon, authenticated;
revoke all on function public.today_kpis(date) from public, anon, authenticated;
grant execute on function public.today_kpis(date) to authenticated;
