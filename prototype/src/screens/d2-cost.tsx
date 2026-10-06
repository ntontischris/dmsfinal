"use client";

import {
  agreementTotal,
  costOfAgreement,
  deviationsOf,
  type AgreementRecord,
} from "@/data/agreements";
import { COST_SETTINGS, hourCost } from "@/data/catalogue";
import { needsApproval } from "@/screens/d2-model";
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
  approved: readonly string[];
  canDeviate: boolean;
}

export function DeviationsSection({
  draft,
  approved,
  canDeviate,
}: DeviationsProps) {
  const deviations = deviationsOf(draft);
  const isProposal = draft.state === "πρόταση";
  const mustApprove = needsApproval(draft, approved, canDeviate);
  return (
    <section className="card">
      <h2>Παρεκκλίσεις</h2>
      {deviations.length === 0 ? (
        <p className="muted">
          {isProposal
            ? "Καμία Παρέκκλιση: η πρόταση στέλνεται κατευθείαν."
            : "Καμία Παρέκκλιση."}
        </p>
      ) : (
        <ul className="list">
          {deviations.map((deviation) => (
            <li key={deviation}>
              {deviation}{" "}
              {approved.includes(deviation) && <Badge>εγκρίθηκε</Badge>}
            </li>
          ))}
        </ul>
      )}
      {isProposal && deviations.length > 0 && (
        <p className="note">
          {canDeviate
            ? "Έχεις το Δικαίωμα «Παρεκκλίνει από τον Κατάλογο»: στέλνεται χωρίς Έγκριση."
            : mustApprove
              ? "Δεν στέλνεται χωρίς Έγκριση πρότασης για αυτή την αναθεώρηση."
              : "Όλες οι Παρεκκλίσεις έχουν εγκριθεί: στέλνεται."}
        </p>
      )}
      {!isProposal && (
        <p className="muted">
          Σε σχέση με τον Κατάλογο και τις προεπιλογές της στιγμής της πρότασης.
        </p>
      )}
    </section>
  );
}
