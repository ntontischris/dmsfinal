import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";

import { requestApproval, sendProposal } from "../actions-flow";
import { formatDate, formatMoney, statusLabel } from "../helpers";
import { KIND_LABELS } from "../labels";
import { getProposalSummary } from "../queries-agreements";
import type { ProposalSummary } from "../types";

import { NoticeScope, ScopedForm } from "./agreement-actions-parts";
import { CreateAgreementForm } from "./create-agreement-form";
import { MutedNote, plural } from "./terms-section-parts";

interface ProposalPanelProps {
  opportunityId: string;
  canCreate: boolean;
  defaultTitle: string;
}

const agreementHref = (summary: ProposalSummary): string =>
  `/app/agreements/${summary.agreementId}`;

function Facts({ summary }: { summary: ProposalSummary }) {
  const rows: (string | false)[] = [
    summary.total !== null &&
      `Σύνολο ${formatMoney(summary.total)}${summary.kind === "monthly" ? " / μήνα" : " εφάπαξ"}`,
    summary.signatoryName !== null && `Υπογράφων: ${summary.signatoryName}`,
    summary.state === "proposal" && `Ισχύς: ${formatDate(summary.validUntil)}`,
    summary.linksTotal > 0 &&
      `${summary.linksOpened}/${summary.linksTotal} Σύνδεσμοι άνοιξαν`,
  ];
  return (
    <ul className="m-0 grid list-none gap-1 p-0 text-sm">
      {rows
        .filter((row): row is string => row !== false)
        .map((row) => (
          <li key={row}>{row}</li>
        ))}
    </ul>
  );
}

function Signals({ summary }: { summary: ProposalSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {summary.changeRequestsOpen > 0 && (
        <Badge tone="attention">
          Ζήτησε αλλαγές ({summary.changeRequestsOpen})
        </Badge>
      )}
      {summary.path === "awaiting_approval" && (
        <Badge tone="strong">
          Αναμένει Έγκριση ·{" "}
          {plural(summary.approvalPendingDays ?? 0, "μέρα", "μέρες")}
        </Badge>
      )}
      {summary.outboxPending > 0 && (
        <Link href={`${agreementHref(summary)}#outbox`} className="text-sm">
          {summary.outboxPending}{" "}
          {summary.outboxPending === 1
            ? "μήνυμα περιμένει"
            : "μηνύματα περιμένουν"}
        </Link>
      )}
    </div>
  );
}

// Γρήγορες ενέργειες από το B4, μόνο όσες ταιριάζουν στην κατάσταση. Την άδεια τη ζητά πάντα η βάση.
function QuickActions({ summary }: { summary: ProposalSummary }) {
  if (!summary.canDraft || summary.path !== "draft" || !summary.hasLines)
    return null;
  const approval = summary.needsApproval;
  return (
    <ScopedForm
      action={approval ? requestApproval : sendProposal}
      submitLabel={approval ? "Αίτημα έγκρισης" : "Αποστολή"}
      variant={approval ? "default" : "primary"}
      size="sm"
    >
      <input type="hidden" name="agreementId" value={summary.agreementId} />
    </ScopedForm>
  );
}

function OpenLink({ summary }: { summary: ProposalSummary }) {
  const isDraft = summary.path === "draft" && summary.canDraft;
  return (
    <Link
      href={agreementHref(summary)}
      className={buttonVariants({
        variant: isDraft ? "primary" : "default",
        size: "sm",
      })}
    >
      {isDraft ? "Σύνταξη" : "Άνοιγμα Συμφωνίας"}
    </Link>
  );
}

function SummaryBody({ summary }: { summary: ProposalSummary }) {
  return (
    <NoticeScope>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{KIND_LABELS[summary.kind]}</Badge>
          <Badge>{statusLabel(summary)}</Badge>
          <Badge>αναθεώρηση {summary.revision}</Badge>
        </div>
        <Facts summary={summary} />
        <Signals summary={summary} />
        {summary.path === "expired" && summary.canDraft && (
          <MutedNote>
            Η πρόταση έληξε: Παράταση ή κλείσιμο ως χαμένη γίνονται στη
            Συμφωνία.
          </MutedNote>
        )}
        <div className="flex flex-wrap items-start gap-2">
          <OpenLink summary={summary} />
          <QuickActions summary={summary} />
        </div>
      </div>
    </NoticeScope>
  );
}

function PanelShell({ children }: { children: ReactNode }) {
  return <Panel label="Πρόταση">{children}</Panel>;
}

// Το πάνελ «Πρόταση» της B4: δημιουργία, περίληψη και γρήγορες ενέργειες. Μία Συμφωνία ανά Ευκαιρία· τα ποσά φτάνουν
// μόνο σε όποιον «Βλέπει ποσά» (αλλιώς η βάση στέλνει null και η γραμμή του Συνόλου λείπει).
export async function ProposalPanel({
  opportunityId,
  canCreate,
  defaultTitle,
}: ProposalPanelProps) {
  const found = await getProposalSummary(opportunityId);
  if (!found.ok)
    return (
      <PanelShell>
        <Notice kind="error" title="Δεν φόρτωσε η πρόταση">
          <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
        </Notice>
      </PanelShell>
    );
  if (found.data === null)
    return (
      <PanelShell>
        {canCreate ? (
          <CreateAgreementForm
            opportunityId={opportunityId}
            defaultTitle={defaultTitle}
          />
        ) : (
          <MutedNote>Δεν υπάρχει πρόταση.</MutedNote>
        )}
      </PanelShell>
    );
  return (
    <PanelShell>
      <SummaryBody summary={found.data} />
    </PanelShell>
  );
}
