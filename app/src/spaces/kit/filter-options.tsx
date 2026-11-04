import Link from "next/link";

import type { FilterOption } from "./filter-bar-model";

// Η λίστα μιας ανοιχτής κάρτας φίλτρου: κυκλάκι επιλογής, όνομα, αχνός αριθμός (ή λέξη) δεξιά.
export function FilterOptions({
  options,
}: {
  options: readonly FilterOption[];
}) {
  return (
    <ul className="kit-fb-list">
      {options.map((option) => (
        <li key={option.href}>
          <Link
            className="kit-fb-opt"
            href={option.href}
            scroll={false}
            aria-current={option.isCurrent ? "true" : undefined}
          >
            <span className="kit-fb-radio" aria-hidden="true" />
            <span className="kit-fb-name">{option.label}</span>
            {(option.count ?? option.hint) !== undefined && (
              <span className="kit-fb-count">
                {option.count ?? option.hint}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
