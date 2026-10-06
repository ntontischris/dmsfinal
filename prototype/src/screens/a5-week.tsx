import Link from "next/link";

import { CALENDAR_TODAY, type CalendarItem } from "@/data/calendar-access";
import type { RoleId } from "@/data/roles";
import {
  WEEKDAYS,
  a5Href,
  dayNumber,
  mondayOf,
  rangeDays,
  type A5Params,
} from "@/screens/a5-dates";
import { A5Item } from "@/screens/a5-item";

interface A5WeekProps {
  role: RoleId;
  params: A5Params;
  items: readonly CalendarItem[];
}

export function A5Week({ role, params, items }: A5WeekProps) {
  const days = rangeDays(mondayOf(params.d), 7);
  return (
    <div className="a5-week">
      {days.map((date, index) => {
        const dayItems = items.filter((item) => item.date === date);
        return (
          <section
            key={date}
            className="a5-day"
            data-today={date === CALENDAR_TODAY}
            aria-label={`${WEEKDAYS[index]} ${dayNumber(date)}/${date.slice(5, 7)}`}
          >
            <h3 className="a5-day-head">
              <Link href={a5Href(role, params, { view: "list", d: date })}>
                {WEEKDAYS[index]} {dayNumber(date)}/{date.slice(5, 7)}
              </Link>
              {date === CALENDAR_TODAY && (
                <span className="muted"> · σήμερα</span>
              )}
            </h3>
            {dayItems.length === 0 ? (
              <p className="muted a5-none">—</p>
            ) : (
              dayItems.map((item) => (
                <A5Item key={item.id} item={item} role={role} />
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
