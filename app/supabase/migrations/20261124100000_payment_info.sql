-- «Πώς πληρώνω» (Τ3): ο προεπιλεγμένος λογαριασμός τραπέζης και τα στοιχεία επικοινωνίας της εταιρείας, σε μία
-- ανάγνωση. Ο Χρήστης πελάτη δεν διαβάζει τους πίνακες bank_accounts και company_settings (RLS μόνο για την ομάδα)·
-- εδώ παίρνει μόνο όσα χρειάζεται για να πληρώσει: δικαιούχο, τράπεζα, IBAN, όνομα, τηλέφωνο, email.
-- Ποιος: μέλος ομάδας, ή Χρήστης πελάτη με «Βλέπει Οικονομικά». Όλοι οι άλλοι 42501.
-- { bank: { holder, bank, iban } | null, company: { name, phone, email } }

create function public.payment_info() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (authz.is_team_user() or authz.client_user_has('c.finance')) then
    raise exception 'Δεν έχεις Δικαίωμα για αυτή την ενέργεια' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'bank', (select jsonb_build_object('holder', b.holder, 'bank', b.bank_name, 'iban', b.iban)
               from public.bank_accounts b
              where b.is_default and b.retired_at is null
              limit 1),
    'company', coalesce((select jsonb_build_object(
                                  'name', coalesce(nullif(c.trade_name, ''), c.legal_name),
                                  'phone', c.phone,
                                  'email', c.email)
                           from public.company_settings c
                          where c.id),
                        jsonb_build_object('name', '', 'phone', '', 'email', ''))
  );
end;
$$;

revoke all on function public.payment_info() from public, anon;
grant execute on function public.payment_info() to authenticated;
