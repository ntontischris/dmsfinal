-- Εξοπλισμός: ποσότητα στη δημιουργία (#123). Κάθε φυσική μονάδα μένει αντικείμενο· η ποσότητα είναι μόνο τρόπος εγγραφής.
--  • Ποσότητα 1 = ακριβώς το equipment_item_create (χωρίς suffix).
--  • Ποσότητα N (2–50): «<Όνομα> #1» … «#N» και, αν δόθηκε κωδικός, «<Κωδικός>-1» … «-N».
--  • Μία συναλλαγή: όλες ή καμία. Η μοναδικότητα ονόματος ελέγχεται πριν γραφτεί κάτι.
--  • Το Ίχνος γράφει μία εγγραφή ανά μονάδα (το audit trigger του μητρώου, όπως στη equipment_item_create).

create function public.equipment_items_create_many(
  p_category_id uuid, p_name text, p_code text, p_note text, p_quantity integer
) returns uuid[]
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_code text := nullif(trim(coalesce(p_code, '')), '');
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_ids uuid[] := '{}';
  v_id uuid;
  v_unit integer;
begin
  perform authz.require('equipment.manage');
  if length(v_name) = 0 then
    raise exception 'Το αντικείμενο θέλει όνομα' using errcode = 'P0001';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 50 then
    raise exception 'Η Ποσότητα είναι από 1 ως 50' using errcode = 'P0001';
  end if;
  perform 1 from public.equipment_categories c where c.id = p_category_id;
  if not found then
    raise exception 'Η Κατηγορία δεν βρέθηκε' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.equipment_categories c where c.id = p_category_id and c.retired_at is not null) then
    raise exception 'Η Κατηγορία έχει αποσυρθεί, δεν δέχεται νέα αντικείμενα' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from generate_series(1, p_quantity) as unit (n)
     where exists (
       select 1 from public.equipment_items i
        where lower(i.name) = lower(case when p_quantity = 1 then v_name else v_name || ' #' || unit.n end)
     )
  ) then
    raise exception 'Υπάρχει ήδη αντικείμενο με αυτό το όνομα' using errcode = 'P0001';
  end if;
  begin
    for v_unit in 1..p_quantity loop
      insert into public.equipment_items (category_id, name, code, note)
      values (
        p_category_id,
        case when p_quantity = 1 then v_name else v_name || ' #' || v_unit end,
        case when p_quantity = 1 or v_code is null then v_code else v_code || '-' || v_unit end,
        v_note
      )
      returning id into v_id;
      v_ids := v_ids || v_id;
    end loop;
  exception when unique_violation then
    raise exception 'Υπάρχει ήδη αντικείμενο με αυτό το όνομα' using errcode = 'P0001';
  end;
  return v_ids;
end;
$$;

revoke all on function
  public.equipment_items_create_many(uuid, text, text, text, integer)
  from public, anon, authenticated;

grant execute on function
  public.equipment_items_create_many(uuid, text, text, text, integer)
  to authenticated;
