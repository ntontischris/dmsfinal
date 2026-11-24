import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { initialsOf } from "@/spaces/shell/avatar";

import type { ClientDeliverableDetail, ClientVersion } from "../client-types";
import { roundsLabel } from "./h3-adapter";
import {
  answerLineOf,
  fmtDay,
  statusWordOf,
  versionWordOf,
} from "./h4-adapter";

// Κομμάτια χωρίς κατάσταση της H4: κεφαλίδα, επιλογή Έκδοσης (σύνδεσμοι ?v=), απάντηση.

// Η κεφαλίδα (μορφή I8): κατάσταση, ο τίτλος (το μοναδικό h1), είδος και γύροι, οι δύο δρόμοι πίσω.
export function H4Hero({ detail }: { detail: ClientDeliverableDetail }) {
  return (
    <header className="ml-hero h34-header">
      <span className="ml-hero-mono" aria-hidden="true">
        {initialsOf(detail.title)}
      </span>
      <div>
        <span className="h34-signals">
          <span
            className="ml-tag"
            data-tone={detail.state === "awaiting_you" ? "warn" : undefined}
          >
            {statusWordOf(detail)}
          </span>
          {detail.state === "cancelled" && (
            <span className="ml-tag" data-tone="warn">
              Ακυρώθηκε
            </span>
          )}
        </span>
        <h1>{detail.title}</h1>
        <p>
          {detail.kind} · {roundsLabel(detail.roundsUsed, detail.roundsLimit)}
        </p>
      </div>
      <div className="ml-quick">
        <Link href={hrefOf("G2", { id: detail.productionId })}>Η Παραγωγή</Link>
        <Link href={hrefOf("H1")}>Όλα τα Παραδοτέα</Link>
      </div>
    </header>
  );
}

export function VersionTabs({
  deliverableId,
  versions,
  selected,
}: {
  deliverableId: string;
  versions: readonly ClientVersion[];
  selected: number;
}) {
  return (
    <nav className="page-filters h34-pick" aria-label="Εκδόσεις">
      {versions.map((v) => (
        <Link
          key={v.number}
          scroll={false}
          aria-current={v.number === selected ? "page" : undefined}
          href={hrefOf("H2", { id: deliverableId, v: String(v.number) })}
        >
          v{v.number} · {versionWordOf(v.state)}
        </Link>
      ))}
    </nav>
  );
}

// Ποιος απάντησε σε αυτή την Έκδοση και πότε· η σημείωση της απάντησης σε εισαγωγικά.
export function AnswerLine({ version }: { version: ClientVersion }) {
  const answer = answerLineOf(version);
  if (!answer) return null;
  return (
    <p className="h34-memo">
      {answer.isApproval ? "Ενέκρινε" : "Ζήτησε αλλαγές"} η/ο {answer.by} στις{" "}
      {fmtDay(answer.when)}.{version.answerNote && <> «{version.answerNote}»</>}
    </p>
  );
}
