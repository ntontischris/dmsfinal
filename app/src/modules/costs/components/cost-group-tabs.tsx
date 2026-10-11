import { Segmented } from "@/components/ui/segmented";

import { GROUP_LABELS } from "../labels";
import { COST_GROUPS, type CostGroup } from "../types";

// Οι τρεις ομάδες της G3 σε καρτέλες· η επιλογή ζει στη διεύθυνση.
export function CostGroupTabs({ group }: { group: CostGroup }) {
  const options = COST_GROUPS.map((value) => ({
    label: GROUP_LABELS[value],
    href: `/app/productions/costs?group=${value}`,
    isCurrent: value === group,
  }));
  return <Segmented label="Ομάδες κόστους" options={options} />;
}
