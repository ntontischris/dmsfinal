"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

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
import { Box, Step } from "./n-parts";

function Message({ state }: { state: FormState<unknown> }) {
  if (!state.error && !state.notice) return null;
  return (
    <p className="note" role={state.error ? "alert" : "status"}>
      {state.error ?? state.notice}
    </p>
  );
}

// Δεύτερο βήμα της αποθήκευσης: τα ονόματα από τη βάση, και μόνο μετά η αποθήκευση.
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
    <div className="n-confirm" role="alertdialog" aria-label="Προεπισκόπηση">
      <p>
        <strong>{affectedText(state.data)}</strong> Ισχύει στην επόμενη ενέργειά
        τους.
      </p>
      <p className="muted">
        Η αλλαγή γράφεται στο Ίχνος, με το πριν και το μετά για κάθε Δικαίωμα.
      </p>
      <div className="ml-actions">
        <button type="button" onClick={onCancel}>
          Άκυρο
        </button>
        <button
          type="submit"
          data-primary="true"
          name="confirmed"
          value="true"
          disabled={isSaving}
        >
          {isSaving ? "Αποθήκευση…" : "Επιβεβαίωση αποθήκευσης"}
        </button>
      </div>
    </div>
  );
}

function DetailsFields({ role }: { role: RoleSummary }) {
  return (
    <div className="ml-fields">
      <label className="ml-field" htmlFor="n4-name">
        <span>Όνομα</span>
        <input
          id="n4-name"
          className="input"
          name="name"
          defaultValue={role.name}
          disabled={role.isOwner}
          required
        />
      </label>
      <label className="ml-field" htmlFor="n4-desc">
        <span>Περιγραφή</span>
        <textarea
          id="n4-desc"
          className="input"
          name="description"
          rows={2}
          defaultValue={role.description}
          disabled={role.isOwner}
        />
      </label>
    </div>
  );
}

function SaveRow(props: {
  state: RoleSaveState;
  isPending: boolean;
  isConfirming: boolean;
  onCancel: () => void;
}) {
  const { state, isPending, isConfirming } = props;
  return (
    <>
      <Message state={isConfirming ? { error: state.error } : state} />
      {isConfirming ? (
        <SavePreview
          state={state}
          isSaving={isPending}
          onCancel={props.onCancel}
        />
      ) : (
        <div className="ml-actions">
          <button type="submit" data-primary="true" disabled={isPending}>
            {isPending ? "Έλεγχος…" : "Αποθήκευση"}
          </button>
        </div>
      )}
    </>
  );
}

interface RoleEditFormProps {
  role: RoleSummary;
  permissions: readonly PermissionDef[];
}

// Στοιχεία και Δικαιώματα ενός Ρόλου σε μία φόρμα (saveRole σε δύο βήματα: πρώτα ποιους επηρεάζει, μετά αποθήκευση).
// Τα Δικαιώματα είναι η δουλειά της σελίδας: το κουτί τους είναι ανοιχτό.
export function RoleEditForm({ role, permissions }: RoleEditFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(saveRole);
  const [dismissed, setDismissed] = useState<RoleSaveState | null>(null);
  const isConfirming = Boolean(state.data) && dismissed !== state;
  const kind = KIND_LABEL[role.kind];
  return (
    <form ref={formRef} onSubmit={onSubmit} className="ml-stack">
      <input type="hidden" name="id" value={role.id} />
      <Box title="Στοιχεία" hint={`Όνομα και περιγραφή · Ρόλος ${kind}`}>
        <DetailsFields role={role} />
        <p className="muted">
          Είδος: Ρόλος {kind} (το είδος δεν αλλάζει μετά τη δημιουργία).
        </p>
      </Box>
      <Box title="Δικαιώματα" hint="Τι βλέπει και τι κάνει, ανά περιοχή" isOpen>
        <PermissionMatrix
          kind={role.kind}
          permissions={permissions}
          grants={role.grants}
          isOwner={role.isOwner}
        />
        {role.isOwner && (
          <p className="muted">
            Ο Ιδιοκτήτης έχει πάντα «Όλα» σε κάθε Δικαίωμα και επιπλέον όσα
            κάνει μόνο ο Ιδιοκτήτης. Δεν αλλάζει και δεν διαγράφεται.
          </p>
        )}
      </Box>
      {!role.isOwner && (
        <SaveRow
          state={state}
          isPending={isPending}
          isConfirming={isConfirming}
          onCancel={() => setDismissed(state)}
        />
      )}
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
    <form ref={formRef} onSubmit={onSubmit} className="ml-fields">
      <label className="ml-field" htmlFor="n4-give">
        <span>Δώσε τον Ρόλο σε…</span>
        <select
          id="n4-give"
          className="input"
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
      </label>
      {picked?.roleIds.map((roleId) => (
        <input key={roleId} type="hidden" name="role" value={roleId} />
      ))}
      <div className="ml-actions">
        <Message state={state} />
        <button type="submit" disabled={isPending || !picked}>
          {isPending ? "Αποθήκευση…" : "Δώσε τον Ρόλο"}
        </button>
      </div>
    </form>
  );
}

interface NewRoleFormProps {
  kind: RoleSummary["kind"];
  source: RoleSummary | undefined;
  cancelHref: string;
  // Είδος και αφετηρία (σύνδεσμοι-σήματα).
  chips: ReactNode;
  // Τα Δικαιώματα που θα αντιγραφούν (ο πίνακας, μόνο για ανάγνωση).
  matrix: ReactNode;
}

// «Νέος Ρόλος»: είδος και αφετηρία, όνομα, Δικαιώματα (createRole). Τα Δικαιώματα αντιγράφονται από την
// αφετηρία και αλλάζουν μετά, στη σελίδα του Ρόλου.
export function NewRoleForm({
  kind,
  source,
  cancelHref,
  chips,
  matrix,
}: NewRoleFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(createRole);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="n-steps">
      <input type="hidden" name="kind" value={kind} />
      {source && <input type="hidden" name="copyFrom" value={source.id} />}
      <Step
        no={1}
        title="Είδος και αφετηρία"
        hint="Ομάδας ή πελάτη· από το μηδέν ή αντίγραφο"
      >
        {chips}
      </Step>
      <Step no={2} title="Όνομα" hint="Όπως θα το βλέπουν όλοι">
        <div className="ml-fields">
          <label className="ml-field" htmlFor="n4-new-name">
            <span>Όνομα</span>
            <input
              id="n4-new-name"
              className="input"
              name="name"
              required
              defaultValue={source ? `${source.name} (αντίγραφο)` : ""}
              placeholder="π.χ. Μοντέρ εξωτερικός"
            />
          </label>
        </div>
      </Step>
      <Step
        no={3}
        title="Δικαιώματα"
        hint="Αλλάζουν μετά, στη σελίδα του Ρόλου"
      >
        {matrix}
        <p className="muted">
          Ο νέος Ρόλος δεν τον έχει κανείς ακόμα· η δημιουργία γράφεται στο
          Ίχνος. Τον δίνεις σε Χρήστες από τη σελίδα του ή από την Ομάδα.
        </p>
        <div className="ml-actions">
          <Message state={state} />
          <Link href={cancelHref}>Άκυρο</Link>
          <button type="submit" data-primary="true" disabled={isPending}>
            {isPending ? "Δημιουργία…" : "Δημιουργία Ρόλου"}
          </button>
        </div>
      </Step>
    </form>
  );
}
