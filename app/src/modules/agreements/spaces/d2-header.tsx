import Link from "next/link";
import type { ReactNode } from "react";

import { Steps } from "@/spaces/kit/steps";
import { hrefOf } from "@/spaces/data/screens";
import { initialsOf } from "@/spaces/shell/avatar";
import { Badge } from "@/spaces/screens/shared";

import { proposalSteps } from "../components/agreement-header";
import { statusLabel } from "../helpers";
import { KIND_LABELS } from "../labels";
import type { AgreementCaps, AgreementDetail } from "../types";
import { HeroAmount, HeroFacts, HeroWarnings } from "./d2-hero-notes";
import { isInternal } from "./d2-load";

interface HeaderProps {
  agreement: AgreementDetail;
  caps: AgreementCaps;
  expiresInDays: number | null;
  // «Ιστορικό αλλαγών» (Ίχνος): σύνδεσμος του module Ίχνος στη νέα εμφάνιση.
  historyLink: ReactNode;
  // Οι ενέργειες (πρόταση, λήξη/συνέχεια, PDF): στο `.ml-quick` του hero.
  actions: ReactNode;
}

function Subtitle({
  agreement,
  caps,
}: Omit<HeaderProps, "expiresInDays" | "historyLink" | "actions">) {
  return (
    <p>
      <Link href={hrefOf("B2", { id: agreement.client.id })}>
        {agreement.client.name}
      </Link>
      {" · Ευκαιρία "}
      <Link href={hrefOf("B4", { id: agreement.opportunity.id })}>
        {agreement.opportunity.title}
      </Link>
      {` · Υπεύθυνος: ${agreement.opportunity.managerName ?? "—"} · ${KIND_LABELS[agreement.kind]}`}
      {isInternal(caps) && ` · αναθεώρηση ${agreement.revision}`}
    </p>
  );
}

// Το hero της D2 (μορφή I8): κατάσταση, τίτλος, Πελάτης, η τιμή μεγάλη, χρόνος σε μικρά στοιχεία, οι προειδοποιήσεις,
// η πορεία της πρότασης και δεξιά/κάτω οι ενέργειες.
export function D2Header(props: HeaderProps) {
  const { agreement, caps, historyLink, actions } = props;
  return (
    <header className="ml-hero d2-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        {initialsOf(agreement.client.name)}
      </span>
      <div>
        <Badge tone="strong">{statusLabel(agreement)}</Badge>
        <h1>{agreement.title || "Χωρίς τίτλο"}</h1>
        <Subtitle agreement={agreement} caps={caps} />
        <HeroAmount agreement={agreement} />
        <HeroFacts agreement={agreement} />
        <HeroWarnings
          agreement={agreement}
          caps={caps}
          expiresInDays={props.expiresInDays}
        />
        <span className="btn-row">{historyLink}</span>
        <Steps
          steps={proposalSteps(agreement.path)}
          label="Πορεία της πρότασης"
        />
      </div>
      <div className="ml-quick d2-quick">{actions}</div>
    </header>
  );
}
