-- Ο πρώτος Ιδιοκτήτης (κεφ. 7, Φάση Α). Η εγγραφή είναι κλειστή (ADR 0003): ο πρώτος άνθρωπος μπαίνει με πρόσκληση
-- από τον developer. Όποιος συνδεθεί πρώτος σε σύστημα χωρίς κανέναν Χρήστη ομάδας γίνεται Ιδιοκτήτης.
-- Μετά τον πρώτο, η συνάρτηση δεν κάνει τίποτα: όλοι οι άλλοι μπαίνουν με πρόσκληση και Ρόλους.
-- Ζει στο public γιατί την καλεί η εφαρμογή (RPC) αμέσως μετά την είσοδο.
create function public.claim_first_owner() returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  mail text;
begin
  if uid is null then
    return false;
  end if;
  lock table public.team_users in share row exclusive mode;
  if exists (select 1 from public.team_users) then
    return false;
  end if;
  select u.email into mail from auth.users u where u.id = uid;
  insert into public.team_users (user_id, name, email) values (uid, split_part(mail, '@', 1), mail);
  insert into public.team_user_roles (user_id, role_id) select uid, r.id from public.roles r where r.is_owner;
  return true;
end;
$$;

revoke all on function public.claim_first_owner() from public, anon;
grant execute on function public.claim_first_owner() to authenticated;
