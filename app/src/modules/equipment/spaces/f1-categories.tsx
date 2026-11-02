"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import {
  createCategory,
  deleteCategory,
  restoreCategory,
  retireCategory,
} from "../actions-categories";
import type { EquipmentCategory } from "../types";
import { useRunAction } from "./f-run";

interface F1CategoriesProps {
  categories: readonly EquipmentCategory[];
}

// Οι Κατηγορίες (prototype `f1-categories.tsx`): όποιος «Διαχειρίζεται απόθεμα» τις αλλάζει. Χρησιμοποιημένη αποσύρεται, δεν σβήνεται.
// Το πλήθος αντικειμένων το δίνει η βάση (itemCount).
export function F1Categories({ categories }: F1CategoriesProps) {
  const [name, setName] = useState("");
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

  return (
    <Panel label="Κατηγορίες">
      <RowList>
        {categories.map((category) => {
          const uses = category.itemCount;
          return (
            <ListRow
              key={category.id}
              isFaded={category.isRetired}
              title={category.name}
              sub={`· ${uses} αντικείμενα`}
              aside={
                <>
                  {category.isRetired && <Badge tone="faded">αποσυρμένη</Badge>}
                  {category.isRetired ? (
                    <button
                      type="button"
                      className="button"
                      disabled={isPending}
                      onClick={() => act(restoreCategory, category.id)}
                    >
                      Επαναφορά
                    </button>
                  ) : uses > 0 ? (
                    <button
                      type="button"
                      className="button"
                      disabled={isPending}
                      onClick={() => act(retireCategory, category.id)}
                    >
                      Απόσυρση
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button"
                      data-danger="true"
                      disabled={isPending}
                      onClick={() => act(deleteCategory, category.id)}
                    >
                      Διαγραφή
                    </button>
                  )}
                </>
              }
            />
          );
        })}
      </RowList>
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
          disabled={!name.trim() || isDuplicate || isPending}
          onClick={handleAdd}
        >
          Προσθήκη
        </button>
      </div>
      {isDuplicate && <p className="muted">Υπάρχει ήδη αυτή η Κατηγορία.</p>}
      {last.error && (
        <p className="e-warn" role="alert">
          {last.error}
        </p>
      )}
      <p className="note">
        Αποσυρμένη Κατηγορία δεν προσφέρεται σε νέο αντικείμενο· όσα την έχουν
        την κρατούν.
      </p>
    </Panel>
  );
}
