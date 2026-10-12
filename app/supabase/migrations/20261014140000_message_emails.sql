-- Μηνύματα Jε (#164): email σύνοψης αδιάβαστων (Μ4), email κλεισίματος Αιτήματος (Γεγονός 48) και Ρυθμίσεις › Μηνύματα (Μ14).
--
--  • Τα email πάνε μόνο σε Χρήστες πελάτη (με c.chatRead)· ποτέ στην ομάδα. Το σώμα δεν έχει το κείμενο των Μηνυμάτων, μόνο πλήθος.
--  • Η σύνοψη (message_digest_enqueue) τρέχει από τον cron της ουράς. Ο πίνακας message_digest_marks κρατά «ως πού στάλθηκε σύνοψη»
--    ανά (Χρήστη, Πελάτη), ώστε μια δεύτερη κλήση να μη στείλει ξανά. Η ορατότητα δεν αποθηκεύεται: υπολογίζεται σε κάθε κλήση.
--  • Το κλείσιμο Αιτήματος γράφει το email από trigger, άρα καλύπτει και το αυτόματο κλείσιμο (Μ11) χωρίς αλλαγή στα υπάρχοντα RPC.
--  • Ρυθμίσεις: μία γραμμή (message_settings, υπάρχει από το Jα). Όσοι έχουν settings.manage τις αλλάζουν· διαβάζονται και από
--    όσους συνομιλούν (messages.chat).

-- ───────────── Email ─────────────

alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check
  check (kind in ('test', 'invite_resend', 'client_added', 'filming_decision', 'reschedule_decision',
                  'sheet_issued', 'crew_declined', 'deliverable_version_sent',
                  'production_delivered', 'deliverable_reminder', 'invoice_registered', 'invoice_overdue',
                  'message_digest', 'request_closed'));

-- ───────────── Σύνοψη αδιάβαστων (Μ4) ─────────────

-- «Ως πού στάλθηκε σύνοψη» ανά (Χρήστη πελάτη, Πελάτη). Κλειστός πίνακας.
create table public.message_digest_marks (
  user_id uuid not null references auth.users (id),
  client_id uuid not null references public.clients (id),
  upto timestamptz not null,
  primary key (user_id, client_id)
);

alter table public.message_digest_marks enable row level security;

-- Η πρώτη εκτέλεση μετά την εγκατάσταση δεν στέλνει σύνοψη για παλιά Μηνύματα: όριο «τώρα» για όσους υπάρχουν ήδη.
insert into public.message_digest_marks (user_id, client_id, upto)
select cu.user_id, cu.client_id, now() from public.client_users cu where cu.removed_at is null
on conflict do nothing;

-- Για κάθε Χρήστη πελάτη με c.chatRead: αν υπάρχουν «νέα» Μηνύματα της ομάδας (όχι εσωτερικά, όχι διαγραμμένα, μετά το διάβασμα
-- και την προηγούμενη σύνοψη) και το παλαιότερο είναι πιο παλιό από digest_minutes, ένα email και νέο όριο. Επιστρέφει πόσα email μπήκαν.
-- Το p_now (null = τώρα) υπάρχει για τα τεστ. payload: { clientName, count }
create function public.message_digest_enqueue(p_now timestamptz default null) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_minutes integer := (select s.digest_minutes from public.message_settings s where s.id);
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    select cu.user_id, cu.client_id, cu.name, lower(trim(u.email)) as email, coalesce(t.language, 'el') as locale,
           c.name as client_name, n.cnt, n.oldest, n.newest
      from public.client_users cu
      join public.role_permissions rp on rp.role_id = cu.role_id and rp.permission = 'c.chatRead'
      join auth.users u on u.id = cu.user_id
      join public.clients c on c.id = cu.client_id
      left join public.team_users t on t.user_id = cu.user_id
      cross join lateral (
        select count(*) as cnt, min(m.created_at) as oldest, max(m.created_at) as newest
          from public.messages m
         where m.client_id = cu.client_id and m.author_kind = 'team' and not m.is_internal and m.deleted_at is null
           and m.created_at > greatest(
                 coalesce((select r.read_at from public.message_reads r where r.user_id = cu.user_id and r.client_id = cu.client_id), '-infinity'),
                 coalesce((select k.upto from public.message_digest_marks k where k.user_id = cu.user_id and k.client_id = cu.client_id), '-infinity'))
      ) n
     where cu.removed_at is null and coalesce(u.email, '') <> '' and n.cnt > 0
       and n.oldest <= v_now - make_interval(mins => v_minutes)
     order by cu.client_id, cu.user_id
  loop
    insert into public.message_digest_marks (user_id, client_id, upto)
    values (v_row.user_id, v_row.client_id, v_row.newest)
    on conflict (user_id, client_id) do update set upto = excluded.upto
      where public.message_digest_marks.upto < excluded.upto;
    -- Μια ταυτόχρονη κλήση έγραψε ήδη το ίδιο όριο: εκείνη στέλνει το email.
    continue when not found;
    insert into public.email_outbox (kind, to_name, to_email, locale, payload)
    values ('message_digest', v_row.name, v_row.email, v_row.locale,
            jsonb_build_object('clientName', v_row.client_name, 'count', v_row.cnt));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ───────────── Κλείσιμο Αιτήματος (Γεγονός 48) ─────────────

-- Όταν ένα Αίτημα περνά από ανοιχτό σε ολοκληρώθηκε/απορρίφθηκε (και αυτόματα): ένα email στον πελάτη.
-- Αν το δήλωσε πελάτης που είναι ακόμα ενεργός με c.chatRead, μόνο σε αυτόν· αλλιώς (Αίτημα της ομάδας ή ο δηλώσας έφυγε)
-- σε όλους τους Χρήστες του Πελάτη με c.chatRead.
-- payload: { clientName, kind, outcome, reply?, comment?, link?, deliverableId? }
create function authz.request_closed_notify() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_client uuid;
  v_client_name text;
  v_payload jsonb;
begin
  select m.client_id, c.name into v_client, v_client_name
    from public.messages m join public.clients c on c.id = m.client_id
   where m.id = new.message_id;
  v_payload := jsonb_strip_nulls(jsonb_build_object(
    'clientName', v_client_name, 'kind', new.kind, 'outcome', new.state,
    'reply', new.close_reply, 'comment', new.close_comment,
    'link', case when new.close_link ~ '^https://[^[:space:]]+$' then new.close_link end,
    'deliverableId', case when new.result_kind = 'deliverable' then new.result_id end));
  insert into public.email_outbox (kind, to_name, to_email, locale, payload)
  select 'request_closed', cu.name, lower(trim(u.email)), coalesce(t.language, 'el'), v_payload
    from public.client_users cu
    join public.role_permissions rp on rp.role_id = cu.role_id and rp.permission = 'c.chatRead'
    join auth.users u on u.id = cu.user_id
    left join public.team_users t on t.user_id = cu.user_id
   where cu.client_id = v_client and cu.removed_at is null and coalesce(u.email, '') <> ''
     and (cu.user_id = new.declared_user or not exists (
            select 1 from public.client_users d
              join public.role_permissions dp on dp.role_id = d.role_id and dp.permission = 'c.chatRead'
             where new.declared_by = 'client' and d.user_id = new.declared_user and d.client_id = v_client
               and d.removed_at is null));
  return null;
end;
$$;

create trigger message_requests_closed_email after update of state on public.message_requests
  for each row when (old.state = 'open' and new.state in ('done', 'rejected'))
  execute function authz.request_closed_notify();

-- ───────────── Ρυθμίσεις › Μηνύματα (Μ14) ─────────────

create function authz.message_settings_json() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('digestMinutes', s.digest_minutes, 'editMinutes', s.edit_minutes,
                            'requestOpenDays', s.request_open_days)
    from public.message_settings s where s.id;
$$;

-- Ακέραιο μέσα σε όρια από το αντικείμενο· λείπον κλειδί = η τρέχουσα τιμή.
create function authz.message_setting_int(p jsonb, p_key text, p_label text, p_current integer, p_min integer, p_max integer)
returns integer
language plpgsql immutable set search_path = ''
as $$
declare
  v_value numeric;
begin
  if not (p ? p_key) then
    return p_current;
  end if;
  if jsonb_typeof(p -> p_key) <> 'number' then
    raise exception '% πρέπει να είναι ακέραιος αριθμός', p_label using errcode = 'P0001';
  end if;
  v_value := (p ->> p_key)::numeric;
  if v_value <> trunc(v_value) then
    raise exception '% πρέπει να είναι ακέραιος αριθμός', p_label using errcode = 'P0001';
  end if;
  if v_value < p_min or v_value > p_max then
    raise exception '% πρέπει να είναι από % έως %', p_label, p_min, p_max using errcode = 'P0001';
  end if;
  return v_value::integer;
end;
$$;

create function public.message_settings_get() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (authz.has('settings.manage') or authz.has('messages.chat')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return authz.message_settings_json();
end;
$$;

-- Μερική ενημέρωση: { digestMinutes?, editMinutes?, requestOpenDays? }. Ισχύουν από εκεί και πέρα.
create function public.message_settings_update(p jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  s public.message_settings;
  v jsonb := coalesce(p, '{}'::jsonb);
  v_digest integer;
  v_edit integer;
  v_days integer;
begin
  perform authz.require('settings.manage');
  if jsonb_typeof(v) <> 'object' then
    raise exception 'Οι Ρυθμίσεις Μηνυμάτων θέλουν αντικείμενο' using errcode = 'P0001';
  end if;
  select x.* into s from public.message_settings x where x.id;
  v_digest := authz.message_setting_int(v, 'digestMinutes', 'Τα λεπτά σύνοψης', s.digest_minutes, 1, 1440);
  v_edit := authz.message_setting_int(v, 'editMinutes', 'Τα λεπτά διόρθωσης', s.edit_minutes, 1, 1440);
  v_days := authz.message_setting_int(v, 'requestOpenDays', 'Οι μέρες ανοιχτού Αιτήματος', s.request_open_days, 1, 60);
  update public.message_settings x
     set digest_minutes = v_digest, edit_minutes = v_edit, request_open_days = v_days
   where x.id;
end;
$$;

create trigger message_settings_audit_update after update on public.message_settings
  for each row when (old.* is distinct from new.*) execute function authz.audit_row('id');

-- ───────────── Ίχνος: ολόκληρη η λίστα ─────────────
-- Ξαναγραμμένη από τον ορισμό του 20261014130000_message_requests.sql, με τον πίνακα message_settings.

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
    -- Οικονομικά (#150, #151, #152): οι Τρόποι δεν έχουν ποσά· Εισπράξεις, Τιμολογητέα και Τιμολόγια μόνο με «Βλέπει ποσά»
    when 'payment_methods' then true
    when 'receipts' then authz.has('finance.amounts')
    when 'billables' then authz.has('finance.amounts')
    when 'invoices' then authz.has('finance.amounts')
    -- Αιτήματα Μηνυμάτων (#163): το κλείσιμο έχει κείμενο προς τον πελάτη, άρα όπως τα Μηνύματα
    when 'message_requests' then authz.has('audit.view') and authz.scope('messages.chat') = 'all'
    -- Μηνύματα (#160): περιέχουν κείμενο Συνομιλίας, άρα μόνο όσοι βλέπουν όλες τις Συνομιλίες
    when 'messages' then authz.has('audit.view') and authz.scope('messages.chat') = 'all'
    -- Ρυθμίσεις Μηνυμάτων (#164): αριθμοί χωρίς κείμενο ή ποσά
    when 'message_settings' then authz.has('audit.view')
    else false
  end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.request_closed_notify(), authz.message_settings_json(),
  authz.message_setting_int(jsonb, text, text, integer, integer, integer)
  from public, anon, authenticated;

revoke all on function public.message_settings_get(), public.message_settings_update(jsonb) from public, anon;
grant execute on function public.message_settings_get(), public.message_settings_update(jsonb) to authenticated;

revoke all on function public.message_digest_enqueue(timestamptz) from public, anon, authenticated;
grant execute on function public.message_digest_enqueue(timestamptz) to service_role;

revoke all on table public.message_digest_marks from anon, authenticated;
