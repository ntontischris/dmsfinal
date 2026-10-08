import Link from "next/link";
import type { ReactNode } from "react";
import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Split } from "@/components/ui/inspector";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { AccessNotice, getViewer } from "@/modules/access";
import { ProposalPanel, agreementCaps } from "@/modules/agreements";
import {
  ActivityList,
  CloseLostForm,
  FollowUpForm,
  LogActivityForm,
  OpportunityPanel,
  athensToday,
  getActivityLookups,
  getOpportunity,
  listOpportunityActivities,
  listSalesLists,
  salesCaps,
  type ActivityLookups,
  type ActivityRow,
  type Opportunity,
  type SalesCaps,
  type SalesLists,
} from "@/modules/sales";

export const metadata = { title: "Ευκαιρία" };

const EYEBROW = "B4 · Πελάτες και Πωλήσεις";
const BACK = (
  <Link href="/app/pipeline" className="text-sm">
    ← Pipeline
  </Link>
);

// Προεπιλεγμένη προθεσμία του Επόμενου βήματος: σήμερα + 3 μέρες, με ώρα Αθήνας.
const plusDays = (isoDate: string, days: number): string =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000)
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
    <Notice kind="empty" title="Αυτή η Ευκαιρία δεν υπάρχει ή δεν σε αφορά">
      <p className="m-0">
        Η Ευκαιρία φαίνεται μόνο στον Υπεύθυνό της, στον Υπεύθυνο του Πελάτη και
        σε όσους διαχειρίζονται όλους τους Πελάτες.
      </p>
    </Notice>
  );
}

// Τι ακολουθεί το κλείσιμο: χαμένη μένει χαμένη (νέα Ευκαιρία με σύνδεσμο), κερδισμένη γίνεται μόνο με υπογραφή.
function OutcomeNotice({
  opportunity,
  followUp,
}: {
  opportunity: Opportunity;
  followUp: ReactNode;
}) {
  if (opportunity.outcome === "won")
    return (
      <Notice kind="empty" title="Κερδισμένη με την υπογραφή της Συμφωνίας">
        <p className="m-0">Δεν αλλάζει με το χέρι.</p>
      </Notice>
    );
  if (opportunity.outcome === "lost")
    return (
      <Notice kind="empty" title="Η Ευκαιρία έκλεισε ως χαμένη">
        <p className="m-0">
          Μια χαμένη Ευκαιρία δεν ξανανοίγει. Αν ο πελάτης το ξανασκεφτεί,
          ανοίγει νέα, με σύνδεσμο σε αυτήν.
        </p>
        {followUp}
      </Notice>
    );
  return null;
}

interface DetailProps {
  opportunity: Opportunity;
  lists: SalesLists;
  activities: readonly ActivityRow[];
  lookups: ActivityLookups;
  caps: SalesCaps;
  canCreateProposal: boolean; // «Συντάσσει Συμφωνίες» (agreements.draft): η βάση ελέγχει το εύρος στη δημιουργία
}

function OpportunityDetail({
  opportunity,
  lists,
  activities,
  lookups,
  caps,
  canCreateProposal,
}: DetailProps) {
  const today = athensToday();
  const canWork = canWorkOn(caps, opportunity);
  const followUp = canFollowUpOn(caps, opportunity) && (
    <FollowUpForm
      lostId={opportunity.id}
      defaultTitle={opportunity.title}
      defaultSourceId={opportunity.sourceId}
      defaultDue={plusDays(today, 3)}
      sources={lists.sources}
    />
  );
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title={opportunity.title}>
        {BACK}
      </ScreenHeader>
      <Split>
        <OpportunityPanel
          opportunity={opportunity}
          lists={lists}
          canWork={canWork}
          today={today}
        />
        <div className="grid min-w-0 gap-4">
          <Panel label="Δραστηριότητες">
            <div className="grid gap-4">
              {canWork && (
                <LogActivityForm
                  opportunityId={opportunity.id}
                  kinds={lists.activityKinds}
                />
              )}
              <ActivityList items={activities} lookups={lookups} />
            </div>
          </Panel>
          {canWork && (
            <CloseLostForm
              opportunityId={opportunity.id}
              reasons={lists.lossReasons}
            />
          )}
          <OutcomeNotice opportunity={opportunity} followUp={followUp} />
          <ProposalPanel
            opportunityId={opportunity.id}
            canCreate={canCreateProposal && opportunity.outcome === "open"}
            defaultTitle={opportunity.title}
          />
        </div>
      </Split>
    </>
  );
}

// Κοινό κέλυφος για ό,τι δεν είναι η Ευκαιρία: επικεφαλίδα με σύνδεσμο πίσω και ένα μήνυμα.
function BackShell({ children }: { children: ReactNode }) {
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Ευκαιρία">
        {BACK}
      </ScreenHeader>
      {children}
    </>
  );
}

async function OpportunityLoader({
  opportunityId,
  caps,
  canCreateProposal,
}: {
  opportunityId: string;
  caps: SalesCaps;
  canCreateProposal: boolean;
}) {
  const [found, activities, lookups, lists] = await Promise.all([
    getOpportunity(opportunityId),
    listOpportunityActivities(opportunityId),
    getActivityLookups(),
    listSalesLists(),
  ]);
  if (!found.ok || !activities.ok || !lookups.ok || !lists.ok)
    return (
      <BackShell>
        <Notice kind="error" title="Δεν φόρτωσε η Ευκαιρία">
          <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
        </Notice>
      </BackShell>
    );
  if (!found.data)
    return (
      <BackShell>
        <Missing />
      </BackShell>
    );
  return (
    <OpportunityDetail
      opportunity={found.data}
      lists={lists.data}
      activities={activities.data}
      lookups={lookups.data}
      caps={caps}
      canCreateProposal={canCreateProposal}
    />
  );
}

// B4 Ευκαιρία: ταυτότητα, δουλειά (Στάδιο, Επόμενο βήμα), Δραστηριότητες και κλείσιμο ως χαμένη.
// Δεν υπάρχει καμία ενέργεια «κερδισμένη»: έρχεται μόνο με την υπογραφή της Συμφωνίας (ADR 0009).
export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  const viewer = await getViewer();
  const caps = salesCaps(viewer);
  if (!caps.canManage)
    return (
      <>
        <ScreenHeader eyebrow={EYEBROW} title="Ευκαιρία" />
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            Τις Ευκαιρίες τις βλέπει όποιος «Διαχειρίζεται Πελάτες και
            Ευκαιρίες».
          </p>
        </AccessNotice>
      </>
    );

  if (!z.uuid().safeParse(opportunityId).success)
    return (
      <BackShell>
        <Missing />
      </BackShell>
    );

  return (
    <OpportunityLoader
      opportunityId={opportunityId}
      caps={caps}
      canCreateProposal={agreementCaps(viewer).canDraft}
    />
  );
}
