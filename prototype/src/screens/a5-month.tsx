import Link from "next/link";

import { CALENDAR_TODAY, type CalendarItem } from "@/data/calendar-access";
import type { RoleId } from "@/data/roles";
import {
  WEEKDAYS,
  a5Href,
  dayNumber,
  isSameMonth,
  monthGrid,
  type A5Params,
} from "@/screens/a5-dates";
import { A5Item } from "@/screens/a5-item";

interface A5MonthProps {
  role: RoleId;
  params: A5Params;
  items: readonly CalendarItem[];
}

const MAX_SHOWN = 3;

function Dots({ dayItems }: { dayItems: readonly CalendarItem[] }) {
  if (dayItems.length === 0) return null;
  return (
    <div className="a5-dots" aria-hidden="true">
      {dayItems.slice(0, 3).map((item) => (
        <span key={item.id} className="a5-dot" data-kind={item.kind} />
      ))}
      <span className="a5-count">{dayItems.length}</span>
    </div>
  );
}

function Cell({ role, params, items, date }: A5MonthProps & { date: string }) {
  const dayItems = items.filter((item) => item.date === date);
  const shown = dayItems.slice(0, MAX_SHOWN);
  const more = dayItems.length - shown.length;
  return (
    <div
      className="a5-cell"
      data-out={!isSameMonth(date, params.d)}
      data-today={date === CALENDAR_TODAY}
    >
      <Link
        className="a5-num"
        href={a5Href(role, params, { view: "week", d: date })}
        aria-label={`${dayNumber(date)}/${date.slice(5, 7)}: ${dayItems.length} στοιχεία`}
      >
        {dayNumber(date)}
      </Link>
      <div className="a5-cell-items">
        {shown.map((item) => (
          <A5Item key={item.id} item={item} role={role} compact />
        ))}
        {more > 0 && <span className="muted">+{more} ακόμα</span>}
      </div>
      <Dots dayItems={dayItems} />
    </div>
  );
}

export function A5Month(props: A5MonthProps) {
  return (
    <div className="a5-month">
      {WEEKDAYS.map((name) => (
        <div key={name} className="a5-wd">
          {name}
        </div>
      ))}
      {monthGrid(props.params.d).map((date) => (
        <Cell key={date} {...props} date={date} />
      ))}
    </div>
  );
}
