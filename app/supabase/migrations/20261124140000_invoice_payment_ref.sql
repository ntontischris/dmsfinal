-- Κωδικός πληρωμής (RF) ανά Τιμολόγιο (αίτημα Ιδιοκτήτη, 2026-11-24).
--
--  • Ελεύθερο κείμενο έως 35 χαρακτήρες: η μορφή του RF δεν είναι ακόμα γνωστή, άρα κανένας έλεγχος checksum.
--    Κενό = null (καθαρίζει). Ο έλεγχος (CHECK) δέχεται μόνο κομμένη, μη κενή τιμή.
--  • Το γράφει, το αλλάζει ή το καθαρίζει όποιος έχει «Καταχωρεί Τιμολόγια» (finance.invoices), με την
--    public.invoice_payment_ref_set. Το Δικαίωμα ελέγχεται ΠΡΩΤΑ (42501). Ακυρωμένη καταχώριση δεν αλλάζει.
--  • Ίχνος: όπως η διόρθωση, μία γραμμή 'event' (corrected) με την αλλαγή paymentRef παλιό → νέο.
--  • Φαίνεται στην ομάδα (invoice_detail → paymentRef) και στον Χρήστη πελάτη (client_invoices_view → paymentRef).

alter table public.invoices
  add column payment_ref text
  check (payment_ref is null or (payment_ref = btrim(payment_ref) and char_length(payment_ref) between 1 and 35));

-- ───────────── Γράψιμο ─────────────

create function public.invoice_payment_ref_set(p_id uuid, p_ref text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_ref text := nullif(btrim(coalesce(p_ref, '')), '');
  v_before public.invoices;
  v_after public.invoices;
begin
  perform authz.require('finance.invoices');
  if v_ref is not null and char_length(v_ref) > 35 then
    raise exception 'Ο κωδικός πληρωμής έχει έως 35 χαρακτήρες' using errcode = 'P0001';
  end if;
  select i.* into v_before from public.invoices i where i.id = p_id for update;
  if not found then
    raise exception 'Το Τιμολόγιο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if v_before.voided_at is not null then
    raise exception 'Η καταχώριση είναι ακυρωμένη και δεν διορθώνεται' using errcode = 'P0001';
  end if;
  if v_before.payment_ref is not distinct from v_ref then
    raise exception 'Δεν άλλαξε τίποτα στον κωδικό πληρωμής' using errcode = 'P0001';
  end if;
  update public.invoices i set payment_ref = v_ref where i.id = p_id returning i.* into v_after;
  perform authz.invoice_event(p_id, 'corrected', to_jsonb(v_before), to_jsonb(v_after), null,
    jsonb_build_array(jsonb_build_object('field', 'paymentRef', 'from', v_before.payment_ref, 'to', v_ref)));
end;
$$;

-- ───────────── I8 / I3 της ομάδας ─────────────

-- Ίδιος ορισμός με το 20261013150000_invoice_corrections.sql· προστίθεται το paymentRef.
create or replace function public.invoice_detail(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform authz.require('finance.view');
  perform authz.require('finance.amounts');
  if authz.scope('finance.amounts') is distinct from 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select jsonb_build_object(
           'id', i.id, 'kind', i.kind, 'number', i.number, 'issueDate', i.issue_date, 'dueDate', i.due_date,
           'net', i.net, 'vat', i.vat, 'total', i.total, 'mark', i.mark, 'paymentRef', i.payment_ref,
           'clientId', i.client_id, 'clientName', c.name,
           'creditFor', i.credit_for, 'creditForNumber', orig.number,
           'voided', case when i.voided_at is null then null
                          else jsonb_build_object('at', i.voided_at, 'by', vu.name, 'reason', i.void_reason) end,
           'trail', case when authz.has('audit.view') then coalesce((
                      select jsonb_agg(jsonb_build_object(
                               'at', a.at, 'byName', au.name,
                               'action', case when a.action = 'insert' then 'registered' else a.after ->> 'event' end,
                               'changes', coalesce(a.after -> 'changes', '[]'::jsonb),
                               'reason', a.after ->> 'reason'
                             ) order by a.at, a.id)
                        from public.audit_log a
                        left join public.team_users au on au.user_id = a.actor_id
                       where a.entity = 'invoices' and a.entity_id = i.id::text and a.action in ('insert', 'event')
                    ), '[]'::jsonb) else '[]'::jsonb end,
           'can', jsonb_build_object(
             'correct', i.voided_at is null and authz.has('finance.invoices'),
             'void', i.voided_at is null and authz.has('finance.invoices'))
         )
    into v_result
    from public.invoices i
    join public.clients c on c.id = i.client_id
    left join public.invoices orig on orig.id = i.credit_for
    left join public.team_users vu on vu.user_id = i.voided_by
   where i.id = p_id;
  if v_result is null then
    raise exception 'Το Τιμολόγιο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  return v_result;
end;
$$;

-- ───────────── Τιμολόγια του Χρήστη πελάτη ─────────────

-- Ίδιος ορισμός με το 20261013140000_ledger.sql· προστίθεται το paymentRef.
create or replace function public.client_invoices_view() returns jsonb
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
             'creditForNumber', orig.number, 'paymentRef', i.payment_ref
           ) order by i.issue_date desc, i.created_at desc, i.id)
      from authz.invoice_standings(v_client, public.sales_today()) s
      join public.invoices i on i.id = s.invoice_id
      left join public.invoices orig on orig.id = i.credit_for
  ), '[]'::jsonb));
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function public.invoice_payment_ref_set(uuid, text) from public, anon;
grant execute on function public.invoice_payment_ref_set(uuid, text) to authenticated;
