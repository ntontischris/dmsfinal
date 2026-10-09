-- Ο πρώτος Ιδιοκτήτης: μόνο σε σύστημα χωρίς Χρήστες ομάδας, μόνο μία φορά, και μόνο λογαριασμός που προσκλήθηκε.
begin;
select plan(6);

insert into auth.users (id, email, invited_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'first@example.com', now());
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a2', 'second@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'stranger@example.com');

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select is(public.claim_first_owner(), false, 'Λογαριασμός χωρίς πρόσκληση δεν γίνεται Ιδιοκτήτης ούτε σε άδειο σύστημα');
select is(authz.is_team_user(), false, 'Και δεν γίνεται μέλος της ομάδας');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(public.claim_first_owner(), true, 'Ο πρώτος προσκεκλημένος που συνδέεται σε άδειο σύστημα γίνεται Ιδιοκτήτης');
select is(authz.is_owner(), true, 'Έχει πλέον τον Ρόλο Ιδιοκτήτης');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is(public.claim_first_owner(), false, 'Ο δεύτερος δεν γίνεται Ιδιοκτήτης');
select is(authz.is_team_user(), false, 'Και δεν γίνεται ούτε μέλος της ομάδας χωρίς πρόσκληση');

select * from finish();
rollback;
