"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";

import { createItem } from "../actions-items";
import type { EquipmentCategory, EquipmentItemRow } from "../types";
import { nameErrorOf } from "./f-model";
import { useRunAction } from "./f-run";

interface F1NewItemProps {
  items: readonly EquipmentItemRow[];
  categories: readonly EquipmentCategory[];
  onDone: () => void;
}

// Νέο αντικείμενο (prototype `f1-new-item.tsx`): όνομα και Κατηγορία υποχρεωτικά, όνομα μοναδικό. Μπαίνει «διαθέσιμο».
// Η Ποσότητα (όπως η σημερινή σελίδα) γράφει N μονάδες με αρίθμηση· τα όριά της τα ελέγχει το action.
export function F1NewItem({ items, categories, onDone }: F1NewItemProps) {
  const active = categories.filter((category) => !category.isRetired);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(active[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const { isPending, last, run } = useRunAction();

  const nameError = nameErrorOf(name, items);
  const categoryError = categoryId ? null : "Διάλεξε Κατηγορία.";

  const handleSave = () => {
    setTried(true);
    if (nameError || categoryError) return;
    run(createItem, { name, categoryId, quantity, code, note }, onDone);
  };

  return (
    <div>
      <Panel label="Νέο αντικείμενο">
        <div className="e-form">
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
            Ποσότητα
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
            <span className="muted">
              Πάνω από 1: κάθε μονάδα παίρνει αρίθμηση #1, #2… και το δικό της
              κωδικό.
            </span>
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
          {last.error && (
            <p className="e-warn" role="alert">
              {last.error}
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
            <button type="button" className="button" onClick={onDone}>
              Άκυρο
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
