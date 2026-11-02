import { Panel } from "@/spaces/kit/panel";
import { DateLead, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, fmtDate } from "@/spaces/screens/shared";

import type { Holidays } from "../automation-view-schema";
import { HolidayAdd, HolidayRemove, HolidaySwitch } from "./k1-holiday-forms";

import "./k1.css";

const WEEKDAY = new Intl.DateTimeFormat("el-GR", { weekday: "short" });

// Οι Αργίες στη σελίδα του Γεγονότος «Αργία» (prototype `k1-holidays.tsx`), από την πραγματική ανάγνωση της χρονιάς.
export function HolidayList({ holidays }: { holidays: Holidays }) {
  return (
    <Panel label={`Αργίες ${holidays.year}`}>
      <p className="note">
        {holidays.holidays.filter((h) => h.isOfficial).length} επίσημες αργίες
        με τις κινητές του Πάσχα. Σβήνεις όποια δεν θες να φεύγει ευχή· όσες
        πρόσθεσες εσύ φαίνονται με σήμα.
      </p>
      <RowList>
        {holidays.holidays.map((h) => {
          const label = `${fmtDate(h.date)} · ${h.name}`;
          const added = holidays.added.find((item) => item.name === h.name);
          return (
            <ListRow
              key={`${h.date}-${h.name}`}
              isFaded={!h.isOn}
              lead={
                <DateLead
                  weekday={WEEKDAY.format(new Date(`${h.date}T12:00:00`))}
                  day={h.date.slice(8, 10)}
                />
              }
              title={h.name}
              sub={fmtDate(h.date)}
              aside={
                <>
                  {!h.isOfficial && <Badge>πρόσθεσες εσύ</Badge>}
                  {h.isOfficial ? (
                    <HolidaySwitch name={h.name} isOn={h.isOn} label={label} />
                  ) : (
                    added && <HolidayRemove id={added.id} label={label} />
                  )}
                </>
              }
            />
          );
        })}
      </RowList>
      <HolidayAdd />
    </Panel>
  );
}
