"use client";

import { Field, Input, Select } from "@/components/ui/field";

import { splitWait } from "../automation-helpers";
import {
  RECIPIENT_KIND_LABELS,
  RELATIVE_LABELS,
  WAIT_UNITS,
} from "../automation-labels";
import type { Automation, EventPage } from "../automation-view-schema";

// Τα πεδία παραληπτών και χρονισμού της φόρμας Αυτοματισμού (K1, #173).

type RecipientKind = Automation["recipientKind"];

interface RecipientFieldsProps {
  page: EventPage;
  automation: Automation | null;
  kind: RecipientKind;
  onKindChange: (kind: RecipientKind) => void;
}

export function RecipientFields({
  page,
  automation,
  kind,
  onKindChange,
}: RecipientFieldsProps) {
  const kinds = (Object.keys(RECIPIENT_KIND_LABELS) as RecipientKind[]).filter(
    (value) => value !== "visitor" || page.event.hasVisitor,
  );
  const activeUsers = page.teamUsers.filter(
    (user) => user.isActive || automation?.recipientUserIds.includes(user.id),
  );
  return (
    <div className="grid gap-3">
      <Field label="Παραλήπτες">
        <Select
          name="recipientKind"
          value={kind}
          onChange={(event) =>
            onKindChange(event.target.value as RecipientKind)
          }
        >
          {kinds.map((value) => (
            <option key={value} value={value}>
              {RECIPIENT_KIND_LABELS[value]}
            </option>
          ))}
        </Select>
      </Field>
      {kind === "relative" && (
        <Field label="Ποιος">
          <Select
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
          </Select>
        </Field>
      )}
      {kind === "permission" && (
        <Field label="Δικαίωμα">
          <Select
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
          </Select>
        </Field>
      )}
      {kind === "users" && (
        <fieldset className="grid gap-1.5">
          <legend className="kit-label mb-1.5">Χρήστες</legend>
          {activeUsers.map((user) => (
            <label key={user.id} className="flex items-center gap-2 text-sm">
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
    </div>
  );
}

export function TimingFields({
  page,
  automation,
}: {
  page: EventPage;
  automation: Automation | null;
}) {
  const kind = page.event.kind;
  if (kind === "instant")
    return <p className="m-0 text-sm text-muted-foreground">Πότε: αμέσως.</p>;
  if (kind === "dated") {
    const days = automation?.offsetDays ?? -1;
    return (
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Μέρες">
          <Input
            name="offsetDays"
            type="number"
            min={0}
            max={365}
            defaultValue={Math.abs(days)}
          />
        </Field>
        <Field label="Πριν ή μετά">
          <Select
            name="offsetDirection"
            defaultValue={days < 0 ? "before" : "after"}
          >
            <option value="before">πριν από την ημερομηνία</option>
            <option value="after">
              μετά από την ημερομηνία (0 = την ίδια μέρα)
            </option>
          </Select>
        </Field>
        <Field label="Ώρα αποστολής (Ελλάδας)">
          <Input
            name="sendTime"
            type="time"
            defaultValue={automation?.sendTime ?? "09:00"}
          />
        </Field>
      </div>
    );
  }
  const wait = splitWait(automation?.waitMinutes ?? 1440);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Αναμονή (Χ)">
        <Input
          name="waitAmount"
          type="number"
          min={1}
          defaultValue={wait.amount}
        />
      </Field>
      <Field label="Μονάδα">
        <Select name="waitUnit" defaultValue={wait.unit}>
          {WAIT_UNITS.map((unit) => (
            <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
