import Link from "next/link";

import type { Viewer } from "@/modules/access";

import { findReport } from "../catalog";
import { monthLabel } from "../format";
import { PARTIAL_BADGE } from "../labels";
import { getExpensesByCategory } from "../money-queries";
import { getReceivablesAging, getTurnoverMonthly } from "../queries";
import { reportHref, type PeriodCode } from "../url";
import { money } from "./m1-adapter";
import { Facts, type Fact } from "./m1-box";

// «Ο μήνας με μια ματιά»: πάνω από το ράφι των Αναφορών, ο Τζίρος του μήνα μεγάλος και δίπλα Εισπράξεις, Έξοδα και ό,τι
// μένει ανοιχτό. Τα ίδια RPC με τις Αναφορές «Τζίρος ανά μήνα», «Έξοδα» και «Οφειλές»· κάθε αριθμός φαίνεται μόνο σε
// όποιον βλέπει την Αναφορά του, και η βάση ξαναελέγχει ποσά.

const MONTH: PeriodCode = "this-month";

const sees = (viewer: Viewer, id: string): boolean =>
  findReport(id)?.isVisible(viewer) ?? false;

async function loadMonth(viewer: Viewer) {
  const [turnover, expenses, receivables] = await Promise.all([
    getTurnoverMonthly(MONTH),
    sees(viewer, "expenses") ? getExpensesByCategory(MONTH) : null,
    sees(viewer, "receivables") ? getReceivablesAging() : null,
  ]);
  return { turnover, expenses, receivables };
}

const factsOf = (
  data: Awaited<ReturnType<typeof loadMonth>>,
): readonly Fact[] => {
  const { turnover, expenses, receivables } = data;
  return [
    ...(turnover.ok
      ? [
          {
            label: "Εισπράξεις",
            value: money(turnover.data.totals.collections),
            basis: "με ΦΠΑ",
          },
        ]
      : []),
    ...(expenses?.ok
      ? [
          {
            label: "Έξοδα",
            value: money(expenses.data.totals.amount),
            basis: "από το Κόστος",
          },
        ]
      : []),
    ...(receivables?.ok
      ? [
          {
            label: "Ανοιχτά",
            value: receivables.data.amounts
              ? money(receivables.data.totals.total)
              : `${receivables.data.totals.invoiceCount} Τιμ.`,
            basis: "ανεξόφλητα σήμερα",
          },
        ]
      : []),
  ];
};

export async function MonthHero({ viewer }: { viewer: Viewer }) {
  if (!sees(viewer, "turnover")) return null;
  const data = await loadMonth(viewer);
  const { turnover } = data;
  const month = turnover.ok ? turnover.data.months[0]?.month : undefined;
  return (
    <header className="ml-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        €
      </span>
      <div>
        <span className="m1-month">
          {month ? monthLabel(month) : "Αυτός ο μήνας"} · {PARTIAL_BADGE}
        </span>
        <h2>Ο μήνας με μια ματιά</h2>
        <p className="ml-hero-amount">
          {turnover.ok ? money(turnover.data.totals.turnover) : "—"}
          <small>Τζίρος χωρίς ΦΠΑ, κατά έκδοση</small>
        </p>
        <Facts items={factsOf(data)} />
      </div>
      <div className="ml-quick">
        <Link
          data-primary="true"
          href={reportHref({ report: "turnover", period: MONTH })}
        >
          Ο μήνας αναλυτικά
        </Link>
      </div>
    </header>
  );
}
