"use client";

import { useState, useTransition } from "react";

import type { FormState } from "@/lib/form-state";

import { saveProductionHours } from "../actions";
import { G3Form, type InternalEstimate } from "./g3-form";
import {
  figuresOf,
  formOf,
  isSameValue,
  valueOf,
  type CostBasis,
  type HoursForm,
  type HoursValue,
} from "./g3-model";
import { G3Signal, G3Status } from "./g3-signals";
import { G3Table } from "./g3-table";

// Prototype `screens/g3-workbench.tsx`: ό,τι γράφεται στη φόρμα φαίνεται αμέσως στο σήμα· η αποθήκευση πάει στη βάση.

export interface G3WorkbenchProps {
  productionId: string;
  basis: CostBasis;
  initialValue: HoursValue;
  suggestedShoot: number;
  internalEstimate: InternalEstimate | null;
  canManageCost: boolean;
  isDelivered: boolean;
  isInternal: boolean;
}

// Τα πεδία όπως τα περιμένει το saveProductionHours (κουτί = "on", αλλιώς κενό).
const hoursFormData = (productionId: string, form: HoursForm): FormData => {
  const data = new FormData();
  data.set("productionId", productionId);
  data.set("shootHours", form.shoot);
  data.set("editHours", form.edit);
  data.set("directCost", form.directCost);
  data.set("confirmShoot", form.shootConfirmed ? "on" : "");
  data.set("confirmEdit", form.editConfirmed ? "on" : "");
  return data;
};

export function G3Workbench(props: G3WorkbenchProps) {
  const { productionId, basis } = props;
  const [saved, setSaved] = useState<HoursValue>(props.initialValue);
  const [form, setForm] = useState(() =>
    formOf(props.initialValue, props.suggestedShoot),
  );
  const [result, setResult] = useState<FormState>({});
  const [isSaving, startTransition] = useTransition();

  const savedFigures = figuresOf(basis, saved);
  const live = figuresOf(basis, valueOf(form));
  const isDirty = !isSameValue(valueOf(form), saved);

  const handleSave = () =>
    startTransition(async () => {
      const next = valueOf(form);
      const state = await saveProductionHours(
        {},
        hoursFormData(productionId, form),
      );
      setResult(state);
      if (!state.error) setSaved(next);
    });

  return (
    <div
      className="stack"
      style={{ alignItems: "stretch", gap: "var(--space-4)" }}
    >
      <G3Status
        figures={savedFigures}
        isDelivered={props.isDelivered}
        isInternal={props.isInternal}
      />
      <G3Table figures={savedFigures} isInternal={props.isInternal} />
      <G3Form
        productionId={productionId}
        canManageCost={props.canManageCost}
        isInternal={props.isInternal}
        suggestedShoot={props.suggestedShoot}
        form={form}
        saved={saved}
        estimateDirectCost={savedFigures.estimate?.directCost ?? 0}
        internalEstimate={props.internalEstimate}
        result={result}
        isSaving={isSaving}
        onChange={(change) => setForm((prev) => ({ ...prev, ...change }))}
        onSave={handleSave}
      />
      {isDirty && props.canManageCost && (
        <p className="note">
          Το σήμα παρακάτω δείχνει τα νούμερα της φόρμας (δεν έχουν αποθηκευτεί
          ακόμα).
        </p>
      )}
      <G3Signal
        figures={isDirty && props.canManageCost ? live : savedFigures}
        overrunPercent={basis.overrunPercent}
        multiplierMin={basis.multiplierMin}
      />
    </div>
  );
}
