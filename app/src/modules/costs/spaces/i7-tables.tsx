import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { Badge, fmtMoney } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import { fmtMonth } from "./i6-model";
import {
  marginText,
  totalMissing,
  type GroupRow,
  type ProductionRow,
} from "./i7-model";
import { signOf } from "./i7-totals";

// Οι πίνακες της Κερδοφορίας ως ml-table (γραμμές των «Χρημάτων»): ό,τι ήταν στήλη μπαίνει στη γραμμή, η Παραγωγή
// ανοίγει τη G3 της και το περιθώριο είναι το ποσό με χρώμα κατά πρόσημο.

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

function Margin({ margin, small }: { margin: number | null; small: string }) {
  return (
    <td className="ml-amount" data-label="Περιθώριο" data-sign={signOf(margin)}>
      {money(margin)}
      <small>{small}</small>
    </td>
  );
}

function ProductionLine({ row }: { row: ProductionRow }) {
  const { production: p } = row;
  const marginSmall =
    row.margin !== null && row.price !== null && row.actualCost !== null
      ? `περιθώριο ${marginText(row.price, row.actualCost)}`
      : null;
  return (
    <tr className="ml-line">
      <td className="ml-thumb" aria-hidden="true">
        {initialsOf(p.title) || "—"}
      </td>
      <td className="ml-main i67-cell" data-label="Παραγωγή">
        <Signals row={row} />
        <strong>
          <Link href={hrefOf("G3", { production: p.id })}>{p.title}</Link>
        </strong>
        <small>
          Τιμή {money(row.price)} · Εκτιμώμενο κόστος {money(row.estimateCost)}{" "}
          · Πραγματικό κόστος {money(row.actualCost)}
        </small>
      </td>
      <Margin
        margin={marginSmall === null ? null : row.margin}
        small={marginSmall ?? "χωρίς κέρδος ακόμα"}
      />
    </tr>
  );
}

export function ProductionTable(props: { rows: readonly ProductionRow[] }) {
  return (
    <table className="ml-table ml-list">
      <caption className="i67-caption">Περιθώριο ανά Παραγωγή</caption>
      <thead>
        <tr>
          <td aria-hidden="true" />
          <th scope="col">Παραγωγή</th>
          <th scope="col">Περιθώριο</th>
        </tr>
      </thead>
      <tbody>
        {props.rows.map((row) => (
          <ProductionLine key={row.production.id} row={row} />
        ))}
      </tbody>
    </table>
  );
}

const countedText = (count: number): string =>
  count === 1 ? "1 Παραγωγή μετρά" : `${count} Παραγωγές μετρούν`;

function GroupLine({ group, isMonth }: { group: GroupRow; isMonth: boolean }) {
  const label = isMonth ? fmtMonth(group.label) : group.label;
  const facts = [
    countedText(group.counted),
    group.isInternal ? null : `Τιμή ${fmtMoney(group.price)}`,
    `Πραγματικό κόστος ${fmtMoney(group.cost)}`,
    group.missing > 0 ? `${group.missing} χωρίς πραγματικές ώρες` : null,
  ].filter(Boolean);
  return (
    <tr className="ml-line">
      <td className="ml-thumb" aria-hidden="true">
        {group.counted}
      </td>
      <td
        className="ml-main i67-cell"
        data-label={isMonth ? "Μήνας" : "Πελάτης"}
      >
        {group.isInternal && <span className="ml-tag">Εσωτερική δουλειά</span>}
        <strong>{label}</strong>
        <small>{facts.join(" · ")}</small>
      </td>
      {group.isInternal ? (
        <Margin margin={null} small="κόστος εσωτερικής δουλειάς" />
      ) : (
        <Margin
          margin={group.price - group.cost}
          small={`περιθώριο ${marginText(group.price, group.cost)}`}
        />
      )}
    </tr>
  );
}

export function GroupTable(props: {
  groups: readonly GroupRow[];
  isMonth: boolean;
}) {
  const missing = totalMissing(props.groups);
  return (
    <>
      {missing > 0 && (
        <p className="note">
          {missing} Παραγωγές χωρίς πραγματικές ώρες δεν μετρούν.
        </p>
      )}
      <table className="ml-table ml-list">
        <caption className="i67-caption">
          Περιθώριο ανά {props.isMonth ? "Μήνα" : "Πελάτη"}
        </caption>
        <thead>
          <tr>
            <td aria-hidden="true" />
            <th scope="col">{props.isMonth ? "Μήνας" : "Πελάτης"}</th>
            <th scope="col">Περιθώριο</th>
          </tr>
        </thead>
        <tbody>
          {props.groups.map((g) => (
            <GroupLine key={g.key} group={g} isMonth={props.isMonth} />
          ))}
        </tbody>
      </table>
    </>
  );
}
