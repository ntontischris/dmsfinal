-- «Ξεκινώ τη μέρα μου» (docs/flows/xekino-ti-mera/flow.md, G1): οι μισοτελειωμένοι οδηγοί ζουν στον λογαριασμό, όχι
-- στον browser — ίδια λίστα σε υπολογιστή και κινητό. Μία θέση ανά Χρήστη και δουλειά (οδηγό).
--
--  • public.today_flow_places: πού έμεινε κάθε οδηγός (βήμα, λόγος, μέρα Γυρίσματος, η γραμμή που άνοιξε η Σήμερα).
--      public.today_places()                 → όλες οι θέσεις του Χρήστη (jsonb πίνακας, νεότερη πρώτη).
--      public.today_place_set(p_job, p_place) → γράφει / αντικαθιστά τη θέση της δουλειάς.
--      public.today_place_clear(p_job)        → η δουλειά τελείωσε: η θέση σβήνει.
--  Όπως το «Αργότερα» (20261109110000_today_later.sql): μόνο ενεργός Χρήστης ομάδας (authz.today_require_team)· ανώνυμος ή
--  Χρήστης πελάτη: 42501. Καμία άμεση πρόσβαση στον πίνακα, πάντα για τον ίδιο τον Χρήστη (auth.uid()). Δεν γράφεται στο
--  Ίχνος (προσωπική θέση). Τα authz.* παίρνουν p_uid και p_now για τα τεστ.

-- ───────────── Πίνακας ─────────────

create table public.today_flow_places (
  user_id uuid not null references auth.users (id) on delete cascade,
  job text not null check (job ~ '^[a-z][a-z0-9-]{0,39}$'),
  place jsonb not null check (jsonb_typeof(place) = 'object' and pg_column_size(place) <= 2000),
  at timestamptz not null,
  primary key (user_id, job)
);

alter table public.today_flow_places enable row level security;
revoke all on table public.today_flow_places from anon, authenticated;

-- ───────────── Θέσεις ─────────────

create function authz.today_place_set(p_uid uuid, p_job text, p_place jsonb, p_now timestamptz) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.today_require_team(p_uid);
  if p_job is null or p_job !~ '^[a-z][a-z0-9-]{0,39}$' then
    raise exception 'Άγνωστος οδηγός' using errcode = 'P0001';
  end if;
  if p_place is null or jsonb_typeof(p_place) <> 'object' or pg_column_size(p_place) > 2000 then
    raise exception 'Άγνωστη θέση' using errcode = 'P0001';
  end if;
  if (select count(*) from public.today_flow_places f where f.user_id = p_uid and f.job <> p_job) >= 50 then
    raise exception 'Πάρα πολλοί μισοί οδηγοί' using errcode = 'P0001';
  end if;
  insert into public.today_flow_places as x (user_id, job, place, at) values (p_uid, p_job, p_place, p_now)
  on conflict (user_id, job) do update set place = excluded.place, at = excluded.at;
end;
$$;

create function authz.today_place_clear(p_uid uuid, p_job text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.today_require_team(p_uid);
  delete from public.today_flow_places f where f.user_id = p_uid and f.job = p_job;
end;
$$;

create function authz.today_places(p_uid uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.today_require_team(p_uid);
  return coalesce((select jsonb_agg(f.place || jsonb_build_object('job', f.job) order by f.at desc, f.job)
                     from public.today_flow_places f where f.user_id = p_uid), '[]'::jsonb);
end;
$$;

-- ───────────── Public RPC (authenticated) ─────────────

create function public.today_place_set(p_job text, p_place jsonb) returns void
language sql security definer set search_path = ''
as $$ select authz.today_place_set(auth.uid(), p_job, p_place, now()); $$;

create function public.today_place_clear(p_job text) returns void
language sql security definer set search_path = ''
as $$ select authz.today_place_clear(auth.uid(), p_job); $$;

create function public.today_places() returns jsonb
language sql stable security definer set search_path = ''
as $$ select authz.today_places(auth.uid()); $$;

-- ───────────── GDPR ─────────────

-- Η διαγραφή λογαριασμού (20261018130000_gdpr.sql, τελευταία μορφή στο 20261109110000_today_later.sql) σβήνει και τις
-- θέσεις των οδηγών. Ίδια με την προηγούμενη, συν τη γραμμή του today_flow_places.
create or replace function authz.gdpr_wipe_account(p_user uuid, p_mail text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.calendar_links where user_id = p_user;
  delete from public.today_prefs where user_id = p_user;
  delete from public.today_seen where user_id = p_user;
  delete from public.today_snoozes where user_id = p_user;
  delete from public.today_flow_places where user_id = p_user;
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
  authz.today_place_set(uuid, text, jsonb, timestamptz), authz.today_place_clear(uuid, text), authz.today_places(uuid),
  authz.gdpr_wipe_account(uuid, text)
  from public, anon, authenticated;

revoke all on function
  public.today_place_set(text, jsonb), public.today_place_clear(text), public.today_places()
  from public, anon;
grant execute on function
  public.today_place_set(text, jsonb), public.today_place_clear(text), public.today_places()
  to authenticated;
