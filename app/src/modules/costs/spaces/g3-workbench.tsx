"use client";

import { useState, useTransition } from "react";

import type { FormState } from "@/lib/form-state";

import { saveProductionHours } from "../actions";
import { G3Form, type InternalEstimate } from "./g3-form";
import { G3Hero, type G3HeroProps } from "./g3-hero";
import {
  figuresOf,
  formOf,
  isSameValue,
  missingOf,
  valueOf,
  type CostBasis,
  type HoursForm,
  type HoursValue,
} from "./g3-model";
import { G3Signal, G3Status } from "./g3-signals";
import { G3Table } from "./g3-table";

// Prototype `screens/g3-workbench.tsx`: ό,τι γράφεται στη φόρμα φαίνεται αμέσως στο σήμα· η αποθήκευση πάει στη βάση.
// Μορφή της I8: κεφαλίδα με το κόστος, προειδοποίηση μόνο όταν λείπουν ώρες, και από κάτω κλειστά κουτιά.

export interface G3WorkbenchProps {
  productionId: string;
  basis: CostBasis;
  initialValue: HoursValue;
  suggestedShoot: number;
  internalEstimate: InternalEstimate | null;
  canManageCost: boolean;
  isDelivered: boolean;
  isInternal: boolean;
  hero: Omit<G3HeroProps, "figures" | "canManageCost">;
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

// Οι ώρες της φόρμας, οι αποθηκευμένες και η αποθήκευση στο saveProductionHours.
function useHours(props: G3WorkbenchProps) {
  const [saved, setSaved] = useState<HoursValue>(props.initialValue);
  const [form, setForm] = useState(() =>
    formOf(props.initialValue, props.suggestedShoot),
  );
  const [result, setResult] = useState<FormState>({});
  const [isSaving, startTransition] = useTransition();
  const handleSave = () =>
    startTransition(async () => {
      const next = valueOf(form);
      const state = await saveProductionHours(
        {},
        hoursFormData(props.productionId, form),
      );
      setResult(state);
      if (!state.error) setSaved(next);
    });
  return { saved, form, setForm, result, isSaving, handleSave };
}

export function G3Workbench(props: G3WorkbenchProps) {
  const { productionId, basis } = props;
  const { saved, form, setForm, result, isSaving, handleSave } =
    useHours(props);
  // Μόνο η αρχική κατάσταση: μετά την αποθήκευση το κουτί δεν κλείνει κάτω από τα χέρια του Χρήστη.
  const [isOpenAtStart] = useState(
    () => props.canManageCost && missingOf(props.initialValue).length > 0,
  );
  const savedFigures = figuresOf(basis, saved);
  const live = figuresOf(basis, valueOf(form));
  const isDirty = !isSameValue(valueOf(form), saved);

  return (
    <>
      <G3Hero
        {...props.hero}
        figures={savedFigures}
        canManageCost={props.canManageCost}
      />
      <G3Status
        figures={savedFigures}
        isDelivered={props.isDelivered}
        isInternal={props.isInternal}
      />
      <div className="ml-stack">
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
          isOpen={isOpenAtStart}
          isDirty={isDirty}
        />
        <G3Signal
          figures={isDirty && props.canManageCost ? live : savedFigures}
          overrunPercent={basis.overrunPercent}
          multiplierMin={basis.multiplierMin}
        />
        <G3Table figures={savedFigures} isInternal={props.isInternal} />
      </div>
    </>
  );
}
