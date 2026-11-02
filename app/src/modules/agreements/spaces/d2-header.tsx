import Link from "next/link";
import type { ReactNode } from "react";

import { Steps } from "@/spaces/kit/steps";
import { hrefOf } from "@/spaces/data/screens";
import { Badge } from "@/spaces/screens/shared";

import { proposalSteps } from "../components/agreement-header";
import { statusLabel } from "../helpers";
import { KIND_LABELS } from "../labels";
import type { AgreementCaps, AgreementDetail } from "../types";
import { isInternal } from "./d2-load";

interface HeaderProps {
  agreement: AgreementDetail;
  caps: AgreementCaps;
  expiresInDays: number | null;
  // «Ιστορικό αλλαγών» (Ίχνος): κοινό component άλλου module, χωρίς αντίστοιχο στο prototype.
  historyLink: ReactNode;
}

// Η κεφαλίδα του prototype (`screens/d2-header.tsx`): τίτλος, Πελάτης · Ευκαιρία · Υπεύθυνος, σήματα και η πορεία.
export function D2Header({
  agreement,
  caps,
  expiresInDays,
  historyLink,
}: HeaderProps) {
  const internal = isInternal(caps);
  return (
    <header className="d2-header">
      <h1>{agreement.title || "Χωρίς τίτλο"}</h1>
      <p className="muted">
        <Link href={hrefOf("B2", { id: agreement.client.id })}>
          {agreement.client.name}
        </Link>
        {" · Ευκαιρία "}
        <Link href={hrefOf("B4", { id: agreement.opportunity.id })}>
          {agreement.opportunity.title}
        </Link>
        {` · Υπεύθυνος: ${agreement.opportunity.managerName ?? "—"}`}
      </p>
      <span className="btn-row">
        <Badge tone="strong">{statusLabel(agreement)}</Badge>
        <Badge>{KIND_LABELS[agreement.kind]}</Badge>
        {internal && <Badge>αναθεώρηση {agreement.revision}</Badge>}
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
        <span data-tw>{historyLink}</span>
      </span>
      <Steps
        steps={proposalSteps(agreement.path)}
        label="Πορεία της πρότασης"
      />
    </header>
  );
}
