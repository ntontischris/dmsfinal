import { cn } from "@/lib/cn";

import type { CalendarDay } from "../calendar-days";
import { isShadedDay } from "../labels";

import { DayHead, EntryRow, type DayViewProps } from "./calendar-parts";

// Η εβδομάδα (στο κινητό οι μέρες στοιβάζονται) και η λίστα (μόνο μέρες με κάτι να δείχνουν).

function DayBlock({
  day,
  ...props
}: { day: CalendarDay } & Omit<DayViewProps, "days">) {
  return (
    <section
      className={cn(
        "grid min-w-0 content-start gap-2 rounded-md border bg-card p-3",
        isShadedDay(day.status) && "bg-muted/60",
        day.date === props.today && "border-primary/60",
      )}
      data-shaded={isShadedDay(day.status)}
      aria-label={day.date}
    >
      <DayHead day={day} {...props} />
      {day.entries.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">—</p>
      ) : (
        day.entries.map((entry) => <EntryRow key={entry.key} entry={entry} />)
      )}
    </section>
  );
}

export function CalendarWeek({ days, isTeam, canBook, today }: DayViewProps) {
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((day) => (
        <DayBlock
          key={day.date}
          day={day}
          isTeam={isTeam}
          canBook={canBook}
          today={today}
        />
      ))}
    </div>
  );
}

export function CalendarList({ days, isTeam, canBook, today }: DayViewProps) {
  const withContent = days.filter(
    (day) => day.entries.length > 0 || isShadedDay(day.status),
  );
  if (withContent.length === 0) return null;
  return (
    <div className="grid gap-3">
      {withContent.map((day) => (
        <DayBlock
          key={day.date}
          day={day}
          isTeam={isTeam}
          canBook={canBook}
          today={today}
        />
      ))}
    </div>
  );
}
