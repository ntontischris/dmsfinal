"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { useFormChanged } from "@/lib/use-form-changed";
import { useKeptForm } from "@/lib/use-kept-form";

import type { PermissionDef, RoleSummary } from "../queries";
import { affectedText } from "../role-affected";
import { saveRole, type RoleSaveState } from "../team-actions";

interface Choice {
  value: string;
  label: string;
}

const choicesFor = (permission: PermissionDef): readonly Choice[] =>
  permission.kind === "client"
    ? [
        { value: "", label: "Όχι" },
        { value: "all", label: "Ναι" },
      ]
    : [
        { value: "", label: "—" },
        ...(permission.scopes.includes("mine")
          ? [{ value: "mine", label: "Όσα με αφορούν" }]
          : []),
        { value: "all", label: "Όλα" },
      ];

interface PermissionRowProps {
  permission: PermissionDef;
  current: string;
  isLocked: boolean;
}

function PermissionRow({ permission, current, isLocked }: PermissionRowProps) {
  return (
    <li className="grid gap-2 border-b py-2 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <span className="text-sm">{permission.label}</span>
      <span
        role="radiogroup"
        aria-label={permission.label}
        className="flex flex-wrap gap-1"
      >
        {choicesFor(permission).map((choice) => (
          <label
            key={choice.value || "none"}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border px-2 py-1 text-xs has-checked:border-primary has-checked:bg-primary/10 has-checked:font-semibold has-disabled:cursor-not-allowed"
          >
            <input
              type="radio"
              name={`perm.${permission.code}`}
              value={choice.value}
              defaultChecked={current === choice.value}
              disabled={isLocked}
              className="accent-primary"
            />
            {choice.label}
          </label>
        ))}
      </span>
    </li>
  );
}

const HELP = {
  owner:
    "Ο Ιδιοκτήτης έχει πάντα «Όλα» σε κάθε Δικαίωμα, και επιπλέον όσα κάνει μόνο ο Ιδιοκτήτης.",
  team: "«Όσα με αφορούν»: μόνο ό,τι αφορά τον ίδιο τον Χρήστη. «Όλα»: όλη η εταιρεία. Φαίνονται μόνο τα Εύρη που υποστηρίζει κάθε Δικαίωμα.",
  client:
    "Τα Δικαιώματα πελάτη δεν έχουν Εύρος: καλύπτουν τον Πελάτη που έχει επιλέξει ο Χρήστης.",
};

// Δεύτερο βήμα της αποθήκευσης: τα ονόματα από τη βάση, και μόνο μετά η αποθήκευση.
function ConfirmSave({ state, isSaving, onCancel }: { state: RoleSaveState; isSaving: boolean; onCancel: () => void }) {
  if (!state.data) return null;
  return (
    <div className="grid justify-items-start gap-2 rounded-sm border px-3 py-3" role="alertdialog" aria-label="Επιβεβαίωση αποθήκευσης">
      <p className="m-0 text-sm">{affectedText(state.data)}</p>
      <p className="m-0 text-sm text-muted-foreground">
        Η αλλαγή ισχύει από την επόμενη ενέργειά τους και γράφεται στο Ίχνος (πριν → μετά).
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" type="submit" name="confirmed" value="true" disabled={isSaving}>
          {isSaving ? "Αποθήκευση…" : "Επιβεβαίωση αποθήκευσης"}
        </Button>
        <Button onClick={onCancel}>Άκυρο</Button>
      </div>
    </div>
  );
}

interface RoleEditorProps {
  role: RoleSummary;
  permissions: readonly PermissionDef[];
}

// N4: όνομα, περιγραφή και Δικαιώματα ενός Ρόλου. Ο Ιδιοκτήτης είναι κλειδωμένος: έχει πάντα «Όλα».
export function RoleEditor({ role, permissions }: RoleEditorProps) {
  const { state, isPending: isSaving, onSubmit: action, formRef: actionRef } = useKeptForm(saveRole);
  const isChanged = useFormChanged(actionRef, state.notice ? state : undefined);
  const [dismissed, setDismissed] = useState<RoleSaveState | null>(null);
  const isConfirming = Boolean(state.data) && dismissed !== state;
  const areas = [...new Set(permissions.map((p) => p.area))];
  return (
    <form ref={actionRef} onSubmit={action} className="grid gap-4">
      <input type="hidden" name="id" value={role.id} />
      <Panel label="Ρόλος">
        <div className="grid gap-3">
          <Field label="Όνομα">
            <Input
              name="name"
              defaultValue={role.name}
              disabled={role.isOwner}
              required
            />
          </Field>
          <Field label="Περιγραφή">
            <Input
              name="description"
              defaultValue={role.description}
              disabled={role.isOwner}
            />
          </Field>
          <p className="m-0 text-sm text-muted-foreground">
            Είδος: Ρόλος {role.kind === "team" ? "ομάδας" : "πελάτη"}. Το είδος
            δεν αλλάζει μετά τη δημιουργία.
          </p>
        </div>
      </Panel>
      <Panel label="Δικαιώματα">
        <p className="mt-0 mb-4 text-sm text-muted-foreground">
          {role.isOwner ? HELP.owner : HELP[role.kind]}
        </p>
        <div className="grid gap-4">
          {areas.map((area) => (
            <fieldset key={area} className="m-0 min-w-0 border-0 p-0">
              <legend className="kit-label mb-1">{area}</legend>
              <ul className="m-0 list-none p-0">
                {permissions
                  .filter((p) => p.area === area)
                  .map((permission) => (
                    <PermissionRow
                      key={permission.code}
                      permission={permission}
                      current={
                        role.isOwner
                          ? "all"
                          : (role.grants[permission.code] ?? "")
                      }
                      isLocked={role.isOwner}
                    />
                  ))}
              </ul>
            </fieldset>
          ))}
        </div>
      </Panel>
      {!role.isOwner && (
        <div className="grid justify-items-start gap-2">
          <FormMessage state={state} />
          {isConfirming ? (
            <ConfirmSave state={state} isSaving={isSaving} onCancel={() => setDismissed(state)} />
          ) : (
            isChanged && (
              <Button variant="primary" type="submit" disabled={isSaving}>
                {isSaving ? "Έλεγχος…" : "Αποθήκευση"}
              </Button>
            )
          )}
          {!isConfirming && (
            <p className="m-0 text-sm text-muted-foreground">
              Πριν από την αποθήκευση βλέπεις ποιους Χρήστες επηρεάζει. Η αλλαγή γράφεται στο Ίχνος (πριν → μετά).
            </p>
          )}
        </div>
      )}
    </form>
  );
}
