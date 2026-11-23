import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { Badge, ErrorNotice } from "@/spaces/screens/shared";

import { formatDate, formatMoney, statusLabel } from "../helpers";
import { KIND_LABELS } from "../labels";
import type { ReadResult } from "../read";
import type { ProposalSummary } from "../types";
import { CreateProposal, ProposalQuickAction } from "./b4-proposal-forms";

interface SpacesProposalPanelProps {
  opportunityId: string;
  // Η ανάγνωση getProposalSummary· τη φορτώνει η σελίδα, που τη χρειάζεται και για τα κουμπιά της.
  found: ReadResult<ProposalSummary | null>;
  canCreate: boolean;
  defaultTitle: string;
}

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

const factsOf = (summary: ProposalSummary): string[] =>
  [
    summary.total !== null &&
      `Σύνολο ${formatMoney(summary.total)}${summary.kind === "monthly" ? " / μήνα" : " εφάπαξ"}`,
    summary.signatoryName !== null && `Υπογράφων: ${summary.signatoryName}`,
    summary.state === "proposal" && `Ισχύς: ${formatDate(summary.validUntil)}`,
    summary.linksTotal > 0 &&
      `${summary.linksOpened}/${summary.linksTotal} Σύνδεσμοι άνοιξαν`,
  ].filter((row): row is string => row !== false);

function Summary({ summary }: { summary: ProposalSummary }) {
  const href = hrefOf("D2", { id: summary.agreementId });
  const isDraft = summary.path === "draft" && summary.canDraft;
  const canQuick =
    summary.canDraft && summary.path === "draft" && summary.hasLines;
  return (
    <div className="stack">
      <p className="btn-row">
        <Badge>{KIND_LABELS[summary.kind]}</Badge>
        <Badge tone="strong">{statusLabel(summary)}</Badge>
        <Badge>αναθεώρηση {summary.revision}</Badge>
        {summary.changeRequestsOpen > 0 && (
          <Badge tone="attention">
            Ζήτησε αλλαγές ({summary.changeRequestsOpen})
          </Badge>
        )}
        {summary.path === "awaiting_approval" && (
          <Badge tone="waiting">
            Αναμένει Έγκριση ·{" "}
            {plural(summary.approvalPendingDays ?? 0, "μέρα", "μέρες")}
          </Badge>
        )}
      </p>
      <ul className="list">
        {factsOf(summary).map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>
      {summary.outboxPending > 0 && (
        <p>
          <Link href={`${href}#outbox`}>
            {summary.outboxPending === 1
              ? "1 μήνυμα περιμένει"
              : `${summary.outboxPending} μηνύματα περιμένουν`}
          </Link>
        </p>
      )}
      {summary.path === "expired" && summary.canDraft && (
        <p className="muted">
          Η πρόταση έληξε: Παράταση ή κλείσιμο ως χαμένη γίνονται στη Συμφωνία.
        </p>
      )}
      <span className="btn-row">
        <Link
          className="button"
          data-primary={isDraft ? "true" : undefined}
          href={href}
        >
          {isDraft ? "Σύνταξη" : "Άνοιγμα Συμφωνίας"}
        </Link>
        {canQuick && (
          <ProposalQuickAction
            agreementId={summary.agreementId}
            needsApproval={summary.needsApproval}
          />
        )}
      </span>
    </div>
  );
}

// Η υπόδειξη του κλειστού κουτιού: είδος, κατάσταση και σύνολο (όταν το βλέπεις).
const hintOf = (found: ReadResult<ProposalSummary | null>): string => {
  if (!found.ok) return "Δεν διαβάστηκε";
  if (found.data === null) return "Δεν υπάρχει πρόταση ακόμα";
  const summary = found.data;
  return [
    KIND_LABELS[summary.kind],
    statusLabel(summary),
    summary.total !== null ? formatMoney(summary.total) : null,
  ]
    .filter((part) => part !== null)
    .join(" · ");
};

function ProposalBody({
  opportunityId,
  found,
  canCreate,
  defaultTitle,
}: SpacesProposalPanelProps) {
  if (!found.ok) return <ErrorNotice what="η πρόταση" />;
  if (found.data !== null) return <Summary summary={found.data} />;
  return (
    <>
      <p className="muted">
        Δεν υπάρχει πρόταση ακόμα. Γραμμές, Όροι, Υπογράφων και Ισχύς γράφονται
        στη Σελίδα Συμφωνίας.
      </p>
      {canCreate && (
        <CreateProposal
          opportunityId={opportunityId}
          defaultTitle={defaultTitle}
        />
      )}
    </>
  );
}

// Το κουτί «Πρόταση» της Σελίδας Ευκαιρίας (κλειστό, στη μορφή των «Χρημάτων»): δημιουργία, περίληψη και γρήγορη
// αποστολή. Μία Συμφωνία ανά Ευκαιρία· τα ποσά μόνο σε όποιον τα βλέπει. Οι γραμμές, το κόστος και το χρονολόγιο
// της πρότασης είναι στη Σελίδα Συμφωνίας (D2). Το #b4-proposal είναι μέσα στο σώμα, ώστε ο σύνδεσμος να ανοίγει το κουτί.
export function SpacesProposalPanel(props: SpacesProposalPanelProps) {
  return (
    <section>
      <details className="ml-box">
        <summary>
          <h2 className="ml-box-title">Πρόταση</h2>
          <small>{hintOf(props.found)}</small>
        </summary>
        <div id="b4-proposal" className="stack">
          <ProposalBody {...props} />
        </div>
      </details>
    </section>
  );
}
