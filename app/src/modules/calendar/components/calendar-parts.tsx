import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

import { dayNumber, weekdayIndex, weekdayName } from "../date-range";
import type { CalendarDay, CalendarEntry, EntryKind } from "../calendar-days";
import { dayStatusLabel, PENDING_LABEL } from "../labels";

// Κοινά κομμάτια των τριών προβολών: η κεφαλίδα μιας μέρας και μία γραμμή στοιχείου.

export interface DayViewProps {
  days: readonly CalendarDay[];
  isTeam: boolean;
  canBook: boolean;
  today: string;
}

const ENTRY_TONE: Record<EntryKind, string> = {
  filming: "border-primary/45 bg-primary/5",
  blocked: "border-border-strong bg-card",
  busy: "border-dashed border-border bg-muted/50 text-muted-foreground",
};

export const shortDayLabel = (date: string): string =>
  `${weekdayName(weekdayIndex(date))} ${dayNumber(date)}/${date.slice(5, 7)}`;

// Η ελεύθερη μέρα του Πελάτη ανοίγει την Κράτηση· οι άλλες καταστάσεις είναι απλή ετικέτα.
function StatusText({
  day,
  isTeam,
  canBook,
}: { day: CalendarDay } & Pick<DayViewProps, "isTeam" | "canBook">) {
  const label = dayStatusLabel(day.status, day.holidayName, isTeam);
  if (label === null) return null;
  if (!isTeam && day.status === "free" && canBook) {
    return (
      <Link
        className="text-sm text-primary underline-offset-4 hover:underline"
        href={`/app/book?day=${day.date}`}
      >
        {label}
      </Link>
    );
  }
  return <span className="text-sm text-muted-foreground">{label}</span>;
}

export function DayHead({
  day,
  isTeam,
  canBook,
  today,
}: { day: CalendarDay } & Omit<DayViewProps, "days">) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="m-0 text-sm font-semibold">
        {shortDayLabel(day.date)}
        {day.date === today && (
          <span className="font-normal text-muted-foreground"> · σήμερα</span>
        )}
      </h3>
      <StatusText day={day} isTeam={isTeam} canBook={canBook} />
    </header>
  );
}

export function EntryRow({ entry }: { entry: CalendarEntry }) {
  const className = cn(
    "grid gap-1 rounded-sm border px-2.5 py-2 text-sm no-underline",
    ENTRY_TONE[entry.kind],
    entry.href && "hover:border-border-strong",
  );
  const content = (
    <>
      <span className="text-xs text-muted-foreground">{entry.time}</span>
      <span className="font-medium">{entry.title}</span>
      {entry.detail && (
        <span className="text-xs text-muted-foreground">{entry.detail}</span>
      )}
      {entry.isPending && <Badge tone="strong">{PENDING_LABEL}</Badge>}
    </>
  );
  return entry.href ? (
    <Link
      className={className}
      href={entry.href}
      data-kind={entry.kind}
      data-pending={entry.isPending}
    >
      {content}
    </Link>
  ) : (
    <div
      className={className}
      data-kind={entry.kind}
      data-pending={entry.isPending}
    >
      {content}
    </div>
  );
}
