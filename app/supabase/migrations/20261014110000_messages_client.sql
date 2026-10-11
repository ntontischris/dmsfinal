-- Μηνύματα Jβ #161: η Συνομιλία του πελάτη. Το Jα δέχεται ήδη Χρήστη πελάτη στα messages_thread, message_send,
-- message_edit, message_delete και messages_mark_read (ορατότητα και γραφή μόνο για τον τρέχοντα Πελάτη του,
-- ετικέτες μόνο από τις μη ακυρωμένες Παραγωγές του). Ό,τι λείπει είναι να μάθει η εφαρμογή ποιος είναι ο Πελάτης του
-- Χρήστη πελάτη: ο πίνακας client_users είναι κλειστός. Μία μικρή βοηθητική συνάρτηση, χωρίς ξαναορισμό των υπαρχόντων.

create function public.messages_my_client() returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_client uuid := authz.client_user_client_id();
begin
  if v_client is null or not authz.client_user_has('c.chatRead') then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return v_client;
end;
$$;

revoke all on function public.messages_my_client() from public, anon;
grant execute on function public.messages_my_client() to authenticated;
