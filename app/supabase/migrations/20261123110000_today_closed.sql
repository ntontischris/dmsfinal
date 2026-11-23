-- Σήμερα: «Έκλεισες N» (Σ-list Task 4). Μετράει πάνω σε ΟΛΑ όσα περιμένουν στις ομάδες 1–6, όχι μόνο στις 10 γραμμές.
--
--  • public.today_day_start: τα κλειδιά «κάρτα:id» που περίμεναν την πρώτη κλήση της μέρας (ώρα Αθήνας), ανά Χρήστη.
--  • public.today_closed() → { closed, later }:
--      πρώτη κλήση της μέρας → γράφει την αφετηρία με τα τωρινά κλειδιά και επιστρέφει {0, 0}.
--      αλλιώς: closed = πρωινά κλειδιά που δεν περιμένουν πια· later = πρωινά που περιμένουν ακόμα και είναι σε «Αργότερα».
--      Κλειδιά που εμφανίστηκαν μέσα στη μέρα δεν είναι στην αφετηρία και δεν μετράνε.
--  • authz.today_waiting_keys(p_uid, p_now): όλα τα κλειδιά των καρτών ομάδας που φαίνονται στον Χρήστη (ίδιο Δικαίωμα και
--    ίδιες κρυφές με το today_counts), εκτός της ομάδας «Η εταιρεία δουλεύει». Τα items τα κόβει το authz.today_rows(), οπότε
--    το ανεβάζουμε προσωρινά στο 1000 για τη συναλλαγή.
--  Μόνο ενεργός Χρήστης ομάδας (όπως το «Αργότερα»). Τα authz.* παίρνουν p_uid και p_now για τα τεστ.

-- ───────────── Πίνακας ─────────────

create table public.today_day_start (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  keys text[] not null default '{}',
  primary key (user_id, day)
);

alter table public.today_day_start enable row level security;
create policy today_day_start_own on public.today_day_start for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on table public.today_day_start from anon, authenticated;
grant select on table public.today_day_start to authenticated;

-- ───────────── Βοηθητικά ─────────────

-- Οι κάρτες της ομάδας «Η εταιρεία δουλεύει» (ίδιος κατάλογος με το GROUP_OF της οθόνης), δεν μετρούν στο «Έκλεισες».
create function authz.today_company_codes() returns text[]
language sql immutable set search_path = ''
as $$
  select array['health', 'readiness', 'gdpr', 'google_deletions', 'unanswered'];
$$;

create function authz.today_waiting_keys(p_uid uuid, p_now timestamptz) returns text[]
language plpgsql security definer set search_path = ''
as $$
declare
  v_old text := current_setting('today.rows', true);
  v_hidden text[] := coalesce((select x.hidden from public.today_prefs x where x.user_id = p_uid), '{}');
  v_items jsonb;
  v_keys text[] := '{}';
  c record;
begin
  perform set_config('today.rows', '1000', true);
  for c in
    select t.code, t.items_fn
      from authz.today_cards_for(p_uid, null, p_now) v
      join public.today_cards t on t.code = v.code
     where v.count is not null
       and not (v.code = any (authz.today_company_codes()))
       and not (v.code = any (v_hidden))
  loop
    execute format('select %s($1, $2, $3)', authz.today_fn_name(c.items_fn))
      into v_items using p_uid, null::uuid, p_now;
    v_keys := v_keys || array(
      select c.code || ':' || (i ->> 'id') from jsonb_array_elements(coalesce(v_items, '[]'::jsonb)) i);
  end loop;
  perform set_config('today.rows', coalesce(v_old, ''), true);
  return v_keys;
end;
$$;

-- ───────────── Έκλεισες ─────────────

create function authz.today_closed(p_uid uuid, p_now timestamptz) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_day date := (p_now at time zone 'Europe/Athens')::date;
  v_now text[];
  v_morning text[];
  v_snoozed text[];
begin
  perform authz.today_require_team(p_uid);
  v_now := authz.today_waiting_keys(p_uid, p_now);
  select d.keys into v_morning from public.today_day_start d where d.user_id = p_uid and d.day = v_day;
  if not found then
    insert into public.today_day_start (user_id, day, keys) values (p_uid, v_day, v_now)
      on conflict (user_id, day) do nothing;
    return jsonb_build_object('closed', 0, 'later', 0);
  end if;
  v_snoozed := array(select s.item_key from public.today_snoozes s
                      where s.user_id = p_uid and s.until > p_now);
  return jsonb_build_object(
    'closed', (select count(*)::integer from unnest(v_morning) k where not (k = any (v_now))),
    'later', (select count(*)::integer from unnest(v_morning) k where k = any (v_now) and k = any (v_snoozed)));
end;
$$;

create function public.today_closed() returns jsonb
language sql security definer set search_path = ''
as $$ select authz.today_closed(auth.uid(), now()); $$;

-- ───────────── GDPR ─────────────

-- Η διαγραφή λογαριασμού σβήνει και την αφετηρία της μέρας, όπως τις επισκέψεις και τα «Αργότερα».
create or replace function authz.gdpr_wipe_account(p_user uuid, p_mail text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.calendar_links where user_id = p_user;
  delete from public.today_prefs where user_id = p_user;
  delete from public.today_seen where user_id = p_user;
  delete from public.today_snoozes where user_id = p_user;
  delete from public.today_day_start where user_id = p_user;
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
  authz.today_company_codes(), authz.today_waiting_keys(uuid, timestamptz), authz.today_closed(uuid, timestamptz)
  from public, anon, authenticated;

revoke all on function public.today_closed() from public, anon;
grant execute on function public.today_closed() to authenticated;
