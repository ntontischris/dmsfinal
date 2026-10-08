import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import { marginOf, priceRange } from "../cost";
import { formatMoney, formatMonth, formatPercent } from "../helpers";
import type { AgreementDetail, CostBlock, Totals } from "../types";

import { MutedNote, ReadOnlyList, ReadOnlyRow } from "./terms-section-parts";

const INTERNAL_NOTE =
  "Οι ώρες και το κόστος είναι εσωτερικά· ο πελάτης δεν τα βλέπει ποτέ.";
const LOW_MARGIN_NOTE =
  "Η τιμή είναι κάτω από την ελάχιστη του Εύρους. Ειδοποιεί, δεν μπλοκάρει· δεν είναι Παρέκκλιση.";

function HourCost({ cost }: { cost: CostBlock }) {
  if (cost.hourCost === null)
    return (
      <>
        Δεν έχει οριστεί Κόστος ώρας.{" "}
        <Link href="/app/settings/finance">Ρυθμίσεις Οικονομικών</Link>
      </>
    );
  return (
    <>
      {formatMoney(cost.hourCost)}
      {cost.hourCostMonth && ` (${formatMonth(cost.hourCostMonth)})`}
    </>
  );
}

const marginText = (price: number, cost: CostBlock, estimated: number) => {
  const margin = marginOf(price, estimated, cost.multiplierMin);
  return `${formatMoney(margin.amount)} · ${formatPercent(margin.percent)}`;
};

// Ένα περιθώριο στην τιμή χωρίς έκπτωση και, όταν υπάρχει έκπτωση, ένα και στην τιμή με έκπτωση (αυτό κρίνει το «χαμηλό περιθώριο»).
function MarginRows({
  totals,
  cost,
  estimated,
}: {
  totals: Totals;
  cost: CostBlock;
  estimated: number;
}) {
  const hasDiscount = totals.discountedPrice < totals.price;
  return (
    <>
      <ReadOnlyRow label="Περιθώριο">
        {marginText(totals.price, cost, estimated)}
      </ReadOnlyRow>
      {hasDiscount && (
        <ReadOnlyRow label="Περιθώριο με έκπτωση">
          {marginText(totals.discountedPrice, cost, estimated)}
        </ReadOnlyRow>
      )}
    </>
  );
}

// Κόστος και περιθώριο: ό,τι βλέπει μόνο όποιος «Βλέπει κόστος και κερδοφορία». Μετά την υπογραφή είναι το αντίγραφο της στιγμής της υπογραφής.
export function CostSection({ agreement }: { agreement: AgreementDetail }) {
  const { cost, totals } = agreement;
  if (cost === null) return null;
  const estimated = cost.estimatedCost;
  const range =
    estimated === null
      ? null
      : priceRange(estimated, {
          min: cost.multiplierMin,
          target: cost.multiplierTarget,
          max: cost.multiplierMax,
        });
  return (
    <Panel label="Κόστος και περιθώριο">
      <div className="grid gap-4">
        <ReadOnlyList>
          <ReadOnlyRow label="Κόστος ώρας">
            <HourCost cost={cost} />
          </ReadOnlyRow>
          <ReadOnlyRow label="Εκτιμώμενο κόστος">
            {estimated === null ? "—" : formatMoney(estimated)}
          </ReadOnlyRow>
          <ReadOnlyRow label="Εύρος τιμής">
            {range === null
              ? "—"
              : `${formatMoney(range.min)} – ${formatMoney(range.max)} (στόχος ${formatMoney(range.target)})`}
          </ReadOnlyRow>
          {totals && estimated !== null && (
            <MarginRows totals={totals} cost={cost} estimated={estimated} />
          )}
        </ReadOnlyList>
        {cost.isLowMargin && (
          <div className="grid justify-items-start gap-1">
            <Badge tone="attention">χαμηλό περιθώριο</Badge>
            <MutedNote>{LOW_MARGIN_NOTE}</MutedNote>
          </div>
        )}
        {cost.isFrozen && (
          <MutedNote>Αντίγραφο της στιγμής της υπογραφής.</MutedNote>
        )}
        <MutedNote>{INTERNAL_NOTE}</MutedNote>
      </div>
    </Panel>
  );
}
