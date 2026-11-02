import Link from "next/link";
import type { ReactNode } from "react";

import { initialsOf } from "@/spaces/shell/avatar";

// Τα κομμάτια περιεχομένου του screens2: κάθε είδος πληροφορίας με το δικό του σχήμα, ίδιο σε κάθε οθόνη.
// Κατάσταση = <Badge tone> (χάπι, με το «τι σημαίνει;»). Εδώ: άνθρωποι, πρόοδος, γραμμές λίστας, ομάδες.

// Άνθρωπος: κυκλάκι με τα αρχικά. Το όνομα ακούγεται από τον αναγνώστη οθόνης και φαίνεται στο hover.
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      className="part-avatar"
      role="img"
      aria-label={name}
      title={name}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initialsOf(name)}
    </span>
  );
}

// Πολλοί άνθρωποι: έως 3 κυκλάκια το ένα πάνω στο άλλο και «+Ν». Κενό → «χωρίς ανάθεση».
export function AvatarStack({
  names,
  empty = "χωρίς ανάθεση",
}: {
  names: readonly string[];
  empty?: string;
}) {
  if (names.length === 0) return <span className="part-sub">{empty}</span>;
  return (
    <span className="part-stack">
      {names.slice(0, 3).map((name) => (
        <Avatar key={name} name={name} size={26} />
      ))}
      {names.length > 3 && (
        <span className="part-stack-more">+{names.length - 3}</span>
      )}
    </span>
  );
}

// Ένας άνθρωπος με το όνομά του δίπλα (Υπεύθυνος, μέλος).
// «Χωρίς υπεύθυνο», «—» κ.λπ. δεν είναι άνθρωπος: μόνο αχνό κείμενο, χωρίς κυκλάκι.
const isNobody = (name: string): boolean =>
  name.trim() === "" || name === "—" || name.startsWith("Χωρίς");

export function Person({ name, role }: { name: string; role?: ReactNode }) {
  if (isNobody(name)) return <span className="part-sub">{name}</span>;
  return (
    <span className="part-person">
      <Avatar name={name} size={26} />
      <span className="part-person-name">{name}</span>
      {role && <span className="part-sub part-person-role">{role}</span>}
    </span>
  );
}

// Ποιος (Πελάτης, Παραγωγή): τετράγωνο με αρχικά, το όνομα έντονο και από κάτω ο υπότιτλος.
export function Entity({
  name,
  href,
  sub,
  children,
}: {
  name: string;
  href?: string;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <span className="part-entity">
      <span className="part-tile" aria-hidden="true">
        {initialsOf(name)}
      </span>
      <span className="part-entity-text">
        {href ? (
          <Link className="part-title" href={href}>
            {name}
          </Link>
        ) : (
          <span className="part-title">{name}</span>
        )}
        {sub && <span className="part-sub">{sub}</span>}
        {children}
      </span>
    </span>
  );
}

// Πόσο έχει γίνει: λεπτή μπάρα και «5/8». Γεμάτη = κίτρινη (τίποτα δεν περισσεύει), φορτωμένη = κόκκινη.
export function Meter({
  label,
  used,
  total,
  tone,
}: {
  label?: string;
  used: number;
  total: number;
  tone?: "attention";
}) {
  const pct = Math.min(100, Math.round((used / Math.max(1, total)) * 100));
  const isFull = total > 0 && used >= total;
  return (
    <span
      className="part-meter"
      data-tone={tone ?? (isFull ? "full" : undefined)}
    >
      {label && <span className="part-meter-label">{label}</span>}
      <span
        className="part-meter-track"
        role="meter"
        aria-label={`${label ?? ""} ${used} από ${total}`.trim()}
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <span className="part-meter-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="part-meter-count">
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
    <span className="part-segments">
      <span className="part-segments-head">
        <span className="part-title">{label}</span>
        <span className="part-sub">
          {used}/{total}
        </span>
      </span>
      <span
        className="part-segments-track"
        role="meter"
        aria-label={`${label}: ${used} από ${total}`}
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        {Array.from({ length: Math.max(total, 1) }, (_, index) => (
          <span key={index} data-done={index < used} />
        ))}
      </span>
    </span>
  );
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
}: {
  lead?: ReactNode;
  title: ReactNode;
  href?: string;
  sub?: ReactNode;
  aside?: ReactNode;
  isHighlighted?: boolean;
  isFaded?: boolean;
}) {
  return (
    <li
      className="part-row"
      data-highlight={isHighlighted}
      data-faded={isFaded}
    >
      {lead && <span className="part-row-lead">{lead}</span>}
      <span className="part-row-main">
        {href ? (
          <Link className="part-title" href={href}>
            {title}
          </Link>
        ) : (
          <span className="part-title">{title}</span>
        )}
        {sub && <span className="part-sub">{sub}</span>}
      </span>
      {aside && <span className="part-row-aside">{aside}</span>}
    </li>
  );
}

export function RowList({ children }: { children: ReactNode }) {
  return <ul className="part-rows">{children}</ul>;
}

// Ώρα μπροστά στη γραμμή: «09:30» και από κάτω «έως 14:00».
export function TimeLead({ start, end }: { start: string; end?: string }) {
  return (
    <span className="part-time">
      <strong>{start}</strong>
      {end && <span className="part-sub">έως {end}</span>}
    </span>
  );
}

// Ημερομηνία μπροστά στη γραμμή: μικρή μέρα πάνω, μεγάλος αριθμός κάτω («ΚΥΡ / 25»).
export function DateLead({ weekday, day }: { weekday: string; day: string }) {
  return (
    <span className="part-date">
      <span>{weekday}</span>
      <strong>{day}</strong>
    </span>
  );
}

// Ταινία ομάδας μέσα σε λίστα: «ΣΗΜΕΡΑ · ΠΕΜ 29 … 2 ΓΥΡΙΣΜΑΤΑ».
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
    <li className="part-band" data-today={isToday}>
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
    <span className="part-due" data-late={isLate}>
      {children}
    </span>
  );
}
