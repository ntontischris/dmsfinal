import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { Badge, fmtMoney } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import { marginText, type ProductionRow } from "./i7-model";
import { signOf } from "./i7-totals";

// Κάθε Παραγωγή μία γραμμή των «Χρημάτων» (ml-line): Πελάτης και σήματα, όνομα, τιμή και κόστος μικρά, το κέρδος ως
// ποσό με χρώμα κατά πρόσημο, και «Κόστος» που ανοίγει τη G3 της.

const money = (value: number | null): string =>
  value === null ? "—" : fmtMoney(value);

function Signals({ row }: { row: ProductionRow }) {
  return (
    <span className="i67-signals">
      <span className="ml-tag">{row.clientName}</span>
      {row.overrun && <Badge tone="attention">Υπέρβαση κόστους</Badge>}
      {row.missingHours && <Badge>χωρίς πραγματικές ώρες</Badge>}
      {row.internal && <Badge>εσωτερική</Badge>}
    </span>
  );
}

function Profit({ row }: { row: ProductionRow }) {
  if (row.margin === null || row.price === null || row.actualCost === null)
    return (
      <span className="ml-amount" data-sign="none">
        —
        <small>
          {row.internal ? "κόστος εσωτερικής" : "χωρίς κέρδος ακόμα"}
        </small>
      </span>
    );
  return (
    <span className="ml-amount" data-sign={signOf(row.margin)}>
      {fmtMoney(row.margin)}
      <small>περιθώριο {marginText(row.price, row.actualCost)}</small>
    </span>
  );
}

function ProductionLine({ row }: { row: ProductionRow }) {
  const href = hrefOf("G3", { production: row.production.id });
  return (
    <li className="ml-line i7-line">
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(row.production.title) || "—"}
      </span>
      <span className="ml-main">
        <Signals row={row} />
        <strong>
          <Link href={href}>{row.production.title}</Link>
        </strong>
        <small>
          Τιμή {money(row.price)} · Πραγματικό κόστος {money(row.actualCost)}
        </small>
      </span>
      <Profit row={row} />
      <span className="ml-quick">
        <Link href={href}>Κόστος</Link>
      </span>
    </li>
  );
}

export function ProductionLines({ rows }: { rows: readonly ProductionRow[] }) {
  return (
    <ol className="ml-list" aria-label="Κέρδος ανά Παραγωγή">
      {rows.map((row) => (
        <ProductionLine key={row.production.id} row={row} />
      ))}
    </ol>
  );
}
