-- Διαγραφή Πελάτη που μπήκε κατά λάθος (walkthrough Ιδιοκτήτη, Πελάτες). Κεφ. 2, ADR 0007.
--
-- Αρχές:
--  • Νέο Δικαίωμα clients.delete («Διαγράφει Πελάτες», Εύρος «όλα»). Ο Ιδιοκτήτης το έχει αυτόματα (όλα τα Δικαιώματα
--    ομάδας)· κανένας άλλος έτοιμος Ρόλος δεν το παίρνει. Ο κατάλογος των Ρόλων το διαβάζει από τη βάση.
--  • Σβήνεται μόνο Πελάτης χωρίς πραγματική δουλειά ή χρήμα. Οι λόγοι «δεν σβήνεται» ορίζονται μία φορά
--    (authz.client_delete_block + authz.client_delete_block_text) για την οθόνη (public.client_delete_state) και για τη
--    συνάρτηση (public.client_delete). Δεν σβήνεται αν έχει: Συμφωνία (μέσω Ευκαιρίας), Παραγωγή ή Γύρισμα, Τιμολόγιο,
--    Τιμολογητέο ή Είσπραξη, Μήνυμα ή συνημμένο, Χρήστη πελάτη (και αφαιρεμένο) ή πρόσκληση, email σταλμένο προς τον πελάτη,
--    αίτημα ή ανωνυμοποίηση GDPR, ή αν άλλος Πελάτης συγχωνεύτηκε σε αυτόν. Ένας συγχωνευμένος (αρχειοθετημένος) Πελάτης
--    επίσης δεν σβήνεται: είναι το ίχνος της συγχώνευσης.
--  • Μαζί του σβήνει ό,τι είναι πρόχειρο πωλήσεων και τήρηση βιβλίων γύρω του:
--      Ευκαιρίες, Δραστηριότητες, Αιτήματα πρόσβασης, σήματα «Πιθανό διπλό» (και προς τις δύο μεριές),
--      Γεγονότα (client_id, ή entity_id = ο Πελάτης / μία Ευκαιρία του), Ειδοποιήσεις (client_id, ή σύνδεσμος προς αυτά),
--      «ως πού διάβασα» και σημάδια σύνοψης της Συνομιλίας, Συζητήσεις με τον Βοηθό (on delete cascade).
--    Τα σημάδια αποστολής (automation_sends) που μένουν είναι προς την ομάδα: μένουν στο ιστορικό, χωρίς Πελάτη.
--  • Το Ίχνος δεν αγγίζεται ποτέ. Οι triggers Ίχνους των πινάκων πωλήσεων είναι μόνο insert/update, οπότε η συνάρτηση γράφει
--    μία γραμμή 'delete' για τον Πελάτη, με τη γραμμή του στο «πριν».
--  • Το ιστορικό Δραστηριοτήτων δέχεται μόνο προσθήκες: η authz.guard_activity αφήνει σβήσιμο μόνο όσο ισχύει το
--    clients.deleting της συναλλαγής (ίδιο σχήμα με το sales.merging).
--  • Η γραμμή του Πελάτη κλειδώνει (for update) πριν από τον έλεγχο: νέα δουλειά που μπαίνει ταυτόχρονα περιμένει και μετά
--    αποτυγχάνει στο foreign key, αντί να μείνει ορφανή.

-- ───────────── Δικαίωμα ─────────────

insert into public.permissions (code, kind, area, label, scopes, sort) values
  ('clients.delete', 'team', 'Πελάτες και Πωλήσεις', 'Διαγράφει Πελάτες', '{all}', 14);

-- ───────────── Ιστορικό Δραστηριοτήτων: σβήσιμο μόνο μαζί με τον Πελάτη ─────────────
-- Ίδιο με τον αρχικό ορισμό (20261008120000_sales_clients_and_opportunities.sql), με μία προσθήκη: το DELETE περνά όσο η
-- public.client_delete έχει ανάψει το clients.deleting.

create or replace function authz.guard_activity() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  is_merging boolean := coalesce(current_setting('sales.merging', true), '') = 'on';
  is_deleting boolean := coalesce(current_setting('clients.deleting', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    new.client_id := (select o.client_id from public.opportunities o where o.id = new.opportunity_id);
    new.occurred_at := now();
    if new.kind_id is not null
       and not exists (select 1 from public.sales_activity_kinds k where k.id = new.kind_id and k.retired_at is null) then
      raise exception 'Το είδος Δραστηριότητας έχει αποσυρθεί' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if tg_op = 'UPDATE' and is_merging
     and (to_jsonb(new) - 'client_id') = (to_jsonb(old) - 'client_id') then
    return new;
  end if;
  if tg_op = 'DELETE' and is_deleting then
    return old;
  end if;
  raise exception 'Το ιστορικό δέχεται μόνο προσθήκες' using errcode = 'P0001';
end;
$$;

-- ───────────── Γιατί δεν σβήνεται ─────────────

-- Ο λόγος που ο Πελάτης δεν σβήνεται, ή null. Ο ένας ορισμός για την οθόνη και για τη συνάρτηση.
create function authz.client_delete_block(p_client uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when not exists (select 1 from public.clients c where c.id = p_client) then 'not_found'
    when exists (select 1 from public.clients c where c.id = p_client and c.archived_at is not null) then 'archived'
    when exists (select 1 from public.agreements a join public.opportunities o on o.id = a.opportunity_id
                  where o.client_id = p_client) then 'agreement'
    when exists (select 1 from public.productions p where p.client_id = p_client)
      or exists (select 1 from public.filmings f where f.client_id = p_client) then 'production'
    when exists (select 1 from public.invoices i where i.client_id = p_client)
      or exists (select 1 from public.billables b where b.client_id = p_client)
      or exists (select 1 from public.receipts r where r.client_id = p_client) then 'money'
    when exists (select 1 from public.messages m where m.client_id = p_client)
      or exists (select 1 from public.message_attachment_slots s where s.client_id = p_client) then 'chat'
    when exists (select 1 from public.client_users cu where cu.client_id = p_client)
      or exists (select 1 from public.invitations i where i.client_id = p_client) then 'client_users'
    -- Email προς τον πελάτη: παραλήπτης που δεν είναι Χρήστης ομάδας (Επισκέπτης ή Χρήστης πελάτη).
    when exists (select 1 from public.automation_sends s
                  where s.client_id = p_client and s.channel = 'email'
                    and not exists (select 1 from public.team_users t where t.user_id::text = s.recipient_key)) then 'email'
    when exists (select 1 from public.gdpr_requests g where g.subject_client_id = p_client)
      or exists (select 1 from public.gdpr_anonymizations g where g.client_id = p_client) then 'gdpr'
    when exists (select 1 from public.clients x where x.merged_into_id = p_client) then 'merged_target'
  end;
$$;

create function authz.client_delete_block_text(p_block text) returns text
language sql immutable set search_path = ''
as $$
  select case p_block
    when 'not_found' then 'Ο Πελάτης δεν βρέθηκε'
    when 'archived' then 'Ο Πελάτης έχει συγχωνευτεί σε άλλον'
    when 'agreement' then 'Έχει Συμφωνία'
    when 'production' then 'Έχει Παραγωγή ή Γύρισμα'
    when 'money' then 'Έχει Τιμολόγια ή Εισπράξεις'
    when 'chat' then 'Έχει Συνομιλία'
    when 'client_users' then 'Έχει Χρήστες πελάτη ή προσκλήσεις'
    when 'email' then 'Του έχουν σταλεί email'
    when 'gdpr' then 'Έχει αίτημα GDPR'
    when 'merged_target' then 'Άλλος Πελάτης συγχωνεύτηκε σε αυτόν'
  end;
$$;

-- ───────────── Οθόνη: σβήνεται ή γιατί όχι ─────────────

-- { canDelete, deleteBlock }: deleteBlock = το ελληνικό κείμενο του λόγου, ή null όταν σβήνεται.
create function public.client_delete_state(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_block text;
begin
  perform authz.require('clients.delete');
  v_block := authz.client_delete_block(p_id);
  return jsonb_build_object('canDelete', v_block is null, 'deleteBlock', authz.client_delete_block_text(v_block));
end;
$$;

-- ───────────── Διαγραφή ─────────────

-- Η σειρά: Δικαίωμα, ύπαρξη, όνομα, λόγος «δεν σβήνεται», και μετά όλα μαζί στην ίδια συναλλαγή.
create function public.client_delete(p_id uuid, p_confirm_name text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_client public.clients;
  v_block text;
  v_opps uuid[];
  v_ids uuid[];
begin
  perform authz.require('clients.delete');
  select * into v_client from public.clients c where c.id = p_id for update;
  if not found then
    raise exception 'Ο Πελάτης δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if p_confirm_name is null or btrim(p_confirm_name) <> btrim(v_client.name) then
    raise exception 'Γράψε ακριβώς το όνομα του Πελάτη' using errcode = 'P0001';
  end if;
  v_block := authz.client_delete_block(p_id);
  if v_block is not null then
    raise exception '%', authz.client_delete_block_text(v_block) using errcode = 'P0001';
  end if;

  select coalesce(array_agg(o.id), '{}') into v_opps from public.opportunities o where o.client_id = p_id;
  v_ids := v_opps || p_id;

  perform set_config('clients.deleting', 'on', true);
  -- Τήρηση βιβλίων: Ειδοποιήσεις και Γεγονότα (τα σημάδια αποστολής κρατούν το Γεγονός με on delete set null).
  delete from public.notifications n
   where n.client_id = p_id
      or exists (select 1 from unnest(v_ids) x (id) where position(x.id::text in coalesce(n.link, '')) > 0);
  delete from public.events e where e.client_id = p_id or e.entity_id = any (v_ids);
  update public.automation_sends s set client_id = null where s.client_id = p_id;
  delete from public.message_reads r where r.client_id = p_id;
  delete from public.message_digest_marks d where d.client_id = p_id;
  -- Πρόχειρο πωλήσεων.
  delete from public.access_requests a where a.client_id = p_id or a.opportunity_id = any (v_opps);
  delete from public.opportunity_activities a where a.client_id = p_id or a.opportunity_id = any (v_opps);
  delete from public.client_duplicate_flags f where f.client_id = p_id or f.matches_client_id = p_id;
  delete from public.opportunities o where o.client_id = p_id;
  -- Οι Συζητήσεις με τον Βοηθό φεύγουν μαζί (on delete cascade).
  delete from public.clients c where c.id = p_id;
  perform set_config('clients.deleting', 'off', true);

  insert into public.audit_log (actor_id, action, entity, entity_id, before)
  values (auth.uid(), 'delete', 'clients', p_id::text, to_jsonb(v_client));
end;
$$;

-- ───────────── Δικαιώματα ─────────────

revoke all on function authz.client_delete_block(uuid), authz.client_delete_block_text(text)
  from public, anon, authenticated;

revoke all on function public.client_delete_state(uuid), public.client_delete(uuid, text) from public, anon;
grant execute on function public.client_delete_state(uuid), public.client_delete(uuid, text) to authenticated;
