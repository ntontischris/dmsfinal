import Link from "next/link";
import type { ReactNode } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { Badge, fmtDate } from "@/spaces/screens/shared";

import { isForgotten } from "../helpers";
import { OUTCOME_LABELS } from "../labels";
import type {
  ForecastRow,
  ListItem,
  Opportunity,
  SalesCaps,
  SalesLists,
} from "../types";
import { initialsOf } from "./b3-line-text";
import { NextStepEditor, SaidYes, StageSelect } from "./b4-controls";
import { ManagerField } from "./b4-forecast-panel";
import { noteKindId } from "./b4-said-yes";
import {
  closeText,
  probabilityText,
  valueText,
  weightedText,
} from "./forecast-adapter";

export const labelOf = (
  items: readonly ListItem[],
  id: string | null,
): string => items.find((item) => item.id === id)?.label ?? "—";

export interface HeroProps {
  opportunity: Opportunity;
  lists: SalesLists;
  caps: SalesCaps;
  canWork: boolean;
  today: string;
  // Η γραμμή πρόβλεψης (μόνο ανοιχτή Ευκαιρία) και αν ο θεατής «Βλέπει ποσά».
  forecast: { row: ForecastRow | null; hasAmounts: boolean } | null;
  proposal: { hasProposal: boolean; href: string };
  children?: ReactNode;
}

// Το μεγάλο νούμερο: η Αξία για όποιον βλέπει ποσά, αλλιώς η Πιθανότητα· τα υπόλοιπα της πρόβλεψης σε μικρά.
function HeroAmount({
  row,
  hasAmounts,
}: {
  row: ForecastRow | null;
  hasAmounts: boolean;
}) {
  const showValue = hasAmounts && row?.value != null;
  const small = [
    showValue ? `Πιθανότητα ${probabilityText(row)}` : "Πιθανότητα",
    hasAmounts ? `σταθμ. ${weightedText(row)}` : null,
    `κλείσιμο ${closeText(row)}`,
  ].filter((part) => part !== null);
  return (
    <p className="ml-hero-amount" data-open="true">
      {showValue ? valueText(row) : probabilityText(row)}
      <small>{small.join(" · ")}</small>
    </p>
  );
}

function NextStep({
  opportunity,
  canWork,
  today,
}: Pick<HeroProps, "opportunity" | "canWork" | "today">) {
  if (canWork)
    return (
      <NextStepEditor
        opportunityId={opportunity.id}
        title={opportunity.title}
        stageId={opportunity.stageId}
        nextStep={opportunity.nextStep}
        nextStepDue={opportunity.nextStepDue}
        isOverdue={isForgotten(opportunity, today)}
        dueText={
          opportunity.nextStepDue ? fmtDate(opportunity.nextStepDue) : null
        }
      />
    );
  if (opportunity.outcome === "open" && opportunity.nextStepDue)
    return (
      <>{`${opportunity.nextStep}, ${fmtDate(opportunity.nextStepDue)}`}</>
    );
  return <>—</>;
}

function Fact(props: { label: string; isWide?: boolean; children: ReactNode }) {
  return (
    <div className={props.isWide ? "b4-fact-wide" : undefined}>
      <dt>{props.label}</dt>
      <dd>{props.children}</dd>
    </div>
  );
}

// Τα μικρά στοιχεία της κεφαλίδας: Πελάτης, Στάδιο, Υπεύθυνος, Πηγή, Επόμενο βήμα, και ποια Ευκαιρία συνεχίζει.
function HeroFacts({ opportunity, lists, caps, canWork, today }: HeroProps) {
  return (
    <dl className="b4-facts">
      <Fact label="Πελάτης">
        <Link href={hrefOf("B2", { id: opportunity.clientId })}>
          {opportunity.clientName ?? "—"}
        </Link>
      </Fact>
      <Fact label="Στάδιο">
        {canWork ? (
          <StageSelect
            opportunityId={opportunity.id}
            stageId={opportunity.stageId}
            stages={lists.stages}
          />
        ) : (
          labelOf(lists.stages, opportunity.stageId)
        )}
      </Fact>
      <Fact label="Υπεύθυνος">
        <ManagerField opportunity={opportunity} caps={caps} />
      </Fact>
      <Fact label="Πηγή">
        {labelOf(lists.sources, opportunity.sourceId)}
        {opportunity.referredBy && ` — ${opportunity.referredBy}`}
      </Fact>
      <Fact label="Επόμενο βήμα" isWide>
        <NextStep opportunity={opportunity} canWork={canWork} today={today} />
      </Fact>
      {opportunity.followsId && (
        <Fact label="Συνεχίζει">
          <Link href={hrefOf("B4", { id: opportunity.followsId })}>
            {opportunity.followsTitle ?? "—"}
          </Link>
        </Fact>
      )}
    </dl>
  );
}

// Οι κύριες ενέργειες δεξιά: σημείωση, πρόταση και «Είπε ναι». Οι σύνδεσμοι ανοίγουν το αντίστοιχο κλειστό κουτί.
function HeroActions({ opportunity, lists, proposal }: HeroProps) {
  return (
    <nav className="ml-quick" aria-label="Ενέργειες Ευκαιρίας">
      <a href="#b4-activities">Σημείωση ή κλήση</a>
      <a href="#b4-proposal">
        {proposal.hasProposal
          ? "Πρόταση: αποστολή, Παράταση, κλείσιμο"
          : "Νέα πρόταση"}
      </a>
      <SaidYes
        opportunityId={opportunity.id}
        kindId={noteKindId(lists.activityKinds)}
        hasProposal={proposal.hasProposal}
        proposalHref={proposal.href}
      />
    </nav>
  );
}

// B4 κεφαλίδα: Έκβαση, τίτλος, τι κάνω εδώ, η Αξία μεγάλη και τα στοιχεία μικρά· οι ενέργειες δεξιά.
// Το `children` είναι οι σημειώσεις της κλεισμένης Ευκαιρίας (κερδισμένη / χαμένη και «Νέα Ευκαιρία από αυτήν»).
export function OpportunityHero(props: HeroProps) {
  const { opportunity, lists, canWork, forecast, children } = props;
  const lossReason =
    opportunity.outcome === "lost"
      ? labelOf(lists.lossReasons, opportunity.lossReasonId)
      : null;
  return (
    <header className="ml-hero b4-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        {initialsOf(opportunity.clientName ?? "")}
      </span>
      <div>
        <p className="b4-tags">
          <Badge tone="strong">{OUTCOME_LABELS[opportunity.outcome]}</Badge>
          {lossReason && opportunity.lossReasonId && (
            <Badge>Λόγος απώλειας: {lossReason}</Badge>
          )}
        </p>
        <h1>{opportunity.title}</h1>
        {canWork && (
          <p>
            Κάνε το Επόμενο βήμα, γράψε τι ειπώθηκε και πήγαινε την Ευκαιρία ένα
            Στάδιο μπροστά.
          </p>
        )}
        {forecast && (
          <HeroAmount row={forecast.row} hasAmounts={forecast.hasAmounts} />
        )}
        <HeroFacts {...props} />
        {children}
      </div>
      {canWork && <HeroActions {...props} />}
    </header>
  );
}
