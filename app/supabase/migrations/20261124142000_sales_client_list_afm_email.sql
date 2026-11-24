-- Λίστα Πελατών (sales_client_list): προστίθενται ΑΦΜ και email επαφής, ώστε συνονόματοι Πελάτες να ξεχωρίζουν
-- στις επιλογές Πελάτη (Τιμολόγια, Εισπράξεις). Μόνο για Πελάτη που ανοίγεις (can_open), όπως η πόλη· αλλιώς null / ''.
-- Ίδιος ορισμός με το 20261105160000_sales_owner_03_round_1.sql· αλλάζει ο τύπος επιστροφής, άρα drop + create
-- και ξανά το grant του 20261008120000.

drop function public.sales_client_list(text, integer, integer, uuid);

create function public.sales_client_list(
  p_query text default null,
  p_limit integer default 100,
  p_offset integer default 0,
  p_client uuid default null
)
returns table (
  id uuid,
  name text,
  city text,
  manager_id uuid,
  manager_name text,
  can_open boolean,
  open_opportunities integer,
  is_possible_duplicate boolean,
  afm text,
  contact_email text
)
language sql stable security definer set search_path = ''
as $$
  select c.id,
         c.name,
         case when v.can_open then c.city else '' end,
         c.manager_id,
         m.name,
         v.can_open,
         case when v.can_open then (
           select count(*)::integer from public.opportunities o
            where o.client_id = c.id and o.outcome = 'open'
              and authz.can_see_opportunity_row(o.client_id, o.manager_id)
         ) end,
         authz.has('clients.merge') and exists (
           select 1 from public.client_duplicate_flags f
            where (f.client_id = c.id or f.matches_client_id = c.id) and f.resolved_at is null
         ),
         case when v.can_open then c.afm end,
         case when v.can_open then c.contact_email else '' end
    from public.clients c
    left join public.team_users m on m.user_id = c.manager_id
    cross join lateral (select authz.can_see_client(c.id, c.manager_id) as can_open) v
   where (authz.has('clients.view') or authz.has('clients.manage'))
     and c.archived_at is null
     and (p_client is null or c.id = p_client)
     and (
       coalesce(trim(p_query), '') = ''
       or c.name ilike '%' || trim(p_query) || '%'
       or (v.can_open and (c.legal_name ilike '%' || trim(p_query) || '%' or c.city ilike '%' || trim(p_query) || '%'))
     )
   order by lower(c.name), c.id
   limit least(greatest(coalesce(p_limit, 100), 1), 100)
   offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.sales_client_list(text, integer, integer, uuid) from public, anon;
grant execute on function public.sales_client_list(text, integer, integer, uuid) to authenticated;
