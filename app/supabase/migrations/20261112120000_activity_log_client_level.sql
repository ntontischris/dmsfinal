-- Δραστηριότητες χωρίς τους περιορισμούς (walkthrough Ιδιοκτήτη, 2026-11-06). Κεφ. 2, ADR 0009.
--
--  1. Δραστηριότητα και κατευθείαν στον Πελάτη, χωρίς Ευκαιρία (opportunity_id null). Μόνο χειροκίνητη (με είδος)·
--     οι αυτόματες του συστήματος θέλουν πάντα Ευκαιρία. Τη γράφει όποιος δουλεύει τον Πελάτη (authz.can_work_client)
--     και τη βλέπουν όσοι βλέπουν τις Ευκαιρίες του Πελάτη (authz.can_see_opportunity_row), όχι π.χ. ο Λογιστής.
--  2. «Πότε έγινε»: η χειροκίνητη δέχεται ώρα από έναν χρόνο πίσω έως τώρα (5 λεπτά ανοχή για το ρολόι του browser).
--     Η ώρα καταγραφής κρατιέται χωριστά (created_at).
--  3. Διόρθωση και διαγραφή: όποιος την έγραψε, μέσα σε 24 ώρες από την καταγραφή· ο Ιδιοκτήτης πάντα. Η διαγραφή είναι
--     ήπια (deleted_at/deleted_by)· το RLS και η «τελευταία επαφή» δεν τη βλέπουν. Η διόρθωση γράφει edited_at/edited_by.
--     Οι αυτόματες δεν αλλάζουν ποτέ.

-- ───────────── Πίνακας ─────────────

alter table public.opportunity_activities
  alter column opportunity_id drop not null,
  add column created_at timestamptz,
  add column edited_at timestamptz,
  add column edited_by uuid references public.team_users (user_id),
  add column deleted_at timestamptz,
  add column deleted_by uuid references public.team_users (user_id),
  add constraint opportunity_activities_event_needs_opportunity check (event is null or opportunity_id is not null),
  add constraint opportunity_activities_deleted_pair check ((deleted_at is null) = (deleted_by is null));

-- Ως τώρα η ώρα ήταν πάντα η ώρα καταγραφής.
alter table public.opportunity_activities disable trigger opportunity_activities_guard;
update public.opportunity_activities set created_at = occurred_at;
alter table public.opportunity_activities enable trigger opportunity_activities_guard;
alter table public.opportunity_activities
  alter column created_at set default now(),
  alter column created_at set not null;

-- ───────────── Κανόνες ─────────────

-- Η ώρα μιας χειροκίνητης Δραστηριότητας: όχι στο μέλλον, όχι πάνω από έναν χρόνο πίσω. null = σωστή.
create function authz.activity_time_problem(p_at timestamptz) returns text
language plpgsql stable set search_path = ''
as $$
begin
  if p_at > now() + interval '5 minutes' then
    return 'Η ώρα της Δραστηριότητας δεν μπορεί να είναι στο μέλλον';
  end if;
  if p_at < now() - interval '1 year' then
    return 'Η ώρα της Δραστηριότητας δεν πάει πάνω από έναν χρόνο πίσω';
  end if;
  return null;
end;
$$;

-- Ίδιο με τον ορισμό του 20261105130000_client_delete.sql, με τρεις αλλαγές: χωρίς Ευκαιρία κρατά τον Πελάτη που
-- δόθηκε· η χειροκίνητη κρατά την ώρα που δόθηκε (μέσα στα όρια)· η διόρθωση/διαγραφή περνά όσο ισχύει το
-- sales.activity_edit (το ανάβουν μόνο τα RPC διόρθωσης και διαγραφής) και αλλάζει μόνο είδος, κείμενο, ώρα και σφραγίδες.
create or replace function authz.guard_activity() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  is_merging boolean := coalesce(current_setting('sales.merging', true), '') = 'on';
  is_deleting boolean := coalesce(current_setting('clients.deleting', true), '') = 'on';
  is_editing boolean := coalesce(current_setting('sales.activity_edit', true), '') = 'on';
  v_editable text[] := array['kind_id', 'body', 'occurred_at', 'edited_at', 'edited_by', 'deleted_at', 'deleted_by'];
  v_problem text;
begin
  if tg_op = 'INSERT' then
    if new.opportunity_id is not null then
      new.client_id := (select o.client_id from public.opportunities o where o.id = new.opportunity_id);
    elsif new.client_id is null or new.kind_id is null then
      raise exception 'Δραστηριότητα χωρίς Ευκαιρία γράφεται μόνο με το χέρι, σε Πελάτη' using errcode = 'P0001';
    end if;
    new.created_at := now();
    new.edited_at := null;
    new.edited_by := null;
    new.deleted_at := null;
    new.deleted_by := null;
    if new.kind_id is null or new.occurred_at is null then
      new.occurred_at := now();
    else
      v_problem := authz.activity_time_problem(new.occurred_at);
      if v_problem is not null then
        raise exception '%', v_problem using errcode = 'P0001';
      end if;
    end if;
    if new.kind_id is not null
       and not exists (select 1 from public.sales_activity_kinds k where k.id = new.kind_id and k.retired_at is null) then
      raise exception 'Το είδος Δραστηριότητας έχει αποσυρθεί' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if tg_op = 'UPDATE' and is_merging
     and (to_jsonb(new) - 'client_id') = (to_jsonb(old) - 'client_id') then
    return new;
  end if;
  if tg_op = 'UPDATE' and is_editing and old.kind_id is not null and old.deleted_at is null
     and (to_jsonb(new) - v_editable) = (to_jsonb(old) - v_editable) then
    if new.kind_id is distinct from old.kind_id and (new.kind_id is null or not exists (
      select 1 from public.sales_activity_kinds k where k.id = new.kind_id and k.retired_at is null
    )) then
      raise exception 'Το είδος Δραστηριότητας έχει αποσυρθεί' using errcode = 'P0001';
    end if;
    if new.occurred_at is distinct from old.occurred_at then
      v_problem := authz.activity_time_problem(new.occurred_at);
      if v_problem is not null then
        raise exception '%', v_problem using errcode = 'P0001';
      end if;
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' and is_deleting then
    return old;
  end if;
  raise exception 'Το ιστορικό δέχεται μόνο προσθήκες' using errcode = 'P0001';
end;
$$;

-- Δουλεύει ο Χρήστης τον Πελάτη; «Διαχειρίζεται Πελάτες» με Εύρος όλα, ή είναι ο Υπεύθυνός του.
create function authz.can_work_client(p_client uuid) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
begin
  return authz.has('clients.manage') and exists (
    select 1 from public.clients c
     where c.id = p_client and c.archived_at is null
       and (coalesce(authz.scope('clients.manage'), '') = 'all' or c.manager_id = auth.uid())
  );
end;
$$;

-- Διορθώνει ή σβήνει ο Χρήστης αυτή τη Δραστηριότητα; Μόνο χειροκίνητη και όχι σβησμένη· ο Ιδιοκτήτης πάντα, όποιος
-- την έγραψε μέσα σε 24 ώρες από την καταγραφή (και ενώ ακόμα «Διαχειρίζεται Πελάτες»).
create function authz.can_change_activity(p_id uuid) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
begin
  return authz.is_team_user() and exists (
    select 1 from public.opportunity_activities a
     where a.id = p_id and a.kind_id is not null and a.deleted_at is null
       and (authz.is_owner()
            or (authz.has('clients.manage') and a.actor_id = auth.uid() and a.created_at > now() - interval '24 hours'))
  );
end;
$$;

-- ───────────── RPC ─────────────

drop function public.sales_log_activity(uuid, uuid, text);

-- Χειροκίνητη Δραστηριότητα σε ανοιχτή Ευκαιρία, ή κατευθείαν στον Πελάτη (p_opportunity null, p_client).
-- p_occurred_at null = τώρα.
create function public.sales_log_activity(
  p_opportunity uuid, p_kind_id uuid, p_body text, p_client uuid default null, p_occurred_at timestamptz default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_opportunity is not null then
    if not authz.can_work_opportunity(p_opportunity) then
      raise exception 'Την Ευκαιρία τη δουλεύει ο Υπεύθυνός της' using errcode = '42501';
    end if;
    if not exists (select 1 from public.opportunities o where o.id = p_opportunity and o.outcome = 'open') then
      raise exception 'Δραστηριότητες γράφονται μόνο σε ανοιχτή Ευκαιρία' using errcode = 'P0001';
    end if;
    if p_client is not null
       and not exists (select 1 from public.opportunities o where o.id = p_opportunity and o.client_id = p_client) then
      raise exception 'Η Ευκαιρία δεν είναι αυτού του Πελάτη' using errcode = 'P0001';
    end if;
  else
    if p_client is null then
      raise exception 'Διάλεξε Πελάτη ή Ευκαιρία' using errcode = 'P0001';
    end if;
    if not authz.can_work_client(p_client) then
      raise exception 'Τον Πελάτη τον δουλεύει ο Υπεύθυνός του' using errcode = '42501';
    end if;
  end if;
  if p_kind_id is null then
    raise exception 'Διάλεξε είδος Δραστηριότητας' using errcode = 'P0001';
  end if;
  insert into public.opportunity_activities (opportunity_id, client_id, actor_id, kind_id, body, occurred_at)
  values (p_opportunity, p_client, auth.uid(), p_kind_id, trim(coalesce(p_body, '')), coalesce(p_occurred_at, now()))
  returning id into v_id;
  return v_id;
end;
$$;

-- Διόρθωση είδους, κειμένου και ώρας. Μόνο όποιος τη γράφει (24 ώρες) ή ο Ιδιοκτήτης.
create function public.sales_edit_activity(
  p_id uuid, p_kind_id uuid, p_body text, p_occurred_at timestamptz
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.can_change_activity(p_id) then
    raise exception 'Διορθώνει μόνο όποιος τη γράφει, μέσα σε 24 ώρες, ή ο Ιδιοκτήτης' using errcode = '42501';
  end if;
  if p_kind_id is null or p_occurred_at is null then
    raise exception 'Διάλεξε είδος και ώρα' using errcode = 'P0001';
  end if;
  perform set_config('sales.activity_edit', 'on', true);
  update public.opportunity_activities
     set kind_id = p_kind_id, body = trim(coalesce(p_body, '')), occurred_at = p_occurred_at,
         edited_at = now(), edited_by = auth.uid()
   where id = p_id;
  perform set_config('sales.activity_edit', '', true);
end;
$$;

-- Ήπια διαγραφή: η γραμμή μένει με το ποιος και πότε, αλλά δεν φαίνεται και δεν μετράει πουθενά.
create function public.sales_delete_activity(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.can_change_activity(p_id) then
    raise exception 'Σβήνει μόνο όποιος τη γράφει, μέσα σε 24 ώρες, ή ο Ιδιοκτήτης' using errcode = '42501';
  end if;
  perform set_config('sales.activity_edit', 'on', true);
  update public.opportunity_activities set deleted_at = now(), deleted_by = auth.uid() where id = p_id;
  perform set_config('sales.activity_edit', '', true);
end;
$$;

-- ───────────── Ορατότητα ─────────────

drop policy "Τις Δραστηριότητες τις βλέπει όποιος βλέπει την Ευκαιρία" on public.opportunity_activities;
create policy "Τις Δραστηριότητες τις βλέπει όποιος βλέπει την Ευκαιρία ή, χωρίς Ευκαιρία, τις Ευκαιρίες του Πελάτη"
  on public.opportunity_activities for select to authenticated
  using (deleted_at is null and case when opportunity_id is null then authz.can_see_opportunity_row(client_id, null)
                                     else authz.can_see_opportunity(opportunity_id) end);

-- Η τελευταία επαφή με τον Πελάτη: η πιο πρόσφατη χειροκίνητη Δραστηριότητα, όχι σβησμένη, σε Ευκαιρία που ο Χρήστης
-- βλέπει ή κατευθείαν στον Πελάτη (τον Πελάτη τον ελέγχει ο καλών). Ένας ορισμός για τις δύο αναγνώσεις παρακάτω.
create function authz.client_last_contact(p_client uuid) returns timestamptz
language plpgsql stable security definer set search_path = ''
as $$
begin
  return (
    select max(oa.occurred_at) from public.opportunity_activities oa
      left join public.opportunities o on o.id = oa.opportunity_id
     where oa.client_id = p_client and oa.kind_id is not null and oa.deleted_at is null
       and authz.can_see_opportunity_row(oa.client_id, o.manager_id)
  );
end;
$$;

-- Ίδια με τον ορισμό του 20261106120000_sales_client_last_contacts.sql, με τη μέτρηση της authz.client_last_contact.
create or replace function public.sales_client_last_contacts(p_ids uuid[])
returns table (client_id uuid, last_contact timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if cardinality(p_ids) > 100 then
    raise exception 'Έως 100 Πελάτες τη φορά' using errcode = 'P0001';
  end if;
  return query
    select c.id, authz.client_last_contact(c.id)
      from public.clients c
     where c.id = any (coalesce(p_ids, '{}'::uuid[]))
       and c.archived_at is null
       and (authz.has('clients.view') or authz.has('clients.manage'))
       and authz.can_see_client(c.id, c.manager_id)
     order by c.id;
end;
$$;

-- Ίδια με τον ορισμό του 20261102120000_sales_client_overview.sql, με τη μέτρηση της authz.client_last_contact.
create or replace function public.sales_client_overview(p_ids uuid[], p_now timestamptz default null)
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
           authz.client_last_contact(c.id)
      from public.clients c
     where c.id = any (coalesce(p_ids, '{}'::uuid[]))
       and c.archived_at is null
       and (authz.has('clients.view') or authz.has('clients.manage'))
       and authz.can_see_client(c.id, c.manager_id)
     order by c.id;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.activity_time_problem(timestamptz), authz.can_work_client(uuid), authz.can_change_activity(uuid),
  authz.client_last_contact(uuid)
  from public, anon, authenticated;

revoke all on function
  public.sales_log_activity(uuid, uuid, text, uuid, timestamptz),
  public.sales_edit_activity(uuid, uuid, text, timestamptz),
  public.sales_delete_activity(uuid)
  from public, anon;
grant execute on function
  public.sales_log_activity(uuid, uuid, text, uuid, timestamptz),
  public.sales_edit_activity(uuid, uuid, text, timestamptz),
  public.sales_delete_activity(uuid)
  to authenticated;
