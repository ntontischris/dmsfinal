"use client";

import { useState } from "react";

import { invoicesToCsv } from "../invoices-helpers";
import type { InvoiceItem } from "../invoices-view-schema";
import { athensToday } from "../money";
import { type Debtor, debtorsToCsv } from "./i2-debtors";

// Το «Εξαγωγή CSV» του prototype (`screens/i2-ui.tsx`): κατεβάζει στον browser τις γραμμές που φαίνονται, όπως η παλιά σελίδα.
// Στο «Ποιος μας χρωστάει» φαίνονται Πελάτες, όχι Τιμολόγια: τότε εξάγει αυτούς.
export function CsvButton({
  rows,
  debtors = [],
}: {
  rows: readonly InvoiceItem[];
  debtors?: readonly Debtor[];
}) {
  const [file, setFile] = useState<string | null>(null);
  const isDebtors = debtors.length > 0;
  const handleExport = () => {
    const name = `${isDebtors ? "xrostoun" : "timologia"}-${athensToday()}.csv`;
    const csv = isDebtors ? debtorsToCsv(debtors) : invoicesToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    setFile(name);
  };
  return (
    <>
      <button type="button" onClick={handleExport}>
        Εξαγωγή CSV
      </button>
      {file && (
        <span className="feedback-msg" data-tone="ok" data-shown="true" role="status">
          <span aria-hidden="true">✓</span>
          Κατέβηκε το αρχείο {file}.
        </span>
      )}
    </>
  );
}
