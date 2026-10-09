import { Panel } from "@/components/ui/panel";

import { ownerChoices } from "../helpers";
import { NO_OWNER_LABEL } from "../labels";
import type { OwnerCandidate, ProductionDetail } from "../types";

import { TransferForm } from "./transfer-form";

interface OwnerPanelProps {
  production: ProductionDetail;
  candidates: readonly OwnerCandidate[];
}

// Ο Υπεύθυνος και η μεταβίβασή του. Η φόρμα φαίνεται μόνο σε όποιον μπορεί να μεταβιβάσει (Εύρος «όλα»).
export function OwnerPanel({ production, candidates }: OwnerPanelProps) {
  const choices = ownerChoices(candidates, production.owner?.id ?? null);
  return (
    <Panel label="Υπεύθυνος">
      <div className="grid gap-4">
        <p className="m-0 text-sm font-medium">
          {production.owner?.name ?? NO_OWNER_LABEL}
        </p>
        {production.viewerCan.transfer && choices.length > 0 && (
          <TransferForm productionId={production.id} choices={choices} />
        )}
      </div>
    </Panel>
  );
}
