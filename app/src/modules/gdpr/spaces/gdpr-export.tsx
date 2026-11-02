"use client";

import { useState, useTransition } from "react";

import { saveBytes, ZIP_MIME } from "@/lib/export/save";
import type { FormState } from "@/lib/form-state";

import { prepareGdprExport } from "../actions";
import { EXPORT_FAILED, EXPORT_WORKING, exportDone } from "../labels";
import type { SubjectKind } from "../schemas";
import { buildGdprZip } from "../zip";

// Τα PDF έρχονται κατευθείαν από την αποθήκευση (signed URL λίγων λεπτών), όχι μέσω του server.
const fetchPdf = async (url: string): Promise<Uint8Array | null> => {
  const response = await fetch(url);
  return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
};

interface ExportButtonProps {
  subjectKind: SubjectKind;
  subjectId: string;
  label: string;
}

// Το «Εξαγωγή δεδομένων» του prototype, με την πραγματική εξαγωγή: η βάση γράφει Ίχνος και δίνει τις ενότητες,
// το ZIP (JSON, CSV, PDF) φτιάχνεται εδώ και κατεβαίνει αμέσως.
export function ExportButton({
  subjectKind,
  subjectId,
  label,
}: ExportButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>({});
  const handleClick = () =>
    startTransition(async () => {
      setState({});
      try {
        const outcome = await prepareGdprExport({ subjectKind, subjectId });
        if (!outcome.ok) {
          setState({ error: outcome.error });
          return;
        }
        const zip = await buildGdprZip(outcome.payload, fetchPdf);
        saveBytes(zip.bytes, zip.fileName, ZIP_MIME);
        setState({ notice: exportDone(zip.missing.length) });
      } catch (error) {
        console.error("gdpr export", error);
        setState({ error: EXPORT_FAILED });
      }
    });
  return (
    <>
      <button
        type="button"
        className="button"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? EXPORT_WORKING : label}
      </button>
      {(state.error || state.notice) && (
        <span className="note" role={state.error ? "alert" : "status"}>
          {state.error ?? state.notice}
        </span>
      )}
    </>
  );
}
