import { Panel } from "@/spaces/kit/panel";
import { Badge, fmtDate, fmtMoney } from "@/spaces/screens/shared";

import type { ClientAgreement } from "../client-view-schema";
import { KIND_LABELS, STATE_LABELS } from "../labels";
import type { ProposalDocument } from "../types";
import { balanceWordsOf, clientPeriodRowOf, offerOf } from "./client-adapter";

// Τα κομμάτια της D2 του πελάτη (prototype `screens/d2-header.tsx`, `d2-client-summary.tsx`, `d2-history.tsx` με isClient).

export function ClientHeader({ agreement }: { agreement: ClientAgreement }) {
  return (
    <header className="d2-header">
      <h1>{agreement.title || "Χωρίς τίτλο"}</h1>
      {agreement.document && (
        <p className="muted">{agreement.document.client.name}</p>
      )}
      <span className="btn-row">
        <Badge tone="strong">{STATE_LABELS[agreement.state]}</Badge>
        <Badge>{KIND_LABELS[agreement.kind]}</Badge>
      </span>
    </header>
  );
}

// Μόνο για τον πελάτη, πάνω από όλα: τι αγόρασε, πόσο κοστίζει και τι του μένει αυτόν τον μήνα.
export function ClientSummary({
  agreement,
  document,
}: {
  agreement: ClientAgreement;
  document: ProposalDocument;
}) {
  const isMonthly = agreement.kind === "monthly";
  const current = agreement.periods.find((p) => p.state === "current");
  return (
    <Panel label="Το πακέτο σου με μια ματιά">
      <p className="d2-offer">
        <strong>
          {isMonthly ? "Κάθε μήνα" : "Περιλαμβάνει"}: {offerOf(document) || "—"}
        </strong>
        {agreement.net !== null && (
          <span>
            {fmtMoney(agreement.net)} {isMonthly ? "τον μήνα" : "εφάπαξ"} (χωρίς
            ΦΠΑ)
          </span>
        )}
      </p>
      {current && (
        <div>
          <p className="muted">
            {clientPeriodRowOf(current).label}, ως {fmtDate(current.ends)}:
          </p>
          <ul className="list">
            {current.provisions.map((p) => (
              <li key={p.kindId}>{balanceWordsOf(p)}</li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

// «Ανά μήνα»: για κάθε μήνα πόσα σου αναλογούν, πόσα έγιναν και πόσα μένουν.
export function ClientPeriods({ agreement }: { agreement: ClientAgreement }) {
  if (agreement.kind !== "monthly" || agreement.periods.length === 0)
    return null;
  const rows = agreement.periods.map(clientPeriodRowOf);
  return (
    <Panel label="Ανά μήνα">
      <p className="muted">
        Για κάθε μήνα: πόσα σου αναλογούν, πόσα έγιναν και πόσα μένουν. Ο μήνας
        που δεν είναι ολόκληρος χρεώνεται αναλογικά με τις μέρες.
      </p>
      <div className="scroll">
        <table className="rtable d2-periods">
          <thead>
            <tr>
              <th>Μήνας</th>
              <th>Ημερομηνίες</th>
              <th className="num">Ποσό</th>
              <th>Κατάσταση</th>
              <th>Σου αναλογούν</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.n} data-current={row.isCurrent}>
                <td data-label="Μήνας">
                  {row.isCurrent ? <strong>{row.label}</strong> : row.label}
                </td>
                <td data-label="Ημερομηνίες">
                  {row.dates}
                  {row.isPartial && (
                    <>
                      {" "}
                      <Badge tone="attention">όχι ολόκληρος</Badge>
                    </>
                  )}
                </td>
                <td className="num" data-label="Ποσό">
                  {row.amount ?? "—"}
                </td>
                <td data-label="Κατάσταση">
                  <Badge tone={row.isCurrent ? "strong" : undefined}>
                    {row.state}
                  </Badge>
                </td>
                <td data-label="Σου αναλογούν">
                  <div>
                    {row.balances.map((text) => (
                      <div key={text}>{text}</div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function ClientSignature({ agreement }: { agreement: ClientAgreement }) {
  if (!agreement.signature) return null;
  return (
    <Panel label="Υπογραφή">
      <dl className="dl">
        <dt>Υπέγραψε</dt>
        <dd>
          {agreement.signature.signedName},{" "}
          {fmtDate(agreement.signature.signedOn)}
        </dd>
      </dl>
      {agreement.document && (
        <p>
          <a href={`/app/agreements/${agreement.id}/pdf`}>Λήψη PDF</a>
        </p>
      )}
    </Panel>
  );
}
