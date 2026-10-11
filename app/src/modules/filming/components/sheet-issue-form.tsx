import { Notice } from "@/components/ui/notice";
import { Field } from "@/components/ui/field";

import { issueSheet } from "../actions-sheet";

import { ActionForm } from "./action-form";
import { TextArea } from "./form-fields";

interface SheetIssueFormProps {
  filmingId: string;
  currentVersion: number | null;
}

// Έκδοση του Δελτίου: η πρώτη δεν θέλει περιγραφή· από τη 2η «Τι άλλαξε» είναι υποχρεωτικό.
export function SheetIssueForm({ filmingId, currentVersion }: SheetIssueFormProps) {
  const isNextChange = currentVersion !== null;
  return (
    <ActionForm action={issueSheet} submitLabel="Έκδοση Δελτίου" variant="primary" size="sm">
      <input type="hidden" name="filmingId" value={filmingId} />
      {isNextChange && (
        <>
          <Notice kind="empty" title="Νέα έκδοση">
            <p className="m-0">
              Οι απαντήσεις του Συνεργείου θα μηδενιστούν, αν ισχύει ο Κανόνας «Η αλλαγή μηδενίζει τις επιβεβαιώσεις».
            </p>
          </Notice>
          <Field label="Τι άλλαξε">
            <TextArea name="change" required maxLength={300} />
          </Field>
        </>
      )}
    </ActionForm>
  );
}
