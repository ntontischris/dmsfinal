import { FilterBar, type FilterGroup } from "@/spaces/kit/filter-bar";
import { currentOf, isSet } from "@/spaces/kit/filter-bar-model";

interface B1FiltersBoxProps {
  filters: readonly FilterGroup[];
  clearHref: string;
}

// Τι ισχύει τώρα, για την υπόδειξη του κουτιού: «Κατάσταση: Ενεργός · Υπεύθυνος: Άννα».
const activeOf = (filters: readonly FilterGroup[]): readonly string[] =>
  filters
    .filter(isSet)
    .map((group) => `${group.label}: ${currentOf(group)?.label ?? ""}`);

// Ποια φίλτρα υπάρχουν, όταν δεν ισχύει κανένα: τα τρία πρώτα ονόματα.
const namesOf = (filters: readonly FilterGroup[]): string =>
  filters
    .slice(0, 3)
    .map((group) => group.label)
    .join(", ") + (filters.length > 3 ? "…" : "");

// Τα φίλτρα της λίστας σε κλειστό κουτί· ανοίγει μόνο του όταν ισχύει κάποιο, ώστε να φαίνεται τι κόβει τη λίστα.
export function B1FiltersBox({ filters, clearHref }: B1FiltersBoxProps) {
  const active = activeOf(filters);
  return (
    <details className="ml-box b1-filters" open={active.length > 0}>
      <summary>
        <h2 className="ml-box-title">Φίλτρα</h2>
        <small>
          {active.length > 0
            ? active.join(" · ")
            : `κανένα ενεργό · ${namesOf(filters)}`}
        </small>
      </summary>
      <FilterBar name="b1-filters" filters={filters} clearHref={clearHref} />
    </details>
  );
}
