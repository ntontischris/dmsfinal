import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import { buttonVariants } from "@/components/ui/button";

import type { DeliverableCandidates } from "../types";

import { NewDeliverableForm } from "./new-deliverable-form";

interface NewDeliverableDetailsProps {
  productionId: string;
  productionTitle: string;
  client: string | null;
  isInternal: boolean;
  candidates: DeliverableCandidates;
}

// «Νέο Παραδοτέο» κλειστό από προεπιλογή, όπως η «Νέα Εσωτερική Παραγωγή». Ο τίτλος προσυμπληρώνεται.
export function NewDeliverableDetails({
  productionId,
  productionTitle,
  client,
  isInternal,
  candidates,
}: NewDeliverableDetailsProps) {
  const defaultTitle = client ? `${client} — ${productionTitle}` : productionTitle;
  return (
    <details className="group">
      <summary className={cn(buttonVariants({ variant: "primary" }), "cursor-pointer list-none")}>
        Νέο Παραδοτέο
      </summary>
      <div className="mt-3 w-full max-w-xl">
        <Panel label="Στοιχεία νέου Παραδοτέου">
          <NewDeliverableForm
            productionId={productionId}
            defaultTitle={defaultTitle}
            isInternal={isInternal}
            candidates={candidates}
          />
        </Panel>
      </div>
    </details>
  );
}
