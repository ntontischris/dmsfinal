"use client";

import { useState } from "react";

import type { EquipmentCategory, EquipmentItem } from "@/data/equipment";
import { NOW } from "@/data/filming";

interface F1NewItemProps {
  items: readonly EquipmentItem[];
  categories: readonly EquipmentCategory[];
  onSave: (item: EquipmentItem) => void;
  onCancel: () => void;
}

const sameName = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

// Νέο αντικείμενο: όνομα και Κατηγορία υποχρεωτικά, όνομα μοναδικό. Μπαίνει «διαθέσιμο».
export function F1NewItem({
  items,
  categories,
  onSave,
  onCancel,
}: F1NewItemProps) {
  const active = categories.filter((category) => !category.isRetired);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(active[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);

  const nameError = !name.trim()
    ? "Γράψε όνομα."
    : items.some((item) => sameName(item.name, name))
      ? "Υπάρχει ήδη αντικείμενο με αυτό το όνομα. Αν είναι δεύτερο ίδιο, βάλε αριθμό (π.χ. «Gimbal 2»)."
      : null;
  const categoryError = categoryId ? null : "Διάλεξε Κατηγορία.";

  const handleSave = () => {
    setTried(true);
    if (nameError || categoryError) return;
    onSave({
      id: `eq-new-${items.length + 1}`,
      name: name.trim(),
      categoryId,
      code: code.trim() || undefined,
      note: note.trim() || undefined,
      status: "διαθέσιμο",
      history: [
        {
          when: NOW.slice(0, 10),
          by: "εσύ",
          text: "Προστέθηκε στο μητρώο.",
        },
      ],
    });
  };

  return (
    <section className="card e-form">
      <h2>Νέο αντικείμενο</h2>
      <label>
        Όνομα (υποχρεωτικό)
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        Κατηγορία (υποχρεωτική)
        <select
          className="select"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          {active.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Κωδικός ή σειριακός
        <input
          className="input"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </label>
      <label>
        Σημείωση (τι περιέχει, πού φυλάγεται)
        <input
          className="input"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <p className="muted">
        Ένα αντικείμενο είναι ό,τι δεσμεύεται ολόκληρο. Ένα σετ (π.χ. δύο
        ασύρματα μικρόφωνα σε μία θήκη) είναι ένα αντικείμενο.
      </p>
      {tried && (nameError || categoryError) && (
        <p className="e-warn" role="alert">
          {nameError} {categoryError}
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
