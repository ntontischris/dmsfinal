-- Οι Συμφωνίες για τον Χρήστη πελάτη (D1/D2 στον Χώρο «Λογαριασμός»). Μόνο ανάγνωση, μόνο νέες συναρτήσεις.
--
--  • Δικαίωμα: «Βλέπει Συμφωνίες» (c.agreements) στον τρέχοντα Πελάτη του θεατή, όπως η public.client_invoices_view.
--    Ομάδα, ανώνυμος ή Χρήστης πελάτη χωρίς το Δικαίωμα: 42501.
--  • Τι φαίνεται (κανόνας του prototype, `data/agreements-access.ts`): οι Συμφωνίες του Πελάτη και οι προτάσεις που
--    του στάλθηκαν και ισχύουν, όπως στον Σύνδεσμο. Σύνταξη, Έγκριση, ληγμένες και χαμένες προτάσεις είναι εσωτερικά.
--  • Τι ΔΕΝ φαίνεται ποτέ: κόστος, περιθώριο, ώρες, Παρεκκλίσεις, Εγκρίσεις, αναθεωρήσεις, παραλήπτες, Σύνδεσμοι,
--    εξερχόμενα, Υπεύθυνοι, εσωτερικά σχόλια. Τα ποσά έρχονται μόνο από το έγγραφο που στάλθηκε (agreement_documents),
--    ίδιο με αυτό του Συνδέσμου· οι Περίοδοι υπολογίζονται από τα σύνολα του εγγράφου.
--  • Ο Σύνδεσμος της πρότασης δεν επιστρέφεται: το token δεν αποθηκεύεται (μόνο το hash του).
--  • Δεν προστίθενται πίνακες, άρα το Ίχνος δεν αλλάζει.

-- ───────────── Βοηθητικά ─────────────

-- Ο τρέχων Πελάτης του θεατή, αν έχει «Βλέπει Συμφωνίες» σε αυτόν· αλλιώς 42501.
create function authz.require_client_agreements() returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_client uuid := authz.client_user_client_id();
begin
  if v_client is null or not authz.client_user_has('c.agreements') then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return v_client;
end;
$$;

-- Φαίνεται στον πελάτη; Υπογεγραμμένη (ή μετά), ή πρόταση που στάλθηκε και ισχύει.
create function authz.client_agreement_visible(a public.agreements) returns boolean
language sql stable security definer set search_path = ''
as $$
  select a.state <> 'proposal' or authz.agreement_eff_path(a) = 'sent';
$$;

-- Το έγγραφο της τρέχουσας αναθεώρησης, όπως στάλθηκε (ή όπως υπογράφηκε).
create function authz.client_agreement_document(a public.agreements) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select d.document from public.agreement_documents d where d.agreement_id = a.id and d.revision = a.revision;
$$;

-- Οι Περίοδοι μιας υπογεγραμμένης μηνιαίας, με το ποσό από το έγγραφο και τα υπόλοιπα (χωρίς ποσά) της authz.period_balances.
create function authz.client_agreement_periods(a public.agreements) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'n', p.n + 1, 'starts', p.starts, 'ends', p.ends, 'isPartial', p.share < 1,
           'state', authz.period_state(p.starts, p.ends),
           'amount', round((case when p.n < coalesce((t.totals ->> 'discount_months')::integer, 0)
                                 then (t.totals ->> 'discounted_net')::numeric
                                 else (t.totals ->> 'net')::numeric end) * p.share, 2),
           'provisions', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'kindId', b.value -> 'kind_id', 'label', b.value -> 'label', 'unit', b.value -> 'unit',
                      'given', b.value -> 'given', 'carried', b.value -> 'carried', 'used', b.value -> 'used',
                      'reserved', b.value -> 'reserved', 'balance', b.value -> 'balance') order by b.ord)
               from jsonb_array_elements(authz.period_balances(pe.id)) with ordinality as b (value, ord)
              where pe.id is not null), '[]'::jsonb)
         ) order by p.n), '[]'::jsonb)
    from (select authz.client_agreement_document(a) -> 'totals' as totals) t
    cross join authz.agreement_period_rows(a.start_on, a.duration_months) p
    left join public.agreement_periods pe on pe.agreement_id = a.id and pe.n = p.n + 1
   where a.kind = 'monthly' and a.state <> 'proposal' and a.start_on is not null and t.totals is not null;
$$;

-- Η κάρτα της λίστας: τίτλος, είδος, κατάσταση (ισχύουσα), ημερομηνίες, καθαρό ποσό του εγγράφου, τρέχουσα Περίοδος.
create function authz.client_agreement_card(a public.agreements) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id, 'title', a.title, 'kind', a.kind, 'language', a.language,
    'state', authz.agreement_eff_state(a),
    'sentAt', (select r.sent_at from public.agreement_revisions r where r.agreement_id = a.id and r.number = a.revision),
    'validUntil', case when a.state = 'proposal' then a.valid_until end,
    'startOn', a.start_on, 'endOn', a.end_on, 'durationMonths', a.duration_months, 'signedAt', a.signed_at,
    'net', (authz.client_agreement_document(a) -> 'totals' ->> 'net')::numeric,
    'current', (select e.value from jsonb_array_elements(authz.client_agreement_periods(a)) e (value)
                 where e.value ->> 'state' = 'current' limit 1)
  );
$$;

-- ───────────── Αναγνώσεις ─────────────

-- D1 πελάτη: { items: [κάρτα] }, πρώτα οι προτάσεις που περιμένουν υπογραφή, μετά οι πιο πρόσφατες.
create function public.client_agreements_view() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_client uuid;
begin
  v_client := authz.require_client_agreements();
  return jsonb_build_object('items', coalesce((
    select jsonb_agg(authz.client_agreement_card(a)
                     order by (a.state = 'proposal') desc, coalesce(a.signed_at, a.updated_at) desc, a.id)
      from public.agreements a
      join public.opportunities o on o.id = a.opportunity_id
     where o.client_id = v_client and authz.client_agreement_visible(a)
  ), '[]'::jsonb));
end;
$$;

-- D2 πελάτη: η κάρτα, το έγγραφο (ίδιο σχήμα με τον Σύνδεσμο), οι Περίοδοι και ποιος υπέγραψε.
-- Άγνωστη, ξένη ή εσωτερική (Σύνταξη, Έγκριση, ληγμένη, χαμένη) Συμφωνία: null· δεν ξεχωρίζουν.
create function public.client_agreement_view(p_agreement uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_client uuid;
  a public.agreements;
begin
  v_client := authz.require_client_agreements();
  select x.* into a
    from public.agreements x
    join public.opportunities o on o.id = x.opportunity_id
   where x.id = p_agreement and o.client_id = v_client;
  if not found then
    return null;
  end if;
  if not authz.client_agreement_visible(a) then
    return null;
  end if;
  return (authz.client_agreement_card(a) - 'current') || jsonb_build_object(
    'document', authz.client_agreement_document(a),
    'periods', authz.client_agreement_periods(a),
    'signature', (select jsonb_build_object('signedName', s.signed_name, 'signedOn', s.signed_on)
                    from public.agreement_signatures s where s.agreement_id = a.id)
  );
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.require_client_agreements(), authz.client_agreement_visible(public.agreements),
  authz.client_agreement_document(public.agreements), authz.client_agreement_periods(public.agreements),
  authz.client_agreement_card(public.agreements),
  public.client_agreements_view(), public.client_agreement_view(uuid)
  from public, anon, authenticated;

grant execute on function public.client_agreements_view(), public.client_agreement_view(uuid) to authenticated;
