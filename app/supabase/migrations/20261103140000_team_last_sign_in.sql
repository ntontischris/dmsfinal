-- N1 Ομάδα (νέα εμφάνιση): «Μέλος από» και «Τελευταία είσοδος» κάθε Χρήστη ομάδας. Η είσοδος ζει στο auth.users, που ο authenticated δεν διαβάζει·
-- μόνο για όποιον «Προσκαλεί και απενεργοποιεί Χρήστες ομάδας». Μόνο ανάγνωση, μία κλήση για όλη τη λίστα.
create function public.team_last_sign_in() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require('access.team');
  return coalesce((
    select jsonb_agg(jsonb_build_object('userId', t.user_id, 'createdAt', t.created_at, 'lastSignInAt', au.last_sign_in_at) order by t.user_id)
      from public.team_users t
      join auth.users au on au.id = t.user_id), '[]'::jsonb);
end;
$$;

revoke all on function public.team_last_sign_in() from public, anon, authenticated;
grant execute on function public.team_last_sign_in() to authenticated;
