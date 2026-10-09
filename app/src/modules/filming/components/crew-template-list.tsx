import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";

import { deleteCrewTemplate, saveCrewTemplate } from "../actions-templates";
import type { CrewTemplate, NamedRef } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";

interface CrewTemplateListProps {
  templates: readonly CrewTemplate[];
  candidates: readonly NamedRef[];
}

// E7: τα Πρότυπα Συνεργείου. Ένα Πρότυπο είναι μια σταθερή ομάδα που μπαίνει σε Γύρισμα με ένα κλικ.
export function CrewTemplateList({
  templates,
  candidates,
}: CrewTemplateListProps) {
  return (
    <div className="grid gap-4">
      <Panel label="Νέο Πρότυπο">
        <TemplateForm candidates={candidates} />
      </Panel>
      {templates.length === 0 ? (
        <Notice kind="empty" title="Κανένα Πρότυπο ακόμα">
          <p className="m-0">
            Φτιάξε ένα Πρότυπο για τις ομάδες που δουλεύουν μαζί.
          </p>
        </Notice>
      ) : (
        templates.map((template) => (
          <Panel key={template.id} label={template.name}>
            <div className="grid gap-4">
              <MutedNote>
                {template.members.length === 0
                  ? "Χωρίς μέλη."
                  : template.members.map((member) => member.name).join(", ")}
              </MutedNote>
              <details>
                <summary className="cursor-pointer text-sm">
                  Επεξεργασία
                </summary>
                <div className="mt-3">
                  <TemplateForm template={template} candidates={candidates} />
                </div>
              </details>
              <ActionForm
                action={deleteCrewTemplate}
                submitLabel="Διαγραφή"
                variant="danger"
                size="sm"
              >
                <input type="hidden" name="templateId" value={template.id} />
              </ActionForm>
            </div>
          </Panel>
        ))
      )}
    </div>
  );
}

// Η φόρμα ενός Προτύπου: όνομα, σημείωση και μέλη. Χωρίς templateId δημιουργεί νέο.
function TemplateForm({
  template,
  candidates,
}: {
  template?: CrewTemplate;
  candidates: readonly NamedRef[];
}) {
  const current = template?.members.map((member) => member.id) ?? [];
  return (
    <ActionForm
      action={saveCrewTemplate}
      submitLabel={template ? "Αποθήκευση" : "Δημιουργία Προτύπου"}
      variant="primary"
    >
      <input type="hidden" name="templateId" value={template?.id ?? ""} />
      <Field label="Όνομα">
        <Input
          name="name"
          required
          maxLength={100}
          defaultValue={template?.name ?? ""}
        />
      </Field>
      <Field label="Σημείωση">
        <Input
          name="note"
          maxLength={500}
          defaultValue={template?.note ?? ""}
        />
      </Field>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="kit-label mb-1">Μέλη</legend>
        {candidates.map((candidate) => (
          <label key={candidate.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="userId"
              value={candidate.id}
              defaultChecked={current.includes(candidate.id)}
            />
            {candidate.name}
          </label>
        ))}
      </fieldset>
    </ActionForm>
  );
}
