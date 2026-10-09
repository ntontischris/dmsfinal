import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { Td } from "@/components/ui/table";

import { removeLine, setLineProvisions, updateLine } from "../actions-draft";
import { formatMoney, formatNumber, provisionsText } from "../helpers";
import { DEVIATION_STATUS_LABELS } from "../labels";
import type {
  AgreementDetail,
  AgreementLine,
  Deviation,
  KindInfo,
} from "../types";

import { ActionForm } from "./action-form";
import { ScopedForm } from "./agreement-actions-parts";
import { ProvisionsEditor } from "./provisions-editor";
import { FieldGrid, decimalInput, moneyInput } from "./terms-section-parts";

export interface LineColumns {
  amount: boolean;
  cost: boolean;
}

interface LineRowsProps {
  line: AgreementLine;
  agreement: AgreementDetail;
  kinds: readonly KindInfo[];
  columns: LineColumns;
  span: number; // πόσες στήλες έχει ο πίνακας (για τη γραμμή επεξεργασίας)
}

const DEVIATION_SHORT: Readonly<Record<string, string>> = {
  price: "τιμή",
  provisions: "Παροχές",
};

const deviationBadge = (d: Deviation) => (
  <Badge key={d.key} tone={d.status === "covered" ? undefined : "attention"}>
    {DEVIATION_SHORT[d.kind]
      ? `${DEVIATION_SHORT[d.kind]}: ${DEVIATION_STATUS_LABELS[d.status]}`
      : DEVIATION_STATUS_LABELS[d.status]}
  </Badge>
);

const hasCatalogueGap = (line: AgreementLine): boolean =>
  line.unitPrice !== null &&
  line.catalogPrice !== null &&
  line.unitPrice !== line.catalogPrice;

function DescriptionCell({
  line,
  deviations,
}: {
  line: AgreementLine;
  deviations: readonly Deviation[];
}) {
  return (
    <Td data-label="Γραμμή">
      <span className="grid gap-1 max-sm:justify-items-end">
        <span className="font-medium">{line.description}</span>
        {hasCatalogueGap(line) && line.catalogPrice !== null && (
          <span className="text-xs text-muted-foreground">
            Κατάλογος: {formatMoney(line.catalogPrice)}
          </span>
        )}
        {(line.kind === "free" || deviations.length > 0) && (
          <span className="flex flex-wrap gap-1 max-sm:justify-end">
            {line.kind === "free" && <Badge>Ελεύθερη γραμμή</Badge>}
            {deviations.map(deviationBadge)}
          </span>
        )}
      </span>
    </Td>
  );
}

const hoursText = (line: AgreementLine): string =>
  `${line.hoursShoot === null ? "—" : formatNumber(line.hoursShoot)} / ${line.hoursEdit === null ? "—" : formatNumber(line.hoursEdit)}`;

const moneyOrDash = (value: number | null): string =>
  value === null ? "—" : formatMoney(value);

// Οι Παροχές είναι ανά μονάδα· η γραμμή τις πολλαπλασιάζει με την ποσότητά της.
const provisionsOf = (
  line: AgreementLine,
  kinds: readonly KindInfo[],
): string =>
  provisionsText(
    line.provisions.map((p) => ({
      kindId: p.kindId,
      quantity: p.quantity * line.quantity,
    })),
    kinds,
  );

function SummaryRow({ line, agreement, kinds, columns }: LineRowsProps) {
  const deviations = agreement.deviations.filter((d) =>
    d.key.endsWith(`:${line.id}`),
  );
  return (
    <tr className="hover:bg-muted">
      <DescriptionCell line={line} deviations={deviations} />
      <Td data-label="Ποσότητα" isNumeric>
        {line.quantity}
      </Td>
      {columns.amount && (
        <Td data-label="Τιμή μονάδας" isNumeric>
          {moneyOrDash(line.unitPrice)}
        </Td>
      )}
      <Td data-label="Παροχές">{provisionsOf(line, kinds)}</Td>
      {columns.cost && (
        <Td data-label="Ώρες γύρ. / μοντ." isNumeric>
          <span className="grid gap-0.5 max-sm:justify-items-end sm:justify-items-end">
            {hoursText(line)}
            <span className="text-xs text-muted-foreground">
              Άμεσο κόστος {moneyOrDash(line.directCost)}
            </span>
          </span>
        </Td>
      )}
      {columns.amount && (
        <Td data-label="Σύνολο" isNumeric>
          {moneyOrDash(line.lineTotal)}
        </Td>
      )}
    </tr>
  );
}

function CostFields({ line }: { line: AgreementLine }) {
  return (
    <>
      <Field label="Ώρες γυρίσματος">
        <Input
          name="hoursShoot"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={
            line.hoursShoot === null ? "" : decimalInput(line.hoursShoot)
          }
        />
      </Field>
      <Field label="Ώρες μοντάζ">
        <Input
          name="hoursEdit"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={
            line.hoursEdit === null ? "" : decimalInput(line.hoursEdit)
          }
        />
      </Field>
      <Field label="Άμεσο κόστος">
        <Input
          name="directCost"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={
            line.directCost === null ? "" : moneyInput(line.directCost)
          }
        />
      </Field>
    </>
  );
}

// Ένα πεδίο μπαίνει στη φόρμα μόνο αν ο θεατής μπορεί να το γράψει· η απουσία του σημαίνει «δεν αλλάζει».
function LineEditor({ line, agreement, kinds }: LineRowsProps) {
  const { can } = agreement;
  return (
    <div className="grid gap-4">
      <ActionForm action={updateLine} submitLabel="Αποθήκευση γραμμής">
        <input type="hidden" name="lineId" value={line.id} />
        <FieldGrid>
          <Field label="Ποσότητα">
            <Input
              type="number"
              name="quantity"
              min={1}
              max={999}
              step={1}
              defaultValue={line.quantity}
            />
          </Field>
          <Field label="Περιγραφή">
            <Input name="description" defaultValue={line.description} />
          </Field>
          <Field label="Περιγραφή (English)">
            <Input name="descriptionEn" defaultValue={line.descriptionEn} />
          </Field>
          {can.editPrices && line.unitPrice !== null && (
            <Field label="Τιμή μονάδας">
              <Input
                name="unitPrice"
                inputMode="decimal"
                autoComplete="off"
                defaultValue={moneyInput(line.unitPrice)}
              />
            </Field>
          )}
          {can.editCost && <CostFields line={line} />}
        </FieldGrid>
      </ActionForm>
      <ActionForm action={setLineProvisions} submitLabel="Αποθήκευση Παροχών">
        <input type="hidden" name="lineId" value={line.id} />
        <ProvisionsEditor kinds={kinds} initial={line.provisions} />
      </ActionForm>
      <ScopedForm
        action={removeLine}
        submitLabel="Αφαίρεση"
        variant="danger"
        size="sm"
      >
        <input type="hidden" name="lineId" value={line.id} />
      </ScopedForm>
    </div>
  );
}

// Η γραμμή του πίνακα και, για όποιον μπορεί να τη γράψει, από κάτω η φόρμα της (σε δική της γραμμή πίνακα).
export function LineRows(props: LineRowsProps) {
  return (
    <>
      <SummaryRow {...props} />
      {props.agreement.can.edit && (
        <tr>
          <td
            colSpan={props.span}
            className="border-b bg-muted/40 px-3 py-3 max-sm:block max-sm:border-0 max-sm:bg-transparent max-sm:px-0"
          >
            <LineEditor {...props} />
          </td>
        </tr>
      )}
    </>
  );
}
