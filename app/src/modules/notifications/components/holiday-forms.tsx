"use client";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useKeptForm } from "@/lib/use-kept-form";

import {
  addHoliday,
  removeHoliday,
  toggleHoliday,
} from "../actions-automations";
import { ADD_HOLIDAY } from "../automation-labels";

// Οι φόρμες της κάρτας Αργιών (K1, #173): διακόπτης ανά επίσημη, σβήσιμο δικής σου, προσθήκη.

export function HolidayToggle({
  name,
  isOn,
  label,
}: {
  name: string;
  isOn: boolean;
  label: string;
}) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(toggleHoliday);
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid justify-items-end gap-1"
    >
      <input type="hidden" name="name" value={name} />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isOn"
          defaultChecked={isOn}
          disabled={isPending}
          aria-label={`Ενεργή: ${label}`}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        />
        Ενεργή
      </label>
      <FormMessage state={state} />
    </form>
  );
}

export function HolidayRemove({ id, label }: { id: string; label: string }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(removeHoliday);
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid justify-items-end gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="danger" disabled={isPending}>
        Σβήσιμο<span className="sr-only">: {label}</span>
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

export function HolidayAdd() {
  const { state, isPending, onSubmit, formRef } = useKeptForm(addHoliday, {
    resetOnSuccess: true,
  });
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid gap-3"
      aria-label={ADD_HOLIDAY}
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Όνομα αργίας">
          <Input name="name" maxLength={80} required />
        </Field>
        <Field label="Ημερομηνία">
          <Input name="date" type="date" required />
        </Field>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name="yearly" defaultChecked />
          Κάθε χρόνο
        </label>
      </div>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={isPending}>
          {ADD_HOLIDAY}
        </Button>
      </div>
    </form>
  );
}
