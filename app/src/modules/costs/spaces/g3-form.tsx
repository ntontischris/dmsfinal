"use client";

import { useState, useTransition } from "react";

import type { FormState } from "@/lib/form-state";
import { Panel } from "@/spaces/kit/panel";

import { saveProductionEstimate } from "../actions";
import type { HoursForm, HoursValue } from "./g3-model";

// Prototype `screens/g3-form.tsx`. Η φόρμα στέλνει στο πραγματικό saveProductionHours· η εκτίμηση της Εσωτερικής στο
// saveProductionEstimate. Διαφορές: επιβεβαίωση και για το μοντάζ (τη ζητά η βάση), άμεσο κόστος στην εκτίμηση της
// Εσωτερικής, κουμπί αποθήκευσης της εκτίμησης. Η ανάλυση ανά Γύρισμα λείπει: η γραμμή κόστους δίνει μόνο την πρόταση.

export type InternalEstimate = {
  shoot: number;
  edit: number;
  directCost: number;
};

interface G3FormProps {
  productionId: string;
  canManageCost: boolean;
  isInternal: boolean;
  suggestedShoot: number;
  form: HoursForm;
  saved: HoursValue;
  estimateDirectCost: number;
  internalEstimate: InternalEstimate | null;
  result: FormState;
  isSaving: boolean;
  onChange: (change: Partial<HoursForm>) => void;
  onSave: () => void;
}

const n = (value: number | null): string =>
  value === null ? "—" : value.toLocaleString("el-GR");

function Message({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p className="note" role="alert">
        {state.error}
      </p>
    );
  if (state.notice)
    return (
      <p className="note" role="status">
        {state.notice}
      </p>
    );
  return null;
}

function ReadOnly({ saved }: { saved: HoursValue }) {
  return (
    <>
      <dl className="dl">
        <dt>Ώρες γυρίσματος</dt>
        <dd>
          {n(saved.shoot)}
          {saved.shoot !== null &&
            !saved.shootConfirmed &&
            " (δεν επιβεβαιώθηκαν)"}
        </dd>
        <dt>Ώρες μοντάζ</dt>
        <dd>
          {n(saved.edit)}
          {saved.edit !== null &&
            !saved.editConfirmed &&
            " (δεν επιβεβαιώθηκαν)"}
        </dd>
        <dt>Άμεσο κόστος</dt>
        <dd>{n(saved.directCost)}</dd>
      </dl>
      <p className="note">
        Τις γράφει μόνο όποιος «Διαχειρίζεται κόστος» (αρχικά ο Ιδιοκτήτης).
      </p>
    </>
  );
}

const text = (value: number | undefined): string =>
  value === undefined ? "" : String(value).replace(".", ",");

function InternalEstimateForm({
  productionId,
  value,
}: {
  productionId: string;
  value: InternalEstimate | null;
}) {
  const [result, setResult] = useState<FormState>({});
  const [isPending, startTransition] = useTransition();
  const handleSubmit = (form: HTMLFormElement) =>
    startTransition(async () => {
      const data = new FormData(form);
      data.set("productionId", productionId);
      setResult(await saveProductionEstimate({}, data));
    });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(e.currentTarget);
      }}
    >
      <fieldset className="stack">
        <legend>
          Εκτίμηση εσωτερικής δουλειάς (προαιρετική, μόνο ο Ιδιοκτήτης)
        </legend>
        <label>
          Γύρισμα (ώρες){" "}
          <input
            className="input"
            name="shootHours"
            inputMode="decimal"
            defaultValue={text(value?.shoot)}
          />
        </label>
        <label>
          Μοντάζ (ώρες){" "}
          <input
            className="input"
            name="editHours"
            inputMode="decimal"
            defaultValue={text(value?.edit)}
          />
        </label>
        <label>
          Άμεσο κόστος (€){" "}
          <input
            className="input"
            name="directCost"
            inputMode="decimal"
            defaultValue={text(value?.directCost ?? 0)}
          />
        </label>
        <Message state={result} />
        <button className="button" type="submit" disabled={isPending}>
          {isPending ? "Αποθήκευση…" : "Αποθήκευση εκτίμησης"}
        </button>
      </fieldset>
    </form>
  );
}

function HoursFields(props: G3FormProps) {
  const { form, onChange } = props;
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        props.onSave();
      }}
    >
      <label>
        Ώρες γυρίσματος (πρόταση συστήματος: {n(props.suggestedShoot)} ώ){" "}
        <input
          className="input"
          inputMode="decimal"
          value={form.shoot}
          onChange={(e) =>
            onChange({ shoot: e.target.value, shootConfirmed: false })
          }
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={form.shootConfirmed}
          onChange={(e) => onChange({ shootConfirmed: e.target.checked })}
        />{" "}
        Επιβεβαιώνω τις ώρες γυρίσματος
      </label>
      <label>
        Ώρες μοντάζ{" "}
        <input
          className="input"
          inputMode="decimal"
          value={form.edit}
          onChange={(e) =>
            onChange({ edit: e.target.value, editConfirmed: false })
          }
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={form.editConfirmed}
          onChange={(e) => onChange({ editConfirmed: e.target.checked })}
        />{" "}
        Επιβεβαιώνω τις ώρες μοντάζ
      </label>
      <label>
        Πραγματικό άμεσο κόστος (προεπιλογή: της εκτίμησης,{" "}
        {n(props.estimateDirectCost)} €){" "}
        <input
          className="input"
          inputMode="decimal"
          value={form.directCost}
          onChange={(e) => onChange({ directCost: e.target.value })}
        />
      </label>
      <p className="note">
        Οι ώρες γράφονται όποτε θες, όχι μόνο μετά την παράδοση. Μισές ώρες
        (χωρίς επιβεβαίωση ή χωρίς μοντάζ) μετράνε ως «χωρίς πραγματικές ώρες».
      </p>
      <Message state={props.result} />
      <button
        className="button"
        type="submit"
        data-primary="true"
        disabled={props.isSaving}
      >
        {props.isSaving ? "Αποθήκευση…" : "Αποθήκευση ωρών"}
      </button>
    </form>
  );
}

export function G3Form(props: G3FormProps) {
  return (
    <Panel label="Πραγματικές ώρες">
      {!props.canManageCost ? (
        <ReadOnly saved={props.saved} />
      ) : (
        <HoursFields {...props} />
      )}
      {props.canManageCost && props.isInternal && (
        <InternalEstimateForm
          productionId={props.productionId}
          value={props.internalEstimate}
        />
      )}
    </Panel>
  );
}
