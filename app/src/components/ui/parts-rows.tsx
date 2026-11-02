import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

// Γραμμές λίστας του screens2 (prototype `kit/parts.tsx`): «πότε/τι» μπροστά, τίτλος, κατάσταση δεξιά.
// Οι κλάσεις τίτλου/υπότιτλου επαναλαμβάνονται εδώ, για να μην εισάγουν τα δύο αρχεία το ένα το άλλο.
const TITLE =
  "font-semibold text-foreground no-underline [overflow-wrap:break-word]";
const SUB = "block text-xs text-muted-foreground [overflow-wrap:anywhere]";

interface ListRowProps {
  lead?: ReactNode;
  title: ReactNode;
  href?: string;
  sub?: ReactNode;
  aside?: ReactNode;
  isHighlighted?: boolean;
  isFaded?: boolean;
}

// Μια γραμμή λίστας: μπροστά «πότε/τι» (ώρα, ημερομηνία, έκδοση), τίτλος + υπότιτλος, δεξιά κατάσταση/ενέργεια.
export function ListRow({
  lead,
  title,
  href,
  sub,
  aside,
  isHighlighted = false,
  isFaded = false,
}: ListRowProps) {
  const titleClass = cn(TITLE, isFaded && "line-through");
  return (
    <li
      data-highlight={isHighlighted}
      data-faded={isFaded}
      className={cn(
        "grid items-center gap-x-4 gap-y-1 border-t border-foreground/7 px-5 py-3.5 transition-colors first:border-t-0 hover:bg-foreground/5",
        lead
          ? "grid-cols-[auto_minmax(0,1fr)_auto] max-sm:grid-cols-[auto_minmax(0,1fr)]"
          : "grid-cols-[minmax(0,1fr)_auto]",
        isHighlighted && "bg-primary/10 shadow-[inset_3px_0_0_var(--primary)]",
        isFaded && "opacity-55",
      )}
    >
      {lead && (
        <span className="min-w-12 font-extrabold text-primary tabular-nums">
          {lead}
        </span>
      )}
      <span className="grid min-w-0 gap-0.5">
        {href ? (
          <Link className={cn(titleClass, "hover:text-primary")} href={href}>
            {title}
          </Link>
        ) : (
          <span className={titleClass}>{title}</span>
        )}
        {sub && <span className={SUB}>{sub}</span>}
      </span>
      {aside && (
        <span className="inline-flex flex-wrap items-center justify-end gap-2 max-sm:col-span-full max-sm:justify-start">
          {aside}
        </span>
      )}
    </li>
  );
}

export function RowList({ children }: { children: ReactNode }) {
  return <ul className="m-0 list-none p-0">{children}</ul>;
}

// Ώρα μπροστά στη γραμμή: «09:30» και από κάτω «έως 14:00».
export function TimeLead({ start, end }: { start: string; end?: string }) {
  return (
    <span className="grid gap-0.5 font-normal text-foreground tabular-nums">
      <strong className="text-[1.05rem] font-bold">{start}</strong>
      {end && <span className={SUB}>έως {end}</span>}
    </span>
  );
}

// Ημερομηνία μπροστά στη γραμμή: μικρή μέρα πάνω, μεγάλος αριθμός κάτω («ΚΥΡ / 25»).
export function DateLead({ weekday, day }: { weekday: string; day: string }) {
  return (
    <span className="grid min-w-[2.6rem] justify-items-center leading-[1.05] font-normal text-foreground">
      <span className="text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {weekday}
      </span>
      <strong className="text-[1.45rem] font-extrabold tracking-[-0.03em]">
        {day}
      </strong>
    </span>
  );
}

// Ταινία ομάδας μέσα σε λίστα: «ΣΗΜΕΡΑ · ΠΕΜ 29 … 2 ΓΥΡΙΣΜΑΤΑ». Η σημερινή στο χρώμα της αναμονής (κίτρινο).
export function GroupBand({
  label,
  aside,
  isToday = false,
}: {
  label: ReactNode;
  aside?: ReactNode;
  isToday?: boolean;
}) {
  return (
    <li
      data-today={isToday}
      className={cn(
        "flex justify-between gap-3 bg-foreground/4 px-5 py-2 text-[0.7rem] font-semibold tracking-[0.12em] uppercase",
        isToday ? "text-waiting" : "text-muted-foreground",
      )}
    >
      <span>{label}</span>
      {aside && <span>{aside}</span>}
    </li>
  );
}

// Ημερομηνία-προθεσμία: κόκκινη με τελεία όταν πέρασε.
export function Due({
  children,
  isLate = false,
}: {
  children: ReactNode;
  isLate?: boolean;
}) {
  return (
    <span
      data-late={isLate}
      className={cn(
        "font-bold whitespace-nowrap tabular-nums",
        isLate &&
          "inline-flex items-center gap-1.5 text-destructive before:size-[7px] before:rounded-full before:bg-rec before:content-['']",
      )}
    >
      {children}
    </span>
  );
}
