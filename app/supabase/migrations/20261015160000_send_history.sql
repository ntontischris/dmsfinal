-- Ειδοποιήσεις Kε (#174), μέρος 1: Ιστορικό αποστολών (K3, καρτέλα «Αποστολές» του Πελάτη) και διατήρηση (δέσμη Α13).
--
--  • Μία ενιαία όψη: κάθε σημάδι automation_sends (Ειδοποίηση ή email, με την κατάσταση της ουράς), κάθε γραμμή email_outbox
--    που δεν είναι από σημάδι (Μηνύματα συστήματος, παλιά kinds, «Ξαναστείλε») και κάθε γραμμή email_log που δεν πέρασε από
--    την ουρά (σύνδεσμος εισόδου, επαναφορά, Συμφωνίες). Ποτέ περιεχόμενο, link ή κωδικός: μόνο Γεγονός/είδος, παραλήπτης,
--    κατάσταση, προσπάθειες και λόγος.
--  • Το σημάδι κρατά πλέον τον Πελάτη του Γεγονότος (client_id) για το φίλτρο και την καρτέλα του Πελάτη. Το id της
--    Ειδοποίησης μένει και όταν η Ειδοποίηση σβηστεί στις 90 μέρες (χωρίς FK), ώστε η γραμμή να μένει «στάλθηκε».
--  • «Ξαναστείλε»: μόνο αποτυχημένο email, μία φορά ανά αποστολή (email_outbox.retry_of, UNIQUE), με Ίχνος (email_outbox_audit).
--  • Δικαίωμα: automations.manage ή health.view για το K3· για την καρτέλα του Πελάτη επιπλέον ο Υπεύθυνος του Πελάτη.
--    Τιμολόγια/Εισπράξεις/Τιμολογητέα μόνο με «Βλέπει ποσά» ή «Καταχωρεί Τιμολόγια», Γεγονότα κόστους μόνο με «Βλέπει κόστος».
--  • Διατήρηση 12 μηνών (sends_cleanup, service_role): σημάδια, email_log και τελικές γραμμές της ουράς. Μένουν τα σημάδια που
--    χρειάζεται ακόμα το «μία φορά»: το ληξιπρόθεσμο Τιμολόγιο που έχει υπόλοιπο.
--  • Ξαναγράφεται από τον ΤΕΛΕΥΤΑΙΟ ορισμό (20261015140100_automation_timing.sql): authz.ev_deliver.

-- ───────────── Σημάδια: Πελάτης, Ειδοποίηση χωρίς FK, δείκτες ─────────────

alter table public.automation_sends add column client_id uuid references public.clients (id);

update public.automation_sends s set client_id = e.client_id from public.events e where e.id = s.event_id;

do $$
declare
  v_name text;
begin
  select c.conname into v_name from pg_constraint c
   where c.conrelid = 'public.automation_sends'::regclass and c.contype = 'f'
     and pg_get_constraintdef(c.oid) like '%notifications%';
  execute format('alter table public.automation_sends drop constraint %I', v_name);
end;
$$;

create index automation_sends_created_idx on public.automation_sends (created_at desc, id desc);
create index automation_sends_client_idx on public.automation_sends (client_id, created_at desc);
create index automation_sends_outbox_idx on public.automation_sends (email_outbox_id) where email_outbox_id is not null;

-- ───────────── Ουρά email: «Ξαναστείλε» μία φορά ─────────────

alter table public.email_outbox add column retry_of uuid references public.email_outbox (id) on delete set null;
create unique index email_outbox_retry_of_idx on public.email_outbox (retry_of) where retry_of is not null;
create index email_outbox_created_idx on public.email_outbox (created_at desc);

-- ───────────── Αποστολή σε έναν παραλήπτη (ξαναγραμμένο από το 20261015140100_automation_timing.sql) ─────────────
-- Ίδιο, με μία προσθήκη: το σημάδι γράφει τον Πελάτη του Γεγονότος.

create or replace function authz.ev_deliver(
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
  v_allowed text[] := (select t.variables from public.event_types t where t.code = e.type);
  v_subject text;
  v_body text;
  v_send bigint;
  v_ref uuid;
  v_token text;
begin
  if a.channel = 'email' and coalesce(trim(r.email), '') = '' then
    return false;
  end if;
  if not r.is_client and authz.user_scope(r.user_id, 'finance.amounts') is null then
    v_vars := v_vars - array['amount', 'payment', 'margin', 'cost'];
  end if;
  insert into public.automation_sends (automation_id, event_id, case_key, recipient_key, channel, created_at, client_id)
  values (a.id, e.id, e.case_key, r.user_id::text, a.channel, p_now, e.client_id)
  on conflict (automation_id, case_key, recipient_key) do nothing
  returning id into v_send;
  if v_send is null then
    return false;
  end if;
  -- Το σημάδι γράφτηκε (μία φορά)· η Ειδοποίηση όμως μπαίνει μία ανά (Γεγονός, Χρήστη), όσοι Αυτοματισμοί κι αν τον βρουν.
  if a.channel = 'notification'
     and exists (select 1 from public.notifications n where n.event_id = e.id and n.user_id = r.user_id) then
    return false;
  end if;
  -- Το θέμα είναι μία γραμμή.
  v_subject := regexp_replace(
    authz.ev_render(coalesce(case v_locale when 'en' then nullif(trim(a.subject_en), '') end, a.subject_el, v_label),
                    v_vars, v_allowed),
    '\s*[\r\n]+\s*', ' ', 'g');
  v_body := authz.ev_render(case v_locale when 'en' then a.body_en else a.body_el end, v_vars, v_allowed);
  if a.channel = 'notification' then
    insert into public.notifications (user_id, client_id, automation_id, event_id, title, body, link, created_at)
    values (r.user_id, e.client_id, a.id, e.id, left(coalesce(nullif(v_subject, ''), v_label), 300), left(v_body, 2000),
            nullif(v_link, ''), p_now)
    returning id into v_ref;
    update public.automation_sends set notification_id = v_ref where id = v_send;
  else
    if not a.is_essential then
      v_token := authz.new_token();
      insert into public.automation_unsubscribes (token_hash, user_id, automation_id)
      values (authz.token_hash(v_token), r.user_id, a.id);
    end if;
    insert into public.email_outbox (kind, to_name, to_email, locale, payload)
    values ('automation', coalesce(r.name, ''), lower(trim(r.email)), v_locale,
            jsonb_strip_nulls(jsonb_build_object('subject', left(coalesce(nullif(v_subject, ''), v_label), 300),
              'body', left(v_body, 2000), 'link', nullif(v_link, ''), 'automationId', a.id,
              'details', authz.ev_email_details(e, r), 'unsubscribeToken', v_token)))
    returning id into v_ref;
    update public.automation_sends set email_outbox_id = v_ref where id = v_send;
  end if;
  return true;
end;
$$;

-- ───────────── Βοηθητικά του Ιστορικού ─────────────

-- Η κατάσταση μιας γραμμής της ουράς email.
create function authz.send_state(p_status text, p_attempts integer, p_error text) returns text
language sql immutable set search_path = ''
as $$
  select case p_status
    when 'pending' then case when p_attempts > 0 and coalesce(p_error, '') <> '' then 'retrying' else 'scheduled' end
    when 'sent' then 'sent'
    when 'failed' then 'failed'
    else 'not_sent'
  end;
$$;

-- Ο λόγος μιας γραμμής της ουράς (σφάλμα του παρόχου, εκτός λίστας, ακύρωση). Ποτέ περιεχόμενο.
create function authz.send_reason(p_status text, p_error text) returns text
language sql immutable set search_path = ''
as $$
  select case
    when p_status = 'cancelled' then 'Ακυρώθηκε πριν φύγει'
    when p_status = 'suppressed' then coalesce(nullif(p_error, ''), 'Εκτός επιτρεπόμενων διευθύνσεων')
    when p_status in ('failed', 'pending') then nullif(p_error, '')
  end;
$$;

-- Κρυφό για τον θεατή: Τιμολόγια/Εισπράξεις/Τιμολογητέα χωρίς ποσά, Γεγονότα κόστους χωρίς «Βλέπει κόστος».
create function authz.send_hidden(p_event_type text, p_kind text, p_finance boolean, p_cost boolean) returns boolean
language sql stable security definer set search_path = ''
as $$
  select (not p_finance
          and (coalesce(p_event_type in ('billable.created', 'billable.open_waiting', 'invoice.registered', 'invoice.overdue',
                                         'receipt.registered'), false)
               or coalesce(p_kind in ('invoice_registered', 'invoice_overdue'), false)))
      or (not p_cost and exists (select 1 from public.event_types t where t.code = p_event_type and t.is_cost_only));
$$;

-- Ο Πελάτης ενός email από τη διεύθυνση του παραλήπτη (Χρήστης πελάτη· ο ενεργός Πελάτης πρώτα).
create function authz.send_email_client(p_email text) returns uuid
language sql stable security definer set search_path = ''
as $$
  select cu.client_id from public.client_users cu join auth.users u on u.id = cu.user_id
   where lower(u.email) = lower(p_email)
   order by (cu.removed_at is null) desc, cu.is_current desc, cu.joined_at
   limit 1;
$$;


-- Μία γραμμή του Ιστορικού, πριν από τα ονόματα.
create type authz.send_row as (
  ref text, at timestamptz, source text, event_type text, kind text, channel text, recipient_key text, recipient_count integer,
  to_name text, to_email text, client_id uuid, state text, attempts integer, reason text, outbox_id uuid, is_retried boolean
);

-- Όλες οι αποστολές που έγιναν ή περιμένουν στην ουρά, με τα φίλτρα του θεατή. p_client_users: μόνο προς Χρήστες του p_client.
create function authz.sends_base(
  p_channel text, p_client uuid, p_client_users boolean, p_finance boolean, p_cost boolean
) returns setof authz.send_row
language sql stable security definer set search_path = ''
as $$
  with kinds as (select array(select distinct o.kind from public.email_outbox o) as outbox)
  -- Αυτοματισμοί: Ειδοποίηση ή email (η κατάσταση από την ουρά)· χωρίς γραμμή = δεν στάλθηκε (το είχε ήδη λάβει).
  select 'a' || s.id, s.created_at, 'automation', a.event_type, null::text, s.channel, s.recipient_key, null::integer,
         o.to_name, o.to_email, s.client_id,
         case when s.channel = 'notification' then case when s.notification_id is null then 'not_sent' else 'sent' end
              when o.id is null then 'not_sent'
              else authz.send_state(o.status, o.attempts, o.last_error) end,
         case when s.channel = 'notification' then case when s.notification_id is null then 0 else 1 end
              else coalesce(o.attempts, 0) end,
         case when (s.channel = 'notification' and s.notification_id is null) or (s.channel = 'email' and o.id is null)
              then 'Το είχε ήδη λάβει' else authz.send_reason(o.status, o.last_error) end,
         o.id, exists (select 1 from public.email_outbox x where o.id is not null and x.retry_of = o.id)
    from public.automation_sends s
    join public.automations a on a.id = s.automation_id
    left join public.email_outbox o on o.id = s.email_outbox_id
   where (p_channel is null or s.channel = p_channel)
     and (p_client is null or s.client_id = p_client)
     and (not p_client_users
          or exists (select 1 from public.client_users cu where cu.client_id = p_client and cu.user_id::text = s.recipient_key))
     and not authz.send_hidden(a.event_type, null, p_finance, p_cost)
  union all
  -- Η ουρά χωρίς σημάδι: Μηνύματα συστήματος, παλιά kinds και «Ξαναστείλε».
  select 'o' || o.id, o.created_at, case when o.kind = 'automation' then 'automation' else 'system' end, a.event_type,
         case when o.kind = 'automation' then null else o.kind end, 'email', null::text, null::integer,
         o.to_name, o.to_email, authz.send_email_client(o.to_email),
         authz.send_state(o.status, o.attempts, o.last_error), o.attempts, authz.send_reason(o.status, o.last_error),
         o.id, exists (select 1 from public.email_outbox x where x.retry_of = o.id)
    from public.email_outbox o
    left join public.automations a
      on o.kind = 'automation' and o.payload ->> 'automationId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and a.id = (o.payload ->> 'automationId')::uuid
   where not exists (select 1 from public.automation_sends s where s.email_outbox_id = o.id)
     and (p_channel is null or p_channel = 'email')
     and (p_client is null
          or exists (select 1 from public.client_users cu join auth.users u on u.id = cu.user_id
                      where cu.client_id = p_client and lower(u.email) = lower(o.to_email)))
     and not authz.send_hidden(a.event_type, o.kind, p_finance, p_cost)
  union all
  -- Ό,τι δεν πέρασε από την ουρά (σύνδεσμος εισόδου, επαναφορά, Συμφωνίες).
  select 'l' || l.id, l.sent_at, 'system', null::text, l.kind, 'email', null::text, null::integer, null::text, l.to_email,
         authz.send_email_client(l.to_email),
         case l.status when 'sent' then 'sent' when 'failed' then 'failed' else 'not_sent' end, 1,
         case l.status when 'failed' then nullif(l.error, '')
                       when 'suppressed' then coalesce(nullif(l.error, ''), 'Εκτός επιτρεπόμενων διευθύνσεων') end,
         null::uuid, false
    from public.email_log l cross join kinds k
   where not (l.kind = any (k.outbox))
     and (p_channel is null or p_channel = 'email')
     and (p_client is null
          or exists (select 1 from public.client_users cu join auth.users u on u.id = cu.user_id
                      where cu.client_id = p_client and lower(u.email) = lower(l.to_email)))
     and not authz.send_hidden(null, l.kind, p_finance, p_cost);
$$;

-- Οι Προγραμματισμένοι Αυτοματισμοί των επόμενων 14 ημερών (από το automations_upcoming του Kγ), ως γραμμές.
create function authz.sends_upcoming(p_channel text, p_client uuid, p_cost boolean, p_now timestamptz)
returns setof authz.send_row
language sql stable security definer set search_path = ''
as $$
  select 'u' || md5(concat_ws(':', x ->> 'automationId', x ->> 'caseKey', x ->> 'entityId', x ->> 'clientId', x ->> 'dueAt')),
         (x ->> 'dueAt')::timestamptz, 'automation', x ->> 'eventType', null::text, x ->> 'channel', null::text,
         (x ->> 'recipients')::integer, null::text, null::text, nullif(x ->> 'clientId', '')::uuid, 'scheduled', 0,
         null::text, null::uuid, false
    from jsonb_array_elements(public.automations_upcoming(p_now, p_now + interval '14 days')) x
   where (x ->> 'recipients')::integer > 0
     and (p_channel is null or x ->> 'channel' = p_channel)
     and (p_client is null or x ->> 'clientId' = p_client::text)
     and not authz.send_hidden(x ->> 'eventType', null, true, p_cost);
$$;

-- Μία γραμμή σε JSON, με τα ονόματα. Χωρίς περιεχόμενο: ποτέ θέμα, σώμα, link, token ή payload.
-- p_full = false: μόνο Πότε / Τι / Παραλήπτης / Κατάσταση (καρτέλα του Πελάτη).
create function authz.send_json(r authz.send_row, p_full boolean) returns jsonb
language sql stable security definer set search_path = ''
as $$
  with person as (
    select coalesce(
             nullif(r.to_name, ''),
             (select t.name from public.team_users t where t.user_id::text = r.recipient_key),
             (select cu.name from public.client_users cu where cu.user_id::text = r.recipient_key
               order by (cu.client_id = r.client_id) desc nulls last, cu.joined_at limit 1)) as name,
           case when r.channel = 'email' then coalesce(
             r.to_email,
             case when r.recipient_key like '%@%' then r.recipient_key end,
             (select u.email from auth.users u where u.id::text = r.recipient_key)) end as email
  )
  select jsonb_build_object(
           'id', r.ref, 'at', r.at, 'source', r.source, 'eventType', r.event_type,
           'eventLabel', (select t.label_el from public.event_types t where t.code = r.event_type),
           'kind', r.kind, 'channel', r.channel, 'recipientName', p.name, 'state', r.state)
         || case when not p_full then '{}'::jsonb else jsonb_build_object(
           'recipientEmail', p.email, 'recipientCount', r.recipient_count,
           'clientId', r.client_id, 'clientName', (select c.name from public.clients c where c.id = r.client_id),
           'attempts', r.attempts, 'reason', r.reason,
           'retryRef', case when r.state = 'failed' and r.outbox_id is not null and not r.is_retried then r.outbox_id end,
           'isRetried', r.is_retried) end
    from person p;
$$;

-- Μία σελίδα: keyset (στιγμή, id). Στα Προγραμματισμένα η σειρά είναι αύξουσα (το κλειδί σημαίνει «μετά από»), αλλού φθίνουσα.
-- Επιστρέφει { items, hasMore } με έως p_limit γραμμές.
create function authz.sends_page(p_rows jsonb, p_limit integer) returns jsonb
language sql immutable set search_path = ''
as $$
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(t.v order by t.i) from jsonb_array_elements(p_rows) with ordinality as t (v, i)
                        where t.i <= p_limit), '[]'::jsonb),
    'hasMore', jsonb_array_length(p_rows) > p_limit);
$$;

create function authz.sends_after(
  p_at timestamptz, p_ref text, p_before timestamptz, p_before_id text, p_ascending boolean
) returns boolean
language sql immutable set search_path = ''
as $$
  select p_before is null
      or (p_before_id is null and case when p_ascending then p_at > p_before else p_at < p_before end)
      or (p_before_id is not null and case when p_ascending then (p_at, p_ref) > (p_before, p_before_id)
                                           else (p_at, p_ref) < (p_before, p_before_id) end);
$$;

-- ───────────── K3: Ιστορικό αποστολών (automations.manage ή health.view) ─────────────

-- { items: [{ id, at, source, eventType, eventLabel, kind, channel, recipientName, state, recipientEmail, recipientCount,
--             clientId, clientName, attempts, reason, retryRef, isRetried }], hasMore, failed, clients: [{ id, name }] }
-- p_tab 'sent' (ό,τι δεν περιμένει) | 'scheduled' (Αυτοματισμοί 14 ημερών και η ουρά) | 'failed'. p_limit 1–50.
create function public.sends_list(
  p_tab text default 'sent', p_channel text default null, p_client uuid default null,
  p_before timestamptz default null, p_before_id text default null, p_limit integer default 20,
  p_now timestamptz default null
) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
  v_finance boolean;
  v_cost boolean;
  v_rows jsonb;
begin
  if not (authz.has('automations.manage') or authz.has('health.view')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if coalesce(p_tab, '') not in ('sent', 'scheduled', 'failed') then
    raise exception 'Η καρτέλα είναι «Στάλθηκαν», «Προγραμματισμένα» ή «Απέτυχαν»' using errcode = 'P0001';
  end if;
  if p_channel is not null and p_channel not in ('notification', 'email') then
    raise exception 'Το κανάλι είναι Ειδοποίηση ή email' using errcode = 'P0001';
  end if;
  if length(p_before_id) > 100 then
    raise exception 'Το «Παλαιότερα» δεν είναι έγκυρο' using errcode = 'P0001';
  end if;
  v_finance := authz.has('finance.amounts') or authz.has('finance.invoices');
  v_cost := authz.has('finance.cost');
  if p_tab = 'scheduled' then
    select coalesce(jsonb_agg(authz.send_json(row(x.*)::authz.send_row, true) order by x.at, x.ref), '[]'::jsonb) into v_rows
      from (select * from (select * from authz.sends_base(p_channel, p_client, false, v_finance, v_cost) b where b.state = 'scheduled'
                           union all
                           select * from authz.sends_upcoming(p_channel, p_client, v_cost, v_now)) u
             where authz.sends_after(u.at, u.ref, p_before, p_before_id, true)
             order by u.at, u.ref
             limit v_limit + 1) x;
  else
    select coalesce(jsonb_agg(authz.send_json(row(x.*)::authz.send_row, true) order by x.at desc, x.ref desc), '[]'::jsonb)
      into v_rows
      from (select * from authz.sends_base(p_channel, p_client, false, v_finance, v_cost) b
             where (case p_tab when 'failed' then b.state = 'failed' else b.state <> 'scheduled' end)
               and authz.sends_after(b.at, b.ref, p_before, p_before_id, false)
             order by b.at desc, b.ref desc
             limit v_limit + 1) x;
  end if;
  return authz.sends_page(v_rows, v_limit) || jsonb_build_object(
    'failed', (select count(*) from authz.sends_base(p_channel, p_client, false, v_finance, v_cost) b where b.state = 'failed'),
    'clients', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name, c.id)
                           from public.clients c
                          where c.id in (select s.client_id from public.automation_sends s where s.client_id is not null)), '[]'::jsonb));
end;
$$;

-- «Ξαναστείλε» (automations.manage): μόνο email που απέτυχε, μία φορά ανά αποστολή. Νέα γραμμή στην ουρά με το ίδιο payload·
-- το Ίχνος τη γράφει (email_outbox_audit). Επιστρέφει το id της νέας γραμμής.
create function public.send_retry(p_ref uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  o public.email_outbox;
  v_event text;
  v_id uuid;
begin
  perform authz.require('automations.manage');
  select x.* into o from public.email_outbox x where x.id = p_ref for update;
  if found and o.kind = 'automation' then
    select a.event_type into v_event from public.automations a
     where o.payload ->> 'automationId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       and a.id = (o.payload ->> 'automationId')::uuid;
  end if;
  if not found or o.status <> 'failed'
     or authz.send_hidden(v_event, o.kind, authz.has('finance.amounts') or authz.has('finance.invoices'), authz.has('finance.cost')) then
    raise exception 'Ξαναστέλνεται μόνο email που απέτυχε' using errcode = 'P0001';
  end if;
  if o.retry_of is not null or exists (select 1 from public.email_outbox x where x.retry_of = o.id) then
    raise exception 'Αυτό το email ξαναστάλθηκε ήδη μία φορά' using errcode = 'P0001';
  end if;
  begin
    insert into public.email_outbox (kind, to_name, to_email, locale, payload, created_by, retry_of)
    values (o.kind, o.to_name, o.to_email, o.locale, o.payload, auth.uid(), o.id)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Αυτό το email ξαναστάλθηκε ήδη μία φορά' using errcode = 'P0001';
  end;
  return v_id;
end;
$$;

-- ───────────── Καρτέλα «Αποστολές» του Πελάτη ─────────────

-- { items: [{ id, at, source, eventType, eventLabel, kind, channel, recipientName, state }], hasMore }: μόνο ό,τι πήγε σε
-- Χρήστες αυτού του Πελάτη, χωρίς περιεχόμενο. Όποιος βλέπει τον Πελάτη και έχει automations.manage ή health.view, ή είναι
-- ο Υπεύθυνός του. Ο πελάτης, ο ανύπαρκτος και ο μη ορατός Πελάτης → 42501 με το ίδιο μήνυμα.
create function public.client_sends(
  p_client uuid, p_before timestamptz default null, p_before_id text default null, p_limit integer default 20
) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
  v_finance boolean;
  v_cost boolean;
  v_rows jsonb;
begin
  if not authz.is_team_user() or p_client is null or not authz.can_see_client_id(p_client)
     or not (authz.has('automations.manage') or authz.has('health.view')
             or exists (select 1 from public.clients c where c.id = p_client and c.manager_id = auth.uid())) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if length(p_before_id) > 100 then
    raise exception 'Το «Παλαιότερα» δεν είναι έγκυρο' using errcode = 'P0001';
  end if;
  v_finance := authz.has('finance.amounts') or authz.has('finance.invoices');
  v_cost := authz.has('finance.cost');
  select coalesce(jsonb_agg(authz.send_json(row(x.*)::authz.send_row, false) order by x.at desc, x.ref desc), '[]'::jsonb)
    into v_rows
    from (select * from authz.sends_base(null, p_client, true, v_finance, v_cost) b
           where authz.sends_after(b.at, b.ref, p_before, p_before_id, false)
           order by b.at desc, b.ref desc
           limit v_limit + 1) x;
  return authz.sends_page(v_rows, v_limit);
end;
$$;

-- ───────────── Διατήρηση 12 μηνών (service_role, cron της ουράς) ─────────────

-- { sends, logs, outbox }: πόσα σβήστηκαν. Μένουν τα σημάδια του ληξιπρόθεσμου Τιμολογίου που έχει ακόμα υπόλοιπο (αλλιώς
-- το «μία φορά» θα ξανάστελνε) και οι γραμμές της ουράς που δείχνουν. Οι Ειδοποιήσεις σβήνονται στις 90 μέρες (events_process).
create function public.sends_cleanup(p_now timestamptz default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_cut timestamptz := coalesce(p_now, now()) - interval '12 months';
  v_sends integer;
  v_logs integer;
  v_outbox integer;
begin
  delete from public.automation_sends s
   where s.created_at < v_cut
     and not (s.case_key like 'invoice.overdue:%'
              and exists (select 1 from authz.invoice_standings(null, null) st
                           where st.invoice_id::text = split_part(s.case_key, ':', 2) and st.remaining > 0));
  get diagnostics v_sends = row_count;
  delete from public.email_log l where l.sent_at < v_cut;
  get diagnostics v_logs = row_count;
  delete from public.email_outbox o
   where o.status <> 'pending' and coalesce(o.handled_at, o.created_at) < v_cut
     and not exists (select 1 from public.automation_sends s where s.email_outbox_id = o.id);
  get diagnostics v_outbox = row_count;
  return jsonb_build_object('sends', v_sends, 'logs', v_logs, 'outbox', v_outbox);
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.send_state(text, integer, text), authz.send_reason(text, text), authz.send_hidden(text, text, boolean, boolean),
  authz.send_email_client(text), authz.sends_base(text, uuid, boolean, boolean, boolean),
  authz.sends_upcoming(text, uuid, boolean, timestamptz), authz.send_json(authz.send_row, boolean),
  authz.sends_page(jsonb, integer), authz.sends_after(timestamptz, text, timestamptz, text, boolean)
  from public, anon, authenticated;

revoke all on function
  public.sends_list(text, text, uuid, timestamptz, text, integer, timestamptz), public.send_retry(uuid),
  public.client_sends(uuid, timestamptz, text, integer)
  from public, anon;
grant execute on function
  public.sends_list(text, text, uuid, timestamptz, text, integer, timestamptz), public.send_retry(uuid),
  public.client_sends(uuid, timestamptz, text, integer)
  to authenticated;

revoke all on function public.sends_cleanup(timestamptz) from public, anon, authenticated;
grant execute on function public.sends_cleanup(timestamptz) to service_role;
