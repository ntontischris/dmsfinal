import { Badge, fmtDate, fmtMoney } from "@/spaces/screens/shared";

import type { ClientAgreement } from "../client-view-schema";
import { KIND_LABELS, STATE_LABELS } from "../labels";
import type { ProposalDocument } from "../types";
import { balanceWordsOf, clientPeriodRowOf, offerOf } from "./client-adapter";
import { D2Box } from "./d2-box";

// Τα κομμάτια της D2 του πελάτη: κεφαλίδα ml-hero και κλειστά κουτιά (Το πακέτο σου, Ανά μήνα, Υπογραφή).

export function ClientHeader({ agreement }: { agreement: ClientAgreement }) {
  return (
    <header className="ml-hero d2-hero">
      <div>
        <span className="d2-client-tags">
          <Badge tone="strong">{STATE_LABELS[agreement.state]}</Badge>
          <Badge>{KIND_LABELS[agreement.kind]}</Badge>
        </span>
        <h1>{agreement.title || "Χωρίς τίτλο"}</h1>
        {agreement.document && <p>{agreement.document.client.name}</p>}
      </div>
    </header>
  );
}

const priceOf = (agreement: ClientAgreement): string | null =>
  agreement.net === null
    ? null
    : `${fmtMoney(agreement.net)} ${agreement.kind === "monthly" ? "τον μήνα" : "εφάπαξ"} (χωρίς ΦΠΑ)`;

// Μόνο για τον πελάτη, πρώτο: τι αγόρασε, πόσο κοστίζει και τι του μένει αυτόν τον μήνα.
export function ClientSummary({
  agreement,
  document,
}: {
  agreement: ClientAgreement;
  document: ProposalDocument;
}) {
  const isMonthly = agreement.kind === "monthly";
  const current = agreement.periods.find((p) => p.state === "current");
  const offer = offerOf(document) || "—";
  const price = priceOf(agreement);
  return (
    <D2Box
      title="Το πακέτο σου με μια ματιά"
      hint={price ? `${offer} · ${price}` : offer}
    >
      <p className="d2-offer">
        <strong>
          {isMonthly ? "Κάθε μήνα" : "Περιλαμβάνει"}: {offer}
        </strong>
        {price && <span>{price}</span>}
      </p>
      {current && (
        <div>
          <p className="muted">
            {clientPeriodRowOf(current).label}, ως {fmtDate(current.ends)}:
          </p>
          <ul>
            {current.provisions.map((p) => (
              <li key={p.kindId}>{balanceWordsOf(p)}</li>
            ))}
          </ul>
        </div>
      )}
    </D2Box>
  );
}

// «Ανά μήνα»: για κάθε μήνα πόσα σου αναλογούν, πόσα έγιναν και πόσα μένουν, ως γραμμές.
export function ClientPeriods({ agreement }: { agreement: ClientAgreement }) {
  if (agreement.kind !== "monthly" || agreement.periods.length === 0)
    return null;
  const rows = agreement.periods.map(clientPeriodRowOf);
  const current = rows.find((row) => row.isCurrent);
  return (
    <D2Box
      title="Ανά μήνα"
      hint={
        current
          ? `τώρα: ${current.label} · ${rows.length} μήνες`
          : `${rows.length} μήνες`
      }
    >
      <p className="muted">
        Για κάθε μήνα: πόσα σου αναλογούν, πόσα έγιναν και πόσα μένουν. Ο μήνας
        που δεν είναι ολόκληρος χρεώνεται αναλογικά με τις μέρες.
      </p>
      <ul className="ml-list d2-periods">
        {rows.map((row) => (
          <li key={row.n} className="ml-line" data-current={row.isCurrent}>
            <span className="ml-main">
              <span className="ml-tag">{row.state}</span>
              <strong>{row.label}</strong>
              <small>
                {row.dates}
                {row.isPartial && (
                  <>
                    {" "}
                    <Badge tone="attention">όχι ολόκληρος</Badge>
                  </>
                )}
              </small>
              {row.balances.map((text) => (
                <small key={text}>{text}</small>
              ))}
            </span>
            <span className="ml-amount">{row.amount ?? "—"}</span>
          </li>
        ))}
      </ul>
    </D2Box>
  );
}

export function ClientSignature({ agreement }: { agreement: ClientAgreement }) {
  const signature = agreement.signature;
  if (!signature) return null;
  return (
    <D2Box
      title="Υπογραφή"
      hint={`${signature.signedName}, ${fmtDate(signature.signedOn)}`}
    >
      <dl className="ml-kv">
        <dt>Υπέγραψε</dt>
        <dd>
          {signature.signedName}, {fmtDate(signature.signedOn)}
        </dd>
      </dl>
      {agreement.document && (
        <p className="ml-quick">
          <a href={`/app/agreements/${agreement.id}/pdf`}>Λήψη PDF</a>
        </p>
      )}
    </D2Box>
  );
}
