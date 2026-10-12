-- Ειδοποιήσεις Kδ (#173), μέρος 1: τα RPC της οθόνης K1 Αυτοματισμοί (δέσμη Α2, Α3, Α11).
--
--  • Όλα θέλουν automations.manage (αλλιώς 42501, πρώτος έλεγχος). Επιχειρησιακά λάθη → P0001 με ελληνικό μήνυμα.
--  • automations_catalog: ομάδες και Γεγονότα με πλήθος ενεργών/συνόλου Αυτοματισμών. automation_event: ένα Γεγονός με
--    όλους τους Αυτοματισμούς του, τους Χρήστες ομάδας (για «ονομαστικά») και τα Δικαιώματα (για «όσοι έχουν Δικαίωμα»).
--  • automation_save: νέος ή επεξεργασία (μερική: λείπον κλειδί = ως έχει). Πέρα από το authz.automations_guard (σχετικός
--    παραλήπτης από τη λίστα, Επισκέπτης, χρονισμός ανά είδος), ελέγχει εδώ: Δικαίωμα που υπάρχει, ενεργοί Χρήστες ομάδας,
--    θέμα στο email, μόνο γνωστές μεταβλητές {…}. Οι νέοι έλεγχοι μένουν στο RPC (όχι στο guard), ώστε οι υπάρχουσες
--    εγγραφές και οι άμεσες εισαγωγές των τεστ να μην αλλάζουν συμπεριφορά. Χωρίς αλλαγή τιμής δεν γράφεται τίποτα (ούτε Ίχνος).
--  • Γεγονός με is_wired = false δέχεται Αυτοματισμούς· το UI γράφει «συνδέεται αργότερα».
--  • automation_delete: μόνο όσοι πρόσθεσε η Διαχείριση και δεν έχουν στείλει ποτέ (το Ιστορικό K3 κρατά τα σημάδια).
--    Οι αρχικοί και όσοι έστειλαν μόνο σβήνουν (automation_set_enabled).
--  • Στο θέμα ποτέ {link}. Αυτοματισμός «όσοι έχουν Δικαίωμα» πελάτη ανήκει στις Προτιμήσεις του πελάτη.
--  • Αργίες: μία RPC ανά αλλαγή (επίσημη on/off, προσθήκη, σβήσιμο), ώστε δύο admins να μη χάνουν αλλαγές.
--  • Το Ίχνος γράφεται από τα υπάρχοντα triggers του πίνακα automations.

-- ───────────── JSON ─────────────

create function authz.event_type_json(t public.event_types) returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'code', t.code, 'number', t.number, 'group', t.grp, 'kind', t.kind, 'label', t.label_el, 'labelEn', t.label_en,
    'caseOf', t.case_of, 'variables', to_jsonb(t.variables), 'relatives', to_jsonb(t.relatives),
    'hasVisitor', t.has_visitor, 'isCostOnly', t.is_cost_only, 'isClientFacing', t.is_client_facing, 'isWired', t.is_wired);
$$;

create function authz.automation_json(a public.automations) returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id, 'eventType', a.event_type, 'channel', a.channel,
    'recipientKind', a.recipient_kind, 'recipientRelative', a.recipient_relative,
    'recipientPermission', a.recipient_permission, 'recipientUserIds', to_jsonb(a.recipient_user_ids),
    'timing', a.timing, 'offsetDays', a.offset_days,
    -- Η στήλη time γυρίζει «HH:MM:SS»· η οθόνη θέλει «HH:MM».
    'sendTime', to_char(a.send_time, 'HH24:MI'), 'waitMinutes', a.wait_minutes,
    'subjectEl', a.subject_el, 'subjectEn', a.subject_en, 'bodyEl', a.body_el, 'bodyEn', a.body_en,
    'isEssential', a.is_essential, 'isEnabled', a.is_enabled, 'isInitial', a.is_initial, 'updatedAt', a.updated_at);
$$;

-- ───────────── Ανάγνωση ─────────────

-- { groups: [{ code, label }], events: [{ …Γεγονός, activeCount, totalCount }] }
create function public.automations_catalog() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform authz.require('automations.manage');
  return jsonb_build_object(
    'groups', (select jsonb_agg(jsonb_build_object('code', g.code, 'label', g.label) order by g.n)
                 from (values (1, 'Α', 'Πωλήσεις και Συμφωνίες'), (2, 'Β', 'Περίοδοι και Γυρίσματα'), (3, 'Γ', 'Παραδοτέα'),
                              (4, 'Δ', 'Οικονομικά και κόστος'), (5, 'Ε', 'Επικοινωνία και πελάτες'),
                              (6, 'ΣΤ', 'Υγεία συστήματος')) g (n, code, label)),
    'events', coalesce((
      select jsonb_agg(authz.event_type_json(t) || jsonb_build_object(
               'activeCount', (select count(*) from public.automations a where a.event_type = t.code and a.is_enabled),
               'totalCount', (select count(*) from public.automations a where a.event_type = t.code))
             order by t.sort)
        from public.event_types t), '[]'::jsonb));
end;
$$;

-- { event, automations: [...], teamUsers: [{ id, name, isActive }], permissions: [{ code, label, kind }] }
create function public.automation_event(p_type text) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  t public.event_types;
begin
  perform authz.require('automations.manage');
  select x.* into t from public.event_types x where x.code = p_type;
  if not found then
    raise exception 'Δεν υπάρχει αυτό το Γεγονός' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'event', authz.event_type_json(t),
    'automations', coalesce((
      select jsonb_agg(authz.automation_json(a) order by a.sort, a.created_at, a.id)
        from public.automations a where a.event_type = t.code), '[]'::jsonb),
    'teamUsers', coalesce((
      select jsonb_agg(jsonb_build_object('id', u.user_id, 'name', u.name, 'isActive', u.is_active) order by u.name, u.user_id)
        from public.team_users u), '[]'::jsonb),
    'permissions', coalesce((
      select jsonb_agg(jsonb_build_object('code', p.code, 'label', p.label, 'kind', p.kind) order by p.kind desc, p.sort)
        from public.permissions p), '[]'::jsonb));
end;
$$;

-- ───────────── Έλεγχοι ─────────────

-- Η πρώτη άγνωστη μεταβλητή {…} ενός κειμένου (ίδιο μοτίβο με το authz.ev_render), αλλιώς null.
create function authz.unknown_variable(p_text text, p_allowed text[]) returns text
language sql immutable set search_path = ''
as $$
  select m[1] from regexp_matches(coalesce(p_text, ''), '\{([A-Za-z]+)\}', 'g') m
   where not (m[1] = any (p_allowed))
   limit 1;
$$;

-- Οι έλεγχοι του K1 πέρα από το guard. p_old = null για νέο Αυτοματισμό.
create function authz.automation_check(n public.automations, p_old public.automations) returns void
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_allowed text[] := (select t.variables from public.event_types t where t.code = n.event_type);
  v_bad text;
begin
  if n.channel is null or n.channel not in ('notification', 'email') then
    raise exception 'Διάλεξε κανάλι: Ειδοποίηση ή email' using errcode = 'P0001';
  end if;
  if n.recipient_kind is null or n.recipient_kind not in ('relative', 'permission', 'users', 'visitor') then
    raise exception 'Διάλεξε τρόπο παραληπτών' using errcode = 'P0001';
  end if;
  if n.recipient_kind = 'relative' and n.recipient_relative is null then
    raise exception 'Διάλεξε παραλήπτη σε σχέση με το Γεγονός' using errcode = 'P0001';
  end if;
  if n.recipient_kind = 'permission'
     and not exists (select 1 from public.permissions p where p.code = n.recipient_permission) then
    raise exception 'Διάλεξε ένα Δικαίωμα που υπάρχει' using errcode = 'P0001';
  end if;
  if n.recipient_kind = 'users' and (p_old is null or n.recipient_user_ids is distinct from p_old.recipient_user_ids
                                     or p_old.recipient_kind <> 'users') then
    if cardinality(n.recipient_user_ids) not between 1 and 50 then
      raise exception 'Διάλεξε από 1 έως 50 Χρήστες' using errcode = 'P0001';
    end if;
    if exists (select 1 from unnest(n.recipient_user_ids) x
                where not exists (select 1 from public.team_users u where u.user_id = x and u.is_active)) then
      raise exception 'Οι παραλήπτες πρέπει να είναι ενεργοί Χρήστες ομάδας' using errcode = 'P0001';
    end if;
  end if;
  if n.timing is null or n.timing not in ('immediate', 'offset', 'wait') then
    raise exception 'Διάλεξε χρονισμό' using errcode = 'P0001';
  end if;
  if n.timing = 'offset' and (n.offset_days is null or n.send_time is null) then
    raise exception 'Ο χρονισμός θέλει μέρες και ώρα αποστολής' using errcode = 'P0001';
  end if;
  if n.offset_days is not null and n.offset_days not between -365 and 365 then
    raise exception 'Οι μέρες είναι από −365 έως 365' using errcode = 'P0001';
  end if;
  if n.timing = 'wait' and (n.wait_minutes is null or n.wait_minutes not between 1 and 525600) then
    raise exception 'Η αναμονή είναι από 1 λεπτό έως 365 μέρες' using errcode = 'P0001';
  end if;
  if n.channel = 'email' and n.subject_el is null then
    raise exception 'Το email θέλει θέμα στα ελληνικά' using errcode = 'P0001';
  end if;
  if length(coalesce(n.subject_el, '')) > 300 or length(coalesce(n.subject_en, '')) > 300 then
    raise exception 'Το θέμα έχει έως 300 χαρακτήρες' using errcode = 'P0001';
  end if;
  if length(coalesce(n.body_el, '')) not between 1 and 2000 then
    raise exception 'Γράψε κείμενο στα ελληνικά, έως 2.000 χαρακτήρες' using errcode = 'P0001';
  end if;
  if length(n.body_en) > 2000 then
    raise exception 'Το αγγλικό κείμενο έχει έως 2.000 χαρακτήρες' using errcode = 'P0001';
  end if;
  v_bad := authz.unknown_variable(concat_ws(' ', n.subject_el, n.subject_en, n.body_el, n.body_en), v_allowed);
  if v_bad is not null then
    raise exception 'Άγνωστη μεταβλητή {%}: διάλεξε από τη λίστα του Γεγονότος', v_bad using errcode = 'P0001';
  end if;
  -- Το θέμα φαίνεται σε λίστες και προεπισκοπήσεις: κανένας σύνδεσμος μέσα του.
  v_bad := authz.unknown_variable(concat_ws(' ', n.subject_el, n.subject_en), array_remove(v_allowed, 'link'));
  if v_bad is not null then
    raise exception 'Το {%} δεν μπαίνει στο θέμα: βάλ'' το στο κείμενο', v_bad using errcode = 'P0001';
  end if;
end;
$$;

-- Τα πεδία της φόρμας πάνω στον Αυτοματισμό (μερικά: λείπον κλειδί = ως έχει). Κενό κείμενο = καμία τιμή.
create function authz.automation_apply(n public.automations, v jsonb) returns public.automations
language plpgsql stable set search_path = ''
as $$
begin
  begin
    if v ? 'channel' then n.channel := v ->> 'channel'; end if;
    if v ? 'recipientKind' then n.recipient_kind := v ->> 'recipientKind'; end if;
    if v ? 'recipientRelative' then n.recipient_relative := nullif(trim(coalesce(v ->> 'recipientRelative', '')), ''); end if;
    if v ? 'recipientPermission' then n.recipient_permission := nullif(trim(coalesce(v ->> 'recipientPermission', '')), ''); end if;
    if v ? 'recipientUserIds' then
      n.recipient_user_ids := (select coalesce(array_agg(distinct x::uuid), '{}') from jsonb_array_elements_text(v -> 'recipientUserIds') x);
    end if;
    if v ? 'timing' then n.timing := v ->> 'timing'; end if;
    if v ? 'offsetDays' then n.offset_days := nullif(v ->> 'offsetDays', '')::integer; end if;
    if v ? 'sendTime' then n.send_time := nullif(v ->> 'sendTime', '')::time; end if;
    if v ? 'waitMinutes' then n.wait_minutes := nullif(v ->> 'waitMinutes', '')::integer; end if;
    if v ? 'subjectEl' then n.subject_el := nullif(trim(coalesce(v ->> 'subjectEl', '')), ''); end if;
    if v ? 'subjectEn' then n.subject_en := nullif(trim(coalesce(v ->> 'subjectEn', '')), ''); end if;
    if v ? 'bodyEl' then n.body_el := trim(coalesce(v ->> 'bodyEl', '')); end if;
    if v ? 'bodyEn' then n.body_en := trim(coalesce(v ->> 'bodyEn', '')); end if;
    if v ? 'isEssential' then n.is_essential := coalesce((v ->> 'isEssential')::boolean, false); end if;
    if v ? 'isEnabled' then n.is_enabled := coalesce((v ->> 'isEnabled')::boolean, true); end if;
  exception when others then
    raise exception 'Τα στοιχεία του Αυτοματισμού δεν είναι έγκυρα. Έλεγξε τα πεδία.' using errcode = 'P0001';
  end;
  -- Μόνο τα πεδία του τρόπου και του χρονισμού που διαλέχτηκαν· το θέμα μόνο στο email.
  if n.recipient_kind is distinct from 'relative' then n.recipient_relative := null; end if;
  if n.recipient_kind is distinct from 'permission' then n.recipient_permission := null; end if;
  if n.recipient_kind is distinct from 'users' then n.recipient_user_ids := '{}'; end if;
  if n.timing is distinct from 'offset' then n.offset_days := null; n.send_time := null; end if;
  if n.timing is distinct from 'wait' then n.wait_minutes := null; end if;
  if n.channel is distinct from 'email' then n.subject_el := null; n.subject_en := null; end if;
  return n;
end;
$$;

-- Ένας νέος Αυτοματισμός Διαχείρισης για ένα Γεγονός, με προεπιλογές (μπαίνει τελευταίος).
create function authz.automation_new(p_type text) returns public.automations
language plpgsql stable security definer set search_path = ''
as $$
declare
  n public.automations;
begin
  if not exists (select 1 from public.event_types t where t.code = p_type) then
    raise exception 'Δεν υπάρχει αυτό το Γεγονός' using errcode = 'P0001';
  end if;
  n.id := gen_random_uuid();
  n.event_type := p_type;
  n.channel := 'notification';
  -- Ο χρονισμός ακολουθεί το είδος του Γεγονότος.
  n.timing := (select case t.kind when 'instant' then 'immediate' when 'dated' then 'offset' else 'wait' end
                 from public.event_types t where t.code = p_type);
  n.recipient_user_ids := '{}';
  n.body_en := '';
  n.is_essential := false;
  n.is_enabled := true;
  n.is_initial := false;
  n.sort := coalesce((select max(a.sort) from public.automations a where a.event_type = p_type), 0) + 1;
  n.created_at := now();
  n.updated_at := now();
  return n;
end;
$$;

-- ───────────── Αλλαγές ─────────────

-- Νέος ή επεξεργασία: { id?, eventType (νέος), channel, recipientKind, recipientRelative, recipientPermission, recipientUserIds,
-- timing, offsetDays, sendTime "HH:MM", waitMinutes, subjectEl, subjectEn, bodyEl, bodyEn, isEssential, isEnabled }.
-- Επιστρέφει { id, changed }.
create function public.automation_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v jsonb := coalesce(p, '{}'::jsonb);
  v_id uuid;
  a public.automations;
  n public.automations;
begin
  perform authz.require('automations.manage');
  if jsonb_typeof(v) <> 'object' then
    raise exception 'Ο Αυτοματισμός θέλει αντικείμενο' using errcode = 'P0001';
  end if;
  if coalesce(v ->> 'id', '') <> '' then
    if v ->> 'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Ο Αυτοματισμός δεν βρέθηκε' using errcode = 'P0001';
    end if;
    v_id := (v ->> 'id')::uuid;
    select x.* into a from public.automations x where x.id = v_id for update;
    if not found then
      raise exception 'Ο Αυτοματισμός δεν βρέθηκε' using errcode = 'P0001';
    end if;
    if v ? 'eventType' and v ->> 'eventType' is distinct from a.event_type then
      raise exception 'Ένας Αυτοματισμός δεν αλλάζει Γεγονός' using errcode = 'P0001';
    end if;
    n := authz.automation_apply(a, v);
  else
    n := authz.automation_apply(authz.automation_new(v ->> 'eventType'), v);
  end if;
  perform authz.automation_check(n, case when v_id is null then null else a end);
  if v_id is null then
    n.updated_by := auth.uid();
    insert into public.automations select (n).*;
    return jsonb_build_object('id', n.id, 'changed', true);
  end if;
  if (n.channel, n.recipient_kind, n.recipient_relative, n.recipient_permission, n.recipient_user_ids, n.timing, n.offset_days,
      n.send_time, n.wait_minutes, n.subject_el, n.subject_en, n.body_el, n.body_en, n.is_essential, n.is_enabled)
     is not distinct from
     (a.channel, a.recipient_kind, a.recipient_relative, a.recipient_permission, a.recipient_user_ids, a.timing, a.offset_days,
      a.send_time, a.wait_minutes, a.subject_el, a.subject_en, a.body_el, a.body_en, a.is_essential, a.is_enabled) then
    return jsonb_build_object('id', a.id, 'changed', false);
  end if;
  update public.automations x
     set channel = n.channel, recipient_kind = n.recipient_kind, recipient_relative = n.recipient_relative,
         recipient_permission = n.recipient_permission, recipient_user_ids = n.recipient_user_ids, timing = n.timing,
         offset_days = n.offset_days, send_time = n.send_time, wait_minutes = n.wait_minutes,
         subject_el = n.subject_el, subject_en = n.subject_en, body_el = n.body_el, body_en = n.body_en,
         is_essential = n.is_essential, is_enabled = n.is_enabled, updated_by = auth.uid()
   where x.id = a.id;
  return jsonb_build_object('id', a.id, 'changed', true);
end;
$$;

-- Ανάβει ή σβήνει. Χωρίς αλλαγή δεν γράφεται τίποτα.
create function public.automation_set_enabled(p_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.automations;
begin
  perform authz.require('automations.manage');
  if p_on is null then
    raise exception 'Διάλεξε ενεργός ή σβηστός' using errcode = 'P0001';
  end if;
  select x.* into a from public.automations x where x.id = p_id for update;
  if not found then
    raise exception 'Ο Αυτοματισμός δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if a.is_enabled is distinct from p_on then
    update public.automations x set is_enabled = p_on, updated_by = auth.uid() where x.id = p_id;
  end if;
end;
$$;

-- Σβήνει οριστικά έναν Αυτοματισμό της Διαχείρισης. Οι αρχικοί μόνο σβήνουν.
create function public.automation_delete(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  a public.automations;
begin
  perform authz.require('automations.manage');
  select x.* into a from public.automations x where x.id = p_id for update;
  if not found then
    raise exception 'Ο Αυτοματισμός δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if a.is_initial then
    raise exception 'Οι αρχικοί Αυτοματισμοί δεν διαγράφονται, μόνο σβήνουν' using errcode = 'P0001';
  end if;
  -- Το Ιστορικό αποστολών (K3) κρατά τα σημάδια του: όποιος έστειλε έστω μία φορά μόνο σβήνει.
  if exists (select 1 from public.automation_sends s where s.automation_id = p_id) then
    raise exception 'Ο Αυτοματισμός έχει αποστολές: απενεργοποίησέ τον' using errcode = 'P0001';
  end if;
  delete from public.automations x where x.id = p_id;
end;
$$;

-- ───────────── Προτιμήσεις: η πλευρά του Αυτοματισμού ─────────────
-- Ξαναγραμμένο από τον ορισμό του 20261015140100_automation_timing.sql: ο Αυτοματισμός «όσοι έχουν Δικαίωμα» με
-- Δικαίωμα πελάτη πάει σε Χρήστες πελάτη, άρα φαίνεται στις Προτιμήσεις του πελάτη και όχι της ομάδας.

create function authz.automation_to_client(a public.automations) returns boolean
language sql stable security definer set search_path = ''
as $$
  select (a.recipient_kind = 'relative' and a.recipient_relative in ('client', 'request_client', 'filming_requester', 'self'))
      or (a.recipient_kind = 'permission'
          and exists (select 1 from public.permissions p where p.code = a.recipient_permission and p.kind = 'client'));
$$;

create or replace function authz.automation_for_viewer(a public.automations) returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when authz.is_team_user() then a.recipient_kind not in ('visitor') and not authz.automation_to_client(a)
    else authz.automation_to_client(a)
  end;
$$;

-- ───────────── Αργίες: μία αλλαγή κάθε φορά ─────────────
-- Κάθε ενέργεια της κάρτας αγγίζει μόνο τη δική της γραμμή, ώστε δύο admins να μη σβήνουν ο ένας την αλλαγή του άλλου.

-- Ανάβει ή σβήνει μία επίσημη αργία (με το όνομά της).
create function public.holiday_greeting_set_official(p_name text, p_on boolean) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
begin
  perform authz.require('automations.manage');
  if p_on is null then
    raise exception 'Διάλεξε ενεργή ή σβηστή' using errcode = 'P0001';
  end if;
  if not exists (select 1 from authz.greek_holidays(2026) h where h.name = v_name) then
    raise exception 'Η «%» δεν είναι επίσημη αργία', v_name using errcode = 'P0001';
  end if;
  if p_on then
    delete from public.holiday_greetings g where g.kind = 'removed' and g.name = v_name;
  elsif not exists (select 1 from public.holiday_greetings g where g.kind = 'removed' and g.name = v_name) then
    insert into public.holiday_greetings (kind, name, created_by) values ('removed', v_name, auth.uid());
  end if;
end;
$$;

-- Μία προσθήκη: { name, onDate } ή { name, month, day }. Έως 50. Επιστρέφει το id.
create function public.holiday_greeting_add(p jsonb) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_id uuid;
begin
  perform authz.require('automations.manage');
  select * into r from authz.holiday_added_row(coalesce(p, '{}'::jsonb));
  if (select count(*) from public.holiday_greetings g where g.kind = 'added') >= 50 then
    raise exception 'Έως 50 προσθήκες αργιών' using errcode = 'P0001';
  end if;
  insert into public.holiday_greetings (kind, name, on_date, month, day, created_by)
  values ('added', r.name, r.on_date, r.month, r.day, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Σβήνει μία δική σου προσθήκη.
create function public.holiday_greeting_remove(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform authz.require('automations.manage');
  delete from public.holiday_greetings g where g.id = p_id and g.kind = 'added';
  if not found then
    raise exception 'Η αργία δεν βρέθηκε' using errcode = 'P0001';
  end if;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.event_type_json(public.event_types), authz.automation_json(public.automations),
  authz.unknown_variable(text, text[]), authz.automation_check(public.automations, public.automations),
  authz.automation_apply(public.automations, jsonb), authz.automation_new(text),
  authz.automation_to_client(public.automations)
  from public, anon, authenticated;

revoke all on function
  public.automations_catalog(), public.automation_event(text), public.automation_save(jsonb),
  public.automation_set_enabled(uuid, boolean), public.automation_delete(uuid),
  public.holiday_greeting_set_official(text, boolean), public.holiday_greeting_add(jsonb), public.holiday_greeting_remove(uuid)
  from public, anon;
grant execute on function
  public.automations_catalog(), public.automation_event(text), public.automation_save(jsonb),
  public.automation_set_enabled(uuid, boolean), public.automation_delete(uuid),
  public.holiday_greeting_set_official(text, boolean), public.holiday_greeting_add(jsonb), public.holiday_greeting_remove(uuid)
  to authenticated;
