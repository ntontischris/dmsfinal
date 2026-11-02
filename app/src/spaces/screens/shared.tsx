import type { ReactNode } from "react";

import { explainStatus } from "@/spaces/data/glossary";
import { StatusHelp } from "@/spaces/screens/status-help";

// Κοινά των οθονών της νέας εμφάνισης, από το prototype (`screens/shared.tsx`). Το screenHref(role, code, query) του prototype
// έγινε hrefOf(code, params) στο `@/spaces/data/screens`, με τις πραγματικές διαδρομές.

export type ScreenQuery = Readonly<Record<string, string | undefined>>;

interface StateNoticeProps {
  kind: "empty" | "error" | "denied";
  title: string;
  children?: ReactNode;
}

export function StateNotice({ kind, title, children }: StateNoticeProps) {
  return (
    <section
      className="card notice"
      data-kind={kind}
      role={kind === "error" ? "alert" : "status"}
    >
      <h2>{title}</h2>
      {children && <div className="muted">{children}</div>}
    </section>
  );
}

export function ErrorNotice({ what }: { what: string }) {
  return (
    <StateNotice kind="error" title={`Δεν φορτώθηκε: ${what}`}>
      <p>
        Κάτι πήγε στραβά στον διακομιστή. Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε
        λίγο.
      </p>
    </StateNotice>
  );
}

// attention = πρόβλημα (κόκκινο), strong = «σειρά σου» (χρώμα έμφασης), ok = έτοιμο (πράσινο),
// waiting = περιμένει άλλον, π.χ. τον πελάτη (κίτρινο), faded = κλειστό/ακυρωμένο (ξεθωριασμένο).
export type BadgeTone = "attention" | "strong" | "ok" | "waiting" | "faded";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

// Το κείμενο του σήματος, όταν είναι απλές λέξεις και αριθμοί.
const textOf = (children: ReactNode): string | null => {
  if (typeof children === "string" || typeof children === "number")
    return String(children);
  if (!Array.isArray(children)) return null;
  const parts = children.map(textOf);
  return parts.every((part) => part !== null) ? parts.join("") : null;
};

// Αν το σήμα είναι όρος του γλωσσαριού, δίπλα του μπαίνει το «τι σημαίνει;».
export function Badge({ tone, children }: BadgeProps) {
  const badge = (
    <span className="badge" data-tone={tone}>
      {children}
    </span>
  );
  const text = textOf(children);
  const entries = text === null ? [] : explainStatus(text);
  if (text === null || entries.length === 0) return badge;
  return (
    <span className="badge-with-help">
      {badge}
      <StatusHelp label={text} entries={entries} />
    </span>
  );
}

const MONEY = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const MONEY_CENTS = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
// Ακέραια ποσά χωρίς δεκαδικά· με λεπτά όταν υπάρχουν (π.χ. ΦΠΑ, Εισπράξεις).
export const fmtMoney = (value: number): string =>
  Number.isInteger(Math.round(value * 100) / 100)
    ? MONEY.format(value)
    : MONEY_CENTS.format(value);

const PERCENT = new Intl.NumberFormat("el-GR", {
  style: "percent",
  maximumFractionDigits: 0,
});
export const fmtPercent = (value: number): string => PERCENT.format(value);

export const fmtDate = (iso: string): string => {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};
