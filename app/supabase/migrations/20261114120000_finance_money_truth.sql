-- Οικονομικά «λένε την αλήθεια» (L3, PR1): παρακράτηση φόρου (d6), Είσπραξη δεμένη σε Τιμολόγια (d4), σελίδα
-- Τιμολογίου με τις πληρωμές του (d3), η υπενθύμιση Τιμολογητέου μόνο όταν στάλθηκε (d1), και η Καρτέλα των δικών
-- του Πελατών για όποιον «Βλέπει ποσά» με Εύρος «δικά μου» (d11).
--
-- Αρχές:
--  • Παρακράτηση: ένα ποσό που κρατά ο Πελάτης για την εφορία και δεν φτάνει ποτέ ως μετρητά. Γράφεται πάνω στην
--    Είσπραξη (receipts.withheld) και ΚΛΕΙΝΕΙ Τιμολόγιο όπως τα μετρητά: εξοφλητική αξία = ποσό + παρακράτηση.
--    Οι «Εισπράξεις» (αναφορές, Σήμερα) μετρούν μόνο μετρητά· το υπόλοιπο της Καρτέλας αφαιρεί και την παρακράτηση.
--    Τα ποσοστά (π.χ. 20%) είναι λίστα που αλλάζει όποιος «Διαχειρίζεται Ρυθμίσεις», με απόσυρση χωρίς διαγραφή.
--  • Δέσιμο με Τιμολόγια: η Είσπραξη μπορεί να δείξει συγκεκριμένα Τιμολόγια του ίδιου Πελάτη (receipts.invoice_ids).
--    Τα δεμένα εξοφλούνται πρώτα, με σειρά έκδοσης· ό,τι περισσεύει, και κάθε Είσπραξη χωρίς δέσιμο, εξοφλεί τα
--    παλαιότερα ανοιχτά όπως πριν (ADR 0004). Χωρίς δέσιμο και χωρίς παρακράτηση το αποτέλεσμα είναι ΙΔΙΟ με πριν.
--  • Η κατανομή δεν αποθηκεύεται: authz.receipt_applications τη βγάζει κάθε φορά· η authz.invoice_standings
--    (ίδια υπογραφή) τη χρησιμοποιεί, άρα Τιμολόγια, Καρτέλα, Σήμερα και Αναφορές δείχνουν το ίδιο.
--  • Τα παλιά receipt_register / receipt_correct μένουν (ίδια συμπεριφορά)· η εφαρμογή γράφει με receipt_record / receipt_amend.

-- ───────────── Ποσοστά παρακράτησης ─────────────

create table public.withholding_rates (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(btrim(label)) between 1 and 60),
  percent numeric(5, 2) not null check (percent > 0 and percent < 100),
  sort integer not null default 0,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create unique index withholding_rates_label_active on public.withholding_rates (lower(label)) where retired_at is null;

alter table public.withholding_rates enable row level security;

insert into public.withholding_rates (label, percent, sort) values ('Παρακράτηση φόρου 20%', 20, 1);

-- ───────────── Εισπράξεις: παρακράτηση και δέσιμο ─────────────

alter table public.receipts
  add column withheld numeric(12, 2) not null default 0 check (withheld >= 0 and withheld < 10000000),
  add column withholding_rate_id uuid references public.withholding_rates (id),
  add column invoice_ids uuid[] not null default '{}' check (cardinality(invoice_ids) <= 20),
  add constraint receipts_withholding_rate_needs_amount check (withholding_rate_id is null or withheld > 0);

-- ───────────── Κατανομή ─────────────

-- Ποιο ποσό κάθε Είσπραξης πάει σε ποιο Τιμολόγιο. p_client null = όλοι.
-- 1) Δεμένα: κάθε Είσπραξη δίνει από την αξία της (ποσό + παρακράτηση) στα δικά της Τιμολόγια, με σειρά έκδοσης· αν
--    ένα Τιμολόγιο το έχει ήδη καλύψει παλαιότερη Είσπραξη, παίρνει μόνο ό,τι του λείπει.
-- 2) Υπόλοιπα: ό,τι περισσεύει από κάθε Είσπραξη (κατά ημερομηνία είσπραξης) εξοφλεί ό,τι λείπει από τα Τιμολόγια
--    (κατά ημερομηνία έκδοσης), παλαιότερο πρώτα: επικάλυψη διαστημάτων στις δύο «στοίβες».
create function authz.receipt_applications(p_client uuid)
returns table (receipt_id uuid, invoice_id uuid, client_id uuid, amount numeric)
language sql stable security definer set search_path = ''
as $$
  with inv as (
    select i.id, i.client_id, i.issue_date, i.created_at,
           greatest(i.total - coalesce((select sum(c.total) from public.invoices c
                                         where c.credit_for = i.id and c.voided_at is null), 0), 0) as owed
      from public.invoices i
     where i.voided_at is null and i.kind <> 'credit' and (p_client is null or i.client_id = p_client)
  ), rec as (
    select r.id, r.client_id, r.received_on, r.created_at, r.amount + r.withheld as value, r.invoice_ids
      from public.receipts r
     where r.deleted_at is null and (p_client is null or r.client_id = p_client)
  ), linked as (
    select r.id as rid, r.client_id, r.received_on, r.created_at as r_created, r.value, i.id as iid, i.owed,
           coalesce(sum(i.owed) over (
             partition by r.id order by i.issue_date, i.created_at, i.id
             rows between unbounded preceding and 1 preceding), 0) as before
      from rec r
      join inv i on i.id = any (r.invoice_ids) and i.client_id = r.client_id
  ), wanted as (
    select l.*, least(l.owed, greatest(l.value - l.before, 0)) as want
      from linked l
  ), direct as (
    select w.rid, w.iid, w.client_id,
           least(w.want, greatest(w.owed - coalesce(sum(w.want) over (
             partition by w.iid order by w.received_on, w.r_created, w.rid
             rows between unbounded preceding and 1 preceding), 0), 0)) as amt
      from wanted w
  ), inv_rest as (
    select i.id, i.client_id, i.issue_date, i.created_at,
           i.owed - coalesce((select sum(d.amt) from direct d where d.iid = i.id), 0) as rest
      from inv i
  ), inv_stack as (
    select x.id, x.client_id, x.rest,
           coalesce(sum(x.rest) over (
             partition by x.client_id order by x.issue_date, x.created_at, x.id
             rows between unbounded preceding and 1 preceding), 0) as b
      from inv_rest x
     where x.rest > 0
  ), rec_rest as (
    select r.id, r.client_id, r.received_on, r.created_at,
           r.value - coalesce((select sum(d.amt) from direct d where d.rid = r.id), 0) as rest
      from rec r
  ), rec_stack as (
    select x.id, x.client_id, x.rest,
           coalesce(sum(x.rest) over (
             partition by x.client_id order by x.received_on, x.created_at, x.id
             rows between unbounded preceding and 1 preceding), 0) as b
      from rec_rest x
     where x.rest > 0
  )
  select d.rid, d.iid, d.client_id, d.amt from direct d where d.amt > 0
  union all
  select rs.id, ist.id, rs.client_id, least(rs.b + rs.rest, ist.b + ist.rest) - greatest(rs.b, ist.b)
    from rec_stack rs
    join inv_stack ist on ist.client_id = rs.client_id
   where least(rs.b + rs.rest, ist.b + ist.rest) - greatest(rs.b, ist.b) > 0;
$$;

-- Ίδια υπογραφή και ίδιες καταστάσεις με το 20261013130000_invoices.sql· το «εξοφλημένο» έρχεται πλέον από την κατανομή.
create or replace function authz.invoice_standings(p_client uuid, p_today date default null)
returns table (invoice_id uuid, client_id uuid, owed numeric, paid numeric, remaining numeric, status text)
language sql stable security definer set search_path = ''
as $$
  with live as (
    select i.id, i.client_id, i.kind, i.due_date,
           case when i.kind = 'credit' then 0::numeric
                else greatest(
                  i.total - coalesce((select sum(c.total) from public.invoices c
                                       where c.credit_for = i.id and c.voided_at is null), 0), 0)
           end as owed
      from public.invoices i
     where i.voided_at is null and (p_client is null or i.client_id = p_client)
  ), paid as (
    select a.invoice_id, sum(a.amount) as paid
      from authz.receipt_applications(p_client) a
     group by a.invoice_id
  ), allocated as (
    select l.id, l.client_id, l.due_date, l.owed, least(l.owed, coalesce(p.paid, 0)) as paid
      from live l
      left join paid p on p.invoice_id = l.id
     where l.kind <> 'credit'
  )
  select a.id, a.client_id, a.owed, a.paid, a.owed - a.paid,
         case when a.paid >= a.owed then 'paid'
              when a.due_date < coalesce(p_today, public.sales_today()) then 'overdue'
              when a.paid > 0 then 'partial'
              else 'unpaid'
         end
    from allocated a
  union all
  select l.id, l.client_id, 0::numeric, 0::numeric, 0::numeric, 'credit'
    from live l
   where l.kind = 'credit';
$$;

-- ───────────── Βοηθητικές authz ─────────────

-- Η λίστα Τιμολογίων από το JSON (πίνακας από uuid), χωρίς διπλά, ταξινομημένη. Ό,τι δεν είναι πίνακας = κενό.
create function authz.receipt_invoice_ids(p jsonb) returns uuid[]
language sql immutable security definer set search_path = ''
as $$
  select coalesce(array_agg(distinct x.v::uuid order by x.v::uuid), '{}'::uuid[])
    from jsonb_array_elements_text(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) x (v);
$$;

-- Τα δεμένα Τιμολόγια: του ίδιου Πελάτη, όχι πιστωτικά, όχι ακυρωμένα, έως 20.
create function authz.receipt_check_invoices(p_client uuid, p_ids uuid[]) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if cardinality(p_ids) > 20 then
    raise exception 'Μια Είσπραξη δένεται με έως 20 Τιμολόγια' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from unnest(p_ids) x (id)
     where not exists (select 1 from public.invoices i
                        where i.id = x.id and i.client_id = p_client and i.kind <> 'credit' and i.voided_at is null)
  ) then
    raise exception 'Ένα από τα Τιμολόγια δεν ανήκει στον Πελάτη ή έχει ακυρωθεί' using errcode = 'P0001';
  end if;
end;
$$;

-- Παρακράτηση: ποσό ≥ 0· ποσοστό μόνο μαζί με ποσό· ενεργό ποσοστό όταν αλλάζει (p_check_active).
create function authz.receipt_check_withholding(p_withheld numeric, p_rate uuid, p_check_active boolean) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_withheld is null or p_withheld < 0 or p_withheld >= 10000000 then
    raise exception 'Γράψε την παρακράτηση από 0 € και κάτω από 10.000.000 €' using errcode = 'P0001';
  end if;
  if p_rate is not null and p_withheld = 0 then
    raise exception 'Γράψε το ποσό της παρακράτησης' using errcode = 'P0001';
  end if;
  if p_rate is not null and not exists (
    select 1 from public.withholding_rates w
     where w.id = p_rate and (not p_check_active or w.retired_at is null)
  ) then
    raise exception 'Το ποσοστό παρακράτησης δεν βρέθηκε ή έχει αποσυρθεί' using errcode = 'P0001';
  end if;
end;
$$;

-- ───────────── Ποσοστά: RPC ─────────────

create function public.withholding_rates_view() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if not (authz.has('finance.view') or authz.has('finance.receipts') or authz.has('settings.manage')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', w.id, 'label', w.label, 'percent', w.percent, 'retired', w.retired_at is not null)
                     order by w.retired_at is not null, w.sort, w.label)
      from public.withholding_rates w
  ), '[]'::jsonb);
end;
$$;

-- Προσθήκη (p_id null) ή αλλαγή. Οι παλιές Εισπράξεις κρατούν το ποσό τους· η αλλαγή ποσοστού αλλάζει μόνο την πρόταση.
create function public.withholding_rate_save(p_id uuid, p_label text, p_percent numeric) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_label text := btrim(coalesce(p_label, ''));
  v_id uuid;
begin
  perform authz.require('settings.manage');
  if char_length(v_label) not between 1 and 60 then
    raise exception 'Γράψε ονομασία από 1 έως 60 χαρακτήρες' using errcode = 'P0001';
  end if;
  if p_percent is null or p_percent <= 0 or p_percent >= 100 or p_percent <> round(p_percent, 2) then
    raise exception 'Γράψε ποσοστό πάνω από 0 και κάτω από 100 (έως 2 δεκαδικά)' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.withholding_rates w
     where lower(w.label) = lower(v_label) and w.retired_at is null and w.id is distinct from p_id
  ) then
    raise exception 'Υπάρχει ήδη ενεργό ποσοστό με αυτή την ονομασία' using errcode = 'P0001';
  end if;
  if p_id is null then
    insert into public.withholding_rates (label, percent, sort, updated_by)
    values (v_label, p_percent, (select coalesce(max(w.sort), 0) + 1 from public.withholding_rates w), auth.uid())
    returning id into v_id;
    return v_id;
  end if;
  update public.withholding_rates w
     set label = v_label, percent = p_percent, updated_at = now(), updated_by = auth.uid()
   where w.id = p_id
  returning w.id into v_id;
  if v_id is null then
    raise exception 'Το ποσοστό δεν βρέθηκε' using errcode = 'P0001';
  end if;
  return v_id;
end;
$$;

create function public.withholding_rate_retire(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('settings.manage');
  update public.withholding_rates w
     set retired_at = now(), updated_at = now(), updated_by = auth.uid()
   where w.id = p_id and w.retired_at is null;
  if not found then
    raise exception 'Το ποσοστό δεν βρέθηκε ή είναι ήδη αποσυρμένο' using errcode = 'P0001';
  end if;
end;
$$;

create function public.withholding_rate_restore(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_label text;
begin
  perform authz.require('settings.manage');
  select w.label into v_label from public.withholding_rates w where w.id = p_id and w.retired_at is not null;
  if not found then
    raise exception 'Το ποσοστό δεν βρέθηκε ή είναι ενεργό' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.withholding_rates w
     where lower(w.label) = lower(v_label) and w.retired_at is null and w.id <> p_id
  ) then
    raise exception 'Υπάρχει ήδη ενεργό ποσοστό με αυτή την ονομασία' using errcode = 'P0001';
  end if;
  update public.withholding_rates w
     set retired_at = null, updated_at = now(), updated_by = auth.uid()
   where w.id = p_id;
end;
$$;

-- ───────────── Εισπράξεις: RPC ─────────────

-- p = { clientId, receivedOn, amount, methodId, note, withheld?, withholdingId?, invoiceIds? }
create function public.receipt_record(p jsonb) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid := nullif(p ->> 'clientId', '')::uuid;
  v_on date := nullif(p ->> 'receivedOn', '')::date;
  v_amount numeric := nullif(p ->> 'amount', '')::numeric;
  v_method uuid := nullif(p ->> 'methodId', '')::uuid;
  v_note text := btrim(coalesce(p ->> 'note', ''));
  v_withheld numeric := coalesce(nullif(p ->> 'withheld', '')::numeric, 0);
  v_rate uuid := nullif(p ->> 'withholdingId', '')::uuid;
  v_invoices uuid[] := authz.receipt_invoice_ids(p -> 'invoiceIds');
  v_id uuid;
begin
  perform authz.require('finance.receipts');
  if v_client is null then
    raise exception 'Διάλεξε Πελάτη' using errcode = 'P0001';
  end if;
  perform authz.require_client_exists(v_client);
  perform authz.receipt_check_input(v_amount, v_on, v_note);
  perform authz.require_active_method(v_method);
  perform authz.receipt_check_withholding(v_withheld, v_rate, true);
  perform authz.receipt_check_invoices(v_client, v_invoices);
  insert into public.receipts (client_id, received_on, amount, method_id, note, withheld, withholding_rate_id,
                               invoice_ids, created_by, updated_by)
  values (v_client, v_on, v_amount, v_method, v_note, v_withheld, v_rate, v_invoices, auth.uid(), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- p = { id, reason, receivedOn, amount, methodId, note, withheld?, withholdingId?, invoiceIds? }. Ο Πελάτης δεν αλλάζει.
-- Αποσυρμένος Τρόπος ή ποσοστό περνά μόνο αν δεν αλλάζει· ένα Τιμολόγιο που ακυρώθηκε στο μεταξύ μένει δεμένο
-- (απλώς δεν μετρά), ενώ κάθε νέο δέσιμο ελέγχεται.
create function public.receipt_amend(p jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_on date := nullif(p ->> 'receivedOn', '')::date;
  v_amount numeric := nullif(p ->> 'amount', '')::numeric;
  v_method uuid := nullif(p ->> 'methodId', '')::uuid;
  v_note text := btrim(coalesce(p ->> 'note', ''));
  v_withheld numeric := coalesce(nullif(p ->> 'withheld', '')::numeric, 0);
  v_rate uuid := nullif(p ->> 'withholdingId', '')::uuid;
  v_invoices uuid[] := authz.receipt_invoice_ids(p -> 'invoiceIds');
  v_reason text;
  v_before public.receipts;
  v_after public.receipts;
begin
  perform authz.require('finance.receipts');
  v_reason := authz.receipt_reason(p ->> 'reason');
  select r.* into v_before from public.receipts r where r.id = v_id and r.deleted_at is null;
  if not found then
    raise exception 'Η Είσπραξη δεν βρέθηκε ή έχει διαγραφεί' using errcode = 'P0001';
  end if;
  perform authz.receipt_check_input(v_amount, v_on, v_note);
  if v_method is distinct from v_before.method_id then
    perform authz.require_active_method(v_method);
  end if;
  perform authz.receipt_check_withholding(v_withheld, v_rate, v_rate is distinct from v_before.withholding_rate_id);
  perform authz.receipt_check_invoices(
    v_before.client_id, array(select x from unnest(v_invoices) x where not (x = any (v_before.invoice_ids))));
  if (v_on, v_amount, v_method, v_note, v_withheld, v_rate, v_invoices)
     is not distinct from (v_before.received_on, v_before.amount, v_before.method_id, v_before.note,
                           v_before.withheld, v_before.withholding_rate_id, v_before.invoice_ids) then
    raise exception 'Δεν άλλαξε τίποτα στην Είσπραξη' using errcode = 'P0001';
  end if;
  update public.receipts r
     set received_on = v_on, amount = v_amount, method_id = v_method, note = v_note, withheld = v_withheld,
         withholding_rate_id = v_rate, invoice_ids = v_invoices, updated_at = now(), updated_by = auth.uid()
   where r.id = v_id
  returning r.* into v_after;
  perform authz.receipt_event(v_id, 'corrected', to_jsonb(v_before), to_jsonb(v_after), v_reason);
end;
$$;

-- Ίδια με το #150, με παρακράτηση και δεμένα Τιμολόγια (αριθμοί με σειρά έκδοσης).
create or replace function public.receipts_view(p_client uuid default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_rows jsonb;
begin
  perform authz.require('finance.view');
  if authz.scope('finance.amounts') is distinct from 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', r.id,
             'clientId', r.client_id,
             'clientName', c.name,
             'receivedOn', r.received_on,
             'amount', r.amount,
             'withheld', r.withheld,
             'withholdingId', r.withholding_rate_id,
             'withholdingLabel', w.label,
             'invoiceIds', to_jsonb(r.invoice_ids),
             'invoiceNumbers', coalesce((
               select jsonb_agg(i.number order by i.issue_date, i.created_at, i.id)
                 from public.invoices i where i.id = any (r.invoice_ids)), '[]'::jsonb),
             'methodId', r.method_id,
             'methodLabel', m.label,
             'note', r.note,
             'createdByName', coalesce(tu.name, ''),
             'deleted', r.deleted_at is not null,
             'deleteReason', r.delete_reason,
             'can', jsonb_build_object('edit', r.deleted_at is null and authz.has('finance.receipts'))
           )
           order by r.received_on desc, r.created_at desc
         ), '[]'::jsonb)
    into v_rows
    from public.receipts r
    join public.clients c on c.id = r.client_id
    join public.payment_methods m on m.id = r.method_id
    left join public.withholding_rates w on w.id = r.withholding_rate_id
    left join public.team_users tu on tu.user_id = r.created_by
   where (p_client is null or r.client_id = p_client)
     and (r.deleted_at is null or authz.has('finance.receipts'));
  return v_rows;
end;
$$;

-- ───────────── Λίστα Τιμολογίων: και το καθαρό (για την πρόταση παρακράτησης, d6) ─────────────
-- Ίδια με το 20261013130000_invoices.sql· προστίθεται μόνο το 'net' σε κάθε γραμμή.
create or replace function public.invoices_view(p_filter text default 'all') returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := public.sales_today();
  v_month date := date_trunc('month', public.sales_today())::date;
  v_next date := (date_trunc('month', public.sales_today()) + interval '1 month')::date;
begin
  perform authz.require('finance.view');
  perform authz.require('finance.amounts');
  if authz.scope('finance.amounts') is distinct from 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_filter is null or p_filter not in ('all', 'unpaid', 'overdue', 'credit') then
    raise exception 'Άγνωστο φίλτρο Τιμολογίων' using errcode = 'P0001';
  end if;
  return (
    with inv_rows as (
      select i.id, i.number, i.kind, i.client_id, c.name as client_name, i.issue_date, i.due_date, i.net, i.total,
             i.created_at, s.paid, s.remaining, s.status, orig.number as credit_for_number
        from authz.invoice_standings(null, v_today) s
        join public.invoices i on i.id = s.invoice_id
        join public.clients c on c.id = i.client_id
        left join public.invoices orig on orig.id = i.credit_for
    ), shown as (
      select r.*
        from inv_rows r
       where case
               when p_filter = 'unpaid' then r.kind <> 'credit' and r.remaining > 0
               when p_filter = 'overdue' then r.status = 'overdue'
               when p_filter = 'credit' then r.kind = 'credit'
               else true
             end
    )
    select jsonb_build_object(
      'totals', jsonb_build_object(
        'turnoverMonth', coalesce((select sum(case when r.kind = 'credit' then -r.net else r.net end)
                                     from inv_rows r where r.issue_date >= v_month and r.issue_date < v_next), 0),
        'unpaid', coalesce((select sum(r.remaining) from inv_rows r where r.kind <> 'credit' and r.remaining > 0), 0),
        'unpaidCount', (select count(*) from inv_rows r where r.kind <> 'credit' and r.remaining > 0),
        'overdue', coalesce((select sum(r.remaining) from inv_rows r where r.status = 'overdue'), 0),
        'overdueCount', (select count(*) from inv_rows r where r.status = 'overdue')
      ),
      'counts', jsonb_build_object(
        'all', (select count(*) from inv_rows),
        'unpaid', (select count(*) from inv_rows r where r.kind <> 'credit' and r.remaining > 0),
        'overdue', (select count(*) from inv_rows r where r.status = 'overdue'),
        'credit', (select count(*) from inv_rows r where r.kind = 'credit')
      ),
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', r.id, 'number', r.number, 'kind', r.kind, 'clientId', r.client_id, 'clientName', r.client_name,
                 'issueDate', r.issue_date, 'dueDate', r.due_date, 'net', r.net, 'total', r.total, 'paid', r.paid,
                 'remaining', r.remaining, 'status', r.status, 'creditForNumber', r.credit_for_number
               ) order by r.issue_date desc, r.created_at desc, r.id)
          from shown r
      ), '[]'::jsonb)
    )
  );
end;
$$;

-- ───────────── Σελίδα Τιμολογίου (d3) ─────────────

-- { status, owed, paid, remaining, payments: [{ receiptId, receivedOn, methodLabel, applied, receiptAmount, withheld,
--   withholdingLabel, linked }], agreements: [{ id, title }], productions: [{ id, title }] }
-- Ίδιο Δικαίωμα με την invoice_detail. Συμφωνίες και Παραγωγές = όσα Τιμολογητέα κάλυψε αυτό το Τιμολόγιο
-- (ίδια κάλυψη με την I1: καθαρό, παλαιότερο πρώτα). Ακυρωμένο Τιμολόγιο → status 'voided', χωρίς πληρωμές.
create function public.invoice_payments(p_id uuid, p_today date default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_inv public.invoices;
  v_standing record;
begin
  perform authz.require('finance.view');
  perform authz.require('finance.amounts');
  if authz.scope('finance.amounts') is distinct from 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select i.* into v_inv from public.invoices i where i.id = p_id;
  if not found then
    raise exception 'Το Τιμολόγιο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  select s.owed, s.paid, s.remaining, s.status into v_standing
    from authz.invoice_standings(v_inv.client_id, coalesce(p_today, public.sales_today())) s
   where s.invoice_id = p_id;
  return (
    with inv_stack as (
      select i.id, i.net,
             coalesce(sum(i.net) over (order by i.issue_date, i.created_at, i.id
                                        rows between unbounded preceding and 1 preceding), 0) as b
        from public.invoices i
       where i.client_id = v_inv.client_id and i.kind <> 'credit' and i.voided_at is null
    ), bill_stack as (
      select bl.id, bl.agreement_id, bl.reason, bl.source_id, bl.net,
             coalesce(sum(bl.net) over (order by bl.billable_on, bl.created_at, bl.id
                                         rows between unbounded preceding and 1 preceding), 0) as b
        from public.billables bl
       where bl.client_id = v_inv.client_id
    ), covered as (
      select bs.*
        from bill_stack bs
        join inv_stack ist on ist.id = p_id
       where least(bs.b + bs.net, ist.b + ist.net) - greatest(bs.b, ist.b) > 0
    ), prods as (
      select distinct pr.id, pr.title
        from covered cv
        join public.productions pr
          on (cv.reason = 'period' and pr.period_id = cv.source_id)
          or (cv.reason <> 'period' and pr.agreement_id = cv.agreement_id and pr.period_id is null)
    )
    select jsonb_build_object(
      'status', coalesce(v_standing.status, 'voided'),
      'owed', coalesce(v_standing.owed, 0),
      'paid', coalesce(v_standing.paid, 0),
      'remaining', coalesce(v_standing.remaining, 0),
      'payments', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'receiptId', r.id, 'receivedOn', r.received_on, 'methodLabel', m.label, 'applied', a.amount,
                 'receiptAmount', r.amount, 'withheld', r.withheld, 'withholdingLabel', w.label,
                 'linked', p_id = any (r.invoice_ids))
               order by r.received_on, r.created_at, r.id)
          from authz.receipt_applications(v_inv.client_id) a
          join public.receipts r on r.id = a.receipt_id
          join public.payment_methods m on m.id = r.method_id
          left join public.withholding_rates w on w.id = r.withholding_rate_id
         where a.invoice_id = p_id), '[]'::jsonb),
      'agreements', coalesce((
        select jsonb_agg(jsonb_build_object('id', ag.id, 'title', ag.title) order by ag.title, ag.id)
          from public.agreements ag
         where ag.id in (select cv.agreement_id from covered cv)), '[]'::jsonb),
      'productions', coalesce((
        select jsonb_agg(jsonb_build_object('id', pr.id, 'title', pr.title) order by pr.title, pr.id)
          from prods pr), '[]'::jsonb)
    )
  );
end;
$$;

-- ───────────── «Προς τιμολόγηση»: υπενθύμιση μόνο όταν στάλθηκε (d1) ─────────────
-- Ίδια με το 20261013130000_invoices.sql· το 'reminders' (μέρες από ρύθμιση, χωρίς να έχει σταλεί τίποτα) γίνεται
-- 'lastReminderAt': η τελευταία πραγματική αποστολή του Αυτοματισμού «Τιμολογητέο ανοιχτό Χ μέρες», αλλιώς null.

create or replace function public.billables_view() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := public.sales_today();
begin
  perform authz.require('finance.view');
  perform authz.require('finance.amounts');
  if authz.scope('finance.amounts') is distinct from 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return (
    with items as (
      select o.client_id, o.client_name, o.days_open, o.open_amount, o.billable_on, o.id,
             jsonb_build_object(
               'id', o.id, 'billableOn', o.billable_on, 'agreementId', o.agreement_id,
               'agreementTitle', o.agreement_title, 'reason', o.reason, 'label', o.label,
               'net', o.net, 'open', o.open_amount, 'daysOpen', o.days_open,
               'lastReminderAt', (select max(s.created_at) from public.automation_sends s
                                   where s.case_key like 'billable.open_waiting:' || o.id::text || '%')
             ) as item
        from authz.billables_open(v_today) o
    ), grouped as (
      select i.client_id, i.client_name, sum(i.open_amount) as open_total, count(*) as item_count,
             max(i.days_open) as oldest_days, jsonb_agg(i.item order by i.billable_on, i.id) as items
        from items i
       group by i.client_id, i.client_name
    ), beyond as (
      select b.client_id, c.name as client_name, b.beyond
        from authz.invoices_beyond() b
        join public.clients c on c.id = b.client_id
    ), merged as (
      select coalesce(g.client_id, b.client_id) as client_id,
             coalesce(g.client_name, b.client_name) as client_name,
             coalesce(g.open_total, 0) as open_total,
             coalesce(g.item_count, 0) as item_count,
             coalesce(g.oldest_days, 0) as oldest_days,
             coalesce(b.beyond, 0) as beyond,
             coalesce(g.items, '[]'::jsonb) as items
        from grouped g
        full join beyond b on b.client_id = g.client_id
    )
    select jsonb_build_object(
      'total', coalesce(sum(m.open_total), 0),
      'count', coalesce(sum(m.item_count), 0),
      'clients', coalesce(jsonb_agg(jsonb_build_object(
          'clientId', m.client_id, 'clientName', m.client_name, 'open', m.open_total, 'count', m.item_count,
          'oldestDays', m.oldest_days, 'beyond', m.beyond, 'items', m.items)
        order by m.oldest_days desc, m.client_name), '[]'::jsonb)
    )
      from merged m
  );
end;
$$;

-- ───────────── Καρτέλα: «δικά μου» (d11) και παρακράτηση (d6) ─────────────

-- Ίδια με το 20261013140000_ledger.sql, με έναν κλάδο ακόμα: μέλος ομάδας με «Βλέπει ποσά» Εύρος «δικά μου» βλέπει
-- την Καρτέλα των Πελατών όπου είναι υπεύθυνος. Για άλλον Πελάτη 42501, χωρίς oracle ύπαρξης.
create or replace function authz.ledger_client(p_client uuid) returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_own uuid;
begin
  if authz.has('finance.view') and authz.scope('finance.amounts') = 'all' then
    if p_client is null then
      raise exception 'Διάλεξε Πελάτη' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.clients c where c.id = p_client) then
      raise exception 'Ο Πελάτης δεν βρέθηκε' using errcode = 'P0001';
    end if;
    return p_client;
  end if;
  if authz.is_team_user() and authz.scope('finance.amounts') = 'mine' and p_client is not null
     and exists (select 1 from public.clients c where c.id = p_client and c.manager_id = auth.uid()) then
    return p_client;
  end if;
  if authz.client_user_has('c.finance') then
    v_own := authz.client_user_client_id();
    if v_own is not null and (p_client is null or p_client = v_own) then
      return v_own;
    end if;
  end if;
  raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
end;
$$;

-- Ίδια με το 20261013140000_ledger.sql· κάθε παρακράτηση είναι δική της κίνηση πίστωσης ('withheld').
create or replace function public.client_ledger_view(p_client uuid default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_client uuid := authz.ledger_client(p_client);
  v_is_team boolean := authz.has('finance.view') and authz.scope('finance.amounts') = 'all';
  v_today date := public.sales_today();
begin
  return (
    with moves as (
      select i.issue_date as d,
             case i.kind when 'invoice' then 'invoice' when 'receipt' then 'receipt_doc' else 'credit' end as k,
             case i.kind when 'invoice' then 'Τιμολόγιο ' when 'receipt' then 'Απόδειξη ' else 'Πιστωτικό ' end || i.number as label,
             case when i.kind = 'credit' then 0::numeric else i.total end as debit,
             case when i.kind = 'credit' then i.total else 0::numeric end as credit,
             i.created_at, i.id, 0 as part
        from public.invoices i
       where i.client_id = v_client and i.voided_at is null
      union all
      select r.received_on, 'payment',
             case when v_is_team and r.note <> '' then 'Είσπραξη (' || r.note || ')' else 'Είσπραξη' end,
             0::numeric, r.amount, r.created_at, r.id, 0
        from public.receipts r
       where r.client_id = v_client and r.deleted_at is null
      union all
      select r.received_on, 'withheld', coalesce(w.label, 'Παρακράτηση φόρου'),
             0::numeric, r.withheld, r.created_at, r.id, 1
        from public.receipts r
        left join public.withholding_rates w on w.id = r.withholding_rate_id
       where r.client_id = v_client and r.deleted_at is null and r.withheld > 0
    ), run as (
      select m.*,
             sum(m.debit - m.credit) over (
               order by m.d, case when m.debit > 0 then 0 else 1 end, m.created_at, m.id, m.part
               rows between unbounded preceding and current row) as running
        from moves m
    )
    select jsonb_build_object(
      'clientId', v_client,
      'clientName', (select c.name from public.clients c where c.id = v_client),
      'balance', coalesce((select sum(m.debit - m.credit) from moves m), 0),
      'overdue', coalesce((select sum(s.remaining) from authz.invoice_standings(v_client, v_today) s
                            where s.status = 'overdue'), 0),
      'entries', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'date', r.d, 'kind', r.k, 'label', r.label, 'debit', r.debit, 'credit', r.credit, 'running', r.running)
               order by r.d, case when r.debit > 0 then 0 else 1 end, r.created_at, r.id, r.part)
          from run r), '[]'::jsonb),
      'payment', (select jsonb_build_object('holder', b.holder, 'bank', b.bank_name, 'iban', b.iban)
                    from public.bank_accounts b where b.is_default and b.retired_at is null limit 1),
      'toInvoice', case when v_is_team then (
        select jsonb_build_object('amount', coalesce(sum(o.open_amount), 0), 'count', count(*))
          from authz.billables_open(v_today) o where o.client_id = v_client) else null end
    )
  );
end;
$$;

-- Ίδια με το 20261013140000_ledger.sql· το υπόλοιπο αφαιρεί και την παρακράτηση.
create or replace function public.clients_with_finance() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require('finance.view');
  perform authz.require('finance.amounts');
  if authz.scope('finance.amounts') is distinct from 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    with moves as (
      select i.client_id, case when i.kind = 'credit' then -i.total else i.total end as delta
        from public.invoices i where i.voided_at is null
      union all
      select r.client_id, -(r.amount + r.withheld) from public.receipts r where r.deleted_at is null
    )
    select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'balance', t.balance) order by c.name, c.id)
      from (select m.client_id, sum(m.delta) as balance from moves m group by m.client_id) t
      join public.clients c on c.id = t.client_id
  ), '[]'::jsonb);
end;
$$;

-- Ίδια με το 20261102120000_sales_client_overview.sql· το υπόλοιπο αφαιρεί και την παρακράτηση.
create or replace function authz.client_overview_balance_cents(p_client uuid) returns bigint
language sql stable security definer set search_path = ''
as $$
  select round(coalesce(sum(m.delta), 0) * 100)::bigint
    from (
      select case when i.kind = 'credit' then -i.total else i.total end as delta
        from public.invoices i where i.client_id = p_client and i.voided_at is null
      union all
      select -(r.amount + r.withheld) from public.receipts r where r.client_id = p_client and r.deleted_at is null
    ) m;
$$;

-- ───────────── Εξαγωγές: παρακράτηση ─────────────

-- Ίδια με το 20261017160000_reports_export.sql, με παρακράτηση και ποσοστό.
create or replace function authz.export_receipt_rows(p_from date, p_to date, p_amounts boolean) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'receivedOn', r.received_on, 'clientName', c.name, 'clientAfm', c.afm,
           'amount', case when p_amounts then r.amount end,
           'withheld', case when p_amounts then r.withheld end,
           'withholding', w.label,
           'method', m.label, 'note', nullif(r.note, '')
         ) order by r.received_on, r.created_at, r.id), '[]'::jsonb)
    from public.receipts r
    join public.clients c on c.id = r.client_id
    join public.payment_methods m on m.id = r.method_id
    left join public.withholding_rates w on w.id = r.withholding_rate_id
   where r.deleted_at is null and r.received_on between p_from and p_to;
$$;

-- Ίδια με το 20261017160000_reports_export.sql· ίδιες κινήσεις με την Καρτέλα, μαζί με την παρακράτηση.
create or replace function authz.export_ledger_rows(p_from date, p_to date, p_amounts boolean) returns jsonb
language sql stable security definer set search_path = ''
as $$
  with moves as (
    select i.client_id, i.issue_date as d,
           case i.kind when 'invoice' then 'Τιμολόγιο ' when 'receipt' then 'Απόδειξη ' else 'Πιστωτικό ' end || i.number as label,
           case when i.kind = 'credit' then 0::numeric else i.total end as debit,
           case when i.kind = 'credit' then i.total else 0::numeric end as credit,
           i.created_at, i.id, 0 as part
      from public.invoices i
     where i.voided_at is null
    union all
    select r.client_id, r.received_on,
           case when r.note <> '' then 'Είσπραξη (' || r.note || ')' else 'Είσπραξη' end,
           0::numeric, r.amount, r.created_at, r.id, 0
      from public.receipts r
     where r.deleted_at is null
    union all
    select r.client_id, r.received_on, coalesce(w.label, 'Παρακράτηση φόρου'),
           0::numeric, r.withheld, r.created_at, r.id, 1
      from public.receipts r
      left join public.withholding_rates w on w.id = r.withholding_rate_id
     where r.deleted_at is null and r.withheld > 0
  ), run as (
    select m.*,
           sum(m.debit - m.credit) over (
             partition by m.client_id
             order by m.d, case when m.debit > 0 then 0 else 1 end, m.created_at, m.id, m.part
             rows between unbounded preceding and current row) as running
      from moves m
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'clientName', c.name, 'clientAfm', c.afm, 'date', r.d, 'label', r.label,
           'debit', case when p_amounts then r.debit end,
           'credit', case when p_amounts then r.credit end,
           'balance', case when p_amounts then r.running end
         ) order by c.name, c.id, r.d, case when r.debit > 0 then 0 else 1 end, r.created_at, r.id, r.part), '[]'::jsonb)
    from run r
    join public.clients c on c.id = r.client_id
   where r.d between p_from and p_to;
$$;

-- ───────────── Ίχνος ─────────────

create trigger withholding_rates_audit after insert on public.withholding_rates
  for each row execute function authz.audit_row('id');
create trigger withholding_rates_audit_update after update on public.withholding_rates
  for each row when (old.* is distinct from new.*) execute function authz.audit_row('id');

insert into public.audit_entities (entity, area, label, parent, amount_keys, cost_keys, visibility)
values ('withholding_rates', 'settings', 'Ποσοστό παρακράτησης', null, '{}', '{}', 'rule');

-- Η παρακράτηση είναι ποσό: κρύβεται στο Ίχνος όπως το ποσό της Είσπραξης.
update public.audit_entities set amount_keys = '{amount,withheld}' where entity = 'receipts';


-- Ίδια με το 20261104130000_blocked_time_kinds.sql, με τα ποσοστά παρακράτησης (χωρίς ποσά, όπως οι Τρόποι).
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
    -- Είδη κλεισμένου χρόνου (owner 02): ονομασίες, χωρίς τίτλους ή ποσά
    when 'blocked_time_kinds' then true
    when 'filming_sheets' then true
    when 'filming_sheet_versions' then true
    when 'google_calendar' then authz.has('calendar.google')
    when 'google_deletions' then authz.has('calendar.google')
    -- Παραδοτέα (#140): χωρίς ποσά
    when 'deliverables' then true
    when 'deliverable_versions' then true
    when 'deliverable_comments' then true
    -- Κανόνες Παραδοτέων (#141): χωρίς ποσά
    when 'deliverable_settings' then true
    -- Αιτήματα μετά την έγκριση (#142): χωρίς ποσά
    when 'deliverable_requests' then true
    -- Εργασίες Παραγωγής (#143): χωρίς ποσά
    when 'production_tasks' then true
    -- Οικονομικά (#150, #151, #152): οι Τρόποι δεν έχουν ποσά· Εισπράξεις, Τιμολογητέα και Τιμολόγια μόνο με «Βλέπει ποσά»
    when 'payment_methods' then true
    when 'withholding_rates' then true
    when 'receipts' then authz.has('finance.amounts')
    when 'billables' then authz.has('finance.amounts')
    when 'invoices' then authz.has('finance.amounts')
    -- Αιτήματα Μηνυμάτων (#163): το κλείσιμο έχει κείμενο προς τον πελάτη, άρα όπως τα Μηνύματα
    when 'message_requests' then authz.has('audit.view') and authz.scope('messages.chat') = 'all'
    -- Μηνύματα (#160): περιέχουν κείμενο Συνομιλίας, άρα μόνο όσοι βλέπουν όλες τις Συνομιλίες
    when 'messages' then authz.has('audit.view') and authz.scope('messages.chat') = 'all'
    -- Ρυθμίσεις Μηνυμάτων (#164): αριθμοί χωρίς κείμενο ή ποσά
    when 'message_settings' then authz.has('audit.view')
    -- Αυτοματισμοί (#170): κείμενα και παραλήπτες, χωρίς ποσά
    when 'automations' then authz.has('automations.manage') or authz.has('audit.view')
    -- Αργίες (#172): ονόματα και ημερομηνίες
    when 'holiday_greetings' then authz.has('automations.manage') or authz.has('audit.view')
    -- Μηνύματα συστήματος (#173): κείμενα, χωρίς σύνδεσμους ή κωδικούς
    when 'system_messages' then authz.has('automations.manage') or authz.has('audit.view')
    -- Γνώση (#190): περιέχει πρόχειρα, άρα μόνο όσοι διαχειρίζονται τη Γνώση
    when 'knowledge_sections' then authz.has('knowledge.manage')
    when 'knowledge_items' then authz.has('knowledge.manage')
    when 'knowledge_item_audience' then authz.has('knowledge.manage')
    -- Εξαγωγές (#200, #201): τι, φίλτρα, γραμμές· χωρίς ποσά
    when 'report_exports' then true
    -- Συνδρομές (#209): πάροχοι και κόστος, μόνο ο Ιδιοκτήτης
    when 'subscriptions' then authz.is_owner()
    -- GDPR (#208): αιτήματα, εξαγωγές και ανωνυμοποιήσεις, μόνο για τον Ιδιοκτήτη (ποτέ η Διαχείριση)
    when 'gdpr_requests' then authz.is_owner()
    when 'gdpr' then authz.is_owner()
    -- Υγεία (#215): «Ξαναδοκίμασε» ενός Γεγονότος που κόλλησε· μόνο τύπος και προσπάθειες
    when 'events' then true
    else false
  end;
$$;

-- ───────────── Δικαιώματα εκτέλεσης ─────────────

revoke all on table public.withholding_rates from anon, authenticated;

revoke execute on function authz.receipt_applications(uuid) from public, anon, authenticated;
revoke execute on function authz.receipt_invoice_ids(jsonb) from public, anon, authenticated;
revoke execute on function authz.receipt_check_invoices(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function authz.receipt_check_withholding(numeric, uuid, boolean) from public, anon, authenticated;

revoke execute on function public.withholding_rates_view() from public, anon;
revoke execute on function public.withholding_rate_save(uuid, text, numeric) from public, anon;
revoke execute on function public.withholding_rate_retire(uuid) from public, anon;
revoke execute on function public.withholding_rate_restore(uuid) from public, anon;
revoke execute on function public.receipt_record(jsonb) from public, anon;
revoke execute on function public.receipt_amend(jsonb) from public, anon;
revoke execute on function public.invoice_payments(uuid, date) from public, anon;

grant execute on function public.withholding_rates_view() to authenticated;
grant execute on function public.withholding_rate_save(uuid, text, numeric) to authenticated;
grant execute on function public.withholding_rate_retire(uuid) to authenticated;
grant execute on function public.withholding_rate_restore(uuid) to authenticated;
grant execute on function public.receipt_record(jsonb) to authenticated;
grant execute on function public.receipt_amend(jsonb) to authenticated;
grant execute on function public.invoice_payments(uuid, date) to authenticated;
