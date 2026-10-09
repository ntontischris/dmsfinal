"use client";

import { useState } from "react";

import { Field, Input } from "@/components/ui/field";

import { rescheduleFilming } from "../actions-transitions";
import type { ProvisionMeasure } from "../types";

import { ActionForm } from "./action-form";
import { DurationNotice } from "./duration-notice";

interface RescheduleFormProps {
  filmingId: string;
  date: string;
  time: string;
  hours: number;
  measure: ProvisionMeasure | null;
  defaultHours: number | null;
}

// Μετάθεση από την ομάδα. Οι ώρες ελέγχονται εδώ μόνο για την προειδοποίηση· η βάση ελέγχει τα πάντα.
export function RescheduleForm({
  filmingId,
  date,
  time,
  hours,
  measure,
  defaultHours,
}: RescheduleFormProps) {
  const [hoursText, setHoursText] = useState(String(hours));
  const parsedHours = Number(hoursText.replace(",", "."));
  return (
    <ActionForm action={rescheduleFilming} submitLabel="Μετάθεση" variant="default" size="sm">
      <input type="hidden" name="filmingId" value={filmingId} />
      <Field label="Ημερομηνία">
        <Input name="date" type="date" required defaultValue={date} />
      </Field>
      <Field label="Ώρα">
        <Input name="time" type="time" required defaultValue={time} />
      </Field>
      <Field label="Ώρες">
        <Input
          name="hours"
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0.5"
          max="12"
          required
          value={hoursText}
          onChange={(event) => setHoursText(event.target.value)}
        />
      </Field>
      {measure !== null && (
        <DurationNotice hours={parsedHours} measure={measure} defaultHours={defaultHours} />
      )}
    </ActionForm>
  );
}
