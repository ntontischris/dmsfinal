-- Τ4: «Στείλε υπενθύμιση» με το χέρι για ληξιπρόθεσμο Τιμολόγιο, πάνω στον ίδιο μηχανισμό με την αυτόματη (#37).
--  • Ίδιος Αυτοματισμός: το email «Ληξιπρόθεσμο» προς τον Πελάτη (invoice.overdue, σχετικός παραλήπτης 'client').
--    Ίδιοι παραλήπτες (authz.ev_recipients), ίδιο κείμενο (authz.ev_render), ίδια ουρά (authz.ev_deliver → email_outbox).
--  • Το σημάδι μπαίνει στο automation_sends με case_key 'invoice.overdue:<Τιμολόγιο>:manual:<Χρήστης>:<ώρα>'· το 2ο
--    κομμάτι μένει το Τιμολόγιο, όπως το διαβάζουν το Ιστορικό αποστολών και ο καθαρισμός Υγείας.
--  • Μόνο όποιος «Καταχωρεί Τιμολόγια». Μόνο ληξιπρόθεσμο Τιμολόγιο με υπόλοιπο, όχι ακυρωμένο, όχι πιστωτικό.
--  • Κλειστός Αυτοματισμός = καμία υπενθύμιση, ούτε με το χέρι: ο Ιδιοκτήτης που τον έκλεισε δεν θέλει τέτοια email.
--    Η προεπισκόπηση το λέει (isEnabled) αντί να δείχνει κουμπί.
--  • Μία υπενθύμιση με το χέρι ανά Τιμολόγιο ανά 24 ώρες (από όποιον κι αν είναι): ο Πελάτης δεν παίρνει διπλά email
--    από δεύτερη καρτέλα, δεύτερο μέλος της ομάδας ή διπλό πάτημα.
--  • public.invoice_reminders: οι υπενθυμίσεις του Τιμολογίου (αυτόματες και με το χέρι, μόνο προς τον Πελάτη) για το
--    Ίχνος της σελίδας του· όπως το Ίχνος του invoice_detail, θέλει «Βλέπει το Ίχνος» (audit.view).

-- ───────────── Βοηθητικά ─────────────

-- Ο Αυτοματισμός email «Ληξιπρόθεσμο» προς τον Πελάτη: πρώτα ο ενεργός, μετά ο αρχικός. Μπορεί να είναι κλειστός·
-- η αποστολή το ελέγχει (authz.invoice_reminder_ready).
create function authz.invoice_reminder_automation() returns public.automations
language sql stable security definer set search_path = ''
as $$
  select a.* from public.automations a
   where a.event_type = 'invoice.overdue' and a.channel = 'email'
     and a.recipient_kind = 'relative' and a.recipient_relative = 'client'
   order by a.is_enabled desc, a.is_initial desc, a.sort, a.created_at
   limit 1;
$$;

-- Η «περίπτωση» της υπενθύμισης με το χέρι, όπως τη φτιάχνει η αυτόματη, με δικό της κλειδί. Λάθος αν δεν είναι ληξιπρόθεσμο.
create function authz.invoice_reminder_case(p_id uuid, p_now timestamptz) returns public.events
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_remaining numeric;
begin
  select s.client_id, s.remaining into v_client, v_remaining
    from public.invoices i
    cross join lateral authz.invoice_standings(i.client_id, null) s
   where i.id = p_id and s.invoice_id = i.id and i.voided_at is null and i.kind <> 'credit' and s.status = 'overdue' and s.remaining > 0;
  if v_client is null then
    raise exception 'Υπενθύμιση στέλνεται μόνο για ληξιπρόθεσμο Τιμολόγιο' using errcode = 'P0001';
  end if;
  return authz.timed_case('invoice.overdue', 'invoices', p_id, 'invoice.overdue:' || p_id || ':manual:' || auth.uid(),
                          v_client, authz.ev_ctx_invoice(p_id, v_remaining), p_now);
end;
$$;

-- [{ at, manual, byName, recipients }], νεότερη πρώτα: μία γραμμή ανά αποστολή (όσοι παραλήπτες κι αν είχε).
create function authz.invoice_reminder_list(p_id uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'at', x.at, 'manual', x.manual, 'byName', u.name, 'recipients', x.recipients) order by x.at desc), '[]'::jsonb)
    from (
      select min(s.created_at) as at, s.case_key like '%:manual:%' as manual,
             case when s.case_key like '%:manual:%' then nullif(split_part(s.case_key, ':', 4), '') end as by_id,
             count(*)::integer as recipients
        from public.automation_sends s
        join public.automations a on a.id = s.automation_id
       where a.event_type = 'invoice.overdue' and a.channel = 'email'
         and a.recipient_kind = 'relative' and a.recipient_relative = 'client'
         and s.case_key like 'invoice.overdue:' || p_id || ':%'
       group by s.case_key
    ) x
    left join public.team_users u on u.user_id::text = x.by_id;
$$;

-- Πότε έφυγε η τελευταία υπενθύμιση με το χέρι μέσα στις τελευταίες 24 ώρες· null = καμία.
create function authz.invoice_reminder_recent(p_id uuid, p_now timestamptz) returns timestamptz
language sql stable security definer set search_path = ''
as $$
  select max(s.created_at) from public.automation_sends s
   where s.case_key like 'invoice.overdue:' || p_id || ':manual:%'
     and s.created_at > p_now - interval '24 hours';
$$;

-- Ο Αυτοματισμός, αφού ελέγξει ότι υπάρχει, είναι ανοιχτός και δεν έφυγε υπενθύμιση με το χέρι τις τελευταίες 24 ώρες.
create function authz.invoice_reminder_ready(p_id uuid, p_now timestamptz) returns public.automations
language plpgsql stable security definer set search_path = ''
as $$
declare
  a public.automations := authz.invoice_reminder_automation();
  v_recent timestamptz := authz.invoice_reminder_recent(p_id, p_now);
begin
  if a.id is null then
    raise exception 'Λείπει το μήνυμα «Ληξιπρόθεσμο» από τους Αυτοματισμούς' using errcode = 'P0001';
  end if;
  if not a.is_enabled then
    raise exception 'Ο Αυτοματισμός «Ληξιπρόθεσμο» είναι κλειστός. Άνοιξέ τον από τους Αυτοματισμούς για να στέλνονται υπενθυμίσεις.'
      using errcode = 'P0001';
  end if;
  if v_recent is not null then
    raise exception 'Στάλθηκε υπενθύμιση πριν από λίγο (στις %). Ξαναδοκίμασε αύριο.',
      to_char(v_recent at time zone 'Europe/Athens', 'HH24:MI') using errcode = 'P0001';
  end if;
  return a;
end;
$$;

-- ───────────── Προεπισκόπηση και αποστολή ─────────────

-- { recipients: [{ name, email }], subject, body, lastAt, isEnabled, recentAt }. recentAt = υπενθύμιση με το χέρι
-- τις τελευταίες 24 ώρες (τότε δεν φεύγει άλλη). Το κείμενο όπως θα φύγει στον πρώτο παραλήπτη.
create function public.invoice_reminder_preview(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  a public.automations;
  e public.events;
  v_first authz.ev_recipient;
  v_vars jsonb;
  v_allowed text[];
begin
  perform authz.require('finance.invoices');
  a := authz.invoice_reminder_automation();
  if a.id is null then
    raise exception 'Λείπει το μήνυμα «Ληξιπρόθεσμο» από τους Αυτοματισμούς' using errcode = 'P0001';
  end if;
  e := authz.invoice_reminder_case(p_id, now());
  select * into v_first from authz.ev_recipients(a, e) r where coalesce(trim(r.email), '') <> '' order by r.name limit 1;
  v_vars := e.payload || jsonb_build_object('recipientName', coalesce(v_first.name, ''), 'companyName', authz.ev_company(),
                                            'link', coalesce(e.payload ->> 'client_link', ''));
  v_allowed := (select t.variables from public.event_types t where t.code = e.type);
  return jsonb_build_object(
    'recipients', coalesce((select jsonb_agg(jsonb_build_object('name', r.name, 'email', lower(trim(r.email))) order by r.name)
                              from authz.ev_recipients(a, e) r where coalesce(trim(r.email), '') <> ''), '[]'::jsonb),
    'subject', regexp_replace(authz.ev_render(a.subject_el, v_vars, v_allowed), '\s*[\r\n]+\s*', ' ', 'g'),
    'body', authz.ev_render(a.body_el, v_vars, v_allowed),
    'lastAt', (authz.invoice_reminder_list(p_id) -> 0) ->> 'at',
    'isEnabled', a.is_enabled,
    'recentAt', authz.invoice_reminder_recent(p_id, now()));
end;
$$;

-- Στέλνει την υπενθύμιση σε όλους τους παραλήπτες. { sent }. Λάθος αν ο Αυτοματισμός είναι κλειστός, αν έφυγε ήδη
-- υπενθύμιση τις τελευταίες 24 ώρες, αν δεν υπάρχει κανείς με email, ή αν δεν μπήκε τίποτα στην ουρά (ίδια περίπτωση).
create function public.invoice_reminder_send(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  a public.automations;
  e public.events;
  r authz.ev_recipient;
  v_now timestamptz := now();
  v_sent integer := 0;
  v_with_email integer := 0;
begin
  perform authz.require('finance.invoices');
  e := authz.invoice_reminder_case(p_id, v_now);
  a := authz.invoice_reminder_ready(p_id, v_now);
  for r in select * from authz.ev_recipients(a, e) loop
    if coalesce(trim(r.email), '') <> '' then
      v_with_email := v_with_email + 1;
    end if;
    if authz.ev_deliver(a, e, r, v_now) then
      v_sent := v_sent + 1;
    end if;
  end loop;
  if v_with_email = 0 then
    raise exception 'Ο Πελάτης δεν έχει επαφή με email για τα Οικονομικά' using errcode = 'P0001';
  end if;
  if v_sent = 0 then
    raise exception 'Η υπενθύμιση δεν μπήκε στην ουρά (ίσως έφυγε ήδη). Δες το Ίχνος.' using errcode = 'P0001';
  end if;
  return jsonb_build_object('sent', v_sent);
end;
$$;

-- Οι υπενθυμίσεις ενός Τιμολογίου, για όποιον βλέπει τη σελίδα του και το Ίχνος της (όπως η public.invoice_detail).
create function public.invoice_reminders(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require('finance.view');
  perform authz.require('finance.amounts');
  if authz.scope('finance.amounts') is distinct from 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.require('audit.view');
  return authz.invoice_reminder_list(p_id);
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.invoice_reminder_automation(), authz.invoice_reminder_case(uuid, timestamptz), authz.invoice_reminder_list(uuid),
  authz.invoice_reminder_recent(uuid, timestamptz), authz.invoice_reminder_ready(uuid, timestamptz)
  from public, anon, authenticated;

revoke all on function
  public.invoice_reminder_preview(uuid), public.invoice_reminder_send(uuid), public.invoice_reminders(uuid)
  from public, anon;

grant execute on function
  public.invoice_reminder_preview(uuid), public.invoice_reminder_send(uuid), public.invoice_reminders(uuid)
  to authenticated;
