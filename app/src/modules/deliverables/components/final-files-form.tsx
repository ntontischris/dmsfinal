"use client";

import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { setFinalFiles } from "../actions-requests";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";

interface FinalFilesFormProps {
  deliverableId: string;
  finalFilesUrl: string | null;
}

// Τα τελικά αρχεία μιας εγκεκριμένης Παραγωγής. Κενό link: ξαναγυρίζει στο link της εγκεκριμένης Έκδοσης.
export function FinalFilesPanel({ deliverableId, finalFilesUrl }: FinalFilesFormProps) {
  return (
    <Panel label="Τελικά αρχεία">
      <ActionForm action={setFinalFiles} submitLabel="Αποθήκευση" pendingLabel="Αποθήκευση…" onlyWhenChanged>
        <input type="hidden" name="deliverableId" value={deliverableId} />
        <Field label="Link τελικών αρχείων" hint="Drive, Vimeo ή YouTube. Κενό = το link της εγκεκριμένης Έκδοσης.">
          <Input name="url" type="url" defaultValue={finalFilesUrl ?? ""} placeholder="https://" />
        </Field>
        {finalFilesUrl === null && <MutedNote>Δεν έχουν οριστεί ακόμα.</MutedNote>}
      </ActionForm>
    </Panel>
  );
}
