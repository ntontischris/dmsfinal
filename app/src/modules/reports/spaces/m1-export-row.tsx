"use client";

import { saveBytes } from "@/lib/export/save";

import type { ReportFilters } from "../catalog";
import { exportReport } from "../export/actions";
import { exportFile } from "../export/download";
import { FileButton } from "./file-button";

// «Εξαγωγή σε Excel» κάτω από κάθε Αναφορά (prototype `ExportRow` των m1-finance-parts / m1-sales-parts), με τα ίδια φίλτρα
// της διεύθυνσης. Η βάση ξαναελέγχει Δικαίωμα και πηγή και γράφει Ίχνος (export_report).
export function ExportRow(props: {
  family: "finance" | "sales";
  reportId: string;
  filters: ReportFilters;
}) {
  const { reportId, filters } = props;
  const task = async () => {
    const outcome = await exportReport({
      reportId,
      period: filters.period,
      clientId: filters.clientId,
      sellerId: filters.sellerId,
      format: "xlsx",
    });
    if (!outcome.ok) return { error: outcome.error };
    const file = exportFile(outcome.sheets, "xlsx");
    saveBytes(file.bytes, outcome.fileName, file.mime);
    return { notice: "Κατέβηκε το αρχείο Excel της Αναφοράς." };
  };
  return (
    <div className={props.family === "finance" ? "m1f-export" : "m1s-export"}>
      <FileButton label="Εξαγωγή σε Excel" task={task} />
      <span className="muted">
        Βγάζει ό,τι βλέπεις, με τα ίδια φίλτρα. Γράφεται στο Ίχνος ενεργειών.
      </span>
    </div>
  );
}
