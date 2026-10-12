-- Σήμερα Σβ (#181): οι κάρτες «περιμένει απόφαση και κρατά άλλους» (ομάδα decide, sort 100–199).
--
--  • Προτάσεις προς έγκριση (D4): ό,τι δείχνει το public.agreement_approvals_view, για όποιον «Παρεκκλίνει από τον Κατάλογο».
--    Ποσό (η τιμή της πρότασης) μόνο με finance.amounts, όπως στην ουρά. Επείγον: λήγει (Ισχύει έως) ως αύριο ή έληξε.
--    Κανόνας 8: μόνο με δεύτερο άνθρωπο.
--  • Γυρίσματα προς έγκριση (E2): οι κρατήσεις που αναμένουν έγκριση, τα αιτήματα ακύρωσης και τα αιτήματα μετάθεσης, όπως
--    στο public.filming_queue_view (filming.approve με Εύρος «όλα»). Επείγον: το Γύρισμα (ή η νέα ώρα της μετάθεσης) είναι
--    σε έως 24 ώρες ή πέρασε.
--  • Διαγραφές από το Google (A7): οι ανοιχτές του public.google_deletions_view (calendar.google). Επείγον: λιγότερες από
--    12 ώρες ως την προθεσμία.
--  • Χωρίς υπεύθυνο (B5): οι ανοιχτές Ευκαιρίες χωρίς Υπεύθυνο και τα Αιτήματα πρόσβασης σε αναμονή, για όποιον «Μεταβιβάζει
--    Υπεύθυνο» (ο οποίος, κατά το RLS των δύο πινάκων, τα βλέπει όλα). Κανόνας 8: μόνο με δεύτερο άνθρωπο.
-- Σύμβαση: δες το 20261016100000_today.sql. Κάρτα ομάδας: p_client μη null → null (count) ή 42501 (items).

-- ───────────── Προτάσεις προς έγκριση ─────────────

create function authz.today_proposal_approvals_open(p_uid uuid, p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select p_client is null and authz.user_scope(p_uid, 'agreements.deviate') is not null; $$;

create function authz.today_proposal_approvals_rows()
returns table (id uuid, title text, client_name text, requested_at timestamptz, valid_until date)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.title, c.name, r.requested_at, a.valid_until
    from public.agreements a
    join public.agreement_revisions r on r.agreement_id = a.id and r.number = a.revision and r.approval_state = 'pending'
    join public.opportunities o on o.id = a.opportunity_id
    join public.clients c on c.id = o.client_id
   where a.state = 'proposal' and a.path = 'awaiting_approval';
$$;

create function authz.today_count_proposal_approvals(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_proposal_approvals_open(p_uid, p_client) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_proposal_approvals_rows());
end;
$$;

-- Πρώτα όσες λήγουν ως αύριο (κανόνας 5: προθεσμία σε έως 1 μέρα ή περασμένη), μετά οι παλαιότερες, όπως στην ουρά.
create function authz.today_items_proposal_approvals(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_amounts boolean;
  v_due date := (p_now at time zone 'Europe/Athens')::date + 1;
begin
  if not authz.today_proposal_approvals_open(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  v_amounts := authz.user_scope(p_uid, 'finance.amounts') is not null;
  return coalesce((
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
             'id', x.id::text, 'title', x.title, 'subtitle', x.client_name || ' · με Παρέκκλιση', 'at', x.requested_at,
             'urgent', x.urgent, 'link', '/app/agreements/approvals',
             'amount_cents', case when v_amounts then (select round(f.price * 100)::bigint from authz.agreement_figures(x.id) f) end))
           order by x.urgent desc, x.requested_at, x.id)
      from (select r.*, r.valid_until <= v_due as urgent
              from authz.today_proposal_approvals_rows() r
             order by r.valid_until <= v_due desc, r.requested_at, r.id limit 3) x),
    '[]'::jsonb);
end;
$$;

-- ───────────── Γυρίσματα προς έγκριση ─────────────

create function authz.today_filming_approvals_open(p_uid uuid, p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select p_client is null and coalesce(authz.user_scope(p_uid, 'filming.approve') = 'all', false); $$;

-- Ίδια επιλογή με το public.filming_queue_view: όλες οι κρατήσεις σε αναμονή, τα αιτήματα ακύρωσης Γυρισμάτων που
-- ανήκουν σε Συμφωνία, και τα αιτήματα μετάθεσης. Στη μετάθεση μετρά η πιο κοντινή από την τωρινή και τη νέα ώρα.
create function authz.today_filming_approvals_rows()
returns table (id uuid, title text, starts_at timestamptz, kind text)
language sql stable security definer set search_path = ''
as $$
  select f.id, coalesce(c.name, pr.title) || ': κράτηση', f.starts_at, 'booking'
    from public.filmings f
    join public.productions pr on pr.id = f.production_id
    left join public.clients c on c.id = f.client_id
   where f.state = 'pending'
  union all
  select f.id, coalesce(c.name, pr.title) || ': ζητά ακύρωση', f.starts_at, 'cancel'
    from public.filmings f
    join public.productions pr on pr.id = f.production_id
    join public.agreements a on a.id = pr.agreement_id
    left join public.clients c on c.id = f.client_id
   where f.state = 'scheduled' and f.cancel_request_at is not null
  union all
  select f.id, coalesce(c.name, pr.title) || ': ζητά μετάθεση', least(f.starts_at, f.reschedule_starts_at), 'reschedule'
    from public.filmings f
    join public.productions pr on pr.id = f.production_id
    left join public.clients c on c.id = f.client_id
   where f.state = 'scheduled' and f.reschedule_starts_at is not null;
$$;

create function authz.today_count_filming_approvals(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_filming_approvals_open(p_uid, p_client) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_filming_approvals_rows());
end;
$$;

-- Τα πιο κοντινά Γυρίσματα πρώτα· επείγον όταν το Γύρισμα είναι σε έως 24 ώρες ή πέρασε (κανόνας 5).
create function authz.today_items_filming_approvals(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_filming_approvals_open(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', x.kind || ':' || x.id::text, 'title', x.title,
             'subtitle', null, 'at', x.starts_at, 'urgent', x.starts_at <= p_now + interval '24 hours',
             'link', '/app/filming/queue')
           order by x.starts_at, x.kind, x.id)
      from (select * from authz.today_filming_approvals_rows() r order by r.starts_at, r.kind, r.id limit 3) x),
    '[]'::jsonb);
end;
$$;

-- ───────────── Διαγραφές από το Google ─────────────

create function authz.today_google_deletions_open(p_uid uuid, p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select p_client is null and authz.user_scope(p_uid, 'calendar.google') is not null; $$;

create function authz.today_count_google_deletions(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_google_deletions_open(p_uid, p_client) then
    return null;
  end if;
  return (select count(*)::integer
            from public.google_deletions d join public.filmings f on f.id = d.filming_id
           where d.resolved_at is null);
end;
$$;

-- Πρώτα όσες λήγουν νωρίτερα· επείγον με λιγότερες από 12 ώρες ως την προθεσμία (κανόνας 5).
create function authz.today_items_google_deletions(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_google_deletions_open(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', x.filming_id::text, 'title', coalesce(authz.google_filming_title(x.filming_id), 'Γύρισμα'),
             'subtitle', 'Επιβεβαίωση ως την προθεσμία', 'at', x.deadline_at,
             'urgent', x.deadline_at < p_now + interval '12 hours', 'link', '/app/calendar/google-deletions')
           order by x.deadline_at, x.filming_id)
      from (select d.filming_id, d.deadline_at
              from public.google_deletions d join public.filmings f on f.id = d.filming_id
             where d.resolved_at is null
             order by d.deadline_at, d.filming_id limit 3) x),
    '[]'::jsonb);
end;
$$;

-- ───────────── Χωρίς υπεύθυνο ─────────────

create function authz.today_unassigned_open(p_uid uuid, p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select p_client is null and authz.user_scope(p_uid, 'clients.transfer') is not null; $$;

-- Ίδια επιλογή με την ουρά B5 (listQueue και listAccessRequests): ανοιχτές Ευκαιρίες χωρίς Υπεύθυνο, Αιτήματα σε αναμονή.
create function authz.today_unassigned_rows()
returns table (id text, title text, subtitle text, at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select 'opportunity:' || o.id::text, o.title, c.name, o.created_at
    from public.opportunities o
    left join public.clients c on c.id = o.client_id
   where o.manager_id is null and o.outcome = 'open'
  union all
  select 'request:' || r.id::text, c.name, coalesce(u.name, 'Πωλητής') || ' ζητά πρόσβαση', r.created_at
    from public.access_requests r
    left join public.clients c on c.id = r.client_id
    left join public.team_users u on u.user_id = r.requester_id
   where r.status = 'pending';
$$;

create function authz.today_count_unassigned(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_unassigned_open(p_uid, p_client) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_unassigned_rows());
end;
$$;

-- Οι παλαιότερες πρώτα: όσο περιμένουν, τόσο κρατούν τον πελάτη ή τον πωλητή.
create function authz.today_items_unassigned(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_unassigned_open(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', x.id, 'title', coalesce(x.title, '—'), 'subtitle', x.subtitle, 'at', x.at,
             'urgent', false, 'link', '/app/unassigned')
           order by x.at, x.id)
      from (select * from authz.today_unassigned_rows() r order by r.at, r.id limit 3) x),
    '[]'::jsonb);
end;
$$;

-- ───────────── Μητρώο ─────────────

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn, needs_second_person)
values
  ('proposal_approvals', 'decide', 'action', 'team', 110, 'Προτάσεις προς έγκριση', 'Proposals to approve',
   '/app/agreements/approvals', 'authz.today_count_proposal_approvals(uuid, uuid, timestamptz)',
   'authz.today_items_proposal_approvals(uuid, uuid, timestamptz)', true),
  ('filming_approvals', 'decide', 'action', 'team', 120, 'Γυρίσματα προς έγκριση', 'Filmings to approve',
   '/app/filming/queue', 'authz.today_count_filming_approvals(uuid, uuid, timestamptz)',
   'authz.today_items_filming_approvals(uuid, uuid, timestamptz)', false),
  ('google_deletions', 'decide', 'action', 'team', 130, 'Διαγραφές από το Google', 'Google deletions',
   '/app/calendar/google-deletions', 'authz.today_count_google_deletions(uuid, uuid, timestamptz)',
   'authz.today_items_google_deletions(uuid, uuid, timestamptz)', false),
  ('unassigned', 'decide', 'action', 'team', 140, 'Χωρίς υπεύθυνο', 'Unassigned',
   '/app/unassigned', 'authz.today_count_unassigned(uuid, uuid, timestamptz)',
   'authz.today_items_unassigned(uuid, uuid, timestamptz)', true);

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.today_proposal_approvals_open(uuid, uuid), authz.today_proposal_approvals_rows(),
  authz.today_count_proposal_approvals(uuid, uuid, timestamptz), authz.today_items_proposal_approvals(uuid, uuid, timestamptz),
  authz.today_filming_approvals_open(uuid, uuid), authz.today_filming_approvals_rows(),
  authz.today_count_filming_approvals(uuid, uuid, timestamptz), authz.today_items_filming_approvals(uuid, uuid, timestamptz),
  authz.today_google_deletions_open(uuid, uuid),
  authz.today_count_google_deletions(uuid, uuid, timestamptz), authz.today_items_google_deletions(uuid, uuid, timestamptz),
  authz.today_unassigned_open(uuid, uuid), authz.today_unassigned_rows(),
  authz.today_count_unassigned(uuid, uuid, timestamptz), authz.today_items_unassigned(uuid, uuid, timestamptz)
  from public, anon, authenticated;
