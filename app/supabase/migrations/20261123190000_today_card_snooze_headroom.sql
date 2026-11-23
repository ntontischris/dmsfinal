-- Σήμερα: μετά το «Αργότερα», οι επόμενες γραμμές της κάρτας ξαναμπαίνουν. Η public.today_card αυξάνει το όριο
-- γραμμών (authz.today_rows()) κατά τις ενεργές αναβολές του Χρήστη για αυτή την κάρτα, ώστε το φιλτράρισμα της
-- εφαρμογής να μη μικραίνει τη λίστα. Η αύξηση είναι τοπική στη συναλλαγή και επαναφέρεται αμέσως μετά τα items,
-- ώστε δύο κλήσεις στην ίδια συναλλαγή να μην αθροίζονται. Η υπόλοιπη συνάρτηση μένει όπως στο 20261016100000.

create or replace function public.today_card(p_code text, p_now timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_client uuid;
  v_now timestamptz := coalesce(p_now, now());
  c public.today_cards;
  v_count integer;
  v_items jsonb;
  v_base integer := authz.today_rows();
  v_snoozed integer;
begin
  perform authz.require_notification_user();
  v_client := authz.today_client();
  select * into c from public.today_cards t
   where t.code = p_code and t.audience = case when v_client is null then 'team' else 'client' end;
  if found and not (c.needs_second_person and authz.today_is_solo()) then
    execute format('select %s($1, $2, $3)', authz.today_fn_name(c.count_fn)) into v_count using v_user, v_client, v_now;
  end if;
  if v_count is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  v_snoozed := (select count(*)::integer from public.today_snoozes s
                 where s.user_id = v_user and starts_with(s.item_key, c.code || ':') and s.until > v_now);
  perform set_config('today.rows', (v_base + v_snoozed)::text, true);
  execute format('select %s($1, $2, $3)', authz.today_fn_name(c.items_fn)) into v_items using v_user, v_client, v_now;
  perform set_config('today.rows', v_base::text, true);
  return jsonb_build_object('code', c.code, 'count', v_count, 'items', coalesce(v_items, '[]'::jsonb));
end;
$$;

revoke all on function public.today_card(text, timestamptz) from public, anon;
grant execute on function public.today_card(text, timestamptz) to authenticated;
