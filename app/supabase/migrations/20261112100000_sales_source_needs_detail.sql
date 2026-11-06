-- Πηγή που θέλει περιγραφή (walkthrough Ιδιοκτήτη, 2026-11-06). Κεφ. 2, ADR 0009.
--
-- Μια Πηγή όπως «Άλλο» ή «Σύσταση» δεν λέει μόνη της από πού ήρθε ο Πελάτης. Κάθε Πηγή έχει πια τη σημαία
-- needs_detail (ρυθμίζεται στις Ρυθμίσεις › Πωλήσεις)· όταν μια Νέα Ευκαιρία διαλέγει ρητά τέτοια Πηγή, η περιγραφή
-- (referred_by) είναι υποχρεωτική. Η Πηγή που κληρονομείται από υπάρχοντα Πελάτη δεν ξαναρωτιέται.

alter table public.sales_sources add column needs_detail boolean not null default false;

update public.sales_sources set needs_detail = true where code in ('referral', 'other');

-- Ίδια με τον ορισμό του 20261105160000_sales_owner_03_round_1.sql, με μία αλλαγή: ρητή ενεργή Πηγή με needs_detail
-- θέλει μη κενή περιγραφή. Η αποσυρμένη πέφτει στο ίδιο σφάλμα με πριν («Η Πηγή έχει αποσυρθεί»).
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

  if p_source_id is not null and length(trim(coalesce(p_referred_by, ''))) = 0 and exists (
    select 1 from public.sales_sources s where s.id = p_source_id and s.retired_at is null and s.needs_detail
  ) then
    raise exception 'Γράψε ποια είναι η Πηγή (π.χ. ποιος μας σύστησε)' using errcode = 'P0001';
  end if;

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
    v_client_id, p_title, v_source, trim(coalesce(p_referred_by, '')), v_manager, p_next_step, p_next_step_due, null);
  perform set_config('sales.allow_source', '', true);

  return jsonb_build_object(
    'status', 'created', 'opportunity_id', v_opp, 'client_id', v_client_id,
    'client_created', v_created, 'flagged', v_flagged);
end;
$$;
