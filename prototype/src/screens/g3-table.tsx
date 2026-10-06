import { agreementTotal } from "@/data/agreements";
import type { ProductionStub } from "@/data/filming";
import {
  agreementOf,
  isInternal,
  periodOfProduction,
  recordOf,
} from "@/data/productions-access";
import type { Figures } from "@/screens/g3-model";
import { fmtMoney, fmtPercent } from "@/screens/shared";

const fmtHours = (value: number): string =>
  `${value.toLocaleString("el-GR", { maximumFractionDigits: 1 })} ώ`;
const signed = (text: string, value: number): string =>
  value > 0 ? `+${text}` : text;
const marginText = (price: number, cost: number): string =>
  `${fmtMoney(price - cost)} · ${price > 0 ? fmtPercent((price - cost) / price) : "—"}`;

interface Row {
  label: string;
  estimate: string;
  actual: string;
  diff: string;
  strong?: boolean;
}

const diffMoney = (a: number | undefined, b: number | undefined): string =>
  a === undefined || b === undefined
    ? "—"
    : signed(fmtMoney(b - a), b - a);

const diffHours = (a: number | undefined, b: number | undefined): string =>
  a === undefined || b === undefined ? "—" : signed(fmtHours(b - a), b - a);

const rowsOf = (production: ProductionStub, f: Figures): readonly Row[] => {
  const e = f.estimate;
  const a = f.actual;
  const totalE = e ? e.hours.shoot + e.hours.edit : undefined;
  const totalA = a ? a.hours.shoot + a.hours.edit : undefined;
  const internal = isInternal(production);
  const hourRows: Row[] = [
    {
      label: "Ώρες γυρίσματος",
      estimate: e ? fmtHours(e.hours.shoot) : "—",
      actual: a ? fmtHours(a.hours.shoot) : "—",
      diff: diffHours(e?.hours.shoot, a?.hours.shoot),
    },
    {
      label: "Ώρες μοντάζ",
      estimate: e ? fmtHours(e.hours.edit) : "—",
      actual: a ? fmtHours(a.hours.edit) : "—",
      diff: diffHours(e?.hours.edit, a?.hours.edit),
    },
    {
      label: "Σύνολο ωρών",
      estimate: totalE === undefined ? "—" : fmtHours(totalE),
      actual: totalA === undefined ? "—" : fmtHours(totalA),
      diff:
        totalE === undefined || totalA === undefined
          ? "—"
          : `${diffHours(totalE, totalA)} (${signed(fmtPercent(f.hoursPercent), f.hoursPercent)})`,
      strong: true,
    },
    {
      label: "Κόστος ώρας",
      estimate: e ? fmtMoney(e.hourCost) : "—",
      actual: a ? fmtMoney(a.hourCost) : "—",
      diff: diffMoney(e?.hourCost, a?.hourCost),
    },
    {
      label: "Άμεσο κόστος",
      estimate: e ? fmtMoney(e.directCost) : "—",
      actual: a ? fmtMoney(a.directCost) : "—",
      diff: diffMoney(e?.directCost, a?.directCost),
    },
    {
      label: internal ? "Κόστος εσωτερικής δουλειάς" : "Κόστος",
      estimate: e ? fmtMoney(e.cost) : "—",
      actual: a ? fmtMoney(a.cost) : "—",
      diff: diffMoney(e?.cost, a?.cost),
      strong: true,
    },
  ];
  if (internal || f.price === null) return hourRows;
  return [
    ...hourRows,
    {
      label: "Τιμή",
      estimate: fmtMoney(f.price),
      actual: fmtMoney(f.price),
      diff: "—",
    },
    {
      label: "Περιθώριο",
      estimate: e ? marginText(f.price, e.cost) : "—",
      actual: a ? marginText(f.price, a.cost) : "—",
      diff: e && a ? diffMoney(f.price - e.cost, f.price - a.cost) : "—",
      strong: true,
    },
  ];
};

export function G3Table({
  production,
  figures,
}: {
  production: ProductionStub;
  figures: Figures;
}) {
  return (
    <section className="card">
      <h2>Εκτίμηση και πραγματικό</h2>
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
            {rowsOf(production, figures).map((row) => (
              <tr key={row.label}>
                <td data-label="Γραμμή">
                  {row.strong ? <strong>{row.label}</strong> : row.label}
                </td>
                <td className="num" data-label="Εκτίμηση">{row.estimate}</td>
                <td className="num" data-label="Πραγματικό">{row.actual}</td>
                <td className="num" data-label="Διαφορά">{row.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        Κόστος ώρας: η εκτίμηση κρατά την τιμή της υπογραφής· το πραγματικό
        παίρνει το Κόστος ώρας του μήνα της Παραγωγής. Όπου λείπουν
        πραγματικά νούμερα, φαίνεται «—»: δεν μετράνε ως μηδέν.
      </p>
      <PriceExplanation production={production} />
    </section>
  );
}

function PriceExplanation({ production }: { production: ProductionStub }) {
  const agreement = agreementOf(production);
  const extras = recordOf(production).extras;
  if (!agreement)
    return (
      <p className="note">
        Εσωτερική Παραγωγή: δεν έχει τιμή ούτε περιθώριο. Δείχνουμε μόνο το
        κόστος της εσωτερικής δουλειάς.
      </p>
    );
  const period = periodOfProduction(production);
  return (
    <div className="note">
      <p>
        {period
          ? `Τιμή = το ποσό της Περιόδου «${period.label}» (μετά την έκπτωση πρώτων μηνών, αναλογικό αν η πρώτη Περίοδος είναι σπασμένη· οι ώρες μένουν ολόκληρες, όπως οι Παροχές) + τα Τιμολογητέα έξτρα. Μετράει στον μήνα της Περιόδου.`
          : `Τιμή = ολόκληρη η Συμφωνία (${fmtMoney(agreementTotal(agreement))}) + τα Τιμολογητέα έξτρα. Μετράει στον μήνα παράδοσης.`}
      </p>
      {extras.length === 0 ? (
        <p>Δεν έχει έξτρα.</p>
      ) : (
        <ul className="list">
          {extras.map((extra) => (
            <li key={extra.label}>
              {extra.label}:{" "}
              {extra.amount > 0 ? `με χρέωση +${fmtMoney(extra.amount)}` : "χωρίς χρέωση"}
              , +{fmtHours(extra.hours.shoot + extra.hours.edit)} εκτίμησης
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
