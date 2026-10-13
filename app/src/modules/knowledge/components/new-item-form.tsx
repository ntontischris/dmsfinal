"use client";

import { Field, Input, Select } from "@/components/ui/field";

import { createItem } from "../actions-items";
import { ActionForm } from "./action-form";

// Νέο στοιχείο: Ενότητα, είδος (Άρθρο ή Αρχείο) και τίτλος. Γράφεται ως πρόχειρο και ανοίγει ο επεξεργαστής.

interface NewItemFormProps {
  sections: readonly { id: string; name: string }[];
}

export function NewItemForm({ sections }: NewItemFormProps) {
  return (
    <ActionForm
      action={createItem}
      submitLabel="Δημιουργία"
      pendingLabel="Δημιουργία…"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Είδος">
          <Select name="kind" defaultValue="article">
            <option value="article">Άρθρο</option>
            <option value="file">Αρχείο</option>
          </Select>
        </Field>
        <Field label="Ενότητα">
          <Select name="sectionId" defaultValue={sections[0]?.id ?? ""}>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Τίτλος">
          <Input name="title" maxLength={160} required />
        </Field>
      </div>
    </ActionForm>
  );
}
