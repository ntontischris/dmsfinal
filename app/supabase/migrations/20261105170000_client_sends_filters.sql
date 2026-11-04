-- Walkthrough Ιδιοκτήτη 03, πρώτος γύρος (s11): φίλτρα Κατάσταση και Κανάλι στην καρτέλα «Τι στάλθηκε» της Σελίδας Πελάτη,
-- όπως στο Ιστορικό αποστολών (K3).
--
-- Αρχές:
--  • Ίδια με τον αρχικό ορισμό (20261015160000_send_history.sql), με δύο προαιρετικές παραμέτρους στο τέλος:
--      p_tab 'all' (προεπιλογή, όπως πριν) | 'sent' (ό,τι δεν περιμένει) | 'failed' (μόνο αποτυχίες), όπως η sends_list·
--      p_channel null | 'notification' | 'email'.
--    Το φίλτρο περνά στο authz.send_filter, που ήδη το υποστηρίζει. Τα Δικαιώματα δεν αλλάζουν.
--  • Η παλιά υπογραφή φεύγει (αλλιώς δύο εκδοχές θα ήταν αμφίσημες)· οι κλήσεις με ονόματα παραμέτρων μένουν ίδιες.

drop function public.client_sends(uuid, timestamptz, text, integer);

create function public.client_sends(
  p_client uuid, p_before timestamptz default null, p_before_id text default null, p_limit integer default 20,
  p_tab text default 'all', p_channel text default null
) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
  f authz.send_filter;
  v_rows jsonb;
begin
  if not authz.is_team_user() or p_client is null or not authz.can_see_client_id(p_client)
     or not (authz.has('automations.manage') or authz.has('health.view')
             or exists (select 1 from public.clients c where c.id = p_client and c.manager_id = auth.uid())) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if coalesce(p_tab, '') not in ('all', 'sent', 'failed') then
    raise exception 'Η κατάσταση είναι «όλες», «Στάλθηκαν» ή «Απέτυχαν»' using errcode = 'P0001';
  end if;
  if p_channel is not null and p_channel not in ('notification', 'email') then
    raise exception 'Το κανάλι είναι Ειδοποίηση ή email' using errcode = 'P0001';
  end if;
  if length(p_before_id) > 100 then
    raise exception 'Το «Παλαιότερα» δεν είναι έγκυρο' using errcode = 'P0001';
  end if;
  f := row(p_tab, p_channel, p_client, true, null, true, authz.send_hidden_types(),
           authz.has('finance.amounts') or authz.has('finance.invoices'), p_before, p_before_id, v_limit)::authz.send_filter;
  select coalesce(jsonb_agg(authz.send_json(row(x.*)::authz.send_row, false, null) order by x.at desc, x.ref desc), '[]'::jsonb)
    into v_rows
    from (select * from authz.sends_history(f) h order by h.at desc, h.ref desc limit v_limit + 1) x;
  return authz.sends_page(v_rows, v_limit);
end;
$$;

revoke all on function public.client_sends(uuid, timestamptz, text, integer, text, text) from public, anon;
grant execute on function public.client_sends(uuid, timestamptz, text, integer, text, text) to authenticated;
