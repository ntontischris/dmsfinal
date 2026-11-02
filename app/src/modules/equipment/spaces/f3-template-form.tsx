"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";

import { STATUS_LABELS } from "../labels";
import type { EquipmentItemRow } from "../types";
import { pickerGroupsOf } from "./f-model";

export interface Draft {
  id: string | null;
  name: string;
  note: string;
  itemIds: readonly string[];
}

export const EMPTY_DRAFT: Draft = { id: null, name: "", note: "", itemIds: [] };

interface TemplateFormProps {
  draft: Draft;
  items: readonly EquipmentItemRow[];
  isPending: boolean;
  error: string | undefined;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
}

// Η φόρμα Προτύπου (prototype `f3-templates.tsx` › TemplateForm): όνομα, αντικείμενα ανά Κατηγορία (τουλάχιστον ένα), σημείωση.
export function TemplateForm({
  draft,
  items,
  isPending,
  error,
  onChange,
  onSave,
  onCancel,
}: TemplateFormProps) {
  const [tried, setTried] = useState(false);
  const nameError = !draft.name.trim();
  const peopleError = draft.itemIds.length === 0;
  const handleToggle = (id: string) =>
    onChange({
      ...draft,
      itemIds: draft.itemIds.includes(id)
        ? draft.itemIds.filter((item) => item !== id)
        : [...draft.itemIds, id],
    });
  const handleSave = () => {
    setTried(true);
    if (!nameError && !peopleError) onSave();
  };
  return (
    <div>
      <Panel label={draft.id ? "Αλλαγή Προτύπου" : "Νέο Πρότυπο εξοπλισμού"}>
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
            Αντικείμενα (τουλάχιστον ένα)
            {pickerGroupsOf(items, draft.itemIds).map((group) => (
              <fieldset key={group.categoryId} className="f-group">
                <legend>{group.categoryName}</legend>
                <div className="e-checks">
                  {group.items.map((item) => (
                    <label key={item.id}>
                      <input
                        type="checkbox"
                        checked={draft.itemIds.includes(item.id)}
                        onChange={() => handleToggle(item.id)}
                      />
                      {item.name}
                      {item.status !== "available" &&
                        ` (${STATUS_LABELS[item.status]})`}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
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
              {peopleError && "Διάλεξε τουλάχιστον ένα αντικείμενο."}
            </p>
          )}
          {error && (
            <p className="e-warn" role="alert">
              {error}
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
