import { Panel } from "@/spaces/kit/panel";
import { fmtMoney, fmtPercent } from "@/spaces/screens/shared";

import type { Figures } from "./g3-model";

// Prototype `screens/g3-table.tsx`. Η εξήγηση της τιμής (Περίοδος, Τιμολογητέα έξτρα) λείπει: η γραμμή κόστους δεν τα φέρνει.

const NONE = "—";

const fmtHours = (value: number): string =>
  `${value.toLocaleString("el-GR", { maximumFractionDigits: 1 })} ώ`;
const signed = (text: string, value: number): string =>
  value > 0 ? `+${text}` : text;
const money = (value: number | null | undefined): string =>
  value === null || value === undefined ? NONE : fmtMoney(value);
const marginText = (price: number, cost: number | null): string =>
  cost === null
    ? NONE
    : `${fmtMoney(price - cost)} · ${price > 0 ? fmtPercent((price - cost) / price) : NONE}`;

interface Row {
  label: string;
  estimate: string;
  actual: string;
  diff: string;
  strong?: boolean;
}

const diffMoney = (
  a: number | null | undefined,
  b: number | null | undefined,
): string =>
  a === null || a === undefined || b === null || b === undefined
    ? NONE
    : signed(fmtMoney(b - a), b - a);

const diffHours = (a: number | undefined, b: number | undefined): string =>
  a === undefined || b === undefined ? NONE : signed(fmtHours(b - a), b - a);

const hourRowsOf = (f: Figures, isInternal: boolean): Row[] => {
  const e = f.estimate;
  const a = f.actual;
  const totalE = e ? e.hours.shoot + e.hours.edit : undefined;
  const totalA = a ? a.hours.shoot + a.hours.edit : undefined;
  return [
    {
      label: "Ώρες γυρίσματος",
      estimate: e ? fmtHours(e.hours.shoot) : NONE,
      actual: a ? fmtHours(a.hours.shoot) : NONE,
      diff: diffHours(e?.hours.shoot, a?.hours.shoot),
    },
    {
      label: "Ώρες μοντάζ",
      estimate: e ? fmtHours(e.hours.edit) : NONE,
      actual: a ? fmtHours(a.hours.edit) : NONE,
      diff: diffHours(e?.hours.edit, a?.hours.edit),
    },
    {
      label: "Σύνολο ωρών",
      estimate: totalE === undefined ? NONE : fmtHours(totalE),
      actual: totalA === undefined ? NONE : fmtHours(totalA),
      diff:
        totalE === undefined || totalA === undefined
          ? NONE
          : `${diffHours(totalE, totalA)} (${signed(fmtPercent(f.hoursPercent), f.hoursPercent)})`,
      strong: true,
    },
    {
      label: "Κόστος ώρας",
      estimate: money(e?.hourCost),
      actual: money(a?.hourCost),
      diff: diffMoney(e?.hourCost, a?.hourCost),
    },
    {
      label: "Άμεσο κόστος",
      estimate: money(e?.directCost),
      actual: money(a?.directCost),
      diff: diffMoney(e?.directCost, a?.directCost),
    },
    {
      label: isInternal ? "Κόστος εσωτερικής δουλειάς" : "Κόστος",
      estimate: money(e?.cost),
      actual: money(a?.cost),
      diff: diffMoney(e?.cost, a?.cost),
      strong: true,
    },
  ];
};

const rowsOf = (f: Figures, isInternal: boolean): readonly Row[] => {
  const hourRows = hourRowsOf(f, isInternal);
  if (isInternal || f.price === null) return hourRows;
  const e = f.estimate;
  const a = f.actual;
  return [
    ...hourRows,
    {
      label: "Τιμή",
      estimate: fmtMoney(f.price),
      actual: fmtMoney(f.price),
      diff: NONE,
    },
    {
      label: "Περιθώριο",
      estimate: e ? marginText(f.price, e.cost) : NONE,
      actual: a ? marginText(f.price, a.cost) : NONE,
      diff:
        e && a && e.cost !== null && a.cost !== null
          ? diffMoney(f.price - e.cost, f.price - a.cost)
          : NONE,
      strong: true,
    },
  ];
};

export function G3Table({
  figures,
  isInternal,
}: {
  figures: Figures;
  isInternal: boolean;
}) {
  return (
    <Panel label="Εκτίμηση και πραγματικό">
      <div className="scroll">
        <table className="rtable">
          <thead>
            <tr>
              <th>Γραμμή</th>
              <th className="num">Εκτίμηση</th>
              <th className="num">Πραγματικό</th>
              <th className="num">Διαφορά</th>
            </tr>
          </thead>
          <tbody>
            {rowsOf(figures, isInternal).map((row) => (
              <tr key={row.label}>
                <td data-label="Γραμμή">
                  {row.strong ? <strong>{row.label}</strong> : row.label}
                </td>
                <td className="num" data-label="Εκτίμηση">
                  {row.estimate}
                </td>
                <td className="num g3-actual" data-label="Πραγματικό">
                  {row.actual}
                </td>
                <td className="num" data-label="Διαφορά">
                  {row.diff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        Κόστος ώρας: η εκτίμηση κρατά την τιμή της υπογραφής· το πραγματικό
        παίρνει το Κόστος ώρας του μήνα της Παραγωγής. Όπου λείπουν πραγματικά
        νούμερα, φαίνεται «—»: δεν μετράνε ως μηδέν.
      </p>
      {isInternal && (
        <p className="note">
          Εσωτερική Παραγωγή: δεν έχει τιμή ούτε περιθώριο. Δείχνουμε μόνο το
          κόστος της εσωτερικής δουλειάς.
        </p>
      )}
    </Panel>
  );
}
