import Link from "next/link";
import type { ReactNode } from "react";
import { z } from "zod";

import { getViewer } from "@/modules/access";
import { AuditHistoryLink } from "@/modules/audit";
import { Steps } from "@/spaces/kit/steps";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { AgreementActions } from "../components/agreement-actions";
import { proposalSteps } from "../components/agreement-header";
import { CostSection } from "../components/cost-section";
import { DeviationsSection } from "../components/deviations-section";
import { HistorySections } from "../components/history-sections";
import { LinesSection } from "../components/lines-section";
import { OutboxSection } from "../components/outbox-section";
import { PeopleSection } from "../components/people-section";
import { ProposalPreview } from "../components/proposal-preview";
import { ScheduleSection } from "../components/schedule-section";
import { TermsSection } from "../components/terms-section";
import { agreementCaps, athensToday, statusLabel } from "../helpers";
import { KIND_LABELS } from "../labels";
import { getAgreement, listProvisionKinds } from "../queries-agreements";
import type { AgreementCaps, AgreementDetail, KindInfo } from "../types";
import {
  daysToExpiry,
  isInternal,
  loadExtras,
  pendingApprovalDays,
  requestOrigin,
  type D2Extras,
} from "./d2-load";

import "./d2.css";

const Frame = ({ children }: { children: ReactNode }) => (
  <div data-spaces>
    <div className="d2">{children}</div>
  </div>
);

// Οι ενότητες της σημερινής σελίδας μπαίνουν όπως είναι (με τα πραγματικά πεδία και ενέργειές τους), ως [data-tw].
const Embedded = ({ children }: { children: ReactNode }) => (
  <div data-tw>{children}</div>
);

interface HeaderProps {
  agreement: AgreementDetail;
  caps: AgreementCaps;
  expiresInDays: number | null;
  historyLink: ReactNode;
}

// Η κεφαλίδα του prototype (`screens/d2-header.tsx`): τίτλος, Πελάτης · Ευκαιρία · Υπεύθυνος, σήματα και η πορεία.
function D2Header({
  agreement,
  caps,
  expiresInDays,
  historyLink,
}: HeaderProps) {
  const internal = isInternal(caps);
  return (
    <header className="d2-header">
      <h1>{agreement.title || "Χωρίς τίτλο"}</h1>
      <p className="muted">
        <Link href={hrefOf("B2", { id: agreement.client.id })}>
          {agreement.client.name}
        </Link>
        {" · Ευκαιρία "}
        <Link href={hrefOf("B4", { id: agreement.opportunity.id })}>
          {agreement.opportunity.title}
        </Link>
        {` · Υπεύθυνος: ${agreement.opportunity.managerName ?? "—"}`}
      </p>
      <span className="btn-row">
        <Badge tone="strong">{statusLabel(agreement)}</Badge>
        <Badge>{KIND_LABELS[agreement.kind]}</Badge>
        {internal && <Badge>αναθεώρηση {agreement.revision}</Badge>}
        {expiresInDays !== null && (
          <Badge tone="attention">
            {expiresInDays === 0
              ? "λήγει σήμερα"
              : `λήγει σε ${expiresInDays} ${expiresInDays === 1 ? "μέρα" : "μέρες"}`}
          </Badge>
        )}
        {agreement.cost?.isLowMargin === true && (
          <Badge tone="attention">χαμηλό περιθώριο</Badge>
        )}
        {!caps.canDraft && <Badge>Μόνο ανάγνωση</Badge>}
        <span data-tw>{historyLink}</span>
      </span>
      <Steps
        steps={proposalSteps(agreement.path)}
        label="Πορεία της πρότασης"
      />
    </header>
  );
}

interface BodyProps {
  agreement: AgreementDetail;
  kinds: readonly KindInfo[];
  caps: AgreementCaps;
  extras: D2Extras;
  origin: string;
}

function Body({ agreement, kinds, caps, extras, origin }: BodyProps) {
  const internal = isInternal(caps);
  return (
    <div className="stack">
      {agreement.can.closeLost && extras.isLossReasonsFailed && (
        <ErrorNotice what="οι λόγοι απώλειας (το «Κλείσιμο ως χαμένη» δεν γίνεται τώρα)" />
      )}
      <Embedded>
        <div className="grid gap-4">
          <div className="empty:hidden">
            <AgreementActions
              agreement={agreement}
              lossReasons={extras.lossReasons}
              kinds={kinds}
              today={athensToday()}
              pendingDays={pendingApprovalDays(agreement)}
            />
          </div>
          <ProposalPreview document={extras.preview} />
          <LinesSection
            agreement={agreement}
            kinds={kinds}
            options={extras.options}
            isOptionsFailed={extras.isOptionsFailed}
          />
          <div className="grid items-start gap-4 lg:grid-cols-2 lg:[&>*:only-child]:col-span-2">
            <CostSection agreement={agreement} />
            <DeviationsSection agreement={agreement} />
          </div>
          <TermsSection agreement={agreement} />
          <div className="grid items-start gap-4 lg:grid-cols-2 lg:[&>*:only-child]:col-span-2">
            <ScheduleSection
              agreement={agreement}
              canSeeProductions={caps.canSeeProductions}
            />
            {internal && <PeopleSection agreement={agreement} />}
          </div>
          {internal && (
            <OutboxSection
              items={extras.outbox}
              origin={origin}
              emailSenderConnected={agreement.emailSenderConnected}
            />
          )}
          <HistorySections
            agreement={agreement}
            kinds={kinds}
            isInternal={internal}
          />
        </div>
      </Embedded>
    </div>
  );
}

// D2 Σελίδα Συμφωνίας στη νέα εμφάνιση: κεφαλίδα του prototype με πραγματικά δεδομένα· οι ενότητες (γραμμές, κόστος,
// Όροι, χρονοδιάγραμμα, παραλήπτες, εξερχόμενα, ιστορικό) και οι ενέργειες είναι οι σημερινές, ως έχουν.
export async function SpacesAgreement({
  agreementId,
}: {
  agreementId: string;
}) {
  const viewer = await getViewer();
  const caps = agreementCaps(viewer);
  if (!caps.canView)
    return (
      <Frame>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Τις Συμφωνίες τις βλέπει όποιος «Βλέπει Συμφωνίες».</p>
        </StateNotice>
      </Frame>
    );
  const missing = (
    <Frame>
      <StateNotice
        kind="empty"
        title="Αυτή η Συμφωνία δεν υπάρχει ή δεν σε αφορά"
      >
        <p>
          Μια Συμφωνία φαίνεται στον Υπεύθυνο της Ευκαιρίας ή του Πελάτη και σε
          όσους βλέπουν όλες τις Συμφωνίες.
        </p>
        <p>
          <Link href={hrefOf("D1")}>Πίσω στις Συμφωνίες</Link>
        </p>
      </StateNotice>
    </Frame>
  );
  const id = z.uuid().safeParse(agreementId);
  if (!id.success) return missing;
  const [found, kinds] = await Promise.all([
    getAgreement(id.data),
    listProvisionKinds(),
  ]);
  if (!found.ok || !kinds.ok)
    return (
      <Frame>
        <ErrorNotice what="η Σελίδα Συμφωνίας" />
      </Frame>
    );
  if (found.data === null) return missing;
  const [extras, origin] = await Promise.all([
    loadExtras(found.data, caps),
    requestOrigin(),
  ]);
  return (
    <Frame>
      <D2Header
        agreement={found.data}
        caps={caps}
        expiresInDays={daysToExpiry(found.data, athensToday())}
        historyLink={
          <AuditHistoryLink
            viewer={viewer}
            entity="agreements"
            id={found.data.id}
          />
        }
      />
      <Body
        agreement={found.data}
        kinds={kinds.data}
        caps={caps}
        extras={extras}
        origin={origin}
      />
    </Frame>
  );
}
