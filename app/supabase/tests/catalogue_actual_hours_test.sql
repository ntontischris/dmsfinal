-- Πραγματικές ώρες ανά Πακέτο (b14): μέσος όρος επιβεβαιωμένων ωρών ανά μονάδα, μόνο από Συμφωνίες μίας γραμμής,
-- και άρνηση σε όποιον δεν «Βλέπει κόστος». Φανταστικοί Χρήστες και στοιχεία· όλα ζουν μέσα στη συναλλαγή.
begin;
select plan(9);

-- e1 Ιδιοκτήτης (βλέπει κόστος) · e3 Πωλήσεις (χωρίς κόστος) · e6 χωρίς ομάδα
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'sales@example.com'),
  ('00000000-0000-0000-0000-0000000000e6', 'client@example.com');
insert into public.team_users (user_id, name, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'Γιώργος', 'owner@example.com'),
  ('00000000-0000-0000-0000-0000000000e3', 'Άννα', 'sales@example.com');
insert into public.team_user_roles (user_id, role_id)
select u.id::uuid, r.id
  from (values
    ('00000000-0000-0000-0000-0000000000e1', 'Ιδιοκτήτης'),
    ('00000000-0000-0000-0000-0000000000e3', 'Πωλήσεις')
  ) as u (id, role_name)
  join public.roles r on r.name = u.role_name and r.kind = 'team';

insert into public.clients (id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id) values
  ('00000000-0000-0000-0000-0000000000f1', 'Κυψέλη Καφέ', '', 'Αθήνα', null, 'Μαρία Παπαδάκη', 'maria@kypseli.example.gr', '210 1111111', '00000000-0000-0000-0000-0000000000e3');
insert into public.opportunities (id, client_id, title, stage_id, source_id, manager_id, next_step, next_step_due)
select o.id::uuid, '00000000-0000-0000-0000-0000000000f1', o.title, (select s.id from public.sales_stages s where s.code = 'proposal'),
       (select s.id from public.sales_sources s where s.code = 'phone'), '00000000-0000-0000-0000-0000000000e3', 'Πρόταση',
       (now() at time zone 'Europe/Athens')::date + 3
  from (values
    ('00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο ένα'),
    ('00000000-0000-0000-0000-0000000000c2', 'Μηνιαίο διπλό'),
    ('00000000-0000-0000-0000-0000000000c3', 'Μηνιαίο με δύο γραμμές')
  ) as o (id, title);

-- d1 μηνιαίο πακέτο (εκτίμηση 6 + 14 ώρες), d2 δεύτερο πακέτο μόνο σε Συμφωνία δύο γραμμών.
insert into public.catalogue_items (id, kind, billing, name, name_en, unit, retired_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'package', 'monthly', 'Μηνιαίο πακέτο (τεστ)', 'Monthly (test)', '', null),
  ('00000000-0000-0000-0000-0000000000d2', 'package', 'monthly', 'Δεύτερο πακέτο (τεστ)', 'Second (test)', '', null);
insert into public.catalogue_item_amounts (item_id, price) values
  ('00000000-0000-0000-0000-0000000000d1', 1000), ('00000000-0000-0000-0000-0000000000d2', 500);
insert into public.catalogue_item_costs (item_id, hours_shoot, hours_edit, direct_cost) values
  ('00000000-0000-0000-0000-0000000000d1', 6, 14, 0), ('00000000-0000-0000-0000-0000000000d2', 4, 6, 0);

-- a1: d1 × 1 · a2: d1 × 2 · a3: d1 + d2 (δεν μετρά: οι ώρες δεν μοιράζονται με σιγουριά). Έναρξη τον επόμενο μήνα.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select set_config('t.start', (date_trunc('month', now() at time zone 'Europe/Athens') + interval '1 month')::date::text, true);

create function public.t_signed(p_opp uuid, p_title text, p_lines jsonb) returns uuid
language plpgsql
as $$
declare
  v_id uuid := public.agreement_create(p_opp, 'monthly', p_title);
  v_line jsonb;
begin
  perform public.agreement_update_basics(v_id, p_title, 'el', current_setting('t.start')::date, null, 6);
  for v_line in select * from jsonb_array_elements(p_lines) loop
    perform public.agreement_add_catalogue_line(v_id, (v_line ->> 'item')::uuid, (v_line ->> 'qty')::integer);
  end loop;
  perform public.agreement_set_recipients(v_id, '[{"name":"Μαρία Παπαδάκη","email":"maria@example.com","is_signatory":true}]'::jsonb);
  perform public.agreement_sign_outside(v_id, (now() at time zone 'Europe/Athens')::date, 'Μαρία Παπαδάκη',
    current_setting('t.start')::date, 'contract.pdf');
  return v_id;
end;
$$;

select set_config('t.a1', public.t_signed('00000000-0000-0000-0000-0000000000c1', 'Μηνιαίο ένα',
  '[{"item":"00000000-0000-0000-0000-0000000000d1","qty":1}]')::text, true);
select set_config('t.a2', public.t_signed('00000000-0000-0000-0000-0000000000c2', 'Μηνιαίο διπλό',
  '[{"item":"00000000-0000-0000-0000-0000000000d1","qty":2}]')::text, true);
select set_config('t.a3', public.t_signed('00000000-0000-0000-0000-0000000000c3', 'Μηνιαίο με δύο γραμμές',
  '[{"item":"00000000-0000-0000-0000-0000000000d1","qty":1},{"item":"00000000-0000-0000-0000-0000000000d2","qty":1}]')::text, true);

-- Ώρες ανά Περίοδο (n). Το a1·3 έχει επιβεβαιωμένο μόνο το γύρισμα, το a1·4 μόνο γραμμένες ώρες χωρίς επιβεβαίωση.
update public.production_costs pc
   set shoot_hours = v.shoot, shoot_confirmed_at = case when v.shoot_ok then now() end,
       edit_hours = v.edit, edit_confirmed_at = case when v.edit_ok then now() end
  from (values
    (current_setting('t.a1'), 1, 8, true, 10, true),
    (current_setting('t.a1'), 2, 6, true, 12, true),
    (current_setting('t.a1'), 3, 7, true, 30, false),
    (current_setting('t.a1'), 4, 50, false, 50, false),
    (current_setting('t.a2'), 1, 10, true, 20, true),
    (current_setting('t.a3'), 1, 100, true, 100, true)
  ) as v (agreement, n, shoot, shoot_ok, edit, edit_ok),
       public.productions p
  join public.agreement_periods ap on ap.id = p.period_id
 where p.agreement_id = v.agreement::uuid and ap.n = v.n and pc.production_id = p.id;

-- ───────────── Ο Ιδιοκτήτης ─────────────
select set_config('t.d1', public.catalogue_item_actual_hours('00000000-0000-0000-0000-0000000000d1')::text, true);
select is((current_setting('t.d1')::jsonb ->> 'shoot')::numeric, 6.5::numeric,
  'Γύρισμα: (8 + 6 + 7 + 10/2) / 4, χωρίς τη Συμφωνία με δύο γραμμές');
select is((current_setting('t.d1')::jsonb ->> 'shootCount')::int, 4, 'Μετρά μόνο τα επιβεβαιωμένα γυρίσματα');
select is((current_setting('t.d1')::jsonb ->> 'edit')::numeric, 10.7::numeric,
  'Μοντάζ: (10 + 12 + 20/2) / 3, στρογγυλεμένο στο δέκατο');
select is((current_setting('t.d1')::jsonb ->> 'editCount')::int, 3, 'Οι ανεπιβεβαίωτες ώρες μοντάζ δεν μετράνε');
select is(
  public.catalogue_item_actual_hours('00000000-0000-0000-0000-0000000000d2'),
  '{"shoot": null, "shootCount": 0, "edit": null, "editCount": 0}'::jsonb,
  'Πακέτο μόνο σε Συμφωνία πολλών γραμμών: χωρίς μέσο όρο'
);

-- ───────────── Αρνήσεις ─────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true);
select throws_ok($$ select public.catalogue_item_actual_hours('00000000-0000-0000-0000-0000000000d1') $$,
  '42501', null, 'Οι Πωλήσεις δεν βλέπουν τις πραγματικές ώρες');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e6","role":"authenticated"}', true);
select throws_ok($$ select public.catalogue_item_actual_hours('00000000-0000-0000-0000-0000000000d1') $$,
  '42501', null, 'Ο Χρήστης χωρίς ομάδα δεν τις βλέπει');
set local role anon;
select throws_ok($$ select public.catalogue_item_actual_hours('00000000-0000-0000-0000-0000000000d1') $$,
  '42501', null, 'Ο ανώνυμος δεν καλεί τη συνάρτηση');
reset role;
set local role authenticated;
select throws_ok($$ select * from public.production_costs $$, '42501', null, 'Ο κλειστός πίνακας κόστους μένει κλειστός');
reset role;

select * from finish();
rollback;
