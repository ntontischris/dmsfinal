"use client";

import { useState } from "react";

import { NOW } from "@/data/filming";
import type { ProductionStub } from "@/data/filming";
import type { TrailEntry } from "@/data/productions";
import {
  isInternal,
  recordOf,
  stateOf,
  suggestedShootHours,
} from "@/data/productions-access";
import type { RoleId } from "@/data/roles";
import { G3Form } from "@/screens/g3-form";
import {
  figuresOf,
  formOf,
  initialValueOf,
  valueOf,
  type HoursValue,
} from "@/screens/g3-model";
import { G3Signal, G3Status, G3Trail } from "@/screens/g3-signals";
import { G3Table } from "@/screens/g3-table";

interface G3WorkbenchProps {
  role: RoleId;
  production: ProductionStub;
  canManageCost: boolean;
}

const changeText = (before: boolean, after: boolean): string =>
  before === after
    ? ""
    : after
      ? " Άναψε «Υπέρβαση κόστους»."
      : " Έσβησε «Υπέρβαση κόστους» (η διόρθωση αναίρεσε τη συνθήκη).";

export function G3Workbench({
  role,
  production,
  canManageCost,
}: G3WorkbenchProps) {
  const record = recordOf(production);
  const [saved, setSaved] = useState<HoursValue>(() =>
    initialValueOf(production),
  );
  const [form, setForm] = useState(() =>
    formOf(initialValueOf(production), suggestedShootHours(production)),
  );
  const [internalEstimate, setInternalEstimate] = useState(
    record.internalEstimate ?? null,
  );
  const [added, setAdded] = useState<readonly TrailEntry[]>([]);

  const savedFigures = figuresOf(production, saved, internalEstimate);
  const live = figuresOf(production, valueOf(form), internalEstimate);
  const isDirty = JSON.stringify(valueOf(form)) !== JSON.stringify(saved);
  const trail = [...record.trail.filter((e) => e.costOnly), ...added];

  const handleSave = () => {
    const next = valueOf(form);
    const after = figuresOf(production, next, internalEstimate);
    const what =
      after.missing.length > 0
        ? `Πραγματικές ώρες (ημιτελείς): ${after.missing.join(", ")}.`
        : `Πραγματικές ώρες: γύρισμα ${next.shoot}, μοντάζ ${next.edit}.${changeText(savedFigures.isOverrun, after.isOverrun)}`;
    setSaved(next);
    setAdded((prev) => [
      ...prev,
      {
        when: NOW.slice(0, 10),
        who: "Γιώργος Μαυρίδης (Ιδιοκτήτης)",
        what,
        costOnly: true,
      },
    ]);
  };

  return (
    <div
      className="stack"
      style={{ alignItems: "stretch", gap: "var(--space-4)" }}
    >
      <G3Status
        figures={savedFigures}
        isDelivered={stateOf(production) === "παραδομένη"}
        isInternal={isInternal(production)}
      />
      <G3Table production={production} figures={savedFigures} />
      <G3Form
        production={production}
        canManageCost={canManageCost}
        form={form}
        saved={saved}
        estimateDirectCost={savedFigures.estimate?.directCost ?? 0}
        internalEstimate={internalEstimate}
        onChange={(change) => setForm((prev) => ({ ...prev, ...change }))}
        onInternalEstimate={setInternalEstimate}
        onSave={handleSave}
      />
      {isDirty && (
        <p className="note">
          Το σήμα παρακάτω δείχνει τα νούμερα της φόρμας (δεν έχουν αποθηκευτεί
          ακόμα).
        </p>
      )}
      <G3Signal figures={isDirty ? live : savedFigures} />
      <G3Trail entries={trail} role={role} />
    </div>
  );
}
