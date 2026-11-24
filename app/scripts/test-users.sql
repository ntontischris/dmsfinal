-- Δοκιμαστικοί Χρήστες: ένας ανά Ρόλο ομάδας και δύο Χρήστες πελάτη σε δύο διαφορετικούς Πελάτες επίδειξης.
-- Τους λογαριασμούς (email + κωδικός) τους φτιάχνει το workflow test-users πριν τρέξει αυτό· εδώ μόνο τους δένουμε.
-- Ένα μπλοκ DO = μία συναλλαγή: ή μπαίνουν όλα ή τίποτα. Ξανατρέχει χωρίς ζημιά.
-- Το workflow αντικαθιστά το __ACTION__ με create ή remove. Η λίστα ζει στο test-users.json δίπλα.

do $$
declare
  v_action text := '__ACTION__';
  v_missing text;
  v_owner uuid;
  r record;
begin
  create temp table if not exists test_users on commit drop as
    select * from jsonb_to_recordset('__USERS__'::jsonb)
      as x(email text, name text, team_role text, client_rank integer);

  select string_agg(t.email, ', ') into v_missing
    from pg_temp.test_users t where not exists (select 1 from auth.users u where lower(u.email) = t.email);
  if v_missing is not null then
    raise exception 'Λείπουν λογαριασμοί: %', v_missing;
  end if;

  if v_action = 'remove' then
    update public.team_users tu set is_active = false
      from auth.users u, pg_temp.test_users t
     where tu.user_id = u.id and lower(u.email) = t.email and tu.is_active;
    update public.client_users cu set removed_at = now(), is_current = false
      from auth.users u, pg_temp.test_users t
     where cu.user_id = u.id and lower(u.email) = t.email and cu.removed_at is null;
    return;
  end if;

  select ur.user_id into v_owner
    from public.team_user_roles ur join public.roles ro on ro.id = ur.role_id
    join public.team_users tu on tu.user_id = ur.user_id
   where ro.is_owner and tu.is_active and tu.email not like 'dokimi-%'
   order by tu.created_at limit 1;

  -- Ομάδα: Χρήστης + Ρόλος (ο Ιδιοκτήτης με is_owner, οι άλλοι με το όνομα του ενσωματωμένου Ρόλου).
  for r in
    select u.id as user_id, t.email, t.name,
           (select ro.id from public.roles ro
             where ro.kind = 'team'
               and (case when t.team_role = 'owner' then ro.is_owner else ro.is_builtin and ro.name = t.team_role end)
             limit 1) as role_id, t.team_role
      from pg_temp.test_users t join auth.users u on lower(u.email) = t.email
     where t.team_role is not null
  loop
    if r.role_id is null then
      raise exception 'Δεν βρέθηκε Ρόλος «%»', r.team_role;
    end if;
    insert into public.team_users (user_id, name, email, language) values (r.user_id, r.name, r.email, 'el')
    on conflict (user_id) do update set is_active = true, deactivated_at = null, name = excluded.name;
    insert into public.team_user_roles (user_id, role_id) values (r.user_id, r.role_id) on conflict do nothing;
  end loop;

  -- Πελάτες: Α στον 1ο Πελάτη επίδειξης, Β στον 2ο (ώστε ο ένας να μη βλέπει τα του άλλου).
  for r in
    with demo_clients as (
      select c.id, row_number() over (order by c.created_at, c.id) as rank
        from public.clients c
       where c.archived_at is null
         and exists (select 1 from public.demo_rows d where d.table_name = 'clients' and d.row_id = c.id::text)
    )
    select u.id as user_id, t.name, t.client_rank, dc.id as client_id
      from pg_temp.test_users t join auth.users u on lower(u.email) = t.email
      left join demo_clients dc on dc.rank = t.client_rank
     where t.client_rank is not null
  loop
    if r.client_id is null then
      raise exception 'Δεν υπάρχουν δεδομένα επίδειξης (Πελάτης %): τρέξε πρώτα demo-data seed', r.client_rank;
    end if;
    insert into public.client_users (client_id, user_id, name, role_id, invited_by, is_current)
    values (r.client_id, r.user_id, r.name, (select ro.id from public.roles ro where ro.system_key = 'client_full'),
            v_owner, true)
    on conflict (client_id, user_id) do update set removed_at = null, is_current = true, name = excluded.name;
  end loop;

  -- Αλληλεπίδραση: η Παραγωγή δουλεύει στις Παραγωγές του Πελάτη Α, οι Πωλήσεις είναι Υπεύθυνος του Πελάτη Α.
  insert into public.production_members (production_id, user_id, added_by, added_at)
  select p.id, u.id, v_owner, now()
    from public.productions p
    join public.client_users cu on cu.client_id = p.client_id
    join auth.users ca on ca.id = cu.user_id and lower(ca.email) = 'dokimi-pelatis-a@example.com'
    join auth.users u on lower(u.email) = 'dokimi-paragogi@example.com'
   where p.owner_id is distinct from u.id
  on conflict do nothing;

  update public.clients c set manager_id = u.id
    from public.client_users cu
    join auth.users ca on ca.id = cu.user_id and lower(ca.email) = 'dokimi-pelatis-a@example.com',
         auth.users u
   where c.id = cu.client_id and lower(u.email) = 'dokimi-poliseis@example.com'
     and c.manager_id is distinct from u.id;
end;
$$;

-- Σύνοψη: ποιος είναι πού.
select u.email, coalesce(ro.name, cl.name) as place, coalesce(tu.is_active, cu.removed_at is null) as active
  from auth.users u
  left join public.team_users tu on tu.user_id = u.id
  left join public.team_user_roles ur on ur.user_id = u.id
  left join public.roles ro on ro.id = ur.role_id
  left join public.client_users cu on cu.user_id = u.id
  left join public.clients cl on cl.id = cu.client_id
 where u.email like 'dokimi-%@example.com'
 order by u.email;
