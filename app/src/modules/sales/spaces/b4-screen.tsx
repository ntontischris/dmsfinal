import Link from "next/link";
import { z } from "zod";

import { getViewer, isOwner } from "@/modules/access";
import {
  SpacesProposalPanel,
  agreementCaps,
  getProposalSummary,
  type ProposalSummary,
  type ReadResult as AgreementsRead,
} from "@/modules/agreements";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { athensToday, canSeeAmounts, salesCaps } from "../helpers";
import { getOpportunityForecast } from "../queries-forecast";
import { getActivityLookups, listSalesLists } from "../queries-lists";
import {
  getOpportunity,
  listOpportunityActivities,
} from "../queries-opportunities";
import type { ReadResult } from "../read";
import type {
  ActivityLookups,
  ActivityRow,
  Opportunity,
  OpportunityForecast,
  SalesCaps,
  SalesLists,
} from "../types";
import { toActivityRows } from "./activity-rows";
import { ActivitiesBox, ControlBox } from "./b4-boxes";
import { FollowUp } from "./b4-controls";
import { ForecastBox } from "./b4-forecast-panel";
import { OpportunityHero } from "./b4-hero";

import "../../finance/spaces/money-lines.css";
import "./b4-lines.css";

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div data-spaces className="ml-stack b4-page">
    {children}
  </div>
);

const DAY_MS = 86_400_000;
const plusDays = (isoDate: string, days: number): string =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

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
  isOwner: boolean;
  canCreateProposal: boolean;
  proposal: AgreementsRead<ProposalSummary | null>;
  forecast: ReadResult<OpportunityForecast>;
  hasAmounts: boolean;
}

// Οι σημειώσεις της κλεισμένης Ευκαιρίας στην κεφαλίδα: κερδισμένη με την υπογραφή, ή χαμένη με «Νέα Ευκαιρία από αυτήν».
function ClosedNotes({
  opportunity,
  caps,
  today,
}: {
  opportunity: Opportunity;
  caps: SalesCaps;
  today: string;
}) {
  if (opportunity.outcome === "won")
    return (
      <p className="note">
        Κερδισμένη με την υπογραφή του Υπογράφοντα. Δεν αλλάζει με το χέρι.
      </p>
    );
  if (opportunity.outcome !== "lost") return null;
  return (
    <div className="stack">
      <p className="note">
        Μια χαμένη Ευκαιρία δεν ξανανοίγει. Αν ο πελάτης το ξανασκεφτεί, ανοίγει
        νέα, με σύνδεσμο σε αυτήν.
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
  );
}

// Τα κλειστά κουτιά κάτω από την κεφαλίδα: Πρόταση, Πρόβλεψη (ανοιχτή), Έλεγχος (για τον Υπεύθυνο), Δραστηριότητες.
function Boxes(props: WorkbenchProps & { canWork: boolean }) {
  const { opportunity, lists, caps, canWork } = props;
  const isOpen = opportunity.outcome === "open";
  const rows = toActivityRows(props.activities, props.lookups, {
    who: {
      userId: caps.userId,
      isOwner: props.isOwner,
      canManage: caps.canManage,
    },
    showOpportunity: false,
  });
  return (
    <>
      <SpacesProposalPanel
        opportunityId={opportunity.id}
        found={props.proposal}
        canCreate={props.canCreateProposal && isOpen}
        defaultTitle={opportunity.title}
      />
      {isOpen && (
        <ForecastBox
          opportunity={opportunity}
          stages={lists.stages}
          canWork={canWork}
          found={props.forecast}
          hasAmounts={props.hasAmounts}
        />
      )}
      {canWork && (
        <ControlBox opportunity={opportunity} lossReasons={lists.lossReasons} />
      )}
      <ActivitiesBox
        opportunity={opportunity}
        rows={rows}
        canLog={canWork}
        kinds={lists.activityKinds}
      />
    </>
  );
}

// Η Σελίδα Ευκαιρίας στη μορφή των «Χρημάτων»: κεφαλίδα με τη δουλειά της μέρας και από κάτω κλειστά κουτιά.
function Workbench(props: WorkbenchProps) {
  const { opportunity, caps, proposal, forecast, hasAmounts } = props;
  const today = athensToday();
  const canWork = canWorkOn(caps, opportunity);
  const found = proposal.ok ? proposal.data : null;
  const heroForecast =
    opportunity.outcome === "open" && forecast.ok
      ? { row: forecast.data.row, hasAmounts }
      : null;
  return (
    <Frame>
      <OpportunityHero
        opportunity={opportunity}
        lists={props.lists}
        caps={caps}
        canWork={canWork}
        today={today}
        forecast={heroForecast}
        proposal={{
          hasProposal: found !== null,
          href: found
            ? hrefOf("D2", { id: found.agreementId })
            : "#b4-proposal",
        }}
      >
        <ClosedNotes opportunity={opportunity} caps={caps} today={today} />
      </OpportunityHero>
      <Boxes {...props} canWork={canWork} />
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
  const [found, activities, lookups, lists, proposal, forecast] =
    await Promise.all([
      getOpportunity(opportunityId),
      listOpportunityActivities(opportunityId),
      getActivityLookups(),
      listSalesLists(),
      getProposalSummary(opportunityId),
      getOpportunityForecast(opportunityId),
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
      isOwner={isOwner(viewer)}
      canCreateProposal={agreements.canDraft}
      proposal={proposal}
      forecast={forecast}
      hasAmounts={canSeeAmounts(viewer)}
    />
  );
}
