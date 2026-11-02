import Link from "next/link";
import { z } from "zod";

import { getViewer } from "@/modules/access";
import {
  SpacesProposalPanel,
  agreementCaps,
  getProposalSummary,
  type ProposalSummary,
  type ReadResult as AgreementsRead,
} from "@/modules/agreements";
import { Panel } from "@/spaces/kit/panel";
import { hrefOf } from "@/spaces/data/screens";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  fmtDate,
} from "@/spaces/screens/shared";

import {
  athensToday,
  describeActivity,
  formatDate,
  isForgotten,
  salesCaps,
} from "../helpers";
import { NO_MANAGER_LABEL, OUTCOME_LABELS } from "../labels";
import { getActivityLookups, listSalesLists } from "../queries-lists";
import {
  getOpportunity,
  listOpportunityActivities,
} from "../queries-opportunities";
import type {
  ActivityLookups,
  ActivityRow,
  ListItem,
  Opportunity,
  SalesCaps,
  SalesLists,
} from "../types";
import { ActivityLog } from "./b2-activity-log";
import {
  CloseLost,
  FollowUp,
  NextStepEditor,
  SaidYes,
  StageSelect,
} from "./b4-controls";
import { noteKindId } from "./b4-said-yes";

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div data-spaces>{children}</div>
);

const DAY_MS = 86_400_000;
const plusDays = (isoDate: string, days: number): string =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

const labelOf = (items: readonly ListItem[], id: string | null): string =>
  items.find((item) => item.id === id)?.label ?? "—";

const canWorkOn = (caps: SalesCaps, o: Opportunity): boolean =>
  caps.canManage &&
  o.outcome === "open" &&
  (caps.manageScope === "all" || o.managerId === caps.userId);

const canFollowUpOn = (caps: SalesCaps, o: Opportunity): boolean =>
  caps.canManage &&
  o.outcome === "lost" &&
  (caps.manageScope === "all" || o.clientManagerId === caps.userId);

function Missing() {
  return (
    <Frame>
      <StateNotice kind="empty" title="Δεν βρέθηκε η Ευκαιρία">
        <p>
          Η Ευκαιρία φαίνεται μόνο στον Υπεύθυνό της, στον Υπεύθυνο του Πελάτη
          και σε όσους διαχειρίζονται όλους τους Πελάτες. Ίσως ο σύνδεσμος είναι
          παλιός.
        </p>
        <p className="btn-row">
          <Link className="button" href={hrefOf("B3")}>
            Πίσω στο Pipeline
          </Link>
          <Link className="button" href={hrefOf("B1")}>
            Λίστα Πελατών
          </Link>
        </p>
      </StateNotice>
    </Frame>
  );
}

interface WorkbenchProps {
  opportunity: Opportunity;
  lists: SalesLists;
  activities: readonly ActivityRow[];
  lookups: ActivityLookups;
  caps: SalesCaps;
  canCreateProposal: boolean;
  proposal: AgreementsRead<ProposalSummary | null>;
}

function Facts({
  opportunity,
  lists,
  canWork,
  today,
}: {
  opportunity: Opportunity;
  lists: SalesLists;
  canWork: boolean;
  today: string;
}) {
  const isOpen = opportunity.outcome === "open";
  return (
    <dl className="dl">
      <dt>Πελάτης</dt>
      <dd>
        <Link href={hrefOf("B2", { id: opportunity.clientId })}>
          {opportunity.clientName ?? "—"}
        </Link>
      </dd>
      <dt>Στάδιο</dt>
      <dd>
        {canWork ? (
          <StageSelect
            opportunityId={opportunity.id}
            stageId={opportunity.stageId}
            stages={lists.stages}
          />
        ) : (
          labelOf(lists.stages, opportunity.stageId)
        )}
      </dd>
      <dt>Υπεύθυνος</dt>
      <dd>{opportunity.managerName ?? NO_MANAGER_LABEL}</dd>
      <dt>Πηγή</dt>
      <dd>
        {labelOf(lists.sources, opportunity.sourceId)}
        {opportunity.referredBy && ` (σύσταση από ${opportunity.referredBy})`}
      </dd>
      <dt>Επόμενο βήμα</dt>
      <dd>
        {canWork ? (
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
        ) : isOpen && opportunity.nextStepDue ? (
          `${opportunity.nextStep}, ${fmtDate(opportunity.nextStepDue)}`
        ) : (
          "—"
        )}
      </dd>
      {opportunity.followsId && (
        <>
          <dt>Συνεχίζει</dt>
          <dd>
            <Link href={hrefOf("B4", { id: opportunity.followsId })}>
              {opportunity.followsTitle ?? "—"}
            </Link>
          </dd>
        </>
      )}
    </dl>
  );
}

// Η Σελίδα Ευκαιρίας (prototype `screens/b4-workbench.tsx`): ταυτότητα και δουλειά, πρόταση, Δραστηριότητες.
function Workbench({
  opportunity,
  lists,
  activities,
  lookups,
  caps,
  canCreateProposal,
  proposal,
}: WorkbenchProps) {
  const hasProposal = proposal.ok && proposal.data !== null;
  const today = athensToday();
  const canWork = canWorkOn(caps, opportunity);
  const isOpen = opportunity.outcome === "open";
  const lossReason = opportunity.lossReasonId
    ? labelOf(lists.lossReasons, opportunity.lossReasonId)
    : null;
  const rows = activities.map((activity) => {
    const described = describeActivity(activity, lookups);
    return {
      id: activity.id,
      when: formatDate(activity.occurredAt),
      kind: described.kind,
      text: described.text,
      by: activity.actorName ?? "Σύστημα",
    };
  });
  return (
    <Frame>
      <div className="stack">
        <Panel
          label={opportunity.title}
          aside={
            <span className="btn-row">
              <Badge tone="strong">{OUTCOME_LABELS[opportunity.outcome]}</Badge>
              {lossReason && opportunity.outcome === "lost" && (
                <Badge>Λόγος απώλειας: {lossReason}</Badge>
              )}
            </span>
          }
        >
          {canWork && (
            <nav className="btn-row" aria-label="Ενέργειες Ευκαιρίας">
              <a className="button" href="#b4-activities">
                Σημείωση ή κλήση
              </a>
              <a className="button" href="#b4-proposal">
                {hasProposal
                  ? "Πρόταση: αποστολή, Παράταση, κλείσιμο"
                  : "Νέα πρόταση"}
              </a>
              <SaidYes
                opportunityId={opportunity.id}
                kindId={noteKindId(lists.activityKinds)}
                hasProposal={hasProposal}
                proposalHref={
                  proposal.ok && proposal.data
                    ? hrefOf("D2", { id: proposal.data.agreementId })
                    : "#b4-proposal"
                }
              />
            </nav>
          )}
          <Facts
            opportunity={opportunity}
            lists={lists}
            canWork={canWork}
            today={today}
          />
          {opportunity.outcome === "won" && (
            <p className="note">
              Κερδισμένη με την υπογραφή του Υπογράφοντα. Δεν αλλάζει με το
              χέρι.
            </p>
          )}
          {opportunity.outcome === "lost" && (
            <div className="stack">
              <p className="note">
                Μια χαμένη Ευκαιρία δεν ξανανοίγει. Αν ο πελάτης το ξανασκεφτεί,
                ανοίγει νέα, με σύνδεσμο σε αυτήν.
              </p>
              {canFollowUpOn(caps, opportunity) && (
                <FollowUp
                  lostId={opportunity.id}
                  title={opportunity.title}
                  sourceId={opportunity.sourceId}
                  defaultDue={plusDays(today, 3)}
                />
              )}
            </div>
          )}
          {canWork && (
            <CloseLost
              opportunityId={opportunity.id}
              reasons={lists.lossReasons}
            />
          )}
        </Panel>

        <div id="b4-proposal" />
        <SpacesProposalPanel
          opportunityId={opportunity.id}
          found={proposal}
          canCreate={canCreateProposal && isOpen}
          defaultTitle={opportunity.title}
        />

        <div id="b4-activities" />
        <Panel label="Δραστηριότητες">
          <ActivityLog
            rows={rows}
            canLog={canWork}
            kinds={lists.activityKinds}
            openOpportunities={[
              { id: opportunity.id, title: opportunity.title },
            ]}
          />
        </Panel>
      </div>
    </Frame>
  );
}

// B4 Σελίδα Ευκαιρίας στη νέα εμφάνιση. Καμία ενέργεια «κερδισμένη»: έρχεται μόνο με την υπογραφή (ADR 0009).
export async function SpacesOpportunity({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const viewer = await getViewer();
  const caps = salesCaps(viewer);
  if (!caps.canManage)
    return (
      <Frame>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            Τις Ευκαιρίες τις βλέπει όποιος «Διαχειρίζεται Πελάτες και
            Ευκαιρίες».
          </p>
        </StateNotice>
      </Frame>
    );
  if (!z.uuid().safeParse(opportunityId).success) return <Missing />;
  const agreements = agreementCaps(viewer);
  const [found, activities, lookups, lists, proposal] = await Promise.all([
    getOpportunity(opportunityId),
    listOpportunityActivities(opportunityId),
    getActivityLookups(),
    listSalesLists(),
    getProposalSummary(opportunityId),
  ]);
  if (!found.ok || !activities.ok || !lookups.ok || !lists.ok)
    return (
      <Frame>
        <ErrorNotice what="η Σελίδα Ευκαιρίας" />
      </Frame>
    );
  if (!found.data) return <Missing />;
  return (
    <Workbench
      opportunity={found.data}
      lists={lists.data}
      activities={activities.data}
      lookups={lookups.data}
      caps={caps}
      canCreateProposal={agreements.canDraft}
      proposal={proposal}
    />
  );
}
