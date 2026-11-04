-- Ταχύτητα των ελέγχων Δικαιωμάτων (20261106100000_authz_plpgsql). Η συμπεριφορά τους ελέγχεται στα υπόλοιπα tests·
-- εδώ φυλάμε μόνο ότι δεν ξαναγίνονται `language sql`, που η Postgres 17 σχεδιάζει από την αρχή σε κάθε κλήση.
begin;
select plan(3);

select is(
  (select array_agg(p.proname::text order by p.proname)
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     join pg_language l on l.oid = p.prolang
    where n.nspname = 'authz'
      and p.proname in ('has', 'scope', 'user_scope', 'user_is_team', 'user_is_owner', 'is_team_user', 'is_owner',
                        'can_see_client', 'can_see_opportunity_row', 'can_see_agreement', 'can_see_filming')
      and l.lanname <> 'plpgsql'),
  null,
  'Οι βασικοί έλεγχοι Δικαιωμάτων είναι plpgsql'
);

-- Νέα συνάρτηση authz μίας εντολής σε `language sql` (stable): γράψ' την plpgsql, όπως η μετατροπή της migration.
select is(
  (select array_agg(p.proname::text order by p.proname)
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
      and regexp_replace(p.prosrc, ';\s*$', '') not like '%;%'),
  null,
  'Καμία stable συνάρτηση authz μίας εντολής δεν έμεινε language sql'
);

select ok(
  (select p.prosecdef and p.proconfig = array['search_path=""']
     from pg_proc p where p.oid = 'authz.has(text)'::regprocedure),
  'Η μετατροπή κράτησε security definer και κενό search_path'
);

select * from finish();
rollback;
