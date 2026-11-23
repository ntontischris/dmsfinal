-- Σήμερα: κάρτα «Λήγει η Συμφωνία» (agreement_ending). Μία γραμμή ανά μηνιαία Συμφωνία σε ενεργή κατάσταση (signed ή active)
-- που λήγει σε έως agreement_defaults.renewal_lead_days μέρες (ώρα Αθήνας, authz.today_work_day· προεπιλογή 30, όπως η B2).
-- Ο κανόνας είναι της Απόφασης του Ελεγκτή:
--  • η Συμφωνία θα σταματήσει πραγματικά: ανανέωση με νέα Ευκαιρία, ή αυτόματη με «Χωρίς συνέχιση»· όχι λυμένη με ημερομηνία·
--  • δεν μπλοκάρει άλλη Συμφωνία του ίδιου Πελάτη: υπογεγραμμένη ή ενεργή με έναρξη μετά τη λήξη, ή πρόταση ζωντανή
--    (όχι χαμένη ή ληγμένη, σε ισχύ) με έναρξη μετά τη λήξη ή χωρίς έναρξη και δημιουργημένη μετά από αυτή.
-- Επείγον αν λήγει σε έως 7 μέρες. Ταξινόμηση: η λήξη, μετά id. Υπότιτλος: ο τίτλος· η ημερομηνία λήξης είναι η ετικέτα «λήγει»
-- της εφαρμογής (DATED). Σύνδεσμος: η καρτέλα Συμφωνιών του Πελάτη. Ορατότητα: μιμείται το authz.today_proposal_rows.
-- Χωρίς το δικαίωμα ή με p_client: count null, items 42501.

create function authz.today_agreement_ending_rows(p_uid uuid, p_now timestamptz)
returns table (id uuid, client_id uuid, client_name text, title text, end_on date, urgent boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := authz.today_work_day(p_now);
  v_lead integer := coalesce((select d.renewal_lead_days from public.agreement_defaults d where d.id), 30);
begin
  return query
    select x.id, o.client_id, c.name, x.title, x.end_on, x.end_on <= v_today + 7
      from public.agreements x
      join public.opportunities o on o.id = x.opportunity_id
      join public.clients c on c.id = o.client_id
      left join public.agreement_endings e on e.agreement_id = x.id
     where x.kind = 'monthly'
       and x.state in ('signed', 'active')
       and x.end_on between v_today and v_today + v_lead
       and (x.renewal = 'new_opportunity' or e.no_continuation_at is not null)
       and e.dissolved_on is null
       and authz.today_sees_agreement(p_uid, x.opportunity_id)
       and not exists (
         select 1
           from public.agreements n
           join public.opportunities other on other.id = n.opportunity_id
          where other.client_id = o.client_id
            and n.id <> x.id
            and ((n.state in ('signed', 'active') and n.start_on > x.end_on)
                 or (n.state = 'proposal' and n.path not in ('lost', 'expired') and n.valid_until >= v_today
                     and (n.start_on > x.end_on or (n.start_on is null and n.created_at > x.created_at)))));
end;
$$;

create function authz.today_count_agreement_ending(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or not authz.today_sees_agreements(p_uid) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_agreement_ending_rows(p_uid, p_now));
end;
$$;

create function authz.today_items_agreement_ending(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or not authz.today_sees_agreements(p_uid) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id::text, 'title', r.client_name,
             'subtitle', r.title,
             'at', authz.today_work_day_at(r.end_on), 'urgent', r.urgent,
             'link', '/app/clients/' || r.client_id::text || '?tab=agreements')
           order by r.end_on, r.id)
      from (select * from authz.today_agreement_ending_rows(p_uid, p_now) x
             order by x.end_on, x.id limit authz.today_rows()) r),
    '[]'::jsonb);
end;
$$;

-- ───────────── Μητρώο ─────────────

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('agreement_ending', 'work', 'action', 'team', 260, 'Λήγει η Συμφωνία', 'Agreement ending', '/app/clients',
   'authz.today_count_agreement_ending(uuid, uuid, timestamptz)', 'authz.today_items_agreement_ending(uuid, uuid, timestamptz)');

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.today_agreement_ending_rows(uuid, timestamptz),
  authz.today_count_agreement_ending(uuid, uuid, timestamptz), authz.today_items_agreement_ending(uuid, uuid, timestamptz)
  from public, anon, authenticated;
