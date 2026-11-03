"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import {
  createCategory,
  deleteCategory,
  renameCategory,
  restoreCategory,
  retireCategory,
} from "../actions-categories";
import type { EquipmentCategory } from "../types";
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
              sub={
                renaming?.id === category.id ? (
                  <span className="e3-inline">
                    <input
                      className="input"
                      aria-label={`Νέο όνομα για ${category.name}`}
                      value={renaming.name}
                      onChange={(event) =>
                        setRenaming({
                          id: category.id,
                          name: event.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      className="button"
                      data-primary="true"
                      disabled={
                        isPending ||
                        !renaming.name.trim() ||
                        renaming.name.trim() === category.name
                      }
                      onClick={() => handleRename(category)}
                    >
                      Αποθήκευση
                    </button>
                    <button
                      type="button"
                      className="button"
                      onClick={() => setRenaming(null)}
                    >
                      Άκυρο
                    </button>
                  </span>
                ) : (
                  `· ${uses} αντικείμενα`
                )
              }
              aside={
                <>
                  <button
                    type="button"
                    className="button"
                    aria-expanded={renaming?.id === category.id}
                    disabled={isPending}
                    onClick={() =>
                      setRenaming(
                        renaming?.id === category.id
                          ? null
                          : { id: category.id, name: category.name },
                      )
                    }
                  >
                    Μετονομασία
                  </button>
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
