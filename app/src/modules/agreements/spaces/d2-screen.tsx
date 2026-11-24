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
import { D2Box } from "./d2-box";
import { CostSection, DeviationsSection } from "./d2-cost";
import { D2Header } from "./d2-header";
import {
  ChangeRequestsSection,
  RevisionsSection,
  SignatureSection,
} from "./d2-history";
import { LifecyclePanel } from "./d2-lifecycle";
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

import "../../finance/spaces/money-lines.css";
import "./d2.css";
import "./d2-lines.css";

const Frame = ({ children }: { children: ReactNode }) => (
  <div data-spaces>
    <div className="d2 ml-stack">{children}</div>
  </div>
);

// «Όπως θα τη δει ο πελάτης»: το έγγραφο της D5 (ίδιο με τον Σύνδεσμο πρότασης)· η βάση το δίνει μόνο σε όποιον «Βλέπει ποσά».
function PreviewBox({ extras }: { extras: D2Extras }) {
  if (extras.preview === null) return null;
  return (
    <D2Box title="Όπως θα τη δει ο πελάτης" hint="το έγγραφο της πρότασης">
      <p className="note" role="note">
        {DOC_LABELS.el.preview}
      </p>
      <SpacesProposalDocument
        document={extras.preview}
        language={extras.preview.language}
        isEmbedded
      />
    </D2Box>
  );
}

interface BodyProps {
  agreement: AgreementDetail;
  kinds: readonly KindInfo[];
  caps: AgreementCaps;
  extras: D2Extras;
  origin: string;
}

// Οι ενέργειες του hero: της πρότασης, λήξη/συνέχεια και η «Λήψη PDF» της υπογεγραμμένης.
function HeroActions({
  agreement,
  kinds,
  caps,
  extras,
}: Omit<BodyProps, "origin">) {
  const today = athensToday();
  return (
    <>
      <ActionBar
        agreement={agreement}
        lossReasons={extras.lossReasons}
        usedKinds={usedKindsOf(agreement, kinds)}
        today={today}
        pendingDays={pendingApprovalDays(agreement)}
      />
      {extras.lifecycle && (
        <LifecyclePanel
          agreementId={agreement.id}
          lifecycle={extras.lifecycle}
          today={today}
        />
      )}
      {agreement.signature !== null && caps.canSeeAmounts && (
        <span className="ml-quick">
          <a href={`/app/agreements/${agreement.id}/pdf`}>Λήψη PDF</a>
        </span>
      )}
    </>
  );
}

// Κάτω από το hero: κλειστά κουτιά με τη σειρά του prototype (`screens/d2-workbench.tsx`) — Γραμμές, κόστος/Παρεκκλίσεις,
// Όροι, έναρξη/παραλήπτες, Περίοδοι, εξερχόμενα, ιστορικό, υπογραφή και η προεπισκόπηση.
function Boxes({ agreement, kinds, caps, extras, origin }: BodyProps) {
  const internal = isInternal(caps);
  return (
    <>
      <LinesSection
        agreement={agreement}
        kinds={kinds}
        options={extras.options}
        isOptionsFailed={extras.isOptionsFailed}
      />
      <CostSection agreement={agreement} />
      <DeviationsSection agreement={agreement} />
      <TermsSection agreement={agreement} />
      <ScheduleSection agreement={agreement} />
      {internal && <PeopleSection agreement={agreement} />}
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
      {internal && <ChangeRequestsSection agreement={agreement} />}
      {internal && <RevisionsSection agreement={agreement} />}
      <SignatureSection agreement={agreement} kinds={kinds} />
      <PreviewBox extras={extras} />
    </>
  );
}

// D2 Σελίδα Συμφωνίας στη νέα εμφάνιση (prototype `screens/D2.tsx`): όλες οι ενότητες στη μορφή του prototype, με τα
// πραγματικά δεδομένα και actions. Τι επιτρέπεται το λέει το `can` της βάσης, όπως στη σημερινή σελίδα.
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
  const body = {
    agreement: found.data,
    kinds: kinds.data,
    caps,
    extras,
    origin,
  };
  return (
    <Frame>
      {found.data.can.closeLost && extras.isLossReasonsFailed && (
        <ErrorNotice what="οι λόγοι απώλειας (το «Κλείσιμο ως χαμένη» δεν γίνεται τώρα)" />
      )}
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
        actions={<HeroActions {...body} />}
      />
      <Boxes {...body} />
    </Frame>
  );
}
