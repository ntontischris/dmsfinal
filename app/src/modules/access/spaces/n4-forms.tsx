"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { useKeptForm } from "@/lib/use-kept-form";
import { Panel } from "@/spaces/kit/panel";

import type { FormState } from "../schemas";
import type { PermissionDef, RoleSummary } from "../queries";
import { affectedText } from "../role-affected";
import {
  createRole,
  saveRole,
  setUserRoles,
  type RoleSaveState,
} from "../team-actions";
import { KIND_LABEL, type RoleCandidate } from "./n4-adapter";
import { PermissionMatrix } from "./n4-matrix";

function Message({ state }: { state: FormState<unknown> }) {
  if (!state.error && !state.notice) return null;
  return (
    <p className="note" role={state.error ? "alert" : "status"}>
      {state.error ?? state.notice}
    </p>
  );
}

// Δεύτερο βήμα της αποθήκευσης (prototype SavePreview): τα ονόματα από τη βάση, και μόνο μετά η αποθήκευση.
function SavePreview({
  state,
  isSaving,
  onCancel,
}: {
  state: RoleSaveState;
  isSaving: boolean;
  onCancel: () => void;
}) {
  if (!state.data) return null;
  return (
    <div className="n4-confirm" role="alertdialog" aria-label="Προεπισκόπηση">
      <p>
        <strong>{affectedText(state.data)}</strong> Ισχύει στην επόμενη ενέργειά
        τους.
      </p>
      <p className="note">
        Η αλλαγή γράφεται στο Ίχνος, με το πριν και το μετά για κάθε Δικαίωμα.
      </p>
      <div className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary="true"
          name="confirmed"
          value="true"
          disabled={isSaving}
        >
          {isSaving ? "Αποθήκευση…" : "Επιβεβαίωση αποθήκευσης"}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}

interface RoleEditFormProps {
  role: RoleSummary;
  permissions: readonly PermissionDef[];
  // Τα σήματα του Ρόλου (έτοιμος / δικός σου / κλειδωμένος).
  badges: ReactNode;
}

// Στοιχεία και Δικαιώματα ενός Ρόλου σε μία φόρμα (saveRole σε δύο βήματα: πρώτα ποιους επηρεάζει, μετά αποθήκευση).
export function RoleEditForm({ role, permissions, badges }: RoleEditFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(saveRole);
  const [dismissed, setDismissed] = useState<RoleSaveState | null>(null);
  const isConfirming = Boolean(state.data) && dismissed !== state;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="stack">
      <input type="hidden" name="id" value={role.id} />
      <Panel
        label={role.name}
        aside={<span className="btn-row">{badges}</span>}
      >
        <div className="stack">
          <label htmlFor="n4-name">Όνομα</label>
          <input
            id="n4-name"
            className="input"
            name="name"
            defaultValue={role.name}
            disabled={role.isOwner}
            required
          />
          <label htmlFor="n4-desc">Περιγραφή</label>
          <textarea
            id="n4-desc"
            className="input"
            name="description"
            rows={2}
            defaultValue={role.description}
            disabled={role.isOwner}
          />
          <p className="muted">
            Είδος: Ρόλος {KIND_LABEL[role.kind]} (το είδος δεν αλλάζει μετά τη
            δημιουργία).
          </p>
        </div>
        {role.isOwner && (
          <p className="note">
            Ο Ιδιοκτήτης έχει πάντα «Όλα» σε κάθε Δικαίωμα και επιπλέον όσα
            κάνει μόνο ο Ιδιοκτήτης. Δεν αλλάζει και δεν διαγράφεται.
          </p>
        )}
      </Panel>
      <Panel label="Δικαιώματα">
        <PermissionMatrix
          kind={role.kind}
          permissions={permissions}
          grants={role.grants}
          isOwner={role.isOwner}
        />
        {!role.isOwner && (
          <>
            <Message state={isConfirming ? { error: state.error } : state} />
            {isConfirming ? (
              <SavePreview
                state={state}
                isSaving={isPending}
                onCancel={() => setDismissed(state)}
              />
            ) : (
              <div className="btn-row n4-actions">
                <button
                  type="submit"
                  className="button"
                  data-primary="true"
                  disabled={isPending}
                >
                  {isPending ? "Έλεγχος…" : "Αποθήκευση"}
                </button>
              </div>
            )}
          </>
        )}
      </Panel>
    </form>
  );
}

// «Δώσε τον Ρόλο σε…»: οι Ρόλοι του Χρήστη + αυτός, με την πραγματική ενέργεια της Ομάδας (setUserRoles).
export function GiveRoleForm({
  candidates,
}: {
  candidates: readonly RoleCandidate[];
}) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(setUserRoles, {
    resetOnSuccess: true,
  });
  const [userId, setUserId] = useState("");
  const picked = candidates.find((c) => c.key === userId);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="stack n4-give">
      <label htmlFor="n4-give">Δώσε τον Ρόλο σε…</label>
      <select
        id="n4-give"
        className="select"
        name="userId"
        value={userId}
        onChange={(event) => setUserId(event.target.value)}
        required
      >
        <option value="" disabled>
          Διάλεξε Χρήστη
        </option>
        {candidates.map((c) => (
          <option key={c.key} value={c.key}>
            {c.name} · {c.detail}
          </option>
        ))}
      </select>
      {picked?.roleIds.map((roleId) => (
        <input key={roleId} type="hidden" name="role" value={roleId} />
      ))}
      <button
        type="submit"
        className="button"
        data-primary="true"
        disabled={isPending || !picked}
      >
        {isPending ? "Αποθήκευση…" : "Δώσε τον Ρόλο"}
      </button>
      <Message state={state} />
    </form>
  );
}

interface NewRoleFormProps {
  kind: RoleSummary["kind"];
  source: RoleSummary | undefined;
  cancelHref: string;
  // Είδος και αφετηρία (σύνδεσμοι-σήματα), πάνω από το όνομα.
  chips: ReactNode;
  // Τα Δικαιώματα που θα αντιγραφούν (ο πίνακας, μόνο για ανάγνωση).
  matrix: ReactNode;
}

// «Νέος Ρόλος»: όνομα και αφετηρία (createRole). Τα Δικαιώματα αντιγράφονται από την αφετηρία και αλλάζουν μετά,
// στη σελίδα του Ρόλου.
export function NewRoleForm({
  kind,
  source,
  cancelHref,
  chips,
  matrix,
}: NewRoleFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(createRole);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="stack">
      <input type="hidden" name="kind" value={kind} />
      {source && <input type="hidden" name="copyFrom" value={source.id} />}
      <Panel label="Νέος Ρόλος">
        {chips}
        <div className="stack">
          <label htmlFor="n4-new-name">Όνομα</label>
          <input
            id="n4-new-name"
            className="input"
            name="name"
            required
            defaultValue={source ? `${source.name} (αντίγραφο)` : ""}
            placeholder="π.χ. Μοντέρ εξωτερικός"
          />
        </div>
      </Panel>
      <Panel label="Δικαιώματα">
        {matrix}
        <Message state={state} />
        <div className="btn-row n4-actions">
          <button
            type="submit"
            className="button"
            data-primary="true"
            disabled={isPending}
          >
            {isPending ? "Δημιουργία…" : "Δημιουργία Ρόλου"}
          </button>
          <Link className="button" href={cancelHref}>
            Άκυρο
          </Link>
        </div>
        <p className="note">
          Ο νέος Ρόλος δεν τον έχει κανείς ακόμα· η δημιουργία γράφεται στο
          Ίχνος. Τα Δικαιώματα αλλάζουν μετά, στη σελίδα του Ρόλου, από όπου τον
          δίνεις και σε Χρήστες (ή από την Ομάδα).
        </p>
      </Panel>
    </form>
  );
}
