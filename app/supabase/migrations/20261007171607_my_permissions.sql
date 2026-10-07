-- Τα Δικαιώματα του συνδεδεμένου Χρήστη, με το Εύρος τους. Η εφαρμογή τα χρησιμοποιεί για να κρύβει
-- ό,τι δεν επιτρέπεται (πλοήγηση, κουμπιά). Η απόφαση μένει στη βάση (RLS): αυτό είναι μόνο για την οθόνη.
create function public.my_permissions()
returns table (permission text, scope text)
language sql stable security definer set search_path = ''
as $$
  select p.code, authz.user_scope(auth.uid(), p.code)
    from public.permissions p
   where authz.user_scope(auth.uid(), p.code) is not null
   order by p.sort;
$$;

revoke all on function public.my_permissions() from public, anon;
grant execute on function public.my_permissions() to authenticated;
