-- Παραγωγές (L2): Εργασίες με κατάσταση και προτεραιότητα, «Οι εργασίες μου», Εργασίες στη Σήμερα και στο Ημερολόγιο,
-- ειδοποίηση στον υπεύθυνο, Στάδια Παραγωγής (πίνακας), φόρτος ανά άτομο, τιμή και Τιμολογητέα της Παραγωγής.
--
-- Αρχές:
--  • Κατάσταση Εργασίας: «να γίνει» → «σε εξέλιξη» → «έγινε». Δεν αποθηκεύεται ως κείμενο: βγαίνει από το started_at και το
--    done_at (το done_at μένει η μόνη αλήθεια του «έγινε», όπως στο production_task_toggle).
--  • Προτεραιότητα: τρία σταθερά επίπεδα (χαμηλή, κανονική, υψηλή), όπως οι σταθερές καταστάσεις. Προεπιλογή «κανονική».
--  • Την κατάσταση της Εργασίας την αλλάζει όποιος γράφει την Παραγωγή ΚΑΙ ο ίδιος ο υπεύθυνός της (ακόμη κι αν δεν έχει
--    Δικαίωμα Παραγωγών): είναι η δουλειά του. Τα υπόλοιπα (τίτλος, προθεσμία, προτεραιότητα) μόνο όποιος γράφει την Παραγωγή.
--  • Ειδοποίηση: η ανάθεση Εργασίας γράφει το υπάρχον Γεγονός 26 «Ανατέθηκε εργασία ή Παραδοτέο» (deliverable.assigned),
--    με οντότητα production_tasks. Ο παραλήπτης (assignee) βγαίνει από το payload· δεν αλλάζει κανένας κανόνας παραληπτών.
--  • Στάδια: λίστα που επεξεργάζεται ο διαχειριστής (settings.manage) — όνομα, σειρά, ενεργό. Αρχικά: Brief, Γύρισμα,
--    Μοντάζ, Έλεγχος, Παράδοση. Η Παραγωγή έχει (προαιρετικά) ένα Στάδιο· το αλλάζει όποιος γράφει την Παραγωγή.
--  • Φόρτος: μόνο για Εύρος «όλα» στις Παραγωγές (βλέπει όλη την ομάδα).
--  • Τιμή και Τιμολογητέα: μόνο με «Βλέπει ποσά» (finance.amounts), σε δική τους ανάγνωση (δεν αλλάζει το production_view).

-- ───────────── Εργασίες: νέα πεδία ─────────────

alter table public.production_tasks
  add column started_at timestamptz,
  add column priority text not null default 'normal' check (priority in ('low', 'normal', 'high'));

-- Η κατάσταση μιας Εργασίας από τα πεδία της.
create function authz.task_status(p_started timestamptz, p_done timestamptz) returns text
language sql immutable set search_path = ''
as $$ select case when p_done is not null then 'done' when p_started is not null then 'doing' else 'todo' end; $$;

-- Αντικαθιστά το 20261012160000: και κατάσταση, προτεραιότητα.
create or replace function authz.production_tasks_json(p_production uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', t.id, 'title', t.title, 'assigneeId', t.assignee_id,
             'assigneeName', (select u.name from public.team_users u where u.user_id = t.assignee_id),
             'dueDate', t.due_date,
             'isLate', (t.done_at is null and t.due_date is not null and t.due_date < public.sales_today()),
             'done', (t.done_at is not null),
             'status', authz.task_status(t.started_at, t.done_at),
             'priority', t.priority
           ) order by t.sort, t.created_at, t.id), '[]'::jsonb)
      from public.production_tasks t
     where t.production_id = p_production
  );
end;
$$;

-- ───────────── Εργασίες: RPC γραφής ─────────────

-- Κατάσταση: todo | doing | done. Όποιος γράφει την Παραγωγή, ή ο υπεύθυνος της Εργασίας. Μόνο σε ανοιχτή Παραγωγή.
create function public.production_task_set_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t public.production_tasks;
begin
  select * into t from public.production_tasks x where x.id = p_id;
  if t.id is not null and t.assignee_id = auth.uid() and authz.is_team_user() then
    perform authz.require_production_open(t.production_id);
  else
    perform authz.task_gate(p_id);
  end if;
  if p_status is null or p_status not in ('todo', 'doing', 'done') then
    raise exception 'Άγνωστη κατάσταση Εργασίας' using errcode = 'P0001';
  end if;
  update public.production_tasks x
     set started_at = case when p_status = 'todo' then null else coalesce(x.started_at, now()) end,
         done_at = case when p_status = 'done' then coalesce(x.done_at, now()) end,
         done_by = case when p_status = 'done' then coalesce(x.done_by, auth.uid()) end
   where x.id = p_id;
end;
$$;

-- Προτεραιότητα: low | normal | high. Μόνο όποιος γράφει την Παραγωγή.
create function public.production_task_set_priority(p_id uuid, p_priority text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.task_gate(p_id);
  if p_priority is null or p_priority not in ('low', 'normal', 'high') then
    raise exception 'Άγνωστη προτεραιότητα' using errcode = 'P0001';
  end if;
  update public.production_tasks x set priority = p_priority where x.id = p_id;
end;
$$;

-- ───────────── «Οι εργασίες μου» ─────────────

-- Οι Εργασίες του συνδεδεμένου Χρήστη ομάδας σε ανοιχτές Παραγωγές: όσες δεν έγιναν, και όσες έγιναν τις τελευταίες
-- 7 μέρες (για να αναιρείται το «έγινε»). Πρώτα σε εξέλιξη, μετά υψηλή προτεραιότητα, μετά η πιο κοντινή προθεσμία.
create function public.my_tasks_view(p_today date default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, public.sales_today());
begin
  if not authz.is_team_user() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', t.id, 'title', t.title, 'dueDate', t.due_date,
             'status', authz.task_status(t.started_at, t.done_at), 'priority', t.priority,
             'isLate', (t.done_at is null and t.due_date is not null and t.due_date < v_today),
             'production', jsonb_build_object('id', p.id, 'title', p.title, 'canOpen', authz.can_see_production(p.id)),
             'clientName', c.name
           ) order by (t.done_at is not null), (t.started_at is null),
                      case t.priority when 'high' then 0 when 'normal' then 1 else 2 end,
                      t.due_date nulls last, t.created_at, t.id), '[]'::jsonb)
      from public.production_tasks t
      join public.productions p on p.id = t.production_id
      left join public.clients c on c.id = p.client_id
     where t.assignee_id = auth.uid() and p.state = 'open'
       and (t.done_at is null or t.done_at >= (v_today - 7)::timestamp at time zone 'Europe/Athens')
  );
end;
$$;

-- ───────────── Ειδοποίηση ανάθεσης ─────────────

create function authz.production_tasks_emit() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.assignee_id is not null and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    perform authz.emit_event('deliverable.assigned', 'production_tasks', new.id,
      format('task.assigned:%s:%s', new.id, new.assignee_id), null,
      coalesce(authz.ev_ctx_production(new.production_id), '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
        'task_id', new.id, 'assignee_id', new.assignee_id, 'deliverable', new.title,
        'deadline', authz.ev_date(new.due_date), 'assignee', authz.ev_team_name(new.assignee_id),
        'link', '/app/tasks')));
  end if;
  return null;
end;
$$;

create trigger production_tasks_emit_event after insert or update of assignee_id on public.production_tasks
  for each row execute function authz.production_tasks_emit();

-- ───────────── Σήμερα: κάρτα «Οι εργασίες μου» ─────────────

create function authz.today_task_rows(p_uid uuid, p_now timestamptz)
returns table (id text, title text, subtitle text, at timestamptz, urgent boolean, link text, rn integer)
language sql stable security definer set search_path = ''
as $$
  with v as (select authz.today_work_day(p_now) as today)
  select t.id::text, t.title, coalesce(c.name, p.title),
         case when t.due_date is not null then authz.today_work_day_at(t.due_date) end,
         (t.due_date is not null and t.due_date <= v.today + 1) or t.priority = 'high',
         '/app/tasks',
         (row_number() over (order by t.due_date asc nulls last,
                                      case t.priority when 'high' then 0 when 'normal' then 1 else 2 end, t.id))::integer
    from public.production_tasks t
    join public.productions p on p.id = t.production_id
    left join public.clients c on c.id = p.client_id
    cross join v
   where t.assignee_id = p_uid and t.done_at is null and p.state = 'open';
$$;

create function authz.today_count_my_tasks(p_uid uuid, p_client uuid, p_now timestamptz) returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or not authz.user_is_team(p_uid) then
    return null;
  end if;
  return (select count(*)::integer from authz.today_task_rows(p_uid, p_now));
end;
$$;

create function authz.today_items_my_tasks(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or not authz.user_is_team(p_uid) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.today_work_rows_json((select jsonb_agg(to_jsonb(r)) from authz.today_task_rows(p_uid, p_now) r));
end;
$$;

insert into public.today_cards (code, grp, kind, audience, sort, label_el, label_en, link, count_fn, items_fn) values
  ('my_tasks', 'work', 'action', 'team', 205, 'Οι εργασίες μου', 'My tasks', '/app/tasks',
   'authz.today_count_my_tasks(uuid, uuid, timestamptz)', 'authz.today_items_my_tasks(uuid, uuid, timestamptz)');

-- ───────────── Ημερολόγιο: Εργασίες με προθεσμία ─────────────

-- Οι ανοιχτές Εργασίες με προθεσμία στις μέρες p_from..p_to: όσες είναι δικές μου, και όσες σε Παραγωγές που βλέπω.
create function authz.calendar_tasks(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', t.id, 'day', t.due_date, 'title', t.title, 'productionId', p.id,
             'clientName', coalesce(c.name, p.title),
             'assigneeId', t.assignee_id, 'assigneeName', u.name,
             'isMine', coalesce(t.assignee_id = auth.uid(), false)
           ) order by t.due_date, t.id), '[]'::jsonb)
      from public.production_tasks t
      join public.productions p on p.id = t.production_id
      left join public.clients c on c.id = p.client_id
      left join public.team_users u on u.user_id = t.assignee_id
     where t.due_date between p_from and p_to
       and t.done_at is null and p.state = 'open'
       and (t.assignee_id = auth.uid() or authz.can_see_production(p.id))
  );
end;
$$;

-- Αντικαθιστά το 20261104140000: και οι Εργασίες (tasks).
create or replace function authz.calendar_team_view(
  p_from date, p_to date, p_from_at timestamptz, p_to_at timestamptz
) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  return (
    select jsonb_build_object(
      'filmings', authz.calendar_team_filmings(p_from_at, p_to_at),
      'blocked', authz.calendar_team_blocked(p_from_at, p_to_at),
      'busy', authz.calendar_busy(p_from_at, p_to_at),
      'nextSteps', authz.calendar_next_steps(p_from, p_to),
      'deadlines', authz.calendar_deadlines(p_from, p_to),
      'tasks', authz.calendar_tasks(p_from, p_to),
      'days', authz.calendar_team_days(p_from, p_to),
      'canBlockOthers', authz.has('calendar.block_others'),
      'canBook', authz.has('filming.book'),
      'team', authz.calendar_team_members(),
      'people', authz.calendar_people(),
      'me', auth.uid()
    )
  );
end;
$$;

-- ───────────── Στάδια Παραγωγής ─────────────

create table public.production_stages (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(trim(label)) between 1 and 60),
  sort integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index production_stages_label_key on public.production_stages (lower(label)) where is_active;

alter table public.production_stages enable row level security;
revoke all on table public.production_stages from anon, authenticated;

insert into public.production_stages (label, sort) values
  ('Brief', 1), ('Γύρισμα', 2), ('Μοντάζ', 3), ('Έλεγχος', 4), ('Παράδοση', 5);

alter table public.productions add column stage_id uuid references public.production_stages (id);

-- Αντικαθιστά το 20261009180000: και το Στάδιο (μόνο για την ομάδα).
create or replace function authz.production_card(p_production uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  return (
    select jsonb_build_object(
      'id', p.id,
      'title', p.title,
      'client', case when c.id is null then null else jsonb_build_object('id', c.id, 'name', c.name) end,
      'period', case when pe.id is null then null
                     else jsonb_build_object('n', pe.n, 'starts', pe.starts, 'ends', pe.ends,
                                             'state', authz.period_state(pe.starts, pe.ends)) end,
      'owner', case when u.user_id is null then null
                    when authz.is_team_user() then jsonb_build_object('id', u.user_id, 'name', u.name)
                    else jsonb_build_object('name', u.name) end,
      'state', p.state,
      'isInternal', p.client_id is null,
      'stage', case when s.id is not null and authz.is_team_user()
                    then jsonb_build_object('id', s.id, 'label', s.label) end
    )
    from public.productions p
    left join public.clients c on c.id = p.client_id
    left join public.agreement_periods pe on pe.id = p.period_id
    left join public.team_users u on u.user_id = p.owner_id
    left join public.production_stages s on s.id = p.stage_id
    where p.id = p_production
  );
end;
$$;

-- Τα Στάδια (ενεργά πρώτα, στη σειρά τους). Τα βλέπει η ομάδα των Παραγωγών και ο διαχειριστής των Ρυθμίσεων.
create function public.production_stages_view() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (authz.has('productions.manage') or authz.has('settings.manage')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'stages', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'label', s.label, 'isActive', s.is_active)
                                         order by (not s.is_active), s.sort, s.created_at, s.id), '[]'::jsonb)
                 from public.production_stages s),
    'canEdit', authz.has('settings.manage')
  );
end;
$$;

-- Νέο Στάδιο (p_id null, μπαίνει τελευταίο) ή μετονομασία.
create function public.production_stage_save(p_id uuid, p_label text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_label text := trim(coalesce(p_label, ''));
  v_id uuid;
begin
  perform authz.require('settings.manage');
  if length(v_label) < 1 or length(v_label) > 60 then
    raise exception 'Το Στάδιο θέλει όνομα έως 60 χαρακτήρες' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.production_stages s
              where s.is_active and lower(s.label) = lower(v_label) and s.id is distinct from p_id) then
    raise exception 'Υπάρχει ήδη Στάδιο με αυτό το όνομα' using errcode = 'P0001';
  end if;
  if p_id is null then
    insert into public.production_stages (label, sort)
    values (v_label, (select coalesce(max(s.sort), 0) + 1 from public.production_stages s))
    returning id into v_id;
    return v_id;
  end if;
  update public.production_stages s set label = v_label where s.id = p_id returning s.id into v_id;
  if v_id is null then
    raise exception 'Το Στάδιο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  return v_id;
end;
$$;

-- Μετακίνηση ενός Σταδίου μία θέση πάνω (-1) ή κάτω (+1) ανάμεσα στα ενεργά.
create function public.production_stage_move(p_id uuid, p_step integer) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_ids uuid[];
  v_pos integer;
  v_other integer;
begin
  perform authz.require('settings.manage');
  select array_agg(s.id order by s.sort, s.created_at, s.id) into v_ids
    from public.production_stages s where s.is_active;
  v_pos := array_position(v_ids, p_id);
  if v_pos is null or p_step not in (-1, 1) then
    raise exception 'Το Στάδιο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  v_other := v_pos + p_step;
  if v_other < 1 or v_other > array_length(v_ids, 1) then
    return;
  end if;
  v_ids[v_pos] := v_ids[v_other];
  v_ids[v_other] := p_id;
  update public.production_stages s set sort = x.n
    from unnest(v_ids) with ordinality x (id, n) where s.id = x.id;
end;
$$;

-- Απόσυρση (ή επαναφορά) Σταδίου. Οι Παραγωγές του κρατούν το Στάδιο μέχρι να μετακινηθούν.
create function public.production_stage_set_active(p_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('settings.manage');
  if p_active is null or not exists (select 1 from public.production_stages s where s.id = p_id) then
    raise exception 'Το Στάδιο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if p_active and exists (select 1 from public.production_stages s, public.production_stages o
                           where s.id = p_id and o.is_active and o.id <> s.id and lower(o.label) = lower(s.label)) then
    raise exception 'Υπάρχει ήδη Στάδιο με αυτό το όνομα' using errcode = 'P0001';
  end if;
  update public.production_stages s
     set is_active = p_active,
         sort = case when p_active and not s.is_active
                     then (select coalesce(max(o.sort), 0) + 1 from public.production_stages o) else s.sort end
   where s.id = p_id;
end;
$$;

-- Το Στάδιο μιας ανοιχτής Παραγωγής (null = χωρίς Στάδιο). Όποιος γράφει την Παραγωγή.
create function public.production_set_stage(p_production uuid, p_stage uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.production_writable(p_production);
  if not exists (select 1 from public.productions p where p.id = p_production and p.state = 'open') then
    raise exception 'Το Στάδιο αλλάζει μόνο σε ανοιχτή Παραγωγή' using errcode = 'P0001';
  end if;
  if p_stage is not null and not exists (select 1 from public.production_stages s where s.id = p_stage and s.is_active) then
    raise exception 'Το Στάδιο δεν βρέθηκε' using errcode = 'P0001';
  end if;
  update public.productions p set stage_id = p_stage where p.id = p_production;
end;
$$;

-- ───────────── Φόρτος ανά άτομο ─────────────

-- Για κάθε ενεργό μέλος: Παραγωγές που έχει υπεύθυνος, Εργασίες ανοιχτές και εκπρόθεσμες, Παραδοτέα στο όνομά του,
-- Γυρίσματα των επόμενων 7 ημερών στο Συνεργείο. Μόνο Εύρος «όλα» στις Παραγωγές.
create function public.productions_workload(p_today date default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, public.sales_today());
  v_from timestamptz := v_today::timestamp at time zone 'Europe/Athens';
begin
  perform authz.require('productions.manage');
  if coalesce(authz.scope('productions.manage'), '') <> 'all' then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(x.row order by x.load desc, lower(x.name), x.user_id), '[]'::jsonb)
      from (
        select u.user_id, u.name, w.productions + w.tasks + w.deliverables + w.filmings as load,
               jsonb_build_object('userId', u.user_id, 'name', u.name, 'productions', w.productions,
                                  'tasks', w.tasks, 'lateTasks', w.late, 'deliverables', w.deliverables,
                                  'filmings', w.filmings) as row
          from public.team_users u
          cross join lateral (
            select
              (select count(*)::integer from public.productions p where p.owner_id = u.user_id and p.state = 'open') as productions,
              (select count(*)::integer from public.production_tasks t join public.productions p on p.id = t.production_id
                where t.assignee_id = u.user_id and t.done_at is null and p.state = 'open') as tasks,
              (select count(*)::integer from public.production_tasks t join public.productions p on p.id = t.production_id
                where t.assignee_id = u.user_id and t.done_at is null and p.state = 'open'
                  and t.due_date < v_today) as late,
              (select count(*)::integer from public.deliverables d join public.productions p on p.id = d.production_id
                where d.assignee_id = u.user_id and d.cancelled_at is null and d.approved_at is null
                  and p.state = 'open') as deliverables,
              (select count(*)::integer from public.filming_crew c join public.filmings f on f.id = c.filming_id
                where c.user_id = u.user_id and c.response <> 'declined' and f.state in ('pending', 'scheduled')
                  and f.starts_at >= v_from and f.starts_at < v_from + interval '7 days') as filmings
          ) w
         where u.is_active
      ) x
  );
end;
$$;

-- ───────────── Τιμή και Τιμολογητέα της Παραγωγής ─────────────

-- Η τιμή (Περιόδου για μηνιαία, όλης της Συμφωνίας για εφάπαξ) και τα Τιμολογητέα που προέρχονται από την Παραγωγή.
-- Εσωτερική Παραγωγή: χωρίς τιμή και Τιμολογητέα. Μόνο με «Βλέπει ποσά» και ορατή Παραγωγή.
create function public.production_money_view(p_production uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  p public.productions;
begin
  perform authz.require('finance.amounts');
  if not authz.can_see_production(p_production) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  select * into p from public.productions x where x.id = p_production;
  if p.agreement_id is null then
    return jsonb_build_object('price', null, 'priceOf', null, 'billables', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'price', authz.production_period_price(p.agreement_id, p.period_id),
    'priceOf', case when p.period_id is null then 'agreement' else 'period' end,
    'billables', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', b.id, 'label', b.label, 'reason', b.reason, 'net', b.net, 'billableOn', b.billable_on,
               'covered', coalesce(cov.covered, 0)
             ) order by b.billable_on, b.created_at, b.id), '[]'::jsonb)
        from public.billables b
        left join lateral authz.billable_covered(b.client_id) cov on cov.billable_id = b.id
       where b.agreement_id = p.agreement_id
         and case b.reason
               when 'period' then b.source_id = p.period_id
               when 'milestone' then p.period_id is null
               when 'extra_deliverable' then exists (select 1 from public.deliverables d
                                                       where d.id = b.source_id and d.production_id = p.id)
               when 'extra_revision' then exists (select 1 from public.deliverable_requests r
                                                    join public.deliverables d on d.id = r.deliverable_id
                                                   where r.id = b.source_id and d.production_id = p.id)
               when 'extra_filming' then exists (select 1 from public.filmings f
                                                   where f.id = b.source_id and f.production_id = p.id)
               else false
             end
    )
  );
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.task_status(timestamptz, timestamptz),
  authz.production_tasks_emit(),
  authz.today_task_rows(uuid, timestamptz),
  authz.today_count_my_tasks(uuid, uuid, timestamptz),
  authz.today_items_my_tasks(uuid, uuid, timestamptz),
  authz.calendar_tasks(date, date),
  public.production_task_set_status(uuid, text),
  public.production_task_set_priority(uuid, text),
  public.my_tasks_view(date),
  public.production_stages_view(),
  public.production_stage_save(uuid, text),
  public.production_stage_move(uuid, integer),
  public.production_stage_set_active(uuid, boolean),
  public.production_set_stage(uuid, uuid),
  public.productions_workload(date),
  public.production_money_view(uuid)
  from public, anon, authenticated;

grant execute on function
  public.production_task_set_status(uuid, text),
  public.production_task_set_priority(uuid, text),
  public.my_tasks_view(date),
  public.production_stages_view(),
  public.production_stage_save(uuid, text),
  public.production_stage_move(uuid, integer),
  public.production_stage_set_active(uuid, boolean),
  public.production_set_stage(uuid, uuid),
  public.productions_workload(date),
  public.production_money_view(uuid)
  to authenticated;
