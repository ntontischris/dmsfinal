"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";
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
      <div className="e-info">
        Το Πρότυπο δεσμεύει με ένα κλικ πολλά αντικείμενα σε ένα Γύρισμα. Στην
        εφαρμογή ισχύουν οι κανόνες της Δέσμευσης: αντικείμενο «σε επισκευή» ή
        «αποσυρμένο» <strong>παραλείπεται</strong>, και σύγκρουση με άλλο
        Γύρισμα <strong>προειδοποιεί</strong> ή <strong>παραλείπεται</strong>,
        όπως ορίζουν οι Κανόνες γυρισμάτων. Αν σβήσεις Πρότυπο, τα Γυρίσματα που
        το χρησιμοποίησαν <strong>δεν αλλάζουν</strong>.
      </div>
      {canEdit ? (
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
      ) : (
        <p className="muted">
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
        <section className="card notice" data-kind="empty" role="status">
          <h2>Κανένα Πρότυπο εξοπλισμού</h2>
          <p className="muted">
            {canEdit
              ? "Φτιάξε το πρώτο με «Νέο Πρότυπο»."
              : "Δεν έχει φτιαχτεί ακόμα Πρότυπο."}
          </p>
        </section>
      ) : (
        templates.map((template) => (
          <Panel label={template.name} key={template.id}>
            <TemplateItems items={template.items} />
            {template.note && <p className="muted">{template.note}</p>}
            {canEdit &&
              (deleting === template.id ? (
                <div className="btn-row">
                  <span className="muted">
                    Σβήνεται το Πρότυπο· τα Γυρίσματα δεν αλλάζουν.
                  </span>
                  <button
                    type="button"
                    className="button"
                    data-danger="true"
                    disabled={remove.isPending}
                    onClick={() => handleDelete(template.id)}
                  >
                    Ναι, διαγραφή
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => setDeleting(null)}
                  >
                    Άκυρο
                  </button>
                </div>
              ) : (
                <div className="btn-row">
                  <button
                    type="button"
                    className="button"
                    onClick={() => setDraft(draftOf(template))}
                  >
                    Αλλαγή
                  </button>
                  <button
                    type="button"
                    className="button"
                    data-danger="true"
                    onClick={() => setDeleting(template.id)}
                  >
                    Διαγραφή
                  </button>
                </div>
              ))}
          </Panel>
        ))
      )}
    </>
  );
}

function TemplateItems({ items }: { items: readonly TemplateItem[] }) {
  return (
    <RowList>
      {items.map((item) => (
        <ListRow
          key={item.id}
          lead={
            <span className="part-tile" aria-hidden="true">
              {initialsOf(item.name)}
            </span>
          }
          title={item.name}
          aside={
            item.status !== "available" && (
              <Badge tone="attention">
                {STATUS_LABELS[item.status]}: θα παραλειφθεί
              </Badge>
            )
          }
        />
      ))}
    </RowList>
  );
}
