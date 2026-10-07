-- Σχήμα για τις συναρτήσεις ελέγχου πρόσβασης (ADR 0018): authz.scope, authz.relates_to, authz.active_client.
-- Οι ίδιες οι συναρτήσεις έρχονται με τους Ρόλους και τα Δικαιώματα. Κανείς δεν γράφει σε αυτό το σχήμα από την εφαρμογή.
create schema if not exists authz;

revoke all on schema authz from public;
grant usage on schema authz to authenticated, service_role;
