import Link from "next/link";
import type { ReactNode } from "react";

import { FilterFrame } from "./filter-frame";
import { FilterOptions } from "./filter-options";
import {
  currentOf,
  isSet,
  optionsOf,
  type FilterGroup,
} from "./filter-panel-model";
import { FilterSearch } from "./filter-search";

export type { FilterGroup, FilterOption } from "./filter-panel-model";

// Μία ομάδα ως μαλακή κάρτα: κλειστή δείχνει την επιλογή ως ετικέτα, ανοιχτή όλη τη λίστα.
// Με το ίδιο `name` ανοίγει μόνο μία ομάδα κάθε φορά (native, χωρίς JS).
export function FilterCard({
  group,
  name,
  isOpen = false,
}: {
  group: FilterGroup;
  name?: string;
  isOpen?: boolean;
}) {
  const current = currentOf(group);
  return (
    <details className="kit-fp-group" name={name} open={isOpen}>
      <summary>
        <span className="kit-fp-label">{group.label}</span>
        {current && (
          <span className="kit-fp-chip" data-set={isSet(group)}>
            {current.label}
          </span>
        )}
        <span className="kit-fp-chev" aria-hidden="true" />
      </summary>
      <div className="kit-fp-body">
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

function Token({ group }: { group: FilterGroup }) {
  return (
    <span className="kit-fp-token">
      <small>{group.label}:</small> {currentOf(group)?.label}
      <Link
        href={group.all?.href ?? ""}
        scroll={false}
        aria-label={`Βγάλε το φίλτρο ${group.label}`}
      >
        ✕
      </Link>
    </span>
  );
}

interface FilterPanelProps {
  name: string;
  status?: FilterGroup;
  filters: readonly FilterGroup[];
  clearHref: string;
  children: ReactNode;
}

// Στήλη φίλτρων δίπλα στα αποτελέσματα· πάνω από αυτά η Κατάσταση με έντονα και ένα ✕ ανά ενεργό φίλτρο.
export function FilterPanel({
  name,
  status,
  filters,
  clearHref,
  children,
}: FilterPanelProps) {
  const active = filters.filter(isSet);
  const head = (
    <>
      {status && <strong>{currentOf(status)?.label}</strong>}
      {active.map((group) => (
        <Token key={group.label} group={group} />
      ))}
      {active.length > 0 && (
        <Link className="kit-fp-clear" href={clearHref} scroll={false}>
          Καθαρισμός φίλτρων
        </Link>
      )}
    </>
  );
  const side = (
    <>
      {status && <FilterCard group={status} name={name} isOpen />}
      {filters.map((group) => (
        <FilterCard key={group.label} group={group} name={name} />
      ))}
    </>
  );
  return (
    <FilterFrame
      toggleLabel={active.length > 0 ? `Φίλτρα (${active.length})` : "Φίλτρα"}
      head={head}
      side={side}
    >
      {children}
    </FilterFrame>
  );
}
