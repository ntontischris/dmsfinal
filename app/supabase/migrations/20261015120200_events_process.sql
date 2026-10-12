-- Ειδοποιήσεις Kα (#170), μέρος 3: ο επεξεργαστής της ουράς και τα RPC του καμπανακιού (δέσμη Α5, Α6, Α7, Α9, Α10).
--
--  • public.events_process: μόνο service_role (cron του λεπτού). Claim με for update skip locked και κλείδωμα 5 λεπτών.
--    Για κάθε Γεγονός, κάθε ενεργός Αυτοματισμός με timing 'immediate': παραλήπτες από την ΤΡΕΧΟΥΣΑ κατάσταση, φίλτρα
--    (κόστος, πελάτης, ορατότητα, Προτιμήσεις, ο ίδιος ο actor), κείμενο στη γλώσσα του παραλήπτη, σημάδι «μία φορά»
--    και μετά Ειδοποίηση ή email (kind 'automation'). Σφάλμα σε ένα Γεγονός: attempts + 1 και συνέχεια· μετά από 5
--    μένει ανεπεξέργαστο (Kε). Σβήνει τις Ειδοποιήσεις παλαιότερες από 90 μέρες.
--  • Ένας Χρήστης δεν παίρνει δύο Ειδοποιήσεις για το ίδιο Γεγονός από δύο Αυτοματισμούς (π.χ. Υπεύθυνος και Μέλος).
--  • Εξωτερικά μέλη Συνεργείου δεν υπάρχουν στη βάση: παραλήπτες είναι μόνο Χρήστες ομάδας (ενεργοί) και Χρήστες πελάτη
--    (μη αφαιρεμένοι, του Πελάτη του Γεγονότος).
--  • RPC καμπανακιού: κάθε Χρήστης βλέπει μόνο τις δικές του· ο Χρήστης πελάτη μόνο του τρέχοντος Πελάτη (ή χωρίς Πελάτη).
--    Ξένο ή ανύπαρκτο id → 42501 με το ίδιο μήνυμα.

-- ───────────── Παραλήπτες ─────────────

-- Όσοι «Μεταβιβάζουν Υπεύθυνο» (clients.transfer), ενεργοί.
create function authz.ev_transfer_holders() returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select u.user_id from public.team_users u
   where u.is_active and authz.user_scope(u.user_id, 'clients.transfer') is not null;
$$;

-- Ένας υπεύθυνος· αν λείπει ή δεν είναι ενεργός, όσοι «Μεταβιβάζουν Υπεύθυνο» (Α7).
create function authz.ev_owner_or_fallback(p_user uuid) returns setof uuid
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_user is not null and authz.user_is_team(p_user) then
    return next p_user;
  else
    return query select * from authz.ev_transfer_holders();
  end if;
end;
$$;

create function authz.ev_uuid(p jsonb, p_key text) returns uuid
language sql immutable set search_path = ''
as $$ select nullif(p ->> p_key, '')::uuid; $$;

-- Ο τρέχων ανατεθειμένος της οντότητας (Παραδοτέο ή Αίτημα), αλλιώς ό,τι γράφει το Γεγονός.
create function authz.ev_assignee(e public.events) returns uuid
language sql stable security definer set search_path = ''
as $$
  select case e.entity
    when 'deliverables' then (select d.assignee_id from public.deliverables d where d.id = e.entity_id)
    when 'message_requests' then (select r.assignee_id from public.message_requests r where r.message_id = e.entity_id)
    else authz.ev_uuid(e.payload, 'assignee_id')
  end;
$$;

create function authz.event_relative_users(e public.events, p_relative text) returns setof uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_production uuid := authz.ev_uuid(e.payload, 'production_id');
begin
  case p_relative
    when 'client' then
      return query select cu.user_id from public.client_users cu where cu.client_id = e.client_id and cu.removed_at is null;
    when 'actor' then
      return query select e.actor_id where e.actor_id is not null;
    when 'owner' then
      return query select u.user_id from public.team_users u where authz.user_is_owner(u.user_id);
    when 'crew' then
      return query select fc.user_id from public.filming_crew fc where fc.filming_id = authz.ev_uuid(e.payload, 'filming_id');
    when 'production_owner' then
      return query select * from authz.ev_owner_or_fallback((select p.owner_id from public.productions p where p.id = v_production));
    when 'production_members' then
      return query select p.owner_id from public.productions p where p.id = v_production and p.owner_id is not null
                   union select pm.user_id from public.production_members pm where pm.production_id = v_production;
    when 'client_owner' then
      return query select * from authz.ev_owner_or_fallback((select c.manager_id from public.clients c where c.id = e.client_id));
    when 'opportunity_owner' then
      return query select * from authz.ev_owner_or_fallback(
        (select o.manager_id from public.opportunities o where o.id = authz.ev_uuid(e.payload, 'opportunity_id')));
    when 'assignee' then
      return query select * from authz.ev_owner_or_fallback(authz.ev_assignee(e));
    when 'requester' then
      return query select authz.ev_uuid(e.payload, 'requester_id') where authz.ev_uuid(e.payload, 'requester_id') is not null;
    when 'approval_requester' then
      return query select authz.ev_uuid(e.payload, 'approval_requester_id')
                    where authz.ev_uuid(e.payload, 'approval_requester_id') is not null;
    when 'mentioned' then
      return query select x::uuid from jsonb_array_elements_text(coalesce(e.payload -> 'mentioned_ids', '[]'::jsonb)) x;
    else
      return;
  end case;
end;
$$;

create function authz.ev_candidates(a public.automations, e public.events) returns setof uuid
language plpgsql stable security definer set search_path = ''
as $$
begin
  if a.recipient_kind = 'relative' then
    return query select * from authz.event_relative_users(e, a.recipient_relative);
  elsif a.recipient_kind = 'permission' then
    return query
      select u.user_id from public.team_users u
       where u.is_active and authz.user_scope(u.user_id, a.recipient_permission) is not null
      union
      select cu.user_id from public.client_users cu
        join public.role_permissions rp on rp.role_id = cu.role_id and rp.permission = a.recipient_permission
       where cu.client_id = e.client_id and cu.removed_at is null;
  elsif a.recipient_kind = 'users' then
    return query select unnest(a.recipient_user_ids);
  end if;
end;
$$;

-- Έχει ο Χρήστης πελάτη ένα από αυτά τα Δικαιώματα στον Πελάτη;
create function authz.ev_client_has(p_user uuid, p_client uuid, p_perms text[]) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.client_users cu
      join public.role_permissions rp on rp.role_id = cu.role_id
     where cu.user_id = p_user and cu.client_id = p_client and cu.removed_at is null and rp.permission = any (p_perms));
$$;

-- Ορατότητα της οντότητας τη στιγμή της αποστολής. «Νέο Μήνυμα» πάει μόνο στην άλλη πλευρά (πελάτης → ομάδα και αντίστροφα).
create function authz.event_visible_to(e public.events, p_user uuid, p_is_client boolean) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when e.entity in ('messages', 'message_requests') and p_is_client then
      authz.ev_client_has(p_user, e.client_id, array['c.chatRead'])
      and (e.type <> 'message.created' or e.payload ->> 'author_kind' = 'team')
    when e.entity in ('messages', 'message_requests') then
      (authz.message_visible_to(p_user, e.entity_id)
       or (e.type = 'message.mentioned' and authz.message_mentionable(p_user)
           and exists (select 1 from public.messages m where m.id = e.entity_id and p_user = any (m.mentions))))
      and (e.type <> 'message.created' or e.payload ->> 'author_kind' = 'client')
    when not p_is_client then true
    when e.entity in ('deliverables', 'productions') then authz.ev_client_has(p_user, e.client_id, array['c.productions', 'c.approve'])
    when e.entity = 'filmings' then authz.ev_client_has(p_user, e.client_id, array['c.book', 'c.productions'])
    when e.entity in ('agreements', 'agreement_costs') then authz.ev_client_has(p_user, e.client_id, array['c.agreements'])
    else true
  end;
$$;

-- Ένας τελικός παραλήπτης: Χρήστης ομάδας ή πελάτη, με όνομα, email και γλώσσα.
create type authz.ev_recipient as (user_id uuid, is_client boolean, name text, email text, locale text);

-- Οι τελικοί παραλήπτες ενός Αυτοματισμού για ένα Γεγονός, με γλώσσα και email.
create function authz.ev_recipients(a public.automations, e public.events)
returns setof authz.ev_recipient
language sql stable security definer set search_path = ''
as $$
  with cand as (
    select distinct c as uid from authz.ev_candidates(a, e) c where c is not null
  ), people as (
    select t.user_id, false as is_client, t.name, t.email, t.language as locale
      from public.team_users t join cand on cand.uid = t.user_id
     where t.is_active
    union all
    select cu.user_id, true, cu.name, u.email, coalesce((select t.language from public.team_users t where t.user_id = cu.user_id), 'el')
      from public.client_users cu join cand on cand.uid = cu.user_id join auth.users u on u.id = cu.user_id
     where cu.client_id = e.client_id and cu.removed_at is null
  )
  select row(p.user_id, p.is_client, p.name, p.email, p.locale)::authz.ev_recipient
    from people p join public.event_types et on et.code = e.type
   where (not et.is_cost_only or (not p.is_client and authz.user_scope(p.user_id, 'finance.cost') is not null))
     and (et.is_client_facing or not p.is_client)
     and authz.event_visible_to(e, p.user_id, p.is_client)
     and ((a.recipient_kind = 'relative' and a.recipient_relative = 'actor') or p.user_id is distinct from e.actor_id)
     and not exists (select 1 from public.automation_optouts o
                      where o.user_id = p.user_id and o.automation_id = a.id and (not p.is_client or not a.is_essential));
$$;

-- ───────────── Κείμενο ─────────────

-- Αντικατάσταση {μεταβλητών}· όσες δεν έχουν τιμή φεύγουν. Το escaping γίνεται εκεί που αποδίδεται (React, email).
create function authz.ev_render(p_text text, p_vars jsonb) returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v_text text := coalesce(p_text, '');
  v_key text;
  v_value text;
begin
  for v_key, v_value in select k, v from jsonb_each_text(coalesce(p_vars, '{}'::jsonb)) as x (k, v) loop
    v_text := replace(v_text, '{' || v_key || '}', coalesce(v_value, ''));
  end loop;
  return btrim(regexp_replace(v_text, '\{[A-Za-z]+\}', '', 'g'));
end;
$$;

create function authz.ev_company() returns text
language sql stable security definer set search_path = ''
as $$
  select coalesce(nullif(trim(c.trade_name), ''), nullif(trim(c.legal_name), ''), 'DMS') from public.company_settings c where c.id;
$$;

-- ───────────── Αποστολή σε έναν παραλήπτη ─────────────

create function authz.ev_deliver(
  a public.automations, e public.events, r authz.ev_recipient, p_now timestamptz
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_locale text := case when r.locale = 'en' and length(trim(a.body_en)) > 0 then 'en' else 'el' end;
  v_link text := case when r.is_client then coalesce(e.payload ->> 'client_link', e.payload ->> 'link') else e.payload ->> 'link' end;
  v_vars jsonb := e.payload || jsonb_build_object('recipientName', r.name, 'companyName', authz.ev_company(),
                                                  'link', coalesce(v_link, ''));
  v_label text := (select case v_locale when 'en' then t.label_en else t.label_el end from public.event_types t where t.code = e.type);
  v_subject text;
  v_body text;
  v_send bigint;
  v_ref uuid;
begin
  if a.channel = 'notification'
     and exists (select 1 from public.notifications n where n.event_id = e.id and n.user_id = r.user_id) then
    return false;
  end if;
  if a.channel = 'email' and coalesce(trim(r.email), '') = '' then
    return false;
  end if;
  insert into public.automation_sends (automation_id, event_id, case_key, recipient_key, channel, created_at)
  values (a.id, e.id, e.case_key, r.user_id::text, a.channel, p_now)
  on conflict (automation_id, case_key, recipient_key) do nothing
  returning id into v_send;
  if v_send is null then
    return false;
  end if;
  v_subject := authz.ev_render(coalesce(case v_locale when 'en' then nullif(trim(a.subject_en), '') end, a.subject_el, v_label), v_vars);
  v_body := authz.ev_render(case v_locale when 'en' then a.body_en else a.body_el end, v_vars);
  if a.channel = 'notification' then
    insert into public.notifications (user_id, client_id, automation_id, event_id, title, body, link, created_at)
    values (r.user_id, e.client_id, a.id, e.id, left(coalesce(nullif(v_subject, ''), v_label), 300), left(v_body, 2000),
            nullif(v_link, ''), p_now)
    returning id into v_ref;
    update public.automation_sends set notification_id = v_ref where id = v_send;
  else
    insert into public.email_outbox (kind, to_name, to_email, locale, payload)
    values ('automation', coalesce(r.name, ''), lower(trim(r.email)), v_locale,
            jsonb_strip_nulls(jsonb_build_object('subject', left(coalesce(nullif(v_subject, ''), v_label), 300),
              'body', left(v_body, 2000), 'link', nullif(v_link, ''), 'automationId', a.id)))
    returning id into v_ref;
    update public.automation_sends set email_outbox_id = v_ref where id = v_send;
  end if;
  return true;
end;
$$;

create function authz.event_dispatch(e public.events, p_now timestamptz) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  a public.automations;
  r authz.ev_recipient;
  v_count integer := 0;
begin
  for a in
    select * from public.automations x
     where x.event_type = e.type and x.is_enabled and x.timing = 'immediate'
     order by x.sort, x.created_at, x.id
  loop
    for r in select * from authz.ev_recipients(a, e) loop
      if authz.ev_deliver(a, e, r, p_now) then
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;
  return v_count;
end;
$$;

-- ───────────── Ο επεξεργαστής (service_role) ─────────────

-- Επιστρέφει { processed, failed, sent, cleaned }. Το p_now (null = τώρα) υπάρχει για τα τεστ.
create function public.events_process(p_limit integer default 100, p_now timestamptz default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_ids bigint[];
  v_id bigint;
  v_event public.events;
  v_processed integer := 0;
  v_failed integer := 0;
  v_sent integer := 0;
  v_cleaned integer := 0;
begin
  select coalesce(array_agg(x.id order by x.id), '{}') into v_ids
    from (select e.id from public.events e
           where e.processed_at is null and e.attempts < 5 and (e.locked_until is null or e.locked_until < v_now)
           order by e.id
           limit greatest(1, least(coalesce(p_limit, 100), 500))
           for update skip locked) x;
  update public.events set locked_until = v_now + interval '5 minutes' where id = any (v_ids);
  foreach v_id in array v_ids loop
    select * into v_event from public.events e where e.id = v_id;
    begin
      v_sent := v_sent + authz.event_dispatch(v_event, v_now);
      update public.events set processed_at = v_now, locked_until = null where id = v_id;
      v_processed := v_processed + 1;
    exception when others then
      update public.events
         set attempts = attempts + 1, last_error = left(sqlerrm, 500), locked_until = null
       where id = v_id;
      v_failed := v_failed + 1;
    end;
  end loop;
  delete from public.notifications n where n.created_at < v_now - interval '90 days';
  get diagnostics v_cleaned = row_count;
  return jsonb_build_object('processed', v_processed, 'failed', v_failed, 'sent', v_sent, 'cleaned', v_cleaned);
end;
$$;

-- ───────────── Καμπανάκι και σελίδα Ειδοποιήσεων ─────────────

-- Οι Ειδοποιήσεις που βλέπει ο συνδεδεμένος: δικές του· για Χρήστη πελάτη μόνο του τρέχοντος Πελάτη ή χωρίς Πελάτη.
create function authz.notification_mine(n public.notifications) returns boolean
language sql stable security definer set search_path = ''
as $$
  select n.user_id = auth.uid()
     and (authz.is_team_user() or n.client_id is null or n.client_id = authz.client_user_client_id());
$$;

create function authz.notification_json(n public.notifications) returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object('id', n.id, 'title', n.title, 'body', n.body, 'link', n.link,
                            'createdAt', n.created_at, 'isRead', n.read_at is not null);
$$;

-- { unread, latest: [5 πιο πρόσφατες] }
create function public.notifications_bell() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require_notification_user();
  return jsonb_build_object(
    'unread', (select count(*) from public.notifications n where authz.notification_mine(n) and n.read_at is null),
    'latest', coalesce((
      select jsonb_agg(authz.notification_json(x) order by x.created_at desc, x.id desc)
        from (select n.* from public.notifications n where authz.notification_mine(n)
               order by n.created_at desc, n.id desc limit 5) x), '[]'::jsonb));
end;
$$;

-- { items: [...], hasMore, unread }. p_filter 'unread' | 'all'· p_before για «Παλαιότερες»· p_limit 1–50.
create function public.notifications_list(p_filter text default 'unread', p_before timestamptz default null, p_limit integer default 20)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
  v_rows jsonb;
begin
  perform authz.require_notification_user();
  if coalesce(p_filter, '') not in ('unread', 'all') then
    raise exception 'Το φίλτρο είναι «Αδιάβαστες» ή «Όλες»' using errcode = 'P0001';
  end if;
  select coalesce(jsonb_agg(authz.notification_json(x) order by x.created_at desc, x.id desc), '[]'::jsonb) into v_rows
    from (select n.* from public.notifications n
           where authz.notification_mine(n)
             and (p_filter = 'all' or n.read_at is null)
             and (p_before is null or n.created_at < p_before)
           order by n.created_at desc, n.id desc
           limit v_limit + 1) x;
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(t.v order by t.i) from jsonb_array_elements(v_rows) with ordinality as t (v, i)
                        where t.i <= v_limit), '[]'::jsonb),
    'hasMore', jsonb_array_length(v_rows) > v_limit,
    'unread', (select count(*) from public.notifications n where authz.notification_mine(n) and n.read_at is null));
end;
$$;

-- Σημειώνει διαβασμένη και επιστρέφει το link (ή null).
create function public.notification_open(p_id uuid) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  n public.notifications;
begin
  perform authz.require_notification_user();
  select * into n from public.notifications x where x.id = p_id;
  if not found or not authz.notification_mine(n) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  update public.notifications set read_at = coalesce(read_at, clock_timestamp()) where id = p_id;
  return n.link;
end;
$$;

-- Όλες διαβασμένες· επιστρέφει πόσες άλλαξαν.
create function public.notifications_mark_all_read() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  perform authz.require_notification_user();
  update public.notifications n set read_at = clock_timestamp()
   where n.read_at is null and authz.notification_mine(n);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.ev_transfer_holders(), authz.ev_owner_or_fallback(uuid), authz.ev_uuid(jsonb, text), authz.ev_assignee(public.events),
  authz.event_relative_users(public.events, text), authz.ev_candidates(public.automations, public.events),
  authz.ev_client_has(uuid, uuid, text[]), authz.event_visible_to(public.events, uuid, boolean),
  authz.ev_recipients(public.automations, public.events), authz.ev_render(text, jsonb), authz.ev_company(),
  authz.ev_deliver(public.automations, public.events, authz.ev_recipient, timestamptz), authz.event_dispatch(public.events, timestamptz),
  authz.notification_mine(public.notifications), authz.notification_json(public.notifications)
  from public, anon, authenticated;

revoke all on function public.events_process(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.events_process(integer, timestamptz) to service_role;

revoke all on function
  public.notifications_bell(), public.notifications_list(text, timestamptz, integer),
  public.notification_open(uuid), public.notifications_mark_all_read()
  from public, anon;
grant execute on function
  public.notifications_bell(), public.notifications_list(text, timestamptz, integer),
  public.notification_open(uuid), public.notifications_mark_all_read()
  to authenticated;
