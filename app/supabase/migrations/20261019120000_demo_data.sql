-- Δεδομένα επίδειξης: γέμισμα της ζωντανής εφαρμογής με φανταστικούς Πελάτες και ό,τι κρέμεται από αυτούς, και καθαρό
-- σβήσιμο με μία ενέργεια (δέσμη Δ1–Δ6).
--
--  • Δ1 Κατάλογος (public.demo_rows): μία γραμμή για ΚΑΘΕ γραμμή που έγραψε η επίδειξη (πίνακας + κλειδί). Το σβήσιμο σβήνει
--    ακριβώς αυτές, ποτέ με μάντεμα ονομάτων. Το κλειδί είναι το primary key ως κείμενο· σύνθετο κλειδί = jsonb ως κείμενο.
--    RLS χωρίς policies, κλειστός για anon/authenticated.
--  • Δ2 public.demo_seed(p_today) και public.demo_purge(p_include_attached): security definer, μόνο postgres/service_role.
--    Το γέμισμα αρνείται αν ο κατάλογος έχει γραμμές· όλα σε μία συναλλαγή (μία κλήση).
--    Κατά το γέμισμα οι triggers χρήστη των πινάκων που γεμίζουν είναι κλειστοί (alter table … disable trigger user, μέσα
--    στη συναλλαγή): κανένα Γεγονός, καμία Ειδοποίηση, κανένα email, καμία ουρά Google, καμία γραμμή Ίχνους. Το κλείδωμα
--    (access exclusive) κρατά έξω κάθε ταυτόχρονη εγγραφή, άρα ό,τι νέο βρεθεί στο τέλος (διαφορά με τη φωτογραφία της
--    αρχής) είναι της επίδειξης και μπαίνει στον κατάλογο. Οι κανόνες που κρατούν οι triggers τηρούνται εδώ με το χέρι.
--  • Δ4 Κανένα email από δεδομένα επίδειξης, ποτέ: email πελατών μόνο @example.invalid· τρεις φύλακες που μένουν αδρανείς
--    όσο ο κατάλογος είναι άδειος:
--      – automation_sends: αποστολή email για περίπτωση που αφορά γραμμή επίδειξης δεν γράφεται (άρα ούτε το email της).
--        Οι Ειδοποιήσεις μέσα στην εφαρμογή περνούν κανονικά.
--      – email_outbox / agreement_outbox: γραμμή προς @example.invalid ή που αναφέρει γραμμή επίδειξης γεννιέται ακυρωμένη.
--      – google_outbox: Γύρισμα ή Κλεισμένος χρόνος της επίδειξης δεν μπαίνει ποτέ στην ουρά του Google.
--  • Δ5 Τιμολόγια επίδειξης με αριθμό DEMO-001…: η αρίθμηση είναι ελεύθερο κείμενο, χωρίς μετρητή στη βάση.
--  • Δ6 Άνθρωποι: μόνο οι υπάρχοντες Χρήστες ομάδας (ενεργοί), μοιρασμένοι ανά Δικαίωμα. Κανένας νέος λογαριασμός.
--  • Σβήσιμο: πρώτα «κλείνει» ο κατάλογος. Γραμμές που δεν είναι στον κατάλογο αλλά δείχνουν (foreign key, ή entity_id σε
--    Γεγονότα/Google) σε γραμμή επίδειξης:
--      – τήρηση βιβλίων του συστήματος (Γεγονότα, Ειδοποιήσεις, σημάδια αποστολών, διαβάσματα, Τιμολογητέα του cron,
--        ειδοποιήσεις ληξιπρόθεσμων κ.λπ.): σβήνονται μαζί·
--      – οτιδήποτε άλλο (π.χ. κάτι πραγματικό που μπήκε σε Πελάτη επίδειξης): το σβήσιμο σταματά με σαφές μήνυμα. Με
--        p_include_attached = true σβήνονται κι αυτά, εκτός αν κρέμονται από κοινόχρηστη γραμμή (Κατάλογος, Εξοπλισμός,
--        Γνώση, τρόποι πληρωμής κ.λπ.) ή είναι Πελάτης· αυτά σταματούν πάντα το σβήσιμο.
--    Μετά σβήνονται όλες οι γραμμές του καταλόγου (με κλειστούς triggers χρήστη, γιατί οι φύλακες απαγορεύουν σβήσιμο σε
--    Παραγωγές, Γυρίσματα, ιστορικό κ.λπ.), σε όσα περάσματα χρειαστούν για τη σειρά των foreign keys. Το Ίχνος (audit_log)
--    δεν αγγίζεται ποτέ.

-- ───────────── Κατάλογος ─────────────

create table public.demo_rows (
  table_name text not null check (table_name ~ '^[a-z_]{1,63}$'),
  row_id text not null check (length(row_id) between 1 and 1000),
  created_at timestamptz not null default now(),
  primary key (table_name, row_id)
);

create index demo_rows_row_id_idx on public.demo_rows (row_id);

alter table public.demo_rows enable row level security;
revoke all on table public.demo_rows from public, anon, authenticated;

-- ───────────── Βοηθητικά ─────────────

-- Το primary key μιας γραμμής ως κείμενο, για τον πίνακα p_table με ψευδώνυμο p_alias. Σύνθετο: jsonb ως κείμενο.
create function authz.demo_pk_expr(p_table text, p_alias text) returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when count(*) = 0 then null
    when count(*) = 1 then format('%s.%I::text', p_alias, min(a.attname::text))
    else 'jsonb_build_object(' || string_agg(format('%L, %s.%I', a.attname::text, p_alias, a.attname::text), ', '
                                             order by a.attname::text) || ')::text'
  end
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
   where i.indrelid = ('public.' || quote_ident(p_table))::regclass and i.indisprimary;
$$;

-- Αναφέρει το κείμενο (κλειδί περίπτωσης, payload) κάποια γραμμή επίδειξης; Ψάχνει μόνο uuid, με τον δείκτη του row_id.
create function authz.demo_mentions(p_text text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_text is not null and exists (
    select 1
      from regexp_matches(lower(p_text), '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'g') m
      join public.demo_rows d on d.row_id = m[1]
  );
$$;

create function authz.demo_has(p_table text, p_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select p_id is not null and exists (select 1 from public.demo_rows d where d.table_name = p_table and d.row_id = p_id::text); $$;

-- ───────────── Φύλακες: κανένα email, κανένα Google από δεδομένα επίδειξης ─────────────

-- Σημάδι αποστολής email (στιγμιαία και με χρονισμό, authz.ev_deliver): για περίπτωση επίδειξης δεν γράφεται, άρα η
-- ev_deliver δεν γράφει ούτε το email. Οι Ειδοποιήσεις περνούν.
create function authz.demo_guard_automation_send() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.channel <> 'email' or not exists (select 1 from public.demo_rows) then
    return new;
  end if;
  if authz.demo_has('clients', new.client_id)
     or authz.demo_mentions(new.case_key)
     or exists (select 1 from public.events e
                 where e.id = new.event_id
                   and (authz.demo_has('clients', e.client_id) or authz.demo_mentions(e.entity_id::text))) then
    return null;
  end if;
  return new;
end;
$$;

create trigger automation_sends_demo_guard before insert on public.automation_sends
  for each row execute function authz.demo_guard_automation_send();

-- Ουρά email: προς @example.invalid ή για γραμμή επίδειξης, η γραμμή γεννιέται ακυρωμένη (ο worker παίρνει μόνο 'pending').
create function authz.demo_guard_email_outbox() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'pending'
     and (lower(new.to_email) like '%@example.invalid' or authz.demo_mentions(new.payload::text)) then
    new.status := 'cancelled';
    new.handled_at := now();
    new.last_error := 'Δεδομένα επίδειξης: δεν στέλνεται';
  end if;
  return new;
end;
$$;

create trigger email_outbox_demo_guard before insert on public.email_outbox
  for each row execute function authz.demo_guard_email_outbox();

create function authz.demo_guard_agreement_outbox() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'pending'
     and (lower(new.to_email) like '%@example.invalid' or authz.demo_has('agreements', new.agreement_id)) then
    new.status := 'cancelled';
    new.handled_at := now();
    new.last_error := 'Δεδομένα επίδειξης: δεν στέλνεται';
  end if;
  return new;
end;
$$;

create trigger agreement_outbox_demo_guard before insert on public.agreement_outbox
  for each row execute function authz.demo_guard_agreement_outbox();

-- Ουρά Google: Γύρισμα ή Κλεισμένος χρόνος της επίδειξης δεν γράφεται ποτέ στο Google.
create function authz.demo_guard_google_outbox() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if authz.demo_has(case new.entity when 'filming' then 'filmings' else 'blocked_times' end, new.entity_id) then
    return null;
  end if;
  return new;
end;
$$;

create trigger google_outbox_demo_guard before insert on public.google_outbox
  for each row execute function authz.demo_guard_google_outbox();

-- ───────────── Σβήσιμο ─────────────

-- Τήρηση βιβλίων του συστήματος: γραμμές που γεννιούνται μόνες τους (cron, triggers, διάβασμα, ενέργειες πάνω σε γραμμές
-- επίδειξης) γύρω από τα δεδομένα. Όταν δείχνουν σε γραμμή επίδειξης σβήνονται μαζί της, χωρίς ερώτηση.
create function authz.demo_bookkeeping_tables() returns text[]
language sql immutable set search_path = ''
as $$
  select array[
    'events', 'notifications', 'automation_sends', 'message_reads', 'message_digest_marks', 'billables',
    'invoice_overdue_notices', 'deliverable_reminders', 'opportunity_activities', 'client_duplicate_flags',
    'filming_crew_vacancies', 'filming_sheet_versions', 'filming_sheets', 'google_deletions', 'google_links', 'google_outbox',
    'knowledge_chunks', 'knowledge_index_queue', 'agreement_outbox', 'agreement_links', 'agreement_otps',
    'agreement_documents', 'agreement_revisions', 'agreement_baselines', 'agreement_costs', 'production_costs'
  ];
$$;

-- Κοινόχρηστα: ό,τι μπορεί να χρησιμοποιήσει και η πραγματική δουλειά. Πραγματική γραμμή που δείχνει σε τέτοια γραμμή
-- επίδειξης σταματά πάντα το σβήσιμο. Το ίδιο και ένας πραγματικός Πελάτης (π.χ. συγχωνευμένος σε Πελάτη επίδειξης).
create function authz.demo_shared_tables() returns text[]
language sql immutable set search_path = ''
as $$
  select array[
    'catalogue_items', 'provision_kinds', 'equipment_categories', 'equipment_items', 'equipment_templates', 'crew_templates',
    'knowledge_sections', 'knowledge_items', 'payment_methods', 'sales_stages', 'sales_sources', 'sales_loss_reasons',
    'sales_activity_kinds', 'cost_months', 'subscriptions', 'roles', 'bank_accounts'
  ];
$$;

-- Οι γραμμές εκτός καταλόγου που δείχνουν σε γραμμή του καταλόγου: (πίνακας, κλειδί, πίνακας-στόχος). Ανά foreign key του
-- public, και οι αναφορές χωρίς foreign key (Γεγονότα με entity_id, ουρά και αντιστοίχιση Google).
create function authz.demo_referrers()
returns table (child text, row_id text, parent text)
language plpgsql security definer set search_path = ''
as $$
declare
  fk record;
  v_join text;
begin
  for fk in
    select cl.relname::text as child_name, pl.relname::text as parent_name, c.conkey, c.confkey, c.conrelid, c.confrelid
      from pg_constraint c
      join pg_class cl on cl.oid = c.conrelid
      join pg_namespace cn on cn.oid = cl.relnamespace
      join pg_class pl on pl.oid = c.confrelid
      join pg_namespace pn on pn.oid = pl.relnamespace
     where c.contype = 'f' and pn.nspname = 'public' and cn.nspname = 'public'
       and exists (select 1 from public.demo_rows d where d.table_name = pl.relname::text)
  loop
    select string_agg(format('ch.%I = pa.%I', ca.attname, pa.attname), ' and ')
      into v_join
      from unnest(fk.conkey, fk.confkey) as k (ck, pk)
      join pg_attribute ca on ca.attrelid = fk.conrelid and ca.attnum = k.ck
      join pg_attribute pa on pa.attrelid = fk.confrelid and pa.attnum = k.pk;
    return query execute format(
      'select distinct %L::text, %s, %L::text from public.%I ch join public.%I pa on %s'
      || ' where exists (select 1 from public.demo_rows d where d.table_name = %L and d.row_id = %s)'
      || ' and not exists (select 1 from public.demo_rows d where d.table_name = %L and d.row_id = %s)',
      fk.child_name, authz.demo_pk_expr(fk.child_name, 'ch'), fk.parent_name, fk.child_name, fk.parent_name, v_join,
      fk.parent_name, authz.demo_pk_expr(fk.parent_name, 'pa'), fk.child_name, authz.demo_pk_expr(fk.child_name, 'ch'));
  end loop;
  return query
    select 'events'::text, e.id::text, d.table_name
      from public.events e
      join public.demo_rows d on d.row_id = e.entity_id::text
     where not exists (select 1 from public.demo_rows x where x.table_name = 'events' and x.row_id = e.id::text);
  -- Ειδοποιήσεις και σημάδια αποστολής χωρίς Πελάτη (π.χ. Εσωτερική Παραγωγή): ο σύνδεσμος ή η περίπτωση δείχνει τη γραμμή.
  return query
    select 'notifications'::text, n.id::text, 'notifications'::text
      from public.notifications n
     where authz.demo_mentions(n.link)
       and not exists (select 1 from public.demo_rows x where x.table_name = 'notifications' and x.row_id = n.id::text);
  return query
    select 'automation_sends'::text, s.id::text, 'automation_sends'::text
      from public.automation_sends s
     where authz.demo_mentions(s.case_key)
       and not exists (select 1 from public.demo_rows x where x.table_name = 'automation_sends' and x.row_id = s.id::text);
  return query
    select 'google_outbox'::text, o.id::text, d.table_name
      from public.google_outbox o
      join public.demo_rows d on d.row_id = o.entity_id::text
                             and d.table_name = case o.entity when 'filming' then 'filmings' else 'blocked_times' end
     where not exists (select 1 from public.demo_rows x where x.table_name = 'google_outbox' and x.row_id = o.id::text);
  return query
    select 'google_links'::text, jsonb_build_object('entity', l.entity, 'entity_id', l.entity_id)::text, d.table_name
      from public.google_links l
      join public.demo_rows d on d.row_id = l.entity_id::text
                             and d.table_name = case l.entity when 'filming' then 'filmings' else 'blocked_times' end
     where not exists (select 1 from public.demo_rows x
                        where x.table_name = 'google_links'
                          and x.row_id = jsonb_build_object('entity', l.entity, 'entity_id', l.entity_id)::text);
end;
$$;

-- Σβήνει ακριβώς τις γραμμές του καταλόγου (μαζί με όσες μπήκαν σε αυτόν στο κλείσιμο) και τον αδειάζει.
-- Επιστρέφει { πίνακας: πόσες γραμμές σβήστηκαν }. Άδειος κατάλογος: {}.
create function public.demo_purge(p_include_attached boolean default false) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_bookkeeping text[] := authz.demo_bookkeeping_tables();
  v_shared text[] := authz.demo_shared_tables();
  v_added integer;
  v_conflicts text;
  v_tables text[];
  v_table text;
  v_count integer;
  v_left integer;
  v_progress boolean;
  v_result jsonb := '{}'::jsonb;
begin
  if not exists (select 1 from public.demo_rows) then
    return v_result;
  end if;
  set local lock_timeout = '20s';
  lock table public.demo_rows in exclusive mode;

  -- 1. Κλείσιμο του καταλόγου: η τήρηση βιβλίων (και, αν ζητήθηκε, ό,τι μπήκε σε Πελάτη επίδειξης) μπαίνει μέσα.
  loop
    select string_agg(format('%s → %s: %s', r.child, r.parent, r.n), '; ' order by r.child, r.parent)
      into v_conflicts
      from (
        select x.child, x.parent, count(distinct x.row_id) as n
          from authz.demo_referrers() x
         where not (x.child = any (v_bookkeeping))
           and (not p_include_attached or x.child = 'clients' or x.parent = any (v_shared))
         group by x.child, x.parent
      ) r;
    if v_conflicts is not null then
      raise exception 'Τα δεδομένα επίδειξης δεν σβήνονται: πραγματικές εγγραφές δείχνουν σε αυτά (%). %', v_conflicts,
        case when p_include_attached then 'Αφαίρεσέ τες πρώτα.'
             else 'Αφαίρεσέ τες πρώτα ή ξανατρέξε το σβήσιμο μαζί με όσα μπήκαν σε δεδομένα επίδειξης.' end
        using errcode = 'P0001';
    end if;
    insert into public.demo_rows (table_name, row_id)
    select distinct x.child, x.row_id from authz.demo_referrers() x
    on conflict do nothing;
    get diagnostics v_added = row_count;
    exit when v_added = 0;
  end loop;

  -- 2. Σβήσιμο με κλειστούς triggers χρήστη (φύλακες, Ίχνος, ουρές), σε περάσματα μέχρι να βγει η σειρά των foreign keys.
  select array_agg(distinct d.table_name order by d.table_name) into v_tables from public.demo_rows d;
  foreach v_table in array v_tables loop
    execute format('alter table public.%I disable trigger user', v_table);
  end loop;
  loop
    v_progress := false;
    v_left := 0;
    foreach v_table in array v_tables loop
      continue when not exists (select 1 from public.demo_rows d where d.table_name = v_table);
      begin
        execute format('delete from public.%I x where exists (select 1 from public.demo_rows d'
                       || ' where d.table_name = %L and d.row_id = %s)',
                       v_table, v_table, authz.demo_pk_expr(v_table, 'x'));
        get diagnostics v_count = row_count;
        delete from public.demo_rows d where d.table_name = v_table;
        v_result := v_result || jsonb_build_object(v_table, v_count);
        v_progress := true;
      exception when foreign_key_violation then
        v_left := v_left + 1;
      end;
    end loop;
    exit when v_left = 0;
    if not v_progress then
      raise exception 'Τα δεδομένα επίδειξης δεν σβήνονται: αναφορές σε κύκλο που δεν λύνονται' using errcode = 'P0001';
    end if;
  end loop;
  foreach v_table in array v_tables loop
    execute format('alter table public.%I enable trigger user', v_table);
  end loop;
  return v_result;
end;
$$;

-- ───────────── Γέμισμα: βοηθητικά ─────────────
-- Όλα καλούνται μόνο μέσα από το public.demo_seed, με κλειστούς triggers χρήστη· τηρούν με το χέρι ό,τι τηρούν οι φύλακες.

-- Μέρα και ώρα Ελλάδας ως χρονοσημείο.
create function authz.demo_at(p_day date, p_time time) returns timestamptz
language sql stable set search_path = ''
as $$ select (p_day + p_time) at time zone 'Europe/Athens'; $$;

-- Ο p_i-οστός (κυκλικά) ενεργός Χρήστης ομάδας με το Δικαίωμα, αλλιώς ο Ιδιοκτήτης, αλλιώς ο πρώτος ενεργός.
create function authz.demo_pick(p_perm text, p_i integer) returns uuid
language sql stable security definer set search_path = ''
as $$
  with c as (
    select u.user_id, row_number() over (order by u.created_at, u.user_id) - 1 as rn, count(*) over () as n
      from public.team_users u
     where u.is_active and authz.user_scope(u.user_id, p_perm) is not null
  )
  select coalesce(
    (select c.user_id from c where c.rn = abs(p_i) % c.n),
    (select u.user_id from public.team_users u
      where u.is_active and authz.user_is_owner(u.user_id) order by u.created_at, u.user_id limit 1),
    (select u.user_id from public.team_users u where u.is_active order by u.created_at, u.user_id limit 1));
$$;

-- Στοιχείο Καταλόγου επίδειξης με τιμή, κόστος και Παροχές ({kind_id: ποσότητα}).
create function authz.demo_catalogue_item(
  p_kind text, p_billing text, p_name text, p_unit text, p_price numeric,
  p_hours_shoot numeric, p_hours_edit numeric, p_direct numeric, p_provisions jsonb
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.catalogue_items (kind, billing, name, description, unit)
  values (p_kind, p_billing, p_name, 'Δεδομένα επίδειξης.', p_unit)
  returning id into v_id;
  insert into public.catalogue_item_amounts (item_id, price) values (v_id, p_price);
  insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost)
  values (v_id, p_hours_shoot, p_hours_edit, p_direct);
  insert into public.catalogue_item_provisions (item_id, kind_id, quantity)
  select v_id, k.key::uuid, k.value::integer from jsonb_each_text(p_provisions) k where k.key is not null;
  return v_id;
end;
$$;

-- Συμφωνία με όλα όσα γράφουν η δημιουργία, η αποστολή και η υπογραφή: ποσά, βάση Παρεκκλίσεων, όρια αναθεωρήσεων,
-- παραλήπτης, αναθεώρηση, γραμμές από τον Κατάλογο, δόσεις (εφάπαξ). Υπογεγραμμένη: έγγραφο, αντίγραφο κόστους, υπογραφή
-- εκτός συστήματος, Περίοδοι με Παροχές, Παραγωγές με την εκτίμησή τους. Παραγωγή Περιόδου που τελείωσε πριν από τον τρέχοντα
-- μήνα, ή η εφάπαξ με p_delivered_at, είναι παραδομένη.
create function authz.demo_agreement(
  p_opp uuid, p_kind text, p_title text, p_items uuid[], p_qtys integer[], p_path text, p_start date, p_months integer,
  p_signed_at timestamptz, p_valid_until date, p_discount numeric, p_discount_months integer, p_delivered_at timestamptz,
  p_actor uuid, p_today date
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  ad public.agreement_defaults;
  o public.opportunities;
  c public.clients;
  v_monthly boolean := p_kind = 'monthly';
  v_signed boolean := p_path = 'signed';
  v_vat numeric;
  v_id uuid;
  v_line uuid;
  v_doc jsonb;
  v_created timestamptz := coalesce(p_signed_at, now()) - interval '12 days';
  v_owner uuid;
  v_prod uuid;
  v_state text;
  v_month date := date_trunc('month', p_today)::date;
  r record;
  i integer;
begin
  select * into ad from public.agreement_defaults x where x.id;
  select * into o from public.opportunities x where x.id = p_opp;
  select * into c from public.clients x where x.id = o.client_id;
  select coalesce((select s.vat_rate from public.company_settings s where s.id), 24) into v_vat;
  v_state := case when not v_signed then 'proposal' when p_start <= p_today then 'active' else 'signed' end;

  insert into public.agreements (
    opportunity_id, kind, title, state, path, revision, valid_until, start_on, duration_months, end_on, payment_days,
    unused_provisions, grace_days, renewal, dissolution_notice_days, filming_notice_hours, filming_cancel_hours,
    late_cancel_burns, no_show_burns, signed_at, created_at, created_by, updated_at, updated_by)
  values (
    p_opp, p_kind, p_title, v_state, p_path, 1, p_valid_until, p_start,
    case when v_monthly then p_months end,
    case when v_monthly and p_start is not null then (p_start + make_interval(months => p_months))::date - 1 end,
    case when v_monthly then ad.payment_days_monthly else ad.payment_days_one_off end,
    case when v_monthly then ad.unused_provisions else 'lost' end,
    case when v_monthly then ad.grace_days else 0 end,
    case when v_monthly then ad.renewal end,
    case when v_monthly then ad.dissolution_notice_days else 0 end,
    ad.filming_notice_hours, ad.filming_cancel_hours, ad.late_cancel_burns, ad.no_show_burns,
    p_signed_at, v_created, p_actor, coalesce(p_signed_at, v_created), p_actor)
  returning id into v_id;

  insert into public.agreement_amounts (agreement_id, discount_percent, discount_months, dissolution_fee, vat_rate)
  values (v_id, p_discount, p_discount_months, case when v_monthly then ad.dissolution_fee else 0 end, v_vat);

  insert into public.agreement_baselines (agreement_id, data)
  values (v_id, jsonb_build_object(
    'payment_days', case when v_monthly then ad.payment_days_monthly else ad.payment_days_one_off end,
    'unused_provisions', case when v_monthly then ad.unused_provisions else 'lost' end,
    'grace_days', case when v_monthly then ad.grace_days else 0 end,
    'dissolution_notice_days', case when v_monthly then ad.dissolution_notice_days else 0 end,
    'dissolution_fee', case when v_monthly then ad.dissolution_fee else 0 end,
    'filming_notice_hours', ad.filming_notice_hours, 'filming_cancel_hours', ad.filming_cancel_hours,
    'late_cancel_burns', ad.late_cancel_burns, 'no_show_burns', ad.no_show_burns,
    'standard_discount_percent', ad.standard_discount_percent, 'standard_discount_months', ad.standard_discount_months,
    'advance_percent', ad.advance_percent,
    'revision_limits', coalesce((select jsonb_object_agg(k.id, k.revision_limit) from public.provision_kinds k
                                  where k.retired_at is null and k.revision_limit is not null), '{}'::jsonb)));

  insert into public.agreement_revision_limits (agreement_id, kind_id, rounds)
  select v_id, k.id, k.revision_limit from public.provision_kinds k where k.retired_at is null and k.revision_limit is not null;

  if not v_monthly then
    insert into public.agreement_milestones (agreement_id, position, trigger, percent)
    select v_id, x.pos, x.trg, x.pct
      from (values (1, 'signature', ad.advance_percent), (2, 'delivered', 100 - ad.advance_percent)) as x (pos, trg, pct)
     where x.pct > 0;
  end if;

  insert into public.agreement_recipients (agreement_id, position, name, email, is_signatory, created_at)
  values (v_id, 1, c.contact_name, c.contact_email, true, v_created);

  insert into public.agreement_revisions (agreement_id, number, created_at, created_by, summary, sent_at)
  values (v_id, 1, v_created, p_actor, 'Νέα πρόταση.',
          case when p_path = 'sent' then now() - interval '2 days'
               when v_signed then p_signed_at - interval '3 days' end);

  for i in 1 .. coalesce(array_length(p_items, 1), 0) loop
    insert into public.agreement_lines (agreement_id, position, line_kind, item_id, description, description_en, unit,
                                        quantity, catalog_provisions, created_at)
    select v_id, i, ci.kind, ci.id, left(ci.name, 300), left(ci.name_en, 300), ci.unit, p_qtys[i],
           coalesce((select jsonb_agg(jsonb_build_object('kind_id', cp.kind_id, 'quantity', cp.quantity) order by cp.kind_id)
                       from public.catalogue_item_provisions cp where cp.item_id = ci.id), '[]'::jsonb),
           v_created
      from public.catalogue_items ci where ci.id = p_items[i]
    returning id into v_line;
    insert into public.agreement_line_amounts (line_id, unit_price, catalog_price)
    select v_line, coalesce(a.price, 0), a.price
      from (select 1) x left join public.catalogue_item_amounts a on a.item_id = p_items[i];
    insert into public.agreement_line_costs (line_id, hours_shoot, hours_edit, direct_cost)
    select v_line, coalesce(k.hours_shoot, 0), coalesce(k.hours_edit, 0), coalesce(k.direct_cost, 0)
      from (select 1) x left join public.catalogue_item_costs k on k.item_id = p_items[i];
    insert into public.agreement_line_provisions (line_id, kind_id, quantity)
    select v_line, cp.kind_id, cp.quantity from public.catalogue_item_provisions cp where cp.item_id = p_items[i];
  end loop;

  if p_path = 'sent' or v_signed then
    v_doc := authz.agreement_build_document(v_id);
    insert into public.agreement_documents (agreement_id, revision, document, hash, created_at)
    values (v_id, 1, v_doc, authz.document_hash(v_doc), coalesce(p_signed_at - interval '3 days', now() - interval '2 days'));
  end if;
  if not v_signed then
    return v_id;
  end if;

  insert into public.agreement_costs (agreement_id, hour_cost, hour_cost_month, multiplier_min, multiplier_target,
                                      multiplier_max, price, discounted_price, estimated_cost, is_low_margin, frozen_at)
  select v_id, f.hour_cost, f.hour_cost_month, coalesce(f.mult_min, 1.30), coalesce(f.mult_target, 1.60),
         coalesce(f.mult_max, 2.00), f.price, f.discounted_price, f.estimated_cost, f.is_low_margin, p_signed_at
    from authz.agreement_figures(v_id) f;

  insert into public.agreement_signatures (agreement_id, method, signed_name, signed_on, recorded_at, recorded_by,
                                           document_hash, reference)
  values (v_id, 'outside', c.contact_name, (p_signed_at at time zone 'Europe/Athens')::date, p_signed_at, p_actor,
          authz.document_hash(v_doc), 'Υπογραφή σε χαρτί (δεδομένα επίδειξης)');

  v_owner := case when authz.user_scope(o.manager_id, 'productions.manage') is not null then o.manager_id
                  else authz.demo_pick('productions.manage', 0) end;

  if not v_monthly then
    insert into public.productions (title, client_id, agreement_id, owner_id, state, delivered_at, delivered_by,
                                    delivered_note, created_at, created_by, updated_at)
    values (left(p_title, 300), c.id, v_id, v_owner,
            case when p_delivered_at is null then 'open' else 'delivered' end,
            p_delivered_at, case when p_delivered_at is not null then v_owner end,
            case when p_delivered_at is not null then 'Παραδόθηκαν όλα τα Παραδοτέα.' end,
            p_signed_at, p_actor, coalesce(p_delivered_at, p_signed_at))
    returning id into v_prod;
    perform authz.demo_production_cost(v_prod, v_id, null, p_delivered_at is not null);
    return v_id;
  end if;

  for r in select * from authz.agreement_period_rows(p_start, p_months) loop
    insert into public.agreement_periods (agreement_id, n, starts, ends, is_partial, gives_provisions, created_at)
    values (v_id, r.n + 1, r.starts, r.ends, r.share < 1, r.gives_provisions, p_signed_at);
  end loop;

  insert into public.agreement_period_provisions (period_id, kind_id, given)
  select p.id, g.kind_id, g.given
    from public.agreement_periods p
    cross join (
      select lp.kind_id, sum(l.quantity * lp.quantity)::integer as given
        from public.agreement_lines l
        join public.agreement_line_provisions lp on lp.line_id = l.id
       where l.agreement_id = v_id
       group by lp.kind_id
    ) g
   where p.agreement_id = v_id and p.gives_provisions and g.given > 0;

  for r in select p.* from public.agreement_periods p where p.agreement_id = v_id order by p.n loop
    insert into public.productions (title, client_id, agreement_id, period_id, owner_id, state, delivered_at, delivered_by,
                                    delivered_note, created_at, created_by, updated_at)
    values (left(p_title || ' — ' || authz.greek_month_year(r.starts), 300), c.id, v_id, r.id, v_owner,
            case when r.ends < v_month then 'delivered' else 'open' end,
            case when r.ends < v_month then least(authz.demo_at(r.ends + 3, '12:00'), now() - interval '1 hour') end,
            case when r.ends < v_month then v_owner end,
            case when r.ends < v_month then 'Παραδόθηκαν όλα τα Παραδοτέα του μήνα.' end,
            p_signed_at, p_actor, p_signed_at)
    returning id into v_prod;
    perform authz.demo_production_cost(v_prod, v_id, r.id, r.ends < v_month and r.n % 2 = 1);
  end loop;
  return v_id;
end;
$$;

-- Η εκτίμηση κόστους μιας Παραγωγής (όπως το productions_cost_snapshot). p_confirmed: ώρες επιβεβαιωμένες, λίγο πάνω από την
-- εκτίμηση· αλλιώς μένουν για επιβεβαίωση.
create function authz.demo_production_cost(p_production uuid, p_agreement uuid, p_period uuid, p_confirmed boolean)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.production_costs (production_id, estimate_shoot_hours, estimate_edit_hours, estimate_direct_cost,
                                       estimate_price, estimate_hour_cost, shoot_hours, shoot_confirmed_at, edit_hours,
                                       edit_confirmed_at, direct_cost)
  select p_production, e.shoot_hours, e.edit_hours, e.direct_cost,
         authz.production_period_price(p_agreement, p_period),
         coalesce((select k.hour_cost from public.agreement_costs k where k.agreement_id = p_agreement),
                  (select h.hour_cost from authz.current_hour_cost() h)),
         case when p_confirmed then round(e.shoot_hours * 1.1, 1) end,
         case when p_confirmed then now() - interval '2 days' end,
         case when p_confirmed then round(e.edit_hours * 1.05, 1) end,
         case when p_confirmed then now() - interval '2 days' end,
         case when p_confirmed then e.direct_cost end
    from authz.production_period_hours(p_agreement, p_period) e;
$$;

-- Γύρισμα με ό,τι γράφουν οι ενέργειες της κατάστασής του, και Συνεργείο (ο πρώτος επιβεβαίωσε). Η Παραγωγή: της Περιόδου
-- που περιέχει τη μέρα (μηνιαία), η μοναδική (εφάπαξ), ή η p_production (Εσωτερική). null αν η μέρα δεν πέφτει σε Περίοδο.
create function authz.demo_filming(
  p_agreement uuid, p_production uuid, p_kind uuid, p_starts timestamptz, p_hours numeric, p_state text, p_origin text,
  p_location text, p_crew uuid[], p_actor uuid, p_extra boolean
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  pr public.productions;
  v_id uuid;
  v_created timestamptz;
  v_done timestamptz := p_starts + make_interval(mins => (p_hours * 60)::integer);
  v_user uuid;
  i integer := 0;
begin
  if p_agreement is null then
    select * into pr from public.productions x where x.id = p_production;
  else
    select x.* into pr
      from public.productions x
      left join public.agreement_periods ap on ap.id = x.period_id
     where x.agreement_id = p_agreement
       and (x.period_id is null or (p_starts at time zone 'Europe/Athens')::date between ap.starts and ap.ends);
  end if;
  if pr.id is null then
    return null;
  end if;
  v_created := case when p_state = 'pending' then now() - interval '30 hours'
                    else least(p_starts - interval '10 days', now() - interval '2 days') end;

  insert into public.filmings (
    production_id, period_id, client_id, kind_id, starts_at, hours, actual_hours, location, origin, state, is_extra, burned,
    client_note, approved_at, approved_by, rejected_at, rejected_by, rejected_reason, cancelled_at, cancelled_by,
    cancelled_side, cancelled_reason, done_at, done_by, no_show_at, no_show_by, created_at, created_by, updated_at, updated_by)
  values (
    pr.id, pr.period_id, pr.client_id, case when pr.client_id is not null then p_kind end, p_starts, p_hours,
    case when p_state = 'done' then p_hours end, p_location, p_origin, p_state, coalesce(p_extra, false),
    p_state = 'no_show',
    case when p_origin = 'client' then 'Θα θέλαμε να γυρίσουμε και λίγα πλάνα του προσωπικού.' end,
    case when p_origin = 'client' and p_state in ('scheduled', 'done', 'no_show') then v_created + interval '3 hours' end,
    case when p_origin = 'client' and p_state in ('scheduled', 'done', 'no_show') then p_actor end,
    case when p_state = 'rejected' then v_created + interval '5 hours' end,
    case when p_state = 'rejected' then p_actor end,
    case when p_state = 'rejected' then 'Η μέρα είναι ήδη γεμάτη· προτείναμε άλλη ώρα στα Μηνύματα.' end,
    case when p_state = 'cancelled' then least(p_starts - interval '2 days', now() - interval '1 day') end,
    case when p_state = 'cancelled' then p_actor end,
    case when p_state = 'cancelled' then 'client' end,
    case when p_state = 'cancelled' then 'Ο πελάτης ζήτησε μετάθεση για τον επόμενο μήνα.' end,
    case when p_state = 'done' then v_done end, case when p_state = 'done' then p_actor end,
    case when p_state = 'no_show' then v_done end, case when p_state = 'no_show' then p_actor end,
    v_created, p_actor, case when p_state in ('done', 'no_show') then v_done else v_created end, p_actor)
  returning id into v_id;

  for v_user in select distinct u from unnest(p_crew) as u where u is not null loop
    i := i + 1;
    insert into public.filming_crew (filming_id, user_id, response, responded_at, added_by, added_at)
    values (v_id, v_user,
            case when p_state = 'pending' or (p_state = 'scheduled' and i > 1) then 'pending' else 'confirmed' end,
            case when p_state = 'pending' or (p_state = 'scheduled' and i > 1) then null else v_created + interval '2 hours' end,
            p_actor, v_created + interval '1 hour');
    if v_user is distinct from pr.owner_id then
      insert into public.production_members (production_id, user_id, added_by, added_at)
      values (pr.id, v_user, p_actor, v_created + interval '1 hour')
      on conflict do nothing;
    end if;
  end loop;
  return v_id;
end;
$$;

-- Παραδοτέο με Εκδόσεις όπως τις γράφει η ροή του (p_flow): draft, in_review, returned, awaiting, changes, approved, cancelled.
-- p_since: η στιγμή της τελευταίας κίνησης. p_answerer: ποιος απάντησε για τον πελάτη (Χρήστης πελάτη ή ο Υπεύθυνος).
create function authz.demo_deliverable(
  p_production uuid, p_kind uuid, p_title text, p_assignee uuid, p_flow text, p_since timestamptz, p_actor uuid,
  p_answerer uuid, p_charge text, p_today date
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  pr public.productions;
  v_id uuid;
  v_url text;
  v_internal boolean;
begin
  select * into pr from public.productions x where x.id = p_production;
  if pr.id is null or p_kind is null then
    return null;
  end if;
  v_internal := pr.client_id is null;
  insert into public.deliverables (production_id, kind_id, title, assignee_id, period_id, charge, charge_reason, deadline,
                                   cancelled_at, cancelled_by, cancel_reason, cancel_outcome, approved_at, approved_by,
                                   created_at, created_by, updated_at, updated_by)
  values (p_production, p_kind, left(p_title, 200), p_assignee, pr.period_id, p_charge,
          case when p_charge = 'free' then 'Δώρο προς τον πελάτη (δεδομένα επίδειξης).' end,
          case p_flow
            when 'draft' then p_today + 3
            when 'returned' then p_today + 1
            when 'changes' then authz.add_working_days((p_since at time zone 'Europe/Athens')::date, 2)
            when 'cancelled' then null
            else (p_since at time zone 'Europe/Athens')::date + 2 end,
          case when p_flow = 'cancelled' then p_since end, case when p_flow = 'cancelled' then p_actor end,
          case when p_flow = 'cancelled' then 'Ο πελάτης άλλαξε σχέδια για την καμπάνια.' end,
          case when p_flow = 'cancelled' then 'returned' end,
          case when p_flow = 'approved' then p_since end, case when p_flow = 'approved' then p_answerer end,
          p_since - interval '6 days', p_actor, p_since, p_actor)
  returning id into v_id;
  v_url := 'https://drive.google.com/file/d/demo-' || left(replace(v_id::text, '-', ''), 16);

  if p_flow = 'in_review' or (v_internal and p_flow <> 'draft' and p_flow <> 'cancelled') then
    insert into public.deliverable_versions (deliverable_id, number, url, host, state, note, created_at, created_by)
    values (v_id, 1, v_url || '-v1/view', 'drive.google.com', 'in_review', 'Πρώτο μοντάζ, χωρίς τελικό χρώμα.',
            p_since, p_assignee);
  elsif p_flow = 'returned' then
    insert into public.deliverable_versions (deliverable_id, number, url, host, state, note, review_note, created_at,
                                             created_by)
    values (v_id, 1, v_url || '-v1/view', 'drive.google.com', 'returned', 'Πρώτο μοντάζ.',
            'Θέλει πιο γρήγορο ρυθμό στα πρώτα δευτερόλεπτα και υπότιτλους.', p_since - interval '1 day', p_assignee);
  elsif p_flow = 'awaiting' then
    insert into public.deliverable_versions (deliverable_id, number, url, host, state, note, created_at, created_by,
                                             sent_at, sent_by)
    values (v_id, 1, v_url || '-v1/view', 'drive.google.com', 'awaiting_client', 'Έτοιμο για έγκριση.',
            p_since - interval '3 hours', p_assignee, p_since, p_actor);
  elsif p_flow = 'changes' then
    insert into public.deliverable_versions (deliverable_id, number, url, host, state, note, created_at, created_by,
                                             sent_at, sent_by, answered_at, answered_by, answer_note)
    values (v_id, 1, v_url || '-v1/view', 'drive.google.com', 'changes_requested', 'Έτοιμο για έγκριση.',
            p_since - interval '2 days', p_assignee, p_since - interval '2 days', p_actor, p_since, p_answerer,
            'Αλλάξτε τη μουσική στο τέλος και βάλτε το λογότυπο νωρίτερα.');
  elsif p_flow = 'approved' then
    insert into public.deliverable_versions (deliverable_id, number, url, host, state, note, created_at, created_by,
                                             sent_at, sent_by, answered_at, answered_by, answer_note)
    values (v_id, 1, v_url || '-v1/view', 'drive.google.com', 'changes_requested', 'Έτοιμο για έγκριση.',
            p_since - interval '4 days', p_assignee, p_since - interval '4 days', p_actor, p_since - interval '3 days',
            p_answerer, 'Λίγο πιο φωτεινό, παρακαλώ.'),
           (v_id, 2, v_url || '-v2/view', 'drive.google.com', 'approved', 'Με τις αλλαγές που ζητήσατε.',
            p_since - interval '2 days', p_assignee, p_since - interval '2 days', p_actor, p_since, p_answerer,
            'Τέλειο, ευχαριστούμε!');
  end if;
  return v_id;
end;
$$;

-- ───────────── Γέμισμα ─────────────

-- Οι πίνακες που γεμίζει η επίδειξη. Κλειδώνονται, κλείνουν οι triggers χρήστη τους, και η διαφορά πριν/μετά γίνεται κατάλογος.
create function authz.demo_seed_tables() returns text[]
language sql immutable set search_path = ''
as $$
  select array[
    'clients', 'client_users', 'client_duplicate_flags', 'opportunities', 'opportunity_activities', 'access_requests',
    'catalogue_items', 'catalogue_item_amounts', 'catalogue_item_costs', 'catalogue_item_provisions',
    'agreements', 'agreement_amounts', 'agreement_baselines', 'agreement_revision_limits', 'agreement_milestones',
    'agreement_lines', 'agreement_line_amounts', 'agreement_line_costs', 'agreement_line_provisions', 'agreement_costs',
    'agreement_recipients', 'agreement_links', 'agreement_signatures', 'agreement_documents', 'agreement_revisions',
    'agreement_periods', 'agreement_period_provisions',
    'productions', 'production_members', 'production_costs', 'production_tasks',
    'equipment_items', 'equipment_templates', 'equipment_template_items', 'crew_templates', 'crew_template_members',
    'filmings', 'filming_crew', 'filming_equipment', 'filming_sheets', 'filming_sheet_versions', 'blocked_times',
    'deliverables', 'deliverable_versions', 'deliverable_comments', 'deliverable_requests',
    'billables', 'invoices', 'receipts',
    'messages', 'message_requests', 'notifications',
    'knowledge_sections', 'knowledge_items', 'knowledge_item_audience',
    'assistant_conversations', 'assistant_messages', 'assistant_unanswered', 'assistant_unanswered_asks',
    'subscriptions'
  ];
$$;

-- Γεμίζει τη βάση με φανταστικούς Πελάτες και ό,τι κρέμεται από αυτούς, μοιρασμένα στους ενεργούς Χρήστες ομάδας.
-- p_today: η «σήμερα» της επίδειξης (null = σήμερα Ελλάδας). p_client_emails: υπάρχοντες λογαριασμοί πελάτη (όχι ομάδας)
-- που μπαίνουν ως Χρήστες πελάτη στον πρώτο Πελάτη επίδειξης, για να γεμίσουν και οι οθόνες του πελάτη.
-- Επιστρέφει { πίνακας: γραμμές επίδειξης }. Αρνείται αν υπάρχουν ήδη δεδομένα επίδειξης.
create function public.demo_seed(p_today date default null, p_client_emails text[] default '{}') returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, public.sales_today());
  v_month date := date_trunc('month', coalesce(p_today, public.sales_today()))::date;
  v_tables text[] := authz.demo_seed_tables();
  v_table text;
  v_pk text;
  v_owner uuid;
  v_stages uuid[];
  v_sources uuid[];
  v_losses uuid[];
  v_kinds_act uuid[];
  k_shoot uuid;
  k_reel uuid;
  k_video uuid;
  k_photo uuid;
  v_monthly_items uuid[];
  v_oneoff_items uuid[];
  v_clients uuid[] := '{}';
  v_mgr uuid[] := '{}';
  v_opps uuid[] := '{}';
  v_agr uuid[] := '{}';
  v_client uuid;
  v_opp uuid;
  v_agreement uuid;
  v_production uuid;
  v_filming uuid;
  v_message uuid;
  v_section uuid;
  v_item uuid;
  v_conv uuid;
  v_unans uuid;
  v_eq uuid[] := '{}';
  v_template uuid;
  v_internal uuid;
  v_client_user uuid;
  v_answerer uuid;
  v_role uuid;
  v_seq integer := 0;
  v_net numeric;
  v_vat_rate numeric;
  v_invoice uuid;
  v_first_invoice uuid;
  v_method uuid;
  v_signed timestamptz;
  v_start date;
  v_user uuid;
  v_paid boolean;
  v_result jsonb;
  r record;
  p record;
  i integer;
  j integer;
begin
  if exists (select 1 from public.demo_rows) then
    raise exception 'Υπάρχουν ήδη δεδομένα επίδειξης· σβήσ'' τα πρώτα (demo_purge)' using errcode = 'P0001';
  end if;
  v_owner := authz.demo_pick('settings.manage', 0);
  if v_owner is null then
    raise exception 'Δεν υπάρχει ενεργός Χρήστης ομάδας για να αναλάβει τα δεδομένα επίδειξης' using errcode = 'P0001';
  end if;
  select array_agg(s.id order by s.sort, s.id) into v_stages from public.sales_stages s where s.retired_at is null;
  select array_agg(s.id order by s.sort, s.id) into v_sources from public.sales_sources s where s.retired_at is null;
  select array_agg(s.id order by s.sort, s.id) into v_losses from public.sales_loss_reasons s where s.retired_at is null;
  select array_agg(s.id order by s.sort, s.id) into v_kinds_act from public.sales_activity_kinds s where s.retired_at is null;
  if v_stages is null or v_sources is null or v_losses is null or v_kinds_act is null then
    raise exception 'Λείπουν ενεργά Στάδια, Πηγές, Λόγοι απώλειας ή είδη Δραστηριότητας' using errcode = 'P0001';
  end if;
  select k.id into k_shoot from public.provision_kinds k
   where k.retired_at is null and k.measure = 'per_filming' order by (k.code = 'shoot') desc, k.sort limit 1;
  select k.id into k_reel from public.provision_kinds k
   where k.retired_at is null and k.measure is null order by (k.code = 'reel') desc, k.sort limit 1;
  select k.id into k_video from public.provision_kinds k
   where k.retired_at is null and k.measure is null order by (k.code = 'video') desc, k.sort desc limit 1;
  select k.id into k_photo from public.provision_kinds k
   where k.retired_at is null and k.measure is null order by (k.code = 'photo') desc, k.sort limit 1;
  select m.id into v_method from public.payment_methods m where m.retired_at is null order by m.sort, m.id limit 1;
  select coalesce((select s.vat_rate from public.company_settings s where s.id), 24) into v_vat_rate;

  -- Κλείδωμα, κλειστοί triggers χρήστη, φωτογραφία των κλειδιών που υπάρχουν ήδη.
  set local lock_timeout = '20s';
  create temp table if not exists demo_before (table_name text, row_id text) on commit drop;
  execute 'truncate pg_temp.demo_before';
  foreach v_table in array v_tables loop
    execute format('alter table public.%I disable trigger user', v_table);
    execute format('insert into pg_temp.demo_before select %L, %s from public.%I x',
                   v_table, authz.demo_pk_expr(v_table, 'x'), v_table);
  end loop;

  -- ── Κατάλογος: ό,τι υπάρχει (ενεργό, με τιμή και Παροχές), αλλιώς στοιχεία επίδειξης ──
  select array_agg(x.id order by x.created_at, x.id) into v_monthly_items
    from (select ci.id, ci.created_at from public.catalogue_items ci
            join public.catalogue_item_amounts a on a.item_id = ci.id and a.price > 0
           where ci.kind = 'package' and ci.billing = 'monthly' and ci.retired_at is null
             and exists (select 1 from public.catalogue_item_provisions cp where cp.item_id = ci.id and cp.kind_id = k_shoot)
           order by ci.created_at, ci.id limit 2) x;
  if coalesce(cardinality(v_monthly_items), 0) < 2 then
    v_monthly_items := array[
      authz.demo_catalogue_item('package', 'monthly', 'Social Βασικό (επίδειξη)', '', 650, 6, 10, 20,
        jsonb_strip_nulls(jsonb_build_object(k_shoot::text, 2, k_reel::text, 4, k_photo::text, 10))),
      authz.demo_catalogue_item('package', 'monthly', 'Social Plus (επίδειξη)', '', 1200, 10, 18, 40,
        jsonb_strip_nulls(jsonb_build_object(k_shoot::text, 3, k_reel::text, 8, k_video::text, 1)))];
  end if;
  select array_agg(x.id order by x.created_at, x.id) into v_oneoff_items
    from (select ci.id, ci.created_at from public.catalogue_items ci
            join public.catalogue_item_amounts a on a.item_id = ci.id and a.price > 0
           where (ci.kind = 'service' or ci.billing = 'one_off') and ci.retired_at is null
             and exists (select 1 from public.catalogue_item_provisions cp where cp.item_id = ci.id and cp.kind_id = k_shoot)
           order by ci.created_at, ci.id limit 2) x;
  if coalesce(cardinality(v_oneoff_items), 0) < 2 then
    v_oneoff_items := array[
      authz.demo_catalogue_item('service', null, 'Εταιρικό βίντεο (επίδειξη)', 'βίντεο', 1800, 6, 16, 150,
        jsonb_strip_nulls(jsonb_build_object(k_shoot::text, 1, k_video::text, 1))),
      authz.demo_catalogue_item('service', null, 'Φωτογράφιση προϊόντων (επίδειξη)', 'φωτογράφιση', 450, 4, 3, 0,
        jsonb_strip_nulls(jsonb_build_object(k_shoot::text, 1, k_photo::text, 20)))];
  end if;

  -- ── Πελάτες ──
  for r in
    select * from (values
      (1, 'Αρτοποιείο Μελίσσι', 'Μελίσσι Αρτοποιία Μονοπρόσωπη ΙΚΕ', 'Θεσσαλονίκη', 'Μαρίνα Καλογήρου', 'melissi', '2310 000 101'),
      (2, 'Κτήμα Αμπελώνες Ολύμπου', 'Αμπελώνες Ολύμπου Α.Ε.', 'Κατερίνη', 'Στέλιος Βαρσάμης', 'ampelones', '23510 00 102'),
      (3, 'Ξενοδοχείο Γαλάζιο Ακρογιάλι', 'Γαλάζιο Ακρογιάλι Τουριστική Ε.Ε.', 'Χαλκιδική', 'Ελπίδα Ρούσσου', 'akrogiali', '23710 00 103'),
      (4, 'Γυμναστήριο Κίνηση Plus', 'Κίνηση Plus Αθλητική ΙΚΕ', 'Αθήνα', 'Νίκος Μαυρίδης', 'kinisi', '210 000 0104'),
      (5, 'Οδοντιατρείο Χαμόγελο', 'Χαμόγελο Οδοντιατρική Ο.Ε.', 'Λάρισα', 'Δήμητρα Σταυρίδου', 'xamogelo', '2410 000 105'),
      (6, 'Ταβέρνα Το Λιμανάκι', 'Το Λιμανάκι Εστίαση Ο.Ε.', 'Καβάλα', 'Μανώλης Πετράκης', 'limanaki', '2510 000 106'),
      (7, 'Κοσμηματοπωλείο Αστέρι', 'Αστέρι Κοσμήματα ΙΚΕ', 'Αθήνα', 'Ιωάννα Δεληγιάννη', 'asteri', '210 000 0107'),
      (8, 'Εκπαιδευτήριο Νέοι Ορίζοντες', 'Νέοι Ορίζοντες Εκπαιδευτική Α.Ε.', 'Πάτρα', 'Αλέξης Κοντός', 'orizontes', '2610 000 108'),
      (9, 'Ελαιουργείο Χρυσή Σταγόνα', 'Χρυσή Σταγόνα Ελαιουργική Ε.Ε.', 'Καλαμάτα', 'Γεωργία Λιάκου', 'stagona', '27210 00 109'),
      (10, 'Studio Γιόγκα Ανάσα', 'Ανάσα Ευεξία ΙΚΕ', 'Θεσσαλονίκη', 'Φωτεινή Αραμπατζή', 'anasa', '2310 000 110'),
      (11, 'Κατασκευαστική Θεμέλιο', 'Θεμέλιο Κατασκευές Α.Τ.Ε.', 'Βόλος', 'Παύλος Ζαχαρίου', 'themelio', '24210 00 111'),
      (12, 'Καφεκοπτείο Ρόδι', 'Ρόδι Καφές Ο.Ε.', 'Ηράκλειο', 'Κατερίνα Μαρκάκη', 'rodi', '2810 000 112'),
      (13, 'Μουσική Σχολή Αρμονία', 'Αρμονία Μουσική Εκπαίδευση ΙΚΕ', 'Ιωάννινα', 'Σπύρος Νάκος', 'armonia', '2310 000 101'),
      (14, 'Ανθοπωλείο Βιολέτα', 'Βιολέτα Λουλούδια Μονοπρόσωπη ΙΚΕ', 'Ρόδος', 'Χρύσα Παπαδοπούλου', 'violeta', '22410 00 114')
    ) as t (n, name, legal, city, contact, slug, phone)
    order by n
  loop
    v_user := case when r.n = 13 then null else authz.demo_pick('clients.manage', r.n) end;
    insert into public.clients (name, legal_name, city, contact_name, contact_email, contact_phone, manager_id,
                                created_at, created_by, updated_at, updated_by)
    values (r.name, r.legal, r.city, r.contact, r.slug || '@example.invalid', r.phone, v_user,
            now() - make_interval(days => 120 - r.n * 6), v_owner, now() - make_interval(days => 120 - r.n * 6), v_owner)
    returning id into v_client;
    v_clients := v_clients || v_client;
    v_mgr := v_mgr || coalesce(v_user, v_owner);
  end loop;

  -- Πιθανό διπλό: ίδιο τηλέφωνο (η «Αρμονία» με το «Μελίσσι»).
  insert into public.client_duplicate_flags (client_id, matches_client_id, reason, created_at)
  values (v_clients[13], v_clients[1], 'phone', now() - interval '20 days');

  -- Χρήστες πελάτη (υπάρχοντες λογαριασμοί) στον πρώτο Πελάτη.
  select r2.id into v_role from public.roles r2 where r2.system_key = 'client_full';
  if v_role is not null then
    for v_user in
      select u.id from auth.users u
       where lower(u.email) = any (select lower(btrim(e)) from unnest(coalesce(p_client_emails, '{}')) e)
         and not exists (select 1 from public.team_users t where t.user_id = u.id)
       order by u.email
    loop
      insert into public.client_users (client_id, user_id, name, role_id, invited_by, joined_at, is_current)
      select v_clients[1], v_user,
             left(coalesce(nullif(btrim(u.raw_user_meta_data ->> 'name'), ''), split_part(u.email, '@', 1)), 120),
             v_role, v_owner, now() - interval '60 days',
             not exists (select 1 from public.client_users x where x.user_id = v_user and x.is_current)
        from auth.users u where u.id = v_user;
      v_client_user := coalesce(v_client_user, v_user);
    end loop;
  end if;
  v_answerer := coalesce(v_client_user, v_mgr[1]);

  -- ── Ευκαιρίες: μία κερδισμένη για κάθε υπογεγραμμένη Συμφωνία (1–9), ανοιχτές σε κάθε Στάδιο, χαμένες ──
  for i in 1 .. 14 loop
    insert into public.opportunities (client_id, title, stage_id, source_id, referred_by, manager_id, outcome, loss_reason_id,
                                      next_step, next_step_due, closed_at, created_at, created_by, updated_at, updated_by)
    values (v_clients[i],
            case when i <= 6 then 'Μηνιαία παρουσία στα social' when i <= 9 then 'Εταιρικό βίντεο παρουσίασης'
                 when i <= 12 then 'Πρόταση για περιεχόμενο social' when i = 13 then 'Βίντεο για τη χειμερινή σεζόν'
                 else 'Φωτογράφιση για το νέο κατάστημα' end,
            v_stages[case when i <= 9 then cardinality(v_stages) when i <= 11 then least(4, cardinality(v_stages))
                          when i = 12 then cardinality(v_stages) else 1 end],
            v_sources[1 + (i % cardinality(v_sources))],
            case when v_sources[1 + (i % cardinality(v_sources))] = (select s.id from public.sales_sources s where s.code = 'referral')
                 then 'Σύσταση από άλλο πελάτη' else '' end,
            case when i = 13 then null else v_mgr[i] end,
            case when i <= 9 then 'won' when i = 14 then 'lost' else 'open' end,
            case when i = 14 then v_losses[1] end,
            case when i <= 9 or i = 14 then '' when i = 10 then 'Ολοκλήρωση της πρότασης'
                 when i = 11 then 'Τηλέφωνο για τα σχόλια στην πρόταση' when i = 12 then 'Έγκριση της έκπτωσης'
                 else 'Πρώτη επαφή με τον Πελάτη' end,
            case when i <= 9 or i = 14 then null when i = 10 then v_today + 2 when i = 11 then v_today - 1
                 when i = 12 then v_today + 1 else v_today end,
            case when i <= 5 then now() - make_interval(days => 85 - i) when i = 6 then now() - interval '3 days' when i <= 9 then now() - make_interval(days => 25 + i * 3)
                 when i = 14 then now() - interval '40 days' end,
            now() - make_interval(days => 110 - i * 5), v_owner, now() - make_interval(days => 20 - i), v_owner)
    returning id into v_opp;
    v_opps := v_opps || v_opp;
  end loop;
  -- Χαμένη Ευκαιρία με λόγο απώλειας: η «Βιολέτα» ξαναξεκινά με νέα Ευκαιρία που τη συνεχίζει.
  insert into public.opportunities (client_id, title, stage_id, source_id, manager_id, outcome, next_step, next_step_due,
                                    follows_opportunity_id, created_at, created_by, updated_at, updated_by)
  values (v_clients[14], 'Φωτογράφιση ανοιξιάτικης συλλογής', v_stages[least(2, cardinality(v_stages))], v_sources[1],
          v_mgr[14], 'open', 'Αποστολή δειγμάτων δουλειάς', v_today - 2, v_opps[14], now() - interval '10 days', v_owner,
          now() - interval '3 days', v_owner),
         (v_clients[1], 'Σειρά podcast για τη γειτονιά', v_stages[least(3, cardinality(v_stages))], v_sources[1],
          v_mgr[1], 'open', 'Συνάντηση για τα θέματα των επεισοδίων', v_today + 6, null, now() - interval '12 days', v_owner,
          now() - interval '2 days', v_owner),
         (v_clients[3], 'Βίντεο για τις κρατήσεις του καλοκαιριού', v_stages[least(2, cardinality(v_stages))], v_sources[1],
          v_mgr[3], 'open', 'Κλήση για ημερομηνίες', v_today - 1, null, now() - interval '8 days', v_owner,
          now() - interval '8 days', v_owner);
  insert into public.opportunities (client_id, title, stage_id, source_id, manager_id, outcome, loss_reason_id, next_step,
                                    closed_at, created_at, created_by, updated_at, updated_by)
  values (v_clients[2], 'Βίντεο για τον τρύγο', v_stages[least(3, cardinality(v_stages))], v_sources[1], v_mgr[2], 'lost',
          v_losses[least(4, cardinality(v_losses))], '', now() - interval '30 days', now() - interval '70 days', v_owner,
          now() - interval '30 days', v_owner);

  -- Ιστορικό: δημιουργία, απώλεια και σημειώσεις.
  insert into public.opportunity_activities (opportunity_id, client_id, occurred_at, actor_id, event, subject_id)
  select o.id, o.client_id, o.created_at, o.manager_id, 'created', o.stage_id
    from public.opportunities o where o.client_id = any (v_clients);
  insert into public.opportunity_activities (opportunity_id, client_id, occurred_at, actor_id, event, subject_id)
  select o.id, o.client_id, o.closed_at, o.manager_id, 'lost', o.loss_reason_id
    from public.opportunities o where o.client_id = any (v_clients) and o.outcome = 'lost';
  insert into public.opportunity_activities (opportunity_id, client_id, occurred_at, actor_id, kind_id, body)
  select o.id, o.client_id, o.created_at + interval '2 days', coalesce(o.manager_id, v_owner),
         v_kinds_act[1 + (row_number() over (order by o.created_at) % cardinality(v_kinds_act))::integer],
         'Μιλήσαμε για τους στόχους του επόμενου τριμήνου· θέλει περισσότερα reels και ένα βίντεο παρουσίασης.'
    from public.opportunities o where o.client_id = any (v_clients);

  -- Αίτημα πρόσβασης: ένας άλλος Χρήστης ομάδας ζητά τον «Εκπαιδευτήριο».
  v_user := (select u.user_id from public.team_users u
              where u.is_active and u.user_id <> v_mgr[8] order by u.created_at, u.user_id limit 1);
  if v_user is not null then
    insert into public.access_requests (client_id, requester_id, topic, comment, source_id, created_at)
    values (v_clients[8], v_user, 'Νέο βίντεο για τις εγγραφές', 'Με πήραν τηλέφωνο από το σχολείο για δεύτερο έργο.',
            v_sources[1], now() - interval '1 day');
  end if;

  -- ── Συμφωνίες ──
  for i in 1 .. 12 loop
    v_signed := case when i <= 5 then authz.demo_at((v_month - interval '2 months')::date - 6, '12:00')
                     when i = 6 then now() - interval '3 days'
                     when i <= 8 then now() - make_interval(days => 20 + i)
                     when i = 9 then now() - interval '60 days' end;
    v_start := case when i <= 5 then (v_month - interval '2 months')::date
                    when i = 6 then (v_month + interval '1 month')::date
                    when i <= 9 then (v_signed at time zone 'Europe/Athens')::date end;
    v_agreement := authz.demo_agreement(
      v_opps[i], case when i <= 6 or i >= 10 then 'monthly' else 'one_off' end,
      case when i <= 6 then 'Social media · ' || (select c.name from public.clients c where c.id = v_clients[i])
           when i <= 9 then 'Βίντεο παρουσίασης · ' || (select c.name from public.clients c where c.id = v_clients[i])
           else 'Πρόταση social · ' || (select c.name from public.clients c where c.id = v_clients[i]) end,
      case when i <= 6 or i >= 10 then array[v_monthly_items[1 + (i % 2)]] else array[v_oneoff_items[1 + (i % 2)]] end,
      array[1],
      case when i <= 9 then 'signed' when i = 10 then 'draft' when i = 11 then 'sent' else 'awaiting_approval' end,
      v_start, case when i = 4 then 12 else 6 end, v_signed,
      case when i <= 9 then (v_signed at time zone 'Europe/Athens')::date + 14 when i = 10 then v_today + 21
           when i = 11 then v_today + 5 else v_today + 14 end,
      case when i in (5, 12) then 15 else 0 end, case when i in (5, 12) then 2 else 0 end,
      case when i = 9 then now() - interval '25 days' end,
      v_mgr[i], v_today);
    v_agr := v_agr || v_agreement;
    insert into public.opportunity_activities (opportunity_id, client_id, occurred_at, actor_id, event, subject_id, body)
    values (v_opps[i], v_clients[i], coalesce(v_signed, now()) - interval '12 days', v_mgr[i], 'agreement', v_agreement,
            'Ξεκίνησε η σύνταξη πρότασης.');
  end loop;
  -- Η πρόταση που στάλθηκε: σύνδεσμος που άνοιξε ο πελάτης (το token δεν υπάρχει πουθενά).
  insert into public.agreement_links (agreement_id, recipient_id, recipient_name, recipient_email, is_signatory, revision,
                                      token_hash, issued_at, issued_by, first_opened_at, last_opened_at, open_count)
  select x.agreement_id, x.id, x.name, x.email, true, 1, authz.token_hash(authz.new_token()), now() - interval '2 days',
         v_mgr[11], now() - interval '1 day', now() - interval '5 hours', 3
    from public.agreement_recipients x where x.agreement_id = v_agr[11];
  -- Η πρόταση με έκπτωση πάνω από τη συνηθισμένη περιμένει Έγκριση.
  update public.agreement_revisions
     set approval_state = 'pending', requested_by = v_mgr[12], requested_at = now() - interval '6 hours',
         requested_deviations = jsonb_build_object('discount', 15),
         comment = 'Ζητά 15% για δύο μήνες· είναι καλός πελάτης για σύσταση.'
   where agreement_id = v_agr[12];

  -- ── Εξοπλισμός και πρότυπα ──
  for r in
    select * from (values
      (1, 'Κάμερες', 'Sony FX3 · Α (επίδειξη)', 'FX3-A', 'available', null::text),
      (2, 'Κάμερες', 'Sony FX3 · Β (επίδειξη)', 'FX3-B', 'available', null),
      (3, 'Φακοί', 'Φακός 24-70mm (επίδειξη)', 'L-2470', 'available', null),
      (4, 'Φωτισμός', 'Φωτιστικό LED 300W (επίδειξη)', 'LED-300', 'available', null),
      (5, 'Ήχος', 'Ασύρματα μικρόφωνα (επίδειξη)', 'MIC-W', 'available', null),
      (6, 'Στήριξη και σταθεροποίηση', 'Gimbal (επίδειξη)', 'GMB-1', 'available', null),
      (7, 'Drone', 'Drone μικρού βάρους (επίδειξη)', 'DRN-1', 'in_repair', 'Σπασμένη έλικα· στο σέρβις ως την Παρασκευή.'),
      (8, 'Ήχος', 'Μικρόφωνο κάμερας (επίδειξη)', 'MIC-C', 'available', null)
    ) as t (n, category, name, code, status, note)
    order by n
  loop
    v_item := null;
    insert into public.equipment_items (category_id, name, code, status, status_note, created_by, updated_by)
    select coalesce((select c.id from public.equipment_categories c where c.name = r.category and c.retired_at is null),
                    (select c.id from public.equipment_categories c where c.retired_at is null order by c.sort_order, c.id limit 1)),
           r.name, r.code, r.status, r.note, v_owner, v_owner
    where not exists (select 1 from public.equipment_items x where lower(x.name) = lower(r.name))
    returning id into v_item;
    v_eq := v_eq || v_item;
  end loop;
  insert into public.equipment_templates (name, note, created_by, updated_by)
  values ('Βασικό σετ social (επίδειξη)', 'Μία κάμερα, gimbal και μικρόφωνα.', v_owner, v_owner)
  returning id into v_template;
  insert into public.equipment_template_items (template_id, item_id)
  select v_template, x from unnest(array[v_eq[1], v_eq[6], v_eq[5]]) x where x is not null;
  insert into public.crew_templates (name, note, created_by, updated_by)
  values ('Συνεργείο social (επίδειξη)', 'Κάμεραμαν και βοηθός.', v_owner, v_owner)
  returning id into v_template;
  insert into public.crew_template_members (template_id, user_id)
  select distinct v_template, x from unnest(array[authz.demo_pick('filming.crew', 0), authz.demo_pick('filming.crew', 1)]) x;

  -- ── Γυρίσματα ──
  -- Μηνιαίοι 1–5: τρία ολοκληρωμένα στο παρελθόν, και ό,τι τρέχει γύρω από σήμερα.
  for i in 1 .. 5 loop
    foreach j in array array[56, 35, 14] loop
      perform authz.demo_filming(v_agr[i], null, k_shoot, authz.demo_at(v_today - j + i, '10:00'), 4, 'done', 'team',
        'Στο κατάστημα του πελάτη', array[authz.demo_pick('filming.crew', i), authz.demo_pick('filming.crew', i + 1)],
        v_mgr[i], false);
    end loop;
  end loop;
  v_filming := authz.demo_filming(v_agr[1], null, k_shoot, authz.demo_at(v_today, '10:00'), 3, 'scheduled', 'team',
    'Φούρνος Μελίσσι, κεντρικό κατάστημα', array[authz.demo_pick('filming.crew', 1), authz.demo_pick('filming.crew', 2)],
    v_mgr[1], false);
  insert into public.filming_equipment (filming_id, item_id, added_by)
  select v_filming, x, v_mgr[1] from unnest(array[v_eq[1], v_eq[3], v_eq[5]]) x where v_filming is not null and x is not null;
  insert into public.filming_sheets (filming_id, shots, crew_note, updated_by)
  select v_filming, jsonb_build_array(
           jsonb_build_object('id', gen_random_uuid(), 'text', 'Ζύμωμα σε κοντινό, αργή κίνηση'),
           jsonb_build_object('id', gen_random_uuid(), 'text', 'Ο φούρνος ανοίγει, ατμός στο φως'),
           jsonb_build_object('id', gen_random_uuid(), 'text', 'Πελάτες στον πάγκο, γενικό πλάνο')),
         'Πάρκινγκ στο πίσω μέρος. Ρωτήστε για τη Μαρίνα.', v_mgr[1]
   where v_filming is not null;
  v_production := authz.demo_filming(v_agr[2], null, k_shoot, authz.demo_at(v_today, '12:00'), 3, 'scheduled', 'team',
    'Οινοποιείο, αίθουσα γευσιγνωσίας', array[authz.demo_pick('filming.crew', 2), authz.demo_pick('filming.crew', 3)],
    v_mgr[2], false);
  insert into public.filming_equipment (filming_id, item_id, added_by)
  select v_production, x, v_mgr[2] from unnest(array[v_eq[1], v_eq[4]]) x where v_production is not null and x is not null;
  insert into public.filming_sheet_versions (filming_id, version, issued_at, issued_by, snapshot)
  select f.id, 1, now() - interval '1 day', v_mgr[1], authz.sheet_snapshot(f.id)
    from public.filmings f where f.id in (v_filming, v_production);
  update public.filming_crew set version = 1 where filming_id in (v_filming, v_production) and response = 'confirmed';
  -- Αίτημα ακύρωσης, μετάθεσης, κράτηση πελάτη που περιμένει, απόρριψη, ακύρωση, «δεν έγινε».
  v_filming := authz.demo_filming(v_agr[2], null, k_shoot, authz.demo_at(v_today + 2, '11:00'), 3, 'scheduled', 'team',
    'Αμπελώνας, πάνω πλαγιά', array[authz.demo_pick('filming.crew', 3)], v_mgr[2], false);
  update public.filmings
     set cancel_request_at = now() - interval '4 hours', cancel_request_by = v_answerer,
         cancel_request_reason = 'Η πρόγνωση λέει βροχή όλη μέρα.'
   where id = v_filming;
  v_filming := authz.demo_filming(v_agr[3], null, k_shoot, authz.demo_at(v_today + 1, '09:00'), 4, 'scheduled', 'team',
    'Ξενοδοχείο, πισίνα και δωμάτια', array[authz.demo_pick('filming.crew', 4), authz.demo_pick('filming.crew', 5)],
    v_mgr[3], false);
  update public.filmings
     set reschedule_starts_at = authz.demo_at(v_today + 4, '09:00'), reschedule_hours = 4,
         reschedule_requested_at = now() - interval '3 hours', reschedule_requested_by = v_answerer
   where id = v_filming;
  update public.filming_crew set response = 'declined', reason = 'Έχω άλλο γύρισμα την ίδια ώρα.',
                                 responded_at = now() - interval '1 day'
   where filming_id = v_filming and response = 'pending';
  perform authz.demo_filming(v_agr[4], null, k_shoot, authz.demo_at(v_today + 3, '17:00'), 2, 'pending', 'client',
    'Αίθουσα ομαδικών', array[]::uuid[], v_mgr[4], false);
  perform authz.demo_filming(v_agr[1], null, k_shoot, authz.demo_at(v_today + 9, '08:00'), 3, 'pending', 'client',
    'Φούρνος Μελίσσι, εργαστήριο', array[]::uuid[], v_mgr[1], false);
  perform authz.demo_filming(v_agr[5], null, k_shoot, authz.demo_at(v_today + 5, '13:00'), 2, 'scheduled', 'client',
    'Ιατρείο, χώρος αναμονής', array[authz.demo_pick('filming.crew', 5), authz.demo_pick('filming.crew', 6)], v_mgr[5], false);
  perform authz.demo_filming(v_agr[5], null, k_shoot, authz.demo_at(v_today + 8, '12:00'), 2, 'rejected', 'client',
    'Ιατρείο', array[]::uuid[], v_mgr[5], false);
  perform authz.demo_filming(v_agr[4], null, k_shoot, authz.demo_at(v_today - 6, '18:00'), 2, 'cancelled', 'team',
    'Αίθουσα βαρών', array[authz.demo_pick('filming.crew', 4)], v_mgr[4], false);
  perform authz.demo_filming(v_agr[3], null, k_shoot, authz.demo_at(v_today - 3, '10:00'), 3, 'no_show', 'team',
    'Ξενοδοχείο, εστιατόριο', array[authz.demo_pick('filming.crew', 3)], v_mgr[3], false);
  perform authz.demo_filming(v_agr[2], null, k_shoot, authz.demo_at(v_today + 16, '10:00'), 4, 'scheduled', 'team',
    'Αποθήκη βαρελιών', array[authz.demo_pick('filming.crew', 2)], v_mgr[2], false);
  perform authz.demo_filming(v_agr[6], null, k_shoot, authz.demo_at((v_month + interval '1 month')::date + 6, '11:00'), 3,
    'pending', 'client', 'Ταβέρνα, βεράντα', array[]::uuid[], v_mgr[6], false);
  -- Εφάπαξ: ένα ολοκληρωμένο, ένα την εβδομάδα, ένα παλιό παραδομένο.
  perform authz.demo_filming(v_agr[7], null, k_shoot, authz.demo_at(v_today - 10, '11:00'), 5, 'done', 'team',
    'Κοσμηματοπωλείο, βιτρίνες', array[authz.demo_pick('filming.crew', 7), authz.demo_pick('filming.crew', 8)], v_mgr[7], false);
  perform authz.demo_filming(v_agr[8], null, k_shoot, authz.demo_at(v_today + 4, '09:30'), 6, 'scheduled', 'team',
    'Σχολείο, αυλή και εργαστήρια', array[authz.demo_pick('filming.crew', 8), authz.demo_pick('filming.crew', 9)],
    v_mgr[8], false);
  perform authz.demo_filming(v_agr[9], null, k_shoot, authz.demo_at(v_today - 50, '08:00'), 6, 'done', 'team',
    'Ελαιώνας και ελαιοτριβείο', array[authz.demo_pick('filming.crew', 9)], v_mgr[9], false);
  -- Εσωτερική Παραγωγή με Γύρισμα.
  insert into public.productions (title, owner_id, state, created_at, created_by, updated_at)
  values ('Showreel της εταιρείας (επίδειξη)', authz.demo_pick('productions.manage', 1), 'open', now() - interval '15 days',
          v_owner, now() - interval '15 days')
  returning id into v_internal;
  perform authz.demo_production_cost(v_internal, null, null, false);
  perform authz.demo_filming(null, v_internal, null, authz.demo_at(v_today + 6, '16:00'), 3, 'scheduled', 'team',
    'Στούντιο', array[authz.demo_pick('filming.crew', 0)], v_owner, false);
  -- Κρατήσεις εξοπλισμού (η κάμερα Α είναι ήδη σε δύο Γυρίσματα που επικαλύπτονται σήμερα: σύγκρουση).
  insert into public.filming_equipment (filming_id, item_id, added_by)
  select f.id, v_eq[2], v_owner
    from public.filmings f where f.production_id = v_internal and v_eq[2] is not null;
  insert into public.filming_equipment (filming_id, item_id, added_by)
  select f.id, v_eq[2], v_owner
    from public.filmings f join public.productions pr on pr.id = f.production_id
   where pr.agreement_id = v_agr[8] and f.state = 'scheduled' and v_eq[2] is not null;

  -- Κλεισμένος χρόνος.
  insert into public.blocked_times (user_id, starts_at, ends_at, all_day, title, created_by)
  values (authz.demo_pick('filming.crew', 1), authz.demo_at(v_today + 10, '00:00'), authz.demo_at(v_today + 12, '00:00'),
          true, 'Άδεια (επίδειξη)', v_owner);

  -- ── Παραδοτέα ──
  for p in
    select pr.id, pr.state, pr.owner_id, pr.client_id, pr.agreement_id, ap.starts, ap.ends,
           row_number() over (order by pr.client_id, ap.starts) as rn,
           (select array_position(v_clients, pr.client_id)) as cn
      from public.productions pr
      left join public.agreement_periods ap on ap.id = pr.period_id
     where pr.agreement_id = any (v_agr)
  loop
    v_user := authz.demo_pick('deliverables.work', p.rn::integer);
    if p.state = 'delivered' then
      perform authz.demo_deliverable(p.id, k_reel, 'Reel #1 · ' || coalesce(authz.greek_month(p.starts), 'βίντεο'), v_user,
        'approved', least(authz.demo_at(coalesce(p.ends, v_today - 30), '15:00'), now() - interval '2 days'), p.owner_id,
        v_answerer, 'included', v_today);
      perform authz.demo_deliverable(p.id, coalesce(k_video, k_reel), 'Βίντεο · ' || coalesce(authz.greek_month(p.starts), 'παρουσίαση'),
        v_user, 'approved', least(authz.demo_at(coalesce(p.ends, v_today - 30), '17:00'), now() - interval '2 days'),
        p.owner_id, v_answerer, 'included', v_today);
    elsif p.starts is null or (p.starts <= v_today and p.ends >= v_today) then
      perform authz.demo_deliverable(p.id, k_reel, 'Reel · παρασκήνια', v_user, 'draft', now() - interval '1 day',
        p.owner_id, v_answerer, 'included', v_today);
      perform authz.demo_deliverable(p.id, k_reel, 'Reel · προϊόν της εβδομάδας', v_user,
        (array['in_review', 'awaiting', 'changes', 'returned', 'approved', 'in_review', 'awaiting', 'changes', 'awaiting'])[p.cn],
        now() - make_interval(hours => 20 + p.cn::integer * 7), p.owner_id, v_answerer, 'included', v_today);
      perform authz.demo_deliverable(p.id, coalesce(k_photo, k_reel), 'Φωτογραφίες · νέα προϊόντα', v_user,
        (array['awaiting', 'approved', 'in_review', 'changes', 'awaiting', 'returned', 'in_review', 'awaiting', 'approved'])[p.cn],
        now() - make_interval(days => 4, hours => p.cn::integer), p.owner_id, v_answerer, 'included', v_today);
      if p.cn in (2, 4) then
        perform authz.demo_deliverable(p.id, k_reel, 'Έξτρα reel για προσφορά', v_user, 'draft', now() - interval '6 hours',
          p.owner_id, v_answerer, 'pending', v_today);
      end if;
      if p.cn = 3 then
        perform authz.demo_deliverable(p.id, k_reel, 'Reel · εκδήλωση που ακυρώθηκε', v_user, 'cancelled',
          now() - interval '5 days', p.owner_id, v_answerer, 'included', v_today);
      end if;
    end if;
  end loop;
  perform authz.demo_deliverable(v_internal, coalesce(k_video, k_reel), 'Showreel 2026 · πρώτο μοντάζ',
    authz.demo_pick('deliverables.work', 2), 'in_review', now() - interval '1 day', v_owner, v_owner, 'free', v_today);
  -- Ο υπεύθυνος του Παραδοτέου γίνεται μέλος της Παραγωγής (όπως η ανάθεση).
  insert into public.production_members (production_id, user_id, added_by, added_at)
  select distinct d.production_id, d.assignee_id, v_owner, now() - interval '9 days'
    from public.deliverables d join public.productions pr on pr.id = d.production_id
   where (pr.agreement_id = any (v_agr) or pr.id = v_internal) and d.assignee_id is not null
     and d.assignee_id is distinct from pr.owner_id
  on conflict do nothing;
  -- Σχόλια στις Εκδόσεις που έστειλε η ομάδα, και ένα αίτημα αλλαγής μετά την έγκριση.
  insert into public.deliverable_comments (deliverable_id, version_number, body, at_seconds, is_internal, created_at, created_by)
  select v.deliverable_id, v.number, x.body, x.secs, x.internal, v.created_at + x.after, x.who
    from public.deliverable_versions v
    join public.deliverables d on d.id = v.deliverable_id
    join public.productions pr on pr.id = d.production_id and pr.agreement_id = any (v_agr) and pr.state = 'open'
   cross join lateral (values
     ('Στο 0:12 το λογότυπο κόβεται λίγο.', 12, false, interval '2 hours', v_answerer),
     ('Το διορθώνω στην επόμενη έκδοση.', null::integer, true, interval '3 hours', d.assignee_id)) as x (body, secs, internal, after, who)
   where v.state in ('awaiting_client', 'changes_requested');
  insert into public.deliverable_requests (deliverable_id, body, created_at, created_by)
  select d.id, 'Μπορούμε να αλλάξουμε τη μουσική; Μας άρεσε περισσότερο η πρώτη.', now() - interval '20 hours', v_answerer
    from public.deliverables d
    join public.productions pr on pr.id = d.production_id and pr.state = 'open' and pr.client_id = v_clients[2]
   where d.approved_at is not null
   order by d.created_at limit 1;

  -- Εργασίες Παραγωγής.
  insert into public.production_tasks (production_id, title, assignee_id, due_date, done_at, done_by, sort, created_at, created_by)
  select pr.id, x.title, authz.demo_pick('productions.manage', x.n), v_today + x.due,
         case when x.done then now() - interval '1 day' end, case when x.done then pr.owner_id end, x.n,
         now() - interval '9 days', pr.owner_id
    from public.productions pr
   cross join (values (1, 'Ημερολόγιο αναρτήσεων του μήνα', -2, true),
                      (2, 'Έγκριση μουσικής από τον πελάτη', -1, false),
                      (3, 'Ανέβασμα τελικών αρχείων στο Drive', 4, false)) as x (n, title, due, done)
   where pr.state = 'open' and (pr.agreement_id = any (v_agr) or pr.id = v_internal)
     and (pr.period_id is null or exists (select 1 from public.agreement_periods ap
                                          where ap.id = pr.period_id and ap.starts <= v_today and ap.ends >= v_today));

  -- ── Τιμολογητέα, Τιμολόγια και Εισπράξεις ──
  -- Τιμολογητέα όπως τα γράφει η γεννήτρια (ίδια πηγή), ώστε το cron να μη γράψει δεύτερα.
  insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net, created_at)
  select o.client_id, a.id, 'period', ap.id, 'Περίοδος ' || authz.greek_month(ap.starts), ap.starts, x.net,
         authz.demo_at(ap.starts, '08:00')
    from public.agreements a
    join public.opportunities o on o.id = a.opportunity_id
    join public.agreement_periods ap on ap.agreement_id = a.id
   cross join lateral (select round(authz.production_period_price(a.id, ap.id), 2) as net) x
   where a.id = any (v_agr) and a.kind = 'monthly' and a.state in ('signed', 'active') and ap.starts <= v_today and x.net > 0;
  insert into public.billables (client_id, agreement_id, reason, source_id, label, billable_on, net, created_at)
  select o.client_id, a.id, 'milestone', m.id,
         'Δόση ' || authz.milestone_text(m.trigger) || ' ' || trim(trailing '.' from trim(trailing '0' from m.percent::text)) || '%',
         (a.signed_at at time zone 'Europe/Athens')::date + case when m.trigger = 'delivered' then 35 else 0 end,
         round(f.price * m.percent / 100, 2), a.signed_at
    from public.agreement_milestones m
    join public.agreements a on a.id = m.agreement_id
    join public.opportunities o on o.id = a.opportunity_id
   cross join lateral authz.agreement_figures(a.id) f
   where a.id = any (v_agr) and a.kind = 'one_off' and a.state in ('signed', 'active')
     and (m.trigger = 'signature' or (m.trigger = 'delivered' and a.id = v_agr[9])) and f.price > 0;
  -- Ένα Τιμολόγιο ανά Τιμολογητέο, εκτός από τον τρέχοντα μήνα του 4 και του 5 (μένουν «Προς τιμολόγηση»).
  for r in
    select b.client_id, b.label, b.billable_on, b.net, b.agreement_id, array_position(v_clients, b.client_id) as cn
      from public.billables b
     where b.agreement_id = any (v_agr)
     order by b.billable_on, b.client_id
  loop
    continue when r.cn in (4, 5) and r.billable_on >= v_month;
    v_seq := v_seq + 1;
    v_net := r.net;
    insert into public.invoices (client_id, kind, number, issue_date, due_date, net, vat, total, pdf_path, created_at, created_by)
    values (r.client_id, case when r.cn = 9 and r.billable_on > v_month - 1 then 'receipt' else 'invoice' end,
            'DEMO-' || lpad(v_seq::text, 3, '0'), least(r.billable_on + 2, v_today), least(r.billable_on + 2, v_today) + 15,
            v_net, round(v_net * v_vat_rate / 100, 2), v_net + round(v_net * v_vat_rate / 100, 2),
            'demo/DEMO-' || lpad(v_seq::text, 3, '0') || '-' || replace(gen_random_uuid()::text, '-', '') || '.pdf',
            authz.demo_at(least(r.billable_on + 2, v_today), '10:00'), v_owner)
    returning id into v_invoice;
    if r.cn = 1 and v_first_invoice is null then
      v_first_invoice := v_invoice;
    end if;
    -- Πληρωμένο, εκτός από: το τελευταίο του 3 (ληξιπρόθεσμο), μισό του 2, όσα του τρέχοντος μήνα, του 8 (δεν έληξε).
    v_paid := r.billable_on < v_month and r.cn <> 8 and not (r.cn = 3 and r.billable_on >= v_month - interval '1 month');
    if v_paid and v_method is not null then
      insert into public.receipts (client_id, received_on, amount, method_id, note, created_at, created_by)
      select r.client_id, least(i.issue_date + 9, v_today), case when r.cn = 2 and r.billable_on >= v_month - interval '1 month'
                                                                 then round(i.total / 2, 2) else i.total end,
             v_method, 'Κατάθεση (δεδομένα επίδειξης)', authz.demo_at(least(i.issue_date + 9, v_today), '12:00'), v_owner
        from public.invoices i where i.id = v_invoice;
    end if;
  end loop;
  -- Πιστωτικό για μικρή έκπτωση στο πρώτο Τιμολόγιο του «Μελίσσι».
  if v_first_invoice is not null then
    v_seq := v_seq + 1;
    insert into public.invoices (client_id, kind, number, issue_date, net, vat, total, credit_for, pdf_path, created_at, created_by)
    select i.client_id, 'credit', 'DEMO-' || lpad(v_seq::text, 3, '0'), i.issue_date + 5, 50, round(50 * v_vat_rate / 100, 2),
           50 + round(50 * v_vat_rate / 100, 2), i.id,
           'demo/DEMO-' || lpad(v_seq::text, 3, '0') || '-' || replace(gen_random_uuid()::text, '-', '') || '.pdf',
           authz.demo_at(i.issue_date + 5, '10:00'), v_owner
      from public.invoices i where i.id = v_first_invoice;
  end if;

  -- ── Μηνύματα και Αιτήματα ──
  for i in 1 .. 9 loop
    insert into public.messages (client_id, author_id, author_kind, body, is_internal, mentions, created_at)
    values
      (v_clients[i], v_mgr[i], 'team', 'Καλημέρα! Σας στείλαμε το πρόγραμμα του μήνα· πείτε μας αν θέλετε αλλαγές.', false,
       '{}', now() - make_interval(days => 3, hours => i)),
      (v_clients[i], case when v_client_user is not null and i = 1 then v_client_user else v_mgr[i] end,
       case when v_client_user is not null and i = 1 then 'client' else 'team' end,
       case when v_client_user is not null and i = 1 then 'Τέλεια, ευχαριστούμε! Μπορούμε να κρατήσουμε και ένα γύρισμα την άλλη εβδομάδα;'
            else 'Ο πελάτης επιβεβαίωσε τηλεφωνικά το πρόγραμμα.' end, false, '{}', now() - make_interval(days => 2, hours => i));
    insert into public.messages (client_id, author_id, author_kind, body, is_internal, mentions, created_at)
    values (v_clients[i], v_owner, 'team', 'Θυμηθείτε να ανεβάσετε τα τελικά αρχεία πριν την Παρασκευή.', true,
            array(select distinct x from unnest(array[authz.demo_pick('messages.chat', i)]) x where x <> v_owner),
            now() - make_interval(hours => 5 + i));
    if v_client_user is null or i <> 1 then
      insert into public.messages (client_id, author_id, author_kind, body, is_internal, created_at)
      values (v_clients[i], v_mgr[i], 'team',
              'Σημείωση από τηλεφώνημα: ο πελάτης ζητά ' || (array['ένα επιπλέον reel για την προσφορά του Σαββατοκύριακου.',
                'μετάθεση του γυρίσματος για την επόμενη εβδομάδα.', 'αντίγραφο της τελευταίας απόδειξης.'])[1 + i % 3],
              false, now() - make_interval(hours => 26 + i))
      returning id into v_message;
    else
      insert into public.messages (client_id, author_id, author_kind, body, is_internal, created_at)
      values (v_clients[i], v_client_user, 'client', 'Θα θέλαμε ένα επιπλέον reel για την προσφορά του Σαββατοκύριακου.',
              false, now() - interval '27 hours')
      returning id into v_message;
    end if;
    insert into public.message_requests (message_id, kind, state, assignee_id, declared_by, declared_user, declared_at,
                                         closed_at, closed_by, close_comment)
    values (v_message, (array['deliverable', 'filming', 'other'])[1 + i % 3],
            case when i in (4, 7) then 'done' else 'open' end,
            case when i in (3, 6) then null else v_mgr[i] end,
            case when v_client_user is not null and i = 1 then 'client' else 'team' end,
            case when v_client_user is not null and i = 1 then v_client_user else v_mgr[i] end,
            now() - make_interval(hours => 26 + i * 9),
            case when i in (4, 7) then now() - interval '2 hours' end, case when i in (4, 7) then v_mgr[i] end,
            case when i in (4, 7) then 'Έγινε· το στείλαμε στον πελάτη.' end);
  end loop;

  -- ── Ειδοποιήσεις για κάθε ενεργό Χρήστη ομάδας ──
  insert into public.notifications (user_id, client_id, title, body, link, created_at, read_at)
  select u.user_id, v_clients[x.cn], x.title, x.body, x.link, now() - x.ago, case when x.is_read then now() - x.ago + interval '1 hour' end
    from public.team_users u
   cross join (values
     (1, 'Νέο μήνυμα από Αρτοποιείο Μελίσσι', 'Ζήτησαν ένα επιπλέον γύρισμα την άλλη εβδομάδα.', '/app/messages/' || v_clients[1],
      interval '2 hours', false),
     (11, 'Ο πελάτης άνοιξε την πρόταση', 'Η Κατασκευαστική Θεμέλιο άνοιξε την πρόταση τρεις φορές.', '/app/pipeline/' || v_opps[11],
      interval '5 hours', false),
     (4, 'Νέα κράτηση Γυρίσματος', 'Το Γυμναστήριο Κίνηση Plus ζήτησε Γύρισμα· περιμένει έγκριση.', null::text,
      interval '30 hours', true),
     (3, 'Ληξιπρόθεσμο Τιμολόγιο', 'Το Ξενοδοχείο Γαλάζιο Ακρογιάλι δεν έχει πληρώσει ένα Τιμολόγιο.', '/app/messages/' || v_clients[3],
      interval '3 days', true)) as x (cn, title, body, link, ago, is_read)
   where u.is_active;

  -- ── Γνώση ──
  insert into public.knowledge_sections (name, description, sort, updated_by)
  values ('Οδηγοί παραγωγής (επίδειξη)', 'Πώς δουλεύουμε από το γύρισμα ως την παράδοση.',
          coalesce((select max(s.sort) from public.knowledge_sections s), 0) + 1, v_owner)
  returning id into v_section;
  for r in
    select * from (values
      (1, 'Λίστα ελέγχου πριν το γύρισμα', 'Τι ελέγχουμε την προηγούμενη μέρα.',
       E'## Την προηγούμενη μέρα\n\n- Μπαταρίες και κάρτες φορτισμένες\n- Δελτίο Γυρίσματος διαβασμένο\n- Επιβεβαίωση ώρας με τον πελάτη\n\n## Τη μέρα του γυρίσματος\n\nΦτάνουμε 20 λεπτά νωρίτερα για στήσιμο.', 'published'),
      (2, 'Πώς στέλνουμε Έκδοση για έγκριση', 'Από τον έλεγχο της ομάδας ως τον πελάτη.',
       E'Κάθε Έκδοση περνά πρώτα από έλεγχο. Μετά στέλνεται στον πελάτη με σύνδεσμο Drive ή Vimeo.\n\nΟ πελάτης απαντά «Εγκρίνω» ή ζητά αλλαγές.', 'published'),
      (3, 'Ονόματα αρχείων και φάκελοι', 'Ένας κανόνας για όλα τα έργα.',
       E'`ΠΕΛΑΤΗΣ_ΕΡΓΟ_ΗΜΕΡΟΜΗΝΙΑ_v01`. Οι τελικές εκδόσεις μπαίνουν στον φάκελο «Τελικά».', 'published'),
      (4, 'Τι κάνουμε όταν βρέχει', 'Εναλλακτικά πλάνα για εξωτερικά γυρίσματα.',
       E'Αν η πρόγνωση δείχνει βροχή, προτείνουμε εσωτερικό χώρο ή μετάθεση μέσα στην ίδια Περίοδο.', 'published'),
      (5, 'Πρότυπο μηνύματος για νέο πελάτη', 'Πρόχειρο, δεν έχει δημοσιευθεί.',
       E'Καλωσορίσατε! Σε αυτό το μήνυμα θα βρείτε τα επόμενα βήματα.', 'draft')
    ) as t (n, title, summary, body, status)
    order by n
  loop
    insert into public.knowledge_items (section_id, kind, title, summary, body_md, status, published_at, created_at,
                                        created_by, updated_at, updated_by)
    values (v_section, 'article', r.title, r.summary, r.body, r.status,
            case when r.status = 'published' then now() - make_interval(days => 10 - r.n) end,
            now() - make_interval(days => 12 - r.n), v_owner, now() - make_interval(days => 10 - r.n), v_owner)
    returning id into v_item;
    insert into public.knowledge_item_audience (item_id, role_id, is_public)
    select v_item, ro.id, false from public.roles ro
     where ro.kind = 'team' or (r.n = 2 and ro.system_key = 'client_full');
  end loop;

  -- ── Βοηθός: συζητήσεις και ερωτήσεις χωρίς απάντηση ──
  insert into public.assistant_conversations (audience, user_id, language, started_at, last_message_at)
  values ('team', v_owner, 'el', now() - interval '2 days', now() - interval '2 days' + interval '3 minutes')
  returning id into v_conv;
  insert into public.assistant_messages (conversation_id, role, content, sources, no_source, created_at)
  select v_conv, 'user', 'Τι ελέγχουμε την προηγούμενη μέρα του γυρίσματος;', '[]'::jsonb, false, now() - interval '2 days';
  insert into public.assistant_messages (conversation_id, role, content, sources, no_source, created_at)
  select v_conv, 'assistant', 'Φορτισμένες μπαταρίες και κάρτες, διαβασμένο Δελτίο Γυρίσματος και επιβεβαίωση ώρας με τον πελάτη.',
         jsonb_build_array(jsonb_build_object('kind', 'item', 'id', k.id, 'title', k.title)), false,
         now() - interval '2 days' + interval '3 minutes'
    from public.knowledge_items k where k.section_id = v_section and k.title = 'Λίστα ελέγχου πριν το γύρισμα';
  insert into public.assistant_conversations (audience, language, started_at, last_message_at)
  values ('public', 'el', now() - interval '1 day', now() - interval '1 day' + interval '1 minute')
  returning id into v_conv;
  for r in
    select * from (values (1, 'Πόσο κοστίζει ένα βίντεο για γάμο;'), (2, 'Κάνετε γυρίσματα και Σαββατοκύριακο;')) as t (n, q)
  loop
    insert into public.assistant_messages (conversation_id, role, content, no_source, created_at)
    values (v_conv, 'user', r.q, false, now() - interval '1 day' + make_interval(secs => r.n * 20))
    returning id into v_item;
    insert into public.assistant_messages (conversation_id, role, content, no_source, created_at)
    values (v_conv, 'assistant', 'Δεν βρήκα απάντηση σε αυτό. Γράψτε μας στη φόρμα επικοινωνίας και θα σας απαντήσουμε.',
            true, now() - interval '1 day' + make_interval(secs => r.n * 20 + 5));
    insert into public.assistant_unanswered (question, question_norm, audience, count, first_asked_at, last_asked_at)
    values (r.q, authz.assistant_norm(r.q), 'public', 1, now() - interval '1 day', now() - interval '1 day')
    returning id into v_unans;
    insert into public.assistant_unanswered_asks (unanswered_id, conversation_id, message_id, question, question_norm, asked_at)
    values (v_unans, v_conv, v_item, r.q, authz.assistant_norm(r.q), now() - interval '1 day');
  end loop;

  -- ── Συνδρομές ──
  insert into public.subscriptions (provider, covers, plan, monthly_cost, currency, renews_on, account, paid_by)
  values ('Αποθήκευση αρχείων (επίδειξη)', 'Φάκελοι πελατών και τελικά αρχεία', 'Business 5 TB', 18, 'EUR', v_today + 20,
          'Λογαριασμός εταιρείας', 'Κάρτα εταιρείας'),
         ('Μουσική βιβλιοθήκη (επίδειξη)', 'Άδειες μουσικής για reels', 'Ετήσιο', 12.5, 'EUR', v_today + 45,
          'Λογαριασμός εταιρείας', 'Κάρτα εταιρείας');

  -- ── Κατάλογος γραμμών επίδειξης και άνοιγμα των triggers ──
  foreach v_table in array v_tables loop
    v_pk := authz.demo_pk_expr(v_table, 'x');
    execute format(
      'insert into public.demo_rows (table_name, row_id) select %L, %s from public.%I x'
      || ' where not exists (select 1 from pg_temp.demo_before b where b.table_name = %L and b.row_id = %s)',
      v_table, v_pk, v_table, v_table, v_pk);
    execute format('alter table public.%I enable trigger user', v_table);
  end loop;
  select coalesce(jsonb_object_agg(x.table_name, x.n), '{}'::jsonb) into v_result
    from (select d.table_name, count(*) as n from public.demo_rows d group by d.table_name) x;
  return v_result;
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function
  authz.demo_pk_expr(text, text), authz.demo_mentions(text), authz.demo_has(text, uuid),
  authz.demo_guard_automation_send(), authz.demo_guard_email_outbox(), authz.demo_guard_agreement_outbox(),
  authz.demo_guard_google_outbox(), authz.demo_bookkeeping_tables(), authz.demo_shared_tables(), authz.demo_referrers(),
  authz.demo_at(date, time), authz.demo_pick(text, integer),
  authz.demo_catalogue_item(text, text, text, text, numeric, numeric, numeric, numeric, jsonb),
  authz.demo_agreement(uuid, text, text, uuid[], integer[], text, date, integer, timestamptz, date, numeric, integer,
                       timestamptz, uuid, date),
  authz.demo_production_cost(uuid, uuid, uuid, boolean),
  authz.demo_filming(uuid, uuid, uuid, timestamptz, numeric, text, text, text, uuid[], uuid, boolean),
  authz.demo_deliverable(uuid, uuid, text, uuid, text, timestamptz, uuid, uuid, text, date),
  authz.demo_seed_tables()
  from public, anon, authenticated;

revoke all on function public.demo_seed(date, text[]), public.demo_purge(boolean) from public, anon, authenticated;
grant execute on function public.demo_seed(date, text[]), public.demo_purge(boolean) to service_role;
