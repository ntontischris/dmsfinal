"use client";

import { Button } from "@/components/ui/button";

import { receiptsToCsv } from "../helpers";
import { CSV_LABEL } from "../labels";
import { athensToday } from "../money";
import type { ReceiptRow } from "../types";

interface ReceiptsCsvButtonProps {
  rows: readonly ReceiptRow[];
}

// Εξαγωγή CSV των γραμμών της σελίδας, στον browser. Δεν ξαναφέρνει δεδομένα.
export function ReceiptsCsvButton({ rows }: ReceiptsCsvButtonProps) {
  const handleExport = () => {
    const blob = new Blob([receiptsToCsv(rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `eispraxeis-${athensToday()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button type="button" variant="ghost" onClick={handleExport}>
      {CSV_LABEL}
    </Button>
  );
}
