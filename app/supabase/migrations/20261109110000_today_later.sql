-- Σήμερα ως ενημέρωση, κομμάτι 3 (#241 Σ8): «νέο από την τελευταία φορά» και «Αργότερα», ανά Χρήστη ομάδας.
--
--  • public.today_seen: πότε είδε ο Χρήστης τη Σήμερα. Μία «επίσκεψη» = συνεχόμενες προβολές με κενό κάτω από 30 λεπτά·
--    έτσι το ξαναφόρτωμα της σελίδας (π.χ. μετά από «Αργότερα») δεν σβήνει τα «νέο» της ίδιας επίσκεψης.
--      public.today_mark_seen() → η τελευταία στιγμή της ΠΡΟΗΓΟΥΜΕΝΗΣ επίσκεψης (null την πρώτη φορά) και γράφει το τώρα.
--  • public.today_snoozes: ποιες αποφάσεις κρύβονται ως αύριο το πρωί. item_key = κωδικός κάρτας + ':' + id της γραμμής.
--      public.today_snooze(p_key)   → until = το επόμενο 08:00 Αθήνας (πριν από τις 08:00: σήμερα 08:00, αλλιώς αύριο).
--      public.today_unsnooze(p_key) → ξαναφαίνεται αμέσως.
--      public.today_snoozed()       → τα κλειδιά που κρύβονται ακόμα (until > τώρα).
--  Μόνο ενεργός Χρήστης ομάδας (authz.user_is_team)· ανώνυμος ή Χρήστης πελάτη: 42501. Καμία άμεση πρόσβαση στους πίνακες,
--  μόνο από αυτά τα RPC, πάντα για τον ίδιο τον Χρήστη (auth.uid()). Καμία κρυφή μνήμη. Δεν γράφονται στο Ίχνος (προσωπική
--  προβολή, όπως οι Προτιμήσεις). Τα authz.* παίρνουν p_uid και p_now για τα τεστ· τα public καλούν με auth.uid() και now().

-- ───────────── Πίνακες ─────────────

create table public.today_seen (
  user_id uuid primary key references auth.users (id) on delete cascade,
  seen_at timestamptz not null,
  previous_seen_at timestamptz
);

create table public.today_snoozes (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_key text not null check (item_key ~ '^[a-z][a-z0-9_]{0,39}:[^[:space:]]{1,200}$'),
  until timestamptz not null,
  primary key (user_id, item_key)
);

alter table public.today_seen enable row level security;
alter table public.today_snoozes enable row level security;
revoke all on table public.today_seen, public.today_snoozes from anon, authenticated;

-- ───────────── Βοηθητικά ─────────────

create function authz.today_require_team(p_uid uuid) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_uid is null or not coalesce(authz.user_is_team(p_uid), false) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
end;
$$;

-- Το επόμενο 08:00 της Αθήνας μετά το p_now.
create function authz.today_next_morning(p_now timestamptz) returns timestamptz
language plpgsql stable set search_path = ''
as $$
declare
  v_local timestamp := p_now at time zone 'Europe/Athens';
begin
  return ((case when v_local::time < time '08:00' then v_local::date else v_local::date + 1 end) + time '08:00')
         at time zone 'Europe/Athens';
end;
$$;

-- ───────────── Νέο από την τελευταία φορά ─────────────

create function authz.today_mark_seen(p_uid uuid, p_now timestamptz) returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  r public.today_seen;
begin
  perform authz.today_require_team(p_uid);
  select * into r from public.today_seen s where s.user_id = p_uid for update;
  if not found then
    insert into public.today_seen (user_id, seen_at, previous_seen_at) values (p_uid, p_now, null)
    on conflict (user_id) do nothing;
    return null;
  end if;
  if p_now - r.seen_at < interval '30 minutes' then
    update public.today_seen s set seen_at = greatest(s.seen_at, p_now) where s.user_id = p_uid;
    return r.previous_seen_at;
  end if;
  update public.today_seen s set previous_seen_at = r.seen_at, seen_at = p_now where s.user_id = p_uid;
  return r.seen_at;
end;
$$;

-- ───────────── Αργότερα ─────────────

create function authz.today_snooze(p_uid uuid, p_key text, p_now timestamptz) returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_until timestamptz := authz.today_next_morning(p_now);
begin
  perform authz.today_require_team(p_uid);
  if p_key is null or p_key !~ '^[a-z][a-z0-9_]{0,39}:[^[:space:]]{1,200}$' then
    raise exception 'Άγνωστη απόφαση' using errcode = 'P0001';
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

create function authz.today_unsnooze(p_uid uuid, p_key text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.today_require_team(p_uid);
  delete from public.today_snoozes s where s.user_id = p_uid and s.item_key = p_key;
end;
$$;

create function authz.today_snoozed(p_uid uuid, p_now timestamptz) returns text[]
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.today_require_team(p_uid);
  return coalesce((select array_agg(s.item_key order by s.item_key) from public.today_snoozes s
                    where s.user_id = p_uid and s.until > p_now), '{}');
end;
$$;

-- ───────────── Public RPC (authenticated) ─────────────

create function public.today_mark_seen() returns timestamptz
language sql security definer set search_path = ''
as $$ select authz.today_mark_seen(auth.uid(), now()); $$;

create function public.today_snooze(p_key text) returns timestamptz
language sql security definer set search_path = ''
as $$ select authz.today_snooze(auth.uid(), p_key, now()); $$;

create function public.today_unsnooze(p_key text) returns void
language sql security definer set search_path = ''
as $$ select authz.today_unsnooze(auth.uid(), p_key); $$;

create function public.today_snoozed() returns text[]
language sql stable security definer set search_path = ''
as $$ select authz.today_snoozed(auth.uid(), now()); $$;

-- ───────────── GDPR ─────────────

-- Η διαγραφή λογαριασμού (20261018130000_gdpr.sql) σβήνει και τις επισκέψεις και τα «Αργότερα», όπως τις Προτιμήσεις.
create or replace function authz.gdpr_wipe_account(p_user uuid, p_mail text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.calendar_links where user_id = p_user;
  delete from public.today_prefs where user_id = p_user;
  delete from public.today_seen where user_id = p_user;
  delete from public.today_snoozes where user_id = p_user;
  delete from public.client_user_settings where user_id = p_user;
  delete from public.automation_optouts where user_id = p_user;
  delete from public.automation_unsubscribes where user_id = p_user;
  delete from public.notifications where user_id = p_user;
  delete from public.message_reads where user_id = p_user;
  delete from public.message_digest_marks where user_id = p_user;
  delete from public.assistant_conversations where user_id = p_user;
  update auth.users
     set email = p_mail, phone = null, encrypted_password = '', raw_user_meta_data = '{}'::jsonb,
         email_change = '', phone_change = '', email_change_token_new = '', confirmation_token = '', recovery_token = '',
         banned_until = timestamptz '2999-12-31 00:00:00+00', updated_at = now()
   where id = p_user;
  delete from auth.identities where user_id = p_user;
  delete from auth.refresh_tokens where user_id = p_user::text;
  delete from auth.sessions where user_id = p_user;
  delete from auth.mfa_factors where user_id = p_user;
  delete from auth.one_time_tokens where user_id = p_user;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.today_require_team(uuid), authz.today_next_morning(timestamptz), authz.today_mark_seen(uuid, timestamptz),
  authz.today_snooze(uuid, text, timestamptz), authz.today_unsnooze(uuid, text), authz.today_snoozed(uuid, timestamptz),
  authz.gdpr_wipe_account(uuid, text)
  from public, anon, authenticated;

revoke all on function
  public.today_mark_seen(), public.today_snooze(text), public.today_unsnooze(text), public.today_snoozed()
  from public, anon;
grant execute on function
  public.today_mark_seen(), public.today_snooze(text), public.today_unsnooze(text), public.today_snoozed()
  to authenticated;
