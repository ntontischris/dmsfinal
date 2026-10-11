"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

import { decimalText, formatHours } from "../helpers";

interface ShootHoursFieldProps {
  defaultValue: number;
  suggested: number;
}

// Ώρες γυρίσματος με την πρόταση από τα Γυρίσματα «έγινε»· το κουμπί γράφει την πρόταση στο πεδίο, δεν αποθηκεύει.
export function ShootHoursField({ defaultValue, suggested }: ShootHoursFieldProps) {
  const [value, setValue] = useState(decimalText(defaultValue));
  return (
    <div className="grid max-w-md gap-1.5">
      <Field label="Ώρες γυρίσματος">
        <Input
          name="shootHours"
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">Πρόταση: {formatHours(suggested)}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => setValue(decimalText(suggested))}>
          Χρήση πρότασης
        </Button>
      </div>
    </div>
  );
}
