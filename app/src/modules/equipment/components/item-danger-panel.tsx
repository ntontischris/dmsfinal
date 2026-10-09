import { Panel } from "@/components/ui/panel";

import { deleteItem } from "../actions-items";
import type { TemplateLink } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./equipment-fields";

interface ItemDangerPanelProps {
  itemId: string;
  templates: readonly TemplateLink[];
}

const DELETE_HINT =
  "Διαγράφεται μόνο αν δεν είναι σε Πρότυπο. Η διαγραφή δεν αναιρείται.";
const IN_TEMPLATE_NOTE = "Είναι σε Πρότυπο: αφαίρεσέ το από εκεί πρώτα.";

// Η βάση αρνείται τη διαγραφή όταν το αντικείμενο είναι σε Πρότυπο· εδώ δεν εμφανίζεται το κουμπί.
export function ItemDangerPanel({ itemId, templates }: ItemDangerPanelProps) {
  return (
    <Panel label="Διαγραφή">
      {templates.length > 0 ? (
        <MutedNote>{IN_TEMPLATE_NOTE}</MutedNote>
      ) : (
        <div className="grid gap-3">
          <MutedNote>{DELETE_HINT}</MutedNote>
          <ActionForm
            action={deleteItem}
            submitLabel="Διαγραφή αντικειμένου"
            pendingLabel="Διαγραφή…"
            variant="danger"
          >
            <input type="hidden" name="itemId" value={itemId} />
          </ActionForm>
        </div>
      )}
    </Panel>
  );
}
