"use client";

import { Button } from "@/components/ui/button";

import { invoicesToCsv } from "../invoices-helpers";
import { INVOICES_CSV } from "../invoices-labels";
import type { InvoiceItem } from "../invoices-view-schema";
import { athensToday } from "../money";

interface InvoiceCsvButtonProps {
  rows: readonly InvoiceItem[];
}

// Εξαγωγή CSV των γραμμών της σελίδας (όπως φαίνονται με το φίλτρο), στον browser. Δεν ξαναφέρνει δεδομένα.
export function InvoiceCsvButton({ rows }: InvoiceCsvButtonProps) {
  const handleExport = () => {
    const blob = new Blob([invoicesToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `timologia-${athensToday()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button type="button" variant="ghost" onClick={handleExport}>
      {INVOICES_CSV}
    </Button>
  );
}
