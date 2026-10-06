"use client";

import {
  agreementTotal,
  costOfAgreement,
  deviationItemsOf,
  type AgreementRecord,
} from "@/data/agreements";
import { COST_SETTINGS, hourCost } from "@/data/catalogue";
import { latestApproval, needsApproval, uncoveredOf } from "@/screens/d2-model";
import { Badge, fmtMoney, fmtPercent } from "@/screens/shared";

// Μόνο για όσους «Βλέπουν κόστος και κερδοφορία». Ξαναϋπολογίζεται σε κάθε αλλαγή γραμμής.
export function CostSection({ draft }: { draft: AgreementRecord }) {
  const cost = costOfAgreement(draft);
  const { min, target, max } = COST_SETTINGS.multipliers;
  const perPeriod = draft.kind === "μηνιαία" ? " ανά Περίοδο" : "";
  return (
    <section className="card">
      <div className="card-title">
        <h2>Κόστος και περιθώριο</h2>
        {cost.isLowMargin && <Badge tone="attention">χαμηλό περιθώριο</Badge>}
      </div>
      <dl className="dl">
        <dt>Εκτιμώμενο κόστος</dt>
        <dd>
          <strong>{fmtMoney(cost.estimatedCost)}</strong>
          {perPeriod}
          <div className="muted">
            {cost.hours} ώρες × {fmtMoney(hourCost())} (
            {COST_SETTINGS.monthLabel}) + άμεσο κόστος
          </div>
        </dd>
        <dt>Εύρος</dt>
        <dd>
          ελάχιστη {fmtMoney(cost.range.min)} · στόχος{" "}
          {fmtMoney(cost.range.target)} · μέγιστη {fmtMoney(cost.range.max)}
          <div className="muted">
            κόστος × {min} / {target} / {max}
          </div>
        </dd>
        <dt>Τιμή</dt>
        <dd>{fmtMoney(agreementTotal(draft))}</dd>
        <dt>Περιθώριο</dt>
        <dd>
          <strong>
            {fmtMoney(cost.margin)} · {fmtPercent(cost.marginPercent)}
          </strong>
          {cost.isLowMargin && (
            <div className="muted">
              Η τιμή είναι κάτω από την ελάχιστη του Εύρους. Ειδοποιεί, δεν
              μπλοκάρει· δεν είναι Παρέκκλιση.
            </div>
          )}
        </dd>
      </dl>
    </section>
  );
}

interface DeviationsProps {
  draft: AgreementRecord;
  canDeviate: boolean;
}

function DeviationBadge({ isUncovered, draft, canDeviate }: { isUncovered: boolean; draft: AgreementRecord; canDeviate: boolean }) {
  if (isUncovered)
    return canDeviate || draft.state !== "πρόταση" ? null : <Badge tone="attention">θέλει Έγκριση</Badge>;
  return <Badge>εγκρίθηκε στην αναθεώρηση {latestApproval(draft)?.number}</Badge>;
}

// Κάθε Παρέκκλιση με το βάθος της: καλύπτεται μόνο αν η τελευταία Έγκριση ενέκρινε ίσο ή μεγαλύτερο νούμερο.
export function DeviationsSection({ draft, canDeviate }: DeviationsProps) {
  const items = deviationItemsOf(draft);
  const uncovered = uncoveredOf(draft);
  const isProposal = draft.state === "πρόταση";
  const mustApprove = needsApproval(draft, canDeviate);
  return (
    <section className="card">
      <h2>Παρεκκλίσεις</h2>
      {items.length === 0 ? (
        <p className="muted">
          {isProposal ? "Καμία Παρέκκλιση: η πρόταση στέλνεται κατευθείαν." : "Καμία Παρέκκλιση."}
        </p>
      ) : (
        <ul className="list">
          {items.map((item) => (
            <li key={item.key}>
              {item.label}{" "}
              <DeviationBadge isUncovered={uncovered.some((u) => u.key === item.key)} draft={draft} canDeviate={canDeviate} />
            </li>
          ))}
        </ul>
      )}
      {isProposal && items.length > 0 && (
        <p className="note">
          {canDeviate
            ? "Έχεις το Δικαίωμα «Παρεκκλίνει από τον Κατάλογο»: στέλνεται χωρίς Έγκριση."
            : mustApprove
              ? "Δεν στέλνεται χωρίς Έγκριση: υπάρχει Παρέκκλιση νέα ή βαθύτερη από όσο εγκρίθηκε."
              : "Η τελευταία Έγκριση καλύπτει όλες τις Παρεκκλίσεις: στέλνεται."}
        </p>
      )}
      {!isProposal && (
        <p className="muted">Σε σχέση με τον Κατάλογο και τις προεπιλογές της στιγμής της πρότασης.</p>
      )}
    </section>
  );
}
