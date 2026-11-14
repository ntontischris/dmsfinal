-- Οι Αναφορές του παλιού DMS (d8) και τα Έξοδα στο Πακέτο λογιστή (d10).
--
--  • Έξοδα ανά κατηγορία: από την ανάλυση του cost_months (I6). Μήνας χωρίς ανάλυση μετρά στο «Χωρίς ανάλυση».
--    Θέλει «Βλέπει Αναφορές» + κόστος ή «Βλέπει ποσά» για όλα (ο Λογιστής βλέπει τα Έξοδα, όχι το Κόστος ώρας).
--  • Έσοδα − Έξοδα = Κέρδος, ανά μήνα: Έσοδα = ο Τζίρος της M1 (καθαρά, μετά τα Πιστωτικά), Έξοδα = το σύνολο του
--    cost_months. Θέλει Αναφορές + Οικονομικά + κόστος· χωρίς «Βλέπει ποσά» τα Έσοδα (και το Κέρδος) είναι null.
--  • Τρόποι είσπραξης: οι Εισπράξεις της περιόδου ανά Τρόπο (και οι αποσυρμένοι), με την παρακράτηση χωριστά.
--  • Παραγωγές ανά κατάσταση και είδος: όσες ξεκίνησαν στην περίοδο, ανά είδος Συμφωνίας (μηνιαία, εφάπαξ, Εσωτερική).
--    Θέλει Αναφορές + «Διαχειρίζεται Παραγωγές»· με Εύρος «δικές μου» μετρά μόνο όσες τον αφορούν.
--  • Το export_report ξαναγράφει τη λίστα του με τις τέσσερις νέες (όπως ζητά το σχόλιό του). Το
--    export_accountant_pack δίνει και τις γραμμές Εξόδων του μήνα σε όποιον βλέπει κόστος ή «Βλέπει ποσά» για όλα.
-- Όλες οι authz.* παίρνουν p_today· τα public RPC δίνουν σήμερα = ώρα Ελλάδας (public.sales_today()).

-- ───────────── Πηγή: γραμμές Εξόδων ─────────────

-- Μία γραμμή ανά γραμμή ανάλυσης των μηνών [p_from, p_to]· μήνας χωρίς ανάλυση = μία γραμμή «Χωρίς ανάλυση» με το σύνολό του.
create function authz.expense_lines(p_from date, p_to date)
returns table (month date, category text, item text, label text, amount numeric)
language sql stable security definer set search_path = ''
as $$
  select m.month, c.value ->> 'name', i.value ->> 'name', l.value ->> 'label', (l.value ->> 'amount')::numeric
    from public.cost_months m
   cross join lateral jsonb_array_elements(m.expense_categories) c
   cross join lateral jsonb_array_elements(c.value -> 'items') i
   cross join lateral jsonb_array_elements(i.value -> 'lines') l
   where m.expense_categories is not null and m.month between date_trunc('month', p_from)::date and p_to
  union all
  select m.month, 'Χωρίς ανάλυση', null, null, m.expenses_total
    from public.cost_months m
   where m.expense_categories is null and m.month between date_trunc('month', p_from)::date and p_to;
$$;

-- Βλέπει τα Έξοδα; «Βλέπει κόστος και κερδοφορία» ή «Βλέπει ποσά» για όλα (ο Λογιστής): τα Έξοδα είναι λογιστικά
-- στοιχεία. Το Κόστος ώρας και η Κερδοφορία μένουν μόνο στο «Βλέπει κόστος».
create function authz.can_see_expenses() returns boolean
language plpgsql stable security definer set search_path = ''
as $$
begin
  return coalesce(authz.has('finance.cost'), false) or authz.scope('finance.amounts') is not distinct from 'all';
end;
$$;

-- Αναφορές με Έξοδα: «Βλέπει Αναφορές» + (p_cost ? «Βλέπει κόστος» : Βλέπει τα Έξοδα), αλλιώς 42501.
create function authz.report_require_cost(p_cost boolean) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (coalesce(authz.has('reports.view'), false)
          and case when p_cost then coalesce(authz.has('finance.cost'), false) else authz.can_see_expenses() end) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- ───────────── Έξοδα ανά κατηγορία ─────────────

-- Θέλει «Βλέπει Αναφορές» + Βλέπει τα Έξοδα (κόστος ή «Βλέπει ποσά» για όλα).
-- { period, rows: [{ category, amount, share, lineCount }], totals: { amount, lineCount },
--   monthCount, unsplitMonths, missingMonths }
-- monthCount = μήνες με γραμμένα Έξοδα· unsplitMonths = όσοι από αυτούς χωρίς ανάλυση· missingMonths = μήνες της
-- περιόδου ως σήμερα χωρίς Έξοδα. Μεγαλύτερη κατηγορία πρώτα.
create function authz.report_expenses_by_category(p_period text, p_today date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_from date;
  v_to date;
  v_through date;
begin
  perform authz.report_require_cost(false);
  select p.from_date, p.to_date, p.through into v_from, v_to, v_through from authz.report_period(p_period, p_today) p;
  return (
    with lines as (
      select * from authz.expense_lines(v_from, v_to)
    ), per as (
      select l.category, sum(l.amount) as amount, count(*) filter (where l.item is not null) as line_count
        from lines l group by l.category
    ), grand as (
      select coalesce(sum(p.amount), 0) as amount, coalesce(sum(p.line_count), 0) as line_count from per p
    ), months as (
      select g::date as m from generate_series(date_trunc('month', v_from), date_trunc('month', v_through), interval '1 month') g
    )
    select jsonb_build_object(
      'period', authz.report_period_json(p_period, p_today),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'category', p.category, 'amount', p.amount,
                 'share', case when g.amount > 0 then round(p.amount / g.amount, 4) end,
                 'lineCount', p.line_count
               ) order by p.amount desc, p.category)
          from per p cross join grand g
      ), '[]'::jsonb),
      'totals', (select jsonb_build_object('amount', g.amount, 'lineCount', g.line_count) from grand g),
      'monthCount', (select count(distinct l.month) from lines l),
      'unsplitMonths', (select count(*) from lines l where l.item is null),
      'missingMonths', (select count(*) from months m
                         where not exists (select 1 from public.cost_months c where c.month = m.m))
    )
  );
end;
$$;

-- ───────────── Έσοδα − Έξοδα = Κέρδος ─────────────

-- { period, amounts, months: [{ month, income, expenses, profit, margin, isPartial }],
--   totals: { income, expenses, profit, margin }, missingMonths }
-- income = Τζίρος (καθαρά, μετά τα Πιστωτικά, κατά έκδοση)· null χωρίς «Βλέπει ποσά». expenses = σύνολο Εξόδων του μήνα,
-- null όταν δεν έχει γραφτεί· τότε και profit null. Στα σύνολα μετρούν μόνο οι μήνες με Έξοδα (missingMonths = οι άλλοι),
-- ώστε το Κέρδος να μη φουσκώνει από μήνες χωρίς Έξοδα. margin = profit / income, 4 δεκαδικά (null αν income ≤ 0).
create function authz.report_profit(p_period text, p_today date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_amounts boolean := authz.report_finance_amounts();
  v_from date;
  v_to date;
  v_through date;
begin
  perform authz.report_require_cost(true);
  select p.from_date, p.to_date, p.through into v_from, v_to, v_through from authz.report_period(p_period, p_today) p;
  return (
    with inv as (
      select i.* from authz.report_invoices(p_today) i where i.issue_date between v_from and v_to
    ), months as (
      select g::date as m from generate_series(date_trunc('month', v_from), date_trunc('month', v_through), interval '1 month') g
    ), lines as (
      select m.m,
             (select coalesce(sum(i.signed_net), 0) from inv i where date_trunc('month', i.issue_date) = m.m) as income,
             (select c.expenses_total from public.cost_months c where c.month = m.m) as expenses
        from months m
    ), known as (
      select coalesce(sum(l.income), 0) as income, coalesce(sum(l.expenses), 0) as expenses
        from lines l where l.expenses is not null
    )
    select jsonb_build_object(
      'period', authz.report_period_json(p_period, p_today),
      'amounts', v_amounts,
      'months', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'month', to_char(l.m, 'YYYY-MM'),
                 'income', case when v_amounts then l.income end,
                 'expenses', l.expenses,
                 'profit', case when v_amounts and l.expenses is not null then l.income - l.expenses end,
                 'margin', case when v_amounts and l.expenses is not null and l.income > 0
                                then round((l.income - l.expenses) / l.income, 4) end,
                 'isPartial', l.m = date_trunc('month', p_today)::date
               ) order by l.m)
          from lines l
      ), '[]'::jsonb),
      'totals', (
        select jsonb_build_object(
                 'income', case when v_amounts then k.income end,
                 'expenses', k.expenses,
                 'profit', case when v_amounts then k.income - k.expenses end,
                 'margin', case when v_amounts and k.income > 0 then round((k.income - k.expenses) / k.income, 4) end)
          from known k
      ),
      'missingMonths', (select count(*) from lines l where l.expenses is null)
    )
  );
end;
$$;

-- ───────────── Τρόποι είσπραξης ─────────────

-- { period, amounts, rows: [{ methodId, label, retired, amount, share, receiptCount }],
--   totals: { amount, receiptCount, withheld, withheldCount } }
-- Οι μη διαγραμμένες Εισπράξεις της περιόδου (κατά ημερομηνία είσπραξης), ποσό με ΦΠΑ όπως μπήκε. Η παρακράτηση δεν
-- είναι Τρόπος: φαίνεται χωριστά στα σύνολα. Ποσά null χωρίς «Βλέπει ποσά»· τότε αλφαβητικά, αλλιώς μεγαλύτερο πρώτο.
create function authz.report_payment_methods(p_period text, p_today date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_amounts boolean := authz.report_finance_amounts();
  v_from date;
  v_to date;
begin
  select p.from_date, p.to_date into v_from, v_to from authz.report_period(p_period, p_today) p;
  return (
    with rec as (
      select r.method_id, r.amount, r.withheld
        from public.receipts r
       where r.deleted_at is null and r.received_on between v_from and v_to
    ), per as (
      select r.method_id, sum(r.amount) as amount, count(*) as receipt_count from rec r group by r.method_id
    ), grand as (
      select coalesce(sum(r.amount), 0) as amount, count(*) as receipt_count,
             coalesce(sum(r.withheld), 0) as withheld, count(*) filter (where r.withheld > 0) as withheld_count
        from rec r
    )
    select jsonb_build_object(
      'period', authz.report_period_json(p_period, p_today),
      'amounts', v_amounts,
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'methodId', p.method_id, 'label', m.label, 'retired', m.retired_at is not null,
                 'amount', case when v_amounts then p.amount end,
                 'share', case when v_amounts and g.amount > 0 then round(p.amount / g.amount, 4) end,
                 'receiptCount', p.receipt_count
               ) order by case when v_amounts then p.amount end desc nulls last, m.label, p.method_id)
          from per p
          join public.payment_methods m on m.id = p.method_id
          cross join grand g
      ), '[]'::jsonb),
      'totals', (
        select jsonb_build_object(
                 'amount', case when v_amounts then g.amount end, 'receiptCount', g.receipt_count,
                 'withheld', case when v_amounts then g.withheld end, 'withheldCount', g.withheld_count)
          from grand g
      )
    )
  );
end;
$$;

-- ───────────── Παραγωγές ανά κατάσταση και είδος ─────────────

-- { period, rows: [{ type, open, delivered, cancelled, total }], totals: { open, delivered, cancelled, total },
--   deliveredInPeriod }
-- type: 'monthly' | 'one_off' (το είδος της Συμφωνίας) | 'internal' (χωρίς Πελάτη). Μετρούν όσες ξεκίνησαν στην περίοδο
-- (ώρα Ελλάδας), με την κατάστασή τους σήμερα· deliveredInPeriod = όσες παραδόθηκαν μέσα στην περίοδο, όποτε κι αν ξεκίνησαν.
-- Εύρος «δικές μου» = μόνο όσες τον αφορούν (υπεύθυνος ή Μέλος), όπως η G1.
create function authz.report_productions(p_period text, p_today date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_scope text := authz.scope('productions.manage');
  v_from date;
  v_to date;
begin
  if not coalesce(authz.has('reports.view'), false) or v_scope is null or not authz.is_team_user() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select p.from_date, p.to_date into v_from, v_to from authz.report_period(p_period, p_today) p;
  return (
    with seen as (
      select p.id, p.state, p.created_at, p.delivered_at,
             case when p.agreement_id is null then 'internal' else a.kind end as type
        from public.productions p
        left join public.agreements a on a.id = p.agreement_id
       where v_scope = 'all' or authz.is_production_participant(p.id)
    ), started as (
      select s.* from seen s where (s.created_at at time zone 'Europe/Athens')::date between v_from and v_to
    ), per as (
      select s.type,
             count(*) filter (where s.state = 'open') as open,
             count(*) filter (where s.state = 'delivered') as delivered,
             count(*) filter (where s.state = 'cancelled') as cancelled,
             count(*) as total
        from started s group by s.type
    )
    select jsonb_build_object(
      'period', authz.report_period_json(p_period, p_today),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object('type', p.type, 'open', p.open, 'delivered', p.delivered,
                                            'cancelled', p.cancelled, 'total', p.total)
                         order by array_position(array['monthly', 'one_off', 'internal'], p.type))
          from per p
      ), '[]'::jsonb),
      'totals', jsonb_build_object(
        'open', (select count(*) from started s where s.state = 'open'),
        'delivered', (select count(*) from started s where s.state = 'delivered'),
        'cancelled', (select count(*) from started s where s.state = 'cancelled'),
        'total', (select count(*) from started s)
      ),
      'deliveredInPeriod', (select count(*) from seen s
                             where (s.delivered_at at time zone 'Europe/Athens')::date between v_from and v_to)
    )
  );
end;
$$;

-- ───────────── Εξαγωγή Αναφοράς: η λίστα με τις νέες ─────────────

create or replace function authz.export_report(p_report text, p_rpc text, p_args jsonb, p_rows_key text, p_format text)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_args jsonb := coalesce(p_args, '{}'::jsonb);
  v_call text;
  v_data jsonb;
begin
  perform authz.export_require();
  perform authz.export_check_format(p_format);
  if p_report is null or p_rpc is null or p_rows_key is null or jsonb_typeof(v_args) <> 'object'
     or (p_report, p_rpc, p_rows_key) not in (
       ('turnover', 'report_turnover_monthly', 'months'), ('by-client', 'report_turnover_by_client', 'rows'),
       ('receivables', 'report_receivables_aging', 'rows'), ('pipeline', 'report_sales_pipeline', 'stages'),
       ('results', 'report_sales_results', 'rows'), ('sources', 'report_sales_sources', 'rows'),
       ('expenses', 'report_expenses_by_category', 'rows'), ('profit', 'report_profit', 'months'),
       ('payment-methods', 'report_payment_methods', 'rows'), ('productions', 'report_productions', 'rows'))
     or not exists (
       select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = p_rpc and p.prorettype = 'jsonb'::regtype and p.prosecdef
          and pg_catalog.has_function_privilege('authenticated', p.oid, 'execute'))
     or exists (select 1 from jsonb_object_keys(v_args) k where k not in ('p_period', 'p_client', 'p_seller')) then
    raise exception 'Αυτή η Αναφορά δεν εξάγεται' using errcode = 'P0001';
  end if;
  v_call := format('select public.%I(%s)', p_rpc, concat_ws(', ',
    case when v_args ? 'p_period' then 'p_period => $1' end,
    case when v_args ? 'p_client' then 'p_client => $2' end,
    case when v_args ? 'p_seller' then 'p_seller => $3' end));
  execute v_call into v_data
    using v_args ->> 'p_period', (v_args ->> 'p_client')::uuid, (v_args ->> 'p_seller')::uuid;
  if jsonb_typeof(v_data -> p_rows_key) is distinct from 'array' then
    raise exception 'Αυτή η Αναφορά δεν εξάγεται' using errcode = 'P0001';
  end if;
  perform authz.export_log('report', p_report,
    jsonb_strip_nulls(jsonb_build_object(
      'period', v_data #>> '{period,code}', 'from', v_data #>> '{period,from}', 'to', v_data #>> '{period,to}',
      'client', v_args ->> 'p_client', 'seller', v_args ->> 'p_seller')),
    jsonb_array_length(v_data -> p_rows_key), p_format);
  return v_data;
end;
$$;

-- ───────────── Πακέτο λογιστή: και τα Έξοδα (d10) ─────────────

-- Όπως πριν, συν expenses: [{ month, category, item, label, amount }] | null. Τα Έξοδα τα παίρνει όποιος βλέπει κόστος
-- ή «Βλέπει ποσά» για όλα (ο Λογιστής): είναι λογιστικά στοιχεία, όχι το Κόστος ώρας ή η Κερδοφορία, που δεν μπαίνουν.
-- Αλλιώς expenses = null και το πακέτο δεν έχει φύλλο Εξόδων. Οι γραμμές του Ίχνους μετρούν Τιμολόγια + Εισπράξεις,
-- όπως πριν· τα Έξοδα γράφονται χωριστά στα φίλτρα.
create or replace function authz.export_accountant_pack(p_month text, p_today date) returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_amounts boolean := authz.scope('finance.amounts') is not distinct from 'all';
  v_from date;
  v_to date;
  v_invoices jsonb;
  v_receipts jsonb;
  v_expenses jsonb;
begin
  perform authz.export_require();
  if not coalesce(authz.has('finance.view'), false) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_month is null or p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'Άγνωστος μήνας' using errcode = 'P0001';
  end if;
  v_from := to_date(p_month || '-01', 'YYYY-MM-DD');
  if v_from > p_today then
    raise exception 'Ο μήνας δεν έχει αρχίσει ακόμα' using errcode = 'P0001';
  end if;
  v_to := (v_from + interval '1 month - 1 day')::date;
  v_invoices := authz.export_invoice_rows(v_from, v_to, p_today, v_amounts, true);
  v_receipts := authz.export_receipt_rows(v_from, v_to, v_amounts);
  if authz.can_see_expenses() then
    v_expenses := coalesce((
      select jsonb_agg(jsonb_build_object('month', to_char(l.month, 'YYYY-MM'), 'category', l.category,
                                          'item', l.item, 'label', l.label, 'amount', l.amount)
                       order by l.category, l.item nulls first, l.label)
        from authz.expense_lines(v_from, v_to) l
    ), '[]'::jsonb);
  end if;
  perform authz.export_log('accountant_pack', 'accountant-pack',
    jsonb_strip_nulls(jsonb_build_object('month', p_month, 'invoices', jsonb_array_length(v_invoices),
                       'receipts', jsonb_array_length(v_receipts), 'expenses', jsonb_array_length(v_expenses))),
    jsonb_array_length(v_invoices) + jsonb_array_length(v_receipts), 'zip');
  return jsonb_build_object('month', p_month, 'isPartial', p_today <= v_to, 'amounts', v_amounts, 'pdfs', v_amounts,
                            'invoices', v_invoices, 'receipts', v_receipts, 'expenses', v_expenses);
end;
$$;

-- ───────────── RPC της εφαρμογής ─────────────

create function public.report_expenses_by_category(p_period text default null) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.report_expenses_by_category(p_period, public.sales_today()); $$;

create function public.report_profit(p_period text default null) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.report_profit(p_period, public.sales_today()); $$;

create function public.report_payment_methods(p_period text default null) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.report_payment_methods(p_period, public.sales_today()); $$;

create function public.report_productions(p_period text default null) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.report_productions(p_period, public.sales_today()); $$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.expense_lines(date, date), authz.can_see_expenses(), authz.report_require_cost(boolean),
  authz.report_expenses_by_category(text, date), authz.report_profit(text, date),
  authz.report_payment_methods(text, date), authz.report_productions(text, date),
  authz.export_report(text, text, jsonb, text, text), authz.export_accountant_pack(text, date)
  from public, anon, authenticated;

revoke all on function
  public.report_expenses_by_category(text), public.report_profit(text), public.report_payment_methods(text),
  public.report_productions(text)
  from public, anon, authenticated;

grant execute on function
  public.report_expenses_by_category(text), public.report_profit(text), public.report_payment_methods(text),
  public.report_productions(text)
  to authenticated;
