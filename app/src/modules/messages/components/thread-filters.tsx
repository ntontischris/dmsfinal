import Link from "next/link";

import { Segmented, type SegmentedOption } from "@/components/ui/segmented";

import {
  threadHref,
  type MessageFilters,
  type ProductionChip,
} from "../helpers";
import {
  FILTERING_PREFIX,
  FILTERS_LABEL,
  FILTER_ALL,
  FILTER_CLEAR,
  FILTER_INTERNAL,
  FILTER_UNTAGGED,
} from "../labels";

interface ThreadFiltersProps {
  clientId: string;
  chips: readonly ProductionChip[];
  active: MessageFilters;
  activeTitle?: string;
  hideUntagged: boolean;
}

function optionsOf({
  clientId,
  chips,
  active,
  hideUntagged,
}: ThreadFiltersProps): SegmentedOption[] {
  const isAll = active.production === undefined && active.filter === "all";
  const filterOption = (
    filter: "untagged" | "internal",
    label: string,
  ): SegmentedOption => ({
    label,
    href: threadHref(clientId, { filter }),
    isCurrent: active.production === undefined && active.filter === filter,
  });
  return [
    { label: FILTER_ALL, href: threadHref(clientId), isCurrent: isAll },
    ...chips.map((chip) => ({
      label: chip.title,
      href: threadHref(clientId, { production: chip.id }),
      isCurrent: active.production === chip.id,
    })),
    ...(hideUntagged ? [] : [filterOption("untagged", FILTER_UNTAGGED)]),
    filterOption("internal", FILTER_INTERNAL),
  ];
}

// Φίλτρα «Όλα» / ανά Παραγωγή / «Χωρίς ετικέτα» (όχι για partial) / «Εσωτερικά»: ζουν στη διεύθυνση (?production=, ?filter=).
export function ThreadFilters(props: ThreadFiltersProps) {
  const { clientId, active, activeTitle } = props;
  return (
    <div className="mb-4 grid gap-2">
      <Segmented label={FILTERS_LABEL} options={optionsOf(props)} />
      {active.production !== undefined && (
        <p className="m-0 text-sm text-muted-foreground">
          {FILTERING_PREFIX}: {activeTitle ?? "Παραγωγή"} ·{" "}
          <Link href={threadHref(clientId)}>{FILTER_CLEAR}</Link>
        </p>
      )}
    </div>
  );
}
