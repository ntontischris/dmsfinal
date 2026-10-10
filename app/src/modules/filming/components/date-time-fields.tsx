"use client";

import { useState } from "react";

import { Field, Input } from "@/components/ui/field";

import type { NewFilmingPrefill } from "../blocked-prefill";

import { FromBlockedFields } from "./from-blocked-fields";
import { SlotWarning } from "./slot-warning";

// Η μέρα και η ώρα του Γυρίσματος. Με watchHours δείχνει και την προειδοποίηση της ώρας (χωρίς να μπλοκάρει).
// Με prefill (μετατροπή κλεισμένου χρόνου) ανοίγει στη μέρα και ώρα του κλεισμένου χρόνου.
export function DateTimeFields({
  today,
  watchHours,
  prefill,
}: {
  today: string;
  watchHours?: string;
  prefill?: NewFilmingPrefill | null;
}) {
  const [date, setDate] = useState(prefill?.date ?? today);
  const [time, setTime] = useState(prefill?.time ?? "09:00");
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Ημερομηνία">
          <Input
            name="date"
            type="date"
            required
            value={date}
            min={today}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field label="Ώρα">
          <Input
            name="time"
            type="time"
            required
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </Field>
      </div>
      {watchHours !== undefined && <SlotWarning date={date} time={time} hours={watchHours} />}
      {prefill && <FromBlockedFields id={prefill.fromBlocked} />}
    </>
  );
}
