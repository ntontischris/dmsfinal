-- Σήμερα: «Μπήκαν τον <μήνα>» (Τ8) από ένα άθροισμα στη βάση, όχι από όλες τις Εισπράξεις (receipts_view).
--
-- public.today_received(p_today): { month: 'YYYY-MM', received }. received = Εισπράξεις του μήνα με ΦΠΑ, χωρίς τις
-- διαγραμμένες (ίδιος κανόνας με την κάρτα Εισπράξεις των Τιμολογίων). Μόνο με «Βλέπει Οικονομικά» + «Βλέπει ποσά» με
-- Εύρος «όλα» (ίδιο Δικαίωμα με τον Τζίρο της today_kpis)· αλλιώς null, χωρίς άρνηση: η Σήμερα απλώς δεν το δείχνει.
-- Ο μήνας είναι ο μήνας Αθήνας, όπως στην today_kpis.

create function authz.today_received(p_today date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_month date := date_trunc('month', p_today)::date;
  v_finance boolean := coalesce(authz.has('finance.view'), false)
                       and authz.scope('finance.amounts') is not distinct from 'all';
begin
  return jsonb_build_object(
    'month', to_char(v_month, 'YYYY-MM'),
    'received', case when v_finance then (
      select coalesce(sum(r.amount), 0) from public.receipts r
       where r.deleted_at is null
         and r.received_on >= v_month and r.received_on < (v_month + interval '1 month')::date
    ) end);
end;
$$;

create function public.today_received(p_today date default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  return authz.today_received(coalesce(p_today, (now() at time zone 'Europe/Athens')::date));
end;
$$;

revoke all on function authz.today_received(date) from public, anon, authenticated;
revoke all on function public.today_received(date) from public, anon, authenticated;
grant execute on function public.today_received(date) to authenticated;
