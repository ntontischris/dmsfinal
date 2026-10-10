"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useFormChanged } from "@/lib/use-form-changed";
import { useKeptForm } from "@/lib/use-kept-form";

import { saveBlockedTime } from "../actions-blocked";
import type { BlockedFormFields } from "../blocked-form";
import type { CalendarMember } from "../types";

// Η φόρμα του Κλεισμένου χρόνου (A6). Η μορφοποίηση και η μετατροπή σε στιγμές γίνονται στον server.

export interface BlockedTimeValues extends BlockedFormFields {
  userId: string;
  title: string;
}

interface BlockedTimeFormProps {
  id: string | null;
  values: BlockedTimeValues;
  people: readonly CalendarMember[];
  personName: string | null;
}

const TITLE_NOTE = "Φαίνεται μόνο σε εσένα και σε όσους κλείνουν χρόνο άλλων.";

function PersonField({
  people,
  personName,
  userId,
}: Pick<BlockedTimeFormProps, "people" | "personName"> & { userId: string }) {
  if (people.length === 0) {
    return personName ? (
      <p className="m-0 text-sm">Άτομο: {personName}</p>
    ) : null;
  }
  return (
    <Field label="Άτομο">
      <Select name="userId" defaultValue={userId}>
        {people.map((person) => (
          <option key={person.userId} value={person.userId}>
            {person.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function TimeFields({ values }: { values: BlockedTimeValues }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Από">
        <Input type="time" name="from" required defaultValue={values.from} />
      </Field>
      <Field label="Έως">
        <Input type="time" name="to" required defaultValue={values.to} />
      </Field>
    </div>
  );
}

export function BlockedTimeForm({
  id,
  values,
  people,
  personName,
}: BlockedTimeFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(saveBlockedTime);
  const isChanged = useFormChanged(formRef, state.notice ? state : undefined);
  const [allDay, setAllDay] = useState(values.allDay);
  const showSubmit = id === null || isChanged;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid max-w-xl gap-4">
      {id && <input type="hidden" name="id" value={id} />}
      <PersonField
        people={people}
        personName={personName}
        userId={values.userId}
      />
      <Field label="Μέρα">
        <Input type="date" name="day" required defaultValue={values.day} />
      </Field>
      <div className="flex items-center gap-2 text-sm">
        <input
          id="blocked-all-day"
          type="checkbox"
          name="allDay"
          checked={allDay}
          onChange={(event) => setAllDay(event.target.checked)}
        />
        <label htmlFor="blocked-all-day">Όλη μέρα</label>
      </div>
      {allDay ? (
        <Field label="Έως μέρα (προαιρετικό)">
          <Input
            type="date"
            name="untilDay"
            defaultValue={values.untilDay ?? ""}
          />
        </Field>
      ) : (
        <TimeFields values={values} />
      )}
      <Field label="Τίτλος" hint={TITLE_NOTE}>
        <Input name="title" maxLength={120} defaultValue={values.title} />
      </Field>
      <FormMessage state={state} />
      {showSubmit && (
        <div>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Αποθήκευση…" : "Αποθήκευση"}
          </Button>
        </div>
      )}
    </form>
  );
}
