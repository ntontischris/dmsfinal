-- Σήμερα «Έκλεισες N»: διόρθωση του γύρου 1 (review r0). Το 20261123110000_today_closed.sql μένει ως έχει.
--
--  • authz.today_loaded_cards(p_uid, p_now): μία γραμμή ανά κάρτα που ΦΟΡΤΩΣΕ τώρα (ίδιο Δικαίωμα και κρυφές με το
--    today_counts)· κάθε γραμμή έχει τα κλειδιά της. Μια κάρτα που πέφτει στα items της παραλείπεται (warning), δεν σπάει
--    το RPC. Η ομάδα «Η εταιρεία δουλεύει» βγαίνει έξω με τον ίδιο κατάλογο με το GROUP_OF του a1-list.ts.
--  • authz.today_closed: closed και later μετρούν μόνο πρωινά κλειδιά των καρτών που φορτώνουν τώρα. Κλειδί κρυμμένης,
--    αποτυχημένης ή χαμένου Δικαιώματος κάρτας δεν είναι ούτε κλεισμένο ούτε «αργότερα».
--  • authz.today_waiting_keys: ίδια υπογραφή, τώρα πάνω στο today_loaded_cards.
--  • Η βοηθητική today_company_codes (sql immutable) φεύγει· ο κατάλογος μπήκε μέσα στη συνάρτηση.

drop function if exists authz.today_company_codes();

create function authz.today_loaded_cards(p_uid uuid, p_now timestamptz)
returns table (code text, keys text[])
language plpgsql security definer set search_path = ''
as $$
declare
  v_old text := current_setting('today.rows', true);
  v_hidden text[] := coalesce((select x.hidden from public.today_prefs x where x.user_id = p_uid), '{}');
  v_items jsonb;
  c record;
begin
  perform set_config('today.rows', '1000', true);
  for c in
    select t.code as card_code, t.items_fn
      from authz.today_cards_for(p_uid, null, p_now) v
      join public.today_cards t on t.code = v.code
     where v.count is not null
       and not (v.code = any (v_hidden))
       -- Η εταιρεία δουλεύει (ίδιος κατάλογος με το GROUP_OF στο a1-list.ts): δεν μετράει.
       and not (v.code = any (array['health', 'readiness', 'gdpr', 'google_deletions', 'unanswered']))
  loop
    begin
      execute format('select %s($1, $2, $3)', authz.today_fn_name(c.items_fn))
        into v_items using p_uid, null::uuid, p_now;
      return query select c.card_code,
        array(select c.card_code || ':' || (i ->> 'id') from jsonb_array_elements(coalesce(v_items, '[]'::jsonb)) i);
    exception when others then
      raise warning 'today: η κάρτα % δεν φορτώνει για το κλείσιμο: %', c.card_code, sqlerrm;
    end;
  end loop;
  perform set_config('today.rows', coalesce(v_old, ''), true);
end;
$$;

create or replace function authz.today_waiting_keys(p_uid uuid, p_now timestamptz) returns text[]
language plpgsql security definer set search_path = ''
as $$
begin
  return array(select k from authz.today_loaded_cards(p_uid, p_now) l, unnest(l.keys) k);
end;
$$;

create or replace function authz.today_closed(p_uid uuid, p_now timestamptz) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_day date := (p_now at time zone 'Europe/Athens')::date;
  v_loaded text[] := '{}';
  v_now text[] := '{}';
  v_morning text[];
  v_snoozed text[];
  r record;
begin
  perform authz.today_require_team(p_uid);
  for r in select l.code, l.keys from authz.today_loaded_cards(p_uid, p_now) l loop
    v_loaded := v_loaded || r.code;
    v_now := v_now || r.keys;
  end loop;
  select d.keys into v_morning from public.today_day_start d where d.user_id = p_uid and d.day = v_day;
  if not found then
    insert into public.today_day_start (user_id, day, keys) values (p_uid, v_day, v_now)
      on conflict (user_id, day) do nothing;
    return jsonb_build_object('closed', 0, 'later', 0);
  end if;
  v_snoozed := array(select s.item_key from public.today_snoozes s
                      where s.user_id = p_uid and s.until > p_now);
  return jsonb_build_object(
    'closed', (select count(*)::integer from unnest(v_morning) k
                where split_part(k, ':', 1) = any (v_loaded) and not (k = any (v_now))),
    'later', (select count(*)::integer from unnest(v_morning) k
               where split_part(k, ':', 1) = any (v_loaded) and k = any (v_now) and k = any (v_snoozed)));
end;
$$;

revoke all on function authz.today_loaded_cards(uuid, timestamptz) from public, anon, authenticated;
