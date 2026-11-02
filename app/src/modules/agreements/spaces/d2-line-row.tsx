"use client";

import { Badge } from "@/spaces/screens/shared";

import { formatMoney } from "../helpers";
import { DEVIATION_STATUS_LABELS } from "../labels";
import type { AgreementDetail, AgreementLine, KindInfo } from "../types";
import { hoursText, lineDeviationsOf, lineProvisionsText } from "./d2-model";
import { ProvisionsCell } from "./d2-provisions";
import { NumberInput, decimalInput, moneyInput } from "./d2-ui";

// Μία γραμμή του πίνακα «Γραμμές» (prototype `screens/d2-lines.tsx`). Όποιος γράφει την πρόταση βλέπει πεδία στη θέση
// των τιμών· τα πεδία ανήκουν στις φόρμες της γραμμής (`form=`), που ζουν κάτω από τον πίνακα με τα πραγματικά actions.

export const lineFormIds = (lineId: string) => ({
  update: `d2-line-${lineId}`,
  provisions: `d2-provisions-${lineId}`,
  remove: `d2-remove-${lineId}`,
});

export interface LineColumns {
  amount: boolean;
  cost: boolean;
}

interface LineRowProps {
  line: AgreementLine;
  agreement: AgreementDetail;
  kinds: readonly KindInfo[];
  columns: LineColumns;
}

const DEVIATION_SHORT: Readonly<Record<string, string>> = {
  price: "τιμή",
  provisions: "Παροχές",
};

const moneyOrDash = (value: number | null): string =>
  value === null ? "—" : formatMoney(value);

function DescriptionCell({ line, agreement }: LineRowProps) {
  const isEditing = agreement.can.edit;
  const form = lineFormIds(line.id).update;
  const deviations = lineDeviationsOf(agreement.deviations, line.id);
  const isOffCatalogue =
    line.unitPrice !== null &&
    line.catalogPrice !== null &&
    line.unitPrice !== line.catalogPrice;
  return (
    <div>
      {isEditing ? (
        <span className="stack">
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
        </span>
      ) : (
        line.description
      )}
      {isOffCatalogue && line.catalogPrice !== null && (
        <div className="muted">Κατάλογος: {formatMoney(line.catalogPrice)}</div>
      )}
      {line.kind === "free" && <div className="muted">Ελεύθερη γραμμή</div>}
      {deviations.length > 0 && (
        <div className="btn-row">
          {deviations.map((d) => (
            <Badge
              key={d.key}
              tone={d.status === "covered" ? undefined : "attention"}
            >
              {DEVIATION_SHORT[d.kind]
                ? `${DEVIATION_SHORT[d.kind]}: ${DEVIATION_STATUS_LABELS[d.status]}`
                : `Παρέκκλιση: ${DEVIATION_STATUS_LABELS[d.status]}`}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function HoursCell({ line, agreement }: LineRowProps) {
  const form = lineFormIds(line.id).update;
  if (!agreement.can.edit || !agreement.can.editCost)
    return (
      <span className="stack">
        <span>{hoursText(line)}</span>
        <span className="muted">
          Άμεσο κόστος {moneyOrDash(line.directCost)}
        </span>
      </span>
    );
  const value = (n: number | null, toText: (v: number) => string) =>
    n === null ? "" : toText(n);
  return (
    <span className="stack">
      <NumberInput
        name="hoursShoot"
        form={form}
        label="Ώρες γυρίσματος"
        inputMode="decimal"
        defaultValue={value(line.hoursShoot, decimalInput)}
        suffix="γύρ."
      />
      <NumberInput
        name="hoursEdit"
        form={form}
        label="Ώρες μοντάζ"
        inputMode="decimal"
        defaultValue={value(line.hoursEdit, decimalInput)}
        suffix="μοντ."
      />
      <NumberInput
        name="directCost"
        form={form}
        label="Άμεσο κόστος"
        inputMode="decimal"
        defaultValue={value(line.directCost, moneyInput)}
        suffix="€ άμεσο"
      />
    </span>
  );
}

function PriceCell({ line, agreement }: LineRowProps) {
  const { can } = agreement;
  if (!can.edit || !can.editPrices || line.unitPrice === null)
    return <>{moneyOrDash(line.unitPrice)}</>;
  return (
    <NumberInput
      name="unitPrice"
      form={lineFormIds(line.id).update}
      label="Τιμή μονάδας"
      inputMode="decimal"
      defaultValue={moneyInput(line.unitPrice)}
      suffix="€"
    />
  );
}

export function LineRow(props: LineRowProps) {
  const { line, agreement, kinds, columns } = props;
  const isEditing = agreement.can.edit;
  const ids = lineFormIds(line.id);
  return (
    <tr>
      <td data-label="Γραμμή">
        <DescriptionCell {...props} />
      </td>
      <td className="num" data-label="Ποσότητα">
        {isEditing ? (
          <NumberInput
            name="quantity"
            form={ids.update}
            label="Ποσότητα"
            min={1}
            max={999}
            defaultValue={String(line.quantity)}
          />
        ) : (
          `${line.quantity}×`
        )}
      </td>
      {columns.amount && (
        <td className="num" data-label="Τιμή μονάδας">
          <PriceCell {...props} />
        </td>
      )}
      <td data-label="Παροχές">
        {isEditing ? (
          <ProvisionsCell
            formId={ids.provisions}
            kinds={kinds}
            initial={line.provisions}
          />
        ) : (
          lineProvisionsText(line, kinds)
        )}
      </td>
      {columns.cost && (
        <td className="num" data-label="Ώρες γύρ. / μοντ.">
          <HoursCell {...props} />
        </td>
      )}
      <td className="num" data-label="Σύνολο">
        <div>
          {columns.amount && <strong>{moneyOrDash(line.lineTotal)}</strong>}
          {isEditing && (
            <div className="btn-row">
              <button
                type="submit"
                className="button"
                data-primary="true"
                form={ids.update}
              >
                Αποθήκευση γραμμής
              </button>
              <button type="submit" className="button" form={ids.remove}>
                Αφαίρεση
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
