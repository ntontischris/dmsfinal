import { Field, Input, Select } from "@/components/ui/field";

import { correctReceipt, deleteReceipt } from "../actions";
import { decimalText } from "../money";
import type { PaymentMethod, ReceiptRow } from "../types";

import { ActionForm } from "./action-form";

interface ReceiptActionsProps {
  row: ReceiptRow;
  methods: readonly PaymentMethod[];
}

// Διόρθωση και διαγραφή μιας Είσπραξης. Και τα δύο θέλουν λόγο, που μπαίνει στο Ίχνος.
export function ReceiptActions({ row, methods }: ReceiptActionsProps) {
  return (
    <div className="grid gap-2">
      <details>
        <summary className="cursor-pointer text-sm">Διόρθωση</summary>
        <div className="mt-2">
          <ActionForm
            action={correctReceipt}
            submitLabel="Αποθήκευση διόρθωσης"
          >
            <input type="hidden" name="id" value={row.id} />
            <Field label="Ποσό (€, με ΦΠΑ)">
              <Input
                name="amount"
                inputMode="decimal"
                defaultValue={decimalText(row.amount)}
              />
            </Field>
            <Field label="Ημερομηνία">
              <Input
                name="receivedOn"
                type="date"
                defaultValue={row.receivedOn}
              />
            </Field>
            <Field label="Τρόπος">
              <Select name="methodId" defaultValue={row.methodId}>
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Σημείωση">
              <Input name="note" maxLength={500} defaultValue={row.note} />
            </Field>
            <Field label="Λόγος διόρθωσης (υποχρεωτικός)">
              <Input name="reason" required />
            </Field>
          </ActionForm>
        </div>
      </details>
      <details>
        <summary className="cursor-pointer text-sm">Διαγραφή</summary>
        <div className="mt-2">
          <ActionForm
            action={deleteReceipt}
            submitLabel="Επιβεβαίωση διαγραφής"
          >
            <input type="hidden" name="id" value={row.id} />
            <Field label="Λόγος διαγραφής (υποχρεωτικός)">
              <Input name="reason" required />
            </Field>
          </ActionForm>
        </div>
      </details>
    </div>
  );
}
