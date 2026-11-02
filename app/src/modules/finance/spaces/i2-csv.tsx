"use client";

import { useState } from "react";

import { invoicesToCsv } from "../invoices-helpers";
import type { InvoiceItem } from "../invoices-view-schema";
import { athensToday } from "../money";

// Το «Εξαγωγή CSV» του prototype (`screens/i2-ui.tsx`): κατεβάζει στον browser τις γραμμές που φαίνονται, όπως η παλιά σελίδα.
export function CsvButton({ rows }: { rows: readonly InvoiceItem[] }) {
  const [file, setFile] = useState<string | null>(null);
  const handleExport = () => {
    const name = `timologia-${athensToday()}.csv`;
    const blob = new Blob([invoicesToCsv(rows)], { type: "text/csv;charset=utf-8" });
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
      <button type="button" className="button" onClick={handleExport}>
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
