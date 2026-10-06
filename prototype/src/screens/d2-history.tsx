"use client";

import {
  isPartialPeriod,
  periodAmount,
  type AgreementPeriod,
  type AgreementRecord,
  type PeriodProvision,
} from "@/data/agreements";
import { provisionKind } from "@/data/catalogue";
import { TODAY } from "@/data/sales";
import { Badge, fmtDate, fmtMoney } from "@/screens/shared";

const remainingOf = (p: PeriodProvision): number =>
  p.given + p.carried - p.used;

function PeriodBalance({ provision }: { provision: PeriodProvision }) {
  const unit = provisionKind(provision.kindId).unit;
  return (
    <div>
      {unit}: {provision.given} + {provision.carried} − {provision.used} ={" "}
      <strong>{remainingOf(provision)} απομένουν</strong>
    </div>
  );
}

function PeriodRow({ draft, period }: { draft: AgreementRecord; period: AgreementPeriod }) {
  const isCurrent = period.state === "τρέχουσα";
  return (
    <tr data-current={isCurrent}>
      <td data-label="Περίοδος">
        {isCurrent ? <strong>{period.label}</strong> : period.label}
      </td>
      <td data-label="Ημερομηνίες">
        {fmtDate(period.starts)} – {fmtDate(period.ends)}
        {isPartialPeriod(period) && (
          <>
            {" "}
            <Badge tone="attention">σπασμένη</Badge>
          </>
        )}
      </td>
      <td className="num" data-label="Ποσό">
        {fmtMoney(periodAmount(draft, period))}
      </td>
      <td data-label="Κατάσταση">
        <Badge tone={isCurrent ? "strong" : undefined}>{period.state}</Badge>
      </td>
      <td data-label="Παροχές">
        <div>
          {period.provisions.map((provision) => (
            <PeriodBalance key={provision.kindId} provision={provision} />
          ))}
        </div>
      </td>
    </tr>
  );
}

export function PeriodsSection({ draft }: { draft: AgreementRecord }) {
  return (
    <section className="card">
      <h2>Περίοδοι</h2>
      <p className="muted">
        Ημερολογιακοί μήνες. Ανά είδος Παροχής: δόθηκαν + μεταφέρθηκαν −
        χρησιμοποιήθηκαν = απομένουν. Η σπασμένη Περίοδος χρεώνεται αναλογικά
        με τις μέρες.
      </p>
      <div className="scroll">
        <table className="rtable d2-periods">
          <thead>
            <tr>
              <th>Περίοδος</th>
              <th>Ημερομηνίες</th>
              <th className="num">Ποσό</th>
              <th>Κατάσταση</th>
              <th>Παροχές</th>
            </tr>
          </thead>
          <tbody>
            {draft.periods.map((period) => (
              <PeriodRow key={period.label} draft={draft} period={period} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface RevisionsProps {
  draft: AgreementRecord;
  showApprovals: boolean;
}

export function RevisionsSection({ draft, showApprovals }: RevisionsProps) {
  return (
    <section className="card">
      <h2>Αναθεωρήσεις</h2>
      <ul className="list">
        {[...draft.revisions].reverse().map((revision) => (
          <li key={revision.number}>
            <span className="muted">
              Αναθεώρηση {revision.number} · {fmtDate(revision.when)} ·{" "}
              {revision.by}
            </span>
            <div>{revision.summary}</div>
            {showApprovals && revision.approval && (
              <div>
                <Badge
                  tone={
                    revision.approval.state === "εγκρίθηκε"
                      ? "strong"
                      : "attention"
                  }
                >
                  Έγκριση: {revision.approval.state}
                </Badge>{" "}
                {revision.approval.by && (
                  <span className="muted">
                    {revision.approval.by}
                    {revision.approval.when &&
                      `, ${fmtDate(revision.approval.when)}`}
                  </span>
                )}
                {revision.approval.comment && (
                  <div className="muted">«{revision.approval.comment}»</div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SignatureSection({ draft }: { draft: AgreementRecord }) {
  const { signature, dissolution } = draft;
  if (!signature && !dissolution) return null;
  return (
    <section className="card">
      <h2>{dissolution ? "Υπογραφή και Λύση" : "Υπογραφή"}</h2>
      <dl className="dl">
        {signature && (
          <>
            <dt>Υπέγραψε</dt>
            <dd>
              {signature.by}, {fmtDate(signature.when)}
            </dd>
            <dt>Τρόπος</dt>
            <dd>
              {signature.method}
              {signature.file && (
                <div className="muted">Αρχείο: {signature.file}</div>
              )}
            </dd>
          </>
        )}
        {dissolution && (
          <>
            <dt>{dissolution.when > TODAY ? "Λύνεται" : "Λύθηκε"}</dt>
            <dd>
              {fmtDate(dissolution.when)}, {dissolution.by}
            </dd>
            <dt>Λόγος</dt>
            <dd>{dissolution.reason}</dd>
            <dt>Ρήτρα</dt>
            <dd>
              {dissolution.fee > 0 ? fmtMoney(dissolution.fee) : "Χωρίς ρήτρα"}
            </dd>
          </>
        )}
      </dl>
    </section>
  );
}
