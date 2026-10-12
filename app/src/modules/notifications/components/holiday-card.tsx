import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import { HOLIDAY_ADDED_BADGE, HOLIDAYS_NOTE } from "../automation-labels";
import type { Holidays } from "../automation-view-schema";
import { HolidayAdd, HolidayRemove, HolidayToggle } from "./holiday-forms";

// Η κάρτα Αργιών στη σελίδα του Γεγονότος «Αργία» (K1, #173, Α12).

const dayLabel = (iso: string): string => {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

export function HolidayCard({ holidays }: { holidays: Holidays }) {
  return (
    <Panel label={`Αργίες ${holidays.year}`}>
      <div className="grid gap-4">
        <p className="m-0 text-sm text-muted-foreground">{HOLIDAYS_NOTE}</p>
        <ul className="m-0 grid list-none gap-0 p-0">
          {holidays.holidays.map((holiday) => {
            const label = `${dayLabel(holiday.date)} · ${holiday.name}`;
            const added = holidays.added.find(
              (item) => item.name === holiday.name,
            );
            return (
              <li
                key={`${holiday.date}-${holiday.name}`}
                className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-b-0"
              >
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  {label}
                  {!holiday.isOfficial && <Badge>{HOLIDAY_ADDED_BADGE}</Badge>}
                </span>
                {holiday.isOfficial ? (
                  <HolidayToggle
                    name={holiday.name}
                    isOn={holiday.isOn}
                    label={label}
                  />
                ) : (
                  added && <HolidayRemove id={added.id} label={label} />
                )}
              </li>
            );
          })}
        </ul>
        <HolidayAdd />
      </div>
    </Panel>
  );
}
