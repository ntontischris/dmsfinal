import { FilterBar, type FilterGroup } from "@/spaces/kit/filter-bar";
import { currentOf, isSet } from "@/spaces/kit/filter-bar-model";

import { b3Href } from "./b3-columns";

// Η υπόδειξη του κουτιού: τα ενεργά φίλτρα με την τιμή τους, ή τι μπορείς να στενέψεις.
const hintOf = (groups: readonly FilterGroup[]): string => {
  const active = groups
    .filter(isSet)
    .map((group) => `${group.label}: ${currentOf(group)?.label ?? ""}`);
  if (active.length > 0) return active.join(" · ");
  return groups.map((group) => group.label).join(", ");
};

// Υπεύθυνος, Πηγή, Κλείσιμο σε κλειστό κουτί «Φίλτρα»· ανοιχτό όταν κάποιο φίλτρο ισχύει, ώστε να φαίνεται τι στενεύει.
export function PipelineFilters({
  groups,
}: {
  groups: readonly FilterGroup[];
}) {
  if (groups.length === 0) return null;
  return (
    <section>
      <details className="ml-box b3-filter-box" open={groups.some(isSet)}>
        <summary>
          <h2 className="ml-box-title">Φίλτρα</h2>
          <small>{hintOf(groups)}</small>
        </summary>
        <FilterBar
          name="b3-filters"
          filters={[...groups]}
          clearHref={b3Href({})}
        />
      </details>
    </section>
  );
}
