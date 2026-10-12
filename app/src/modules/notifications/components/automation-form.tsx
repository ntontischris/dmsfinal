"use client";

import { useState } from "react";

import { Field, Select } from "@/components/ui/field";
import { SUBJECT_FORBIDDEN } from "@/lib/email/system-texts";

import { saveAutomation } from "../actions-automations";
import {
  CHANNEL_LABELS,
  ESSENTIAL_LABEL,
  SAVE_AUTOMATION,
} from "../automation-labels";
import type { Automation, EventPage } from "../automation-view-schema";
import { ActionForm } from "./action-form";
import { RecipientFields, TimingFields } from "./automation-form-parts";
import { VariableTextFields } from "./variable-text-fields";

// Η φόρμα ενός Αυτοματισμού (K1, #173): κανάλι, παραλήπτες με τους 4 τρόπους, χρονισμός κατά το είδος, θέμα και κείμενο
// el/en με μεταβλητές, «απαραίτητο». Νέος (automation = null) ή επεξεργασία (κουμπί μόνο όταν άλλαξε κάτι).

interface AutomationFormProps {
  page: EventPage;
  automation: Automation | null;
  onSuccess?: () => void;
}

export function AutomationForm({
  page,
  automation,
  onSuccess,
}: AutomationFormProps) {
  const [channel, setChannel] = useState<Automation["channel"]>(
    automation?.channel ?? "notification",
  );
  const [kind, setKind] = useState<Automation["recipientKind"]>(
    automation?.recipientKind ?? "relative",
  );
  const idPrefix = automation?.id ?? "new";
  return (
    <ActionForm
      action={saveAutomation}
      submitLabel={SAVE_AUTOMATION}
      onlyWhenChanged={automation !== null}
      resetOnSuccess={automation === null}
      onSuccess={onSuccess}
    >
      <input type="hidden" name="id" value={automation?.id ?? ""} />
      <input type="hidden" name="eventType" value={page.event.code} />
      <input type="hidden" name="eventKind" value={page.event.kind} />
      <input
        type="hidden"
        name="variables"
        value={page.event.variables.join(",")}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Κανάλι">
          <Select
            name="channel"
            value={channel}
            onChange={(event) =>
              setChannel(event.target.value as Automation["channel"])
            }
          >
            {(Object.keys(CHANNEL_LABELS) as Automation["channel"][]).map(
              (value) => (
                <option key={value} value={value}>
                  {CHANNEL_LABELS[value]}
                </option>
              ),
            )}
          </Select>
        </Field>
      </div>
      <RecipientFields
        page={page}
        automation={automation}
        kind={kind}
        onKindChange={setKind}
      />
      <TimingFields page={page} automation={automation} />
      <VariableTextFields
        idPrefix={idPrefix}
        hasSubject={channel === "email"}
        subjectExcluded={SUBJECT_FORBIDDEN}
        variables={page.event.variables}
        values={{
          subjectEl: automation?.subjectEl ?? "",
          subjectEn: automation?.subjectEn ?? "",
          bodyEl: automation?.bodyEl ?? "",
          bodyEn: automation?.bodyEn ?? "",
        }}
      />
      {page.event.isClientFacing && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isEssential"
            defaultChecked={automation?.isEssential ?? false}
          />
          {ESSENTIAL_LABEL}
        </label>
      )}
    </ActionForm>
  );
}
