import { personName } from "@/data/filming";
import { methodName } from "@/data/finance";
import { TODAY, financeCapsOf } from "@/data/finance-access";
import { CsvButton } from "@/screens/i2-ui";
import { clientNameOf } from "@/screens/i2-model";
import { I4Form } from "@/screens/i4-form";
import { I4List, type ReceiptRow } from "@/screens/i4-list";
import {
  activeMethods,
  clientOptions,
  openInvoicesByClient,
  receiptsDesc,
} from "@/screens/i4-model";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  type ScreenProps,
} from "@/screens/shared";

import "./i245.css";

const rowsOf = (): readonly ReceiptRow[] =>
  receiptsDesc().map((r) => ({
    id: r.id,
    date: r.date,
    clientName: clientNameOf(r.clientId),
    amount: r.amount,
    method: methodName(r.methodId),
    note: r.note ?? "",
    by: personName(r.registeredBy),
  }));

export function I4({ role, query }: ScreenProps) {
  const caps = financeCapsOf(role);
  const state = parseState(query.state);
  const header = <StateSwitcher role={role} code="I4" state={state} />;
  if (!caps.canSee || caps.isClient) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Οι Εισπράξεις είναι για την ομάδα και τον Λογιστή.
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="τις Εισπράξεις" />
      </>
    );
  }
  const rows = state === "empty" ? [] : rowsOf();
  return (
    <>
      {header}
      <div className="toolbar">{role === "accountant" && <CsvButton />}</div>
      {caps.canRegisterReceipts && (
        <I4Form
          clients={clientOptions()}
          methods={activeMethods()}
          openByClient={openInvoicesByClient()}
          today={TODAY}
        />
      )}
      <p className="note">
        Οι τρόποι είσπραξης αλλάζουν στις Ρυθμίσεις › Οικονομικά. Η διόρθωση και
        η διαγραφή θέλουν λόγο και γράφονται στο ίχνος.
      </p>
      {rows.length === 0 ? (
        <StateNotice kind="empty" title="Καμία Είσπραξη">
          Δεν έχει καταχωρηθεί Είσπραξη ακόμη.
        </StateNotice>
      ) : (
        <I4List rows={rows} canEdit={caps.canRegisterReceipts} today={TODAY} />
      )}
    </>
  );
}
