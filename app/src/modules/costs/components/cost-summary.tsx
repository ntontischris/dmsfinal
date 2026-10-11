import { Panel } from "@/components/ui/panel";

import { NO_VALUE_LABEL } from "../labels";
import {
  actualHours,
  estimateHours,
  formatHours,
  formatMoney,
  formatPercent,
  marginOf,
} from "../helpers";
import type { CostRow } from "../types";

import { SignalBadges } from "./signal-badges";

// Τα νούμερα της Παραγωγής, μόνο για ανάγνωση: εκτίμηση, πραγματικό, περιθώριο και σήματα.
export function CostSummary({ row }: { row: CostRow }) {
  const margin = marginOf(row);
  return (
    <Panel label="Κόστος">
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 p-4 text-sm">
        <Item label="Εκτίμηση ωρών" value={formatHours(estimateHours(row))} />
        <Item label="Εκτίμηση κόστους" value={formatMoney(row.estimate.cost)} />
        <Item label="Πραγματικές ώρες" value={formatHours(actualHours(row))} />
        <Item label="Πραγματικό κόστος" value={formatMoney(row.actual.cost)} />
        <Item label="Κόστος ώρας" value={row.hourCost === null ? NO_VALUE_LABEL : formatMoney(row.hourCost)} />
        <Item label="Τιμή" value={row.estimate.price === null ? NO_VALUE_LABEL : formatMoney(row.estimate.price)} />
        <Item
          label="Περιθώριο"
          value={margin ? `${formatMoney(margin.amount)} (${formatPercent(margin.percent)})` : NO_VALUE_LABEL}
        />
        <Item label="Ολοκληρωμένες ώρες" value={row.hoursComplete ? "Ναι" : "Όχι"} />
        <dt className="text-muted-foreground">Σήματα</dt>
        <dd className="m-0">
          <SignalBadges signals={row.signals} />
        </dd>
      </dl>
    </Panel>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 text-right tabular-nums">{value}</dd>
    </>
  );
}
