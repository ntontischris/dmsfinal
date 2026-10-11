import { Select } from "@/components/ui/field";

import { formatDateTime } from "../helpers";
import { NO_ASSIGNEE_LABEL, NO_FILMING_LABEL } from "../labels";
import type { AssigneeCandidate, FilmingCandidate } from "../types";

// Τα πεδία υπεύθυνος και Γύρισμα, κοινά στη φόρμα νέου Παραδοτέου και στην επεξεργασία.

export function AssigneeSelect({
  assignees,
  defaultValue,
}: {
  assignees: readonly AssigneeCandidate[];
  defaultValue: string | null;
}) {
  return (
    <Select name="assigneeId" defaultValue={defaultValue ?? ""}>
      <option value="">{NO_ASSIGNEE_LABEL}</option>
      {assignees.map((person) => (
        <option key={person.id} value={person.id}>
          {person.name}
        </option>
      ))}
    </Select>
  );
}

export function FilmingSelect({
  filmings,
  defaultValue,
}: {
  filmings: readonly FilmingCandidate[];
  defaultValue: string | null;
}) {
  return (
    <Select name="filmingId" defaultValue={defaultValue ?? ""}>
      <option value="">{NO_FILMING_LABEL}</option>
      {filmings.map((filming) => (
        <option key={filming.id} value={filming.id}>
          {formatDateTime(filming.startsAt)}
        </option>
      ))}
    </Select>
  );
}
