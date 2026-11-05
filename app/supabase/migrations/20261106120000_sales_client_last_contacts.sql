-- Ταχύτητα (2026-11-05): το Pipeline χρειάζεται από την «εικόνα» του Πελάτη μόνο την τελευταία επαφή. Η πλήρης
-- public.sales_client_overview υπολογίζει και Παροχές, Υπόλοιπο, Συμφωνίες, Γυρίσματα (≈90ms)· αυτή μόνο την επαφή.
-- Ίδιοι κανόνες με το πεδίο last_contact της sales_client_overview (ίδιες γραμμές, ίδια τιμή):
--  • γραμμή μόνο για Πελάτη που ο Χρήστης ανοίγει (authz.can_see_client, «Βλέπει» ή «Διαχειρίζεται» Πελάτες, όχι αρχειοθετημένος)·
--  • επαφή = η πιο πρόσφατη Δραστηριότητα με είδος, σε Ευκαιρία που ο Χρήστης βλέπει (authz.can_see_opportunity_row).

create function public.sales_client_last_contacts(p_ids uuid[])
returns table (client_id uuid, last_contact timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if cardinality(p_ids) > 100 then
    raise exception 'Έως 100 Πελάτες τη φορά' using errcode = 'P0001';
  end if;
  return query
    select c.id,
           (select max(oa.occurred_at) from public.opportunity_activities oa
              join public.opportunities o on o.id = oa.opportunity_id
             where o.client_id = c.id and oa.kind_id is not null
               and authz.can_see_opportunity_row(o.client_id, o.manager_id))
      from public.clients c
     where c.id = any (coalesce(p_ids, '{}'::uuid[]))
       and c.archived_at is null
       and (authz.has('clients.view') or authz.has('clients.manage'))
       and authz.can_see_client(c.id, c.manager_id)
     order by c.id;
end;
$$;

revoke all on function public.sales_client_last_contacts(uuid[]) from public, anon, authenticated;
grant execute on function public.sales_client_last_contacts(uuid[]) to authenticated;
