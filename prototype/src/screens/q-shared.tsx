import Link from "next/link";
import type { ReactNode } from "react";

import type { RoleId } from "@/data/roles";
import {
  websiteCapsOf,
  type Blocker,
  type PublishStatus,
} from "@/data/website-access";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  fmtDate,
  parseState,
  screenHref,
  type ScreenProps,
  type ScreenState,
} from "@/screens/shared";

import "./q.css";

export const Q_TABS: readonly { code: string; label: string }[] = [
  { code: "Q1", label: "Τομείς" },
  { code: "Q2", label: "Δουλειές" },
  { code: "Q3", label: "Λογότυπα" },
  { code: "Q4", label: "Ομάδα" },
];

export function QTabs({ role, code }: { role: RoleId; code: string }) {
  return (
    <nav className="tabs" aria-label="Περιεχόμενο Ιστοσελίδας">
      {Q_TABS.map((tab) => (
        <Link
          key={tab.code}
          className="tab"
          href={screenHref(role, tab.code, {})}
          aria-current={tab.code === code ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

interface QFrameProps extends ScreenProps {
  code: string;
  what: string;
  children: (state: ScreenState) => ReactNode;
}

// Κοινό πλαίσιο Q1–Q4: δικαίωμα «Διαχειρίζεται Ιστοσελίδα», εναλλαγή κατάστασης, καρτέλες, σφάλμα.
export function QFrame({ role, query, code, what, children }: QFrameProps) {
  const state = parseState(query.state);
  const header = (
    <StateSwitcher
      role={role}
      code={code}
      state={state}
      keep={{ ...query, state: undefined }}
    />
  );
  if (!websiteCapsOf(role).canManageWebsite)
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Το περιεχόμενο της Ιστοσελίδας το διαχειρίζεται όποιος έχει το
          Δικαίωμα «Διαχειρίζεται Ιστοσελίδα»: στο prototype, ο Ιδιοκτήτης και η
          Διαχείριση.
        </StateNotice>
      </>
    );
  return (
    <>
      {header}
      <QTabs role={role} code={code} />
      {state === "error" ? <ErrorNotice what={what} /> : children(state)}
    </>
  );
}

export function AuditLine({ role }: { role: RoleId }) {
  return (
    <p className="note">
      Κάθε αλλαγή γράφεται στο Ίχνος.{" "}
      <Link href={screenHref(role, "P1", {})}>Άνοιγμα Ίχνους</Link>
    </p>
  );
}

export interface QRow {
  id: string;
  name: string;
  sub?: string;
  status: PublishStatus;
  blockersEl: readonly Blocker[];
  blockersEn: readonly Blocker[];
  isShown: boolean;
  order: number;
  isConsentMissing: boolean;
}

const statusTone = (s: PublishStatus) =>
  s === "Δεν φαίνεται"
    ? "attention"
    : s === "Φαίνεται και στα αγγλικά"
      ? "strong"
      : undefined;

export const reasonOf = (
  blockersEl: readonly Blocker[],
  blockersEn: readonly Blocker[],
): string => {
  if (blockersEl.length > 0) return blockersEl.join(", ");
  if (blockersEn.length > 0) return `στα αγγλικά: ${blockersEn.join(", ")}`;
  return "τίποτα δεν λείπει";
};

export const StatusBadge = ({ status }: { status: PublishStatus }) => (
  <Badge tone={statusTone(status)}>{status}</Badge>
);

interface SwitchProps {
  isShown: boolean;
  isConsentMissing: boolean;
}

// Ανάβει μόνο με Συναίνεση δημοσίευσης· χωρίς αυτήν φαίνεται κλειδωμένος με τον λόγο.
export function ShownSwitch({ isShown, isConsentMissing }: SwitchProps) {
  const isLocked = isConsentMissing;
  return (
    <span className="q-switch" data-locked={isLocked}>
      <input
        type="checkbox"
        role="switch"
        checked={isShown && !isLocked}
        disabled={isLocked}
        readOnly
        aria-label="Φαίνεται στην Ιστοσελίδα"
      />
      {isLocked ? "Κλειδωμένο: λείπει Συναίνεση" : isShown ? "Ναι" : "Όχι"}
    </span>
  );
}

function OrderButtons({ index, count }: { index: number; count: number }) {
  return (
    <span className="q-order">
      <button
        className="button"
        type="button"
        disabled={index === 0}
        aria-label="Πάνω"
      >
        ↑
      </button>
      <button
        className="button"
        type="button"
        disabled={index === count - 1}
        aria-label="Κάτω"
      >
        ↓
      </button>
    </span>
  );
}

interface ListProps {
  role: RoleId;
  code: string;
  rows: readonly QRow[];
  nameLabel: string;
}

export function EntryList({ role, code, rows, nameLabel }: ListProps) {
  const sorted = [...rows].sort((a, b) => a.order - b.order);
  return (
    <div className="scroll">
      <table className="rtable">
        <thead>
          <tr>
            <th>{nameLabel}</th>
            <th>Κατάσταση</th>
            <th>Τι λείπει</th>
            <th>Σειρά</th>
            <th>Φαίνεται στην Ιστοσελίδα</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => (
            <tr key={row.id}>
              <td data-label={nameLabel}>
                <Link href={screenHref(role, code, { item: row.id })}>
                  {row.name}
                </Link>
                {row.sub && <div className="q-hint">{row.sub}</div>}
              </td>
              <td data-label="Κατάσταση">
                <StatusBadge status={row.status} />
              </td>
              <td data-label="Τι λείπει">
                {reasonOf(row.blockersEl, row.blockersEn)}
              </td>
              <td data-label="Σειρά">
                <OrderButtons index={index} count={sorted.length} />
              </td>
              <td data-label="Φαίνεται">
                <ShownSwitch
                  isShown={row.isShown}
                  isConsentMissing={row.isConsentMissing}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ToolbarProps {
  role: RoleId;
  code: string;
  newLabel: string;
  children?: ReactNode;
}

export function ListToolbar({ role, code, newLabel, children }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="grow btn-row">{children}</div>
      <Link
        className="button"
        data-primary="true"
        href={screenHref(role, code, { item: "new" })}
      >
        {newLabel}
      </Link>
    </div>
  );
}

export const BackLink = ({ role, code }: { role: RoleId; code: string }) => (
  <p>
    <Link href={screenHref(role, code, {})}>← Πίσω στη λίστα</Link>
  </p>
);

export const lastChange = (u: { when: string; by: string }): string =>
  `Τελευταία αλλαγή: ${fmtDate(u.when)}, ${u.by}`;

export { Field, Pair, SaveBar } from "@/screens/q-fields";

export function ShownCard({
  isShown,
  isConsentMissing,
  reason,
}: SwitchProps & { reason: string }) {
  return (
    <section className="card">
      <h2>Φαίνεται στην Ιστοσελίδα</h2>
      <ShownSwitch isShown={isShown} isConsentMissing={isConsentMissing} />
      <p className="q-hint">{reason}</p>
    </section>
  );
}
