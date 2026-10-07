# Modules

Ένας φάκελος ανά επιχειρησιακή περιοχή (ADR 0018), π.χ. `sales/`, `agreements/`, `filming/`.

- Μέσα: `actions.ts`, `queries.ts`, `schemas.ts`, Γεγονότα, Δικαιώματα, `components/`.
- **Έξω από το module φαίνεται μόνο το `index.ts`.** Το ελέγχει το `pnpm check:modules`.
- Τα routes (`src/app/`) δεν έχουν λογική: καλούν queries και actions των modules.
- Δεν υπάρχουν φάκελοι ανά ρόλο. Ό,τι διαφέρει ανά ρόλο το αποφασίζουν τα Δικαιώματα.
