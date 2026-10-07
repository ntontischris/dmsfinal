import Link from "next/link";
import type { ReactNode } from "react";

import type { RoleId } from "@/data/roles";

import "./screens.css";

export type ScreenState = "normal" | "empty" | "error";
export type ScreenQuery = Readonly<Record<string, string | undefined>>;

export interface ScreenProps {
  role: RoleId;
  query: ScreenQuery;
}

export const parseState = (value: string | undefined): ScreenState =>
  value === "empty" || value === "error" ? value : "normal";

export const screenHref = (
  role: RoleId,
  code: string,
  params: Readonly<Record<string, string | undefined>>,
): string => {
  const search = new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => !!entry[1],
    ),
  ).toString();
  return `/${role}/${code}${search ? `?${search}` : ""}`;
};

const STATE_LABELS: readonly { state: ScreenState; label: string }[] = [
  { state: "normal", label: "κανονική" },
  { state: "empty", label: "κενή" },
  { state: "error", label: "σφάλμα" },
];

interface StateSwitcherProps {
  role: RoleId;
  code: string;
  state: ScreenState;
  keep?: Readonly<Record<string, string | undefined>>;
}

export function StateSwitcher({
  role,
  code,
  state,
  keep = {},
}: StateSwitcherProps) {
  return (
    <nav className="sw" aria-label="Κατάσταση οθόνης">
      <span>Κατάσταση:</span>
      {STATE_LABELS.map((item, index) => (
        <span key={item.state}>
          {index > 0 && "· "}
          <Link
            href={screenHref(role, code, {
              ...keep,
              state: item.state === "normal" ? undefined : item.state,
            })}
            aria-current={item.state === state}
          >
            {item.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}

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
      <p>
        Αν συνεχιστεί, ενημέρωσε τη Διαχείριση (κωδικός σφάλματος: DMS-503).
      </p>
    </StateNotice>
  );
}

// attention = πρόβλημα (κόκκινο), strong = «σειρά σου» (χρώμα έμφασης), ok = έτοιμο (πράσινο).
export type BadgeTone = "attention" | "strong" | "ok";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone, children }: BadgeProps) {
  return (
    <span className="badge" data-tone={tone}>
      {children}
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
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};
