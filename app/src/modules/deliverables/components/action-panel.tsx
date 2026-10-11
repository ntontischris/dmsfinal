import type { ReactNode } from "react";

import { Panel } from "@/components/ui/panel";

import { availableActions, type DeliverableAction } from "../helpers";
import type { DeliverableCandidates, DeliverableDetail } from "../types";

import { AddVersionForm } from "./add-version-form";
import { CancelDeliverableForm } from "./cancel-deliverable-form";
import { EditDeliverableForm } from "./edit-deliverable-form";
import { MutedNote } from "./form-fields";
import { LinkFixForm } from "./link-fix-form";
import {
  ApproveInternalForm,
  ReturnVersionForm,
  SendVersionForm,
} from "./version-action-forms";

const ACTION_TITLES: Readonly<Record<DeliverableAction, string>> = {
  addVersion: "Νέα Έκδοση",
  send: "Στείλε στον πελάτη",
  return: "Επέστρεψε",
  approveInternal: "Ενέκρινε",
  fixLink: "Διόρθωση link",
  cancel: "Ακύρωση",
  edit: "Επεξεργασία",
};

interface ActionPanelProps {
  detail: DeliverableDetail;
  candidates: DeliverableCandidates | null;
}

// Οι ενέργειες που επιτρέπει η βάση σε αυτόν τον θεατή. Χωρίς καμία, μία σημείωση.
export function ActionPanel({ detail, candidates }: ActionPanelProps) {
  const actions = availableActions(detail.can, detail.versionCount).filter(
    (action) => action !== "edit" || candidates !== null,
  );
  if (actions.length === 0)
    return (
      <Panel label="Ενέργειες">
        <MutedNote>Μόνο ανάγνωση για σένα.</MutedNote>
      </Panel>
    );
  return (
    <Panel label="Ενέργειες">
      <div className="grid gap-6">
        {actions.map((action) => (
          <ActionBlock key={action} title={ACTION_TITLES[action]}>
            {renderAction(action, detail, candidates)}
          </ActionBlock>
        ))}
      </div>
    </Panel>
  );
}

function ActionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3">
      <h3 className="m-0 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

// Κάθε ενέργεια έχει τη δική της φόρμα. Η επεξεργασία θέλει τις υποψήφιες (Υπεύθυνοι, Γυρίσματα).
function renderAction(
  action: DeliverableAction,
  detail: DeliverableDetail,
  candidates: DeliverableCandidates | null,
): ReactNode {
  const id = detail.id;
  if (action === "addVersion") return <AddVersionForm deliverableId={id} />;
  if (action === "send") return <SendVersionForm deliverableId={id} />;
  if (action === "return") return <ReturnVersionForm deliverableId={id} />;
  if (action === "approveInternal")
    return <ApproveInternalForm deliverableId={id} />;
  if (action === "fixLink") return <LinkFixForm deliverableId={id} />;
  if (action === "cancel") return <CancelDeliverableForm deliverableId={id} />;
  return (
    candidates && <EditDeliverableForm card={detail} candidates={candidates} />
  );
}
