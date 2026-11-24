"use client";

import type { ReactNode } from "react";

import type { AgreementLine, KindInfo } from "../types";
import type { LineColumns } from "./d2-line-row";
import { ProvisionsCell } from "./d2-provisions";
import { NumberInput, decimalInput, moneyInput } from "./d2-ui";

// Τα πεδία μιας γραμμής για όποιον γράφει την πρόταση (κελί `ml-edit` κάτω από τη γραμμή). Ανήκουν στις φόρμες της
// γραμμής με `form=`· οι φόρμες ζουν έξω από τον πίνακα με τα πραγματικά actions.

export interface LineEditProps {
  line: AgreementLine;
  kinds: readonly KindInfo[];
  columns: LineColumns;
  canEditPrices: boolean;
  canEditCost: boolean;
  ids: { update: string; provisions: string; remove: string };
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="d2-edit-field">
      <small>{label}</small>
      {children}
    </span>
  );
}

const textOf = (n: number | null, toText: (v: number) => string) =>
  n === null ? "" : toText(n);

function HoursInputs({ line, form }: { line: AgreementLine; form: string }) {
  return (
    <Labeled label="Ώρες γύρ. / μοντ. · άμεσο κόστος">
      <span className="ml-quick">
        <NumberInput
          name="hoursShoot"
          form={form}
          label="Ώρες γυρίσματος"
          inputMode="decimal"
          defaultValue={textOf(line.hoursShoot, decimalInput)}
          suffix="γύρ."
        />
        <NumberInput
          name="hoursEdit"
          form={form}
          label="Ώρες μοντάζ"
          inputMode="decimal"
          defaultValue={textOf(line.hoursEdit, decimalInput)}
          suffix="μοντ."
        />
        <NumberInput
          name="directCost"
          form={form}
          label="Άμεσο κόστος"
          inputMode="decimal"
          defaultValue={textOf(line.directCost, moneyInput)}
          suffix="€ άμεσο"
        />
      </span>
    </Labeled>
  );
}

function DescriptionInputs({
  line,
  form,
}: {
  line: AgreementLine;
  form: string;
}) {
  return (
    <Labeled label="Περιγραφή">
      <input
        className="input d2-wide"
        name="description"
        form={form}
        aria-label="Περιγραφή"
        defaultValue={line.description}
      />
      <input
        className="input d2-wide"
        name="descriptionEn"
        form={form}
        aria-label="Περιγραφή (English)"
        placeholder="English"
        defaultValue={line.descriptionEn}
      />
    </Labeled>
  );
}

export function LineEdit(props: LineEditProps) {
  const { line, kinds, columns, ids } = props;
  const canPrice = props.canEditPrices && line.unitPrice !== null;
  return (
    <div className="d2-line-edit">
      <DescriptionInputs line={line} form={ids.update} />
      <Labeled label="Ποσότητα">
        <NumberInput
          name="quantity"
          form={ids.update}
          label="Ποσότητα"
          min={1}
          max={999}
          defaultValue={String(line.quantity)}
        />
      </Labeled>
      {columns.amount && canPrice && line.unitPrice !== null && (
        <Labeled label="Τιμή μονάδας">
          <NumberInput
            name="unitPrice"
            form={ids.update}
            label="Τιμή μονάδας"
            inputMode="decimal"
            defaultValue={moneyInput(line.unitPrice)}
            suffix="€"
          />
        </Labeled>
      )}
      {columns.cost && props.canEditCost && (
        <HoursInputs line={line} form={ids.update} />
      )}
      <Labeled label="Παροχές">
        <ProvisionsCell
          formId={ids.provisions}
          kinds={kinds}
          initial={line.provisions}
        />
      </Labeled>
      <span className="ml-quick d2-line-save">
        <button type="submit" data-primary="true" form={ids.update}>
          Αποθήκευση γραμμής
        </button>
        <button type="submit" form={ids.remove}>
          Αφαίρεση
        </button>
      </span>
    </div>
  );
}
