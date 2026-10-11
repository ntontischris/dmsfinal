"use client";

import { reportBrokenLink } from "../actions-client";

import { ActionForm } from "./action-form";

interface ClientReportButtonProps {
  deliverableId: string;
  versionNumber: number;
}

// «Το link δεν ανοίγει»: μία φορά ανά Έκδοση· μετά η κατάσταση δείχνει ότι το αναφέραμε.
export function ClientReportButton({ deliverableId, versionNumber }: ClientReportButtonProps) {
  return (
    <ActionForm action={reportBrokenLink} submitLabel="Το link δεν ανοίγει" pendingLabel="Αναφορά…" variant="default" size="sm">
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <input type="hidden" name="versionNumber" value={versionNumber} />
    </ActionForm>
  );
}
