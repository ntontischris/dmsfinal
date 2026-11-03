-- Έξοδα του μήνα αναλυτικά (I6) και Κερδοφορία (I7). Κεφ. 3 (κόστος), ADR 0015, 0017.
--
-- Αρχές:
--  • Τα έξοδα ενός μήνα μπορούν να γραφτούν αναλυτικά: κατηγορίες → έξοδα → γραμμές (περιγραφή, ποσό), στη στήλη
--    public.cost_months.expense_categories. Όταν ο μήνας έχει ανάλυση, το expenses_total είναι πάντα το άθροισμα των γραμμών
--    (το γράφει η ίδια συνάρτηση, μαζί). Μήνας χωρίς ανάλυση κρατά το ένα σύνολό του, όπως πριν.
--  • Το Κόστος ώρας μένει expenses_total ÷ productive_hours (η υπάρχουσα generated στήλη): κάθε καταναλωτής (εκτιμήσεις,
--    G3, κόστος Συμφωνίας) δουλεύει όπως πριν, χωρίς αλλαγή.
--  • Η αποθήκευση αντικαθιστά όλη την ανάλυση του μήνα σε μία εγγραφή (μία γραμμή του cost_months), άρα ατομικά, και
--    γράφει το Ίχνος με τα υπάρχοντα triggers του cost_months. Ο κλεισμένος μήνας δεν αλλάζει (authz.guard_cost_month).
--  • Δικαιώματα: όπως το Κόστος ώρας σήμερα. «Βλέπει κόστος και κερδοφορία» (finance.cost) διαβάζει, «Διαχειρίζεται
--    κόστος» (authz.can_manage_cost) γράφει. Κανένα νέο Δικαίωμα.
--  • Κερδοφορία: μόνο ανάγνωση, μία γραμμή ανά Παραγωγή (όχι ακυρωμένη) με Πελάτη, μήνα κόστους, τιμή και πραγματικό
--    κόστος, από τον ίδιο ορισμό με τη G3 (authz.production_cost_row).

-- ───────────── Στήλη ─────────────

alter table public.cost_months
  add column expense_categories jsonb check (expense_categories is null or jsonb_typeof(expense_categories) = 'array');

-- ───────────── Βοηθητικές ─────────────

-- Ένα όνομα της ανάλυσης: κείμενο, όχι κενό, έως 200 χαρακτήρες.
create function authz.expense_text(p_value jsonb) returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v_text text;
begin
  if p_value is null or jsonb_typeof(p_value) <> 'string' then
    raise exception 'Κάθε κατηγορία, έξοδο και γραμμή θέλει όνομα' using errcode = 'P0001';
  end if;
  v_text := trim(p_value #>> '{}');
  if v_text = '' or length(v_text) > 200 then
    raise exception 'Κάθε κατηγορία, έξοδο και γραμμή θέλει όνομα έως 200 χαρακτήρες' using errcode = 'P0001';
  end if;
  return v_text;
end;
$$;

-- Η ανάλυση όπως θα γραφτεί: ελέγχει το σχήμα και τα ποσά, κρατά μόνο τα γνωστά πεδία (name, items, label, amount).
create function authz.normalize_expense_categories(p_categories jsonb) returns jsonb
language plpgsql immutable set search_path = ''
as $$
declare
  v_cat jsonb;
  v_item jsonb;
  v_line jsonb;
  v_items jsonb;
  v_lines jsonb;
  v_out jsonb := '[]'::jsonb;
  v_amount numeric;
  v_count integer := 0;
begin
  if p_categories is null or jsonb_typeof(p_categories) <> 'array' then
    raise exception 'Τα έξοδα δεν είναι έγκυρα' using errcode = 'P0001';
  end if;
  for v_cat in select e.value from jsonb_array_elements(p_categories) e loop
    if jsonb_typeof(v_cat) <> 'object' or jsonb_typeof(coalesce(v_cat -> 'items', '[]'::jsonb)) <> 'array' then
      raise exception 'Τα έξοδα δεν είναι έγκυρα' using errcode = 'P0001';
    end if;
    v_items := '[]'::jsonb;
    for v_item in select e.value from jsonb_array_elements(coalesce(v_cat -> 'items', '[]'::jsonb)) e loop
      if jsonb_typeof(v_item) <> 'object' or jsonb_typeof(coalesce(v_item -> 'lines', '[]'::jsonb)) <> 'array' then
        raise exception 'Τα έξοδα δεν είναι έγκυρα' using errcode = 'P0001';
      end if;
      v_lines := '[]'::jsonb;
      for v_line in select e.value from jsonb_array_elements(coalesce(v_item -> 'lines', '[]'::jsonb)) e loop
        if jsonb_typeof(v_line) <> 'object' or jsonb_typeof(v_line -> 'amount') is distinct from 'number' then
          raise exception 'Κάθε γραμμή θέλει ποσό' using errcode = 'P0001';
        end if;
        v_amount := round((v_line ->> 'amount')::numeric, 2);
        if v_amount < 0 or v_amount >= 10000000 then
          raise exception 'Το ποσό μιας γραμμής είναι από 0 έως 9.999.999,99 €' using errcode = 'P0001';
        end if;
        v_count := v_count + 1;
        v_lines := v_lines || jsonb_build_array(jsonb_build_object('label', authz.expense_text(v_line -> 'label'), 'amount', v_amount));
      end loop;
      v_items := v_items || jsonb_build_array(jsonb_build_object('name', authz.expense_text(v_item -> 'name'), 'lines', v_lines));
    end loop;
    v_out := v_out || jsonb_build_array(jsonb_build_object('name', authz.expense_text(v_cat -> 'name'), 'items', v_items));
  end loop;
  if v_count > 1000 then
    raise exception 'Έως 1.000 γραμμές εξόδων ανά μήνα' using errcode = 'P0001';
  end if;
  return v_out;
end;
$$;

-- Το άθροισμα όλων των γραμμών μιας ανάλυσης (ήδη ελεγμένης).
create function authz.expense_categories_total(p_categories jsonb) returns numeric
language sql immutable set search_path = ''
as $$
  select coalesce(sum((l.value ->> 'amount')::numeric), 0)
    from jsonb_array_elements(p_categories) c
   cross join lateral jsonb_array_elements(c.value -> 'items') i
   cross join lateral jsonb_array_elements(i.value -> 'lines') l;
$$;

-- ───────────── Ανάγνωση: Έξοδα ενός μήνα (I6) ─────────────

-- Ο μήνας όπως είναι γραμμένος (ή null), ο πιο πρόσφατος προηγούμενος μήνας (για αντίγραφο) και αν αλλάζει από τον Χρήστη.
create function public.cost_expenses_view(p_month date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_month date;
begin
  perform authz.require('finance.cost');
  if p_month is null then
    raise exception 'Διάλεξε μήνα' using errcode = 'P0001';
  end if;
  v_month := date_trunc('month', p_month)::date;
  return jsonb_build_object(
    'month', v_month,
    'isClosed', v_month < authz.athens_month_start(),
    'canEdit', coalesce(authz.can_manage_cost(), false) and v_month >= authz.athens_month_start(),
    'saved', (
      select jsonb_build_object('expensesTotal', m.expenses_total, 'productiveHours', m.productive_hours,
                                'hourCost', m.hour_cost, 'categories', m.expense_categories)
        from public.cost_months m where m.month = v_month),
    'previous', (
      select jsonb_build_object('month', m.month, 'productiveHours', m.productive_hours, 'categories', m.expense_categories)
        from public.cost_months m where m.month < v_month order by m.month desc limit 1)
  );
end;
$$;

-- ───────────── Εγγραφή: Έξοδα ενός μήνα (I6) ─────────────

-- Αντικαθιστά όλη την ανάλυση του μήνα και τις παραγωγικές ώρες· το σύνολο εξόδων γίνεται το άθροισμα των γραμμών.
-- Κενή ανάλυση = ο μήνας γυρίζει στο ένα σύνολο που είχε (το σύνολο δεν αλλάζει). Μόνο ο τρέχων μήνας και οι επόμενοι.
create function public.cost_save_expenses(p_month date, p_categories jsonb, p_productive_hours numeric) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_month date;
  v_categories jsonb;
  v_total numeric;
begin
  if not authz.can_manage_cost() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_month is null then
    raise exception 'Διάλεξε μήνα' using errcode = 'P0001';
  end if;
  if p_productive_hours is null or p_productive_hours <= 0 or p_productive_hours > 10000 then
    raise exception 'Οι παραγωγικές ώρες είναι πάνω από 0 και έως 10.000' using errcode = 'P0001';
  end if;
  v_month := date_trunc('month', p_month)::date;
  if v_month < authz.athens_month_start() then
    raise exception 'Ο μήνας έχει κλείσει· τα έξοδά του δεν αλλάζουν' using errcode = 'P0001';
  end if;
  v_categories := authz.normalize_expense_categories(p_categories);

  if jsonb_array_length(v_categories) = 0 then
    if not exists (select 1 from public.cost_months m where m.month = v_month) then
      raise exception 'Πρόσθεσε τουλάχιστον ένα έξοδο' using errcode = 'P0001';
    end if;
    update public.cost_months m
       set expense_categories = null, productive_hours = p_productive_hours
     where m.month = v_month
       and (m.expense_categories, m.productive_hours) is distinct from (null::jsonb, p_productive_hours);
    return;
  end if;

  v_total := authz.expense_categories_total(v_categories);
  if v_total >= 100000000 then
    raise exception 'Το σύνολο εξόδων του μήνα είναι κάτω από 100.000.000 €' using errcode = 'P0001';
  end if;
  insert into public.cost_months (month, expenses_total, productive_hours, expense_categories)
  values (v_month, v_total, p_productive_hours, v_categories)
  on conflict (month) do update
    set expenses_total = excluded.expenses_total, productive_hours = excluded.productive_hours,
        expense_categories = excluded.expense_categories
    -- Ίδιες τιμές: καμία εγγραφή, άρα ούτε «τελευταία αλλαγή» ούτε γραμμή στο Ίχνος.
    where (public.cost_months.expenses_total, public.cost_months.productive_hours, public.cost_months.expense_categories)
          is distinct from (excluded.expenses_total, excluded.productive_hours, excluded.expense_categories);
end;
$$;

-- Ρυθμίσεις › Οικονομικά (O6): ίδια με πριν, με έναν κανόνα ακόμα. Μήνας με ανάλυση εξόδων δεν παίρνει άλλο σύνολο από εδώ
-- (το σύνολο βγαίνει από τις γραμμές)· οι παραγωγικές ώρες του αλλάζουν κανονικά.
create or replace function public.cost_save_month(p_month date, p_expenses_total numeric, p_productive_hours numeric) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_month date;
begin
  if not authz.can_manage_cost() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_month is null then
    raise exception 'Διάλεξε μήνα' using errcode = 'P0001';
  end if;
  if p_expenses_total is null or p_expenses_total < 0 or p_productive_hours is null or p_productive_hours <= 0 then
    raise exception 'Τα έξοδα δεν είναι αρνητικά και οι παραγωγικές ώρες είναι πάνω από 0' using errcode = 'P0001';
  end if;
  v_month := p_month - (extract(day from p_month)::integer - 1);
  if v_month < authz.athens_month_start() then
    raise exception 'Ο μήνας έχει κλείσει· το Κόστος ώρας του δεν αλλάζει' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.cost_months m
              where m.month = v_month and m.expense_categories is not null and m.expenses_total <> p_expenses_total) then
    raise exception 'Τα έξοδα αυτού του μήνα είναι αναλυτικά· άλλαξέ τα στα «Έξοδα και Κόστος ώρας»' using errcode = 'P0001';
  end if;
  insert into public.cost_months (month, expenses_total, productive_hours)
  values (v_month, p_expenses_total, p_productive_hours)
  on conflict (month) do update
    set expenses_total = excluded.expenses_total, productive_hours = excluded.productive_hours
    -- Ίδιες τιμές: καμία εγγραφή, άρα ούτε «τελευταία αλλαγή» ούτε γραμμή στο Ίχνος.
    where (public.cost_months.expenses_total, public.cost_months.productive_hours)
          is distinct from (excluded.expenses_total, excluded.productive_hours);
end;
$$;

-- ───────────── Ανάγνωση: Κερδοφορία (I7) ─────────────

-- Μία γραμμή ανά μη ακυρωμένη Παραγωγή με μήνα κόστους μέσα στο διάστημα (μήνες, άκρα μέσα). Τιμή, εκτίμηση, πραγματικό
-- κόστος και σήματα από τον ορισμό της G3· ο μήνας είναι αυτός του πραγματικού κόστους (authz.production_cost_month).
create function public.profitability_view(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_rows jsonb;
begin
  perform authz.require('finance.cost');
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Διάλεξε έγκυρο διάστημα μηνών' using errcode = 'P0001';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'productionId', r.id,
           'title', r.title,
           'clientId', r.client_id,
           'client', r.client_name,
           'month', r.month,
           'isInternal', r.client_id is null,
           'price', r.cost_row #> '{estimate,price}',
           'estimateCost', r.cost_row #> '{estimate,cost}',
           'actualCost', r.cost_row #> '{actual,cost}',
           'hoursComplete', r.cost_row -> 'hoursComplete',
           'overrun', r.cost_row #> '{signals,overrun}')
         order by r.month desc, r.title, r.id), '[]'::jsonb)
    into v_rows
    from (
      select p.id, p.title, p.client_id, cl.name as client_name,
             authz.production_cost_month(p.id) as month,
             authz.production_cost_row(p.id) as cost_row
        from public.productions p
        left join public.clients cl on cl.id = p.client_id
       where p.state <> 'cancelled'
    ) r
   where r.cost_row is not null
     and r.month between date_trunc('month', p_from)::date and date_trunc('month', p_to)::date;
  return v_rows;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.expense_text(jsonb), authz.normalize_expense_categories(jsonb), authz.expense_categories_total(jsonb),
  public.cost_expenses_view(date), public.cost_save_expenses(date, jsonb, numeric), public.profitability_view(date, date)
  from public, anon, authenticated;

grant execute on function
  public.cost_expenses_view(date), public.cost_save_expenses(date, jsonb, numeric), public.profitability_view(date, date)
  to authenticated;
