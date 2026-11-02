import Link from "next/link";
import type { ReactNode } from "react";

import { initialsOf } from "@/components/ui/initials";
import { cn } from "@/lib/cn";

// Τα κομμάτια περιεχομένου του screens2 (prototype `kit/parts.tsx`): κάθε είδος πληροφορίας με το δικό του σχήμα,
// ίδιο σε κάθε οθόνη. Κατάσταση = <Badge tone>. Εδώ: άνθρωποι και πρόοδος· οι γραμμές λίστας στο parts-rows.tsx.
export {
  DateLead,
  Due,
  GroupBand,
  ListRow,
  RowList,
  TimeLead,
} from "@/components/ui/parts-rows";

const TITLE =
  "font-semibold text-foreground no-underline [overflow-wrap:break-word]";
const SUB = "block text-xs text-muted-foreground [overflow-wrap:anywhere]";

function Circle({
  name,
  size,
  className,
}: {
  name: string;
  size: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        "inline-grid flex-none place-items-center rounded-full bg-primary font-bold tracking-normal text-primary-foreground",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initialsOf(name)}
    </span>
  );
}

// Άνθρωπος: κυκλάκι με τα αρχικά. Το όνομα ακούγεται από τον αναγνώστη οθόνης και φαίνεται στο hover.
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return <Circle name={name} size={size} />;
}

// Πολλοί άνθρωποι: έως 3 κυκλάκια το ένα πάνω στο άλλο και «+Ν». Κενό → «χωρίς ανάθεση».
export function AvatarStack({
  names,
  empty = "χωρίς ανάθεση",
}: {
  names: readonly string[];
  empty?: string;
}) {
  if (names.length === 0) return <span className={SUB}>{empty}</span>;
  return (
    <span className="inline-flex items-center">
      {names.slice(0, 3).map((name) => (
        <Circle
          key={name}
          name={name}
          size={26}
          className="-mr-1.5 ring-2 ring-muted"
        />
      ))}
      {names.length > 3 && (
        <span className="ml-3 text-xs font-semibold text-muted-foreground">
          +{names.length - 3}
        </span>
      )}
    </span>
  );
}

// «Χωρίς υπεύθυνο», «—» κ.λπ. δεν είναι άνθρωπος: μόνο αχνό κείμενο, χωρίς κυκλάκι.
const isNobody = (name: string): boolean =>
  name.trim() === "" || name === "—" || name.startsWith("Χωρίς");

// Ένας άνθρωπος με το όνομά του δίπλα (Υπεύθυνος, μέλος).
export function Person({ name, role }: { name: string; role?: ReactNode }) {
  if (isNobody(name)) return <span className={SUB}>{name}</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar name={name} size={26} />
      <span className="font-semibold whitespace-nowrap">{name}</span>
      {role && <span className={cn(SUB, "ml-auto")}>{role}</span>}
    </span>
  );
}

interface EntityProps {
  name: string;
  href?: string;
  sub?: ReactNode;
  children?: ReactNode;
}

// Ποιος (Πελάτης, Παραγωγή): τετράγωνο με αρχικά, το όνομα έντονο και από κάτω ο υπότιτλος.
export function Entity({ name, href, sub, children }: EntityProps) {
  const title = cn(TITLE, "text-[1.02rem]");
  return (
    <span className="inline-flex min-w-0 items-center gap-3.5">
      <span
        aria-hidden="true"
        className="grid size-[2.6rem] flex-none place-items-center rounded-xl bg-foreground/8 text-sm font-bold tracking-normal"
      >
        {initialsOf(name)}
      </span>
      <span className="grid min-w-0 justify-items-start gap-0.5">
        {href ? (
          <Link className={cn(title, "hover:text-primary")} href={href}>
            {name}
          </Link>
        ) : (
          <span className={title}>{name}</span>
        )}
        {sub && <span className={SUB}>{sub}</span>}
        {children}
      </span>
    </span>
  );
}

interface MeterProps {
  label?: string;
  used: number;
  total: number;
  tone?: "attention";
}

const METER_FILL = {
  attention: "bg-rec",
  full: "bg-now",
  none: "bg-primary",
} as const;

// Πόσο έχει γίνει: λεπτή μπάρα και «5/8». Γεμάτη = κίτρινη (τίποτα δεν περισσεύει), φορτωμένη = κόκκινη.
export function Meter({ label, used, total, tone }: MeterProps) {
  const pct = Math.min(100, Math.round((used / Math.max(1, total)) * 100));
  const isFull = total > 0 && used >= total;
  const state = tone ?? (isFull ? "full" : undefined);
  return (
    <span
      data-tone={state}
      className={cn(
        "grid min-w-36 items-center gap-2.5",
        label
          ? "grid-cols-[auto_minmax(3rem,1fr)_auto]"
          : "grid-cols-[minmax(3rem,1fr)_auto]",
      )}
    >
      {label && (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {label}
        </span>
      )}
      <span
        className="block h-1.5 overflow-hidden rounded-full bg-foreground/10"
        role="meter"
        aria-label={`${label ?? ""} ${used} από ${total}`.trim()}
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <span
          className={cn(
            "block h-full rounded-full",
            METER_FILL[state ?? "none"],
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="text-xs font-bold whitespace-nowrap tabular-nums">
        {used}/{total}
      </span>
    </span>
  );
}

// Μετρήσιμα κομμάτια (Παροχές): ένα κουτάκι ανά μονάδα, γεμάτο = έγινε.
export function Segments({
  label,
  used,
  total,
}: {
  label: string;
  used: number;
  total: number;
}) {
  return (
    <span className="grid gap-2">
      <span className="flex justify-between gap-2">
        <span className={TITLE}>{label}</span>
        <span className="text-xs font-bold text-foreground">
          {used}/{total}
        </span>
      </span>
      <span
        className="grid auto-cols-fr grid-flow-col gap-1"
        role="meter"
        aria-label={`${label}: ${used} από ${total}`}
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        {Array.from({ length: Math.max(total, 1) }, (_, index) => (
          <span
            key={index}
            data-done={index < used}
            className={cn(
              "h-[5px] rounded-full",
              index < used ? "bg-primary" : "bg-foreground/14",
            )}
          />
        ))}
      </span>
    </span>
  );
}
