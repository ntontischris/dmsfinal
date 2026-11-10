import Link from "next/link";
import type { ReactNode } from "react";
import { z } from "zod";

import { getViewer } from "@/modules/access";
import { SpacesHistoryLink } from "@/modules/audit";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { DOC_LABELS } from "../labels-public";
import { agreementCaps, athensToday } from "../helpers";
import { getAgreement, listProvisionKinds } from "../queries-agreements";
import type { AgreementCaps, AgreementDetail, KindInfo } from "../types";
import { ActionBar } from "./d2-actions";
import { CostSection, DeviationsSection } from "./d2-cost";
import { D2Header } from "./d2-header";
import {
  ChangeRequestsSection,
  RevisionsSection,
  SignatureSection,
} from "./d2-history";
import { LinesSection } from "./d2-lines";
import {
  daysToExpiry,
  isInternal,
  loadExtras,
  pendingApprovalDays,
  requestOrigin,
  type D2Extras,
} from "./d2-load";
import { usedKindsOf } from "./d2-model";
import { OutboxSection } from "./d2-outbox";
import { PeopleSection } from "./d2-people";
import { PeriodsSection, ScheduleSection } from "./d2-schedule";
import { TermsSection } from "./d2-terms";

import { SpacesProposalDocument } from "./d5-document";

// PROTOTYPE: ?variant=a|b|c (αγνοείται στην παραγωγή).
import { D2ProtoView } from "./d2-proto-view";
import { isProtoEnabled, parseVariant } from "./d2-proto-model";

import "./d2.css";

const Frame = ({ children }: { children: ReactNode }) => (
  <div data-spaces>
    <div className="d2">{children}</div>
  </div>
);

// «Όπως θα τη δει ο πελάτης»: το έγγραφο της D5 (ίδιο με τον Σύνδεσμο πρότασης)· η βάση το δίνει μόνο σε όποιον «Βλέπει ποσά».
const previewOf = (extras: D2Extras): ReactNode | null =>
  extras.preview === null ? null : (
    <div className="stack">
      <p className="note" role="note">
        {DOC_LABELS.el.preview}
      </p>
      <SpacesProposalDocument
        document={extras.preview}
        language={extras.preview.language}
      />
    </div>
  );

interface BodyProps {
  agreement: AgreementDetail;
  kinds: readonly KindInfo[];
  caps: AgreementCaps;
  extras: D2Extras;
  origin: string;
}

// Η σειρά του prototype (`screens/d2-workbench.tsx`): ενέργειες, Γραμμές, κόστος/Παρεκκλίσεις, Όροι, έναρξη/παραλήπτες,
// Περίοδοι, και στο τέλος τα εξερχόμενα και το ιστορικό.
function Body({ agreement, kinds, caps, extras, origin }: BodyProps) {
  const internal = isInternal(caps);
  const today = athensToday();
  const hasCost = agreement.cost !== null;
  const hasDeviations = agreement.deviations.length > 0 || agreement.can.edit;
  return (
    <>
      {agreement.can.closeLost && extras.isLossReasonsFailed && (
        <ErrorNotice what="οι λόγοι απώλειας (το «Κλείσιμο ως χαμένη» δεν γίνεται τώρα)" />
      )}
      <ActionBar
        agreement={agreement}
        lossReasons={extras.lossReasons}
        usedKinds={usedKindsOf(agreement, kinds)}
        today={today}
        pendingDays={pendingApprovalDays(agreement)}
        preview={previewOf(extras)}
      />
      <LinesSection
        agreement={agreement}
        kinds={kinds}
        options={extras.options}
        isOptionsFailed={extras.isOptionsFailed}
      />
      {(hasCost || hasDeviations) && (
        <div className="grid2">
          <CostSection agreement={agreement} />
          <DeviationsSection agreement={agreement} />
        </div>
      )}
      <TermsSection agreement={agreement} />
      <div className="grid2">
        <ScheduleSection agreement={agreement} />
        {internal && <PeopleSection agreement={agreement} />}
      </div>
      <PeriodsSection
        agreement={agreement}
        canSeeProductions={caps.canSeeProductions}
      />
      {internal && (
        <OutboxSection
          items={extras.outbox}
          origin={origin}
          emailSenderConnected={agreement.emailSenderConnected}
        />
      )}
      {internal && (
        <div className="grid2">
          <ChangeRequestsSection agreement={agreement} />
          <RevisionsSection agreement={agreement} />
        </div>
      )}
      <SignatureSection agreement={agreement} kinds={kinds} />
    </>
  );
}

// D2 Σελίδα Συμφωνίας στη νέα εμφάνιση (prototype `screens/D2.tsx`): όλες οι ενότητες στη μορφή του prototype, με τα
// πραγματικά δεδομένα και actions. Τι επιτρέπεται το λέει το `can` της βάσης, όπως στη σημερινή σελίδα.
export async function SpacesAgreement({
  agreementId,
  variant: variantParam,
}: {
  agreementId: string;
  variant?: string;
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
  const variant = isProtoEnabled() ? parseVariant(variantParam) : null;
  const historyLink = (
    <SpacesHistoryLink viewer={viewer} entity="agreements" id={found.data.id} />
  );
  if (variant !== null)
    return (
      <Frame>
        <D2ProtoView
          variant={variant}
          ctx={{
            agreement: found.data,
            kinds: kinds.data,
            caps,
            extras,
            origin,
            today: athensToday(),
            historyLink,
          }}
        />
      </Frame>
    );
  return (
    <Frame>
      <D2Header
        agreement={found.data}
        caps={caps}
        expiresInDays={daysToExpiry(found.data, athensToday())}
        historyLink={
          <SpacesHistoryLink
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
