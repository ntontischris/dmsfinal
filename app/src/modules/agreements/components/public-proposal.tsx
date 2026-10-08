import type { PublicProposal } from "../types";

import { DeadLink } from "./dead-link";
import { ProposalDocument } from "./proposal-document";
import { ProposalShell } from "./public-proposal-parts";

// Η D5 όπως τη βλέπει ο πελάτης: το έγγραφο και οι ενέργειές του, ή ο λόγος που ο Σύνδεσμος δεν ανοίγει.
// Ανώνυμη: δεν ξέρει Χρήστη, ομάδα ή εφαρμογή. Δεν περιέχει τίποτα από το token.

interface PublicProposalViewProps {
  proposal: PublicProposal;
  token: string;
}

export function PublicProposalView({
  proposal,
  token,
}: PublicProposalViewProps) {
  if (proposal.status === "unknown")
    return (
      <DeadLink
        kind="unknown"
        language={null}
        managerName={null}
        company={null}
      />
    );
  if (proposal.status !== "active") {
    const { status, language, managerName, company } = proposal;
    const date =
      proposal.status === "expired"
        ? proposal.validUntil
        : proposal.status === "signed"
          ? proposal.signedAt
          : null;
    return (
      <DeadLink
        kind={status}
        language={language}
        managerName={managerName}
        company={company}
        date={date}
      />
    );
  }
  return (
    <ProposalShell
      token={token}
      language={proposal.language}
      managerName={proposal.managerName}
      company={proposal.company}
      validUntil={proposal.validUntil}
      canSign={proposal.canSign}
      signatoryName={proposal.signatoryName}
      maskedEmail={proposal.maskedEmail}
      codeChannel={proposal.codeChannel}
    >
      <ProposalDocument
        document={proposal.document}
        language={proposal.language}
        mode="public"
      />
    </ProposalShell>
  );
}
