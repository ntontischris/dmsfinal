-- Σήμερα του Χρήστη πελάτη, κάρτα «Τι χρωστάς»: κάθε γραμμή Τιμολογίου ανοίγει τη σελίδα του (I8), όχι τη λίστα.
-- Ίδιος ορισμός με το 20261016140000_today_client.sql· αλλάζει μόνο το link των γραμμών.

create or replace function authz.today_items_client_owes(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_total bigint;
  v_overdue bigint;
begin
  if not authz.today_client_can(p_uid, p_client, array['c.finance']) then
    perform authz.today_client_deny();
  end if;
  select sum(o.amount_cents), coalesce(sum(o.amount_cents) filter (where o.urgent), 0) into v_total, v_overdue
    from authz.today_client_owes_rows(p_client, p_now) o;
  if v_total is null then
    return '[]'::jsonb;
  end if;
  return jsonb_build_array(jsonb_build_object(
           'id', 'balance', 'title', 'Υπόλοιπο',
           'subtitle', case when v_overdue > 0 then 'από τα οποία ' || authz.today_euro(v_overdue / 100.0) || ' ληξιπρόθεσμα' end,
           'at', null, 'urgent', v_overdue > 0, 'amount_cents', v_total, 'link', '/app/finance/ledger'))
    || coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', null,
                                        'urgent', r.urgent, 'amount_cents', r.amount_cents,
                                        'link', '/app/finance/invoices/' || r.id)
                     order by r.urgent desc, r.due nulls last, r.issued, r.id)
      from (select * from authz.today_client_owes_rows(p_client, p_now) o
             order by o.urgent desc, o.due nulls last, o.issued, o.id limit 2) r),
    '[]'::jsonb);
end;
$$;
