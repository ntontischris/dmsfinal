import { Field, Input, Select } from "@/components/ui/field";

import { logActivity } from "../actions-opportunities";
import type { ListItem } from "../types";

import { ActionForm } from "./action-form";

interface LogActivityFormProps {
  opportunityId: string;
  kinds: readonly ListItem[];
}

// Καταγραφή Δραστηριότητας (κλήση, email, συνάντηση, σημείωση) στην Ευκαιρία. Μετά την επιτυχία αδειάζει για την επόμενη.
export function LogActivityForm({
  opportunityId,
  kinds,
}: LogActivityFormProps) {
  const activeKinds = kinds.filter((kind) => !kind.isRetired);
  return (
    <ActionForm
      action={logActivity}
      submitLabel="Καταγραφή"
      pendingLabel="Καταγραφή…"
      resetOnSuccess
    >
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <Field label="Είδος Δραστηριότητας">
        <Select name="kindId" required defaultValue={activeKinds[0]?.id ?? ""}>
          {activeKinds.map((kind) => (
            <option key={kind.id} value={kind.id}>
              {kind.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Τι έγινε;">
        <Input name="body" required autoComplete="off" />
      </Field>
    </ActionForm>
  );
}
