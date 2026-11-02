"use client";

import { useState } from "react";

import { SUBJECT_FORBIDDEN } from "@/lib/email/system-texts";

import { saveAutomation } from "../actions-automations";
import { splitWait } from "../automation-helpers";
import {
  CHANNEL_LABELS,
  RECIPIENT_KIND_LABELS,
  RELATIVE_LABELS,
  WAIT_UNITS,
} from "../automation-labels";
import type { Automation, EventPage } from "../automation-view-schema";
import { KForm } from "./k-form";
import { KTextFields } from "./k-text-fields";

// Η φόρμα ενός Αυτοματισμού στο ύφος του prototype (`k1-card.tsx`): κανάλι, παραλήπτες με τους 4 τρόπους, χρονισμός
// κατά το είδος, θέμα και κείμενο el/en, «Απαραίτητο». Ίδια πεδία με την παλιά φόρμα, πάνω στο ίδιο saveAutomation.

type RecipientKind = Automation["recipientKind"];

interface FormProps {
  page: EventPage;
  automation: Automation | null;
}

function RecipientFields({
  page,
  automation,
  kind,
  onKindChange,
}: FormProps & {
  kind: RecipientKind;
  onKindChange: (kind: RecipientKind) => void;
}) {
  const id = automation?.id ?? "new";
  const kinds = (Object.keys(RECIPIENT_KIND_LABELS) as RecipientKind[]).filter(
    (value) => value !== "visitor" || page.event.hasVisitor,
  );
  const users = page.teamUsers.filter(
    (user) => user.isActive || automation?.recipientUserIds.includes(user.id),
  );
  return (
    <>
      <label htmlFor={`${id}-kind`}>Παραλήπτες</label>
      <select
        id={`${id}-kind`}
        className="input"
        name="recipientKind"
        value={kind}
        onChange={(event) => onKindChange(event.target.value as RecipientKind)}
      >
        {kinds.map((value) => (
          <option key={value} value={value}>
            {RECIPIENT_KIND_LABELS[value]}
          </option>
        ))}
      </select>
      {kind === "relative" && (
        <>
          <label htmlFor={`${id}-relative`}>Ποιος</label>
          <select
            id={`${id}-relative`}
            className="input"
            name="recipientRelative"
            defaultValue={
              automation?.recipientRelative ?? page.event.relatives[0] ?? ""
            }
          >
            {page.event.relatives.map((value) => (
              <option key={value} value={value}>
                {RELATIVE_LABELS[value] ?? value}
              </option>
            ))}
          </select>
        </>
      )}
      {kind === "permission" && (
        <>
          <label htmlFor={`${id}-permission`}>Δικαίωμα</label>
          <select
            id={`${id}-permission`}
            className="input"
            name="recipientPermission"
            defaultValue={automation?.recipientPermission ?? ""}
          >
            <option value="">Διάλεξε Δικαίωμα</option>
            {page.permissions.map((permission) => (
              <option key={permission.code} value={permission.code}>
                {permission.kind === "client"
                  ? `Πελάτης: ${permission.label}`
                  : permission.label}
              </option>
            ))}
          </select>
        </>
      )}
      {kind === "users" && (
        <fieldset className="k1-meta" style={{ border: 0, padding: 0 }}>
          <legend className="kit-label">Χρήστες</legend>
          {users.map((user) => (
            <label key={user.id} className="k1-switch">
              <input
                type="checkbox"
                name="recipientUserIds"
                value={user.id}
                defaultChecked={
                  automation?.recipientUserIds.includes(user.id) ?? false
                }
              />
              {user.name}
              {!user.isActive && " (ανενεργός)"}
            </label>
          ))}
        </fieldset>
      )}
    </>
  );
}

function DatedFields({ automation }: { automation: Automation | null }) {
  const id = automation?.id ?? "new";
  const days = automation?.offsetDays ?? -1;
  return (
    <div className="k1-wait">
      <label htmlFor={`${id}-days`}>Μέρες</label>
      <input
        id={`${id}-days`}
        className="input"
        name="offsetDays"
        type="number"
        min={0}
        max={365}
        defaultValue={Math.abs(days)}
      />
      <select
        className="input"
        name="offsetDirection"
        aria-label="Πριν ή μετά"
        defaultValue={days < 0 ? "before" : "after"}
      >
        <option value="before">πριν από την ημερομηνία</option>
        <option value="after">
          μετά από την ημερομηνία (0 = την ίδια μέρα)
        </option>
      </select>
      <label htmlFor={`${id}-time`}>Ώρα αποστολής (Ελλάδας)</label>
      <input
        id={`${id}-time`}
        className="input"
        name="sendTime"
        type="time"
        defaultValue={automation?.sendTime ?? "09:00"}
      />
    </div>
  );
}

// Ο χρονισμός του prototype: «αμέσως», ημερομηνία ± μέρες και ώρα, ή «Χ (αναμονή)» με μονάδα.
function TimingFields({ page, automation }: FormProps) {
  const kind = page.event.kind;
  if (kind === "instant") return <p className="muted">Πότε: αμέσως.</p>;
  if (kind === "dated") return <DatedFields automation={automation} />;
  const id = automation?.id ?? "new";
  const wait = splitWait(automation?.waitMinutes ?? 1440);
  return (
    <div className="k1-wait">
      <label htmlFor={`${id}-x`}>Χ (αναμονή)</label>
      <input
        id={`${id}-x`}
        className="input"
        name="waitAmount"
        type="number"
        min={1}
        defaultValue={wait.amount}
      />
      <select
        className="input"
        name="waitUnit"
        defaultValue={wait.unit}
        aria-label="Μονάδα"
      >
        {WAIT_UNITS.map((unit) => (
          <option key={unit.value} value={unit.value}>
            {unit.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function K1AutomationForm({
  page,
  automation,
  onSuccess,
}: FormProps & { onSuccess?: () => void }) {
  const [channel, setChannel] = useState<Automation["channel"]>(
    automation?.channel ?? "notification",
  );
  const [kind, setKind] = useState<RecipientKind>(
    automation?.recipientKind ?? "relative",
  );
  const id = automation?.id ?? "new";
  return (
    <KForm
      action={saveAutomation}
      submitLabel="Αποθήκευση"
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
      <label htmlFor={`${id}-channel`}>Κανάλι</label>
      <select
        id={`${id}-channel`}
        className="input"
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
      </select>
      <RecipientFields
        page={page}
        automation={automation}
        kind={kind}
        onKindChange={setKind}
      />
      <TimingFields page={page} automation={automation} />
      <KTextFields
        idPrefix={id}
        layout="k1"
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
        <label className="k1-switch">
          <input
            type="checkbox"
            name="isEssential"
            defaultChecked={automation?.isEssential ?? false}
          />
          Απαραίτητο: ο πελάτης δεν μπορεί να το σβήσει
        </label>
      )}
    </KForm>
  );
}
