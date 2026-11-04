"use client";

import { useState } from "react";

import { FilterOptions } from "./filter-options";
import { matchesQuery, type FilterOption } from "./filter-bar-model";

// Κάρτα με πολλές επιλογές (π.χ. Πελάτες): πεδίο αναζήτησης πάνω από τη λίστα· το «όλοι» μένει πάντα.
export function FilterSearch({
  label,
  all,
  options,
}: {
  label: string;
  all?: FilterOption;
  options: readonly FilterOption[];
}) {
  const [query, setQuery] = useState("");
  const shown = options.filter((option) => matchesQuery(option.label, query));
  return (
    <>
      <input
        type="search"
        className="input kit-fb-find"
        aria-label={`Αναζήτηση: ${label}`}
        placeholder="Ψάξε…"
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <FilterOptions options={all ? [all, ...shown] : shown} />
      {shown.length === 0 && <p className="kit-fb-empty">Κανένα αποτέλεσμα</p>}
    </>
  );
}
