import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";
import { RowList } from "@/spaces/kit/parts";

import {
  dayNumber,
  isSameMonth,
  mondayOf,
  monthGrid,
  rangeDays,
  weekdayName,
} from "../date-range";
import { calendarHref, type CalendarParams } from "../url-state";
import { A5Item, A5Row } from "./a5-item";
import {
  filmingsFirst,
  fmtLong,
  groupByDate,
  type A5Item as Item,
} from "./a5-model";

// Οι τρεις προβολές του prototype (`screens/a5-week.tsx`, `a5-month.tsx`, `a5-list.tsx`) με πραγματικά στοιχεία.
// Ο φόρτος ομάδας/ατόμου του prototype λείπει: η βάση δεν δίνει φόρτο ανά άτομο.

interface ViewProps {
  params: CalendarParams;
  items: readonly Item[];
  today: string;
}

const WEEKDAYS = Array.from({ length: 7 }, (_, index) => weekdayName(index));

export function A5Week({ params, items, today }: ViewProps) {
  const days = rangeDays(mondayOf(params.date), 7);
  return (
    <div className="a5-week">
      {days.map((date, index) => {
        const dayItems = filmingsFirst(
          items.filter((item) => item.date === date),
        );
        return (
          <section
            key={date}
            className="a5-day"
            data-today={date === today}
            aria-label={`${WEEKDAYS[index]} ${dayNumber(date)}/${date.slice(5, 7)}`}
          >
            <h3 className="a5-day-head">
              <Link href={calendarHref(params, { view: "list", date })}>
                {WEEKDAYS[index]} {dayNumber(date)}/{date.slice(5, 7)}
              </Link>
              {date === today && <span className="muted"> · σήμερα</span>}
            </h3>
            {dayItems.length === 0 ? (
              <p className="muted a5-none">Τίποτα προγραμματισμένο</p>
            ) : (
              dayItems.map((item) => <A5Item key={item.id} item={item} />)
            )}
          </section>
        );
      })}
    </div>
  );
}

const MAX_SHOWN = 3;

function Dots({ dayItems }: { dayItems: readonly Item[] }) {
  if (dayItems.length === 0) return null;
  return (
    <div className="a5-dots" aria-hidden="true">
      {dayItems.slice(0, 3).map((item) => (
        <span
          key={item.id}
          className="a5-dot"
          data-kind={item.kind}
          data-tone={item.tone ?? undefined}
        />
      ))}
      <span className="a5-count">{dayItems.length}</span>
    </div>
  );
}

function Cell({ params, items, today, date }: ViewProps & { date: string }) {
  const dayItems = items.filter((item) => item.date === date);
  const shown = dayItems.slice(0, MAX_SHOWN);
  const more = dayItems.length - shown.length;
  return (
    <div
      className="a5-cell"
      data-out={!isSameMonth(date, params.date)}
      data-today={date === today}
    >
      <Link
        className="a5-num"
        href={calendarHref(params, { view: "week", date })}
        aria-label={`${dayNumber(date)}/${date.slice(5, 7)}: ${dayItems.length} στοιχεία`}
      >
        {dayNumber(date)}
      </Link>
      <div className="a5-cell-items">
        {shown.map((item) => (
          <A5Item key={item.id} item={item} compact />
        ))}
        {more > 0 && <span className="muted">+{more} ακόμα</span>}
      </div>
      <Dots dayItems={dayItems} />
    </div>
  );
}

export function A5Month(props: ViewProps) {
  return (
    <div className="a5-month">
      {WEEKDAYS.map((name) => (
        <div key={name} className="a5-wd">
          {name}
        </div>
      ))}
      {monthGrid(props.params.date).map((date) => (
        <Cell key={date} {...props} date={date} />
      ))}
    </div>
  );
}

export function A5List({ items }: { items: readonly Item[] }) {
  return (
    <div className="a5-list">
      {groupByDate(items).map(([date, dayItems]) => (
        <Panel key={date} label={fmtLong(date)} aside={dayItems.length} isFlush>
          <RowList>
            {dayItems.map((item) => (
              <A5Row key={item.id} item={item} />
            ))}
          </RowList>
        </Panel>
      ))}
    </div>
  );
}
