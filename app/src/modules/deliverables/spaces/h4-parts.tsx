import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { Badge } from "@/spaces/screens/shared";

import type { ClientDeliverableDetail, ClientVersion } from "../client-types";
import { roundsLabel } from "./h3-adapter";
import {
  answerLineOf,
  fmtDay,
  statusWordOf,
  versionWordOf,
} from "./h4-adapter";

// Κομμάτια χωρίς κατάσταση της H4 (prototype `screens/h4-workspace.tsx`): σήματα, καρτέλες Εκδόσεων, απάντηση.

export function H4Signals({ detail }: { detail: ClientDeliverableDetail }) {
  return (
    <header className="h34-header">
      <div className="h34-signals">
        <Badge tone={detail.state === "awaiting_you" ? "attention" : "strong"}>
          {statusWordOf(detail)}
        </Badge>
        <span className="muted">{detail.kind}</span>
        <span className="muted">
          {roundsLabel(detail.roundsUsed, detail.roundsLimit)}
        </span>
      </div>
      <Link href={hrefOf("G2", { id: detail.productionId })}>Η Παραγωγή</Link>
      <Link href={hrefOf("H1")}>Όλα τα Παραδοτέα</Link>
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
    <nav className="tabs" aria-label="Εκδόσεις">
      {versions.map((v) => (
        <Link
          key={v.number}
          className="tab"
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
