-- Θεμέλιο της βάσης (κεφ. 7, ADR 0018). Τρέχει σε κάθε PR με `supabase test db`.
begin;
select plan(3);

select has_schema('authz', 'Υπάρχει το σχήμα των ελέγχων πρόσβασης');

select ok(
  not has_schema_privilege('anon', 'authz', 'usage'),
  'Ο ανώνυμος επισκέπτης δεν βλέπει το σχήμα authz'
);

-- Κάθε πίνακας του public έχει RLS: κανένας πίνακας δεν είναι ανοιχτός χωρίς κανόνες.
select is_empty(
  $$ select c.relname
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
        and not c.relrowsecurity $$,
  'Κάθε πίνακας του public έχει RLS'
);

select * from finish();
rollback;
