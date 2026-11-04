import Link from "next/link";

import type { FilterOption } from "./filter-panel-model";

// Η λίστα μιας ανοιχτής ομάδας φίλτρων: κυκλάκι επιλογής, όνομα, αχνός αριθμός δεξιά.
export function FilterOptions({
  options,
}: {
  options: readonly FilterOption[];
}) {
  return (
    <ul className="kit-fp-list">
      {options.map((option) => (
        <li key={option.href}>
          <Link
            className="kit-fp-opt"
            href={option.href}
            scroll={false}
            aria-current={option.isCurrent ? "true" : undefined}
          >
            <span className="kit-fp-radio" aria-hidden="true" />
            <span className="kit-fp-name">{option.label}</span>
            {option.count !== undefined && (
              <span className="kit-fp-count">{option.count}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
