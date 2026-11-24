import Link from "next/link";
import type { ReactNode } from "react";
import { z } from "zod";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import type { ClientAgreement } from "../client-view-schema";
import { agreementCaps } from "../helpers";
import { SIGN_LABELS } from "../labels-public";
import { getClientAgreement, getClientCanSign } from "../queries-client";
import type { ProposalDocument } from "../types";
import { PrintButton } from "./client-print";
import {
  ClientHeader,
  ClientPeriods,
  ClientSignature,
  ClientSummary,
} from "./d2-client-parts";
import { D2Box } from "./d2-box";
import { ClientSignAction } from "./d2-client-sign";
import { SpacesProposalDocument } from "./d5-document";

import "../../finance/spaces/money-lines.css";
import "./d2.css";
import "./d2-lines.css";

const Frame = ({ children }: { children: ReactNode }) => (
  <div data-spaces>
    <div className="d2 ml-stack">{children}</div>
  </div>
);

const NOT_FOUND = (
  <Frame>
    <StateNotice kind="empty" title="Δεν βρέθηκε η Συμφωνία">
      <p>
        Βλέπεις μόνο τις Συμφωνίες σου και τις προτάσεις που σου έχουν σταλεί.
      </p>
      <p>
        <Link href={hrefOf("D1")}>Πίσω στις Συμφωνίες</Link>
      </p>
    </StateNotice>
  </Frame>
);

// Το έγγραφο όπως στον Σύνδεσμο (D5). Ο Υπογράφων (Δικαίωμα «Υπογράφει», ίδιο email) υπογράφει εδώ με κωδικό·
// οι άλλοι βλέπουν ότι η υπογραφή γίνεται από τον Σύνδεσμο που στάλθηκε με email.
function Document({
  document,
  isProposal,
  signAgreementId = null,
  isEmbedded = false,
}: {
  document: ProposalDocument;
  isProposal: boolean;
  signAgreementId?: string | null;
  isEmbedded?: boolean;
}) {
  const t = SIGN_LABELS[document.language];
  return (
    <SpacesProposalDocument
      document={document}
      language={document.language}
      isEmbedded={isEmbedded}
      footer={
        <div className="stack">
          {signAgreementId && (
            <ClientSignAction
              agreementId={signAgreementId}
              language={document.language}
            />
          )}
          {isProposal && !signAgreementId && (
            <p className="note">
              Για να υπογράψετε, ανοίξτε τον Σύνδεσμο της πρότασης που σας
              στάλθηκε με email.
            </p>
          )}
          <div className="ml-quick">
            <PrintButton label={t.print} />
          </div>
        </div>
      }
    />
  );
}

function Body({
  agreement,
  canSign,
}: {
  agreement: ClientAgreement;
  canSign: boolean;
}) {
  const { document } = agreement;
  // Ο πελάτης βλέπει την πρόταση που του στάλθηκε όπως στον Σύνδεσμο.
  if (agreement.state === "proposal")
    return document ? (
      <Document
        document={document}
        isProposal
        signAgreementId={canSign ? agreement.id : null}
      />
    ) : (
      <ErrorNotice what="το έγγραφο της πρότασης" />
    );
  return (
    <>
      <ClientHeader agreement={agreement} />
      {document && <ClientSummary agreement={agreement} document={document} />}
      {document && (
        <D2Box
          title="Το έγγραφο"
          hint="όπως το υπέγραψες, για ανάγνωση ή εκτύπωση"
        >
          <Document document={document} isProposal={false} isEmbedded />
        </D2Box>
      )}
      <ClientPeriods agreement={agreement} />
      <ClientSignature agreement={agreement} />
    </>
  );
}

// D2 Συμφωνία του Χρήστη πελάτη στη νέα εμφάνιση (prototype `screens/D2.tsx`, caps.isClient): η πρόταση ως έγγραφο,
// η Συμφωνία με το πακέτο, το έγγραφο που υπογράφηκε, τους μήνες και την υπογραφή.
// Ο Υπογράφων υπογράφει εδώ την πρόταση (b11).
export async function SpacesClientAgreement({
  agreementId,
}: {
  agreementId: string;
}) {
  const viewer = await getViewer();
  if (!agreementCaps(viewer).isClient)
    return (
      <Frame>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Τις Συμφωνίες τις βλέπει όποιος «Βλέπει Συμφωνίες».</p>
        </StateNotice>
      </Frame>
    );
  const id = z.uuid().safeParse(agreementId);
  if (!id.success) return NOT_FOUND;
  const found = await getClientAgreement(id.data);
  if (!found.ok)
    return (
      <Frame>
        <ErrorNotice what="η Σελίδα Συμφωνίας" />
      </Frame>
    );
  if (found.data === null) return NOT_FOUND;
  // Αν δεν διαβαστεί το «μπορεί να υπογράψει», μένει η σημείωση για τον Σύνδεσμο.
  const signable =
    found.data.state === "proposal" ? await getClientCanSign(id.data) : null;
  return (
    <Frame>
      <Body
        agreement={found.data}
        canSign={signable?.ok === true && signable.data}
      />
    </Frame>
  );
}
