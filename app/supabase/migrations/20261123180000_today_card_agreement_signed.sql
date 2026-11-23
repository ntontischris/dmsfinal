-- Σήμερα: κάρτα «Υπογράφηκε» (agreement_signed). Μία γραμμή ανά υπογραφή Συμφωνίας που καταχωρίστηκε (recorded_at)
-- μετά το previous_seen_at της Σήμερα του Χρήστη· χωρίς previous_seen_at (ή χωρίς γραμμή στο today_seen) τις τελευταίες 3 μέρες.
-- Ο κανόνας είναι της Απόφασης του Ελεγκτή:
--  • μετράει και οι δύο τρόποι υπογραφής· οι υπογραφές του ίδιου Χρήστη (recorded_by = p_uid) δεν μετράνε·
--  • μετρούν μόνο υπογραφές με στιγμή έως p_now (όχι μελλοντικές)· η Πρόταση δεν μπαίνει (δεν έχει υπογραφή).
-- Ενέργεια ομάδας (kind action), ποτέ επείγον. Ταξινόμηση: η πιο πρόσφατη υπογραφή πρώτη, μετά id.
-- Υπότιτλος: ο τίτλος της Συμφωνίας και ο τρόπος υπογραφής. Η ώρα είναι η στιγμή της υπογραφής (at), όχι ετικέτα DATED.
-- Σύνδεσμος: η σελίδα της Συμφωνίας. Ορατότητα: μιμείται το authz.today_agreement_ending_rows.
-- Χωρίς το δικαίωμα ή με p_client: count null, items 42501.

create function authz.today_agreement_signed_rows(p_uid uuid, p_now timestamptz)
returns table (id uuid, client_id uuid, client_name text, title text, method text, recorded_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_since timestamptz := coalesce(
    (select s.previous_seen_at from public.today_seen s where s.user_id = p_uid),
    p_now - interval '3 days');
begin
  return query
    select x.id, o.client_id, c.name, x.title, s.method, s.recorded_at
      from public.agreement_signatures s
      join public.agreements x on x.id = s.agreement_id
      join public.opportunities o on o.id = x.opportunity_id
      join public.clients c on c.id = o.client_id
     where x.state <> 'proposal'
       and s.recorded_at > v_since
       and s.recorded_at <= p_now
       and s.recorded_by is distinct from p_uid
       and authz.today_sees_agreement(p_uid, x.opportunity_id);
end;
$$;

create function authz.today_count_agreement_signed(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or not authz.today_sees_agreements(p_uid) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_agreement_signed_rows(p_uid, p_now));
end;
$$;

create function authz.today_items_agreement_signed(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or not authz.today_sees_agreements(p_uid) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id::text, 'title', r.client_name,
             'subtitle', r.title || ' · ' || case when r.method = 'link'
                           then 'Υπογραφή με Σύνδεσμο' else 'Υπογραφή εκτός συστήματος' end,
             'at', r.recorded_at, 'urgent', false,
             'link', '/app/agreements/' || r.id::text)
           order by r.recorded_at desc, r.id)
      from (select * from authz.today_agreement_signed_rows(p_uid, p_now) x
             order by x.recorded_at desc, x.id limit authz.today_rows()) r),
    '[]'::jsonb);
end;
$$;

-- ───────────── Μητρώο ─────────────

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('agreement_signed', 'work', 'action', 'team', 270, 'Υπογράφηκε', 'Agreement signed', '/app/clients',
   'authz.today_count_agreement_signed(uuid, uuid, timestamptz)', 'authz.today_items_agreement_signed(uuid, uuid, timestamptz)');

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.today_agreement_signed_rows(uuid, timestamptz),
  authz.today_count_agreement_signed(uuid, uuid, timestamptz), authz.today_items_agreement_signed(uuid, uuid, timestamptz)
  from public, anon, authenticated;
