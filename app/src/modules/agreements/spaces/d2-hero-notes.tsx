import { Badge } from "@/spaces/screens/shared";

import { formatDate, formatMoney } from "../helpers";
import type { AgreementCaps, AgreementDetail } from "../types";
import { channelText } from "./d2-history";
import { endText, pathHint, perPeriodSuffix } from "./d2-model";

// Τα μικρά του hero της D2: το ποσό, τα στοιχεία χρόνου και οι προειδοποιήσεις που μένουν πάντα ορατές.

export function HeroAmount({ agreement }: { agreement: AgreementDetail }) {
  const { totals } = agreement;
  if (!agreement.can.seeAmounts || totals === null) return null;
  const suffix = perPeriodSuffix(agreement.kind);
  const isDiscounted = totals.discountedPrice !== totals.price;
  return (
    <p className="ml-hero-amount">
      {formatMoney(totals.price)}
      {suffix}
      <small>
        χωρίς ΦΠΑ · με ΦΠΑ {formatMoney(totals.gross)}
        {isDiscounted &&
          ` · με την έκπτωση ${formatMoney(totals.discountedPrice)}${suffix}`}
      </small>
    </p>
  );
}

const startText = (a: AgreementDetail): string =>
  a.startOn === null ? "έναρξη με την υπογραφή" : formatDate(a.startOn);

export function HeroFacts({ agreement }: { agreement: AgreementDetail }) {
  const isProposal = agreement.state === "proposal";
  return (
    <p className="d2-hero-facts">
      {isProposal && <span>ισχύει ως {formatDate(agreement.validUntil)}</span>}
      <span>
        {startText(agreement)} → {endText(agreement)}
      </span>
      {agreement.signedAt !== null && (
        <span>υπογραφή {formatDate(agreement.signedAt)}</span>
      )}
    </p>
  );
}

const latestRejection = (a: AgreementDetail): string | null => {
  if (a.path !== "draft") return null;
  const approval = [...a.revisions]
    .sort((x, y) => y.number - x.number)
    .find((r) => r.approval !== null)?.approval;
  return approval?.state === "rejected" && approval.comment
    ? approval.comment
    : null;
};

interface WarningsProps {
  agreement: AgreementDetail;
  caps: AgreementCaps;
  expiresInDays: number | null;
}

export function HeroWarnings({
  agreement,
  caps,
  expiresInDays,
}: WarningsProps) {
  const rejection = latestRejection(agreement);
  const hint = pathHint(agreement);
  return (
    <>
      {hint && <p className="muted">{hint}</p>}
      <span className="btn-row">
        {expiresInDays !== null && (
          <Badge tone="attention">
            {expiresInDays === 0
              ? "λήγει σήμερα"
              : `λήγει σε ${expiresInDays} ${expiresInDays === 1 ? "μέρα" : "μέρες"}`}
          </Badge>
        )}
        {agreement.cost?.isLowMargin === true && (
          <Badge tone="attention">χαμηλό περιθώριο</Badge>
        )}
        {!caps.canDraft && <Badge>Μόνο ανάγνωση</Badge>}
      </span>
      {rejection !== null && (
        <p className="note" role="note">
          Η Έγκριση απορρίφθηκε: «{rejection}»
        </p>
      )}
      {agreement.signature !== null && (
        <p>
          Υπέγραψε {agreement.signature.signedName} στις{" "}
          {formatDate(agreement.signature.signedOn)}{" "}
          {channelText(agreement.signature)}
        </p>
      )}
    </>
  );
}
