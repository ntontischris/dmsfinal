import Link from "next/link";
import type { ReactNode } from "react";

import { FilterBarFrame } from "./filter-bar-frame";
import {
  currentOf,
  isSet,
  optionsOf,
  type FilterGroup,
} from "./filter-bar-model";
import { FilterOptions } from "./filter-options";
import { FilterSearch } from "./filter-search";

export type { FilterGroup, FilterOption } from "./filter-bar-model";

// Μία ομάδα ως κάρτα: «Ετικέτα [τρέχουσα τιμή] ▾»· η λίστα ανοίγει από κάτω, πάνω από τα αποτελέσματα.
// Με το ίδιο `name` ανοίγει μία κάρτα κάθε φορά (native, χωρίς JS). Η τελευταία ανοίγει προς τα αριστερά.
function FilterCard({
  group,
  name,
  isEnd,
}: {
  group: FilterGroup;
  name?: string;
  isEnd: boolean;
}) {
  const current = currentOf(group);
  return (
    <details
      className="kit-fb-card"
      name={name}
      data-end={isEnd ? "true" : undefined}
    >
      <summary>
        <span className="kit-fb-label">{group.label}</span>
        {current && (
          <span className="kit-fb-chip" data-set={isSet(group)}>
            {current.label}
          </span>
        )}
        <span className="kit-fb-chev" aria-hidden="true" />
      </summary>
      <div className="kit-fb-pop">
        {group.isSearchable ? (
          <FilterSearch
            label={group.label}
            all={group.all}
            options={group.options}
          />
        ) : (
          <FilterOptions options={optionsOf(group)} />
        )}
      </div>
    </details>
  );
}

interface FilterBarProps {
  // Κοινό όνομα των καρτών της σειράς (ανοίγει μία κάθε φορά).
  name?: string;
  label?: string;
  filters: readonly FilterGroup[];
  // Εκεί οδηγεί το «Καθαρισμός φίλτρων»· φαίνεται μόνο όταν κάποιο φίλτρο δεν είναι στο «όλοι».
  clearHref?: string;
  // Ό,τι μπαίνει πρώτο στη σειρά, συνήθως η αναζήτηση της οθόνης (με `kit-fb-search` παίρνει τον ελεύθερο χώρο).
  children?: ReactNode;
}

// Φίλτρα σε μία σειρά καρτών πάνω από τα αποτελέσματα (παραλλαγή 1 του Ιδιοκτήτη): ο πίνακας κρατά όλο το πλάτος.
export function FilterBar({
  name,
  label = "Φίλτρα",
  filters,
  clearHref,
  children,
}: FilterBarProps) {
  const hasActive = filters.some(isSet);
  return (
    <FilterBarFrame label={label}>
      {children}
      {filters.map((group, index) => (
        <FilterCard
          key={group.label}
          group={group}
          name={name}
          isEnd={filters.length > 1 && index === filters.length - 1}
        />
      ))}
      {hasActive && clearHref && (
        <Link className="kit-fb-clear" href={clearHref} scroll={false}>
          Καθαρισμός φίλτρων
        </Link>
      )}
    </FilterBarFrame>
  );
}
