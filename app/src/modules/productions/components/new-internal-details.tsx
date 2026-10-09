import { buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";

import { NewInternalForm } from "./new-internal-form";
import type { OwnerCandidate } from "../types";

interface NewInternalDetailsProps {
  candidates: readonly OwnerCandidate[];
}

// «Νέα Εσωτερική Παραγωγή» κλειστό από προεπιλογή: η φόρμα ανοίγει με το κουμπί, χωρίς κατάσταση στον browser.
export function NewInternalDetails({ candidates }: NewInternalDetailsProps) {
  return (
    <details className="group">
      <summary
        className={cn(
          buttonVariants({ variant: "primary" }),
          "cursor-pointer list-none",
        )}
      >
        Νέα Εσωτερική Παραγωγή
      </summary>
      <div className="mt-3 w-full max-w-xl">
        <Panel label="Στοιχεία νέας Εσωτερικής Παραγωγής">
          <NewInternalForm candidates={candidates} />
        </Panel>
      </div>
    </details>
  );
}
