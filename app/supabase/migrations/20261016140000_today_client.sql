-- Σήμερα Σε (#184): οι πέντε κάρτες του Χρήστη πελάτη (κανόνας 3). Ομάδα client, audience client, sort 610–650.
--
--  • Μόνο γραμμές στο μητρώο και δικές μας συναρτήσεις, κατά τη σύμβαση του 20261016100000_today.sql· καμία κοινή
--    συνάρτηση δεν ξαναγράφεται.
--  • Ο Πελάτης είναι πάντα ο p_client (ο τρέχων του θεατή, από την public.today_card). Δικαίωμα: ο Ρόλος του Χρήστη στον
--    p_client (authz.ev_client_has), όπως στη σελίδα-ουρά. Χρήστης ομάδας, Πελάτης που δεν είναι δικός του ή χωρίς
--    Δικαίωμα: null στο πλήθος, 42501 στις γραμμές.
--  • Τίποτα εσωτερικό: ούτε Εσωτερικά Μηνύματα, ούτε υπεύθυνοι, προθεσμίες ομάδας, χρέωση ή κόστος.
--      client_waiting   c.approve                  Εκδόσεις σε αναμονή απάντησης (H3 «Περιμένουν εσένα»)
--      client_owes      c.finance                  Τιμολόγια με υπόλοιπο, ληξιπρόθεσμα πρώτα (I2/I5)· ποσά, γιατί η ουρά τα δείχνει
--      client_requests  c.chatRead                 ανοιχτά Αιτήματα και αλλαγές μετά την έγκριση (J3, καρτέλα Αιτήματα)
--      client_filming   c.book                     τα επόμενα Γυρίσματα (E1), εβδομάδας: μένει και άδεια
--      client_allowance c.productions ή c.approve  οι Παροχές της τρέχουσας Περιόδου (H3), εβδομάδας
--  • Επείγον (κανόνας 5): μόνο το ληξιπρόθεσμο Τιμολόγιο. Ο πελάτης δεν έχει προθεσμίες ή Επόμενα βήματα.
--  • Δεν προστίθενται πίνακες, άρα το Ίχνος δεν αλλάζει.

-- ───────────── Βοηθητικά ─────────────

-- Ο Χρήστης πελάτη p_uid έχει ένα από αυτά τα Δικαιώματα στον Πελάτη p_client.
create function authz.today_client_can(p_uid uuid, p_client uuid, p_perms text[]) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_client is not null and not authz.user_is_team(p_uid) and authz.ev_client_has(p_uid, p_client, p_perms);
$$;

create function authz.today_client_deny() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
end;
$$;

-- Αριθμός Παροχής για ανάγνωση: 1,5 και όχι 1.50.
create function authz.today_num(p numeric) returns text
language sql immutable set search_path = ''
as $$ select replace(trim_scale(p)::text, '.', ','); $$;

-- ───────────── Κάρτα «Περιμένουν εσένα» (c.approve) ─────────────

create function authz.today_client_waiting_rows(p_client uuid)
returns table (id text, title text, subtitle text, at timestamptz, link text)
language sql stable security definer set search_path = ''
as $$
  select d.id::text, d.title, 'Έκδοση ' || v.number, v.sent_at, '/app/deliverables/' || d.id
    from public.deliverables d
    join public.productions p on p.id = d.production_id
    cross join lateral (select x.number, x.sent_at from public.deliverable_versions x
                         where x.deliverable_id = d.id and x.state = 'awaiting_client'
                         order by x.number desc limit 1) v
   where p.client_id = p_client and d.cancelled_at is null;
$$;

create function authz.today_count_client_waiting(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_can(p_uid, p_client, array['c.approve']) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_client_waiting_rows(p_client));
end;
$$;

-- Η παλαιότερη αναμονή πρώτη.
create function authz.today_items_client_waiting(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_can(p_uid, p_client, array['c.approve']) then
    perform authz.today_client_deny();
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', r.at,
                                        'urgent', false, 'link', r.link) order by r.at nulls last, r.id)
      from (select * from authz.today_client_waiting_rows(p_client) w order by w.at nulls last, w.id limit 3) r),
    '[]'::jsonb);
end;
$$;

-- ───────────── Κάρτα «Τι χρωστάς» (c.finance) ─────────────

-- Τα Τιμολόγια και οι Αποδείξεις με υπόλοιπο, με την ίδια κατανομή Εισπράξεων με την Καρτέλα (authz.invoice_standings).
create function authz.today_client_owes_rows(p_client uuid, p_now timestamptz)
returns table (id text, title text, subtitle text, urgent boolean, amount_cents bigint, due date, issued date)
language sql stable security definer set search_path = ''
as $$
  select i.id::text,
         case i.kind when 'receipt' then 'Απόδειξη ' else 'Τιμολόγιο ' end || i.number,
         case when s.status = 'overdue' then 'Ληξιπρόθεσμο από ' || to_char(i.due_date, 'DD/MM/YYYY')
              when i.due_date is not null then 'Λήγει ' || to_char(i.due_date, 'DD/MM/YYYY') end,
         s.status = 'overdue', round(s.remaining * 100)::bigint, i.due_date, i.issue_date
    from authz.invoice_standings(p_client, (p_now at time zone 'Europe/Athens')::date) s
    join public.invoices i on i.id = s.invoice_id
   where s.status in ('unpaid', 'partial', 'overdue') and s.remaining > 0;
$$;

create function authz.today_count_client_owes(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_can(p_uid, p_client, array['c.finance']) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_client_owes_rows(p_client, p_now));
end;
$$;

-- Ληξιπρόθεσμα πρώτα, μετά κατά λήξη. Το ποσό είναι το υπόλοιπο, όπως στα Τιμολόγια του πελάτη.
create function authz.today_items_client_owes(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_can(p_uid, p_client, array['c.finance']) then
    perform authz.today_client_deny();
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', null,
                                        'urgent', r.urgent, 'amount_cents', r.amount_cents,
                                        'link', '/app/finance/invoices')
                     order by r.urgent desc, r.due nulls last, r.issued, r.id)
      from (select * from authz.today_client_owes_rows(p_client, p_now) o
             order by o.urgent desc, o.due nulls last, o.issued, o.id limit 3) r),
    '[]'::jsonb);
end;
$$;

-- ───────────── Κάρτα «Τα ανοιχτά Αιτήματά σου» (c.chatRead) ─────────────

-- Ό,τι δείχνει η καρτέλα Αιτήματα του πελάτη ως ανοιχτό: Αιτήματα σε μη Εσωτερικά, μη διαγραμμένα Μηνύματα, και αλλαγές
-- μετά την έγκριση που δεν έχουν απόφαση.
create function authz.today_client_requests_rows(p_client uuid)
returns table (id text, title text, subtitle text, at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select r.message_id::text, left(m.body, 120),
         case r.kind when 'deliverable' then 'Νέο Παραδοτέο' when 'filming' then 'Γύρισμα' else 'Άλλο' end,
         r.declared_at
    from public.message_requests r
    join public.messages m on m.id = r.message_id
   where m.client_id = p_client and m.deleted_at is null and not m.is_internal and r.state = 'open'
  union all
  select q.id::text, left(q.body, 120), 'Αλλαγή: ' || d.title, q.created_at
    from public.deliverable_requests q
    join public.deliverables d on d.id = q.deliverable_id
    join public.productions p on p.id = d.production_id
   where p.client_id = p_client and q.decision is null;
$$;

create function authz.today_count_client_requests(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_can(p_uid, p_client, array['c.chatRead']) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_client_requests_rows(p_client));
end;
$$;

-- Το παλαιότερο ανοιχτό πρώτο.
create function authz.today_items_client_requests(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_can(p_uid, p_client, array['c.chatRead']) then
    perform authz.today_client_deny();
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', r.at,
                                        'urgent', false, 'link', '/app/messages?tab=requests') order by r.at, r.id)
      from (select * from authz.today_client_requests_rows(p_client) q order by q.at, q.id limit 3) r),
    '[]'::jsonb);
end;
$$;

-- ───────────── Κάρτα «Τα επόμενα Γυρίσματα» (c.book) ─────────────

-- Γυρίσματα του Πελάτη που αναμένουν έγκριση ή είναι προγραμματισμένα, από το p_now και μετά.
create function authz.today_client_filming_rows(p_client uuid, p_now timestamptz)
returns table (id text, title text, subtitle text, at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select f.id::text, coalesce(f.location, k.label, 'Γύρισμα'),
         case when f.state = 'pending' then 'αναμένει έγκριση' end, f.starts_at
    from public.filmings f
    left join public.provision_kinds k on k.id = f.kind_id
   where f.client_id = p_client and f.state in ('pending', 'scheduled') and f.starts_at >= p_now;
$$;

create function authz.today_count_client_filming(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_can(p_uid, p_client, array['c.book']) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_client_filming_rows(p_client, p_now));
end;
$$;

-- Το πιο κοντινό πρώτο.
create function authz.today_items_client_filming(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_can(p_uid, p_client, array['c.book']) then
    perform authz.today_client_deny();
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', r.at,
                                        'urgent', false, 'link', '/app/filming/' || r.id) order by r.at, r.id)
      from (select * from authz.today_client_filming_rows(p_client, p_now) f order by f.at, f.id limit 3) r),
    '[]'::jsonb);
end;
$$;

-- ───────────── Κάρτα «Οι Παροχές του μήνα» (c.productions ή c.approve) ─────────────

-- Μία γραμμή ανά είδος Παροχής της τρέχουσας Περιόδου κάθε υπογεγραμμένης ή ενεργής Συμφωνίας του Πελάτη. Τα υπόλοιπα
-- είναι της authz.period_balances (χωρίς ποσά), όπως οι Παροχές των Παραδοτέων του πελάτη.
create function authz.today_client_allowance_rows(p_client uuid, p_now timestamptz)
returns table (id text, title text, subtitle text, starts date, agreement uuid, ord bigint)
language sql stable security definer set search_path = ''
as $$
  select pe.id::text || ':' || (b.value ->> 'kind_id'),
         (b.value ->> 'label') || ': μένουν ' || authz.today_num((b.value ->> 'balance')::numeric),
         'χρησιμοποιήθηκαν ' || authz.today_num((b.value ->> 'used')::numeric + (b.value ->> 'reserved')::numeric)
           || ' από ' || authz.today_num((b.value ->> 'given')::numeric + (b.value ->> 'carried')::numeric)
           || ', ως ' || to_char(pe.ends, 'DD/MM/YYYY'),
         pe.starts, a.id, b.ord
    from public.agreements a
    join public.opportunities o on o.id = a.opportunity_id
    join public.agreement_periods pe on pe.agreement_id = a.id
    cross join lateral jsonb_array_elements(authz.period_balances(pe.id)) with ordinality as b (value, ord)
   where o.client_id = p_client and a.state in ('signed', 'active')
     and (p_now at time zone 'Europe/Athens')::date between pe.starts and pe.ends;
$$;

create function authz.today_count_client_allowance(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_can(p_uid, p_client, array['c.productions', 'c.approve']) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_client_allowance_rows(p_client, p_now));
end;
$$;

create function authz.today_items_client_allowance(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_can(p_uid, p_client, array['c.productions', 'c.approve']) then
    perform authz.today_client_deny();
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', null,
                                        'urgent', false, 'link', '/app/deliverables')
                     order by r.starts, r.agreement, r.ord)
      from (select * from authz.today_client_allowance_rows(p_client, p_now) x
             order by x.starts, x.agreement, x.ord limit 3) r),
    '[]'::jsonb);
end;
$$;

-- ───────────── Μητρώο ─────────────

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('client_waiting', 'client', 'action', 'client', 610, 'Περιμένουν εσένα', 'Waiting for you', '/app/deliverables',
   'authz.today_count_client_waiting(uuid, uuid, timestamptz)', 'authz.today_items_client_waiting(uuid, uuid, timestamptz)'),
  ('client_owes', 'client', 'action', 'client', 620, 'Τι χρωστάς', 'What you owe', '/app/finance/ledger',
   'authz.today_count_client_owes(uuid, uuid, timestamptz)', 'authz.today_items_client_owes(uuid, uuid, timestamptz)'),
  ('client_requests', 'client', 'action', 'client', 630, 'Τα ανοιχτά Αιτήματά σου', 'Your open requests',
   '/app/messages?tab=requests',
   'authz.today_count_client_requests(uuid, uuid, timestamptz)', 'authz.today_items_client_requests(uuid, uuid, timestamptz)'),
  ('client_filming', 'client', 'week', 'client', 640, 'Τα επόμενα Γυρίσματα', 'Upcoming filmings', '/app/filming',
   'authz.today_count_client_filming(uuid, uuid, timestamptz)', 'authz.today_items_client_filming(uuid, uuid, timestamptz)'),
  ('client_allowance', 'client', 'week', 'client', 650, 'Οι Παροχές του μήνα', 'This month''s allowance', '/app/deliverables',
   'authz.today_count_client_allowance(uuid, uuid, timestamptz)',
   'authz.today_items_client_allowance(uuid, uuid, timestamptz)');

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.today_client_can(uuid, uuid, text[]), authz.today_client_deny(), authz.today_num(numeric),
  authz.today_client_waiting_rows(uuid),
  authz.today_count_client_waiting(uuid, uuid, timestamptz), authz.today_items_client_waiting(uuid, uuid, timestamptz),
  authz.today_client_owes_rows(uuid, timestamptz),
  authz.today_count_client_owes(uuid, uuid, timestamptz), authz.today_items_client_owes(uuid, uuid, timestamptz),
  authz.today_client_requests_rows(uuid),
  authz.today_count_client_requests(uuid, uuid, timestamptz), authz.today_items_client_requests(uuid, uuid, timestamptz),
  authz.today_client_filming_rows(uuid, timestamptz),
  authz.today_count_client_filming(uuid, uuid, timestamptz), authz.today_items_client_filming(uuid, uuid, timestamptz),
  authz.today_client_allowance_rows(uuid, timestamptz),
  authz.today_count_client_allowance(uuid, uuid, timestamptz), authz.today_items_client_allowance(uuid, uuid, timestamptz)
  from public, anon, authenticated;
