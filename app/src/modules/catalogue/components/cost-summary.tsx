import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

import { costOf, marginOf } from "../cost";
import {
  formatHours,
  formatMoney,
  formatMonth,
  formatMultiplier,
  formatPercent,
} from "../helpers";
import type { CatalogueItem, CostHint, ItemCost } from "../types";

import { MutedNote } from "./item-basics-form-parts";

const FINANCE_HREF = "/app/settings/finance";

function FinanceLink() {
  return <Link href={FINANCE_HREF}>Ρυθμίσεις › Οικονομικά</Link>;
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-0.5">
      <dt className="kit-label">{label}</dt>
      <dd className="m-0 grid gap-1 text-sm tabular-nums">{children}</dd>
    </div>
  );
}

function HourCostRow({ hint }: { hint: CostHint & { hourCost: number } }) {
  return (
    <SummaryRow label="Κόστος ώρας">
      <span>
        {formatMoney(hint.hourCost)}
        {hint.hourCostMonth && ` (${formatMonth(hint.hourCostMonth)})`}
      </span>
      <span className="text-muted-foreground">
        <FinanceLink />
      </span>
    </SummaryRow>
  );
}

function EstimateRow({ cost }: { cost: ItemCost }) {
  return (
    <SummaryRow label="Εκτιμώμενο κόστος">
      <span>
        {"= "}
        {formatHours(cost.totalHours)} × {formatMoney(cost.hourCost)}
        {cost.directCost > 0 && ` + ${formatMoney(cost.directCost)}`}
        {" = "}
        <strong>{formatMoney(cost.estimatedCost)}</strong>
      </span>
    </SummaryRow>
  );
}

function RangeRow({ cost, hint }: { cost: ItemCost; hint: CostHint }) {
  const { min, target, max } = hint.multipliers;
  const multipliers = `×${formatMultiplier(min)} / ×${formatMultiplier(target)} / ×${formatMultiplier(max)}`;
  return (
    <SummaryRow label="Εύρος τιμής">
      <span>
        ελάχιστη {formatMoney(cost.range.min)} · στόχος{" "}
        {formatMoney(cost.range.target)} · μέγιστη {formatMoney(cost.range.max)}
      </span>
      <span className="text-muted-foreground">{multipliers}</span>
    </SummaryRow>
  );
}

function MarginRow({ price, cost }: { price: number; cost: ItemCost }) {
  const margin = marginOf(price, cost);
  return (
    <SummaryRow label="Περιθώριο στην τιμή">
      <span className="flex flex-wrap items-center gap-2">
        {formatMoney(margin.amount)} · {formatPercent(margin.percent)}
        {margin.isBelowMin && (
          <Badge tone="attention">κάτω από την ελάχιστη</Badge>
        )}
      </span>
      {margin.isBelowMin && (
        <span className="text-muted-foreground">
          Κάθε πρόταση με αυτή την τιμή θα ανάβει «χαμηλό περιθώριο». Εδώ είναι
          μόνο ένδειξη: ο Κατάλογος δεν ειδοποιεί.
        </span>
      )}
    </SummaryRow>
  );
}

interface CostSummaryProps {
  item: CatalogueItem;
  hint: CostHint | null;
}

// Η εκτίμηση βγαίνει από τα αποθηκευμένα στοιχεία και το Κόστος ώρας που ισχύει σήμερα· δεν ξαναϋπολογίζεται την ώρα που πληκτρολογείς.
export function CostSummary({ item, hint }: CostSummaryProps) {
  if (hint === null || hint.hourCost === null)
    return (
      <MutedNote>
        Δεν έχει οριστεί Κόστος ώρας. <FinanceLink />
      </MutedNote>
    );
  const cost = costOf(item, hint);
  if (cost === null) return null;
  return (
    <div className="grid gap-3 border-t pt-3">
      <dl className="m-0 grid gap-3">
        <HourCostRow hint={{ ...hint, hourCost: hint.hourCost }} />
        <EstimateRow cost={cost} />
        <RangeRow cost={cost} hint={hint} />
        {item.price !== null && <MarginRow price={item.price} cost={cost} />}
      </dl>
      {!cost.hasHours && (
        <MutedNote>
          Οι ώρες δεν έχουν οριστεί ακόμα, οπότε το κόστος βγαίνει μόνο από το
          Άμεσο κόστος.
        </MutedNote>
      )}
    </div>
  );
}
