-- Μηνύματα e3: η Συνομιλία ανανεώνεται με Supabase Realtime αντί για ανανέωση κάθε 20″.
--
--  • Ιδιωτικά κανάλια Broadcast. Κάθε αλλαγή σε Μήνυμα ή Αίτημα στέλνει ένα «άλλαξε κάτι» χωρίς περιεχόμενο·
--    η οθόνη ξαναδιαβάζει τη Συνομιλία από τα RPC, άρα ό,τι βλέπει περνά πάντα από το RLS και την authz.message_visible.
--  • Δύο θέματα ανά Πελάτη: «chat-team:<πελάτης>» (κάθε αλλαγή, και τα Εσωτερικά) και «chat-client:<πελάτης>»
--    (μόνο ό,τι βλέπει ο πελάτης, ποτέ Εσωτερικό). Ποιος ακούει τι το αποφασίζει η authz.chat_topic_allowed.
--  • Το Realtime δεν είναι πάντα παρόν (π.χ. τοπική βάση χωρίς την υπηρεσία Realtime): τότε δεν στέλνεται τίποτα, η αποστολή
--    Μηνύματος δεν αποτυγχάνει ποτέ εξαιτίας του, και η οθόνη πέφτει στην ανανέωση κάθε 20″.

-- Μπορεί ο τρέχων Χρήστης να ακούει αυτό το θέμα;
--  • ομάδα: «Συνομιλεί με πελάτη» (το σήμα δεν έχει περιεχόμενο· τι θα δει το αποφασίζει η ανάγνωση).
--  • πελάτης: μόνο το θέμα του δικού του Πελάτη και μόνο με «Βλέπει Συνομιλία».
create function authz.chat_topic_allowed(p_topic text) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_topic ~ '^chat-team:[0-9a-f-]{36}$' then
    return coalesce(authz.is_team_user() and authz.has('messages.chat'), false);
  end if;
  if p_topic ~ '^chat-client:[0-9a-f-]{36}$' then
    return coalesce(
      not authz.is_team_user()
      and authz.client_user_has('c.chatRead')
      and substr(p_topic, 13)::uuid = authz.client_user_client_id(), false);
  end if;
  return false;
end;
$$;

revoke all on function authz.chat_topic_allowed(text) from public;
grant execute on function authz.chat_topic_allowed(text) to authenticated;

-- Στέλνει το «άλλαξε κάτι» στα θέματα του Πελάτη. Χωρίς Realtime ή με σφάλμα του δεν κάνει τίποτα.
create function authz.chat_signal(p_client uuid, p_internal boolean) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if to_regprocedure('realtime.send(jsonb, text, text, boolean)') is null then
    return;
  end if;
  execute 'select realtime.send($1, $2, $3, true)' using '{}'::jsonb, 'changed', 'chat-team:' || p_client;
  if not p_internal then
    execute 'select realtime.send($1, $2, $3, true)' using '{}'::jsonb, 'changed', 'chat-client:' || p_client;
  end if;
exception when others then
  -- Το Realtime είναι βοήθημα: ποτέ δεν ακυρώνει την αλλαγή.
  return;
end;
$$;

revoke all on function authz.chat_signal(uuid, boolean) from public;

create function authz.messages_after_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.chat_signal(new.client_id, new.is_internal);
  return null;
end;
$$;

create function authz.message_requests_after_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_msg public.messages;
begin
  select * into v_msg from public.messages m where m.id = new.message_id;
  if found then
    perform authz.chat_signal(v_msg.client_id, v_msg.is_internal);
  end if;
  return null;
end;
$$;

create trigger messages_realtime
after insert or update on public.messages
for each row execute function authz.messages_after_change();

create trigger message_requests_realtime
after insert or update on public.message_requests
for each row execute function authz.message_requests_after_change();

-- Ποιος ακούει: policy στο realtime.messages, μόνο αν η υπηρεσία Realtime έχει φτιάξει τον πίνακα.
do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute $p$
      create policy "chat topics: ομάδα και πελάτης του" on realtime.messages
        for select to authenticated
        using (realtime.messages.extension = 'broadcast' and authz.chat_topic_allowed(realtime.topic()))
    $p$;
  end if;
end;
$$;
