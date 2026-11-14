-- b14: ο Κατάλογος «μαθαίνει» από τις πραγματικές ώρες. Μέσος όρος των επιβεβαιωμένων ωρών (γύρισμα, μοντάζ) ανά Πακέτο
-- ή Υπηρεσία, δίπλα στην εκτίμηση της Σελίδας Πακέτου (C2).
--  • Μετράνε μόνο Παραγωγές Συμφωνιών που έχουν μία μόνο γραμμή, αυτό το στοιχείο: αλλιώς οι ώρες της Παραγωγής δεν
--    μοιράζονται με σιγουριά ανάμεσα στις γραμμές.
--  • Οι ώρες διαιρούνται με την ποσότητα της γραμμής, ώστε να συγκρίνονται με τις ώρες ανά μονάδα του Καταλόγου.
--  • Μόνο επιβεβαιωμένες ώρες (G3), χωρίς ακυρωμένες Παραγωγές. Μόνο για όσους «Βλέπουν κόστος».

create function public.catalogue_item_actual_hours(p_item uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not coalesce(authz.has('finance.cost'), false) then
    raise exception 'Δεν έχεις δικαίωμα να δεις το κόστος' using errcode = '42501';
  end if;
  with single as (
    select l.agreement_id, l.quantity
      from public.agreement_lines l
     where l.item_id = p_item
       and not exists (
         select 1 from public.agreement_lines o where o.agreement_id = l.agreement_id and o.id <> l.id)
  ), hours as (
    select case when pc.shoot_confirmed_at is not null then pc.shoot_hours / s.quantity end as shoot,
           case when pc.edit_confirmed_at is not null then pc.edit_hours / s.quantity end as edit
      from single s
      join public.productions p on p.agreement_id = s.agreement_id and p.state <> 'cancelled'
      join public.production_costs pc on pc.production_id = p.id
  )
  select jsonb_build_object(
           'shoot', round(avg(h.shoot), 1), 'shootCount', count(h.shoot),
           'edit', round(avg(h.edit), 1), 'editCount', count(h.edit))
    into v_result
    from hours h;
  return v_result;
end;
$$;

revoke all on function public.catalogue_item_actual_hours(uuid) from public, anon, authenticated;
grant execute on function public.catalogue_item_actual_hours(uuid) to authenticated;
