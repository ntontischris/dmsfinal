-- Ολοκλήρωση Παραγωγής και Εργασίες (#143): αυτόματη παράδοση μετά την τελευταία έγκριση, email «Παραδόθηκε» ανά
-- Χρήστη πελάτη, υπενθυμίσεις πελάτη (Κανόνας «υπενθυμίσεις») από το cron της ουράς, Εργασίες Παραγωγής (μόνο ομάδα),
-- και μεταφορά ανοιχτών Εργασιών και Παραδοτέων στον Υπεύθυνο όταν αφαιρείται Μέλος.
--
-- Αρχές:
--  • Η αυτόματη και η χειροκίνητη παράδοση περνούν από το ίδιο σημείο (authz.production_mark_delivered): ίδιο Ίχνος, ίδιο email.
--  • Η αυτόματη παράδοση καλείται ΜΟΝΟ μετά από έγκριση· ποτέ μετά από ακύρωση Παραδοτέου ή Γυρίσματος.
--  • Οι Εργασίες και οι υπενθυμίσεις δεν φαίνονται ποτέ στον πελάτη· οι πίνακες μένουν κλειστοί για την εφαρμογή.

-- ───────────── Email ─────────────

alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check
  check (kind in ('test', 'invite_resend', 'client_added', 'filming_decision', 'reschedule_decision',
                  'sheet_issued', 'crew_declined', 'deliverable_version_sent',
                  'production_delivered', 'deliverable_reminder'));

-- ───────────── Εργασίες Παραγωγής ─────────────

-- Απλές Εργασίες της Παραγωγής (G2). Ένας υπεύθυνος, προαιρετική προθεσμία, «έγινε» ή όχι.
create table public.production_tasks (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions (id),
  title text not null check (length(trim(title)) between 1 and 200),
  assignee_id uuid references public.team_users (user_id),
  due_date date,
  done_at timestamptz,
  done_by uuid,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid,
  check ((done_at is null) = (done_by is null))
);

create index production_tasks_production_idx on public.production_tasks (production_id);
create index production_tasks_assignee_idx on public.production_tasks (assignee_id);

alter table public.production_tasks enable row level security;
revoke all on table public.production_tasks from anon, authenticated;

create trigger production_tasks_audit after insert or delete on public.production_tasks
  for each row execute function authz.audit_row('id');
create trigger production_tasks_audit_update after update on public.production_tasks
  for each row when (old.* is distinct from new.*) execute function authz.audit_row('id');

-- ───────────── Υπενθυμίσεις πελάτη ─────────────

-- Μία γραμμή ανά (Έκδοση, ημέρα υπενθύμισης)· η ίδια υπενθύμιση δεν ξαναστέλνεται (idempotent).
create table public.deliverable_reminders (
  deliverable_id uuid not null,
  version_number integer not null,
  day integer not null check (day >= 1),
  sent_at timestamptz not null default now(),
  primary key (deliverable_id, version_number, day),
  foreign key (deliverable_id, version_number) references public.deliverable_versions (deliverable_id, number)
);

alter table public.deliverable_reminders enable row level security;
revoke all on table public.deliverable_reminders from anon, authenticated;

-- ───────────── Παράδοση Παραγωγής: κοινό σημείο ─────────────

-- Ποιες Εργασίες και Παραδοτέα μπαίνουν στο email «Παραδόθηκε»: μη ακυρωμένα, με τελικά αρχεία και link.
create function authz.production_delivery_items(p_production uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'title', d.title,
           'finalFilesUrl', d.final_files_url,
           'url', (select v.url from public.deliverable_versions v
                    where v.deliverable_id = d.id order by v.number desc limit 1)
         ) order by d.created_at, d.id), '[]'::jsonb)
    from public.deliverables d
   where d.production_id = p_production and d.cancelled_at is null;
$$;

-- Email «Παραδόθηκε» σε κάθε Χρήστη πελάτη του Πελάτη με «Βλέπει Παραγωγές». Εσωτερική Παραγωγή: κανένας.
create function authz.email_production_delivered(p_production uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.email_outbox (kind, to_name, to_email, locale, payload, created_by)
  select 'production_delivered', cu.name, lower(trim(u.email)), coalesce(t.language, 'el'),
         jsonb_build_object(
           'productionId', p.id, 'title', p.title,
           'deliverables', authz.production_delivery_items(p.id)
         ),
         auth.uid()
    from public.productions p
    join public.client_users cu on cu.client_id = p.client_id and cu.removed_at is null
    join public.role_permissions rp on rp.role_id = cu.role_id and rp.permission = 'c.productions'
    join auth.users u on u.id = cu.user_id
    left join public.team_users t on t.user_id = cu.user_id
   where p.id = p_production and coalesce(u.email, '') <> '';
end;
$$;

-- Η Παραγωγή γίνεται «παραδομένη»: κοινό για χειροκίνητη και αυτόματη παράδοση (ίδιο Ίχνος, ίδιο email).
-- Το p_auto σημαδεύει το γεγονός με auto: true ώστε η κάρτα να δείχνει «Παραδόθηκε αυτόματα».
create function authz.production_mark_delivered(p_production uuid, p_note text, p_auto boolean) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.productions p
     set state = 'delivered', delivered_at = now(), delivered_by = auth.uid(), delivered_note = p_note
   where p.id = p_production;
  perform authz.production_event(p_production, 'delivered',
    jsonb_build_object('note', p_note) || case when p_auto then '{"auto": true}'::jsonb else '{}'::jsonb end);
  perform authz.email_production_delivered(p_production);
end;
$$;

-- Ολοκληρωμένη για αυτόματη παράδοση: ≥1 μη ακυρωμένο Παραδοτέο, όλα εγκεκριμένα, κανένα ανοιχτό Γύρισμα.
-- Ανοιχτές Εργασίες δεν μπλοκάρουν.
create function authz.production_is_complete(p_production uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
           select 1 from public.deliverables d
            where d.production_id = p_production and d.cancelled_at is null
         )
     and not exists (
           select 1 from public.deliverables d
            where d.production_id = p_production and d.cancelled_at is null
              and authz.deliverable_state(d.id) <> 'approved'
         )
     and not exists (
           select 1 from public.filmings f
            where f.production_id = p_production and f.state in ('pending', 'scheduled')
         );
$$;

-- Καλείται μετά από έγκριση (πελάτη ή εσωτερική). Αν η Παραγωγή είναι ανοιχτή και ολοκληρωμένη, παραδίδεται.
create function authz.production_try_auto_deliver(p_production uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.productions p where p.id = p_production and p.state = 'open' for update;
  if not found or not authz.production_is_complete(p_production) then
    return;
  end if;
  perform authz.production_mark_delivered(p_production, 'Αυτόματα: εγκρίθηκαν όλα τα Παραδοτέα', true);
end;
$$;

-- Χειροκίνητη παράδοση: ίδιοι έλεγχοι με πριν (Δικαίωμα, σχόλιο, ανοιχτή Παραγωγή).
create or replace function public.production_deliver(p_production uuid, p_note text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_state text;
begin
  perform authz.production_writable(p_production);
  if v_note is null then
    raise exception 'Η παράδοση θέλει σχόλιο: τι παραδόθηκε και πού' using errcode = 'P0001';
  end if;
  select p.state into v_state from public.productions p where p.id = p_production for update;
  if v_state <> 'open' then
    raise exception 'Η Παραγωγή δεν είναι ανοιχτή' using errcode = 'P0001';
  end if;
  perform authz.production_mark_delivered(p_production, v_note, false);
end;
$$;

-- ───────────── Αυτόματη παράδοση μετά την έγκριση ─────────────

-- Απάντηση πελάτη (τελευταίος ορισμός· ό,τι άλλαξε: η κλήση μετά την έγκριση).
create or replace function public.deliverable_client_answer(p_id uuid, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_row public.deliverables;
  v_awaiting integer;
  v_latest public.deliverable_versions;
begin
  perform authz.require_client_permission('c.approve');
  perform authz.require_client_deliverable_visible(p_id);
  select * into v_row from public.deliverables d where d.id = p_id for update;
  if v_row.cancelled_at is not null then
    raise exception 'Το Παραδοτέο έχει ακυρωθεί' using errcode = 'P0001';
  end if;
  if p_approve is null then
    raise exception 'Η απάντηση θέλει «ενέκρινε» ή «ζήτησε αλλαγές»' using errcode = 'P0001';
  end if;
  select v.number into v_awaiting from public.deliverable_versions v
   where v.deliverable_id = p_id and v.state = 'awaiting_client';
  if v_awaiting is null then
    select * into v_latest from public.deliverable_versions v
     where v.deliverable_id = p_id order by v.number desc limit 1;
    if v_latest.answered_at is not null and (v_latest.state = 'changes_requested' or v_row.approved_at is not null) then
      raise exception 'Απάντησε ήδη ο/η %', authz.client_user_name(
        v_latest.answered_by,
        (select p.client_id from public.productions p where p.id = v_row.production_id)
      ) using errcode = 'P0001';
    end if;
    raise exception 'Δεν υπάρχει Έκδοση σε αναμονή απάντησης' using errcode = 'P0001';
  end if;
  if p_approve then
    update public.deliverable_versions v
       set state = 'approved', answered_at = now(), answered_by = auth.uid(), answer_note = v_note
     where v.deliverable_id = p_id and v.number = v_awaiting;
    update public.deliverables d set approved_at = clock_timestamp(), approved_by = auth.uid() where d.id = p_id;
    perform authz.production_try_auto_deliver(v_row.production_id);
    return;
  end if;
  if v_note is null then
    raise exception 'Η ζήτηση αλλαγών θέλει σημείωση' using errcode = 'P0001';
  end if;
  update public.deliverable_versions v
     set state = 'changes_requested', answered_at = now(), answered_by = auth.uid(), answer_note = v_note
   where v.deliverable_id = p_id and v.number = v_awaiting;
  update public.deliverables d
     set deadline = authz.add_working_days(public.sales_today(), authz.deliverable_changes_days())
   where d.id = p_id;
  perform authz.reopen_production_for_work(v_row.production_id);
end;
$$;

-- Ενέκρινε εσωτερικά (Π2): μόνο σε Εσωτερική Παραγωγή. Μετά, αυτόματη παράδοση αν ολοκληρώθηκε.
create or replace function public.deliverable_approve_internal(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_production uuid;
begin
  perform authz.deliverable_gate(p_id, 'deliverables.review');
  perform authz.require_deliverable_open(p_id);
  perform 1 from public.deliverables d where d.id = p_id for update;
  select p.client_id, p.id into v_client, v_production
    from public.deliverables d join public.productions p on p.id = d.production_id where d.id = p_id;
  if v_client is not null then
    raise exception 'Μόνο Εσωτερική Παραγωγή εγκρίνεται εσωτερικά' using errcode = 'P0001';
  end if;
  if authz.deliverable_state(p_id) <> 'in_review' then
    raise exception 'Η Έκδοση δεν είναι σε εσωτερικό έλεγχο' using errcode = 'P0001';
  end if;
  update public.deliverable_versions v
     set state = 'approved', answered_at = now(), answered_by = auth.uid()
   where v.deliverable_id = p_id and v.number = authz.deliverable_current_number(p_id);
  update public.deliverables d set approved_at = now(), approved_by = auth.uid() where d.id = p_id;
  perform authz.production_try_auto_deliver(v_production);
end;
$$;

-- ───────────── Υπενθυμίσεις: enqueue (cron) ─────────────

-- Email υπενθύμισης σε κάθε Χρήστη πελάτη με «Εγκρίνει Παραδοτέα».
create function authz.email_client_deliverable_reminder(p_deliverable uuid, p_number integer, p_day integer) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.email_outbox (kind, to_name, to_email, locale, payload, created_by)
  select 'deliverable_reminder', cu.name, lower(trim(u.email)), coalesce(t.language, 'el'),
         jsonb_build_object(
           'deliverableId', d.id, 'title', d.title, 'production', p.title,
           'version', p_number, 'days', p_day
         ),
         null
    from public.deliverables d
    join public.productions p on p.id = d.production_id
    join public.client_users cu on cu.client_id = p.client_id and cu.removed_at is null
    join public.role_permissions rp on rp.role_id = cu.role_id and rp.permission = 'c.approve'
    join auth.users u on u.id = cu.user_id
    left join public.team_users t on t.user_id = cu.user_id
   where d.id = p_deliverable and coalesce(u.email, '') <> '';
end;
$$;

-- Για κάθε Έκδοση που περιμένει τον πελάτη σε ανοιχτή Παραγωγή πελάτη: μία υπενθύμιση για κάθε ημέρα του Κανόνα
-- που έχουν περάσει (ημερολογιακές, Ώρα Ελλάδας). Idempotent: η γραμμή της υπενθύμισης γράφεται πρώτα.
create function public.deliverable_reminders_enqueue() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_pending record;
  v_day integer;
  v_count integer := 0;
  v_today date := public.sales_today();
begin
  for v_pending in
    select d.id as deliverable_id, v.number, (v.sent_at at time zone 'Europe/Athens')::date as sent_on
      from public.deliverable_versions v
      join public.deliverables d on d.id = v.deliverable_id
      join public.productions p on p.id = d.production_id
     where v.state = 'awaiting_client' and v.sent_at is not null
       and d.cancelled_at is null and p.state = 'open' and p.client_id is not null
  loop
    foreach v_day in array authz.deliverable_reminder_days() loop
      continue when v_today - v_pending.sent_on < v_day;
      insert into public.deliverable_reminders (deliverable_id, version_number, day)
      values (v_pending.deliverable_id, v_pending.number, v_day)
      on conflict do nothing;
      if found then
        perform authz.email_client_deliverable_reminder(v_pending.deliverable_id, v_pending.number, v_day);
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;
  return v_count;
end;
$$;

-- ───────────── Εργασίες: RPC γραφής ─────────────

-- Πύλη για ενέργεια σε υπάρχουσα Εργασία: Δικαίωμα ΠΡΩΤΑ (ίδια πύλη με τα Μέλη), μετά ανοιχτή Παραγωγή.
create function authz.task_gate(p_task uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_production uuid := (select t.production_id from public.production_tasks t where t.id = p_task);
begin
  perform authz.production_writable(v_production);
  if v_production is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.require_production_open(v_production);
  return v_production;
end;
$$;

-- Τίτλος Εργασίας: 1–200 χαρακτήρες μετά το trim.
create function authz.task_title(p_title text) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_title text := trim(coalesce(p_title, ''));
begin
  if length(v_title) < 1 or length(v_title) > 200 then
    raise exception 'Η Εργασία θέλει τίτλο έως 200 χαρακτήρες' using errcode = 'P0001';
  end if;
  return v_title;
end;
$$;

create function public.production_task_add(p_production uuid, p_title text, p_assignee uuid, p_due date) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform authz.production_writable(p_production);
  perform authz.require_production_open(p_production);
  perform authz.check_deliverable_assignee(p_production, p_assignee);
  insert into public.production_tasks (production_id, title, assignee_id, due_date, sort, created_by)
  values (p_production, authz.task_title(p_title), p_assignee, p_due,
          (select coalesce(max(t.sort), 0) + 1 from public.production_tasks t where t.production_id = p_production),
          auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Επεξεργασία: τίτλος, υπεύθυνος και προθεσμία μαζί (η φόρμα στέλνει και τα τρία).
create function public.production_task_update(p_id uuid, p_title text, p_assignee uuid, p_due date) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_production uuid := authz.task_gate(p_id);
begin
  perform authz.check_deliverable_assignee(v_production, p_assignee);
  update public.production_tasks t
     set title = authz.task_title(p_title), assignee_id = p_assignee, due_date = p_due
   where t.id = p_id;
end;
$$;

create function public.production_task_toggle(p_id uuid, p_done boolean) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.task_gate(p_id);
  if p_done is null then
    raise exception 'Η σήμανση θέλει «έγινε» ή «όχι»' using errcode = 'P0001';
  end if;
  update public.production_tasks t
     set done_at = case when p_done then now() else null end,
         done_by = case when p_done then auth.uid() else null end
   where t.id = p_id;
end;
$$;

create function public.production_task_delete(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.task_gate(p_id);
  delete from public.production_tasks t where t.id = p_id;
end;
$$;

-- ───────────── Σελίδα Παραγωγής (τελευταίος ορισμός) ─────────────

-- Εργασίες για την ομάδα: ο πελάτης δεν τις βλέπει ποτέ (κενή λίστα).
create function authz.production_tasks_json(p_production uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', t.id, 'title', t.title, 'assigneeId', t.assignee_id,
           'assigneeName', (select u.name from public.team_users u where u.user_id = t.assignee_id),
           'dueDate', t.due_date,
           'isLate', (t.done_at is null and t.due_date is not null and t.due_date < public.sales_today()),
           'done', (t.done_at is not null)
         ) order by t.sort, t.created_at, t.id), '[]'::jsonb)
    from public.production_tasks t
   where t.production_id = p_production;
$$;

-- Αυτόματη παράδοση: το τελευταίο γεγονός «παραδόθηκε» ή «επανανοίχτηκε» έχει auto.
create function authz.production_auto_delivered(p_production uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((
           select (a.after ->> 'auto')::boolean from public.audit_log a
            where a.entity = 'productions' and a.entity_id = p_production::text and a.action = 'event'
              and a.after ->> 'event' in ('delivered', 'reopened')
            order by a.at desc, a.id desc limit 1
         ), false);
$$;

create or replace function public.production_view(p_production uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_team boolean := authz.is_team_user();
begin
  perform authz.require_production_viewer();
  if not authz.can_see_production(p_production) then
    if coalesce(authz.scope('productions.manage'), '') = 'all' then
      perform authz.require_production(p_production);
    end if;
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.production_card(p_production) || authz.production_detail(p_production, v_team)
    || jsonb_build_object('filmings', (
         select coalesce(jsonb_agg(jsonb_build_object(
                  'id', f.id, 'startsAt', f.starts_at, 'hours', f.hours, 'state', f.state, 'isExtra', f.is_extra,
                  'kind', (select k.label from public.provision_kinds k where k.id = f.kind_id)
                ) order by f.starts_at, f.id), '[]'::jsonb)
           from public.filmings f
          where f.production_id = p_production and authz.can_see_filming(f.id)
       ))
    || jsonb_build_object('deliverables', case when v_team then (
         select coalesce(jsonb_agg(authz.deliverable_card(d.id) order by d.created_at, d.id), '[]'::jsonb)
           from public.deliverables d
          where d.production_id = p_production
       ) else '[]'::jsonb end)
    || jsonb_build_object(
         'tasks', case when v_team then authz.production_tasks_json(p_production) else '[]'::jsonb end,
         'autoDelivered', authz.production_auto_delivered(p_production)
       );
end;
$$;

-- ───────────── Αφαίρεση Μέλους (τελευταίος ορισμός) ─────────────

-- Οι ανοιχτές Εργασίες και τα μη εγκεκριμένα, μη ακυρωμένα Παραδοτέα του πάνε στον Υπεύθυνο της Παραγωγής.
create or replace function public.production_member_remove(p_production uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid := (select p.owner_id from public.productions p where p.id = p_production);
begin
  perform authz.production_writable(p_production);
  if p_user_id is not null and v_owner = p_user_id then
    raise exception 'Ο Υπεύθυνος δεν αφαιρείται· μεταβίβασε πρώτα την Παραγωγή' using errcode = 'P0001';
  end if;
  delete from public.production_members m where m.production_id = p_production and m.user_id = p_user_id;
  if not found then
    raise exception 'Ο Χρήστης δεν είναι μέλος της Παραγωγής' using errcode = 'P0001';
  end if;
  update public.deliverables d set assignee_id = v_owner
   where d.production_id = p_production and d.assignee_id = p_user_id
     and d.cancelled_at is null and d.approved_at is null;
  update public.production_tasks t set assignee_id = v_owner
   where t.production_id = p_production and t.assignee_id = p_user_id and t.done_at is null;
  perform authz.production_event(p_production, 'member_removed', jsonb_build_object('user_id', p_user_id));
end;
$$;

-- ───────────── Ίχνος ─────────────

create or replace function authz.audit_entity_allowed(p_entity text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case p_entity
    -- Κατάλογος: ποσά και κόστος
    when 'catalogue_item_costs' then authz.has('finance.cost')
    when 'cost_months' then authz.has('finance.cost')
    when 'cost_settings' then authz.has('finance.cost')
    when 'production_costs' then authz.has('finance.cost')
    when 'catalogue_item_amounts' then authz.has('finance.amounts')
    -- Πρόσβαση και Ρυθμίσεις
    when 'roles' then true
    when 'role_permissions' then true
    when 'team_users' then true
    when 'team_user_roles' then true
    when 'company_settings' then true
    when 'bank_accounts' then true
    when 'readiness_confirmations' then true
    when 'system_state' then true
    -- Πωλήσεις: λίστες και ρυθμίσεις
    when 'sales_stages' then true
    when 'sales_sources' then true
    when 'sales_loss_reasons' then true
    when 'sales_activity_kinds' then true
    when 'sales_settings' then true
    -- Πωλήσεις: Πελάτες και Ευκαιρίες (το Εύρος κρίνεται ανά εγγραφή στο authz.audit_row_allowed)
    when 'clients' then true
    when 'client_duplicate_flags' then true
    when 'opportunities' then true
    when 'access_requests' then true
    -- Κατάλογος
    when 'provision_kinds' then true
    when 'catalogue_items' then true
    when 'catalogue_item_provisions' then true
    -- Συμφωνίες: ποσά και κόστος
    when 'agreement_line_costs' then authz.has('finance.cost')
    when 'agreement_costs' then authz.has('finance.cost') and authz.has('finance.amounts')
    when 'agreement_amounts' then authz.has('finance.amounts')
    when 'agreement_line_amounts' then authz.has('finance.amounts')
    when 'agreement_defaults' then authz.has('finance.amounts')
    -- Συμφωνίες: χωρίς ποσά (Σύνδεσμοι, κωδικοί, εξερχόμενα, έγγραφα και αναθεωρήσεις δεν γράφονται ποτέ στο Ίχνος)
    when 'agreements' then true
    when 'agreement_revision_limits' then true
    when 'agreement_milestones' then true
    when 'agreement_lines' then true
    when 'agreement_line_provisions' then true
    when 'agreement_recipients' then true
    when 'agreement_signatures' then true
    -- Εξοπλισμός: χωρίς ποσά
    when 'equipment_categories' then true
    when 'equipment_items' then true
    when 'equipment_templates' then true
    when 'equipment_template_items' then true
    -- Περίοδοι και Παραγωγές: χωρίς ποσά
    when 'agreement_periods' then true
    when 'agreement_period_provisions' then true
    when 'productions' then true
    when 'production_members' then true
    -- Γυρίσματα: χωρίς ποσά
    when 'filmings' then true
    when 'filming_crew' then true
    when 'filming_equipment' then true
    when 'crew_templates' then true
    when 'crew_template_members' then true
    when 'filming_settings' then true
    -- Ωράριο κρατήσεων: μόνο για όσους ορίζουν το Ωράριο
    when 'booking_week' then authz.has('settings.manage')
    when 'booking_exceptions' then authz.has('settings.manage')
    -- Προσκλήσεις, Χρήστες πελάτη και ουρά email (#107): χωρίς ποσά· το email μόνο για τον Ιδιοκτήτη
    when 'access' then true
    when 'invitations' then true
    when 'client_users' then true
    when 'email_outbox' then authz.is_owner()
    when 'email_log' then authz.is_owner()
    -- Κλεισμένος χρόνος: με τίτλο μόνο για όσους κλείνουν χρόνο άλλων
    when 'blocked_times' then authz.has('calendar.block_others')
    when 'filming_sheets' then true
    when 'filming_sheet_versions' then true
    when 'google_calendar' then authz.has('calendar.google')
    when 'google_deletions' then authz.has('calendar.google')
    -- Παραδοτέα (#140): χωρίς ποσά
    when 'deliverables' then true
    when 'deliverable_versions' then true
    when 'deliverable_comments' then true
    -- Κανόνες Παραδοτέων (#141): χωρίς ποσά
    when 'deliverable_settings' then true
    -- Αιτήματα μετά την έγκριση (#142): χωρίς ποσά
    when 'deliverable_requests' then true
    -- Εργασίες Παραγωγής (#143): χωρίς ποσά
    when 'production_tasks' then true
    else false
  end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.production_delivery_items(uuid), authz.email_production_delivered(uuid), authz.production_mark_delivered(uuid, text, boolean),
  authz.production_is_complete(uuid), authz.production_try_auto_deliver(uuid),
  authz.email_client_deliverable_reminder(uuid, integer, integer), authz.task_gate(uuid), authz.task_title(text),
  authz.production_tasks_json(uuid), authz.production_auto_delivered(uuid)
  from public, anon, authenticated;

revoke all on function
  public.production_task_add(uuid, text, uuid, date), public.production_task_update(uuid, text, uuid, date),
  public.production_task_toggle(uuid, boolean), public.production_task_delete(uuid),
  public.deliverable_reminders_enqueue()
  from public, anon;

grant execute on function
  public.production_task_add(uuid, text, uuid, date), public.production_task_update(uuid, text, uuid, date),
  public.production_task_toggle(uuid, boolean), public.production_task_delete(uuid)
  to authenticated;

grant execute on function public.deliverable_reminders_enqueue() to service_role;
