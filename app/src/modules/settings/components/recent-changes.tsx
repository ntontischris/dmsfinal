import { Panel } from "@/components/ui/panel";

import type { SettingsChange } from "../queries";

const when = (iso: string): string =>
  new Date(iso).toLocaleString("el-GR", {
    timeZone: "Europe/Athens",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// Οι 3 τελευταίες αλλαγές της καρτέλας, από το Ίχνος. Χωρίς «Βλέπει ίχνος ενεργειών» δεν εμφανίζεται.
export function RecentChanges({
  changes,
  labelOf,
}: {
  changes: readonly SettingsChange[];
  labelOf: (field: string) => string;
}) {
  if (changes.length === 0) return null;
  return (
    <Panel label="Τελευταίες αλλαγές">
      <ul className="m-0 grid list-none gap-2 p-0 text-sm">
        {changes.map((change) => (
          <li
            key={`${change.at}-${change.entity}`}
            className="flex flex-wrap gap-x-2"
          >
            <span className="tabular-nums text-muted-foreground">
              {when(change.at)}
            </span>
            <span className="font-medium">{change.actorName}</span>
            <span className="text-muted-foreground">
              {change.fields.map(labelOf).join(", ") || "άλλαξε"}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
