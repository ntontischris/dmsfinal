-- Walkthrough Ιδιοκτήτη, διαδρομή 03 «Νέος πελάτης και ο φάκελός του», πρώτος γύρος (2026-11-04). Κεφ. 2, ADR 0009.
--
-- Αρχές:
--  • «Πιθανό διπλό» και στις δύο μεριές. Το σήμα μένει μία γραμμή στο client_duplicate_flags (client_id = ο νέος,
--    matches_client_id = ο υπάρχων). Η λίστα Πελατών (και η κάρτα της Σελίδας Πελάτη, που διαβάζει την ίδια συνάρτηση)
--    το δείχνει σε όποια μεριά κι αν είναι ο Πελάτης. Μία απόφαση (Συγχώνευση ή «Είναι άλλος») κλείνει τη μία γραμμή,
--    άρα και τις δύο μεριές. Το Δικαίωμα μένει το ίδιο: μόνο όσοι «Συγχωνεύουν Πελάτες» βλέπουν το σήμα.
--  • Πηγή για υπάρχοντα Πελάτη. Η Πηγή λέει από πού ήρθε ο Πελάτης· για υπάρχοντα δεν ρωτιέται. Όταν η Νέα Ευκαιρία
--    (ή το Αίτημα πρόσβασης) έρχεται χωρίς Πηγή σε υπάρχοντα Πελάτη, παίρνει την Πηγή της πρώτης του Ευκαιρίας. Αν εκείνη
--    αποσύρθηκε στο μεταξύ, γίνεται δεκτή (όπως στην έγκριση Αιτήματος, με το sales.allow_source μόνο για αυτή την
--    εισαγωγή). Νέος Πελάτης χωρίς Πηγή: σφάλμα «Διάλεξε Πηγή». Η στήλη source_id μένει υποχρεωτική.

-- ───────────── Πηγή του Πελάτη ─────────────

-- Η Πηγή της πρώτης Ευκαιρίας του Πελάτη (από πού ήρθε). null αν δεν έχει καμία.
create function public.sales_client_source(p_client uuid) returns uuid
language sql stable security definer set search_path = ''
as $$
  select o.source_id from public.opportunities o
   where o.client_id = p_client
   order by o.created_at, o.id
   limit 1;
$$;

-- ───────────── Λίστα Πελατών: σήμα και στις δύο μεριές ─────────────
-- Ίδια με τον αρχικό ορισμό (20261008120000_sales_clients_and_opportunities.sql), με μία αλλαγή: το is_possible_duplicate
-- κοιτά και το matches_client_id.
create or replace function public.sales_client_list(
  p_query text default null,
  p_limit integer default 100,
  p_offset integer default 0,
  p_client uuid default null
)
returns table (
  id uuid,
  name text,
  city text,
  manager_id uuid,
  manager_name text,
  can_open boolean,
  open_opportunities integer,
  is_possible_duplicate boolean
)
language sql stable security definer set search_path = ''
as $$
  select c.id,
         c.name,
         case when v.can_open then c.city else '' end,
         c.manager_id,
         m.name,
         v.can_open,
         case when v.can_open then (
           select count(*)::integer from public.opportunities o
            where o.client_id = c.id and o.outcome = 'open'
              and authz.can_see_opportunity_row(o.client_id, o.manager_id)
         ) end,
         authz.has('clients.merge') and exists (
           select 1 from public.client_duplicate_flags f
            where (f.client_id = c.id or f.matches_client_id = c.id) and f.resolved_at is null
         )
    from public.clients c
    left join public.team_users m on m.user_id = c.manager_id
    cross join lateral (select authz.can_see_client(c.id, c.manager_id) as can_open) v
   where (authz.has('clients.view') or authz.has('clients.manage'))
     and c.archived_at is null
     and (p_client is null or c.id = p_client)
     and (
       coalesce(trim(p_query), '') = ''
       or c.name ilike '%' || trim(p_query) || '%'
       or (v.can_open and (c.legal_name ilike '%' || trim(p_query) || '%' or c.city ilike '%' || trim(p_query) || '%'))
     )
   order by lower(c.name), c.id
   limit least(greatest(coalesce(p_limit, 100), 1), 100)
   offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ───────────── Νέα Ευκαιρία: Πηγή μόνο για νέο Πελάτη ─────────────
-- Ίδια με τον αρχικό ορισμό, με μία αλλαγή: p_source_id null σε υπάρχοντα Πελάτη = η Πηγή του Πελάτη.
create or replace function public.sales_create_opportunity(
  p_client_id uuid,
  p_client jsonb,
  p_title text,
  p_source_id uuid,
  p_referred_by text,
  p_next_step text,
  p_next_step_due date
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_all boolean;
  v_match_id uuid;
  v_match_kind text;
  v_match_reason text;
  v_client_id uuid;
  v_client_manager uuid;
  v_created boolean := false;
  v_flagged boolean := false;
  v_manager uuid;
  v_source uuid := p_source_id;
  v_opp uuid;
begin
  perform authz.require('clients.manage');
  v_all := authz.scope('clients.manage') = 'all';

  if p_client_id is not null then
    select c.id, c.manager_id into v_client_id, v_client_manager
      from public.clients c where c.id = p_client_id and c.archived_at is null;
    if v_client_id is null then
      raise exception 'Ο Πελάτης δεν βρέθηκε' using errcode = 'P0001';
    end if;
  else
    select m.client_id, m.kind, m.reason into v_match_id, v_match_kind, v_match_reason
      from public.sales_find_match(
        p_client ->> 'afm', p_client ->> 'contact_email', p_client ->> 'contact_phone', p_client ->> 'name') m;
    if v_match_kind = 'exact' then
      select c.id, c.manager_id into v_client_id, v_client_manager from public.clients c where c.id = v_match_id;
    end if;
  end if;

  if v_client_id is not null then
    if not v_all and v_client_manager is distinct from v_uid then
      return jsonb_build_object(
        'status', 'blocked',
        'client_id', v_client_id,
        'manager_name', (select u.name from public.team_users u where u.user_id = v_client_manager)
      );
    end if;
    v_manager := case when v_all then v_client_manager else v_uid end;
    if v_source is null then
      v_source := public.sales_client_source(v_client_id);
      perform set_config('sales.allow_source', coalesce(v_source::text, ''), true);
    end if;
  else
    if v_source is null then
      raise exception 'Διάλεξε Πηγή' using errcode = 'P0001';
    end if;
    v_client_id := public.sales_new_client(p_client, v_uid);
    v_created := true;
    v_manager := v_uid;
    if v_match_kind = 'similar' then
      perform public.sales_flag_duplicate(v_client_id, v_match_id, v_match_reason);
      v_flagged := true;
    end if;
  end if;

  if v_source is null then
    raise exception 'Διάλεξε Πηγή' using errcode = 'P0001';
  end if;
  v_opp := public.sales_insert_opportunity(
    v_client_id, p_title, v_source, p_referred_by, v_manager, p_next_step, p_next_step_due, null);
  perform set_config('sales.allow_source', '', true);

  return jsonb_build_object(
    'status', 'created', 'opportunity_id', v_opp, 'client_id', v_client_id,
    'client_created', v_created, 'flagged', v_flagged);
end;
$$;

-- ───────────── Αίτημα πρόσβασης: χωρίς Πηγή = η Πηγή του Πελάτη ─────────────
-- Ίδια με τον ορισμό του 20261008170000_security_hardening.sql, με μία αλλαγή: p_source_id null = η Πηγή του Πελάτη
-- (δεκτή και αν αποσύρθηκε, όπως στην έγκριση). Μια Πηγή που διαλέγεται ρητά πρέπει να είναι ενεργή.
create or replace function public.sales_request_access(
  p_client uuid, p_topic text, p_comment text, p_source_id uuid
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_manager uuid;
  v_source uuid := p_source_id;
  v_id uuid;
begin
  perform authz.require('clients.manage');
  select c.manager_id into v_manager from public.clients c where c.id = p_client and c.archived_at is null;
  if not found then
    raise exception 'Ο Πελάτης δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if v_manager is null then
    raise exception 'Ο Πελάτης δεν έχει ακόμα Υπεύθυνο· ζήτα από τη Διαχείριση να τον αναθέσει' using errcode = 'P0001';
  end if;
  if v_manager = auth.uid() or coalesce(authz.scope('clients.manage'), '') = 'all' then
    raise exception 'Δεν χρειάζεσαι Αίτημα πρόσβασης για αυτόν τον Πελάτη' using errcode = 'P0001';
  end if;
  if v_source is null then
    v_source := public.sales_client_source(p_client);
    if v_source is null then
      raise exception 'Διάλεξε Πηγή' using errcode = 'P0001';
    end if;
  elsif not exists (select 1 from public.sales_sources s where s.id = v_source and s.retired_at is null) then
    raise exception 'Η Πηγή έχει αποσυρθεί' using errcode = 'P0001';
  end if;
  insert into public.access_requests (client_id, requester_id, topic, comment, source_id)
  values (p_client, auth.uid(), trim(coalesce(p_topic, '')), trim(coalesce(p_comment, '')), v_source)
  returning id into v_id;
  return v_id;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function public.sales_client_source(uuid) from public, anon, authenticated;
