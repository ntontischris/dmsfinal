import { hrefOf } from "@/spaces/data/screens";
import { Entity } from "@/spaces/kit/parts";
import { Badge, fmtMoney } from "@/spaces/screens/shared";

import { fmtMonth } from "./i6-model";
import {
  marginText,
  totalMissing,
  type GroupRow,
  type ProductionRow,
} from "./i7-model";

// Οι πίνακες της Κερδοφορίας (prototype `screens/i7-tables.tsx`, αυτούσιο· η Παραγωγή ανοίγει τη G3 της).

const money = (value: number | null): string =>
  value === null ? "—" : fmtMoney(value);

function Signals({ row }: { row: ProductionRow }) {
  return (
    <span className="i67-signals">
      {row.overrun && <Badge tone="attention">Υπέρβαση κόστους</Badge>}
      {row.missingHours && <Badge>χωρίς πραγματικές ώρες</Badge>}
      {row.internal && <Badge>εσωτερική</Badge>}
    </span>
  );
}

function ProductionLine({ row }: { row: ProductionRow }) {
  const { production: p } = row;
  const margin =
    row.margin !== null && row.price !== null && row.actualCost !== null
      ? `${fmtMoney(row.margin)} · ${marginText(row.price, row.actualCost)}`
      : "—";
  return (
    <tr>
      <td data-label="Παραγωγή" className="i67-cell">
        <Entity
          name={p.title}
          href={hrefOf("G3", { production: p.id })}
          sub={row.clientName}
        />
      </td>
      <td data-label="Τιμή" className="num i67-money">
        {money(row.price)}
      </td>
      <td data-label="Εκτιμώμενο κόστος" className="num">
        {money(row.estimateCost)}
      </td>
      <td data-label="Πραγματικό κόστος" className="num">
        {money(row.actualCost)}
      </td>
      <td data-label="Περιθώριο" className="num i67-money">
        {margin}
      </td>
      <td data-label="Σήματα">
        <Signals row={row} />
      </td>
    </tr>
  );
}

export function ProductionTable(props: { rows: readonly ProductionRow[] }) {
  return (
    <div className="scroll i67-glass">
    <table className="rtable">
      <thead>
        <tr>
          <th>Παραγωγή</th>
          <th className="num">Τιμή</th>
          <th className="num">Εκτιμώμενο κόστος</th>
          <th className="num">Πραγματικό κόστος</th>
          <th className="num">Περιθώριο</th>
          <th>Σήματα</th>
        </tr>
      </thead>
      <tbody>
        {props.rows.map((row) => (
          <ProductionLine key={row.production.id} row={row} />
        ))}
      </tbody>
    </table>
    </div>
  );
}

function GroupLine({ group, isMonth }: { group: GroupRow; isMonth: boolean }) {
  const label = isMonth ? fmtMonth(group.label) : group.label;
  const margin = group.price - group.cost;
  return (
    <tr>
      <td data-label={isMonth ? "Μήνας" : "Πελάτης"} className="i67-cell">
        <Entity
          name={group.isInternal ? `Εσωτερική δουλειά · ${label}` : label}
          sub={
            group.missing > 0
              ? `${group.missing} χωρίς πραγματικές ώρες`
              : undefined
          }
        />
      </td>
      <td data-label="Παραγωγές που μετρούν" className="num">
        {group.counted}
      </td>
      <td data-label="Τιμή" className="num i67-money">
        {group.isInternal ? "—" : fmtMoney(group.price)}
      </td>
      <td data-label="Πραγματικό κόστος" className="num">
        {fmtMoney(group.cost)}
      </td>
      <td data-label="Περιθώριο" className="num i67-money">
        {group.isInternal
          ? "κόστος εσωτερικής δουλειάς"
          : `${fmtMoney(margin)} · ${marginText(group.price, group.cost)}`}
      </td>
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
      <div className="scroll i67-glass">
      <table className="rtable">
        <thead>
          <tr>
            <th>{props.isMonth ? "Μήνας" : "Πελάτης"}</th>
            <th className="num">Παραγωγές που μετρούν</th>
            <th className="num">Τιμή</th>
            <th className="num">Πραγματικό κόστος</th>
            <th className="num">Περιθώριο</th>
          </tr>
        </thead>
        <tbody>
          {props.groups.map((g) => (
            <GroupLine key={g.key} group={g} isMonth={props.isMonth} />
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}
