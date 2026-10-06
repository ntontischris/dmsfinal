import Link from "next/link";

import {
  agreementTotal,
  provisionLabel,
  type AgreementRecord,
} from "@/data/agreements";
import type { RoleId } from "@/data/roles";
import { Badge, fmtDate, fmtMoney, screenHref } from "@/screens/shared";

import "./d1.css";

// Η κατάσταση με λόγια πελάτη: χωρίς εσωτερικά βήματα όπως «Αναμένει Έγκριση».
const clientStatus = (agreement: AgreementRecord): string => {
  if (agreement.state === "πρόταση")
    return "Πρόταση: περιμένει την υπογραφή σας";
  if (agreement.state === "υπογεγραμμένη")
    return agreement.start
      ? `Υπογεγραμμένη, ξεκινά ${fmtDate(agreement.start)}`
      : "Υπογεγραμμένη";
  if (agreement.state === "ενεργή") return "Ενεργή";
  if (agreement.state === "έληξε") return "Έληξε";
  return "Λύθηκε";
};

const clientAmount = (agreement: AgreementRecord): string =>
  `${fmtMoney(agreementTotal(agreement))} ${agreement.kind === "μηνιαία" ? "/ μήνα" : "εφάπαξ"}`;

// Τρέχουσα Περίοδος και ό,τι απομένει: δόθηκαν + μεταφέρθηκαν − χρησιμοποιήθηκαν.
function RemainingProvisions({ agreement }: { agreement: AgreementRecord }) {
  const current = agreement.periods.find((item) => item.state === "τρέχουσα");
  if (agreement.state !== "ενεργή" || !current) return null;
  const remaining = current.provisions.map((item) =>
    provisionLabel(
      item.kindId,
      Math.max(0, item.given + item.carried - item.used),
    ),
  );
  return (
    <>
      <dt>Περίοδος</dt>
      <dd>{current.label}</dd>
      <dt>Απομένουν</dt>
      <dd>{remaining.join(" · ")}</dd>
    </>
  );
}

function ClientAgreementCard({
  role,
  agreement,
}: {
  role: RoleId;
  agreement: AgreementRecord;
}) {
  const isProposal = agreement.state === "πρόταση";
  return (
    <article className="card">
      <div className="card-title">
        <h2>{agreement.title}</h2>
        <Badge tone={isProposal ? "strong" : undefined}>
          {clientStatus(agreement)}
        </Badge>
      </div>
      <dl className="dl">
        <dt>Είδος</dt>
        <dd>{agreement.kind}</dd>
        <dt>Ποσό</dt>
        <dd>{clientAmount(agreement)} (χωρίς ΦΠΑ)</dd>
        {isProposal && agreement.validUntil && (
          <>
            <dt>Ισχύει ως</dt>
            <dd>{fmtDate(agreement.validUntil)}</dd>
          </>
        )}
        <RemainingProvisions agreement={agreement} />
      </dl>
      <Link
        className="button"
        data-primary={isProposal ? "true" : undefined}
        href={screenHref(role, "D2", { id: agreement.id })}
      >
        Άνοιγμα
      </Link>
    </article>
  );
}

interface ClientAgreementCardsProps {
  role: RoleId;
  agreements: readonly AgreementRecord[];
}

export function ClientAgreementCards({
  role,
  agreements,
}: ClientAgreementCardsProps) {
  return (
    <div className="d1-cards">
      {agreements.map((agreement) => (
        <ClientAgreementCard
          key={agreement.id}
          role={role}
          agreement={agreement}
        />
      ))}
    </div>
  );
}
