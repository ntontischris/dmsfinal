-- Διαγραφή Ρόλου με μετακίνηση (walkthrough Ιδιοκτήτη, διαδικασίες 7–8): «μπορώ να φτιάξω Ρόλο αλλά δεν μπορώ να διαγράψω».
--
-- Αρχές:
--  • Ποιος «έχει» έναν Ρόλο ορίζεται μία φορά (authz.role_usage), για την οθόνη (public.role_usage) και για τη διαγραφή
--    (public.role_delete): Χρήστες ομάδας (και απενεργοποιημένοι), Χρήστες πελάτη (και αφαιρεμένοι, γιατί το foreign
--    key τους είναι restrict), ανοιχτές προσκλήσεις (εκκρεμείς ή ληγμένες, που ξαναστέλνονται) και κοινό στη Γνώση.
--  • Ρόλος που τον έχει κάποιος σβήνεται μόνο μαζί με μετακίνηση σε άλλον Ρόλο ίδιου είδους (όχι στον Ιδιοκτήτη):
--    Χρήστες ομάδας (χωρίς διπλές εγγραφές), Χρήστες πελάτη, προσκλήσεις (ο Ρόλος αντικαθίσταται στο role_ids) και
--    κοινό της Γνώσης (χωρίς διπλές εγγραφές). Μετά σβήνεται ο Ρόλος, και τα Δικαιώματά του μαζί (on delete cascade).
--  • Οι κλεισμένες προσκλήσεις (αποδεκτές ή ακυρωμένες) μένουν όπως ήταν: είναι ιστορικό.
--  • Ο Ιδιοκτήτης και ο «Πλήρης» (system_key) δεν σβήνονται ποτέ (ίδιος κανόνας με τον roles_guard).
--  • Το κοινό της Γνώσης δεν σβήνει πια σιωπηλά μαζί με τον Ρόλο: το foreign key γίνεται restrict, αφού το μετακινεί η
--    διαγραφή.
--  • Μόνο ο Ιδιοκτήτης (μόνο αυτός αλλάζει Ρόλους). Η διαγραφή γράφεται στο Ίχνος (roles_audit) και ως Γεγονός πρόσβασης
--    «role_deleted» με τον Ρόλο προορισμού και τα πλήθη που μετακινήθηκαν.

-- ───────────── Γνώση: όχι σιωπηλό σβήσιμο ─────────────

alter table public.knowledge_item_audience
  drop constraint knowledge_item_audience_role_id_fkey,
  add constraint knowledge_item_audience_role_id_fkey
    foreign key (role_id) references public.roles (id) on delete restrict;

-- ───────────── Ποιος έχει έναν Ρόλο ─────────────

-- { "<id Ρόλου>": { teamUsers, clientUsers, invitations, knowledge } } για κάθε Ρόλο (ή μόνο για τον p_role).
create function authz.role_usage(p_role uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  return coalesce((
    select jsonb_object_agg(r.id, jsonb_build_object(
             'teamUsers', (select count(*) from public.team_user_roles ur where ur.role_id = r.id),
             'clientUsers', (select count(*) from public.client_users cu where cu.role_id = r.id),
             'invitations', (select count(*) from public.invitations i
                              where r.id = any (i.role_ids) and i.status in ('pending', 'expired')),
             'knowledge', (select count(*) from public.knowledge_item_audience a where a.role_id = r.id)))
      from public.roles r
     where p_role is null or r.id = p_role), '{}'::jsonb);
end;
$$;

-- «2 Χρήστες ομάδας, 1 Χρήστη πελάτη και 3 στοιχεία της Γνώσης». Κενό όταν δεν τον έχει κανείς.
create function authz.role_usage_text(p_usage jsonb) returns text
language plpgsql immutable set search_path = ''
as $$
declare
  v_parts text[] := '{}';
  v_n integer;
begin
  v_n := coalesce((p_usage ->> 'teamUsers')::integer, 0);
  if v_n > 0 then v_parts := v_parts || (v_n || case when v_n = 1 then ' Χρήστη ομάδας' else ' Χρήστες ομάδας' end); end if;
  v_n := coalesce((p_usage ->> 'clientUsers')::integer, 0);
  if v_n > 0 then v_parts := v_parts || (v_n || case when v_n = 1 then ' Χρήστη πελάτη' else ' Χρήστες πελάτη' end); end if;
  v_n := coalesce((p_usage ->> 'invitations')::integer, 0);
  if v_n > 0 then v_parts := v_parts || (v_n || case when v_n = 1 then ' ανοιχτή πρόσκληση' else ' ανοιχτές προσκλήσεις' end); end if;
  v_n := coalesce((p_usage ->> 'knowledge')::integer, 0);
  if v_n > 0 then v_parts := v_parts || (v_n || case when v_n = 1 then ' στοιχείο της Γνώσης' else ' στοιχεία της Γνώσης' end); end if;
  if cardinality(v_parts) = 0 then
    return '';
  end if;
  if cardinality(v_parts) = 1 then
    return v_parts[1];
  end if;
  return array_to_string(v_parts[1:cardinality(v_parts) - 1], ', ') || ' και ' || v_parts[cardinality(v_parts)];
end;
$$;

-- Για την οθόνη: τα πλήθη όλων των Ρόλων. Μόνο ο Ιδιοκτήτης.
create function public.role_usage() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.is_owner() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.role_usage(null);
end;
$$;

-- ───────────── Διαγραφή ─────────────

-- Η σειρά: Δικαίωμα, ύπαρξη, Ρόλοι που δεν σβήνονται, προορισμός, πλήθη, μετακίνηση, διαγραφή. Επιστρέφει τα πλήθη.
create function public.role_delete(p_role_id uuid, p_move_to uuid default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_role public.roles;
  v_target public.roles;
  v_usage jsonb;
  v_text text;
begin
  if not authz.is_owner() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select * into v_role from public.roles r where r.id = p_role_id for update;
  if not found then
    raise exception 'Ο Ρόλος δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if v_role.is_owner then
    raise exception 'Ο Ρόλος Ιδιοκτήτης δεν αλλάζει και δεν διαγράφεται' using errcode = 'P0001';
  end if;
  if v_role.system_key is not null or (v_role.kind = 'client' and v_role.is_builtin) then
    raise exception 'Ο Ρόλος «%» είναι ο Ρόλος της αυτόματης πρόσκλησης και δεν διαγράφεται', v_role.name
      using errcode = 'P0001';
  end if;
  if p_move_to is not null then
    select * into v_target from public.roles r where r.id = p_move_to;
    if not found then
      raise exception 'Ο Ρόλος όπου θα πάνε δεν βρέθηκε' using errcode = 'P0001';
    end if;
    if v_target.id = v_role.id then
      raise exception 'Διάλεξε άλλον Ρόλο από αυτόν που διαγράφεται' using errcode = 'P0001';
    end if;
    if v_target.kind <> v_role.kind then
      raise exception 'Ο Ρόλος όπου θα πάνε πρέπει να είναι του ίδιου είδους' using errcode = 'P0001';
    end if;
    if v_target.is_owner then
      raise exception 'Στον Ρόλο Ιδιοκτήτης δεν μετακινείται κανείς με διαγραφή Ρόλου' using errcode = 'P0001';
    end if;
  end if;

  v_usage := authz.role_usage(p_role_id) -> p_role_id::text;
  v_text := authz.role_usage_text(v_usage);
  if v_text <> '' and p_move_to is null then
    raise exception 'Τον Ρόλο «%» τον έχουν ακόμα %. Διάλεξε σε ποιον Ρόλο θα μετακινηθούν.', v_role.name, v_text
      using errcode = 'P0001';
  end if;

  if v_text <> '' then
    insert into public.team_user_roles (user_id, role_id)
    select ur.user_id, p_move_to from public.team_user_roles ur where ur.role_id = p_role_id
    on conflict do nothing;
    delete from public.team_user_roles ur where ur.role_id = p_role_id;
    update public.client_users cu set role_id = p_move_to where cu.role_id = p_role_id;
    update public.invitations i
       set role_ids = case when p_move_to = any (i.role_ids) then array_remove(i.role_ids, p_role_id)
                           else array_replace(i.role_ids, p_role_id, p_move_to) end
     where p_role_id = any (i.role_ids) and i.status in ('pending', 'expired');
    insert into public.knowledge_item_audience (item_id, role_id)
    select a.item_id, p_move_to from public.knowledge_item_audience a where a.role_id = p_role_id
    on conflict do nothing;
    delete from public.knowledge_item_audience a where a.role_id = p_role_id;
  end if;

  delete from public.roles r where r.id = p_role_id;
  perform authz.access_event('role_deleted', p_role_id::text, jsonb_build_object(
    'name', v_role.name, 'kind', v_role.kind, 'movedTo', v_target.id, 'movedToName', v_target.name, 'moved', v_usage));
  return v_usage;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function authz.role_usage(uuid), authz.role_usage_text(jsonb) from public, anon, authenticated;
revoke all on function public.role_usage(), public.role_delete(uuid, uuid) from public, anon;
grant execute on function public.role_usage(), public.role_delete(uuid, uuid) to authenticated;
