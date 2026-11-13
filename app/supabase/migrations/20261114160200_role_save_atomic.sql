-- Πρόσβαση a6: η αποθήκευση Ρόλου γίνεται μία ατομική ενέργεια.
--
-- Πριν, η οθόνη έκανε τρεις ξεχωριστές κλήσεις (όνομα, αφαίρεση Δικαιωμάτων, προσθήκη Δικαιωμάτων)· αν η δεύτερη ή η τρίτη
-- αποτύγχανε, ο Ρόλος έμενε μισοαποθηκευμένος. Το ίδιο και η δημιουργία με αντιγραφή («δημιουργήθηκε, αλλά τα Δικαιώματα
-- δεν αντιγράφηκαν»). Τώρα:
--  • public.role_save: όνομα, περιγραφή και ΟΛΑ τα Δικαιώματα του Ρόλου σε μία συναλλαγή. Το p_grants είναι η πλήρης νέα
--    εικόνα { "<Δικαίωμα>": "all" | "mine" }· ό,τι λείπει αφαιρείται. Κάθε σφάλμα (π.χ. Εύρος που δεν υποστηρίζεται, όνομα
--    που υπάρχει ήδη) ακυρώνει τα πάντα.
--  • public.role_create: νέος Ρόλος, προαιρετικά αντίγραφο άλλου Ρόλου ίδιου είδους, σε μία συναλλαγή.
--  • Μόνο ο Ιδιοκτήτης (όπως το RLS των Ρόλων). Οι κανόνες μένουν στους υπάρχοντες guards (roles_guard,
--    role_permissions_guard)· το Ίχνος γράφεται από τα υπάρχοντα audit triggers.

create function public.role_save(p_role_id uuid, p_name text, p_description text, p_grants jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not authz.is_owner() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if jsonb_typeof(p_grants) is distinct from 'object' then
    raise exception 'Τα Δικαιώματα δεν είναι έγκυρα' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.roles r where r.id = p_role_id) then
    raise exception 'Ο Ρόλος δεν βρέθηκε' using errcode = 'P0001';
  end if;

  update public.roles
     set name = trim(p_name), description = trim(coalesce(p_description, ''))
   where id = p_role_id;

  delete from public.role_permissions rp
   where rp.role_id = p_role_id
     and not (p_grants ? rp.permission);

  insert into public.role_permissions (role_id, permission, scope)
  select p_role_id, g.key, g.value
    from jsonb_each_text(p_grants) g
  on conflict (role_id, permission) do update
    set scope = excluded.scope
    where public.role_permissions.scope is distinct from excluded.scope;
end;
$$;

create function public.role_create(p_kind text, p_name text, p_copy_from uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_source public.roles;
  v_id uuid;
begin
  if not authz.is_owner() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  if p_copy_from is not null then
    select * into v_source from public.roles r where r.id = p_copy_from;
    if not found then
      raise exception 'Ο Ρόλος για αντιγραφή δεν βρέθηκε' using errcode = 'P0001';
    end if;
    if v_source.kind <> p_kind then
      raise exception 'Αντιγραφή μόνο από Ρόλο ίδιου είδους' using errcode = 'P0001';
    end if;
  end if;

  insert into public.roles (name, kind, description)
  values (trim(p_name), p_kind,
          case when v_source.id is null then '' else format('Αντίγραφο του «%s».', v_source.name) end)
  returning id into v_id;

  -- Ο Ιδιοκτήτης έχει όλα τα Δικαιώματα χωρίς να αποθηκεύονται· από αυτόν δεν αντιγράφεται τίποτα.
  if v_source.id is not null and not v_source.is_owner then
    insert into public.role_permissions (role_id, permission, scope)
    select v_id, rp.permission, rp.scope
      from public.role_permissions rp
     where rp.role_id = v_source.id;
  end if;
  return v_id;
end;
$$;

revoke all on function public.role_save(uuid, text, text, jsonb), public.role_create(text, text, uuid) from public, anon;
grant execute on function public.role_save(uuid, text, text, jsonb), public.role_create(text, text, uuid) to authenticated;
