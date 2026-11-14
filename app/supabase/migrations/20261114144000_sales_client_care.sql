-- Φροντίδα Πελάτη (b7) στη Σελίδα Πελάτη:
--  • Διεύθυνση και Χώρος γυρίσματος του Πελάτη. Τα αλλάζει όποιος αλλάζει και τα άλλα στοιχεία (ίδιος κανόνας με το
--    sales_update_client), με δικό τους RPC ώστε να μην αλλάξει η υπογραφή του υπάρχοντος.
--  • «Υπενθύμισέ με»: προσωπικές υπενθυμίσεις (μέρα + σημείωση) πάνω σε Πελάτη. Τις βλέπει μόνο όποιος τις έγραψε, και
--    εμφανίζονται στο Σήμερα (κάρτα «Υπενθυμίσεις μου») από τη μέρα τους και μετά, μέχρι να πατηθεί «Έγινε».
--  • «Ανανέωση»: το βήμα ανάβει όταν μηνιαία Συμφωνία του Πελάτη λήγει μέσα στο παράθυρο ανανέωσης των Συμφωνιών
--    (agreement_defaults.renewal_lead_days, η ίδια ρύθμιση της O3) ή όταν υπάρχει ανοιχτή Ευκαιρία ανανέωσης.

-- ───────────── Διεύθυνση και Χώρος γυρίσματος ─────────────

alter table public.clients
  add column address text not null default '' check (length(address) <= 300),
  add column filming_location text not null default '' check (length(filming_location) <= 300);

create function public.sales_update_client_place(p_client uuid, p_address text, p_filming_location text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_manager uuid;
begin
  perform authz.require('clients.manage');
  select c.manager_id into v_manager from public.clients c where c.id = p_client and c.archived_at is null;
  if not found then
    raise exception 'Ο Πελάτης δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if coalesce(authz.scope('clients.manage'), '') <> 'all' and v_manager is distinct from auth.uid() then
    raise exception 'Τα στοιχεία του Πελάτη τα αλλάζει ο Υπεύθυνός του' using errcode = '42501';
  end if;
  update public.clients set
    address = trim(coalesce(p_address, '')),
    filming_location = trim(coalesce(p_filming_location, ''))
  where id = p_client;
end;
$$;

revoke all on function public.sales_update_client_place(uuid, text, text) from public, anon, authenticated;
grant execute on function public.sales_update_client_place(uuid, text, text) to authenticated;

-- ───────────── «Υπενθύμισέ με» ─────────────

create table public.client_reminders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.team_users (user_id) on delete cascade,
  remind_on date not null,
  note text not null check (length(trim(note)) between 1 and 300),
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index client_reminders_user_idx on public.client_reminders (user_id, remind_on) where done_at is null;
create index client_reminders_client_idx on public.client_reminders (client_id);

alter table public.client_reminders enable row level security;

revoke all on table public.client_reminders from anon, authenticated;
grant select, insert, delete on table public.client_reminders to authenticated;
grant update (done_at) on table public.client_reminders to authenticated;

-- Μόνο οι δικές μου· νέα μόνο σε Πελάτη που βλέπω.
create policy client_reminders_select on public.client_reminders
  for select to authenticated using (user_id = auth.uid());
create policy client_reminders_insert on public.client_reminders
  for insert to authenticated
  with check (user_id = auth.uid() and authz.is_team_user() and authz.can_see_client_id(client_id));
create policy client_reminders_update on public.client_reminders
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy client_reminders_delete on public.client_reminders
  for delete to authenticated using (user_id = auth.uid());

-- ───────────── Σήμερα: κάρτα «Υπενθυμίσεις μου» ─────────────

-- Η κάρτα υπάρχει για όποιον βλέπει Πελάτες (όχι π.χ. για την Παραγωγή).
-- Οι ανοιχτές υπενθυμίσεις του p_uid που ήρθε η μέρα τους, σε Πελάτες που βλέπει ακόμα. Ο συγχωνευμένος Πελάτης
-- ανοίγει τον Πελάτη στον οποίο συγχωνεύτηκε.
create function authz.today_client_reminder_rows(p_uid uuid, p_now timestamptz)
returns table (id text, title text, subtitle text, at timestamptz, urgent boolean, link text, rn integer)
language sql stable security definer set search_path = ''
as $$
  with v as (select authz.today_work_day(p_now) as today)
  select r.id::text, r.note, c.name, authz.today_work_day_at(r.remind_on), r.remind_on < v.today,
         '/app/clients/' || coalesce(c.merged_into_id, c.id)::text,
         (row_number() over (order by r.remind_on, r.created_at, r.id))::integer
    from public.client_reminders r
    join public.clients c on c.id = r.client_id
    cross join v
   where r.user_id = p_uid and r.done_at is null and r.remind_on <= v.today
     and authz.today_sees_client(p_uid, coalesce(c.merged_into_id, c.id));
$$;

create function authz.today_count_client_reminders(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or not authz.user_is_team(p_uid)
     or coalesce(authz.user_scope(p_uid, 'clients.view'), authz.user_scope(p_uid, 'clients.manage')) is null then
    return null;
  end if;
  return (select count(*)::integer from authz.today_client_reminder_rows(p_uid, p_now));
end;
$$;

create function authz.today_items_client_reminders(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or not authz.user_is_team(p_uid)
     or coalesce(authz.user_scope(p_uid, 'clients.view'), authz.user_scope(p_uid, 'clients.manage')) is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.today_work_rows_json((select jsonb_agg(to_jsonb(r)) from authz.today_client_reminder_rows(p_uid, p_now) r));
end;
$$;

revoke all on function authz.today_client_reminder_rows(uuid, timestamptz) from public, anon, authenticated;
revoke all on function authz.today_count_client_reminders(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function authz.today_items_client_reminders(uuid, uuid, timestamptz) from public, anon, authenticated;

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('client_reminders', 'work', 'action', 'team', 245, 'Υπενθυμίσεις μου', 'My reminders', '/app/clients',
   'authz.today_count_client_reminders(uuid, uuid, timestamptz)',
   'authz.today_items_client_reminders(uuid, uuid, timestamptz)');

-- ───────────── «Ανανέωση» ─────────────

-- true όταν ο Πελάτης είναι σε φάση ανανέωσης: μηνιαία Συμφωνία (υπογεγραμμένη ή ενεργή, χωρίς «Χωρίς συνέχιση») λήγει
-- από p_today έως p_today + renewal_lead_days, ή υπάρχει ανοιχτή Ευκαιρία ανανέωσης. 42501 σε Πελάτη που δεν βλέπω.
create function public.sales_client_renewal_due(p_client uuid, p_today date default null) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, public.sales_today());
  v_lead integer := coalesce((select d.renewal_lead_days from public.agreement_defaults d where d.id), 30);
begin
  if not authz.can_see_client_id(p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return exists (
           select 1
             from public.agreements a
             join public.opportunities o on o.id = a.opportunity_id
             left join public.agreement_endings e on e.agreement_id = a.id
            where o.client_id = p_client and a.kind = 'monthly' and a.state in ('signed', 'active')
              and a.end_on between v_today and v_today + v_lead
              and e.no_continuation_at is null)
      or exists (
           select 1
             from public.agreement_renewals r
             join public.agreements a on a.id = r.agreement_id
             join public.opportunities src on src.id = a.opportunity_id
             join public.opportunities o on o.id = r.opportunity_id
            where src.client_id = p_client and o.outcome = 'open');
end;
$$;

revoke all on function public.sales_client_renewal_due(uuid, date) from public, anon, authenticated;
grant execute on function public.sales_client_renewal_due(uuid, date) to authenticated;
