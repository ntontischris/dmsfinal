import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";
import { Badge } from "@/spaces/screens/shared";

import { marginOf, priceRange } from "../cost";
import {
  describeDeviation,
  formatMoney,
  formatMonth,
  formatNumber,
  formatPercent,
} from "../helpers";
import { DEVIATION_STATUS_LABELS } from "../labels";
import type { AgreementDetail, CostBlock } from "../types";
import { approvedRevisionOf } from "./d2-model";

// Κόστος και περιθώριο, Παρεκκλίσεις (prototype `screens/d2-cost.tsx`) με τα πραγματικά νούμερα της βάσης.

const marginText = (price: number, cost: CostBlock, estimated: number) => {
  const margin = marginOf(price, estimated, cost.multiplierMin);
  return `${formatMoney(margin.amount)} · ${formatPercent(margin.percent)}`;
};

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
      ώρα × {formatMoney(cost.hourCost)}
      {cost.hourCostMonth && ` (${formatMonth(cost.hourCostMonth)})`} + άμεσο
      κόστος
    </>
  );
}

export function CostSection({ agreement }: { agreement: AgreementDetail }) {
  const { cost, totals } = agreement;
  if (cost === null) return null;
  const estimated = cost.estimatedCost;
  const multipliers = {
    min: cost.multiplierMin,
    target: cost.multiplierTarget,
    max: cost.multiplierMax,
  };
  const range = estimated === null ? null : priceRange(estimated, multipliers);
  const perPeriod = agreement.kind === "monthly" ? " ανά Περίοδο" : "";
  const hasDiscount = totals !== null && totals.discountedPrice < totals.price;
  return (
    <Panel
      label="Κόστος και περιθώριο"
      aside={
        cost.isLowMargin ? (
          <Badge tone="attention">χαμηλό περιθώριο</Badge>
        ) : undefined
      }
    >
      <dl className="dl">
        <dt>Εκτιμώμενο κόστος</dt>
        <dd>
          <strong>{estimated === null ? "—" : formatMoney(estimated)}</strong>
          {perPeriod}
          <div className="muted">
            <HourCost cost={cost} />
          </div>
        </dd>
        <dt>Εύρος</dt>
        <dd>
          {range === null
            ? "—"
            : `ελάχιστη ${formatMoney(range.min)} · στόχος ${formatMoney(range.target)} · μέγιστη ${formatMoney(range.max)}`}
          <div className="muted">
            κόστος × {formatNumber(multipliers.min)} /{" "}
            {formatNumber(multipliers.target)} / {formatNumber(multipliers.max)}
          </div>
        </dd>
        {totals && (
          <>
            <dt>Τιμή</dt>
            <dd>{formatMoney(totals.price)}</dd>
          </>
        )}
        {totals && estimated !== null && (
          <>
            <dt>Περιθώριο</dt>
            <dd>
              <strong>{marginText(totals.price, cost, estimated)}</strong>
              {hasDiscount && (
                <div className="muted">
                  με έκπτωση:{" "}
                  {marginText(totals.discountedPrice, cost, estimated)}
                </div>
              )}
              {cost.isLowMargin && (
                <div className="muted">
                  Η τιμή είναι κάτω από την ελάχιστη του Εύρους. Ειδοποιεί, δεν
                  μπλοκάρει· δεν είναι Παρέκκλιση.
                </div>
              )}
            </dd>
          </>
        )}
      </dl>
      {cost.isFrozen && (
        <p className="muted">Αντίγραφο της στιγμής της υπογραφής.</p>
      )}
      <p className="muted">
        Οι ώρες και το κόστος είναι εσωτερικά· ο πελάτης δεν τα βλέπει ποτέ.
      </p>
    </Panel>
  );
}

// Κάθε Παρέκκλιση με το αν την καλύπτει η τελευταία Έγκριση. Η βάση τις δίνει μόνο σε όποιον τις δικαιούται.
export function DeviationsSection({
  agreement,
}: {
  agreement: AgreementDetail;
}) {
  const { deviations, can, needsApproval } = agreement;
  if (deviations.length === 0 && !can.edit) return null;
  const approvedIn = approvedRevisionOf(agreement);
  const isProposal = agreement.state === "proposal";
  return (
    <Panel label="Παρεκκλίσεις">
      {deviations.length === 0 ? (
        <p className="muted">
          {isProposal
            ? "Καμία Παρέκκλιση: η πρόταση στέλνεται κατευθείαν."
            : "Καμία Παρέκκλιση."}
        </p>
      ) : (
        <ul className="list">
          {deviations.map((deviation) => (
            <li key={deviation.key}>
              {describeDeviation(deviation, can.seeAmounts)}{" "}
              {deviation.status === "covered" ? (
                <Badge>
                  {approvedIn === null
                    ? DEVIATION_STATUS_LABELS.covered
                    : `εγκρίθηκε στην αναθεώρηση ${approvedIn}`}
                </Badge>
              ) : (
                <Badge tone="attention">
                  {DEVIATION_STATUS_LABELS[deviation.status]}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
      {isProposal && deviations.length > 0 && (
        <p className="note">
          {needsApproval
            ? "Δεν στέλνεται χωρίς Έγκριση: υπάρχει Παρέκκλιση νέα ή βαθύτερη από όσο εγκρίθηκε."
            : "Η τελευταία Έγκριση καλύπτει όλες τις Παρεκκλίσεις: στέλνεται."}
        </p>
      )}
      {!isProposal && (
        <p className="muted">
          Σε σχέση με τον Κατάλογο και τις προεπιλογές της στιγμής της πρότασης.
        </p>
      )}
    </Panel>
  );
}
