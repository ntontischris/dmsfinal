"use client";

import { useState } from "react";

import {
  currentRevision,
  deviationsOf,
  type AgreementRecord,
} from "@/data/agreements";
import type { AgreementCaps } from "@/data/agreements-access";
import { ProposalDocument } from "@/screens/d5-document";
import { ActionBar } from "@/screens/d2-action-bar";
import { CostSection, DeviationsSection } from "@/screens/d2-cost";
import { D2Header, type D2Context } from "@/screens/d2-header";
import {
  PeriodsSection,
  RevisionsSection,
  SignatureSection,
} from "@/screens/d2-history";
import { LinesSection } from "@/screens/d2-lines";
import { PeopleSection } from "@/screens/d2-people";
import { ScheduleSection } from "@/screens/d2-schedule";
import { TermsSection } from "@/screens/d2-terms";
import type { Change } from "@/screens/d2-transitions";
import type { SectionProps } from "@/screens/d2-ui";

interface WorkbenchProps {
  initial: AgreementRecord;
  caps: AgreementCaps;
  context: D2Context;
}

// Εγκεκριμένες Παρεκκλίσεις της τρέχουσας αναθεώρησης: μόνο αυτές στέλνονται χωρίς νέα Έγκριση.
const approvedOf = (agreement: AgreementRecord): readonly string[] =>
  currentRevision(agreement)?.approval?.state === "εγκρίθηκε"
    ? deviationsOf(agreement)
    : [];

function InternalSections({
  section,
  approved,
}: {
  section: SectionProps;
  approved: readonly string[];
}) {
  const { draft, caps } = section;
  if (caps.isClient) return null;
  return (
    <div className="grid2">
      {caps.canSeeCost && <CostSection draft={draft} />}
      {!caps.isReadOnly && (
        <DeviationsSection
          draft={draft}
          approved={approved}
          canDeviate={caps.canDeviate}
        />
      )}
    </div>
  );
}

// Σελίδα Συμφωνίας: προβολή και σύνταξη μαζί. Όσο είναι σε Σύνταξη, όποιος συντάσσει βλέπει πεδία.
export function D2Workbench({ initial, caps, context }: WorkbenchProps) {
  const [draft, setDraft] = useState(initial);
  const [approved, setApproved] = useState(() => approvedOf(initial));
  const [notice, setNotice] = useState<string | null>(null);
  const [hasNoContinuation, setHasNoContinuation] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isEditing =
    caps.canCompose && draft.state === "πρόταση" && draft.path === "Σύνταξη";
  const section: SectionProps = { draft, update: setDraft, isEditing, caps };
  const act = (change: Change, text: string, approves = false) => {
    const next = change(draft);
    setDraft(next);
    if (approves) setApproved(deviationsOf(next));
    setNotice(text);
  };
  const hasPeriods = draft.kind === "μηνιαία" && draft.periods.length > 0;

  return (
    <>
      <D2Header {...section} context={context} />
      <ActionBar
        draft={draft}
        caps={caps}
        actor={context.actor}
        approved={approved}
        act={act}
        notice={notice}
        notify={setNotice}
        hasNoContinuation={hasNoContinuation}
        onNoContinuation={setHasNoContinuation}
        isPreviewOpen={isPreviewOpen}
        onPreview={() => setIsPreviewOpen(!isPreviewOpen)}
      />
      {isPreviewOpen && (
        <section
          className="card d2-preview"
          aria-label="Όπως θα τη δει ο πελάτης"
        >
          <ProposalDocument
            agreement={draft}
            viewer="preview"
            language={draft.language}
          />
        </section>
      )}
      <LinesSection {...section} />
      <InternalSections section={section} approved={approved} />
      <TermsSection {...section} />
      <div className="grid2">
        <ScheduleSection {...section} />
        {!caps.isClient && (
          <PeopleSection {...section} contacts={context.contacts} />
        )}
      </div>
      {hasPeriods && <PeriodsSection draft={draft} />}
      {!caps.isClient && (
        <RevisionsSection draft={draft} showApprovals={!caps.isReadOnly} />
      )}
      <SignatureSection draft={draft} />
    </>
  );
}
