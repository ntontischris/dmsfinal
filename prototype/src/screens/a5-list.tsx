import type { CalendarItem } from "@/data/calendar-access";
import type { RoleId } from "@/data/roles";
import { fmtLong } from "@/screens/a5-dates";
import { A5Item } from "@/screens/a5-item";

interface A5ListProps {
  role: RoleId;
  items: readonly CalendarItem[];
}

const groupByDate = (
  items: readonly CalendarItem[],
): readonly (readonly [string, readonly CalendarItem[]])[] =>
  [...new Set(items.map((item) => item.date))].map((date) => [
    date,
    items.filter((item) => item.date === date),
  ]);

export function A5List({ role, items }: A5ListProps) {
  return (
    <div className="a5-list">
      {groupByDate(items).map(([date, dayItems]) => (
        <section key={date} className="a5-day" aria-label={fmtLong(date)}>
          <h3 className="a5-day-head">{fmtLong(date)}</h3>
          {dayItems.map((item) => (
            <A5Item key={item.id} item={item} role={role} />
          ))}
        </section>
      ))}
    </div>
  );
}
