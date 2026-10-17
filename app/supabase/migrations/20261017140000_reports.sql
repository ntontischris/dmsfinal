-- Αναφορές Ρα (#198): το θεμέλιο της M1 (Περίοδοι) και οι τρεις οικονομικές Αναφορές.
-- Κεφ. 2 «Αναφορές: λεπτομέρειες κανόνων», Δέσμη Ρ (Ρ1–Ρ3).
--
-- Αρχές:
--  • Καμία νέα αποθήκευση: οι Αναφορές μόνο διαβάζουν. Κάθε Αναφορά = ένα public.report_* RPC (security definer,
--    search_path = ''), που ελέγχει το Δικαίωμα ΠΡΩΤΟ. Τα Ρβ/Ργ/Ρδ προσθέτουν δικά τους RPC· δεν αγγίζουν αυτό το αρχείο
--    και ξαναχρησιμοποιούν τις Περιόδους (authz.report_period, authz.report_period_json).
--  • Οικονομικές Αναφορές: «Βλέπει Αναφορές» (οποιοδήποτε Εύρος) + «Βλέπει Οικονομικά» (υπάρχει μόνο με Εύρος «όλα»,
--    άρα καμία γραμμή δεν κόβεται). Αλλιώς 42501, χωρίς oracle ύπαρξης. Χωρίς «Βλέπει ποσά» με Εύρος «όλα» (όπως η I2 και η
--    Καρτέλα) τα ποσά είναι null και μένουν τα πλήθη· η σειρά των γραμμών τότε είναι αλφαβητική, για να μη μαρτυρά ποσά.
--  • Μία πηγή για τα νούμερα (Ρ2): Τιμολόγια = οι γραμμές του authz.invoice_standings (μη ακυρωμένα)· Τζίρος = καθαρό
--    Τιμολογίων − καθαρό πιστωτικών κατά ημερομηνία έκδοσης (ο ίδιος τύπος με το turnoverMonth της invoices_view)·
--    Εισπράξεις = μη διαγραμμένες, με ΦΠΑ, κατά ημερομηνία είσπραξης· ανεξόφλητο = remaining του authz.invoice_standings.
--    Τζίρος και Εισπράξεις δεν προστίθενται ούτε αφαιρούνται πουθενά.
--  • Περίοδοι (Ρ3): πέντε σταθερές, σε ώρα Ελλάδας (public.sales_today). Οι Αναφορές μετρούν ΟΛΗ την Περίοδο (from..to),
--    όπως το turnoverMonth της I2 μετρά όλο τον μήνα: Τιμολόγιο ή Είσπραξη με μελλοντική ημερομηνία μέσα στην Περίοδο
--    μετρά. Το through (min(to, σήμερα)) και το isPartial υπάρχουν μόνο για την ετικέτα «ως σήμερα». Οι γραμμές μηνών
--    φτάνουν ως τον τρέχοντα μήνα ή ως τον τελευταίο μήνα με κίνηση (ό,τι είναι αργότερα), άρα αθροίζονται στα σύνολα.
--    Το p_today των authz.* υπάρχει για τα τεστ με σταθερές ημερομηνίες.

-- ───────────── Περίοδοι ─────────────

-- Οι πέντε Περίοδοι για τη μέρα p_today. through = min(to, p_today)· isPartial = η Περίοδος περιέχει το σήμερα.
create function authz.report_periods(p_today date)
returns table (code text, label text, from_date date, to_date date, through date, is_partial boolean, sort integer)
language sql stable set search_path = ''
as $$
  with d as (
    select date_trunc('month', p_today)::date as m,
           date_trunc('quarter', p_today)::date as q,
           date_trunc('year', p_today)::date as y
  ), spans (code, label, from_date, to_date, sort) as (
    select 'this-month', 'Αυτός ο μήνας', d.m, (d.m + interval '1 month - 1 day')::date, 1 from d
    union all
    select 'last-month', 'Προηγούμενος μήνας', (d.m - interval '1 month')::date, d.m - 1, 2 from d
    union all
    select 'this-quarter', 'Αυτό το τρίμηνο', d.q, (d.q + interval '3 months - 1 day')::date, 3 from d
    union all
    select 'this-year', 'Φέτος', d.y, (d.y + interval '1 year - 1 day')::date, 4 from d
    union all
    select 'last-year', 'Πέρυσι', (d.y - interval '1 year')::date, d.y - 1, 5 from d
  )
  select s.code, s.label, s.from_date, s.to_date, least(s.to_date, p_today),
         p_today between s.from_date and s.to_date, s.sort
    from spans s;
$$;

-- Μία Περίοδος από τον κωδικό της (null = «Φέτος», η προεπιλογή). Άγνωστος κωδικός → P0001.
create function authz.report_period(p_code text, p_today date)
returns table (code text, label text, from_date date, to_date date, through date, is_partial boolean)
language plpgsql stable set search_path = ''
as $$
begin
  return query
    select p.code, p.label, p.from_date, p.to_date, p.through, p.is_partial
      from authz.report_periods(p_today) p
     where p.code = coalesce(p_code, 'this-year');
  if not found then
    raise exception 'Άγνωστη Περίοδος' using errcode = 'P0001';
  end if;
end;
$$;

-- { code, label, from, to, through, isPartial }
create function authz.report_period_json(p_code text, p_today date) returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object('code', p.code, 'label', p.label, 'from', p.from_date, 'to', p.to_date,
                            'through', p.through, 'isPartial', p.is_partial)
    from authz.report_period(p_code, p_today) p;
$$;

-- ───────────── Πρόσβαση ─────────────

-- Οικονομική Αναφορά: «Βλέπει Αναφορές» + «Βλέπει Οικονομικά», αλλιώς 42501. Επιστρέφει αν φαίνονται τα ποσά.
create function authz.report_finance_amounts() returns boolean
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (authz.has('reports.view') and authz.has('finance.view')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.scope('finance.amounts') is not distinct from 'all';
end;
$$;

-- ───────────── Πηγές (ίδιες με την I2, την I4 και την Καρτέλα) ─────────────

-- Τα μη ακυρωμένα Τιμολόγια με το προσημασμένο καθαρό τους (πιστωτικό = −καθαρό), από το authz.invoice_standings.
create function authz.report_invoices(p_today date)
returns table (invoice_id uuid, client_id uuid, kind text, issue_date date, due_date date, signed_net numeric,
               remaining numeric, status text)
language sql stable security definer set search_path = ''
as $$
  select i.id, i.client_id, i.kind, i.issue_date, i.due_date,
         case when i.kind = 'credit' then -i.net else i.net end, s.remaining, s.status
    from authz.invoice_standings(null, p_today) s
    join public.invoices i on i.id = s.invoice_id;
$$;

-- Οι μη διαγραμμένες Εισπράξεις (με ΦΠΑ).
create function authz.report_receipts()
returns table (receipt_id uuid, client_id uuid, received_on date, amount numeric)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.client_id, r.received_on, r.amount from public.receipts r where r.deleted_at is null;
$$;

-- ───────────── Τζίρος και Εισπράξεις ανά μήνα ─────────────

-- { period, amounts, client: { id, name } | null, clients: [{ id, name }],
--   months: [{ month: 'YYYY-MM', turnover, invoiceCount, creditCount, collections, receiptCount, isPartial }],
--   totals: { turnover, invoiceCount, creditCount, collections, receiptCount } }
-- turnover/collections null χωρίς «Βλέπει ποσά». clients = όσοι έχουν Τιμολόγιο ή Είσπραξη (για το φίλτρο Πελάτη)·
-- client = ο Πελάτης του φίλτρου μόνο αν είναι σε αυτή τη λίστα, αλλιώς null.
create function authz.report_turnover_monthly(p_period text, p_client uuid, p_today date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_amounts boolean := authz.report_finance_amounts();
  v_from date;
  v_to date;
  v_through date;
begin
  select p.from_date, p.to_date, p.through into v_from, v_to, v_through from authz.report_period(p_period, p_today) p;
  return (
    with inv as (
      select i.* from authz.report_invoices(p_today) i
       where i.issue_date between v_from and v_to and (p_client is null or i.client_id = p_client)
    ), rec as (
      select r.* from authz.report_receipts() r
       where r.received_on between v_from and v_to and (p_client is null or r.client_id = p_client)
    ), last_day as (
      select greatest(v_through, (select max(i.issue_date) from inv i), (select max(r.received_on) from rec r)) as d
    ), months as (
      select g::date as m
        from last_day l,
             generate_series(date_trunc('month', v_from), date_trunc('month', l.d), interval '1 month') g
    ), shown_clients as (
      select c.id, c.name
        from public.clients c
       where exists (select 1 from public.invoices i where i.client_id = c.id and i.voided_at is null)
          or exists (select 1 from public.receipts r where r.client_id = c.id and r.deleted_at is null)
    ), lines as (
      select m.m,
             (select coalesce(sum(i.signed_net), 0) from inv i where date_trunc('month', i.issue_date) = m.m) as turnover,
             (select count(*) from inv i where i.kind <> 'credit' and date_trunc('month', i.issue_date) = m.m) as invoice_count,
             (select count(*) from inv i where i.kind = 'credit' and date_trunc('month', i.issue_date) = m.m) as credit_count,
             (select coalesce(sum(r.amount), 0) from rec r where date_trunc('month', r.received_on) = m.m) as collections,
             (select count(*) from rec r where date_trunc('month', r.received_on) = m.m) as receipt_count
        from months m
    )
    select jsonb_build_object(
      'period', authz.report_period_json(p_period, p_today),
      'amounts', v_amounts,
      'client', (select jsonb_build_object('id', c.id, 'name', c.name) from shown_clients c where c.id = p_client),
      'clients', coalesce((
        select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name, c.id) from shown_clients c
      ), '[]'::jsonb),
      'months', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'month', to_char(l.m, 'YYYY-MM'),
                 'turnover', case when v_amounts then l.turnover end,
                 'invoiceCount', l.invoice_count, 'creditCount', l.credit_count,
                 'collections', case when v_amounts then l.collections end,
                 'receiptCount', l.receipt_count,
                 'isPartial', l.m = date_trunc('month', p_today)::date
               ) order by l.m)
          from lines l
      ), '[]'::jsonb),
      'totals', jsonb_build_object(
        'turnover', case when v_amounts then (select coalesce(sum(i.signed_net), 0) from inv i) end,
        'invoiceCount', (select count(*) from inv i where i.kind <> 'credit'),
        'creditCount', (select count(*) from inv i where i.kind = 'credit'),
        'collections', case when v_amounts then (select coalesce(sum(r.amount), 0) from rec r) end,
        'receiptCount', (select count(*) from rec r)
      )
    )
  );
end;
$$;

-- ───────────── Τζίρος ανά Πελάτη ─────────────

-- { period, amounts, rows: [{ clientId, clientName, turnover, share, invoiceCount, creditCount }],
--   totals: { turnover, invoiceCount, creditCount } }
-- share = Τζίρος Πελάτη / Τζίρος περιόδου, 4 δεκαδικά (null αν ο Τζίρος περιόδου δεν είναι θετικός).
-- Με ποσά: μεγαλύτερος Τζίρος πρώτα· χωρίς ποσά: αλφαβητικά.
create function authz.report_turnover_by_client(p_period text, p_today date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_amounts boolean := authz.report_finance_amounts();
  v_from date;
  v_to date;
begin
  select p.from_date, p.to_date into v_from, v_to from authz.report_period(p_period, p_today) p;
  return (
    with inv as (
      select i.* from authz.report_invoices(p_today) i where i.issue_date between v_from and v_to
    ), per as (
      select i.client_id, sum(i.signed_net) as turnover,
             count(*) filter (where i.kind <> 'credit') as invoice_count,
             count(*) filter (where i.kind = 'credit') as credit_count
        from inv i group by i.client_id
    ), grand as (
      select coalesce(sum(p.turnover), 0) as turnover from per p
    )
    select jsonb_build_object(
      'period', authz.report_period_json(p_period, p_today),
      'amounts', v_amounts,
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'clientId', p.client_id, 'clientName', c.name,
                 'turnover', case when v_amounts then p.turnover end,
                 'share', case when v_amounts and g.turnover > 0 then round(p.turnover / g.turnover, 4) end,
                 'invoiceCount', p.invoice_count, 'creditCount', p.credit_count
               ) order by case when v_amounts then p.turnover end desc nulls last, c.name, p.client_id)
          from per p
          join public.clients c on c.id = p.client_id
          cross join grand g
      ), '[]'::jsonb),
      'totals', jsonb_build_object(
        'turnover', case when v_amounts then (select g.turnover from grand g) end,
        'invoiceCount', (select count(*) from inv i where i.kind <> 'credit'),
        'creditCount', (select count(*) from inv i where i.kind = 'credit')
      )
    )
  );
end;
$$;

-- ───────────── Οφειλές κατά ηλικία ─────────────

-- Κουτί από τη λήξη: 0 δεν έχει λήξει (ή χωρίς λήξη), 1 1–30, 2 31–60, 3 61–90, 4 πάνω από 90 μέρες.
-- Ίδιο όριο με το «ληξιπρόθεσμο» της authz.invoice_standings (λήξη πριν από σήμερα).
create function authz.report_aging_bucket(p_due date, p_today date) returns integer
language sql immutable set search_path = ''
as $$
  select case
    when p_due is null or p_due >= p_today then 0
    when p_today - p_due <= 30 then 1
    when p_today - p_due <= 60 then 2
    when p_today - p_due <= 90 then 3
    else 4
  end;
$$;

-- [5 ποσά] ή [5 πλήθη] ανά κουτί, από γραμμές (κουτί, ποσό).
create function authz.report_bucket_sums(p_buckets integer[], p_amounts numeric[]) returns jsonb
language sql immutable set search_path = ''
as $$
  select jsonb_agg(coalesce((select sum(x.a) from unnest(p_buckets, p_amounts) x (b, a) where x.b = k), 0) order by k)
    from generate_series(0, 4) k;
$$;

-- { today, amounts,
--   rows: [{ clientId, clientName, buckets: [5 ποσά], counts: [5 πλήθη], total, invoiceCount, oldestDue }],
--   totals: { buckets: [5], counts: [5], total, overdue, invoiceCount } }
-- Μόνο Τιμολόγια με ανεξόφλητο > 0· το «υπόλοιπο υπέρ του πελάτη» δεν μετρά. oldestDue = η παλαιότερη λήξη που πέρασε.
-- Ποσά (buckets: [null ×5], total, overdue) null χωρίς «Βλέπει ποσά». Με ποσά: μεγαλύτερο σύνολο πρώτα· χωρίς: αλφαβητικά.
create function authz.report_receivables_aging(p_today date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_amounts boolean := authz.report_finance_amounts();
  v_nulls constant jsonb := '[null, null, null, null, null]';
begin
  return (
    with open_inv as (
      select i.client_id, i.due_date, i.remaining, authz.report_aging_bucket(i.due_date, p_today) as b
        from authz.report_invoices(p_today) i
       where i.kind <> 'credit' and i.remaining > 0
    ), per as (
      select o.client_id,
             authz.report_bucket_sums(array_agg(o.b), array_agg(o.remaining)) as amounts,
             authz.report_bucket_sums(array_agg(o.b), array_agg(1::numeric)) as counts,
             sum(o.remaining) as total, count(*) as invoice_count,
             min(o.due_date) filter (where o.b > 0) as oldest_due
        from open_inv o group by o.client_id
    )
    select jsonb_build_object(
      'today', p_today,
      'amounts', v_amounts,
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'clientId', p.client_id, 'clientName', c.name,
                 'buckets', case when v_amounts then p.amounts else v_nulls end,
                 'counts', p.counts,
                 'total', case when v_amounts then p.total end,
                 'invoiceCount', p.invoice_count, 'oldestDue', p.oldest_due
               ) order by case when v_amounts then p.total end desc nulls last, c.name, p.client_id)
          from per p
          join public.clients c on c.id = p.client_id
      ), '[]'::jsonb),
      'totals', jsonb_build_object(
        'buckets', case when v_amounts then (
          select authz.report_bucket_sums(coalesce(array_agg(o.b), '{}'), coalesce(array_agg(o.remaining), '{}'))
            from open_inv o) else v_nulls end,
        'counts', (select authz.report_bucket_sums(coalesce(array_agg(o.b), '{}'), coalesce(array_agg(1::numeric), '{}'))
                     from open_inv o),
        'total', case when v_amounts then (select coalesce(sum(o.remaining), 0) from open_inv o) end,
        'overdue', case when v_amounts then (select coalesce(sum(o.remaining), 0) from open_inv o where o.b > 0) end,
        'invoiceCount', (select count(*) from open_inv o)
      )
    )
  );
end;
$$;

-- ───────────── RPC της εφαρμογής (σήμερα = ώρα Ελλάδας) ─────────────

-- { today, default: 'this-year', items: [{ code, label, from, to, through, isPartial }] }. Θέλει «Βλέπει Αναφορές».
create function public.report_periods() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := public.sales_today();
begin
  perform authz.require('reports.view');
  return jsonb_build_object(
    'today', v_today,
    'default', 'this-year',
    'items', (select jsonb_agg(jsonb_build_object('code', p.code, 'label', p.label, 'from', p.from_date, 'to', p.to_date,
                                                  'through', p.through, 'isPartial', p.is_partial) order by p.sort)
                from authz.report_periods(v_today) p)
  );
end;
$$;

create function public.report_turnover_monthly(p_period text default null, p_client uuid default null) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.report_turnover_monthly(p_period, p_client, public.sales_today()); $$;

create function public.report_turnover_by_client(p_period text default null) returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.report_turnover_by_client(p_period, public.sales_today()); $$;

create function public.report_receivables_aging() returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.report_receivables_aging(public.sales_today()); $$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.report_periods(date), authz.report_period(text, date), authz.report_period_json(text, date),
  authz.report_finance_amounts(), authz.report_invoices(date), authz.report_receipts(),
  authz.report_turnover_monthly(text, uuid, date), authz.report_turnover_by_client(text, date),
  authz.report_aging_bucket(date, date), authz.report_bucket_sums(integer[], numeric[]),
  authz.report_receivables_aging(date)
  from public, anon, authenticated;

revoke all on function
  public.report_periods(), public.report_turnover_monthly(text, uuid), public.report_turnover_by_client(text),
  public.report_receivables_aging()
  from public, anon, authenticated;

grant execute on function
  public.report_periods(), public.report_turnover_monthly(text, uuid), public.report_turnover_by_client(text),
  public.report_receivables_aging()
  to authenticated;
