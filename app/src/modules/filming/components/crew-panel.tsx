import { Badge, type Tone } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { applyCrewTemplate, setFilmingCrew } from "../actions-crew";
import { RESPONSE_LABELS } from "../labels";
import type { CrewMember, CrewTemplate, FilmingCard, NamedRef } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";

interface CrewPanelProps {
  card: FilmingCard;
  candidates: readonly NamedRef[];
  templates: readonly CrewTemplate[];
  blockedIds: readonly string[];
}

const RESPONSE_TONE: Record<CrewMember["response"], Tone | undefined> = {
  pending: undefined,
  confirmed: "ok",
  declined: "attention",
};

// Το Συνεργείο: ποιος απάντησε τι, ο ορισμός του (πολλαπλή επιλογή) και η εφαρμογή Προτύπου.
// Η βάση ελέγχει επικάλυψη και Δικαίωμα· εδώ μόνο φαίνονται και στέλνονται τα πεδία.
export function CrewPanel({ card, candidates, templates, blockedIds }: CrewPanelProps) {
  const current = card.crew.map((member) => member.userId);
  const canEdit = card.viewerCan.crew;
  return (
    <Panel label="Συνεργείο">
      <div className="grid gap-4">
        <CrewStatus members={card.crew} />
        {canEdit && (
          <>
            <CrewSetForm
              key={current.join(",")}
              filmingId={card.id}
              candidates={candidates}
              current={current}
              blockedIds={blockedIds}
            />
            {templates.length > 0 && (
              <ApplyTemplateForm filmingId={card.id} templates={templates} />
            )}
          </>
        )}
      </div>
    </Panel>
  );
}

function CrewStatus({ members }: { members: readonly CrewMember[] }) {
  if (members.length === 0)
    return <MutedNote>Δεν έχει οριστεί Συνεργείο.</MutedNote>;
  return (
    <ul className="m-0 grid list-none gap-2 p-0 text-sm">
      {members.map((member) => (
        <li
          key={member.userId}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <span>
            {member.name}
            {member.reason && (
              <span className="text-muted-foreground"> · {member.reason}</span>
            )}
          </span>
          <span className="flex flex-wrap gap-2">
            {member.isBlocked && <Badge tone="attention">Κλεισμένος χρόνος</Badge>}
            <Badge tone={RESPONSE_TONE[member.response]}>{RESPONSE_LABELS[member.response]}</Badge>
          </span>
        </li>
      ))}
    </ul>
  );
}

function CrewSetForm({
  filmingId,
  candidates,
  current,
  blockedIds,
}: {
  filmingId: string;
  candidates: readonly NamedRef[];
  current: readonly string[];
  blockedIds: readonly string[];
}) {
  return (
    <ActionForm
      action={setFilmingCrew}
      onlyWhenChanged submitLabel="Αποθήκευση Συνεργείου"
      variant="default"
      size="sm"
    >
      <input type="hidden" name="filmingId" value={filmingId} />
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="kit-label mb-1">Μέλη</legend>
        {blockedIds.length > 0 && (
          <MutedNote>Όσοι έχουν κλεισμένο χρόνο σε αυτή την ώρα μπορούν να μπουν· η προσθήκη δεν μπλοκάρεται.</MutedNote>
        )}
        {candidates.map((candidate) => (
          <label key={candidate.id} className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="userId"
              value={candidate.id}
              defaultChecked={current.includes(candidate.id)}
            />
            {candidate.name}
            {blockedIds.includes(candidate.id) && <Badge tone="attention">Κλεισμένος χρόνος</Badge>}
          </label>
        ))}
      </fieldset>
    </ActionForm>
  );
}

function ApplyTemplateForm({
  filmingId,
  templates,
}: {
  filmingId: string;
  templates: readonly CrewTemplate[];
}) {
  return (
    <ActionForm
      action={applyCrewTemplate}
      submitLabel="Εφαρμογή Προτύπου"
      variant="default"
      size="sm"
    >
      <input type="hidden" name="filmingId" value={filmingId} />
      <Field label="Πρότυπο Συνεργείου">
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
