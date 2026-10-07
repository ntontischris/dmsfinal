-- Ίχνος ενεργειών (κεφ. 7, κεφ. 1): ποιος, πότε, τι, πριν → μετά. Δέχεται μόνο προσθήκες.
-- Γράφεται από triggers (authz.audit_row) και από ενέργειες του server. Κανείς δεν το αλλάζει ή το σβήνει.

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  action text not null check (action in ('insert', 'update', 'delete', 'event')),
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb
);

comment on table public.audit_log is 'Ίχνος ενεργειών: μόνο προσθήκες.';

create index audit_log_entity_idx on public.audit_log (entity, entity_id, at desc);
create index audit_log_at_idx on public.audit_log (at desc);

alter table public.audit_log enable row level security;

-- Καμία αλλαγή και καμία διαγραφή, ούτε από τον service role.
create function authz.reject_audit_change() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Το Ίχνος ενεργειών δέχεται μόνο προσθήκες' using errcode = 'P0001';
end;
$$;

create trigger audit_log_append_only
  before update or delete on public.audit_log
  for each row execute function authz.reject_audit_change();

create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function authz.reject_audit_change();

-- Γράφει μια γραμμή στο Ίχνος για κάθε αλλαγή σε έναν πίνακα.
-- Το όρισμα του trigger είναι η στήλη που ταυτοποιεί τη γραμμή (προεπιλογή: id).
create function authz.audit_row() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  key_column text := coalesce(tg_argv[0], 'id');
  old_row jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_row jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, before, after)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(new_row, old_row) ->> key_column,
    old_row,
    new_row
  );
  return coalesce(new, old);
end;
$$;
