import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";

import { respondToCrew } from "../actions-crew";
import { RESPONSE_LABELS } from "../labels";
import type { CrewMember } from "../types";

import { ActionForm } from "./action-form";

interface SheetResponsesProps {
  filmingId: string;
  member: CrewMember;
  currentVersion: number;
}

// Η απάντηση του μέλους στην τρέχουσα έκδοση: «Επιβεβαιώνω» ή «Δεν μπορώ» με λόγο.
export function SheetResponses({
  filmingId,
  member,
  currentVersion,
}: SheetResponsesProps) {
  const isAnswered = member.version === currentVersion;
  return (
    <div className="grid gap-3">
      <p className="m-0 flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={isAnswered ? undefined : "attention"}>
          {isAnswered ? RESPONSE_LABELS[member.response] : "Περιμένει απάντηση"}
        </Badge>
        <span className="text-muted-foreground">Έκδοση {currentVersion}</span>
      </p>
      {(member.response !== "confirmed" || !isAnswered) && (
        <ActionForm
          action={respondToCrew}
          submitLabel="Επιβεβαιώνω"
          variant="default"
          size="sm"
        >
          <input type="hidden" name="filmingId" value={filmingId} />
          <input type="hidden" name="response" value="confirmed" />
        </ActionForm>
      )}
      {(member.response !== "declined" || !isAnswered) && (
        <ActionForm
          action={respondToCrew}
          submitLabel="Δεν μπορώ"
          variant="danger"
          size="sm"
        >
          <input type="hidden" name="filmingId" value={filmingId} />
          <input type="hidden" name="response" value="declined" />
          <Field label="Λόγος (υποχρεωτικός)">
            <Input name="reason" required maxLength={500} />
          </Field>
        </ActionForm>
      )}
    </div>
  );
}
