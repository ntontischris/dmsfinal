-- Μηνύματα Jβ #161: η Συνομιλία του πελάτη. Το Jα δέχεται ήδη Χρήστη πελάτη στα messages_thread, message_send,
-- message_edit, message_delete και messages_mark_read (ορατότητα και γραφή μόνο για τον τρέχοντα Πελάτη του,
-- ετικέτες μόνο από τις μη ακυρωμένες Παραγωγές του). Ό,τι λείπει: η εφαρμογή πρέπει να μάθει ποιος είναι ο Πελάτης του
-- Χρήστη πελάτη (ο πίνακας client_users είναι κλειστός) και σε πόσα λεπτά φεύγει η σύνοψη αδιάβαστων (Μ4, για το κείμενο
-- «Ειδοποιήσεις»), αν έχει «Γράφει στη Συνομιλία» και πόσα λεπτά διορθώνει (για σημειώσεις χωρίς νήμα). Μία μικρή βοηθητική συνάρτηση, χωρίς ξαναορισμό των υπαρχόντων.

create function public.messages_client_context() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_client uuid := authz.client_user_client_id();
begin
  if v_client is null or not authz.client_user_has('c.chatRead') then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'clientId', v_client,
    'canWrite', authz.client_user_has('c.chatWrite'),
    'editMinutes', authz.message_edit_minutes(),
    'digestMinutes', (select s.digest_minutes from public.message_settings s where s.id));
end;
$$;

revoke all on function public.messages_client_context() from public, anon;
grant execute on function public.messages_client_context() to authenticated;
