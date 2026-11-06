import { agreementCaps } from "@/modules/agreements";
import { isOwner, type Viewer } from "@/modules/access";
import type { ClientSendsFilter } from "@/modules/notifications";
import type { Step } from "@/spaces/kit/steps";

import type { ClientDetail, ClientRow, Opportunity, SalesCaps } from "../types";
import {
  ATTENTION_LABEL,
  activeAgreementText,
  clientSummary,
  opportunityRows,
  relationshipSteps,
  type B2OpportunityRow,
  type B2Tab,
  type SummaryLine,
} from "./b2-adapter";
import type { Loaded } from "./b2-load";
import {
  leadSentence,
  moneySentence,
  nextStepOf,
  stageOf,
  threeSteps,
  type ClientTab,
  type NextStep,
} from "./b2-page-model";

// Ό,τι μοιράζονται τα κομμάτια της Σελίδας Πελάτη: τα δεδομένα όπως φόρτωσαν και ό,τι βγαίνει από αυτά μία φορά.

export interface ClientPageInput {
  viewer: Viewer;
  client: ClientDetail;
  card: ClientRow | null;
  caps: SalesCaps;
  canEdit: boolean;
  isReadOnly: boolean;
  data: Loaded;
  allowed: readonly B2Tab[];
  tabs: readonly ClientTab[];
  today: string;
  sendsFilter: ClientSendsFilter;
  // Πρόσβαση μέσω δικής του Ευκαιρίας σε Πελάτη άλλου πωλητή.
  grantedVia: Opportunity | undefined;
}

export interface ClientDerived {
  steps: Step[];
  stage: string;
  lead: string;
  attention: SummaryLine | undefined;
  agreementEnd: SummaryLine | undefined;
  filming: SummaryLine | undefined;
  next: NextStep | null;
  money: string | null;
  activeAgreement: string | null;
  rows: B2OpportunityRow[];
  openRows: B2OpportunityRow[];
  // Οι ανοιχτές Ευκαιρίες στις οποίες γράφει Δραστηριότητα ο Χρήστης.
  logOpportunities: { id: string; title: string }[];
  isOwner: boolean;
}

export type ClientPageCtx = ClientPageInput & { d: ClientDerived };

const labelsOf = (
  items: readonly { id: string; label: string }[],
): Record<string, string> =>
  Object.fromEntries(items.map((item) => [item.id, item.label]));

const findLine = (lines: readonly SummaryLine[], label: string) =>
  lines.find((line) => line.label === label);

function summaryLines(p: ClientPageInput): SummaryLine[] {
  const { data, caps } = p;
  return clientSummary({
    agreements: data.agreements,
    ledger: data.ledger,
    opportunities: data.opportunities.filter(
      (o) => caps.manageScope !== "mine" || o.managerId === caps.userId,
    ),
    nextFilming: data.nextFilming,
    today: p.today,
  }).filter((line) => p.allowed.includes(line.tab));
}

const rowsOf = (p: ClientPageInput): B2OpportunityRow[] =>
  opportunityRows({
    opportunities: p.data.opportunities,
    stageLabels: labelsOf(p.data.lists?.stages ?? []),
    agreements: p.data.agreements ?? [],
    clientManagerId: p.client.managerId,
    canPropose: p.canEdit && agreementCaps(p.viewer).canDraft,
    today: p.today,
  });

export function deriveClientPage(p: ClientPageInput): ClientDerived {
  const { data, caps } = p;
  const steps = threeSteps(
    relationshipSteps(data.opportunities, data.agreements ?? []),
  );
  const stage = stageOf(steps);
  const lines = summaryLines(p);
  const open = data.opportunities.filter((o) => o.outcome === "open");
  const rows = rowsOf(p);
  return {
    steps,
    stage,
    lead: leadSentence({
      stage,
      openCount: open.length,
      activeAgreement:
        data.agreements === null
          ? undefined
          : (data.agreements.find((a) => a.state === "active")?.title ?? null),
      ledger: data.ledger,
    }),
    attention: findLine(lines, ATTENTION_LABEL),
    agreementEnd: findLine(lines, "Συμφωνία"),
    filming: findLine(lines, "Επόμενο γύρισμα"),
    next: nextStepOf(data.opportunities, p.today),
    money: p.allowed.includes("ledger") ? moneySentence(data.ledger) : null,
    activeAgreement: data.agreements
      ? activeAgreementText(data.agreements)
      : null,
    rows,
    openRows: rows.filter((row) => open.some((o) => o.id === row.id)),
    logOpportunities: open
      .filter((o) => caps.manageScope === "all" || o.managerId === caps.userId)
      .map((o) => ({ id: o.id, title: o.title })),
    isOwner: isOwner(p.viewer),
  };
}
