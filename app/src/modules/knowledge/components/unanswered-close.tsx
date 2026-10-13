import Link from "next/link";

import { Field, Select } from "@/components/ui/field";

import { coverUnanswered, ignoreUnanswered } from "../assistant-actions";
import { IGNORE_REASON_LABEL } from "../assistant-helpers";
import {
  PERSONAL_DATA_NOTE,
  PUBLIC_NOTE,
  REASK_NOTE,
} from "../assistant-labels";
import type { CoverOption } from "../assistant-queries";
import { IGNORE_REASONS, type UnansweredRow } from "../assistant-view-schema";
import { MANAGE_PATH } from "../helpers";
import { ActionForm } from "./action-form";

// Κλείσιμο μιας ανοιχτής ερώτησης (Λεπτομέρειες #1): «Καλύφθηκε από…» δημοσιευμένο στοιχείο, ή «Αγνόησε» με λόγο.

interface CloseProps {
  item: UnansweredRow;
  options: readonly CoverOption[];
}

const optionLabel = (option: CoverOption, isPublicQuestion: boolean): string =>
  isPublicQuestion && !option.isPublic
    ? `${option.title} (όχι δημόσιο)`
    : option.title;

function CoverForm({ item, options }: CloseProps) {
  const isPublicQuestion = item.audience === "public";
  return (
    <div className="grid content-start gap-2">
      <h3 className="m-0 text-sm font-semibold">1. Καλύφθηκε από…</h3>
      {options.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">
          Δεν υπάρχει ακόμα δημοσιευμένο στοιχείο.
        </p>
      ) : (
        <ActionForm
          action={coverUnanswered}
          submitLabel="Καλύφθηκε"
          pendingLabel="Κλείσιμο…"
        >
          <input type="hidden" name="id" value={item.id} />
          <Field label="Στοιχείο της Γνώσης">
            <Select name="itemId" defaultValue="" required>
              <option value="" disabled>
                Διάλεξε δημοσιευμένο στοιχείο
              </option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {optionLabel(option, isPublicQuestion)}
                </option>
              ))}
            </Select>
          </Field>
        </ActionForm>
      )}
      <Link className="text-sm" href={MANAGE_PATH}>
        Γράψε νέο στοιχείο (L1)
      </Link>
      <p className="m-0 text-sm text-muted-foreground">{REASK_NOTE}</p>
      {isPublicQuestion && (
        <p className="m-0 text-sm text-muted-foreground">{PUBLIC_NOTE}</p>
      )}
    </div>
  );
}

function IgnoreForm({ item }: { item: UnansweredRow }) {
  return (
    <div className="grid content-start gap-2">
      <h3 className="m-0 text-sm font-semibold">2. Αγνόησε</h3>
      <ActionForm
        action={ignoreUnanswered}
        submitLabel="Αγνόησε"
        pendingLabel="Κλείσιμο…"
        submitVariant="danger"
      >
        <input type="hidden" name="id" value={item.id} />
        <fieldset className="m-0 grid gap-1 border-0 p-0">
          <legend className="kit-label mb-1">Λόγος</legend>
          {IGNORE_REASONS.map((reason) => (
            <label key={reason} className="flex items-center gap-2 text-sm">
              <input type="radio" name="reason" value={reason} required />
              {IGNORE_REASON_LABEL[reason]}
            </label>
          ))}
        </fieldset>
      </ActionForm>
      <p className="m-0 text-sm text-muted-foreground">{PERSONAL_DATA_NOTE}</p>
    </div>
  );
}

export function UnansweredClose({ item, options }: CloseProps) {
  return (
    <details className="rounded-md border bg-background">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
        Κλείσε
      </summary>
      <div className="grid gap-6 border-t p-3 md:grid-cols-2">
        <CoverForm item={item} options={options} />
        <IgnoreForm item={item} />
      </div>
    </details>
  );
}
