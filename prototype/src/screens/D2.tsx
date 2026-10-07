import { findAgreement, type AgreementRecord } from "@/data/agreements";
import {
  agreementCapsOf,
  canOpenAgreement,
  type AgreementCaps,
} from "@/data/agreements-access";
import { findOpportunity } from "@/data/opportunities";
import type { RoleId } from "@/data/roles";
import { isMyOpportunity } from "@/data/sales-access";
import { findClient, memberName } from "@/data/sales";
import { ProposalDocument } from "@/screens/d5-document";
import type { D2Context } from "@/screens/d2-header";
import { actorName, blankAgreement, contactsOf } from "@/screens/d2-model";
import { D2New } from "@/screens/d2-new";
import { D2Workbench } from "@/screens/d2-workbench";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./d2.css";

const DEFAULT_ID = "ag-kypseli-launch";
const EMPTY_OPPORTUNITY_ID = "o-renewal";

const deniedReason = (caps: AgreementCaps): string =>
  caps.isScoped
    ? "Η Συμφωνία δεν σε αφορά: δεν είσαι Υπεύθυνός της ούτε του Πελάτη της."
    : caps.isClient
      ? "Βλέπεις μόνο τις Συμφωνίες σου και τις προτάσεις που σου έχουν σταλεί."
      : "Ο ρόλος σου δεν βλέπει Συμφωνίες.";

const contextOf = (
  role: RoleId,
  agreement: Pick<AgreementRecord, "clientId" | "opportunityId" | "ownerId">,
): D2Context => {
  const client = findClient(agreement.clientId);
  const opportunity = findOpportunity(agreement.opportunityId ?? undefined);
  return {
    clientName: client?.name ?? "—",
    clientHref:
      role === "client"
        ? null
        : screenHref(role, "B2", { id: agreement.clientId }),
    // Η Ευκαιρία (B4) ανοίγει μόνο για Ιδιοκτήτη, Διαχείριση και Πωλήσεις.
    opportunity:
      opportunity && ["owner", "admin", "sales"].includes(role)
      ? {
          title: opportunity.title,
          href: screenHref(role, "B4", { id: opportunity.id }),
        }
      : null,
    ownerName: memberName(agreement.ownerId),
    actor: actorName(role),
    contacts: client ? contactsOf(client) : [],
  };
};

// Νέα πρόταση για Ευκαιρία: η ίδια σελίδα, με άδειο αντίγραφο. Δεν υπάρχει χωριστός Συντάκτης.
function NewProposal({
  role,
  opportunityId,
}: {
  role: RoleId;
  opportunityId: string;
}) {
  const caps = agreementCapsOf(role);
  const opportunity = findOpportunity(opportunityId);
  const client = findClient(opportunity?.clientId);
  if (!caps.canCompose)
    return (
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        <p>Νέα πρόταση γράφει μόνο όποιος «Συντάσσει προτάσεις».</p>
      </StateNotice>
    );
  if (!opportunity || !client)
    return <StateNotice kind="empty" title="Δεν βρέθηκε η Ευκαιρία" />;
  if (caps.isScoped && !isMyOpportunity(opportunity))
    return (
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        <p>Η Ευκαιρία δεν σε αφορά: δεν είσαι ο Υπεύθυνός της.</p>
      </StateNotice>
    );
  const actor = actorName(role);
  const options = { opportunity, client, actor };
  const blanks = {
    μηνιαία: blankAgreement({ ...options, kind: "μηνιαία" }),
    εφάπαξ: blankAgreement({ ...options, kind: "εφάπαξ" }),
  } as const;
  return (
    <D2New
      blanks={blanks}
      caps={caps}
      context={contextOf(role, blanks.μηνιαία)}
    />
  );
}

function AgreementPage({ role, id }: { role: RoleId; id: string }) {
  const caps = agreementCapsOf(role);
  const agreement = findAgreement(id);
  if (!agreement)
    return <StateNotice kind="empty" title="Δεν βρέθηκε η Συμφωνία" />;
  if (!canOpenAgreement(role, agreement))
    return (
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        <p>{deniedReason(caps)}</p>
      </StateNotice>
    );
  // Ο πελάτης βλέπει την πρόταση που του στάλθηκε όπως στον Σύνδεσμο: είναι ο Υπογράφων.
  if (caps.isClient && agreement.state === "πρόταση")
    return (
      <ProposalDocument
        agreement={agreement}
        viewer="signatory"
        language="el"
      />
    );
  return (
    <D2Workbench
      key={agreement.id}
      initial={agreement}
      caps={caps}
      context={contextOf(role, agreement)}
    />
  );
}

// Σελίδα Συμφωνίας: προβολή και σύνταξη πρότασης μαζί (δεν υπάρχει D3).
export function D2({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const keep = { id: query.id, new: query.new };
  const newFor = state === "empty" ? EMPTY_OPPORTUNITY_ID : query.new;
  return (
    <div className="d2">
      <StateSwitcher role={role} code="D2" state={state} keep={keep} />
      {state === "error" ? (
        <ErrorNotice what="η Σελίδα Συμφωνίας" />
      ) : !agreementCapsOf(role).canSee ? (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>{deniedReason(agreementCapsOf(role))}</p>
        </StateNotice>
      ) : newFor ? (
        <NewProposal key={newFor} role={role} opportunityId={newFor} />
      ) : (
        <AgreementPage role={role} id={query.id ?? DEFAULT_ID} />
      )}
    </div>
  );
}
