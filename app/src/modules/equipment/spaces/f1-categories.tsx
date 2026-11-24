"use client";

import { useState } from "react";

import { initialsOf } from "@/spaces/shell/avatar";

import {
  createCategory,
  deleteCategory,
  renameCategory,
  restoreCategory,
  retireCategory,
} from "../actions-categories";
import type { EquipmentCategory } from "../types";
import { FBox } from "./f-box";
import { useRunAction } from "./f-run";

interface F1CategoriesProps {
  categories: readonly EquipmentCategory[];
}

// Οι Κατηγορίες (prototype `f1-categories.tsx`): όποιος «Διαχειρίζεται απόθεμα» τις αλλάζει. Χρησιμοποιημένη αποσύρεται, δεν σβήνεται.
// Το πλήθος αντικειμένων το δίνει η βάση (itemCount). Μετονομασία όπως στη σημερινή σελίδα (μόνο αν άλλαξε το όνομα).
export function F1Categories({ categories }: F1CategoriesProps) {
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(
    null,
  );
  const { isPending, last, run } = useRunAction();
  const isDuplicate = categories.some(
    (category) => category.name.toLowerCase() === name.trim().toLowerCase(),
  );

  const handleAdd = () => {
    if (!name.trim() || isDuplicate) return;
    run(createCategory, { name: name.trim() }, () => setName(""));
  };
  const act = (action: typeof deleteCategory, categoryId: string) =>
    run(action, { categoryId });
  const handleRename = (category: EquipmentCategory) => {
    if (!renaming) return;
    run(
      renameCategory,
      { categoryId: category.id, name: renaming.name.trim() },
      () => setRenaming(null),
    );
  };

  const isRenaming = (category: EquipmentCategory) =>
    renaming?.id === category.id;

  return (
    <FBox title="Κατηγορίες" hint={`${categories.length} Κατηγορίες`}>
      <ul className="ml-list">
        {categories.map((category) => (
          <li
            key={category.id}
            className="ml-line"
            data-faded={category.isRetired || undefined}
          >
            <span className="ml-thumb" aria-hidden="true">
              {initialsOf(category.name)}
            </span>
            <div className="ml-main">
              <strong>{category.name}</strong>
              {renaming && isRenaming(category) ? (
                <span className="e3-inline ml-quick">
                  <input
                    className="input"
                    aria-label={`Νέο όνομα για ${category.name}`}
                    value={renaming.name}
                    onChange={(event) =>
                      setRenaming({ id: category.id, name: event.target.value })
                    }
                  />
                  <button
                    type="button"
                    data-primary
                    disabled={
                      isPending ||
                      !renaming.name.trim() ||
                      renaming.name.trim() === category.name
                    }
                    onClick={() => handleRename(category)}
                  >
                    Αποθήκευση
                  </button>
                  <button type="button" onClick={() => setRenaming(null)}>
                    Άκυρο
                  </button>
                </span>
              ) : (
                <small>{category.itemCount} αντικείμενα</small>
              )}
            </div>
            {category.isRetired ? (
              <span className="ml-tag">αποσυρμένη</span>
            ) : (
              <span />
            )}
            <span className="ml-quick">
              <button
                type="button"
                aria-expanded={isRenaming(category)}
                disabled={isPending}
                onClick={() =>
                  setRenaming(
                    isRenaming(category)
                      ? null
                      : { id: category.id, name: category.name },
                  )
                }
              >
                Μετονομασία
              </button>
              {category.isRetired ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => act(restoreCategory, category.id)}
                >
                  Επαναφορά
                </button>
              ) : category.itemCount > 0 ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => act(retireCategory, category.id)}
                >
                  Απόσυρση
                </button>
              ) : (
                <button
                  type="button"
                  data-danger
                  disabled={isPending}
                  onClick={() => act(deleteCategory, category.id)}
                >
                  Διαγραφή
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="e3-inline ml-actions">
        <input
          className="input"
          aria-label="Νέα Κατηγορία"
          placeholder="Νέα Κατηγορία…"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          type="button"
          disabled={!name.trim() || isDuplicate || isPending}
          onClick={handleAdd}
        >
          Προσθήκη
        </button>
      </div>
      {isDuplicate && <p className="f-note">Υπάρχει ήδη αυτή η Κατηγορία.</p>}
      {last.error && (
        <p className="e-warn" role="alert">
          {last.error}
        </p>
      )}
      <p className="f-note">
        Αποσυρμένη Κατηγορία δεν προσφέρεται σε νέο αντικείμενο· όσα την έχουν
        την κρατούν.
      </p>
    </FBox>
  );
}
