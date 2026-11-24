import { fmtDate } from "@/spaces/screens/shared";

import type { Holidays } from "../automation-view-schema";
import { HolidayAdd, HolidayRemove, HolidaySwitch } from "./k1-holiday-forms";

import "./k1.css";

const WEEKDAY = new Intl.DateTimeFormat("el-GR", { weekday: "short" });

// Οι Αργίες στη σελίδα του Γεγονότος «Αργία» (prototype `k1-holidays.tsx`), από την πραγματική ανάγνωση της χρονιάς.
export function HolidayList({ holidays }: { holidays: Holidays }) {
  const official = holidays.holidays.filter((h) => h.isOfficial).length;
  const off = holidays.holidays.filter((h) => !h.isOn).length;
  return (
    <details className="ml-box">
      <summary>
        <h2 className="ml-box-title">{`Αργίες ${holidays.year}`}</h2>
        <small>{`${holidays.holidays.length} αργίες · ${off} σβηστές`}</small>
      </summary>
      <p className="note">
        {official} επίσημες αργίες με τις κινητές του Πάσχα. Σβήνεις όποια δεν
        θες να φεύγει ευχή· όσες πρόσθεσες εσύ φαίνονται με σήμα.
      </p>
      <ul className="ml-list">
        {holidays.holidays.map((h) => {
          const label = `${fmtDate(h.date)} · ${h.name}`;
          const added = holidays.added.find((item) => item.name === h.name);
          return (
            <li
              key={`${h.date}-${h.name}`}
              className="ml-line"
              data-faded={h.isOn ? undefined : "true"}
            >
              <span className="ml-thumb" aria-hidden="true">
                {h.date.slice(8, 10)}
              </span>
              <span className="ml-main">
                <strong>{h.name}</strong>
                <small>{`${WEEKDAY.format(new Date(`${h.date}T12:00:00`))} · ${fmtDate(h.date)}`}</small>
              </span>
              {h.isOfficial ? (
                <span />
              ) : (
                <span className="ml-tag">πρόσθεσες εσύ</span>
              )}
              {h.isOfficial ? (
                <HolidaySwitch name={h.name} isOn={h.isOn} label={label} />
              ) : (
                added && <HolidayRemove id={added.id} label={label} />
              )}
            </li>
          );
        })}
      </ul>
      <HolidayAdd />
    </details>
  );
}
