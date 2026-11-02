"use client";

import { useState } from "react";

import { createItem } from "../actions-items";
import type { ItemKind } from "../view-schema";
import { SpacesForm } from "./k-form";

interface NewItemProps {
  sections: readonly { id: string; name: string }[];
}

const KIND_TITLE: Readonly<Record<ItemKind, string>> = {
  article: "Νέο Άρθρο",
  file: "Ανέβασμα Αρχείου",
};

// «Νέο Άρθρο» / «Ανέβασμα Αρχείου» του prototype: ανοίγουν τη φόρμα (Ενότητα, τίτλος). Γράφεται πρόχειρο και ανοίγει ο
// επεξεργαστής του, όπου ανεβαίνει και το Αρχείο.
export function NewItem({ sections }: NewItemProps) {
  const [kind, setKind] = useState<ItemKind | null>(null);
  return (
    <>
      <div className="btn-row l1-pad">
        {(["article", "file"] as const).map((option) => (
          <button
            key={option}
            className="button"
            type="button"
            data-primary={option === "article" ? "true" : undefined}
            aria-pressed={kind === option}
            onClick={() => setKind(kind === option ? null : option)}
          >
            {KIND_TITLE[option]}
          </button>
        ))}
      </div>
      {kind && (
        <SpacesForm
          key={kind}
          action={createItem}
          submitLabel="Δημιουργία"
          pendingLabel="Δημιουργία…"
          className="l1-form l1-pad"
        >
          <input type="hidden" name="kind" value={kind} />
          <label>
            Ενότητα
            <select
              className="input"
              name="sectionId"
              defaultValue={sections[0]?.id ?? ""}
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Τίτλος
            <input className="input" name="title" maxLength={160} required />
          </label>
        </SpacesForm>
      )}
    </>
  );
}
