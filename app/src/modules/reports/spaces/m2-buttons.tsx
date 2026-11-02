"use client";

import { useRouter } from "next/navigation";

import { saveBytes, ZIP_MIME } from "@/lib/export/save";

import type { PeriodCode } from "../url";
import { exportDataset, prepareAccountantPack } from "../export/actions";
import type { DatasetCode } from "../export/datasets";
import { exportFile } from "../export/download";
import { PACK_DONE } from "../export/labels";
import { buildAccountantPack } from "../export/pack";
import type { ExportFormat } from "../export/report-export";
import { FileButton } from "./file-button";

// Τα κουμπιά της M2 (prototype `ExportButton` του `screens/m2-exports.tsx`) πάνω στις πραγματικές ενέργειες. Η βάση γράφει
// Ίχνος σε κάθε εξαγωγή· μετά την λήψη η σελίδα ξαναδιαβάζεται, ώστε η εγγραφή να φανεί στο Ιστορικό εξαγωγών.

const LOGGED = "Γράφτηκε στο Ιστορικό εξαγωγών.";

// Τα PDF έρχονται κατευθείαν από την αποθήκευση (signed URL λίγων λεπτών), όχι μέσω του server.
const fetchPdf = async (url: string): Promise<Uint8Array | null> => {
  const response = await fetch(url);
  return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
};

export function PackButton(props: { month: string; label: string }) {
  const router = useRouter();
  const task = async () => {
    const outcome = await prepareAccountantPack({ month: props.month });
    if (!outcome.ok) return { error: outcome.error };
    const pack = await buildAccountantPack(outcome.payload, fetchPdf);
    saveBytes(pack.bytes, pack.fileName, ZIP_MIME);
    router.refresh();
    return {
      notice: `${PACK_DONE(pack.pdfCount, pack.missing.length)} ${LOGGED}`,
    };
  };
  return <FileButton label={props.label} task={task} isPrimary />;
}

export function DatasetButton(props: {
  dataset: DatasetCode;
  period?: PeriodCode;
  format: ExportFormat;
  what: string;
}) {
  const router = useRouter();
  const task = async () => {
    const { dataset, period, format } = props;
    const outcome = await exportDataset({ dataset, period, format });
    if (!outcome.ok) return { error: outcome.error };
    const file = exportFile(outcome.sheets, format);
    saveBytes(file.bytes, outcome.fileName, file.mime);
    router.refresh();
    return {
      notice: [`Κατέβηκε: ${props.what}.`, outcome.notice, LOGGED]
        .filter(Boolean)
        .join(" "),
    };
  };
  return <FileButton label="Εξαγωγή" task={task} isPrimary />;
}
