-- Προεπισκόπηση συγχώνευσης (b6): κάθε πλευρά του «Πιθανό διπλό» δείχνει και τις Συμφωνίες της (τίτλος, κατάσταση, είδος)
-- και πόσες Παραγωγές, Τιμολόγια και ενεργούς Χρήστες πελάτη έχει, ώστε να φαίνεται τι μεταφέρεται πριν τη συγχώνευση.
-- Ίδια συνάρτηση, ίδια δικαιώματα (την καλεί μόνο η sales_duplicate_pairs, που θέλει «Συγχωνεύει Πελάτες»).
-- Χωρίς ποσά: μόνο αριθμοί και καταστάσεις.

create or replace function public.sales_client_side(p_client uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
           'id', c.id, 'name', c.name, 'legal_name', c.legal_name, 'afm', c.afm, 'city', c.city,
           'contact_name', c.contact_name, 'contact_email', c.contact_email, 'contact_phone', c.contact_phone,
           'manager_name', m.name,
           'opportunities', (select count(*) from public.opportunities o where o.client_id = c.id),
           'agreements', coalesce((
             select jsonb_agg(jsonb_build_object('title', a.title, 'state', a.state, 'kind', a.kind)
                              order by a.created_at desc, a.id)
               from public.agreements a join public.opportunities o on o.id = a.opportunity_id
              where o.client_id = c.id), '[]'::jsonb),
           'productions', (select count(*) from public.productions p where p.client_id = c.id),
           'invoices', (select count(*) from public.invoices i where i.client_id = c.id),
           'client_users', (select count(*) from public.client_users u where u.client_id = c.id and u.removed_at is null)
         )
    from public.clients c
    left join public.team_users m on m.user_id = c.manager_id
   where c.id = p_client;
$$;
