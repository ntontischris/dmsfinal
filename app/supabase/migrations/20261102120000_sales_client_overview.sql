-- Πλούσια λίστα Πελατών (B1): μία ανάγνωση για έως 100 Πελάτες, χωρίς N+1. Κεφ. 2, 3, 7, ADR 0007, 0018.
--
-- Αρχές:
--  • Μόνο ανάγνωση. Κανένας πίνακας δεν αλλάζει. Μία συνάρτηση security definer με search_path = ''.
--  • Γραμμή υπάρχει μόνο για Πελάτη που ο Χρήστης ανοίγει: ίδιος κανόνας με το can_open της public.sales_client_list
--    (authz.can_see_client, «Βλέπει» ή «Διαχειρίζεται» Πελάτες, όχι αρχειοθετημένος). Για τους άλλους: καμία γραμμή.
--  • Η Κατάσταση είναι ιδιότητα του Πελάτη (CONTEXT «Πελάτης»): φαίνεται σε όποιον τον ανοίγει, από την authz.client_status,
--    ακόμα κι αν δεν βλέπει τις Συμφωνίες του. Γι' αυτό security definer και όχι invoker: το RLS θα έκρυβε Συμφωνίες.
--  • Κάθε άλλο πεδίο έχει τον έλεγχο του δικού του module, με τις ίδιες συναρτήσεις που χρησιμοποιούν οι αναγνώσεις του:
--      Συμφωνίες, Πακέτο, Παροχές → authz.can_see_agreement ανά Συμφωνία· χωρίς κανένα Δικαίωμα Συμφωνιών: null / [].
--      Επόμενο Γύρισμα           → authz.can_see_filming ανά Γύρισμα.
--      Υπόλοιπο Καρτέλας          → ο κανόνας της authz.ledger_client για την ομάδα (finance.view + finance.amounts «όλα»).
--      Τελευταία επαφή            → authz.can_see_opportunity_row ανά Ευκαιρία (όπως το RLS των Δραστηριοτήτων).
--  • «Ενεργή» Συμφωνία = state 'active', όπως η authz.client_status, ώστε Κατάσταση και πλήθος να μη διαφωνούν.
--  • Η ώρα περνά ως p_now (null = τώρα) για τα τεστ: διαλέγει την τρέχουσα Περίοδο και το «επόμενο» Γύρισμα.

create function public.sales_client_overview(p_ids uuid[], p_now timestamptz default null)
returns table (
  client_id uuid,
  status text,
  active_agreements integer,
  package_name text,
  provisions jsonb,
  next_filming timestamptz,
  balance_cents bigint,
  last_contact timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_today date := (coalesce(p_now, now()) at time zone 'Europe/Athens')::date;
  v_agreements boolean := authz.has('agreements.view') or authz.has('agreements.draft') or authz.has('agreements.deviate');
  v_finance boolean := authz.has('finance.view') and coalesce(authz.scope('finance.amounts'), '') = 'all';
begin
  if cardinality(p_ids) > 100 then
    raise exception 'Έως 100 Πελάτες τη φορά' using errcode = 'P0001';
  end if;
  return query
    select c.id,
           authz.client_status(c.id),
           case when v_agreements then (
             select count(*)::integer from public.agreements a
               join public.opportunities o on o.id = a.opportunity_id
              where o.client_id = c.id and a.state = 'active' and authz.can_see_agreement(a.id)
           ) end,
           case when v_agreements then (
             select string_agg(distinct ci.name, ', ' order by ci.name)
               from public.agreements a
               join public.opportunities o on o.id = a.opportunity_id
               join public.agreement_lines l on l.agreement_id = a.id and l.line_kind = 'package'
               join public.catalogue_items ci on ci.id = l.item_id and ci.kind = 'package'
              where o.client_id = c.id and a.state = 'active' and authz.can_see_agreement(a.id)
           ) end,
           case when v_agreements then authz.client_overview_provisions(c.id, v_today) else '[]'::jsonb end,
           (select min(f.starts_at) from public.filmings f
             where f.client_id = c.id and f.state in ('pending', 'scheduled') and f.starts_at >= v_now
               and authz.can_see_filming(f.id)),
           case when v_finance then authz.client_overview_balance_cents(c.id) end,
           (select max(oa.occurred_at) from public.opportunity_activities oa
              join public.opportunities o on o.id = oa.opportunity_id
             where o.client_id = c.id and oa.kind_id is not null
               and authz.can_see_opportunity_row(o.client_id, o.manager_id))
      from public.clients c
     where c.id = any (coalesce(p_ids, '{}'::uuid[]))
       and c.archived_at is null
       and (authz.has('clients.view') or authz.has('clients.manage'))
       and authz.can_see_client(c.id, c.manager_id)
     order by c.id;
end;
$$;

-- Παροχές της τρέχουσας Περιόδου κάθε ενεργής μηνιαίας Συμφωνίας που ο Χρήστης βλέπει, ανά είδος (άθροισμα αν δύο
-- Συμφωνίες δίνουν το ίδιο είδος). Τα νούμερα είναι της authz.period_balances (χωρίς ποσά). is_shoot = είδος που
-- καταναλώνεται από Γυρίσματα (έχει Τρόπο μέτρησης). [{ kind_id, code, unit, is_shoot, given, carried, used, reserved }]
create function authz.client_overview_provisions(p_client uuid, p_today date) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind_id', k.id, 'code', k.code, 'unit', k.unit, 'is_shoot', k.measure is not null,
           'given', t.given, 'carried', t.carried, 'used', t.used, 'reserved', t.reserved
         ) order by k.sort, k.id), '[]'::jsonb)
    from (
      select (b.value ->> 'kind_id')::uuid as kind_id,
             sum((b.value ->> 'given')::numeric) as given,
             sum((b.value ->> 'carried')::numeric) as carried,
             sum((b.value ->> 'used')::numeric) as used,
             sum((b.value ->> 'reserved')::numeric) as reserved
        from public.agreements a
        join public.opportunities o on o.id = a.opportunity_id
        join public.agreement_periods pe on pe.agreement_id = a.id and p_today between pe.starts and pe.ends
        cross join lateral jsonb_array_elements(authz.period_balances(pe.id)) b (value)
       where o.client_id = p_client and a.kind = 'monthly' and a.state = 'active' and authz.can_see_agreement(a.id)
       group by 1
    ) t
    join public.provision_kinds k on k.id = t.kind_id;
$$;

-- Υπόλοιπο Καρτέλας σε λεπτά: Τιμολόγια και Αποδείξεις − πιστωτικά − Εισπράξεις, όπως η public.client_ledger_view
-- (εκτός ακυρωμένων Τιμολογίων και διαγραμμένων Εισπράξεων). Τον έλεγχο Δικαιώματος τον κάνει ο καλών.
create function authz.client_overview_balance_cents(p_client uuid) returns bigint
language sql stable security definer set search_path = ''
as $$
  select round(coalesce(sum(m.delta), 0) * 100)::bigint
    from (
      select case when i.kind = 'credit' then -i.total else i.total end as delta
        from public.invoices i where i.client_id = p_client and i.voided_at is null
      union all
      select -r.amount from public.receipts r where r.client_id = p_client and r.deleted_at is null
    ) m;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.client_overview_provisions(uuid, date), authz.client_overview_balance_cents(uuid),
  public.sales_client_overview(uuid[], timestamptz)
  from public, anon, authenticated;

grant execute on function public.sales_client_overview(uuid[], timestamptz) to authenticated;
