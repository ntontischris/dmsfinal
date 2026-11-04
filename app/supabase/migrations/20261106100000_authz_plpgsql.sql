-- Ταχύτητα (2026-11-05): οι βοηθητικές συναρτήσεις Δικαιωμάτων του σχήματος authz γίνονται plpgsql, με το ίδιο σώμα.
--
-- Γιατί: μια συνάρτηση `language sql` με `security definer` και `set search_path` δεν «ενσωματώνεται» στο ερώτημα
-- που την καλεί, και η Postgres 17 τη σχεδιάζει από την αρχή σε κάθε κλήση. Ένας έλεγχος Δικαιώματος (authz.has)
-- περνάει από 3–4 τέτοιες συναρτήσεις, και μια λίστα κάνει χιλιάδες ελέγχους: μετρημένο στην παραγωγή, 1.000
-- κλήσεις της authz.user_scope = 360ms. Η plpgsql κρατάει τα σχέδιά της για όλη τη σύνδεση: ίδιες 1.000 κλήσεις = 46ms.
--
-- Τι αλλάζει: μόνο η γλώσσα. Το σώμα, τα ορίσματα, ο τύπος επιστροφής, το stable, το security definer, το strict,
-- το search_path, τα δικαιώματα εκτέλεσης και τα σχόλια μένουν ίδια.
--  • `#variable_conflict use_column`: όπως στη `language sql`, όταν ένα όρισμα έχει το όνομα στήλης κερδίζει η στήλη.
--  • Η sql επιστρέφει την πρώτη γραμμή (ή null). Το ίδιο κάνει το `(select … limit 1)`, με την ίδια μετατροπή τύπου.
-- Μένουν sql: οι συναρτήσεις λίστας (το `return query` της plpgsql θέλει ακριβώς ίδιους τύπους στηλών, η sql τους
-- μετατρέπει), όσες έχουν πολλές εντολές, σώμα `begin atomic`, ή άλλες ρυθμίσεις από το `search_path = ''`.
-- Η authz.user_scope γράφεται με το χέρι στο τέλος (η πιο συχνή κλήση): οι δύο έλεγχοι μέσα της χωρίς άλλες κλήσεις.

do $convert$
declare
  f record;
  v_body text;
  v_src text;
begin
  for f in
    select p.oid,
           format('%I.%I', n.nspname, p.proname) as fname,
           pg_get_function_arguments(p.oid) as args,
           pg_get_function_result(p.oid) as result,
           p.prosecdef,
           p.proisstrict,
           p.proparallel,
           regexp_replace(p.prosrc, ';\s*$', '') as body
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_language l on l.oid = p.prolang
      join pg_type t on t.oid = p.prorettype
     where n.nspname = 'authz'
       and l.lanname = 'sql'
       and p.provolatile = 's'
       and p.prokind = 'f'
       and coalesce(p.prosrc, '') <> ''
       and p.proconfig = array['search_path=""']
       and not p.proretset
       and t.typtype in ('b', 'd', 'e')
  loop
    v_body := f.body;
    continue when v_body like '%;%' or v_body like '%$fn$%';
    v_src := E'#variable_conflict use_column\nbegin\n  return (select _q.* from (\n' || v_body || E'\n  ) _q limit 1);\nend';
    execute format(
      'create or replace function %s(%s) returns %s language plpgsql stable %s %s %s set search_path = '''' as $fn$%s$fn$',
      f.fname,
      f.args,
      f.result,
      case when f.prosecdef then 'security definer' else 'security invoker' end,
      case when f.proisstrict then 'strict' else 'called on null input' end,
      case f.proparallel when 's' then 'parallel safe' when 'r' then 'parallel restricted' else 'parallel unsafe' end,
      v_src
    );
  end loop;
end;
$convert$;

-- Η πιο συχνή κλήση: ίδια λογική με την αρχική (ενεργό μέλος ομάδας → Ιδιοκτήτης όλα, αλλιώς το ευρύτερο Εύρος των Ρόλων).
create or replace function authz.user_scope(uid uuid, perm text) returns text
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  if not exists (select 1 from public.team_users u where u.user_id = uid and u.is_active) then
    return null;
  end if;
  if exists (
    select 1
      from public.team_user_roles ur
      join public.roles r on r.id = ur.role_id
     where ur.user_id = uid and r.is_owner
  ) then
    return (select 'all' from public.permissions p where p.code = perm and p.kind = 'team');
  end if;
  return (
    select case when bool_or(rp.scope = 'all') then 'all' when bool_or(rp.scope = 'mine') then 'mine' end
      from public.team_user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
     where ur.user_id = uid and rp.permission = perm
  );
end;
$$;
