"use client";

import { useState } from "react";

import { Field, Input } from "@/components/ui/field";

import { SlotWarning } from "./slot-warning";

// Η μέρα και η ώρα του Γυρίσματος. Με watchHours δείχνει και την προειδοποίηση της ώρας (χωρίς να μπλοκάρει).
export function DateTimeFields({ today, watchHours }: { today: string; watchHours?: string }) {
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("09:00");
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
    </>
  );
}
