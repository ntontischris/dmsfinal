"use client";

import { useState } from "react";

import { Input, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { updateBasics } from "../actions-draft";
import { endOfTerm, formatDate } from "../helpers";
import type { AgreementDetail, Language } from "../types";

import { ActionForm } from "./action-form";
import { PeriodPlan } from "./period-plan";
import {
  FieldGrid,
  FieldWithHint,
  MutedNote,
  ReadOnlyList,
  ReadOnlyRow,
  plural,
} from "./terms-section-parts";

const LANGUAGES: readonly { value: Language; label: string }[] = [
  { value: "el", label: "Ελληνικά" },
  { value: "en", label: "English" },
];

const languageLabel = (language: Language): string =>
  LANGUAGES.find((l) => l.value === language)?.label ?? language;

const END_HINT = "Λήξη = Έναρξη + Διάρκεια − 1 μέρα.";

// Η Λήξη υπολογίζεται, δεν γράφεται: από το πλάνο όταν υπάρχει Έναρξη, αλλιώς εξηγείται πότε θα οριστεί.
const endText = (agreement: AgreementDetail): string => {
  if (agreement.kind === "one_off") return "Λήγει όταν παραδοθεί η Παραγωγή";
  if (agreement.endOn !== null) return formatDate(agreement.endOn);
  if (agreement.startOn !== null && agreement.durationMonths !== null)
    return formatDate(endOfTerm(agreement.startOn, agreement.durationMonths));
  return "ορίζεται με την Έναρξη";
};

const startText = (agreement: AgreementDetail): string =>
  agreement.startOn === null
    ? "με την υπογραφή"
    : formatDate(agreement.startOn);

function ScheduleReadOnly({ agreement }: { agreement: AgreementDetail }) {
  return (
    <ReadOnlyList>
      <ReadOnlyRow label="Τίτλος">{agreement.title}</ReadOnlyRow>
      <ReadOnlyRow label="Γλώσσα πρότασης">
        {languageLabel(agreement.language)}
      </ReadOnlyRow>
      <ReadOnlyRow label="Ισχύς πρότασης">
        {formatDate(agreement.validUntil)}
      </ReadOnlyRow>
      <ReadOnlyRow label="Έναρξη">{startText(agreement)}</ReadOnlyRow>
      {agreement.kind === "monthly" && agreement.durationMonths !== null && (
        <ReadOnlyRow label="Διάρκεια">
          {plural(agreement.durationMonths, "μήνας", "μήνες")}
        </ReadOnlyRow>
      )}
      <ReadOnlyRow label="Λήξη">{endText(agreement)}</ReadOnlyRow>
    </ReadOnlyList>
  );
}

function StartFields({ agreement }: { agreement: AgreementDetail }) {
  const [isOnSignature, setIsOnSignature] = useState(
    agreement.startOn === null,
  );
  return (
    <div className="grid content-start gap-1">
      <FieldWithHint label="Έναρξη">
        <Input
          type="date"
          name="startOn"
          defaultValue={agreement.startOn ?? ""}
          disabled={isOnSignature}
        />
      </FieldWithHint>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="startOnSignature"
          checked={isOnSignature}
          onChange={(event) => setIsOnSignature(event.target.checked)}
          className="accent-primary"
        />
        με την υπογραφή
      </label>
    </div>
  );
}

function ScheduleForm({ agreement }: { agreement: AgreementDetail }) {
  return (
    <ActionForm
      action={updateBasics}
      onlyWhenChanged submitLabel="Αποθήκευση χρονοδιαγράμματος"
    >
      <input type="hidden" name="agreementId" value={agreement.id} />
      <FieldGrid>
        <FieldWithHint label="Τίτλος">
          <Input name="title" defaultValue={agreement.title} />
        </FieldWithHint>
        <FieldWithHint label="Γλώσσα πρότασης">
          <Select name="language" defaultValue={agreement.language}>
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </FieldWithHint>
        <FieldWithHint label="Ισχύς πρότασης">
          <Input
            type="date"
            name="validUntil"
            defaultValue={agreement.validUntil}
          />
        </FieldWithHint>
        <StartFields agreement={agreement} />
        {agreement.kind === "monthly" && (
          <FieldWithHint label="Διάρκεια (μήνες)">
            <Input
              name="durationMonths"
              inputMode="numeric"
              autoComplete="off"
              defaultValue={agreement.durationMonths ?? ""}
            />
          </FieldWithHint>
        )}
      </FieldGrid>
      <MutedNote>
        Λήξη: {endText(agreement)}. {END_HINT}
      </MutedNote>
    </ActionForm>
  );
}

// Τίτλος, γλώσσα, Ισχύς, Έναρξη και Διάρκεια, και κάτω το πλάνο των Περιόδων (μηνιαία). Η Λήξη υπολογίζεται.
export function ScheduleSection({
  agreement,
  canSeeProductions,
}: {
  agreement: AgreementDetail;
  canSeeProductions: boolean;
}) {
  return (
    <Panel label="Χρονοδιάγραμμα">
      <div className="grid gap-5">
        {agreement.can.edit ? (
          <ScheduleForm agreement={agreement} />
        ) : (
          <ScheduleReadOnly agreement={agreement} />
        )}
        {agreement.kind === "monthly" && (
          <PeriodPlan
            periods={agreement.periods}
            isProposal={agreement.state === "proposal"}
            canSeeProductions={canSeeProductions}
          />
        )}
      </div>
    </Panel>
  );
}
