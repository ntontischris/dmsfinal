import Link from "next/link";

import { cn } from "@/lib/cn";

import { dayNumber, isSameMonth, weekdayName } from "../date-range";
import type { CalendarDay } from "../calendar-days";
import { isShadedDay } from "../labels";

import { CalendarList } from "./calendar-views";
import type { DayViewProps } from "./calendar-parts";

// Το μήνα ως πλέγμα (από το sm και πάνω). Στο κινητό το ίδιο περιεχόμενο φαίνεται ως λίστα.

const MAX_SHOWN = 3;
const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6] as const;

interface MonthProps extends DayViewProps {
  anchor: string;
  dayHref: (date: string) => string;
}

function MonthCell({
  day,
  anchor,
  today,
  href,
}: {
  day: CalendarDay;
  anchor: string;
  today: string;
  href: string;
}) {
  const shown = day.entries.slice(0, MAX_SHOWN);
  const more = day.entries.length - shown.length;
  return (
    <div
      className={cn(
        "grid min-w-0 content-start gap-1 rounded-sm border bg-card p-1.5",
        isShadedDay(day.status) && "bg-muted/60",
        !isSameMonth(day.date, anchor) && "opacity-50",
        day.date === today && "border-primary/60",
      )}
    >
      <Link
        className="text-xs font-semibold no-underline"
        href={href}
       
      >
        {dayNumber(day.date)}
      </Link>
      {shown.map((entry) => (
        <span
          key={entry.key}
          className="truncate text-[0.7rem] text-muted-foreground"
          data-kind={entry.kind}
        >
          {entry.title}
        </span>
      ))}
      {more > 0 && (
        <span className="text-[0.7rem] text-muted-foreground">
          +{more} ακόμα
        </span>
      )}
    </div>
  );
}

export function CalendarMonth({
  days,
  anchor,
  dayHref,
  isTeam,
  canBook,
  today,
}: MonthProps) {
  return (
    <>
      <div className="hidden grid-cols-7 gap-1 sm:grid">
        {WEEKDAY_INDEXES.map((index) => (
          <span key={index} className="text-xs text-muted-foreground">
            {weekdayName(index)}
          </span>
        ))}
        {days.map((day) => (
          <MonthCell
            key={day.date}
            day={day}
            anchor={anchor}
            today={today}
            href={dayHref(day.date)}
          />
        ))}
      </div>
      <div className="sm:hidden">
        <CalendarList
          days={days}
          isTeam={isTeam}
          canBook={canBook}
          today={today}
        />
      </div>
    </>
  );
}
