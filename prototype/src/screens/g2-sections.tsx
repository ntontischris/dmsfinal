import Link from "next/link";

import { provisionsOf } from "@/data/agreements";
import { provisionKind } from "@/data/catalogue";
import {
  NOW,
  personName,
  type Filming,
  type ProductionStub,
} from "@/data/filming";
import { endTime } from "@/data/filming-access";
import type { DeliverableSummary } from "@/data/productions";
import {
  agreementOf,
  daysWaiting,
  isInternal,
  isLate,
  periodOfProduction,
  type ProductionCaps,
} from "@/data/productions-access";
import type { RoleId } from "@/data/roles";
import { ClientStatusBadge } from "@/screens/h3-group";
import { clientStatusOf } from "@/screens/h3-model";
import { Badge, fmtDate, screenHref } from "@/screens/shared";

interface Row {
  kindId: DeliverableSummary["kindId"];
  total: number;
  used: number;
}

const provisionRows = (
  production: ProductionStub,
  deliverables: readonly DeliverableSummary[],
): readonly Row[] => {
  const period = periodOfProduction(production);
  if (period)
    return period.provisions.map((p) => ({
      kindId: p.kindId,
      total: p.given + p.carried,
      used: p.used,
    }));
  const agreement = agreementOf(production);
  if (!agreement) return [];
  return provisionsOf(agreement).map((p) => ({
    kindId: p.kindId,
    total: p.quantity,
    used: deliverables.filter(
      (d) =>
        d.kindId === p.kindId &&
        !(
          d.state === "ακυρώθηκε" && d.cancellation?.provision === "επιστρέφει"
        ),
    ).length,
  }));
};

export function G2Provisions({
  production,
  deliverables,
}: {
  production: ProductionStub;
  deliverables: readonly DeliverableSummary[];
}) {
  if (isInternal(production)) return null;
  const rows = provisionRows(production, deliverables);
  const period = production.periodLabel;
  return (
    <section className="card">
      <div className="card-title">
        <h2>Παροχές της Περιόδου</h2>
        <span className="muted">{period ?? "εφάπαξ"}</span>
      </div>
      {rows.length === 0 && <p className="muted">Δεν υπάρχουν Παροχές.</p>}
      <ul className="list">
        {rows.map((r) => (
          <li key={r.kindId}>
            <strong>{provisionKind(r.kindId).name}</strong>
            <div className="g2-total">
              <span>
                <strong>{r.total}</strong>
                <span className="muted">σύνολο</span>
              </span>
              <span>
                <strong>{r.used}</strong>
                <span className="muted">χρησιμοποιήθηκαν</span>
              </span>
              <span>
                <strong>{Math.max(0, r.total - r.used)}</strong>
                <span className="muted">απομένουν</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function G2Filmings({
  role,
  caps,
  filmings,
}: {
  role: RoleId;
  caps: ProductionCaps;
  filmings: readonly Filming[];
}) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>Γυρίσματα</h2>
        <span className="muted">{filmings.length}</span>
      </div>
      {filmings.length === 0 && (
        <p className="muted">Η Παραγωγή δεν έχει ακόμα Γυρίσματα.</p>
      )}
      <ul className="list">
        {filmings.map((f) => (
          <li key={f.id} className="row">
            <Link href={screenHref(role, "E3", { id: f.id })}>
              {fmtDate(f.date)} · {f.start}–{endTime(f)}
            </Link>
            <span className="g2-signals">
              <Badge>{f.state}</Badge>
              {!caps.isClient && (
                <span className="muted">{f.crew.length} άτομα Συνεργείο</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TeamRow({
  role,
  d,
  isInternalProduction,
}: {
  role: RoleId;
  d: DeliverableSummary;
  isInternalProduction: boolean;
}) {
  const waiting = daysWaiting(d);
  const isCancelled = d.state === "ακυρώθηκε";
  return (
    <li className="g2-row" data-muted={isCancelled}>
      <Link className="g2-title" href={screenHref(role, "H2", { id: d.id })}>
        {d.title}
      </Link>
      <div className="g2-signals">
        <span className="muted">{provisionKind(d.kindId).name}</span>
        <span className="muted">{personName(d.assigneeId)}</span>
        <Badge>{d.state}</Badge>
        <span className="muted">προθεσμία {fmtDate(d.deadline)}</span>
        {isLate(d) && <Badge tone="attention">καθυστερεί</Badge>}
        {d.latest?.inReview && <Badge>αναμένει εσωτερικό έλεγχο</Badge>}
        {waiting > 0 && (
          <span className="muted">{waiting} μέρες στον πελάτη</span>
        )}
        {!isInternalProduction && (
          <span className="muted">
            γύροι {d.rounds.used}/{d.rounds.limit}
          </span>
        )}
        {d.extra && <Badge>έξτρα · {d.extra}</Badge>}
      </div>
      {d.cancellation && (
        <span className="muted">
          Ακυρώθηκε: {d.cancellation.reason} Παροχή: {d.cancellation.provision}.
        </span>
      )}
    </li>
  );
}

export function G2Deliverables({
  role,
  caps,
  production,
  deliverables,
}: {
  role: RoleId;
  caps: ProductionCaps;
  production: ProductionStub;
  deliverables: readonly DeliverableSummary[];
}) {
  const internal = isInternal(production);
  return (
    <section className="card">
      <div className="card-title">
        <h2>Παραδοτέα</h2>
        {caps.canManage && (
          <Link
            className="button"
            href={screenHref(role, "H2", { production: production.id })}
          >
            Νέο Παραδοτέο
          </Link>
        )}
      </div>
      {caps.canManage && (
        <p className="muted">
          Η δημιουργία δεσμεύει Παροχή· στήνεται στο module Παραδοτέα.
        </p>
      )}
      {internal && (
        <p className="note">
          Εσωτερική: χωρίς Παροχή και χωρίς πελάτη· την έγκριση τη δίνει όποιος
          «Ελέγχει Παραδοτέα» (στον έναν άνθρωπο, ο Ιδιοκτήτης). Χωρίς όριο
          αλλαγών.
        </p>
      )}
      {deliverables.length === 0 && (
        <p className="muted">Η Παραγωγή δεν έχει ακόμα Παραδοτέα.</p>
      )}
      <ul className="list">
        {deliverables.map((d) => (
          <TeamRow
            key={d.id}
            role={role}
            d={d}
            isInternalProduction={internal}
          />
        ))}
      </ul>
    </section>
  );
}

// Η οπτική του πελάτη: έκδοση σε εσωτερικό έλεγχο είναι αόρατη, άρα «σε εργασία».
export function G2ClientDeliverables({
  role,
  deliverables,
}: {
  role: RoleId;
  deliverables: readonly DeliverableSummary[];
}) {
  const visible = deliverables.filter((d) => d.state !== "ακυρώθηκε");
  const waiting = visible.filter((d) => d.state === "αναμένει πελάτη");
  return (
    <>
      {waiting.length > 0 && (
        <section className="card">
          <h2>Περιμένουν εσένα</h2>
          <ul className="list">
            {waiting.map((d) => (
              <li key={d.id}>
                <Link href={screenHref(role, "H4", { id: d.id })}>
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="card">
        <div className="card-title">
          <h2>Παραδοτέα</h2>
          <span className="muted">{visible.length}</span>
        </div>
        {visible.length === 0 && (
          <p className="muted">Δεν υπάρχουν ακόμα Παραδοτέα.</p>
        )}
        <ul className="list">
          {visible.map((d) => (
            <li key={d.id} className="g2-row">
              <Link
                className="g2-title"
                href={screenHref(role, "H4", { id: d.id })}
              >
                {d.title}
              </Link>
              <div className="g2-signals">
                <span className="muted">{provisionKind(d.kindId).name}</span>
                <ClientStatusBadge state={clientStatusOf(d.state)} />
                <span className="muted">
                  γύροι {d.rounds.used}/{d.rounds.limit}
                </span>
                {d.approvedAt && (
                  <span className="muted">
                    εγκρίθηκε {fmtDate(d.approvedAt)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
