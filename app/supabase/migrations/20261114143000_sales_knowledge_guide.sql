-- «Οδηγός πωλήσεων» (b15): μια Ενότητα της Γνώσης που ανοίγει από τον χώρο Πωλήσεων (Πελάτες, Pipeline).
-- Ποια Ενότητα είναι, το διαλέγει όποιος «Διαχειρίζεται Ρυθμίσεις» (Ρυθμίσεις › Πωλήσεις)· το περιεχόμενο και το Κοινό
-- κάθε στοιχείου τα γράφει η Διαχείριση Γνώσης, όπως σε κάθε Ενότητα. Δεν σπέρνουμε Ενότητα: τη φτιάχνει ο Ιδιοκτήτης.
-- Αν η Ενότητα διαγραφεί, ο δείκτης αδειάζει και ο σύνδεσμος κρύβεται.

alter table public.sales_settings
  add column knowledge_section_id uuid references public.knowledge_sections (id) on delete set null;

-- Ο έλεγχος του προσώπου της φόρμας τρέχει μόνο όταν αλλάζει το πρόσωπο: αλλιώς το άδειασμα του δείκτη
-- (διαγραφή Ενότητας) θα σκόνταφτε σε πρόσωπο που έχασε στο μεταξύ το Δικαίωμα.
create or replace function authz.guard_sales_settings() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.form_assignee_id is not null
     and new.form_assignee_id is distinct from old.form_assignee_id
     and authz.user_scope(new.form_assignee_id, 'clients.manage') is null then
    raise exception 'Ευκαιρίες από τη φόρμα μπορεί να πάρει μόνο ενεργός Χρήστης ομάδας που διαχειρίζεται Πελάτες και Ευκαιρίες'
      using errcode = 'P0001';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

-- Οι Ενότητες για την επιλογή (ο πίνακας της Γνώσης είναι κλειστός): [{ id, name }] κατά τη σειρά τους.
create function public.sales_guide_sections() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not authz.has('settings.manage') then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) order by s.sort, s.id)
      from public.knowledge_sections s), '[]'::jsonb);
end;
$$;

revoke all on function public.sales_guide_sections() from public, anon, authenticated;
grant execute on function public.sales_guide_sections() to authenticated;
