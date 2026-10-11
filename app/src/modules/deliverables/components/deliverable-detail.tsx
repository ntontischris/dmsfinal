import { Panel } from "@/components/ui/panel";

import type { DeliverableCandidates, DeliverableDetail } from "../types";

import { ActionPanel } from "./action-panel";
import { ChargeDecisionForm } from "./charge-decision-form";
import { DeliverableHeader } from "./deliverable-header";
import { FinalFilesPanel } from "./final-files-form";
import { HistoryPanel } from "./history-panel";
import { MutedNote } from "./form-fields";
import { RequestsPanel } from "./requests-panel";
import { VersionsPanel } from "./versions-panel";

interface DeliverableDetailViewProps {
  detail: DeliverableDetail;
  candidates: DeliverableCandidates | null;
  canSeeAmounts: boolean;
}

// H2: η σελίδα ενός Παραδοτέου. Ό,τι δεν επιτρέπεται στον θεατή δεν εμφανίζεται· η βάση ξαναελέγχει κάθε ενέργεια.
export function DeliverableDetailView({ detail, candidates, canSeeAmounts }: DeliverableDetailViewProps) {
  return (
    <div className="grid gap-5">
      <DeliverableHeader card={detail} />
      <div className="grid gap-4 lg:grid-cols-2">
        <VersionsPanel
          versions={detail.versions}
          deliverableId={detail.id}
          canComment={detail.can.comment}
        />
        <div className="grid content-start gap-4">
          <ActionPanel detail={detail} candidates={candidates} />
          {detail.can.decideCharge && detail.pendingCharge && <ChargePanel deliverableId={detail.id} />}
          <RequestsPanel requests={detail.requests} canSeeAmounts={canSeeAmounts} />
          {detail.state === "approved" && detail.can.edit && (
            <FinalFilesPanel deliverableId={detail.id} finalFilesUrl={detail.finalFilesUrl} />
          )}
          <HistoryPanel history={detail.history} />
        </div>
      </div>
    </div>
  );
}

function ChargePanel({ deliverableId }: { deliverableId: string }) {
  return (
    <Panel label="Απόφαση χρέωσης">
      <div className="grid gap-3">
        <MutedNote>Η δουλειά δεν σταμάτησε. Η Παροχή δεν έφτανε για το Παραδοτέο.</MutedNote>
        <ChargeDecisionForm deliverableId={deliverableId} />
      </div>
    </Panel>
  );
}
