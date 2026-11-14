-- Η δημόσια φόρμα ενδιαφέροντος της Ιστοσελίδας (b4). Το endpoint `POST /api/forms/interest` (Zod + honeypot) καλεί,
-- ως ανώνυμος, το `public.sales_web_form`: όριο ρυθμού, έλεγχος στοιχείων και μετά η υπάρχουσα είσοδος
-- `sales_intake_form` (ταίριασμα Πελάτη, διαδρομή «Νέες Ευκαιρίες από τη φόρμα πάνε σε», Πηγή «Ιστοσελίδα»).
-- Το γεγονός `opportunity.form_submitted` το βγάζει ο trigger της Ευκαιρίας (λωρίδα ειδοποιήσεων), όχι εδώ.
-- Χωρίς service role: η συνάρτηση είναι security definer και η μόνη πόρτα του ανώνυμου.

-- Οι υποβολές, μόνο για το όριο ρυθμού: hash της διεύθυνσης και ώρα. Κανείς δεν τις διαβάζει (RLS χωρίς πολιτικές).
create table public.sales_web_form_hits (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index sales_web_form_hits_ip_idx on public.sales_web_form_hits (ip_hash, created_at desc);
create index sales_web_form_hits_created_idx on public.sales_web_form_hits (created_at);

alter table public.sales_web_form_hits enable row level security;
revoke all on table public.sales_web_form_hits from anon, authenticated;

-- Ο έλεγχος και η καταχώριση, με ρητό «τώρα» για τα τεστ. Δεν δίνεται σε κανέναν ρόλο.
-- Απαντά {status: 'ok'} | {status: 'invalid', field} | {status: 'rate_limited'}.
create function authz.sales_web_form_at(p_form jsonb, p_ip text, p_now timestamptz) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_hash text := encode(sha256(convert_to('web-form:' || coalesce(nullif(trim(p_ip), ''), 'unknown'), 'UTF8')), 'hex');
  v_name text := left(trim(coalesce(p_form ->> 'name', '')), 120);
  v_contact text := left(trim(coalesce(p_form ->> 'contact_name', '')), 120);
  v_email text := lower(trim(coalesce(p_form ->> 'contact_email', '')));
  v_phone text := left(trim(coalesce(p_form ->> 'contact_phone', '')), 40);
  v_message text := left(regexp_replace(trim(coalesce(p_form ->> 'message', '')), '\s+', ' ', 'g'), 300);
begin
  -- Όριο: 3 ανά 10′ και 10 ανά ημέρα από την ίδια διεύθυνση· 60 την ώρα συνολικά (η διεύθυνση έρχεται από το endpoint).
  delete from public.sales_web_form_hits h where h.created_at < p_now - interval '2 days';
  if (select count(*) from public.sales_web_form_hits h
       where h.ip_hash = v_hash and h.created_at > p_now - interval '10 minutes') >= 3
     or (select count(*) from public.sales_web_form_hits h
          where h.ip_hash = v_hash and h.created_at > p_now - interval '1 day') >= 10
     or (select count(*) from public.sales_web_form_hits h where h.created_at > p_now - interval '1 hour') >= 60 then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  insert into public.sales_web_form_hits (ip_hash, created_at) values (v_hash, p_now);

  if length(v_contact) = 0 then
    return jsonb_build_object('status', 'invalid', 'field', 'contact_name');
  end if;
  if length(v_email) > 200 or v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object('status', 'invalid', 'field', 'contact_email');
  end if;
  perform public.sales_intake_form(
    jsonb_build_object('name', coalesce(nullif(v_name, ''), v_contact), 'contact_name', v_contact,
                       'contact_email', v_email, 'contact_phone', v_phone),
    'Ενδιαφέρον από την Ιστοσελίδα',
    case when v_message = '' then null else 'Απάντησε στο μήνυμα της φόρμας: «' || v_message || '»' end,
    (p_now at time zone 'Europe/Athens')::date + 1);
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Η πόρτα του ανώνυμου: πάντα με το τρέχον «τώρα» (δεν το ορίζει ο καλών).
create function public.sales_web_form(p_form jsonb, p_ip text) returns jsonb
language sql security definer set search_path = ''
as $$ select authz.sales_web_form_at(p_form, p_ip, now()); $$;

revoke all on function authz.sales_web_form_at(jsonb, text, timestamptz) from public, anon, authenticated;
revoke all on function public.sales_web_form(jsonb, text) from public, anon, authenticated;
grant execute on function public.sales_web_form(jsonb, text) to anon;
