import type { ReactNode } from "react";

import { Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { updateTerms } from "../actions-draft";
import { AUTO_RENEWAL_NOTE, RENEWAL_LABELS, UNUSED_LABELS } from "../labels";
import type { AgreementDetail, Renewal, UnusedProvisions } from "../types";

import { ActionForm } from "./action-form";
import { MilestonesEditor } from "./milestones-editor";
import { RevisionLimitsForm } from "./terms-section-limits-parts";
import {
  MoneyTermsBlock,
  TermsReadOnly,
  numberInput,
  type Baseline,
  type Terms,
} from "./terms-section-forms-parts";
import {
  CheckField,
  FieldGrid,
  FieldWithHint,
  MutedNote,
  yesNo,
} from "./terms-section-parts";

const UNUSED_CODES: readonly UnusedProvisions[] = [
  "lost",
  "next_period",
  "accumulate",
];
const RENEWAL_CODES: readonly Renewal[] = ["new_opportunity", "auto"];

// «προεπιλογή: …» κάτω από κάθε τιμή που έχει προεπιλογή (μόνο για όσους βλέπουν τις Παρεκκλίσεις).
const defaultHint = (
  baseline: Baseline,
  pick: (b: NonNullable<Baseline>) => string,
): string | undefined =>
  baseline === null ? undefined : `προεπιλογή: ${pick(baseline)}`;

function Subsection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <h3 className="kit-label m-0">{title}</h3>
      {children}
    </section>
  );
}

interface TermsFormProps {
  agreementId: string;
  terms: Terms;
  baseline: Baseline;
  isMonthly: boolean;
}

function MonthlyFields({
  terms,
  baseline,
}: Omit<TermsFormProps, "isMonthly" | "agreementId">) {
  return (
    <>
      <FieldWithHint
        label="Αχρησιμοποίητες Παροχές"
        hint={defaultHint(baseline, (b) => UNUSED_LABELS[b.unusedProvisions])}
      >
        <Select name="unusedProvisions" defaultValue={terms.unusedProvisions}>
          {UNUSED_CODES.map((code) => (
            <option key={code} value={code}>
              {UNUSED_LABELS[code]}
            </option>
          ))}
        </Select>
      </FieldWithHint>
      <FieldWithHint
        label="Περίοδος χάριτος (μέρες)"
        hint={defaultHint(baseline, (b) => String(b.graceDays))}
      >
        {numberInput("graceDays", terms.graceDays)}
      </FieldWithHint>
      <FieldWithHint
        label="Ανανέωση"
        hint={terms.renewal === "auto" ? AUTO_RENEWAL_NOTE : undefined}
      >
        <Select
          name="renewal"
          defaultValue={terms.renewal ?? "new_opportunity"}
        >
          {RENEWAL_CODES.map((code) => (
            <option key={code} value={code}>
              {RENEWAL_LABELS[code]}
            </option>
          ))}
        </Select>
      </FieldWithHint>
      <FieldWithHint
        label="Ειδοποίηση λύσης (μέρες)"
        hint={defaultHint(baseline, (b) => String(b.dissolutionNoticeDays))}
      >
        {numberInput("dissolutionNoticeDays", terms.dissolutionNoticeDays)}
      </FieldWithHint>
    </>
  );
}

function TermsForm(props: TermsFormProps) {
  const { agreementId, terms, baseline, isMonthly } = props;
  return (
    <ActionForm action={updateTerms} submitLabel="Αποθήκευση όρων">
      <input type="hidden" name="agreementId" value={agreementId} />
      <input
        type="hidden"
        name="kind"
        value={isMonthly ? "monthly" : "one_off"}
      />
      <FieldGrid>
        <FieldWithHint
          label="Μέρες πληρωμής"
          hint={defaultHint(baseline, (b) => String(b.paymentDays))}
        >
          {numberInput("paymentDays", terms.paymentDays)}
        </FieldWithHint>
        {isMonthly && <MonthlyFields terms={terms} baseline={baseline} />}
        <FieldWithHint
          label="Ελάχιστη προειδοποίηση (ώρες)"
          hint={defaultHint(baseline, (b) => String(b.filmingNoticeHours))}
        >
          {numberInput("filmingNoticeHours", terms.filmingNoticeHours)}
        </FieldWithHint>
        <FieldWithHint
          label="Όριο ακύρωσης (ώρες)"
          hint={defaultHint(baseline, (b) => String(b.filmingCancelHours))}
        >
          {numberInput("filmingCancelHours", terms.filmingCancelHours)}
        </FieldWithHint>
        <CheckField
          name="lateCancelBurns"
          label="Η αργή ακύρωση καίει Παροχή"
          defaultChecked={terms.lateCancelBurns}
          hint={defaultHint(baseline, (b) => yesNo(b.lateCancelBurns))}
        />
        <CheckField
          name="noShowBurns"
          label="Το «δεν έγινε» καίει Παροχή"
          defaultChecked={terms.noShowBurns}
          hint={defaultHint(baseline, (b) => yesNo(b.noShowBurns))}
        />
      </FieldGrid>
    </ActionForm>
  );
}

// Οι Όροι της Συμφωνίας (αντίγραφα των προεπιλογών του O3 της στιγμής της δημιουργίας). Πεδίο για όποιον μπορεί να τους αλλάξει,
// κείμενο για τους άλλους. Ό,τι είναι πιο χαλαρό από την προεπιλογή γίνεται Παρέκκλιση (ενότητα «Παρεκκλίσεις»).
export function TermsSection({ agreement }: { agreement: AgreementDetail }) {
  const { can, terms, baseline, moneyTerms } = agreement;
  const isMonthly = agreement.kind === "monthly";
  return (
    <Panel label="Όροι">
      <div className="grid gap-6">
        {can.edit ? (
          <TermsForm
            agreementId={agreement.id}
            terms={terms}
            baseline={baseline}
            isMonthly={isMonthly}
          />
        ) : (
          <TermsReadOnly terms={terms} isMonthly={isMonthly} />
        )}
        {isMonthly && moneyTerms !== null && (
          <Subsection title="Έκπτωση και ρήτρα λύσης">
            <MoneyTermsBlock
              agreementId={agreement.id}
              money={moneyTerms}
              baseline={baseline}
              canEdit={can.edit && can.editPrices}
            />
          </Subsection>
        )}
        {!isMonthly && (
          <Subsection title="Δόσεις σε ορόσημα">
            <MilestonesEditor
              agreementId={agreement.id}
              milestones={agreement.milestones}
              total={agreement.milestonesTotal}
              canEdit={can.edit}
            />
          </Subsection>
        )}
        {agreement.revisionLimits.length > 0 && (
          <Subsection title="Όριο αλλαγών">
            <RevisionLimitsForm
              agreementId={agreement.id}
              limits={agreement.revisionLimits}
              canEdit={can.edit}
            />
          </Subsection>
        )}
        {can.edit && (
          <MutedNote>
            Ό,τι είναι πιο χαλαρό από την προεπιλογή γράφεται ως Παρέκκλιση και
            θέλει Έγκριση.
          </MutedNote>
        )}
      </div>
    </Panel>
  );
}
