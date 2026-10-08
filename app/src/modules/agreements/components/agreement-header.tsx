import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Steps, type Step } from "@/components/ui/steps";

import { statusLabel } from "../helpers";
import { KIND_LABELS, PATH_LABELS } from "../labels";
import type { AgreementCaps, AgreementDetail, ProposalPath } from "../types";

import { MutedNote } from "./terms-section-parts";

const EYEBROW = "D2 · Συμφωνίες";

interface AgreementHeaderProps {
  agreement: AgreementDetail;
  caps: AgreementCaps;
  expiresInDays: number | null; // μόνο για υπογεγραμμένη/ενεργή με Λήξη· υπολογίζεται στη σελίδα
}

const FLOW: readonly ProposalPath[] = [
  "draft",
  "awaiting_approval",
  "sent",
  "signed",
];

const stepState = (
  step: ProposalPath,
  current: ProposalPath,
): Step["state"] => {
  const at = FLOW.indexOf(step);
  const now = FLOW.indexOf(current);
  if (at < now) return "done";
  return at === now ? "current" : "todo";
};

// Σύνταξη → Αναμένει Έγκριση → Εστάλη → Υπογράφηκε. Η έληξε σημαδεύει το «Εστάλη»· η χαμένη κλείνει τη γραμμή με «Χάθηκε».
export function proposalSteps(path: ProposalPath): Step[] {
  if (path === "lost")
    return [
      { label: PATH_LABELS.draft, state: "done" },
      { label: PATH_LABELS.awaiting_approval, state: "todo" },
      { label: PATH_LABELS.sent, state: "todo" },
      { label: PATH_LABELS.lost, state: "current" },
    ];
  if (path === "expired")
    return FLOW.map((step) => ({
      label: PATH_LABELS[step],
      state: step === "sent" || step === "signed" ? "todo" : "done",
      hint: step === "sent" ? PATH_LABELS.expired : undefined,
    }));
  return FLOW.map((step) => ({
    label: PATH_LABELS[step],
    state: path === "signed" ? "done" : stepState(step, path),
  }));
}

function Badges({ agreement, caps, expiresInDays }: AgreementHeaderProps) {
  const isInternal = caps.canDraft || caps.canDeviate;
  return (
    <>
      <Badge>{KIND_LABELS[agreement.kind]}</Badge>
      <Badge>{statusLabel(agreement)}</Badge>
      {isInternal && <Badge>αναθεώρηση {agreement.revision}</Badge>}
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
    </>
  );
}

// Κεφαλίδα της D2: τίτλος, σήματα, η πορεία της πρότασης και οι σύνδεσμοι προς τον Πελάτη και την Ευκαιρία.
export function AgreementHeader(props: AgreementHeaderProps) {
  const { agreement } = props;
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title={agreement.title}>
        <Badges {...props} />
        <Link
          href="/app/agreements"
          className={buttonVariants({ variant: "ghost" })}
        >
          ← Συμφωνίες
        </Link>
      </ScreenHeader>
      <div className="mb-6 grid gap-3">
        <Steps
          steps={proposalSteps(agreement.path)}
          label="Πορεία της πρότασης"
        />
        <MutedNote>
          Πελάτης:{" "}
          <Link href={`/app/clients/${agreement.client.id}`}>
            {agreement.client.name}
          </Link>
          {" · "}Ευκαιρία:{" "}
          <Link href={`/app/pipeline/${agreement.opportunity.id}`}>
            {agreement.opportunity.title}
          </Link>
          {" · "}Υπεύθυνος: {agreement.opportunity.managerName ?? "—"}
        </MutedNote>
      </div>
    </>
  );
}
