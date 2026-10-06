"use client";

import { useState } from "react";

import {
  EQUIPMENT,
  EQUIPMENT_CATEGORIES,
  equipmentName,
  findEquipment,
  type EquipmentTemplate,
} from "@/data/equipment";
import { Badge } from "@/screens/shared";

import "./e5.css";

interface Draft {
  id: string | null;
  name: string;
  note: string;
  itemIds: readonly string[];
}

const EMPTY_DRAFT: Draft = { id: null, name: "", note: "", itemIds: [] };

function TemplateForm({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
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
    <section className="card e-form">
      <h2>{draft.id ? "Αλλαγή Προτύπου" : "Νέο Πρότυπο εξοπλισμού"}</h2>
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
        {EQUIPMENT_CATEGORIES.map((category) => {
          const items = EQUIPMENT.filter(
            (item) =>
              item.categoryId === category.id &&
              (item.status !== "αποσυρμένο" || draft.itemIds.includes(item.id)),
          );
          if (items.length === 0) return null;
          return (
            <fieldset key={category.id} className="f-group">
              <legend>{category.name}</legend>
              <div className="e-checks">
                {items.map((item) => (
                  <label key={item.id}>
                    <input
                      type="checkbox"
                      checked={draft.itemIds.includes(item.id)}
                      onChange={() => handleToggle(item.id)}
                    />
                    {item.name}
                    {item.status !== "διαθέσιμο" && ` (${item.status})`}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
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
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary="true"
          onClick={handleSave}
        >
          Αποθήκευση
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Άκυρο
        </button>
      </div>
    </section>
  );
}

// Πρότυπα εξοπλισμού: γρήγορη Δέσμευση στο Γύρισμα (E3). Κοινά για όλη την ομάδα. Όλα στη μνήμη.
export function F3Templates({
  initial,
}: {
  initial: readonly EquipmentTemplate[];
}) {
  const [templates, setTemplates] =
    useState<readonly EquipmentTemplate[]>(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleSave = () => {
    if (!draft) return;
    const clean = {
      name: draft.name.trim(),
      note: draft.note.trim(),
      itemIds: draft.itemIds,
    };
    setTemplates((current) =>
      draft.id
        ? current.map((item) =>
            item.id === draft.id ? { ...item, ...clean } : item,
          )
        : [
            ...current,
            { ...clean, id: `et-new-${current.length + 1}`, uses: 0 },
          ],
    );
    setDraft(null);
  };
  const handleDelete = (id: string) => {
    setTemplates((current) => current.filter((item) => item.id !== id));
    setDeleting(null);
  };

  return (
    <>
      <div className="e-info">
        Το Πρότυπο δεσμεύει με ένα κλικ πολλά αντικείμενα σε ένα Γύρισμα (E3).
        Στην εφαρμογή ισχύουν οι κανόνες της Δέσμευσης: αντικείμενο «σε
        επισκευή» ή «αποσυρμένο» <strong>παραλείπεται</strong>, και σύγκρουση με
        άλλο Γύρισμα <strong>προειδοποιεί</strong> ή{" "}
        <strong>παραλείπεται</strong>, όπως ορίζουν οι Κανόνες γυρισμάτων. Αν
        σβήσεις Πρότυπο, τα Γυρίσματα που το χρησιμοποίησαν{" "}
        <strong>δεν αλλάζουν</strong>.
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
      {draft && (
        <TemplateForm
          draft={draft}
          onChange={setDraft}
          onSave={handleSave}
          onCancel={() => setDraft(null)}
        />
      )}
      {templates.length === 0 ? (
        <section className="card notice" data-kind="empty" role="status">
          <h2>Κανένα Πρότυπο εξοπλισμού</h2>
          <p className="muted">Φτιάξε το πρώτο με «Νέο Πρότυπο».</p>
        </section>
      ) : (
        templates.map((template) => (
          <section className="card" key={template.id}>
            <div className="card-title">
              <h2>{template.name}</h2>
              <span className="badge">{template.uses} χρήσεις</span>
            </div>
            <TemplateItems itemIds={template.itemIds} />
            {template.note && <p className="muted">{template.note}</p>}
            {deleting === template.id ? (
              <div className="btn-row">
                <span className="muted">
                  Σβήνεται το Πρότυπο· τα Γυρίσματα δεν αλλάζουν.
                </span>
                <button
                  type="button"
                  className="button"
                  data-danger="true"
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
                  onClick={() => setDraft({ ...template })}
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
            )}
          </section>
        ))
      )}
    </>
  );
}

function TemplateItems({ itemIds }: { itemIds: readonly string[] }) {
  return (
    <p>
      {itemIds.map((id, index) => {
        const status = findEquipment(id)?.status;
        return (
          <span key={id}>
            {index > 0 && ", "}
            {equipmentName(id)}
            {status && status !== "διαθέσιμο" && (
              <>
                {" "}
                <Badge tone="attention">{status}: θα παραλειφθεί</Badge>
              </>
            )}
          </span>
        );
      })}
    </p>
  );
}
