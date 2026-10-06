import Link from "next/link";

import {
  AGING_BUCKETS,
  type ClientRevenueRow,
  type ReceivableRow,
} from "@/data/reports-access";
import type { RoleId } from "@/data/roles";
import {
  Cell,
  ExportRow,
  SummaryCard,
  money,
} from "@/screens/m1-finance-parts";
import {
  Badge,
  StateNotice,
  fmtDate,
  fmtPercent,
  screenHref,
} from "@/screens/shared";

interface BodyProps {
  role: RoleId;
  showAmounts: boolean;
  isEmpty: boolean;
  canExport: boolean;
}

const total = (nums: readonly number[]): number =>
  nums.reduce((s, n) => s + n, 0);

export function ByClientBody(
  props: BodyProps & { rows: readonly ClientRevenueRow[] },
) {
  const { role, rows, showAmounts: show } = props;
  if (props.isEmpty || rows.length === 0) {
    return (
      <StateNotice kind="empty" title="Δεν υπάρχουν Τιμολόγια">
        Δεν υπάρχουν Τιμολόγια σε αυτή την περίοδο. Δοκίμασε άλλη περίοδο.
      </StateNotice>
    );
  }
  return (
    <div className="m1f-wrap">
      <table className="rtable">
        <thead>
          <tr>
            <th>Πελάτης</th>
            <th className="num">Τζίρος</th>
            <th className="num">Μερίδιο</th>
            <th className="num">Τιμολόγια</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.clientId}>
              <Cell label="Πελάτης">
                <Link href={screenHref(role, "B2", { id: r.clientId })}>
                  {r.clientName}
                </Link>
              </Cell>
              <Cell label="Τζίρος" num>
                {money(r.revenue, show)}
              </Cell>
              <Cell label="Μερίδιο" num>
                {show ? fmtPercent(r.share) : "—"}
              </Cell>
              <Cell label="Τιμολόγια" num>
                {r.invoiceCount}
              </Cell>
            </tr>
          ))}
          <tr className="m1f-total">
            <Cell label="Πελάτης">Σύνολο</Cell>
            <Cell label="Τζίρος" num>
              {money(total(rows.map((r) => r.revenue)), show)}
            </Cell>
            <Cell label="Μερίδιο" num>
              {show ? fmtPercent(total(rows.map((r) => r.share))) : "—"}
            </Cell>
            <Cell label="Τιμολόγια" num>
              {total(rows.map((r) => r.invoiceCount))}
            </Cell>
          </tr>
        </tbody>
      </table>
      <p className="note">Τζίρος χωρίς ΦΠΑ, μετά τα Πιστωτικά.</p>
      <ExportRow canExport={props.canExport} />
    </div>
  );
}

function ReceivableLine(props: {
  r: ReceivableRow;
  role: RoleId;
  show: boolean;
}) {
  const { r, role, show } = props;
  return (
    <tr>
      <Cell label="Πελάτης">
        <span>
          <Link href={screenHref(role, "I5", { client: r.clientId })}>
            {r.clientName}
          </Link>
          {r.oldestDue && (
            <span className="m1f-sub">
              παλαιότερη λήξη {fmtDate(r.oldestDue)}
            </span>
          )}
        </span>
      </Cell>
      {AGING_BUCKETS.map((label, i) => (
        <Cell key={label} label={label} num>
          {money(r.buckets[i], show)}{" "}
          {i >= 3 && r.buckets[i] !== 0 && (
            <Badge tone="attention">61+ μέρες</Badge>
          )}
        </Cell>
      ))}
      <Cell label="Σύνολο" num>
        {money(r.total, show)}
      </Cell>
    </tr>
  );
}

export function ReceivablesBody(
  props: BodyProps & { rows: readonly ReceivableRow[] },
) {
  const { role, rows, showAmounts: show } = props;
  if (props.isEmpty || rows.length === 0) {
    return (
      <StateNotice kind="empty" title="Δεν υπάρχουν οφειλές">
        Κανείς δεν χρωστά σήμερα.
      </StateNotice>
    );
  }
  const bucketSum = (i: number) => total(rows.map((r) => r.buckets[i]));
  const grand = total(rows.map((r) => r.total));
  const overdue = grand - bucketSum(0);
  return (
    <div className="m1f-wrap">
      <div className="m1f-cards">
        <SummaryCard
          label="Σύνολο ανεξόφλητων"
          basis="με ΦΠΑ"
          value={money(grand, show)}
        />
        <SummaryCard
          label="Ληξιπρόθεσμα"
          basis="με ΦΠΑ"
          value={money(overdue, show)}
        />
      </div>
      <table className="rtable">
        <thead>
          <tr>
            <th>Πελάτης</th>
            {AGING_BUCKETS.map((b) => (
              <th key={b} className="num">
                {b}
              </th>
            ))}
            <th className="num">Σύνολο</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <ReceivableLine key={r.clientId} r={r} role={role} show={show} />
          ))}
          <tr className="m1f-total">
            <Cell label="Πελάτης">Σύνολο</Cell>
            {AGING_BUCKETS.map((b, i) => (
              <Cell key={b} label={b} num>
                {money(bucketSum(i), show)}
              </Cell>
            ))}
            <Cell label="Σύνολο" num>
              {money(grand, show)}
            </Cell>
          </tr>
        </tbody>
      </table>
      <p className="note">
        Ποσά με ΦΠΑ, όπως τα χρωστά ο Πελάτης. Υπόλοιπο υπέρ του πελάτη δεν
        μετρά εδώ· φαίνεται στην Καρτέλα.
      </p>
      <ExportRow canExport={props.canExport} />
    </div>
  );
}
