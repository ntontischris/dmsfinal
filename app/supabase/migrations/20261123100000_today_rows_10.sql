-- Σήμερα: έως δέκα γραμμές ανά κάρτα (ήταν τρεις). Το όριο το δίνει authz.today_rows(), ώστε ένα τεστ να το αλλάξει
-- τοπικά με set_config('today.rows', …)· ο τοπ-3 «οφειλέτες» του today_money μένει 3 (πάνελ, όχι λίστα).

create or replace function authz.today_rows() returns int
language plpgsql stable security definer set search_path = '' as
$$
begin
  return coalesce(nullif(current_setting('today.rows', true), '')::int, 10);
end;
$$;

revoke all on function authz.today_rows() from public, anon, authenticated;

create or replace function authz.today_work_rows_json(p_rows jsonb) returns jsonb
language plpgsql stable set search_path = ''
as $$
begin
  return (
    select coalesce(jsonb_agg(r - 'rn' order by (r ->> 'rn')::integer), '[]'::jsonb)
      from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
     where (r ->> 'rn')::integer <= authz.today_rows());
end;
$$;

create or replace function authz.today_items_health(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'health.view') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', r.at,
                                        'urgent', true, 'link', r.link) order by r.n, r.at desc nulls last, r.id)
      from (select * from authz.today_health_rows(p_uid, p_now) h order by h.n, h.at desc nulls last, h.id limit authz.today_rows()) r),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_readiness(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_readiness_open(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.item, 'urgent', false, 'link', '/app/settings/readiness') order by r.n)
      from (select x.item, coalesce(array_position(authz.today_readiness_order(), x.item), 1000) as n
              from authz.readiness_items() x
             where not x.done order by 2, 1 limit authz.today_rows()) r),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_proposal_approvals(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_amounts boolean;
  v_due date := (p_now at time zone 'Europe/Athens')::date + 1;
begin
  if not authz.today_proposal_approvals_open(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  v_amounts := authz.user_scope(p_uid, 'finance.amounts') is not null;
  return coalesce((
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
             'id', x.id::text, 'title', x.title, 'subtitle', x.client_name || ' · με Παρέκκλιση', 'at', x.requested_at,
             'waiting_since', x.requested_at,
             'urgent', x.urgent, 'link', '/app/agreements/approvals',
             'amount_cents', case when v_amounts then (select round(f.price * 100)::bigint from authz.agreement_figures(x.id) f) end))
           order by x.urgent desc, x.requested_at, x.id)
      from (select r.*, r.valid_until <= v_due as urgent
              from authz.today_proposal_approvals_rows() r
             order by r.valid_until <= v_due desc, r.requested_at, r.id limit authz.today_rows()) x),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_filming_approvals(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_filming_approvals_open(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', x.kind || ':' || x.id::text, 'title', x.title,
             'subtitle', null, 'at', x.starts_at, 'urgent', x.starts_at <= p_now + interval '24 hours',
             'waiting_since', case x.kind when 'booking' then f.created_at
                                          when 'cancel' then f.cancel_request_at
                                          else f.reschedule_requested_at end,
             'slot_free', case when x.kind = 'booking' then authz.slot_problem(f.starts_at, f.hours, f.id, false) is null end,
             'link', '/app/filming/queue')
             || jsonb_strip_nulls(jsonb_build_object('suggest', authz.today_move_suggestion(x.id, x.kind, p_now)))
           order by x.starts_at, x.kind, x.id)
      from (select * from authz.today_filming_approvals_rows() r order by r.starts_at, r.kind, r.id limit authz.today_rows()) x
      join public.filmings f on f.id = x.id),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_google_deletions(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_google_deletions_open(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', x.filming_id::text, 'title', coalesce(authz.google_filming_title(x.filming_id), 'Γύρισμα'),
             'subtitle', 'Επιβεβαίωση ως την προθεσμία', 'at', x.deadline_at,
             'urgent', x.deadline_at < p_now + interval '12 hours', 'link', '/app/calendar/google-deletions')
           order by x.deadline_at, x.filming_id)
      from (select d.filming_id, d.deadline_at
              from public.google_deletions d join public.filmings f on f.id = d.filming_id
             where d.resolved_at is null
             order by d.deadline_at, d.filming_id limit authz.today_rows()) x),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_unassigned(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_unassigned_open(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', x.id, 'title', coalesce(x.title, '—'), 'subtitle', x.subtitle, 'at', x.at, 'waiting_since', x.at,
             'urgent', false, 'link', x.link)
           order by x.at, x.id)
      from (select * from authz.today_unassigned_rows_for(p_uid) r order by r.at, r.id limit authz.today_rows()) x),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_unread_messages(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'messages.chat') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', u.client_id::text, 'title', u.client_name,
                                        'subtitle', u.unread || case when u.unread = 1 then ' νέο' else ' νέα' end,
                                        'at', u.last_at, 'urgent', false, 'link', '/app/messages/' || u.client_id)
                     order by u.last_at desc, u.client_id)
      from (select * from authz.today_unread_rows(p_uid) x order by x.last_at desc, x.client_id limit authz.today_rows()) u),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_rounds_over_limit(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_charges_allowed(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', null,
                                        'urgent', r.urgent, 'link', '/app/deliverables/' || r.id)
                     order by r.urgent desc, r.deadline nulls last, r.created_at, r.id)
      from (select * from authz.today_pending_charges(p_now) x
             order by x.urgent desc, x.deadline nulls last, x.created_at, x.id limit authz.today_rows()) r),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_to_invoice(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_finance_all(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', g.client_id, 'title', g.client_name,
             'subtitle', case when g.n = 1 then '1 Τιμολογητέο' else g.n || ' Τιμολογητέα' end
                         || ' · το παλαιότερο ' || authz.today_days_text(g.oldest),
             'at', null, 'urgent', g.oldest >= 14, 'amount_cents', round(g.open_total * 100)::bigint,
             'link', '/app/finance/to-invoice')
           order by g.oldest desc, g.client_name, g.client_id)
      from (select o.client_id, o.client_name, count(*)::integer as n, max(o.days_open) as oldest,
                   sum(o.open_amount) as open_total
              from authz.billables_open((p_now at time zone 'Europe/Athens')::date) o
             group by o.client_id, o.client_name
             order by max(o.days_open) desc, o.client_name, o.client_id
             limit authz.today_rows()) g),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_overdue_invoices(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_finance_all(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', o.id, 'title', o.client_name || ', ' || o.number,
             'subtitle', 'έληξε πριν από ' || authz.today_days_text(o.days),
             'at', null, 'urgent', true, 'amount_cents', round(o.remaining * 100)::bigint,
             'link', '/app/finance/invoices/' || o.id)
           order by o.due_date, o.number, o.id)
      from (select * from authz.today_overdue(p_now) x order by x.due_date, x.number, x.id limit authz.today_rows()) o),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_cost_hours(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'finance.cost') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id,
             'title', case when r.grp = 'overrun' then 'Υπέρβαση: ' else 'Θέλει πραγματικές ώρες: ' end || r.title,
             'subtitle', r.client, 'at', null, 'urgent', r.grp = 'overrun',
             'link', '/app/productions/' || r.id || '/costs')
           order by r.grp = 'overrun' desc, r.created_at desc, r.id)
      from (select * from authz.today_cost_rows() x
             order by x.grp = 'overrun' desc, x.created_at desc, x.id limit authz.today_rows()) r),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_week_filming(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_client is not null or authz.user_scope(p_uid, 'filming.view') is null then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', w.id, 'title', w.title,
             'subtitle', case when w.state = 'pending' then 'αναμένει έγκριση' end,
             'at', w.starts_at, 'urgent', false, 'link', '/app/filming/' || w.id)
           order by w.starts_at, w.id)
      from (select * from authz.today_week_filmings(p_uid, p_now) x order by x.starts_at, x.id limit authz.today_rows()) w),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_client_waiting(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_can(p_uid, p_client, array['c.approve']) then
    perform authz.today_client_deny();
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', r.at,
                                        'urgent', false, 'link', r.link) order by r.at nulls last, r.id)
      from (select * from authz.today_client_waiting_rows(p_client) w order by w.at nulls last, w.id limit authz.today_rows()) r),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_client_requests(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_can(p_uid, p_client, array['c.chatRead']) then
    perform authz.today_client_deny();
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', r.at,
                                        'urgent', false, 'link', '/app/messages?tab=requests') order by r.at, r.id)
      from (select * from authz.today_client_requests_rows(p_client) q order by q.at, q.id limit authz.today_rows()) r),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_client_filming(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_can(p_uid, p_client, array['c.book']) then
    perform authz.today_client_deny();
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', r.at,
                                        'urgent', false, 'link', '/app/filming/' || r.id) order by r.at, r.id)
      from (select * from authz.today_client_filming_rows(p_client, p_now) f order by f.at, f.id limit authz.today_rows()) r),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_client_allowance(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_can(p_uid, p_client, array['c.productions', 'c.approve']) then
    perform authz.today_client_deny();
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', null,
                                        'urgent', false, 'link', '/app/deliverables')
                     order by r.starts, r.agreement, r.ord)
      from (select * from authz.today_client_allowance_rows(p_client, p_now) x
             order by x.starts, x.agreement, x.ord limit authz.today_rows()) r),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_gdpr(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_today date := (p_now at time zone 'Europe/Athens')::date;
begin
  if p_client is not null or not coalesce(authz.user_is_owner(p_uid), false) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id::text,
             'title', authz.gdpr_kind_text(r.kind) || ': '
                      || coalesce(authz.gdpr_label(r.subject_kind, coalesce(r.subject_user_id, r.subject_client_id)), '—'),
             'subtitle', authz.gdpr_days_text(r.deadline - v_today),
             'at', (r.deadline::timestamp at time zone 'Europe/Athens'),
             'waiting_since', (r.received_on::timestamp at time zone 'Europe/Athens'),
             'urgent', r.deadline - v_today <= 1,
             'link', '/app/team/gdpr') order by r.deadline, r.received_on, r.id)
      from (select * from public.gdpr_requests x where x.completed_on is null
             order by x.deadline, x.received_on, x.id limit authz.today_rows()) r),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_client_sign(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_client_sign_can(p_uid, p_client) then
    perform authz.today_client_deny();
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'subtitle', r.subtitle, 'at', r.at,
                                        'urgent', r.urgent, 'link', '/app/agreements/' || r.id)
                     order by r.urgent desc, r.at nulls last, r.id)
      from (select * from authz.today_client_sign_rows(p_uid, p_client, p_now) s
             order by s.urgent desc, s.at nulls last, s.id limit authz.today_rows()) r),
    '[]'::jsonb);
end;
$$;

create or replace function authz.today_items_unanswered(p_uid uuid, p_client uuid, p_now timestamptz) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.today_unanswered_allowed(p_uid, p_client) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', u.id, 'title', left(u.question, 120),
             'subtitle', 'ρωτήθηκε ' || u.count || case when u.count = 1 then ' φορά' else ' φορές' end,
             'at', u.last_asked_at, 'urgent', false, 'link', '/app/knowledge/unanswered')
           order by u.count desc, u.last_asked_at desc, u.id)
      from (select * from public.assistant_unanswered x where x.status = 'open'
             order by x.count desc, x.last_asked_at desc, x.id limit authz.today_rows()) u),
    '[]'::jsonb);
end;
$$;
