import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { fmtDate, fmtPercent } from "@/spaces/screens/shared";

import type { AgingRow, TurnoverByClient } from "../view-schema";
import { DASH, agingCell, money, shareWidth } from "./m1-adapter";
import { initialsOf } from "./m1-box";

// Οι Πελάτες των Αναφορών «Τζίρος ανά Πελάτη» και «Οφειλές» ως γραμμές (όπως η I4): πλακίδιο, ετικέτα, όνομα, ποσό.

export const AGING_BUCKETS = [
  "Δεν έχει λήξει",
  "1–30 μέρες",
  "31–60 μέρες",
  "61–90 μέρες",
  "Πάνω από 90",
] as const;

export const percent = (value: number | null): string =>
  value === null ? DASH : fmtPercent(value);

type ClientRow = TurnoverByClient["rows"][number];

function ClientLine({ r }: { r: ClientRow }) {
  return (
    <li className="ml-line">
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(r.clientName)}
      </span>
      <span className="ml-main">
        <span className="ml-tag">μερίδιο {percent(r.share)}</span>
        <strong>
          <Link href={hrefOf("B2", { id: r.clientId })}>{r.clientName}</Link>
        </strong>
        <small>
          {r.invoiceCount} {r.invoiceCount === 1 ? "Τιμολόγιο" : "Τιμολόγια"}
        </small>
        {r.share !== null && (
          <span className="m1-share" aria-hidden="true">
            <span style={{ width: shareWidth(r.share) }} />
          </span>
        )}
      </span>
      <span className="ml-amount">
        {money(r.turnover)}
        <small>χωρίς ΦΠΑ</small>
      </span>
    </li>
  );
}

export function ClientLines({ rows }: { rows: readonly ClientRow[] }) {
  return (
    <ul className="ml-list">
      {rows.map((r) => (
        <ClientLine key={r.clientId} r={r} />
      ))}
    </ul>
  );
}

const isLate = (r: AgingRow): boolean =>
  (r.counts[3] ?? 0) > 0 || (r.counts[4] ?? 0) > 0;

const tagOf = (r: AgingRow): string => {
  if (isLate(r)) return "61+ μέρες";
  return (r.counts[0] ?? 0) === r.invoiceCount
    ? "δεν έχει λήξει"
    : "ληξιπρόθεσμα ως 60 μέρες";
};

// Μόνο τα κουτιά ηλικίας που έχουν κάτι: «1–30 μέρες 120,00 € · Πάνω από 90 1 Τιμ.».
const bucketsText = (r: AgingRow, amounts: boolean): string =>
  AGING_BUCKETS.flatMap((label, i) =>
    (r.counts[i] ?? 0) === 0
      ? []
      : [
          `${label} ${agingCell(amounts, r.buckets[i] ?? null, r.counts[i] ?? 0)}`,
        ],
  ).join(" · ");

// Η Καρτέλα θέλει «Βλέπει ποσά»· χωρίς αυτό η γραμμή ανοίγει τη Σελίδα Πελάτη.
function ReceivableLine({ r, amounts }: { r: AgingRow; amounts: boolean }) {
  const href = amounts
    ? hrefOf("I5", { client: r.clientId })
    : hrefOf("B2", { id: r.clientId });
  return (
    <li className="ml-line" data-urgent={isLate(r) || undefined}>
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(r.clientName)}
      </span>
      <span className="ml-main">
        <span className="ml-tag">
          {tagOf(r)}
          {r.oldestDue && ` · παλαιότερη λήξη ${fmtDate(r.oldestDue)}`}
        </span>
        <strong>
          <Link href={href}>{r.clientName}</Link>
        </strong>
        <small>{bucketsText(r, amounts)}</small>
      </span>
      <span className="ml-amount">
        {amounts ? money(r.total) : `${r.invoiceCount} Τιμ.`}
        <small>{r.invoiceCount} Τιμολόγια</small>
      </span>
    </li>
  );
}

export function ReceivableLines(props: {
  rows: readonly AgingRow[];
  amounts: boolean;
}) {
  return (
    <ul className="ml-list">
      {props.rows.map((r) => (
        <ReceivableLine key={r.clientId} r={r} amounts={props.amounts} />
      ))}
    </ul>
  );
}
