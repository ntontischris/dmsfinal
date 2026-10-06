"use client";

import { useState } from "react";

import type { EquipmentCategory, EquipmentItem } from "@/data/equipment";
import { Badge } from "@/screens/shared";

interface F1CategoriesProps {
  categories: readonly EquipmentCategory[];
  items: readonly EquipmentItem[];
  onChange: (categories: readonly EquipmentCategory[]) => void;
}

// Οι Κατηγορίες είναι λίστα του module: όποιος «Διαχειρίζεται απόθεμα» τις αλλάζει. Χρησιμοποιημένη αποσύρεται, δεν σβήνεται.
export function F1Categories({
  categories,
  items,
  onChange,
}: F1CategoriesProps) {
  const [name, setName] = useState("");
  const usesOf = (id: string) =>
    items.filter((item) => item.categoryId === id).length;
  const isDuplicate = categories.some(
    (category) => category.name.toLowerCase() === name.trim().toLowerCase(),
  );

  const handleAdd = () => {
    if (!name.trim() || isDuplicate) return;
    onChange([
      ...categories,
      {
        id: `cat-new-${categories.length + 1}`,
        name: name.trim(),
        isRetired: false,
      },
    ]);
    setName("");
  };
  const setRetired = (id: string, isRetired: boolean) =>
    onChange(
      categories.map((category) =>
        category.id === id ? { ...category, isRetired } : category,
      ),
    );
  const remove = (id: string) =>
    onChange(categories.filter((category) => category.id !== id));

  return (
    <section className="card">
      <div className="card-title">
        <h2>Κατηγορίες</h2>
      </div>
      <ul className="list">
        {categories.map((category) => {
          const uses = usesOf(category.id);
          return (
            <li key={category.id}>
              <div className="row">
                <span>
                  {category.name}{" "}
                  <span className="muted">· {uses} αντικείμενα</span>{" "}
                  {category.isRetired && <Badge>αποσυρμένη</Badge>}
                </span>
                {category.isRetired ? (
                  <button
                    type="button"
                    className="button"
                    onClick={() => setRetired(category.id, false)}
                  >
                    Επαναφορά
                  </button>
                ) : uses > 0 ? (
                  <button
                    type="button"
                    className="button"
                    onClick={() => setRetired(category.id, true)}
                  >
                    Απόσυρση
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button"
                    data-danger="true"
                    onClick={() => remove(category.id)}
                  >
                    Διαγραφή
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="e3-inline">
        <input
          className="input"
          aria-label="Νέα Κατηγορία"
          placeholder="Νέα Κατηγορία…"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          type="button"
          className="button"
          disabled={!name.trim() || isDuplicate}
          onClick={handleAdd}
        >
          Προσθήκη
        </button>
      </div>
      {isDuplicate && <p className="muted">Υπάρχει ήδη αυτή η Κατηγορία.</p>}
      <p className="note">
        Αποσυρμένη Κατηγορία δεν προσφέρεται σε νέο αντικείμενο· όσα την έχουν
        την κρατούν.
      </p>
    </section>
  );
}
