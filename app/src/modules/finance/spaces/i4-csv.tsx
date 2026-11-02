"use client";

import { useState } from "react";

import { receiptsToCsv } from "../helpers";
import { athensToday } from "../money";
import type { ReceiptRow } from "../types";

// Το «Εξαγωγή CSV» του prototype (`screens/i2-ui.tsx`) για τις Εισπράξεις: κατεβάζει στον browser τις γραμμές της σελίδας,
// όπως η παλιά σελίδα. Δεν ξαναφέρνει δεδομένα.
export function ReceiptsCsv({ rows }: { rows: readonly ReceiptRow[] }) {
  const [file, setFile] = useState<string | null>(null);
  const handleExport = () => {
    const name = `eispraxeis-${athensToday()}.csv`;
    const blob = new Blob([receiptsToCsv(rows)], {
      type: "text/csv;charset=utf-8",
    });
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
        <span
          className="feedback-msg"
          data-tone="ok"
          data-shown="true"
          role="status"
        >
          <span aria-hidden="true">✓</span>
          Κατέβηκε το αρχείο {file}.
        </span>
      )}
    </>
  );
}
