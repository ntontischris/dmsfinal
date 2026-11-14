-- Υπογραφή μέσα στην εφαρμογή (b11): ο Χρήστης πελάτη υπογράφει την πρόταση από τη Σελίδα Συμφωνίας, με τον ίδιο
-- κωδικό 6 ψηφίων του Συνδέσμου, και βλέπει την κάρτα «Για υπογραφή» στη Σήμερα.
--
--  • Ίδια ροή με τον Σύνδεσμο: τα σώματα των agreement_public_request_code / agreement_public_sign μεταφέρονται αυτούσια
--    σε authz συναρτήσεις που παίρνουν τη γραμμή του Συνδέσμου. Οι δημόσιες γίνονται λεπτά περιτυλίγματα (ίδια υπογραφή,
--    ίδια Δικαιώματα, ίδια συμπεριφορά). Όρια, λήξη και προσπάθειες κωδικού μένουν ανά Σύνδεσμο: κοινά για τους δύο δρόμους.
--  • Ποιος υπογράφει: ο Χρήστης πελάτη με «Βλέπει Συμφωνίες» και «Υπογράφει Συμφωνία» στον τρέχοντα Πελάτη του, όταν το
--    email του είναι το email του Υπογράφοντα σε ενεργό Σύνδεσμο της τρέχουσας αναθεώρησης. Αλλιώς «not_signatory».
--  • Η υπογραφή καταγράφεται όπως του Συνδέσμου (method 'link', με τον Σύνδεσμο που ταίριαξε): ίδιο έγγραφο, ίδιο ίχνος.
--  • Κάρτα «Για υπογραφή» (client_sign, sort 605): οι προτάσεις που περιμένουν την υπογραφή του θεατή.
--  • Δεν προστίθενται πίνακες, άρα το Ίχνος δεν αλλάζει.

-- ───────────── Τα σώματα της υπογραφής, πάνω σε Σύνδεσμο ─────────────

-- Βήμα 1: όνομα + «Αποδέχομαι» → κωδικός. Ίδιο σώμα με το agreement_public_request_code του 20261009100000.
create function authz.agreement_request_code_on(l public.agreement_links, p_name text, p_accepted boolean, p_ip text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  v_status text;
  v_name text := trim(coalesce(p_name, ''));
  v_last timestamptz;
  v_recent integer;
  v_total integer;
  v_oldest timestamptz;
  v_code text;
  v_salt text := authz.new_token();
  v_connected boolean;
begin
  select * into a from public.agreements x where x.id = l.agreement_id;
  v_status := authz.link_status(l, a);
  if v_status <> 'active' then
    return jsonb_build_object('status', v_status);
  end if;
  if not l.is_signatory then
    return jsonb_build_object('status', 'not_signatory');
  end if;
  if length(v_name) = 0 or length(v_name) > 120 then
    return jsonb_build_object('status', 'invalid_name');
  end if;
  if not coalesce(p_accepted, false) then
    return jsonb_build_object('status', 'not_accepted');
  end if;
  select max(o.created_at), count(*) filter (where o.created_at > now() - interval '1 hour'), min(o.created_at) filter (where o.created_at > now() - interval '1 hour'), count(*)
    into v_last, v_recent, v_oldest, v_total from public.agreement_otps o where o.link_id = l.id;
  -- Πλαφόν ζωής: το πολύ 20 κωδικοί ανά Σύνδεσμο (έως 100 μαντεψιές συνολικά)· μετά η ομάδα εκδίδει νέο Σύνδεσμο.
  if v_total >= 20 then
    return jsonb_build_object('status', 'locked');
  end if;
  if v_last is not null and v_last > now() - interval '60 seconds' then
    return jsonb_build_object('status', 'rate_limited', 'retry_after', ceil(extract(epoch from (v_last + interval '60 seconds' - now())))::integer);
  end if;
  if v_recent >= 5 then
    return jsonb_build_object('status', 'rate_limited', 'retry_after', ceil(extract(epoch from (v_oldest + interval '1 hour' - now())))::integer);
  end if;
  update public.agreement_otps set superseded_at = now() where link_id = l.id and consumed_at is null and superseded_at is null;
  update public.agreement_outbox set status = 'cancelled', handled_at = now(), payload = '{}'::jsonb
   where link_id = l.id and kind = 'signing_code' and status = 'pending';
  v_code := lpad((((('x' || left(replace(gen_random_uuid()::text, '-', ''), 8))::bit(32))::bigint) % 1000000)::text, 6, '0');
  insert into public.agreement_otps (link_id, code_hash, salt, name_entered, ip, expires_at)
  values (l.id, encode(sha256(convert_to(v_code || v_salt, 'UTF8')), 'hex'), v_salt, v_name, left(coalesce(p_ip, ''), 64), now() + interval '10 minutes');
  insert into public.agreement_outbox (agreement_id, link_id, kind, to_name, to_email, locale, payload)
  values (a.id, l.id, 'signing_code', l.recipient_name, l.recipient_email, a.language,
          jsonb_build_object('code', v_code, 'expires_at', now() + interval '10 minutes'));
  perform authz.agreement_event(a.id, 'signing_code_requested');
  select d.email_sender_connected into v_connected from public.agreement_defaults d where d.id;
  return jsonb_build_object(
    'status', 'sent', 'channel', case when v_connected then 'email' else 'manual' end,
    'masked_email', left(split_part(l.recipient_email, '@', 1), 1) || '•••@' || split_part(l.recipient_email, '@', 2));
end;
$$;

-- Βήμα 2: ο κωδικός. Ίδιο σώμα με το agreement_public_sign του 20261009100000.
create function authz.agreement_sign_on(l public.agreement_links, p_code text, p_ip text, p_user_agent text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  a public.agreements;
  o public.agreement_otps;
  v_status text;
  v_attempts integer;
  v_connected boolean;
begin
  select * into a from public.agreements x where x.id = l.agreement_id for update;
  v_status := authz.link_status(l, a);
  if v_status <> 'active' then
    return jsonb_build_object('status', v_status);
  end if;
  if not l.is_signatory then
    return jsonb_build_object('status', 'not_signatory');
  end if;
  select * into o from public.agreement_otps x
   where x.link_id = l.id and x.consumed_at is null and x.superseded_at is null order by x.created_at desc limit 1 for update;
  if not found or o.expires_at < now() then
    return jsonb_build_object('status', 'code_expired');
  end if;
  if o.attempts >= 5 then
    return jsonb_build_object('status', 'locked');
  end if;
  v_attempts := o.attempts + 1;
  update public.agreement_otps set attempts = v_attempts where id = o.id;
  if coalesce(p_code, '') !~ '^[0-9]{6}$'
     or encode(sha256(convert_to(p_code || o.salt, 'UTF8')), 'hex') <> o.code_hash then
    return jsonb_build_object('status', case when v_attempts >= 5 then 'locked' else 'wrong_code' end, 'attempts_left', greatest(5 - v_attempts, 0));
  end if;
  update public.agreement_otps set consumed_at = now() where id = o.id;
  select d.email_sender_connected into v_connected from public.agreement_defaults d where d.id;
  perform authz.agreement_finalize_signature(a.id, 'link', o.name_entered, jsonb_build_object(
    'link_id', l.id, 'ip', left(coalesce(p_ip, ''), 64), 'user_agent', left(coalesce(p_user_agent, ''), 300),
    'otp_delivery', case when v_connected then 'email' else 'manual' end));
  return jsonb_build_object('status', 'signed', 'signed_at', (select x.signed_at from public.agreements x where x.id = a.id));
end;
$$;

-- ───────────── Ο Σύνδεσμος: λεπτά περιτυλίγματα, ίδια συμπεριφορά ─────────────

create or replace function public.agreement_public_request_code(p_token text, p_name text, p_accepted boolean, p_ip text default '')
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.agreement_links;
begin
  l := authz.public_link(p_token);
  if l.id is null then
    return jsonb_build_object('status', 'unknown');
  end if;
  return authz.agreement_request_code_on(l, p_name, p_accepted, p_ip);
end;
$$;

create or replace function public.agreement_public_sign(p_token text, p_code text, p_ip text default '', p_user_agent text default '')
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.agreement_links;
begin
  l := authz.public_link(p_token);
  if l.id is null then
    return jsonb_build_object('status', 'unknown');
  end if;
  return authz.agreement_sign_on(l, p_code, p_ip, p_user_agent);
end;
$$;

-- ───────────── Ο Χρήστης πελάτη ─────────────

-- Ο ενεργός Σύνδεσμος Υπογράφοντα της τρέχουσας αναθεώρησης με το email του θεατή, ή null. Χωρίς έλεγχο Δικαιώματος.
create function authz.client_signing_link(a public.agreements, p_uid uuid) returns public.agreement_links
language sql stable security definer set search_path = ''
as $$
  select l.*
    from public.agreement_links l
    join auth.users u on u.id = p_uid and lower(u.email) = lower(l.recipient_email)
   where l.agreement_id = a.id and l.is_signatory and l.revision = a.revision and authz.link_status(l, a) = 'active'
   order by l.issued_at desc
   limit 1;
$$;

-- Η πρόταση του τρέχοντος Πελάτη και ο Σύνδεσμός της για τον θεατή. o_status: null όταν βρέθηκε Σύνδεσμος, αλλιώς τι
-- να απαντηθεί (unknown, signed, not_signatory). Χωρίς «Βλέπει Συμφωνίες» ή «Υπογράφει Συμφωνία»: 42501.
create function authz.client_signing_target(p_agreement uuid, out o_link public.agreement_links, out o_status text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid := authz.require_client_agreements();
  a public.agreements;
begin
  if not authz.client_user_has('c.sign') then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.agreements x join public.opportunities o on o.id = x.opportunity_id
     where x.id = p_agreement and o.client_id = v_client) then
    o_status := 'unknown';
    return;
  end if;
  perform authz.agreement_settle(p_agreement);
  select * into a from public.agreements x where x.id = p_agreement;
  if not authz.client_agreement_visible(a) then
    o_status := 'unknown';
  elsif a.state <> 'proposal' then
    o_status := 'signed';
  else
    o_link := authz.client_signing_link(a, auth.uid());
    if o_link.id is null then
      o_status := 'not_signatory';
    end if;
  end if;
end;
$$;

-- Μπορεί ο θεατής να υπογράψει εδώ; Χωρίς «Υπογράφει Συμφωνία» απλώς false (η σελίδα δείχνει το έγγραφο).
create function public.agreement_client_can_sign(p_agreement uuid) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  t record;
begin
  perform authz.require_client_agreements();
  if not authz.client_user_has('c.sign') then
    return false;
  end if;
  t := authz.client_signing_target(p_agreement);
  return t.o_status is null;
end;
$$;

create function public.agreement_client_request_code(p_agreement uuid, p_name text, p_accepted boolean, p_ip text default '')
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  t record;
begin
  t := authz.client_signing_target(p_agreement);
  if t.o_status is not null then
    return jsonb_build_object('status', t.o_status);
  end if;
  return authz.agreement_request_code_on(t.o_link, p_name, p_accepted, p_ip);
end;
$$;

create function public.agreement_client_sign(p_agreement uuid, p_code text, p_ip text default '', p_user_agent text default '')
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  t record;
begin
  t := authz.client_signing_target(p_agreement);
  if t.o_status is not null then
    return jsonb_build_object('status', t.o_status);
  end if;
  return authz.agreement_sign_on(t.o_link, p_code, p_ip, p_user_agent);
end;
$$;

-- ───────────── Κάρτα «Για υπογραφή» (c.agreements και c.sign) ─────────────

create function authz.today_client_sign_rows(p_uid uuid, p_client uuid, p_now timestamptz)
returns table (id text, title text, subtitle text, at timestamptz, urgent boolean)
language sql stable security definer set search_path = ''
as $$
  select a.id::text, a.title,
         case when a.valid_until is not null then 'Ισχύει ως ' || to_char(a.valid_until, 'DD/MM/YYYY') end,
         (select r.sent_at from public.agreement_revisions r where r.agreement_id = a.id and r.number = a.revision),
         a.valid_until is not null and a.valid_until <= (p_now at time zone 'Europe/Athens')::date + 2
    from public.agreements a
    join public.opportunities o on o.id = a.opportunity_id
   where o.client_id = p_client and a.state = 'proposal'
     and (authz.client_signing_link(a, p_uid)).id is not null;
$$;

create function authz.today_client_sign_can(p_uid uuid, p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select authz.today_client_can(p_uid, p_client, array['c.agreements'])
     and authz.today_client_can(p_uid, p_client, array['c.sign']);
$$;

create function authz.today_count_client_sign(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_sign_can(p_uid, p_client) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_client_sign_rows(p_uid, p_client, p_now));
end;
$$;

-- Πρώτα όσες λήγουν σύντομα, μετά η παλαιότερη αποστολή.
create function authz.today_items_client_sign(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_sign_can(p_uid, p_client) then
    perform authz.today_client_deny();
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', r.at,
                                        'urgent', r.urgent, 'link', '/app/agreements/' || r.id)
                     order by r.urgent desc, r.at nulls last, r.id)
      from (select * from authz.today_client_sign_rows(p_uid, p_client, p_now) s
             order by s.urgent desc, s.at nulls last, s.id limit 3) r),
    '[]'::jsonb);
end;
$$;

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('client_sign', 'client', 'action', 'client', 605, 'Για υπογραφή', 'To sign', '/app/agreements',
   'authz.today_count_client_sign(uuid, uuid, timestamptz)', 'authz.today_items_client_sign(uuid, uuid, timestamptz)');

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.agreement_request_code_on(public.agreement_links, text, boolean, text),
  authz.agreement_sign_on(public.agreement_links, text, text, text),
  authz.client_signing_link(public.agreements, uuid),
  authz.client_signing_target(uuid),
  authz.today_client_sign_rows(uuid, uuid, timestamptz),
  authz.today_client_sign_can(uuid, uuid),
  authz.today_count_client_sign(uuid, uuid, timestamptz),
  authz.today_items_client_sign(uuid, uuid, timestamptz)
  from public, anon, authenticated;

revoke all on function
  public.agreement_client_can_sign(uuid),
  public.agreement_client_request_code(uuid, text, boolean, text),
  public.agreement_client_sign(uuid, text, text, text)
  from public, anon;
grant execute on function
  public.agreement_client_can_sign(uuid),
  public.agreement_client_request_code(uuid, text, boolean, text),
  public.agreement_client_sign(uuid, text, text, text)
  to authenticated;
