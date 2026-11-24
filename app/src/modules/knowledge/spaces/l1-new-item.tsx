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
      <div className="ml-quick">
        {(["article", "file"] as const).map((option) => (
          <button
            key={option}
            type="button"
            data-primary={
              kind === null && option === "article" ? "true" : undefined
            }
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
          className="ml-fields"
        >
          <input type="hidden" name="kind" value={kind} />
          <label className="ml-field">
            <span>Ενότητα</span>
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
          <label className="ml-field">
            <span>Τίτλος</span>
            <input className="input" name="title" maxLength={160} required />
          </label>
        </SpacesForm>
      )}
    </>
  );
}
