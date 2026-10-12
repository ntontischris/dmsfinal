-- Ειδοποιήσεις Kε (#174), μέρος 1: Ιστορικό αποστολών (K3, καρτέλα «Αποστολές» του Πελάτη) και «Ξαναστείλε» (δέσμη Α13).
--
--  • Μία ενιαία όψη: κάθε σημάδι automation_sends (Ειδοποίηση ή email, με την κατάσταση της ουράς), κάθε γραμμή email_outbox
--    που δεν είναι από σημάδι (Μηνύματα συστήματος, παλιά kinds, «Ξαναστείλε») και κάθε γραμμή email_log που δεν πέρασε από
--    την ουρά (σύνδεσμος εισόδου, επαναφορά, Συμφωνίες). Ποτέ περιεχόμενο, link ή κωδικός: μόνο Γεγονός/είδος, παραλήπτης,
--    κατάσταση, προσπάθειες και λόγος.
--  • Κάθε σκέλος έχει δικό του keyset (στιγμή, id) με ORDER BY … LIMIT n+1 πάνω σε δείκτη· τα ονόματα και ο Πελάτης ενός email
--    υπολογίζονται μόνο για τις τελικές γραμμές. Το id της γραμμής έχει σταθερό μήκος, ώστε η σειρά του να είναι του δείκτη.
--  • Το σημάδι κρατά πλέον τον Πελάτη του Γεγονότος (client_id). Το id της Ειδοποίησης μένει και όταν η Ειδοποίηση σβηστεί στις
--    90 μέρες (χωρίς FK), ώστε η γραμμή να μένει «στάλθηκε». Το email_log ξέρει αν ήρθε από την ουρά (via_outbox).
--  • Ορατότητα: automations.manage ή health.view. Γραμμές με Πελάτη μόνο για Πελάτες που βλέπει ο θεατής (authz.can_see_client_id).
--    Μηνύματα συστήματος (είσοδος, προσκλήσεις, Συμφωνίες) μόνο για τον Ιδιοκτήτη και όσους «Βλέπουν Υγεία συστήματος».
--    Τιμολόγια/Εισπράξεις/Τιμολογητέα μόνο με «Βλέπει ποσά» ή «Καταχωρεί Τιμολόγια», Γεγονότα κόστους μόνο με «Βλέπει κόστος».
--  • «Ξαναστείλε» (automations.manage): μόνο αποτυχημένο email, μία φορά (email_outbox.retry_of, UNIQUE), με Ίχνος
--    (email_outbox_audit). Ποτέ για email με link εισόδου/πρόσκλησης· για Αυτοματισμό μόνο αν ισχύει ακόμα (authz.send_retry_problem).
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
create index automation_sends_client_idx on public.automation_sends (client_id, created_at desc, id desc);
create index automation_sends_outbox_idx on public.automation_sends (email_outbox_id) where email_outbox_id is not null;

-- ───────────── Ουρά email και ιστορικό: «Ξαναστείλε» μία φορά, δείκτες ─────────────

alter table public.email_outbox add column retry_of uuid references public.email_outbox (id) on delete set null;
create unique index email_outbox_retry_of_idx on public.email_outbox (retry_of) where retry_of is not null;
create index email_outbox_created_idx on public.email_outbox (created_at desc, id desc);
create index email_outbox_failed_idx on public.email_outbox (created_at desc) where status = 'failed';

-- Ό,τι γράφει το email_outbox_done είναι ήδη γραμμή της ουράς· στο Ιστορικό μετρά μία φορά.
alter table public.email_log add column via_outbox boolean not null default false;
update public.email_log l set via_outbox = true
 where l.kind in (select distinct o.kind from public.email_outbox o)
    or l.kind in ('test', 'invite_resend', 'client_added', 'filming_decision', 'reschedule_decision', 'sheet_issued',
                  'crew_declined', 'deliverable_version_sent', 'production_delivered', 'deliverable_reminder',
                  'invoice_registered', 'invoice_overdue', 'message_digest', 'request_closed', 'automation');
create index email_log_direct_idx on public.email_log (sent_at desc, id desc) where not via_outbox;
create index email_log_failed_idx on public.email_log (sent_at desc) where status = 'failed' and not via_outbox;

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

-- Ο Αυτοματισμός μιας γραμμής της ουράς (payload.automationId), αν είναι έγκυρο uuid.
create function authz.outbox_automation(p_payload jsonb) returns uuid
language sql immutable set search_path = ''
as $$
  select case when p_payload ->> 'automationId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then (p_payload ->> 'automationId')::uuid end;
$$;

-- Ο Πελάτης ενός email από τη διεύθυνση του παραλήπτη (Χρήστης πελάτη· ο ενεργός Πελάτης πρώτα). Μόνο για τελικές γραμμές.
create function authz.send_email_client(p_email text) returns uuid
language sql stable security definer set search_path = ''
as $$
  select cu.client_id from public.client_users cu join auth.users u on u.id = cu.user_id
   where lower(u.email) = lower(p_email)
   order by (cu.removed_at is null) desc, cu.is_current desc, cu.joined_at
   limit 1;
$$;

-- Το email πάει σε Χρήστη του Πελάτη; p_single: και ο Χρήστης ανήκει μόνο σε αυτόν (καρτέλα του Πελάτη).
create function authz.send_email_of_client(p_email text, p_client uuid, p_single boolean) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.client_users cu join auth.users u on u.id = cu.user_id
     where cu.client_id = p_client and lower(u.email) = lower(p_email)
       and (not p_single or (select count(*) from public.client_users c2
                              where c2.user_id = cu.user_id and c2.removed_at is null) = 1));
$$;

-- Τα φίλτρα και τα Δικαιώματα του θεατή για μία σελίδα. visible: οι Πελάτες που βλέπει (null = χωρίς έλεγχο)· sys: βλέπει
-- Μηνύματα συστήματος· hidden: τα Γεγονότα που δεν βλέπει· finance: βλέπει τα παλιά email Τιμολογίων. tab 'all' = όλα.
create type authz.send_filter as (
  tab text, channel text, client uuid, client_only boolean, visible uuid[], sys boolean, hidden text[], finance boolean,
  before_at timestamptz, before_id text, lim integer
);

-- Μία γραμμή του Ιστορικού, πριν από τα ονόματα.
create type authz.send_row as (
  ref text, at timestamptz, source text, event_type text, kind text, channel text, recipient_key text, recipient_count integer,
  to_name text, to_email text, client_id uuid, state text, attempts integer, reason text, outbox_id uuid
);

-- Ο Πελάτης φαίνεται στον θεατή;
create function authz.send_client_ok(p authz.send_filter, p_client uuid) returns boolean
language sql immutable set search_path = ''
as $$ select p.visible is null or p_client = any (p.visible); $$;

-- Ό,τι έγινε ή ξαναδοκιμάζεται, φθίνουσα σειρά. Τρία σκέλη με keyset και LIMIT πάνω στους δείκτες τους.
create function authz.sends_history(p authz.send_filter) returns setof authz.send_row
language plpgsql stable security definer set search_path = ''
as $$
begin
  return query
  (select 'a' || lpad(s.id::text, 19, '0'), s.created_at, 'automation'::text, a.event_type, null::text, s.channel,
          s.recipient_key, null::integer, o.to_name, o.to_email, s.client_id,
          case when s.channel = 'notification' then case when s.notification_id is null then 'not_sent' else 'sent' end
               when o.id is null then 'not_sent'
               else authz.send_state(o.status, o.attempts, o.last_error) end,
          case when s.channel = 'notification' then case when s.notification_id is null then 0 else 1 end
               else coalesce(o.attempts, 0) end,
          case when (s.channel = 'notification' and s.notification_id is null) or (s.channel = 'email' and o.id is null)
               then 'Το είχε ήδη λάβει' else authz.send_reason(o.status, o.last_error) end,
          o.id
     from public.automation_sends s
     join public.automations a on a.id = s.automation_id
     left join public.email_outbox o on o.id = s.email_outbox_id
    where (p.channel is null or s.channel = p.channel)
      and (p.client is null or s.client_id = p.client)
      and (s.client_id is null or authz.send_client_ok(p, s.client_id))
      and not (a.event_type = any (p.hidden))
      and (not p.client_only
           or exists (select 1 from public.client_users cu where cu.client_id = p.client and cu.user_id::text = s.recipient_key))
      and (p.tab <> 'failed' or o.status = 'failed')
      and (p.tab = 'all' or o.id is null or authz.send_state(o.status, o.attempts, o.last_error) <> 'scheduled')
      and (p.before_at is null or s.created_at < p.before_at
           or (s.created_at = p.before_at and 'a' || lpad(s.id::text, 19, '0') < p.before_id))
    order by s.created_at desc, s.id desc
    limit p.lim + 1)
  union all
  (select 'o' || o.id::text, o.created_at, case when o.kind = 'automation' then 'automation' else 'system' end, a.event_type,
          case when o.kind = 'automation' then null else o.kind end, 'email'::text, null::text, null::integer,
          o.to_name, o.to_email, s2.client_id,
          authz.send_state(o.status, o.attempts, o.last_error), o.attempts, authz.send_reason(o.status, o.last_error), o.id
     from public.email_outbox o
     left join public.automations a on o.kind = 'automation' and a.id = authz.outbox_automation(o.payload)
     left join public.automation_sends s2 on o.retry_of is not null and s2.email_outbox_id = o.retry_of
    where not exists (select 1 from public.automation_sends s where s.email_outbox_id = o.id)
      and (p.channel is null or p.channel = 'email')
      and case when s2.client_id is not null then authz.send_client_ok(p, s2.client_id) else o.kind = 'automation' or p.sys end
      and not (coalesce(a.event_type, '') = any (p.hidden))
      and (p.finance or o.kind not in ('invoice_registered', 'invoice_overdue'))
      and (p.client is null
           or (authz.send_client_ok(p, p.client)
               and (s2.client_id = p.client
                    or (s2.client_id is null and authz.send_email_of_client(o.to_email, p.client, p.client_only)))))
      and (p.tab <> 'failed' or o.status = 'failed')
      and (p.tab = 'all' or authz.send_state(o.status, o.attempts, o.last_error) <> 'scheduled')
      and (p.before_at is null or o.created_at < p.before_at
           or (o.created_at = p.before_at and 'o' || o.id::text < p.before_id))
    order by o.created_at desc, o.id desc
    limit p.lim + 1)
  union all
  (select 'l' || l.id::text, l.sent_at, 'system'::text, null::text, l.kind, 'email'::text, null::text, null::integer,
          null::text, l.to_email, null::uuid,
          case l.status when 'sent' then 'sent' when 'failed' then 'failed' else 'not_sent' end, 1,
          case l.status when 'failed' then nullif(l.error, '')
                        when 'suppressed' then coalesce(nullif(l.error, ''), 'Εκτός επιτρεπόμενων διευθύνσεων') end,
          null::uuid
     from public.email_log l
    where not l.via_outbox and p.sys
      and (p.channel is null or p.channel = 'email')
      and (p.finance or l.kind not in ('invoice_registered', 'invoice_overdue'))
      and (p.client is null
           or (authz.send_client_ok(p, p.client) and authz.send_email_of_client(l.to_email, p.client, p.client_only)))
      and (p.tab <> 'failed' or l.status = 'failed')
      and (p.before_at is null or l.sent_at < p.before_at
           or (l.sent_at = p.before_at and 'l' || l.id::text < p.before_id))
    order by l.sent_at desc, l.id desc
    limit p.lim + 1);
end;
$$;

-- Τα email που περιμένουν στην ουρά (Προγραμματισμένα), αύξουσα σειρά. Από τον μερικό δείκτη email_outbox_pending_idx.
create function authz.sends_pending(p authz.send_filter) returns setof authz.send_row
language plpgsql stable security definer set search_path = ''
as $$
begin
  return query
  select x.ref, x.at, x.source, x.event_type, x.kind, x.channel, x.recipient_key, x.recipient_count, x.to_name, x.to_email,
         x.client_id, x.state, x.attempts, x.reason, x.outbox_id
    from (select case when s.id is null then 'o' || o.id::text else 'a' || lpad(s.id::text, 19, '0') end as ref,
                 coalesce(s.created_at, o.created_at) as at,
                 case when s.id is not null or o.kind = 'automation' then 'automation' else 'system' end as source,
                 a.event_type, case when o.kind = 'automation' then null else o.kind end as kind, 'email'::text as channel,
                 s.recipient_key, null::integer as recipient_count, o.to_name, o.to_email,
                 coalesce(s.client_id, s2.client_id) as client_id, 'scheduled'::text as state, o.attempts,
                 null::text as reason, o.id as outbox_id, o.kind as outbox_kind
            from public.email_outbox o
            left join public.automation_sends s on s.email_outbox_id = o.id
            left join public.automation_sends s2 on o.retry_of is not null and s2.email_outbox_id = o.retry_of
            left join public.automations a on a.id = coalesce(s.automation_id, authz.outbox_automation(o.payload))
           where o.status = 'pending' and authz.send_state(o.status, o.attempts, o.last_error) = 'scheduled'
             and (p.channel is null or p.channel = 'email')
             and not (coalesce(a.event_type, '') = any (p.hidden))
             and (p.finance or o.kind not in ('invoice_registered', 'invoice_overdue'))) x
   where case when x.client_id is not null then authz.send_client_ok(p, x.client_id)
              else x.source = 'automation' or p.sys end
     and (p.client is null or x.client_id = p.client)
     and authz.sends_after(x.at, x.ref, p.before_at, p.before_id, true)
   order by x.at, x.ref
   limit p.lim + 1;
end;
$$;

-- Οι Προγραμματισμένοι Αυτοματισμοί των επόμενων 14 ημερών (από το automations_upcoming του Kγ), ως γραμμές.
-- Το id περιέχει και τη θέση στη λίστα, ώστε να είναι μοναδικό και για περιπτώσεις με ίδια στοιχεία (π.χ. σύνοψη ανά Χρήστη).
create function authz.sends_upcoming(p authz.send_filter, p_now timestamptz) returns setof authz.send_row
language plpgsql stable security definer set search_path = ''
as $$
begin
  return query
  select 'u' || md5(t.n::text || ':' || t.x::text), (t.x ->> 'dueAt')::timestamptz, 'automation'::text, t.x ->> 'eventType',
         null::text, t.x ->> 'channel', null::text, (t.x ->> 'recipients')::integer, null::text, null::text,
         nullif(t.x ->> 'clientId', '')::uuid, 'scheduled'::text, 0, null::text, null::uuid
    from jsonb_array_elements(public.automations_upcoming(p_now, p_now + interval '14 days')) with ordinality as t (x, n)
   where (t.x ->> 'recipients')::integer > 0
     and (p.channel is null or t.x ->> 'channel' = p.channel)
     and (p.client is null or t.x ->> 'clientId' = p.client::text)
     and (nullif(t.x ->> 'clientId', '') is null or authz.send_client_ok(p, (t.x ->> 'clientId')::uuid))
     and not ((t.x ->> 'eventType') = any (p.hidden));
end;
$$;

-- Πόσα απέτυχαν (για το «Απέτυχαν (N)»), με τα ίδια φίλτρα· από τους μερικούς δείκτες των αποτυχημένων.
create function authz.sends_failed_count(p authz.send_filter) returns bigint
language plpgsql stable security definer set search_path = ''
as $$
begin
  return (select count(*) from public.email_outbox o
            left join public.automation_sends s on s.email_outbox_id = o.id
            left join public.automation_sends s2 on o.retry_of is not null and s2.email_outbox_id = o.retry_of
            left join public.automations a on a.id = coalesce(s.automation_id, authz.outbox_automation(o.payload))
           where o.status = 'failed'
             and (p.channel is null or p.channel = 'email')
             and not (coalesce(a.event_type, '') = any (p.hidden))
             and (p.finance or o.kind not in ('invoice_registered', 'invoice_overdue'))
             and case when coalesce(s.client_id, s2.client_id) is not null then authz.send_client_ok(p, coalesce(s.client_id, s2.client_id))
                      else s.id is not null or o.kind = 'automation' or p.sys end
             and (p.client is null or coalesce(s.client_id, s2.client_id) = p.client
                  or (s.id is null and s2.client_id is null and o.kind <> 'automation'
                      and authz.send_email_of_client(o.to_email, p.client, false))))
       + (select count(*) from public.email_log l
           where l.status = 'failed' and not l.via_outbox and p.sys
             and (p.channel is null or p.channel = 'email')
             and (p.finance or l.kind not in ('invoice_registered', 'invoice_overdue'))
             and (p.client is null or authz.send_email_of_client(l.to_email, p.client, false)));
end;
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

-- ───────────── «Ξαναστείλε»: πότε επιτρέπεται ─────────────

-- null = επιτρέπεται· αλλιώς ο λόγος (P0001). Ποτέ για email με link εισόδου/πρόσκλησης. Για Αυτοματισμό: ενεργός Αυτοματισμός,
-- ενεργός παραλήπτης χωρίς «δεν το λαμβάνω», και για Τιμολόγιο όχι ακυρωμένο (στο ληξιπρόθεσμο με υπόλοιπο).
create function authz.send_retry_problem(o public.email_outbox) returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  a public.automations;
  s public.automation_sends;
  v_user uuid;
  v_invoice uuid;
begin
  if o.retry_of is not null or exists (select 1 from public.email_outbox x where x.retry_of = o.id) then
    return 'Αυτό το email ξαναστάλθηκε ήδη μία φορά';
  end if;
  if o.kind in ('invoice_registered', 'invoice_overdue') then
    return 'Το παλιό email Τιμολογίου δεν ξαναστέλνεται';
  end if;
  if o.kind not in ('automation', 'test', 'filming_decision', 'reschedule_decision', 'sheet_issued', 'crew_declined',
                    'deliverable_version_sent', 'production_delivered', 'deliverable_reminder', 'message_digest', 'request_closed') then
    return 'Ξαναστείλε από τις Προσκλήσεις';
  end if;
  if o.kind <> 'automation' then
    return null;
  end if;
  select x.* into a from public.automations x where x.id = authz.outbox_automation(o.payload);
  if not found or not a.is_enabled then
    return 'Ο Αυτοματισμός είναι κλειστός';
  end if;
  select x.* into s from public.automation_sends x where x.email_outbox_id = o.id;
  if not found then
    return null;
  end if;
  if s.recipient_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_user := s.recipient_key::uuid;
    if exists (select 1 from public.team_users t where t.user_id = v_user) then
      if not exists (select 1 from public.team_users t where t.user_id = v_user and t.is_active) then
        return 'Ο παραλήπτης δεν είναι πια ενεργός';
      end if;
    elsif not exists (select 1 from public.client_users cu
                       where cu.user_id = v_user and cu.removed_at is null and (s.client_id is null or cu.client_id = s.client_id)) then
      return 'Ο παραλήπτης δεν είναι πια ενεργός';
    end if;
    if exists (select 1 from public.automation_optouts x where x.user_id = v_user and x.automation_id = a.id) then
      return 'Ο παραλήπτης σταμάτησε αυτά τα email';
    end if;
  end if;
  if s.case_key like 'invoice.%' and split_part(s.case_key, ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_invoice := split_part(s.case_key, ':', 2)::uuid;
    if exists (select 1 from public.invoices i where i.id = v_invoice and i.voided_at is not null) then
      return 'Το Τιμολόγιο ακυρώθηκε';
    end if;
    if s.case_key like 'invoice.overdue:%'
       and not exists (select 1 from authz.invoice_standings(null, null) st where st.invoice_id = v_invoice and st.remaining > 0) then
      return 'Το Τιμολόγιο δεν έχει πια υπόλοιπο';
    end if;
  end if;
  return null;
end;
$$;

-- Μία γραμμή σε JSON, με τα ονόματα. Χωρίς περιεχόμενο: ποτέ θέμα, σώμα, link, token ή payload.
-- p_full = false: μόνο Πότε / Τι / Παραλήπτης / Κατάσταση (καρτέλα του Πελάτη).
create function authz.send_json(r authz.send_row, p_full boolean, p_visible uuid[]) returns jsonb
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
             (select u.email from auth.users u where u.id::text = r.recipient_key)) end as email,
           (select case when c is not null and (p_visible is null or c = any (p_visible)) then c end
              from (select case when not p_full then null
                                when r.client_id is not null then r.client_id
                                when r.source = 'system' and r.to_email is not null then authz.send_email_client(r.to_email)
                           end as c) z) as client
  )
  select jsonb_build_object(
           'id', r.ref, 'at', r.at, 'source', r.source, 'eventType', r.event_type,
           'eventLabel', (select t.label_el from public.event_types t where t.code = r.event_type),
           'kind', r.kind, 'channel', r.channel, 'recipientName', p.name, 'state', r.state)
         || case when not p_full then '{}'::jsonb else jsonb_build_object(
           'recipientEmail', p.email, 'recipientCount', r.recipient_count,
           'clientId', p.client, 'clientName', (select c.name from public.clients c where c.id = p.client),
           'attempts', r.attempts, 'reason', r.reason,
           'retryRef', case when r.state = 'failed' and r.outbox_id is not null
                             and (select authz.send_retry_problem(o) from public.email_outbox o where o.id = r.outbox_id) is null
                            then r.outbox_id end,
           'isRetried', r.outbox_id is not null and exists (select 1 from public.email_outbox x where x.retry_of = r.outbox_id)) end
    from person p;
$$;

-- { items, hasMore } με έως p_limit γραμμές.
create function authz.sends_page(p_rows jsonb, p_limit integer) returns jsonb
language sql immutable set search_path = ''
as $$
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(t.v order by t.i) from jsonb_array_elements(p_rows) with ordinality as t (v, i)
                        where t.i <= p_limit), '[]'::jsonb),
    'hasMore', jsonb_array_length(p_rows) > p_limit);
$$;

-- Τα Γεγονότα που δεν βλέπει ο θεατής: Τιμολόγια/Εισπράξεις/Τιμολογητέα χωρίς ποσά, κόστος χωρίς «Βλέπει κόστος».
create function authz.send_hidden_types() returns text[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(t.code), '{}') from public.event_types t
   where (not (authz.has('finance.amounts') or authz.has('finance.invoices'))
          and t.code in ('billable.created', 'billable.open_waiting', 'invoice.registered', 'invoice.overdue', 'receipt.registered'))
      or (not authz.has('finance.cost') and t.is_cost_only);
$$;

-- ───────────── K3: Ιστορικό αποστολών (automations.manage ή health.view) ─────────────

-- { items: [{ id, at, source, eventType, eventLabel, kind, channel, recipientName, state, recipientEmail, recipientCount,
--             clientId, clientName, attempts, reason, retryRef, isRetried }], hasMore, failed, clients: [{ id, name }] }
-- p_tab 'sent' (ό,τι δεν περιμένει) | 'scheduled' (η ουρά και οι Αυτοματισμοί 14 ημερών, αύξουσα) | 'failed'. p_limit 1–50.
create function public.sends_list(
  p_tab text default 'sent', p_channel text default null, p_client uuid default null,
  p_before timestamptz default null, p_before_id text default null, p_limit integer default 20,
  p_now timestamptz default null
) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
  v_visible uuid[];
  f authz.send_filter;
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
  v_visible := array(select c.id from public.clients c where authz.can_see_client_id(c.id));
  f := row(p_tab, p_channel, p_client, false, v_visible, authz.is_owner() or authz.has('health.view'),
           authz.send_hidden_types(), authz.has('finance.amounts') or authz.has('finance.invoices'),
           p_before, p_before_id, v_limit)::authz.send_filter;
  if p_tab = 'scheduled' then
    select coalesce(jsonb_agg(authz.send_json(row(x.*)::authz.send_row, true, v_visible) order by x.at, x.ref), '[]'::jsonb)
      into v_rows
      from (select * from (select * from authz.sends_pending(f)
                           union all
                           select * from authz.sends_upcoming(f, coalesce(p_now, now()))) u
             where authz.sends_after(u.at, u.ref, p_before, p_before_id, true)
             order by u.at, u.ref
             limit v_limit + 1) x;
  else
    select coalesce(jsonb_agg(authz.send_json(row(x.*)::authz.send_row, true, v_visible) order by x.at desc, x.ref desc),
                    '[]'::jsonb)
      into v_rows
      from (select * from authz.sends_history(f) h order by h.at desc, h.ref desc limit v_limit + 1) x;
  end if;
  return authz.sends_page(v_rows, v_limit) || jsonb_build_object(
    'failed', authz.sends_failed_count(f),
    'clients', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name, c.id)
                           from public.clients c
                          where c.id = any (v_visible)
                            and exists (select 1 from public.automation_sends s where s.client_id = c.id)), '[]'::jsonb));
end;
$$;

-- «Ξαναστείλε» (automations.manage): μόνο email που απέτυχε και που επιτρέπεται να ξαναφύγει (authz.send_retry_problem),
-- μία φορά. Νέα γραμμή στην ουρά με το ίδιο payload· το Ίχνος τη γράφει (email_outbox_audit). Επιστρέφει το id της.
create function public.send_retry(p_ref uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  o public.email_outbox;
  v_problem text;
  v_id uuid;
begin
  perform authz.require('automations.manage');
  select x.* into o from public.email_outbox x where x.id = p_ref for update;
  if not found or o.status <> 'failed'
     or coalesce((select a.event_type from public.automations a where a.id = authz.outbox_automation(o.payload)), '')
          = any (authz.send_hidden_types())
     or (o.kind in ('invoice_registered', 'invoice_overdue') and not (authz.has('finance.amounts') or authz.has('finance.invoices'))) then
    raise exception 'Ξαναστέλνεται μόνο email που απέτυχε' using errcode = 'P0001';
  end if;
  v_problem := authz.send_retry_problem(o);
  if v_problem is not null then
    raise exception '%', v_problem using errcode = 'P0001';
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
-- Χρήστες αυτού του Πελάτη (με τον Πελάτη αυτό στο σημάδι· email χωρίς Πελάτη μόνο για Χρήστη ενός Πελάτη), χωρίς περιεχόμενο.
-- Όποιος βλέπει τον Πελάτη και έχει automations.manage ή health.view, ή είναι ο Υπεύθυνός του. Ο πελάτης, ο ανύπαρκτος και ο
-- μη ορατός Πελάτης → 42501 με το ίδιο μήνυμα.
create function public.client_sends(
  p_client uuid, p_before timestamptz default null, p_before_id text default null, p_limit integer default 20
) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 50));
  f authz.send_filter;
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
  f := row('all', null, p_client, true, null, true, authz.send_hidden_types(),
           authz.has('finance.amounts') or authz.has('finance.invoices'), p_before, p_before_id, v_limit)::authz.send_filter;
  select coalesce(jsonb_agg(authz.send_json(row(x.*)::authz.send_row, false, null) order by x.at desc, x.ref desc), '[]'::jsonb)
    into v_rows
    from (select * from authz.sends_history(f) h order by h.at desc, h.ref desc limit v_limit + 1) x;
  return authz.sends_page(v_rows, v_limit);
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.send_state(text, integer, text), authz.send_reason(text, text), authz.outbox_automation(jsonb),
  authz.send_email_client(text), authz.send_email_of_client(text, uuid, boolean),
  authz.send_client_ok(authz.send_filter, uuid), authz.sends_history(authz.send_filter), authz.sends_pending(authz.send_filter),
  authz.sends_upcoming(authz.send_filter, timestamptz), authz.sends_failed_count(authz.send_filter),
  authz.sends_after(timestamptz, text, timestamptz, text, boolean), authz.send_retry_problem(public.email_outbox),
  authz.send_json(authz.send_row, boolean, uuid[]), authz.sends_page(jsonb, integer), authz.send_hidden_types()
  from public, anon, authenticated;

revoke all on function
  public.sends_list(text, text, uuid, timestamptz, text, integer, timestamptz), public.send_retry(uuid),
  public.client_sends(uuid, timestamptz, text, integer)
  from public, anon;
grant execute on function
  public.sends_list(text, text, uuid, timestamptz, text, integer, timestamptz), public.send_retry(uuid),
  public.client_sends(uuid, timestamptz, text, integer)
  to authenticated;
