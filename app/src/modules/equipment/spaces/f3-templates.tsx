"use client";

import { useState } from "react";

import { initialsOf } from "@/spaces/shell/avatar";

import {
  createTemplate,
  deleteTemplate,
  updateTemplate,
} from "../actions-templates";
import { STATUS_LABELS } from "../labels";
import type {
  EquipmentItemRow,
  EquipmentTemplate,
  TemplateItem,
} from "../types";
import { FBox } from "./f-box";
import { useRunAction } from "./f-run";
import { EMPTY_DRAFT, TemplateForm, type Draft } from "./f3-template-form";

interface F3TemplatesProps {
  templates: readonly EquipmentTemplate[];
  items: readonly EquipmentItemRow[];
  canEdit: boolean;
}

const draftOf = (template: EquipmentTemplate): Draft => ({
  id: template.id,
  name: template.name,
  note: template.note ?? "",
  itemIds: template.items.map((item) => item.id),
});

// Πρότυπα εξοπλισμού (prototype `f3-templates.tsx`): γρήγορη Δέσμευση στο Γύρισμα (E3). Κοινά για όλη την ομάδα.
// Τα αλλάζει όποιος δεσμεύει εξοπλισμό ή διαχειρίζεται απόθεμα· οι υπόλοιποι τα βλέπουν.
export function F3Templates({ templates, items, canEdit }: F3TemplatesProps) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const save = useRunAction();
  const remove = useRunAction();

  const handleSave = () => {
    if (!draft) return;
    const fields = {
      name: draft.name.trim(),
      note: draft.note.trim(),
      itemIds: draft.itemIds,
    };
    if (draft.id)
      save.run(updateTemplate, { ...fields, templateId: draft.id }, () =>
        setDraft(null),
      );
    else save.run(createTemplate, fields, () => setDraft(null));
  };
  const handleDelete = (id: string) =>
    remove.run(deleteTemplate, { templateId: id }, () => setDeleting(null));

  return (
    <>
      <div className="ml-head">
        <p>
          Το Πρότυπο δεσμεύει με ένα κλικ πολλά αντικείμενα σε ένα Γύρισμα. Στην
          εφαρμογή ισχύουν οι κανόνες της Δέσμευσης: αντικείμενο «σε επισκευή» ή
          «αποσυρμένο» <strong>παραλείπεται</strong>, και σύγκρουση με άλλο
          Γύρισμα <strong>προειδοποιεί</strong> ή <strong>παραλείπεται</strong>,
          όπως ορίζουν οι Κανόνες γυρισμάτων. Αν σβήσεις Πρότυπο, τα Γυρίσματα
          που το χρησιμοποίησαν <strong>δεν αλλάζουν</strong>.
        </p>
        {canEdit && (
          <button
            type="button"
            className="ml-cta"
            onClick={() => setDraft(EMPTY_DRAFT)}
          >
            Νέο Πρότυπο
          </button>
        )}
      </div>
      {!canEdit && (
        <p className="f-note">
          Μόνο ανάγνωση: τα Πρότυπα τα φτιάχνει όποιος δεσμεύει εξοπλισμό ή
          διαχειρίζεται απόθεμα.
        </p>
      )}
      {draft && (
        <TemplateForm
          draft={draft}
          items={items}
          isPending={save.isPending}
          error={save.last.error}
          onChange={setDraft}
          onSave={handleSave}
          onCancel={() => setDraft(null)}
        />
      )}
      {remove.last.error && (
        <p className="e-warn" role="alert">
          {remove.last.error}
        </p>
      )}
      {templates.length === 0 ? (
        <p className="ml-empty" role="status">
          <strong>Κανένα Πρότυπο εξοπλισμού.</strong>{" "}
          {canEdit
            ? "Φτιάξε το πρώτο με «Νέο Πρότυπο»."
            : "Δεν έχει φτιαχτεί ακόμα Πρότυπο."}
        </p>
      ) : (
        <div className="ml-stack">
          {templates.map((template) => (
            <FBox
              key={template.id}
              title={template.name}
              hint={`${template.items.length} αντικείμενα`}
            >
              <TemplateItems items={template.items} />
              {template.note && <p className="f-note">{template.note}</p>}
              {canEdit &&
                (deleting === template.id ? (
                  <div className="ml-actions">
                    <span className="f-note">
                      Σβήνεται το Πρότυπο· τα Γυρίσματα δεν αλλάζουν.
                    </span>
                    <button type="button" onClick={() => setDeleting(null)}>
                      Άκυρο
                    </button>
                    <button
                      type="button"
                      data-danger
                      disabled={remove.isPending}
                      onClick={() => handleDelete(template.id)}
                    >
                      Ναι, διαγραφή
                    </button>
                  </div>
                ) : (
                  <div className="ml-actions">
                    <button
                      type="button"
                      onClick={() => setDraft(draftOf(template))}
                    >
                      Αλλαγή
                    </button>
                    <button
                      type="button"
                      data-danger
                      onClick={() => setDeleting(template.id)}
                    >
                      Διαγραφή
                    </button>
                  </div>
                ))}
            </FBox>
          ))}
        </div>
      )}
    </>
  );
}

function TemplateItems({ items }: { items: readonly TemplateItem[] }) {
  return (
    <ul className="ml-list">
      {items.map((item) => (
        <li key={item.id} className="ml-line">
          <span className="ml-thumb" aria-hidden="true">
            {initialsOf(item.name)}
          </span>
          <div className="ml-main">
            <strong>{item.name}</strong>
          </div>
          {item.status !== "available" ? (
            <span className="ml-tag">
              {STATUS_LABELS[item.status]}: θα παραλειφθεί
            </span>
          ) : (
            <span />
          )}
        </li>
      ))}
    </ul>
  );
}
