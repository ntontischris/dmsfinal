import { Panel } from "@/components/ui/panel";

import type { ProposalDocument as ProposalDocumentData } from "../types";

import { PrintButton } from "./agreement-actions-parts";
import { ProposalDocument } from "./proposal-document";

const PREVIEW_ID = "client-preview";

// «Έτσι θα τη δει ο πελάτης»: το έγγραφο της πρότασης όπως θα φανεί στον Σύνδεσμο, μαζεμένο μέχρι να ανοίξει.
// Η βάση το δίνει μόνο σε όποιον «Βλέπει ποσά» (περιέχει τιμές)· αλλιώς δεν υπάρχει ενότητα.
export function ProposalPreview({
  document,
}: {
  document: ProposalDocumentData | null;
}) {
  if (document === null) return null;
  return (
    <Panel
      label="Προεπισκόπηση πελάτη"
      aside={<PrintButton targetId={PREVIEW_ID} />}
    >
      <details id={PREVIEW_ID}>
        <summary className="cursor-pointer text-sm">
          Άνοιγμα προεπισκόπησης
        </summary>
        <div className="mt-4">
          <ProposalDocument
            document={document}
            language={document.language}
            mode="preview"
          />
        </div>
      </details>
    </Panel>
  );
}
