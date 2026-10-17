"use client";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { saveBytes, ZIP_MIME } from "@/lib/export/save";

import { prepareAccountantPack } from "../actions";
import { PACK_BUTTON, PACK_DONE, PACK_WORKING } from "../labels";
import { buildAccountantPack } from "../pack";
import { useFileTask } from "./use-file-task";

// Τα PDF έρχονται κατευθείαν από την αποθήκευση (signed URL λίγων λεπτών), όχι μέσω του server.
const fetchPdf = async (url: string): Promise<Uint8Array | null> => {
  const response = await fetch(url);
  return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
};

// «Λήψη πακέτου»: ένα κουμπί για τον μήνα. Η βάση γράφει Ίχνος και δίνει γραμμές και PDF· το .zip φτιάχνεται εδώ.
export function PackDownload({ month }: { month: string }) {
  const { isPending, state, run } = useFileTask();
  const handleClick = () =>
    run(async () => {
      const outcome = await prepareAccountantPack({ month });
      if (!outcome.ok) return { error: outcome.error };
      const pack = await buildAccountantPack(outcome.payload, fetchPdf);
      saveBytes(pack.bytes, pack.fileName, ZIP_MIME);
      return { notice: PACK_DONE(pack.pdfCount, pack.missing.length) };
    });
  return (
    <div className="grid gap-2">
      <div>
        <Button variant="primary" onClick={handleClick} disabled={isPending}>
          {isPending ? PACK_WORKING : PACK_BUTTON}
        </Button>
      </div>
      <FormMessage state={state} />
    </div>
  );
}
