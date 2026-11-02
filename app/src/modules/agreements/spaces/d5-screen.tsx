
import { spacesSans } from "@/spaces/shell/font";
import { StateNotice } from "@/spaces/screens/shared";

import { LOAD_ERROR_LABEL } from "../labels-public";
import { getPublicProposal } from "../queries-public";
import type { PublicProposal } from "../types";
import { D5ActiveProposal } from "./d5-actions";
import { SpacesDeadLink } from "./d5-dead-link";

// Η σελίδα είναι εκτός του κελύφους των Χώρων: φέρνει μόνη της τα κοινά στυλ, με τη σειρά του κελύφους
// (`spaces/shell/spaces-shell.tsx`). Όλα ισχύουν μόνο κάτω από [data-look='spaces'].
import "@/spaces/styles/globals.css";
import "@/spaces/styles/kit.css";
import "@/spaces/styles/brand.css";
import "@/spaces/styles/parts.css";
import "@/spaces/styles/screens.css";
import "@/spaces/styles/page.css";
import "./d5.css";


function Body({
  proposal,
  token,
}: {
  proposal: PublicProposal;
  token: string;
}) {
  if (proposal.status === "unknown")
    return (
      <SpacesDeadLink
        kind="unknown"
        language={null}
        managerName={null}
        company={null}
      />
    );
  if (proposal.status !== "active") {
    const date =
      proposal.status === "expired"
        ? proposal.validUntil
        : proposal.status === "signed"
          ? proposal.signedAt
          : null;
    return (
      <SpacesDeadLink
        kind={proposal.status}
        language={proposal.language}
        managerName={proposal.managerName}
        company={proposal.company}
        date={date}
      />
    );
  }
  return <D5ActiveProposal proposal={proposal} token={token} />;
}

// D5 Σύνδεσμος πρότασης στη νέα εμφάνιση (prototype `screens/D5.tsx`): δημόσια σελίδα χωρίς λογαριασμό, ένας
// Σύνδεσμος ανά παραλήπτη. Ανώνυμη: δεν ξέρει Χρήστη, ομάδα ή εφαρμογή· δεν περιέχει τίποτα από το token.
export async function SpacesProposalLink({ token }: { token: string }) {
  const result = await getPublicProposal(token);
  const language =
    result.ok && result.data.status !== "unknown"
      ? result.data.language
      : undefined;
  return (
    <div data-look="spaces" className={`d5-page ${spacesSans.variable}`}>
      <main data-spaces className="d5-main" lang={language}>
        {result.ok ? (
          <Body proposal={result.data} token={token} />
        ) : (
          <StateNotice kind="error" title={LOAD_ERROR_LABEL} />
        )}
      </main>
    </div>
  );
}
