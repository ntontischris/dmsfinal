-- «Ξεκινώ τη μέρα μου» (docs/flows/xekino-ti-mera): δύο συμπληρώματα για τη λίστα «Τι πρέπει να κάνω τώρα».
--
--  • authz.notification_json: προστίθεται 'type' = ο τύπος του Γεγονότος της Ειδοποίησης (events.type, null αν δεν έχει).
--    Από αυτόν η λίστα ξέρει ποιες Ειδοποιήσεις ζητούν κίνηση (σταθερή λίστα στον κώδικα). Χωρίς αυτό: καμία γραμμή
--    Ειδοποίησης, η λίστα δουλεύει κανονικά.
--  • public.today_snooze_until(p_key, p_until): «Αργότερα» με την ώρα που διάλεξε ο Χρήστης (όχι μόνο ως το επόμενο 08:00).
--    Η εγγραφή ζει μία μέρα μετά την ώρα, ώστε η γραμμή να ξαναβγεί με «Νέο ·» (η ώρα γράφεται στο κλειδί ως «@<ms>»).
--    Χωρίς αυτό: ο κώδικας πέφτει στο today_snooze (ως το επόμενο 08:00).
--  Κανένας νέος πίνακας, καμία αλλαγή σχήματος.

create or replace function authz.notification_json(n public.notifications) returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object('id', n.id, 'title', n.title, 'body', n.body, 'link', n.link,
                            'createdAt', n.created_at, 'isRead', n.read_at is not null,
                            'type', (select e.type from public.events e where e.id = n.event_id));
$$;

create function authz.today_snooze_until(p_uid uuid, p_key text, p_until timestamptz, p_now timestamptz)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_until timestamptz := p_until + interval '1 day';
begin
  perform authz.today_require_team(p_uid);
  if p_key is null or p_key !~ '^[a-z][a-z0-9_]{0,39}:[^[:space:]]{1,200}$' then
    raise exception 'Άγνωστη απόφαση' using errcode = 'P0001';
  end if;
  if p_until is null or p_until <= p_now or p_until > p_now + interval '60 days' then
    raise exception 'Άγνωστη ώρα για αργότερα' using errcode = 'P0001';
  end if;
  delete from public.today_snoozes s where s.user_id = p_uid and s.until <= p_now;
  if (select count(*) from public.today_snoozes s where s.user_id = p_uid and s.item_key <> p_key) >= 200 then
    raise exception 'Πάρα πολλές αποφάσεις για αργότερα' using errcode = 'P0001';
  end if;
  insert into public.today_snoozes as x (user_id, item_key, until) values (p_uid, p_key, v_until)
  on conflict (user_id, item_key) do update set until = excluded.until;
  return v_until;
end;
$$;

create function public.today_snooze_until(p_key text, p_until timestamptz) returns timestamptz
language sql security definer set search_path = ''
as $$ select authz.today_snooze_until(auth.uid(), p_key, p_until, now()); $$;

revoke all on function authz.today_snooze_until(uuid, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.today_snooze_until(text, timestamptz) from public, anon;
grant execute on function public.today_snooze_until(text, timestamptz) to authenticated;
