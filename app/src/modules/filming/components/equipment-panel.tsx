import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import {
  applyEquipmentTemplate,
  setFilmingEquipment,
} from "../actions-equipment";
import type { EquipmentCandidate, FilmingCard } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";

export interface EquipmentTemplateChoice {
  id: string;
  name: string;
}

interface EquipmentPanelProps {
  card: FilmingCard;
  candidates: readonly EquipmentCandidate[];
  templates: readonly EquipmentTemplateChoice[];
}

// Ο Εξοπλισμός του Γυρίσματος: τι είναι δεσμευμένο, η επιλογή αντικειμένων και η εφαρμογή Προτύπου.
// Σύγκρουση φαίνεται στη γραμμή· η βάση αποφασίζει αν μπλοκάρει ή προειδοποιεί.
export function EquipmentPanel({
  card,
  candidates,
  templates,
}: EquipmentPanelProps) {
  const canEdit = card.viewerCan.equipment;
  const current = card.equipment.map((line) => line.itemId);
  return (
    <Panel label="Εξοπλισμός">
      <div className="grid gap-4">
        <EquipmentLines lines={card.equipment} />
        {canEdit && (
          <>
            <EquipmentSetForm
              key={current.join(",")}
              filmingId={card.id}
              candidates={candidates}
              current={current}
            />
            {templates.length > 0 && (
              <EquipmentTemplateForm
                filmingId={card.id}
                templates={templates}
              />
            )}
          </>
        )}
      </div>
    </Panel>
  );
}

function EquipmentLines({ lines }: { lines: FilmingCard["equipment"] }) {
  if (lines.length === 0)
    return <MutedNote>Δεν έχει δεσμευτεί εξοπλισμός.</MutedNote>;
  return (
    <ul className="m-0 grid list-none gap-2 p-0 text-sm">
      {lines.map((line) => (
        <li
          key={line.itemId}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <span>{line.name}</span>
          {line.conflict ? (
            <Badge tone="attention">Σύγκρουση</Badge>
          ) : (
            <Badge>
              {line.status === "available" ? "Διαθέσιμο" : "Σε επισκευή"}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

function EquipmentSetForm({
  filmingId,
  candidates,
  current,
}: {
  filmingId: string;
  candidates: readonly EquipmentCandidate[];
  current: readonly string[];
}) {
  return (
    <ActionForm
      action={setFilmingEquipment}
      submitLabel="Αποθήκευση Εξοπλισμού"
      variant="default"
      size="sm"
    >
      <input type="hidden" name="filmingId" value={filmingId} />
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="kit-label mb-1">Αντικείμενα</legend>
        {candidates.map((candidate) => (
          <label key={candidate.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="itemId"
              value={candidate.id}
              defaultChecked={current.includes(candidate.id)}
            />
            <span>
              {candidate.name}
              <span className="text-muted-foreground">
                {" "}
                · {candidate.categoryName}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
    </ActionForm>
  );
}

function EquipmentTemplateForm({
  filmingId,
  templates,
}: {
  filmingId: string;
  templates: readonly EquipmentTemplateChoice[];
}) {
  return (
    <ActionForm
      action={applyEquipmentTemplate}
      submitLabel="Εφαρμογή Προτύπου"
      variant="default"
      size="sm"
    >
      <input type="hidden" name="filmingId" value={filmingId} />
      <Field label="Πρότυπο εξοπλισμού">
        <Select name="templateId" required defaultValue="">
          <option value="" disabled>
            Διάλεξε Πρότυπο…
          </option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Select>
      </Field>
    </ActionForm>
  );
}
