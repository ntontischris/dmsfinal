-- Διόρθωση του authz.guard_last_owner (migration 20261007165854): το `old.role_id` στο ίδιο if με το tg_table_name έσπαζε
-- κάθε επιτυχή απενεργοποίηση Χρήστη ομάδας (ο planner αποτιμά την παράμετρο και σε trigger του team_users δεν υπάρχει role_id:
-- «record "old" has no field "role_id"»). Την απενεργοποίηση την περνούν οι πωλήσεις (επιστροφή Πελατών στην ουρά), οπότε
-- πρέπει να δουλεύει. Ίδια συμπεριφορά, με ξεχωριστό if ανά πίνακα.
create or replace function authz.guard_last_owner() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Μόνο όταν φεύγει Ρόλος Ιδιοκτήτης ή απενεργοποιείται Χρήστης.
  if tg_table_name = 'team_user_roles' then
    if not (select r.is_owner from public.roles r where r.id = (to_jsonb(old) ->> 'role_id')::uuid) then
      return null;
    end if;
  end if;
  if not exists (
    select 1
      from public.team_user_roles ur
      join public.roles r on r.id = ur.role_id
      join public.team_users u on u.user_id = ur.user_id
     where r.is_owner and u.is_active
  ) then
    raise exception 'Χρειάζεται πάντα τουλάχιστον ένας ενεργός Ιδιοκτήτης' using errcode = 'P0001';
  end if;
  return null;
end;
$$;
