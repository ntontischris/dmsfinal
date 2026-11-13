-- Πρόσβαση a3: κάρτα «Πρώτα βήματα» στη Σήμερα, στην πρώτη είσοδο κάθε Χρήστη.
--
--  • Ένα κείμενο ανά Ρόλο (public.role_first_steps), που το γράφει ο Ιδιοκτήτης από τη σελίδα του Ρόλου.
--    Ξεχωριστός πίνακας και όχι στήλη στο roles: ο Ρόλος Ιδιοκτήτης δεν αλλάζει ποτέ (roles_guard), το κείμενό του όμως ναι.
--  • Ο Χρήστης βλέπει τα κείμενα των Ρόλων του (ομάδας, ή του Ρόλου πελάτη στον τρέχοντα Πελάτη) μέχρι να πατήσει «Κατάλαβα».
--    Η απόκρυψη είναι μία για όλη την κάρτα (public.first_steps_dismissals).
--  • Και οι δύο πίνακες είναι κλειστοί· όλα περνούν από τις RPC από κάτω.

create table public.role_first_steps (
  role_id uuid primary key references public.roles (id) on delete cascade,
  body text not null check (length(trim(body)) > 0 and char_length(body) <= 2000),
  updated_at timestamptz not null default now()
);

alter table public.role_first_steps enable row level security;
revoke all on public.role_first_steps from anon, authenticated;

create table public.first_steps_dismissals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dismissed_at timestamptz not null default now()
);

alter table public.first_steps_dismissals enable row level security;
revoke all on public.first_steps_dismissals from anon, authenticated;

-- Αρχικά κείμενα για τους έτοιμους Ρόλους. Ο Ιδιοκτήτης τα αλλάζει ή τα σβήνει.
insert into public.role_first_steps (role_id, body)
select r.id, d.body
  from (values
    ('team', 'Ιδιοκτήτης', 'Ξεκίνα από την Ομάδα: πρόσκαλεσε τους συνεργάτες σου και δώσε τους Ρόλο. Μετά πέρασε τους Πελάτες και τις Συμφωνίες τους. Τα κείμενα αυτής της κάρτας τα αλλάζεις από τη σελίδα κάθε Ρόλου.'),
    ('team', 'Διαχείριση', 'Η Σήμερα δείχνει ό,τι περιμένει απόφαση. Από το «Νέο» φτιάχνεις Πελάτη, Γύρισμα ή Πρόσκληση. Ό,τι αφορά Ρόλους το αποφασίζει ο Ιδιοκτήτης.'),
    ('team', 'Παραγωγή', 'Η Σήμερα δείχνει τα Γυρίσματα και τα Παραδοτέα σου. Άνοιξε το Ημερολόγιο για την εβδομάδα και ενημέρωνε την κατάσταση κάθε Παραδοτέου όταν προχωρά.'),
    ('team', 'Πωλήσεις', 'Η Σήμερα δείχνει τις επαφές που περιμένουν συνέχεια. Από το «Νέο» περνάς νέο Πελάτη ή ευκαιρία· οι Συμφωνίες σου φαίνονται στις Πωλήσεις.'),
    ('team', 'Λογιστής', 'Βλέπεις τα Οικονομικά και τις Αναφορές· δεν αλλάζεις τίποτα. Οι εξαγωγές είναι στις Αναφορές.'),
    ('client', 'Πλήρης', 'Καλώς ήρθες! Εδώ βλέπεις τα Γυρίσματα, τα Παραδοτέα και τα Τιμολόγιά σου. Για ό,τι χρειαστείς, γράψε μας στα Μηνύματα.')
  ) as d (kind, name, body)
  join public.roles r on r.kind = d.kind and r.name = d.name and r.is_builtin
on conflict (role_id) do nothing;

-- Τα κείμενα που βλέπει τώρα ο τρέχων Χρήστης: [{role, body}], ή [] αν έκρυψε την κάρτα.
create function public.first_steps_view() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Χρειάζεται σύνδεση.' using errcode = '42501';
  end if;
  if exists (select 1 from public.first_steps_dismissals d where d.user_id = v_user) then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('role', r.name, 'body', f.body) order by r.is_owner desc, r.name)
      from public.roles r
      join public.role_first_steps f on f.role_id = r.id
     where r.id in (
       select tur.role_id from public.team_user_roles tur
         join public.team_users tu on tu.user_id = tur.user_id and tu.is_active
        where tur.user_id = v_user
       union
       select cu.role_id from public.client_users cu
        where cu.user_id = v_user and cu.is_current and cu.removed_at is null
          and not exists (select 1 from public.team_users tu where tu.user_id = v_user))
  ), '[]'::jsonb);
end;
$$;

-- «Κατάλαβα»: η κάρτα δεν ξαναφαίνεται στον τρέχοντα Χρήστη.
create function public.first_steps_dismiss() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Χρειάζεται σύνδεση.' using errcode = '42501';
  end if;
  insert into public.first_steps_dismissals (user_id) values (auth.uid())
  on conflict (user_id) do nothing;
end;
$$;

-- Το κείμενο ενός Ρόλου, για τη φόρμα του Ιδιοκτήτη ('' αν δεν έχει).
create function public.role_first_steps_get(p_role_id uuid) returns text
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not coalesce(authz.is_owner(), false) then
    raise exception 'Μόνο ο Ιδιοκτήτης.' using errcode = '42501';
  end if;
  return coalesce((select f.body from public.role_first_steps f where f.role_id = p_role_id), '');
end;
$$;

-- Ο Ιδιοκτήτης γράφει το κείμενο ενός Ρόλου· κενό = ο Ρόλος δεν έχει κάρτα.
create function public.role_first_steps_set(p_role_id uuid, p_body text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_body text := trim(coalesce(p_body, ''));
begin
  if not coalesce(authz.is_owner(), false) then
    raise exception 'Μόνο ο Ιδιοκτήτης.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.roles r where r.id = p_role_id) then
    raise exception 'Ο Ρόλος δεν βρέθηκε.' using errcode = 'P0001';
  end if;
  if char_length(v_body) > 2000 then
    raise exception 'Το κείμενο είναι έως 2000 χαρακτήρες.' using errcode = 'P0001';
  end if;
  if v_body = '' then
    delete from public.role_first_steps where role_id = p_role_id;
    return;
  end if;
  insert into public.role_first_steps (role_id, body) values (p_role_id, v_body)
  on conflict (role_id) do update set body = excluded.body, updated_at = now();
end;
$$;

revoke all on function public.first_steps_view() from public, anon;
revoke all on function public.first_steps_dismiss() from public, anon;
revoke all on function public.role_first_steps_get(uuid) from public, anon;
revoke all on function public.role_first_steps_set(uuid, text) from public, anon;
grant execute on function public.first_steps_view() to authenticated;
grant execute on function public.first_steps_dismiss() to authenticated;
grant execute on function public.role_first_steps_get(uuid) to authenticated;
grant execute on function public.role_first_steps_set(uuid, text) to authenticated;
