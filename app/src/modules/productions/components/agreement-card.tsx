import Link from "next/link";

import { Panel } from "@/components/ui/panel";

import { INTERNAL_LABEL } from "../labels";
import type { ProductionAgreement } from "../types";

import { MutedNote } from "./form-fields";

const KIND_TEXT: Readonly<Record<string, string>> = {
  monthly: "μηνιαία",
  one_off: "εφάπαξ",
};

// Η Συμφωνία της Παραγωγής, με σύνδεσμο προς το D2. Εσωτερική Παραγωγή δεν έχει Συμφωνία.
export function AgreementCard({ agreement }: { agreement: ProductionAgreement | null }) {
  return (
    <Panel label="Συμφωνία">
      {agreement ? (
        <div className="grid gap-1 text-sm">
          <Link href={`/app/agreements/${agreement.id}`} className="font-medium">
            {agreement.title}
          </Link>
          <span className="text-muted-foreground">
            {KIND_TEXT[agreement.kind] ?? agreement.kind}
          </span>
        </div>
      ) : (
        <MutedNote>{INTERNAL_LABEL}: δεν ανήκει σε Συμφωνία.</MutedNote>
      )}
    </Panel>
  );
}
