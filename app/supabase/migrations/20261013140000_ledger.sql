-- Καρτέλα Πελάτη (I5), όψη πελάτη και ληξιπρόθεσμα, Iδ #153.
-- Κεφ. 7 (Τιμολόγια και Εισπράξεις), Δέσμη I: Π12, Π13, Π14.
--
-- Αρχές:
--  • Τίποτα δεν αποθηκεύεται για την Καρτέλα: υπολογίζεται από Τιμολόγια (χρέωση, εκτός πιστωτικών) και Εισπράξεις (πίστωση).
--    Τα ακυρωμένα Τιμολόγια και οι διαγραμμένες Εισπράξεις λείπουν.
--  • Ομάδα: finance.view + finance.amounts με Εύρος «όλα». Χρήστης πελάτη: c.finance, μόνο ο δικός του Πελάτης.
--    Αλλιώς 42501, χωρίς oracle ύπαρξης. Το «Προς τιμολόγηση» υπάρχει μόνο για την ομάδα· οι σημειώσεις των Εισπράξεων επίσης.
--  • Ληξιπρόθεσμο: ένα email ανά Τιμολόγιο (πίνακας invoice_overdue_notices), από το cron, μετά τις 09:00 ώρα Ελλάδας.

-- ───────────── Email ─────────────

alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check
  check (kind in ('test', 'invite_resend', 'client_added', 'filming_decision', 'reschedule_decision',
                  'sheet_issued', 'crew_declined', 'deliverable_version_sent',
                  'production_delivered', 'deliverable_reminder', 'invoice_registered', 'invoice_overdue'));

-- ───────────── Ειδοποιήσεις ληξιπρόθεσμου ─────────────

create table public.invoice_overdue_notices (
  invoice_id uuid primary key references public.invoices (id),
  sent_at timestamptz not null default now()
);

alter table public.invoice_overdue_notices enable row level security;

-- ───────────── Βοηθητικό: ποιος Πελάτης ─────────────

-- Ομάδα (finance.view + finance.amounts «όλα») → ο Πελάτης που ζητήθηκε (υποχρεωτικός).
-- Χρήστης πελάτη (c.finance) → ο δικός του· αν ζητηθεί άλλος, 42501. Αλλιώς 42501.
create function authz.ledger_client(p_client uuid) returns uuid
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
  if authz.client_user_has('c.finance') then
    v_own := authz.client_user_client_id();
    if v_own is not null and (p_client is null or p_client = v_own) then
      return v_own;
    end if;
  end if;
  raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
end;
$$;

-- ───────────── RPC: Καρτέλα ─────────────

-- { clientId, clientName, balance, overdue,
--   entries: [{ date, kind: invoice|receipt_doc|credit|payment, label, debit, credit, running }],
--   payment: { holder, bank, iban } | null, toInvoice: { amount, count } | null }
-- Θετικό υπόλοιπο = χρωστά ο Πελάτης· αρνητικό = υπέρ του πελάτη (Π12).
create function public.client_ledger_view(p_client uuid default null) returns jsonb
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
             i.created_at, i.id
        from public.invoices i
       where i.client_id = v_client and i.voided_at is null
      union all
      select r.received_on, 'payment',
             case when v_is_team and r.note <> '' then 'Είσπραξη (' || r.note || ')' else 'Είσπραξη' end,
             0::numeric, r.amount, r.created_at, r.id
        from public.receipts r
       where r.client_id = v_client and r.deleted_at is null
    ), run as (
      select m.*,
             sum(m.debit - m.credit) over (
               order by m.d, case when m.debit > 0 then 0 else 1 end, m.created_at, m.id
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
               order by r.d, case when r.debit > 0 then 0 else 1 end, r.created_at, r.id)
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

-- Τα Τιμολόγια του Χρήστη πελάτη (όχι ακυρωμένα), με κατάσταση και υπόλοιπο. Χωρίς σύνολα εταιρείας, χωρίς Πελάτη.
create function public.client_invoices_view() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_client uuid;
begin
  if not authz.client_user_has('c.finance') then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  v_client := authz.client_user_client_id();
  if v_client is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', i.id, 'number', i.number, 'kind', i.kind, 'issueDate', i.issue_date, 'dueDate', i.due_date,
             'total', i.total, 'paid', s.paid, 'remaining', s.remaining, 'status', s.status,
             'creditForNumber', orig.number
           ) order by i.issue_date desc, i.created_at desc, i.id)
      from authz.invoice_standings(v_client, public.sales_today()) s
      join public.invoices i on i.id = s.invoice_id
      left join public.invoices orig on orig.id = i.credit_for
  ), '[]'::jsonb));
end;
$$;

-- Πελάτες με κινήσεις, για τις Καρτέλες της ομάδας: [{ id, name, balance }].
create function public.clients_with_finance() returns jsonb
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
      select r.client_id, -r.amount from public.receipts r where r.deleted_at is null
    )
    select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'balance', t.balance) order by c.name, c.id)
      from (select m.client_id, sum(m.delta) as balance from moves m group by m.client_id) t
      join public.clients c on c.id = t.client_id
  ), '[]'::jsonb);
end;
$$;

-- ───────────── Ληξιπρόθεσμα (Π14) ─────────────

-- Για κάθε ληξιπρόθεσμο Τιμολόγιο χωρίς γραμμή: γραμμή ειδοποίησης και ένα email σε κάθε Χρήστη πελάτη με c.finance.
-- Τρέχει μόνο μετά τις 09:00 ώρα Ελλάδας. Το p_now (null = τώρα) υπάρχει για τα τεστ. Idempotent: η γραμμή γράφεται πρώτα.
-- payload: { invoiceId, number, dueDate, remaining, payment?: { holder, bank, iban } }
create function public.invoice_overdue_enqueue(p_now timestamptz default null) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_today date := (v_now at time zone 'Europe/Athens')::date;
  v_row record;
  v_payment jsonb;
  v_count integer := 0;
begin
  if extract(hour from v_now at time zone 'Europe/Athens') < 9 then
    return 0;
  end if;
  v_payment := (select jsonb_build_object('holder', b.holder, 'bank', b.bank_name, 'iban', b.iban)
                  from public.bank_accounts b where b.is_default and b.retired_at is null limit 1);
  for v_row in
    select s.invoice_id, s.client_id, s.remaining, i.number, i.due_date
      from authz.invoice_standings(null, v_today) s
      join public.invoices i on i.id = s.invoice_id
     where s.status = 'overdue'
       and not exists (select 1 from public.invoice_overdue_notices n where n.invoice_id = s.invoice_id)
     order by i.due_date, i.id
  loop
    insert into public.invoice_overdue_notices (invoice_id) values (v_row.invoice_id)
    on conflict do nothing;
    continue when not found;
    insert into public.email_outbox (kind, to_name, to_email, locale, payload)
    select 'invoice_overdue', cu.name, lower(trim(u.email)), coalesce(t.language, 'el'),
           jsonb_strip_nulls(jsonb_build_object(
             'invoiceId', v_row.invoice_id, 'number', v_row.number, 'dueDate', v_row.due_date,
             'remaining', v_row.remaining, 'payment', v_payment))
      from public.client_users cu
      join public.role_permissions rp on rp.role_id = cu.role_id and rp.permission = 'c.finance'
      join auth.users u on u.id = cu.user_id
      left join public.team_users t on t.user_id = cu.user_id
     where cu.client_id = v_row.client_id and cu.removed_at is null and coalesce(u.email, '') <> '';
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function authz.ledger_client(uuid) from public, anon, authenticated;

revoke all on function
  public.client_ledger_view(uuid), public.client_invoices_view(), public.clients_with_finance(),
  public.invoice_overdue_enqueue(timestamptz)
  from public, anon, authenticated;

grant execute on function
  public.client_ledger_view(uuid), public.client_invoices_view(), public.clients_with_finance()
  to authenticated;

grant execute on function public.invoice_overdue_enqueue(timestamptz) to service_role;

revoke all on table public.invoice_overdue_notices from anon, authenticated;
