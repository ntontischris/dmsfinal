"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";

import { deleteCrewTemplate, saveCrewTemplate } from "../actions-templates";
import type { CrewTemplate, NamedRef } from "../types";
import { useRun } from "./e3-run";
import { LastDone } from "./e3-ui";

// Πρότυπα συνεργείου (prototype `screens/e7-templates.tsx`): γρήγορος τρόπος να γεμίσει το Συνεργείο στο E3.
// Αποθήκευση και διαγραφή πάνε στα πραγματικά actions· η λίστα φρεσκάρεται από τη βάση.

interface Draft {
  id: string | null;
  name: string;
  note: string;
  personIds: readonly string[];
}

const EMPTY_DRAFT: Draft = { id: null, name: "", note: "", personIds: [] };

const draftOf = (template: CrewTemplate): Draft => ({
  id: template.id,
  name: template.name,
  note: template.note ?? "",
  personIds: template.members.map((member) => member.id),
});

function TemplateForm({
  draft,
  people,
  isPending,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Draft;
  people: readonly NamedRef[];
  isPending: boolean;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [tried, setTried] = useState(false);
  const nameError = !draft.name.trim();
  const peopleError = draft.personIds.length === 0;
  const handleToggle = (id: string) =>
    onChange({
      ...draft,
      personIds: draft.personIds.includes(id)
        ? draft.personIds.filter((item) => item !== id)
        : [...draft.personIds, id],
    });
  const handleSave = () => {
    setTried(true);
    if (!nameError && !peopleError) onSave();
  };
  return (
    <div>
      <Panel label={draft.id ? "Αλλαγή Προτύπου" : "Νέο Πρότυπο συνεργείου"}>
        <div className="e-form">
          <label>
            Όνομα (υποχρεωτικό)
            <input
              className="input"
              value={draft.name}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
            />
          </label>
          <div className="e-field">
            Άτομα (τουλάχιστον ένα)
            <div className="e-checks">
              {people.map((person) => (
                <label key={person.id}>
                  <input
                    type="checkbox"
                    checked={draft.personIds.includes(person.id)}
                    onChange={() => handleToggle(person.id)}
                  />
                  {person.name}
                </label>
              ))}
            </div>
          </div>
          <label>
            Σημείωση
            <input
              className="input"
              value={draft.note}
              onChange={(e) => onChange({ ...draft, note: e.target.value })}
            />
          </label>
          {tried && (nameError || peopleError) && (
            <p className="e-warn" role="alert">
              {nameError && "Γράψε όνομα. "}
              {peopleError && "Διάλεξε τουλάχιστον ένα άτομο."}
            </p>
          )}
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-primary="true"
              disabled={isPending}
              onClick={handleSave}
            >
              Αποθήκευση
            </button>
            <button type="button" className="button" onClick={onCancel}>
              Άκυρο
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function TemplatePanel({
  template,
  isDeleting,
  isPending,
  onEdit,
  onAskDelete,
  onDelete,
  onCancelDelete,
}: {
  template: CrewTemplate;
  isDeleting: boolean;
  isPending: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
}) {
  return (
    <Panel label={template.name}>
      <RowList>
        {template.members.map((member) => (
          <ListRow
            key={member.id}
            lead={<Avatar name={member.name} size={32} />}
            title={member.name}
          />
        ))}
      </RowList>
      {template.note && <p className="muted">{template.note}</p>}
      {isDeleting ? (
        <div className="btn-row">
          <span className="muted">
            Σβήνεται το Πρότυπο· τα Γυρίσματα δεν αλλάζουν.
          </span>
          <button
            type="button"
            className="button"
            data-danger="true"
            disabled={isPending}
            onClick={onDelete}
          >
            Ναι, διαγραφή
          </button>
          <button type="button" className="button" onClick={onCancelDelete}>
            Άκυρο
          </button>
        </div>
      ) : (
        <div className="btn-row">
          <button type="button" className="button" onClick={onEdit}>
            Αλλαγή
          </button>
          <button
            type="button"
            className="button"
            data-danger="true"
            onClick={onAskDelete}
          >
            Διαγραφή
          </button>
        </div>
      )}
    </Panel>
  );
}

export function E7Templates({
  templates,
  people,
}: {
  templates: readonly CrewTemplate[];
  people: readonly NamedRef[];
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { run, isPending, result } = useRun();

  const handleSave = () => {
    if (!draft) return;
    run(
      saveCrewTemplate,
      {
        templateId: draft.id ?? "",
        name: draft.name.trim(),
        note: draft.note.trim(),
        userId: draft.personIds,
      },
      () => setDraft(null),
    );
  };
  const handleDelete = (id: string) =>
    run(deleteCrewTemplate, { templateId: id }, () => setDeleting(null));

  return (
    <>
      <div className="e-info">
        Το Πρότυπο γεμίζει γρήγορα το Συνεργείο στο Γύρισμα. Όταν το εφαρμόζεις,
        ο έλεγχος διαθεσιμότητας τρέχει κανονικά: Κλεισμένος χρόνος ενός ατόμου{" "}
        <strong>προειδοποιεί</strong>, Γύρισμα που επικαλύπτεται την ίδια ώρα{" "}
        <strong>μπλοκάρει</strong>. Αν σβήσεις Πρότυπο που χρησιμοποιήθηκε, τα
        Γυρίσματα που το είχαν <strong>δεν αλλάζουν</strong>.
      </div>
      <div className="btn-row" style={{ marginBottom: "var(--space-4)" }}>
        <button
          type="button"
          className="button"
          data-primary="true"
          onClick={() => setDraft(EMPTY_DRAFT)}
        >
          Νέο Πρότυπο
        </button>
      </div>
      <LastDone log={result ? [result.text] : []} tone={result?.tone ?? "ok"} />
      {draft && (
        <TemplateForm
          draft={draft}
          people={people}
          isPending={isPending}
          onChange={setDraft}
          onSave={handleSave}
          onCancel={() => setDraft(null)}
        />
      )}
      {templates.length === 0 ? (
        <section className="card notice" data-kind="empty" role="status">
          <h2>Κανένα Πρότυπο συνεργείου</h2>
          <p className="muted">Φτιάξε το πρώτο με «Νέο Πρότυπο».</p>
        </section>
      ) : (
        templates.map((template) => (
          <TemplatePanel
            key={template.id}
            template={template}
            isDeleting={deleting === template.id}
            isPending={isPending}
            onEdit={() => setDraft(draftOf(template))}
            onAskDelete={() => setDeleting(template.id)}
            onDelete={() => handleDelete(template.id)}
            onCancelDelete={() => setDeleting(null)}
          />
        ))
      )}
    </>
  );
}
