// PROTOTYPE — throwaway, three variants of the Client page via ?variant=.
// Τα κοινά κομμάτια των τριών παραλλαγών («η κορυφή-ενημέρωση»): τίτλος με ένα στάδιο, πρόταση, βηματόμετρο 3 βημάτων,
// «Χρειάζεται προσοχή», «Επόμενο βήμα», το μενού «⋯» και οι καρτέλες. Κάθε παραλλαγή στήνει τη δική της διάταξη.

import Link from "next/link";
import type { ReactNode } from "react";

import { isOwner, type Viewer } from "@/modules/access";
import { SpacesHistoryLink } from "@/modules/audit";
import { agreementCaps } from "@/modules/agreements";
import { SpacesGdprClientSection } from "@/modules/gdpr";
import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { Steps, type Step } from "@/spaces/kit/steps";
import { Badge, ErrorNotice } from "@/spaces/screens/shared";

import type { ClientDetail, ClientRow, SalesCaps } from "../types";
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
import { ClientDelete } from "./b2-delete";
import { ClientNewOpportunity } from "./b2-new-opportunity";
import { NoteToggle } from "./b2-proto-note";
import type { ProtoData } from "./b2-proto-load";
import {
  leadSentence,
  moneySentence,
  nextStepOf,
  protoTabHref,
  stageOf,
  threeSteps,
  type NextStep,
  type ProtoVariant,
} from "./b2-proto-model";
import type { Loaded } from "./b2-screen";
import { ClientTransfer } from "./b2-transfer";

export interface ProtoProps {
  variant: ProtoVariant;
  viewer: Viewer;
  client: ClientDetail;
  card: ClientRow | null;
  caps: SalesCaps;
  canEdit: boolean;
  isReadOnly: boolean;
  data: Loaded;
  allowed: readonly B2Tab[];
  tab: string | undefined;
  today: string;
  // Το σώμα μιας σημερινής καρτέλας, αυτούσιο.
  renderTab: (tab: B2Tab) => ReactNode;
}

export interface ProtoDerived {
  steps: Step[];
  stage: string;
  lead: string;
  attention: SummaryLine | undefined;
  agreementEnd: SummaryLine | undefined;
  filming: SummaryLine | undefined;
  next: NextStep | null;
  money: string | null;
  activeAgreement: string | null;
  openRows: B2OpportunityRow[];
  logOpportunities: { id: string; title: string }[];
}

export type ProtoCtx = ProtoProps & { proto: ProtoData; d: ProtoDerived };

const labelsOf = (
  items: readonly { id: string; label: string }[],
): Record<string, string> =>
  Object.fromEntries(items.map((item) => [item.id, item.label]));

const findLine = (lines: readonly SummaryLine[], label: string) =>
  lines.find((line) => line.label === label);

export function deriveProto(p: ProtoProps): ProtoDerived {
  const { data, caps, today } = p;
  const steps = threeSteps(
    relationshipSteps(data.opportunities, data.agreements ?? []),
  );
  const stage = stageOf(steps);
  const visible = data.opportunities.filter(
    (o) => caps.manageScope !== "mine" || o.managerId === caps.userId,
  );
  const lines = clientSummary({
    agreements: data.agreements,
    ledger: data.ledger,
    opportunities: visible,
    nextFilming: data.nextFilming,
    today,
  }).filter((line) => p.allowed.includes(line.tab));
  const activeAgreement = data.agreements
    ? activeAgreementText(data.agreements)
    : null;
  const open = data.opportunities.filter((o) => o.outcome === "open");
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
    next: nextStepOf(data.opportunities, today),
    money: p.allowed.includes("ledger") ? moneySentence(data.ledger) : null,
    activeAgreement,
    openRows: opportunityRows({
      opportunities: open,
      stageLabels: labelsOf(data.lists?.stages ?? []),
      agreements: data.agreements ?? [],
      clientManagerId: p.client.managerId,
      canPropose: p.canEdit && agreementCaps(p.viewer).canDraft,
      today,
    }),
    logOpportunities: open
      .filter((o) => caps.manageScope === "all" || o.managerId === caps.userId)
      .map((o) => ({ id: o.id, title: o.title })),
  };
}

// Ένα πάνελ στο ύφος της «Σήμερα»: τίτλος με εικονίδιο σε κύκλο, απαλή απόχρωση ανά κομμάτι.
export function BriefPanel({
  part,
  label,
  aside,
  children,
}: {
  part:
    | "attention"
    | "next"
    | "relation"
    | "money"
    | "contact"
    | "now"
    | "log"
    | "facts";
  label: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="b2p-panel" data-part={part}>
      <Panel label={label} aside={aside}>
        {children}
      </Panel>
    </div>
  );
}

export function ProtoTitle({
  ctx,
  children,
}: {
  ctx: ProtoCtx;
  children?: ReactNode;
}) {
  return (
    <div className="b2p-title">
      <h1>{ctx.client.name}</h1>
      {!ctx.isReadOnly && (
        <span className="b2p-stage">
          <Badge tone="strong">{ctx.d.stage}</Badge>
          <details className="b2p-why">
            <summary aria-label="Τι σημαίνει το στάδιο">?</summary>
            <p>
              Το στάδιο αλλάζει μόνο του, από τις Ευκαιρίες και τις Συμφωνίες
              του Πελάτη.
            </p>
          </details>
        </span>
      )}
      {ctx.isReadOnly && <Badge>Μόνο ανάγνωση</Badge>}
      {children && <span className="b2p-title-actions">{children}</span>}
    </div>
  );
}

export const ProtoLead = ({ ctx }: { ctx: ProtoCtx }) => (
  <p className="b2p-lead">{ctx.d.lead}</p>
);

export function ProtoSteps({ ctx }: { ctx: ProtoCtx }) {
  if (ctx.isReadOnly) return null;
  return (
    <div className="b2p-steps">
      <Steps label="Σχέση με τον Πελάτη" steps={ctx.d.steps} />
    </div>
  );
}

// Σήμα «Πιθανό διπλό» και ό,τι δεν φόρτωσε: όπως στη σημερινή Σύνοψη.
export function ProtoNotices({ ctx }: { ctx: ProtoCtx }) {
  const isDuplicate =
    (ctx.card?.isPossibleDuplicate ?? false) && ctx.caps.canMerge;
  return (
    <>
      {isDuplicate && (
        <p className="note">
          Σήμα «Πιθανό διπλό».{" "}
          <Link href={hrefOf("B6")}>Άνοιγμα στη Συγχώνευση</Link>
        </p>
      )}
      {ctx.data.failed.length > 0 && (
        <ErrorNotice what={ctx.data.failed.join(", ")} />
      )}
    </>
  );
}

export function AttentionPanel({ ctx }: { ctx: ProtoCtx }) {
  const line = ctx.d.attention;
  if (!line) return null;
  return (
    <BriefPanel part="attention" label="Χρειάζεται προσοχή">
      <p className="b2p-line">{line.text}</p>
      <footer className="b2p-foot">
        <Link href={protoTabHref(ctx.client.id, ctx.variant, line.tab)}>
          Λεπτομέρειες →
        </Link>
      </footer>
    </BriefPanel>
  );
}

export function NextStepPanel({ ctx }: { ctx: ProtoCtx }) {
  const next = ctx.d.next;
  return (
    <BriefPanel part="next" label="Επόμενο βήμα">
      {next === null ? (
        <p className="muted b2p-line">
          Κανένα Επόμενο βήμα: δεν υπάρχει ανοιχτή Ευκαιρία.
        </p>
      ) : (
        <>
          <p className="b2p-big">
            {next.step}, <span className="b2p-num">{next.due}</span>
            {next.isLate && <span className="b2p-rec"> πέρασε</span>}
          </p>
          <p className="muted b2p-line">
            Ευκαιρία «{next.title}» · {next.owner}
          </p>
          <footer className="b2p-foot">
            <Link
              className="button"
              data-primary="true"
              href={hrefOf("B4", { id: next.opportunityId })}
            >
              Άνοιγμα Ευκαιρίας
            </Link>
          </footer>
        </>
      )}
    </BriefPanel>
  );
}

// «Μεταβίβαση Πελάτη», «Ιστορικό», «Διαγραφή Πελάτη» (τελευταία, ως κείμενο). Οι ροές τους μένουν ίδιες.
export function MoreMenu({ ctx }: { ctx: ProtoCtx }) {
  const assignable =
    ctx.caps.canTransfer && ctx.data.assignable?.ok
      ? ctx.data.assignable.data
      : null;
  return (
    <details className="b2p-menu">
      <summary aria-label="Περισσότερες ενέργειες">⋯</summary>
      <div className="b2p-menu-body">
        {assignable !== null && (
          <ClientTransfer
            clientId={ctx.client.id}
            currentManagerId={ctx.client.managerId}
            assignable={assignable}
          />
        )}
        <SpacesHistoryLink
          viewer={ctx.viewer}
          entity="clients"
          id={ctx.client.id}
        />
        {ctx.data.deleteState && (
          <div className="b2p-delete">
            <ClientDelete
              clientId={ctx.client.id}
              clientName={ctx.client.name}
              block={ctx.data.deleteState.deleteBlock}
            />
          </div>
        )}
      </div>
    </details>
  );
}

// «+ Νέα Ευκαιρία» και «Πρόσθεσε σημείωση» (η φόρμα ανοίγει επί τόπου).
export function HeaderActions({ ctx }: { ctx: ProtoCtx }) {
  return (
    <>
      {ctx.canEdit && ctx.card !== null && (
        <ClientNewOpportunity
          clientId={ctx.client.id}
          clientName={ctx.client.name}
        />
      )}
      {ctx.canEdit && <NoteSlot ctx={ctx} />}
      <MoreMenu ctx={ctx} />
    </>
  );
}

export function NoteSlot({ ctx }: { ctx: ProtoCtx }) {
  return (
    <NoteToggle
      clientId={ctx.client.id}
      rows={(ctx.proto.activities ?? []).slice(0, 3)}
      kinds={ctx.data.lists?.activityKinds ?? []}
      openOpportunities={ctx.d.logOpportunities}
    />
  );
}

export interface ProtoTab {
  id: string;
  label: string;
}

export function ProtoTabs({
  ctx,
  tabs,
  active,
  isScrolling = false,
  children,
}: {
  ctx: ProtoCtx;
  tabs: readonly ProtoTab[];
  active: string;
  isScrolling?: boolean;
  children?: ReactNode;
}) {
  return (
    <nav
      className="tabs b2p-tabs"
      data-scroll={isScrolling}
      aria-label="Ενότητες Πελάτη"
    >
      {tabs.map((item) => (
        <Link
          key={item.id}
          className="tab"
          href={protoTabHref(ctx.client.id, ctx.variant, item.id)}
          aria-current={item.id === active ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
      {children}
    </nav>
  );
}

// Χρήστες Πελάτη και GDPR (ο Ιδιοκτήτης): όπως η σημερινή καρτέλα και η Σύνοψη.
export function UsersAndGdpr({ ctx }: { ctx: ProtoCtx }) {
  return (
    <>
      {ctx.allowed.includes("users") && ctx.renderTab("users")}
      {isOwner(ctx.viewer) && (
        <SpacesGdprClientSection clientId={ctx.client.id} />
      )}
    </>
  );
}

export const hasUsersView = (ctx: ProtoCtx): boolean =>
  ctx.allowed.includes("users") || isOwner(ctx.viewer);

export const usersLabel = (ctx: ProtoCtx): string =>
  ctx.allowed.includes("users")
    ? isOwner(ctx.viewer)
      ? "Χρήστες Πελάτη & GDPR"
      : "Χρήστες Πελάτη"
    : "GDPR";
