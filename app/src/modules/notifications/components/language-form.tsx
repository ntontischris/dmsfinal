"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";

import { saveLanguage } from "../actions-language";
import {
  LANGUAGE_HINT,
  LANGUAGE_LABEL,
  LANGUAGE_OPTIONS,
  LANGUAGE_SAVE,
  LANGUAGE_TITLE,
} from "../labels";
import type { EmailLanguage } from "../queries";

// «Γλώσσα των email» για τον Χρήστη πελάτη (#171, Α8). Το κουμπί φαίνεται μόνο όταν άλλαξε η επιλογή.
export function LanguageForm({ current }: { current: EmailLanguage }) {
  const [state, action, isPending] = useActionState(
    saveLanguage,
    INITIAL_FORM_STATE,
  );
  const [selected, setSelected] = useState<string>(current);
  return (
    <section className="grid gap-3" aria-labelledby="language-title">
      <h2 id="language-title" className="m-0 text-base font-semibold">
        {LANGUAGE_TITLE}
      </h2>
      <form action={action} className="grid gap-3">
        <Field label={LANGUAGE_LABEL} hint={LANGUAGE_HINT}>
          <Select
            name="language"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        {selected !== current && (
          <div>
            <Button type="submit" disabled={isPending}>
              {LANGUAGE_SAVE}
            </Button>
          </div>
        )}
        <FormMessage state={state} />
      </form>
    </section>
  );
}
