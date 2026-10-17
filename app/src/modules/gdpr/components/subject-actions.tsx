import { BLOCK_TEXT } from "../labels";
import type { AnonymizeBlock, PersonKind } from "../schemas";
import { AnonymizeForm } from "./anonymize-form";
import { GdprExportButton } from "./export-button";

interface SubjectActionsProps {
  kind: PersonKind;
  id: string;
  name: string;
  // Από τη βάση (authz.gdpr_block): null = ανωνυμοποιείται.
  block: AnonymizeBlock | null;
  exportLabel?: string;
}

// Εξαγωγή και Ανωνυμοποίηση ενός προσώπου. Ό,τι δεν γίνεται λέει γιατί, με τα λόγια της βάσης.
export function SubjectActions({
  kind,
  id,
  name,
  block,
  exportLabel = "Εξαγωγή δεδομένων",
}: SubjectActionsProps) {
  return (
    <div className="grid gap-3">
      {block !== "anonymized" && (
        <GdprExportButton
          subjectKind={kind}
          subjectId={id}
          label={exportLabel}
        />
      )}
      {block === null ? (
        <AnonymizeForm subjectKind={kind} subjectId={id} name={name} />
      ) : (
        <p className="m-0 text-sm text-muted-foreground">{BLOCK_TEXT[block]}</p>
      )}
    </div>
  );
}
