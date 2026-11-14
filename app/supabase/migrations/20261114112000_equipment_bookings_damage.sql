-- Εξοπλισμός (L2, c10): ποιο αντικείμενο είναι ελεύθερο σε μια μέρα, το επόμενο Γύρισμα κάθε αντικειμένου στο μητρώο,
-- και σήμανση βλάβης από τη σελίδα του Γυρίσματος.
--
-- Αρχές:
--  • equipment_bookings_view(p_now): οι ανοιχτές Δεσμεύσεις (αναμένει, προγραμματισμένο) που δεν έχουν τελειώσει.
--    Το μητρώο (F1) βγάζει από εκεί το «Επόμενο Γύρισμα» και το «Ελεύθερο στις». Ο σύνδεσμος στο Γύρισμα μόνο όσοι το βλέπουν,
--    όπως στη σελίδα αντικειμένου (equipment_item_view).
--  • filming_equipment_report_damage: όποιος γράφει τα στοιχεία του Γυρίσματος (κλείνει, Συνεργείο, εγκρίνει) σημειώνει ότι
--    ένα δεσμευμένο αντικείμενο χάλασε. Γίνεται «Σε επισκευή» με τον λόγο, και το Ίχνος του αντικειμένου γράφει
--    «status_changed» με το Γύρισμα. Επιστροφή σε «Διαθέσιμο» μόνο από όποιον «Διαχειρίζεται απόθεμα» (F2).

create function public.equipment_bookings_view(p_now timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
begin
  perform authz.require('equipment.view');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'itemId', fe.item_id,
             'filmingId', case when authz.can_see_filming(f.id) then f.id end,
             'startsAt', f.starts_at, 'hours', f.hours, 'state', f.state
           ) order by f.starts_at, f.id, fe.item_id)
      from public.filming_equipment fe
      join public.filmings f on f.id = fe.filming_id
     where f.state in ('pending', 'scheduled')
       and authz.filming_end(f.starts_at, f.hours) >= v_now
  ), '[]'::jsonb);
end;
$$;

create function public.filming_equipment_report_damage(p_filming uuid, p_item uuid, p_note text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_from text;
begin
  if not authz.is_team_user() then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  perform authz.filming_gate(p_filming,
    authz.can_book_filming(p_filming) or authz.can_crew_filming(p_filming) or authz.can_approve_filming(), 'filming.book');
  if not exists (select 1 from public.filming_equipment fe where fe.filming_id = p_filming and fe.item_id = p_item) then
    raise exception 'Το αντικείμενο δεν είναι δεσμευμένο σε αυτό το Γύρισμα' using errcode = 'P0001';
  end if;
  if v_note is null then
    raise exception 'Γράψε τι έπαθε το αντικείμενο' using errcode = 'P0001';
  end if;
  if length(v_note) > 500 then
    raise exception 'Πολύ μεγάλο κείμενο' using errcode = 'P0001';
  end if;
  select i.status into v_from from public.equipment_items i where i.id = p_item for update;
  if v_from = 'in_repair' then
    raise exception 'Το αντικείμενο είναι ήδη σε επισκευή' using errcode = 'P0001';
  end if;
  if v_from = 'retired' then
    raise exception 'Το αντικείμενο έχει αποσυρθεί' using errcode = 'P0001';
  end if;
  update public.equipment_items i set status = 'in_repair', status_note = v_note where i.id = p_item;
  perform authz.equipment_event(p_item, 'status_changed',
    jsonb_build_object('from', v_from, 'to', 'in_repair', 'note', v_note, 'filmingId', p_filming));
end;
$$;

revoke all on function public.equipment_bookings_view(timestamptz) from public, anon;
grant execute on function public.equipment_bookings_view(timestamptz) to authenticated;

revoke all on function public.filming_equipment_report_damage(uuid, uuid, text) from public, anon;
grant execute on function public.filming_equipment_report_damage(uuid, uuid, text) to authenticated;
