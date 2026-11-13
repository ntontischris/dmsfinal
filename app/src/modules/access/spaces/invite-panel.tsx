"use client";

import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";
import { Panel } from "@/spaces/kit/panel";

import { inviteClientUser, inviteTeamUser } from "../invitation-actions";
import type { RoleOption } from "../role-choices";
import type { PickerRole } from "./n1-adapter";
import { InviteMessage, ReactivateOffer } from "./n1-invite";
import { RolePicker } from "./n1-roles";

import "./n1.css";

// Η μία «Πρόσκληση» (a2): άνθρωπος της ομάδας ή άνθρωπος Πελάτη, με όποιον Ρόλο μπορείς να δώσεις.
// Την ίδια φόρμα ανοίγουν το «+ Νέο», η Ομάδα (N1), η σελίδα «Πρόσκληση» (N6) και οι Χρήστες του Πελάτη (N2).

export type InviteKind = "team" | "client";

export interface TeamInviteOptions {
  roles: readonly PickerRole[];
  isOwner: boolean;
}

export interface ClientInviteOptions {
  clients: readonly RoleOption[];
  roles: readonly RoleOption[];
  // Ο Πελάτης είναι ήδη γνωστός (π.χ. από τη Σελίδα Πελάτη): δεν διαλέγεται.
  presetClientId?: string;
}

interface InvitePanelProps {
  title: string;
  team: TeamInviteOptions | null;
  client: ClientInviteOptions | null;
  initialKind?: InviteKind;
  footnote?: string;
}

const KIND_LABELS: Record<InviteKind, string> = {
  team: "Άνθρωπο της ομάδας",
  client: "Άνθρωπο Πελάτη",
};

function NameEmail() {
  return (
    <>
      <label className="n1-field">
        <span>Ονοματεπώνυμο</span>
        <input
          className="input"
          name="name"
          required
          maxLength={120}
          autoComplete="off"
        />
      </label>
      <label className="n1-field">
        <span>Email</span>
        <input
          className="input"
          type="email"
          name="email"
          required
          autoComplete="off"
        />
      </label>
    </>
  );
}

function LocaleField() {
  return (
    <label className="n1-field">
      <span>Γλώσσα πρόσκλησης</span>
      <select className="input" name="locale" defaultValue="el">
        <option value="el">Ελληνικά</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}

function SubmitRow(props: { isPending: boolean; isDisabled: boolean }) {
  return (
    <button
      type="submit"
      className="button"
      data-primary="true"
      disabled={props.isPending || props.isDisabled}
    >
      {props.isPending ? "Αποστολή…" : "Αποστολή πρόσκλησης"}
    </button>
  );
}

function TeamInvite({ roles, isOwner }: TeamInviteOptions) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(inviteTeamUser, {
    resetOnSuccess: true,
  });
  const grantable = roles.filter((role) => role.reason === null);
  return (
    <>
      <form ref={formRef} onSubmit={onSubmit} className="n1-form">
        <NameEmail />
        <p className="muted">
          Αν το email ανήκει σε απενεργοποιημένο Χρήστη ομάδας, δεν στέλνεται
          πρόσκληση: προτείνεται Επανενεργοποίηση.
        </p>
        <RolePicker roles={grantable} idPrefix="n1-inv" selected={[]} />
        <LocaleField />
        <div className="btn-row">
          <SubmitRow
            isPending={isPending}
            isDisabled={grantable.length === 0}
          />
          <InviteMessage state={state} />
        </div>
      </form>
      {state.data && (
        <ReactivateOffer key={state.data.userId} user={state.data} />
      )}
      <p className="note">
        Δίνεις μόνο Ρόλους που δεν ξεπερνούν τα δικά σου Δικαιώματα· τον Ρόλο
        Ιδιοκτήτης τον δίνει μόνο ο Ιδιοκτήτης.{" "}
        {isOwner
          ? "Όταν άλλος (π.χ. η Διαχείριση) προσκαλεί ή αλλάζει Ρόλους, παίρνεις Ειδοποίηση («Αλλαγή πρόσβασης ομάδας»)."
          : "Ο Ιδιοκτήτης παίρνει Ειδοποίηση για κάθε πρόσκληση ή αλλαγή Ρόλων που κάνεις («Αλλαγή πρόσβασης ομάδας»)."}
      </p>
    </>
  );
}

function ClientPicker({ clients, presetClientId }: ClientInviteOptions) {
  const preset = clients.find((client) => client.id === presetClientId);
  if (preset)
    return (
      <>
        <input type="hidden" name="clientId" value={preset.id} />
        <p className="note">Ο Χρήστης μπαίνει στον Πελάτη «{preset.name}».</p>
      </>
    );
  return (
    <label className="n1-field">
      <span>Πελάτης</span>
      <select className="input" name="clientId" required defaultValue="">
        <option value="" disabled>
          Διάλεξε Πελάτη
        </option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ClientInvite(options: ClientInviteOptions) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(
    inviteClientUser,
    { resetOnSuccess: true },
  );
  return (
    <form ref={formRef} onSubmit={onSubmit} className="n1-form">
      <ClientPicker {...options} />
      <NameEmail />
      <label className="n1-field">
        <span>Ρόλος πελάτη</span>
        <select className="input" name="roleId" defaultValue="">
          <option value="">Προεπιλογή (Πλήρης)</option>
          {options.roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </label>
      <LocaleField />
      <p className="note">
        Αν το email είναι ήδη Χρήστης πελάτη άλλου Πελάτη, δεν φτιάχνεται νέος
        λογαριασμός: προστίθεται εδώ και παίρνει email «προστέθηκες».
      </p>
      <div className="btn-row">
        <SubmitRow
          isPending={isPending}
          isDisabled={options.clients.length === 0}
        />
        <InviteMessage state={state} />
      </div>
    </form>
  );
}

function KindChoice(props: {
  kind: InviteKind;
  onChange: (kind: InviteKind) => void;
}) {
  return (
    <fieldset className="n1-roles">
      <legend>Ποιον προσκαλείς</legend>
      {(Object.keys(KIND_LABELS) as InviteKind[]).map((kind) => (
        <label key={kind} className="n1-role">
          <input
            type="radio"
            name="invite-kind"
            value={kind}
            checked={props.kind === kind}
            onChange={() => props.onChange(kind)}
          />
          <span>{KIND_LABELS[kind]}</span>
        </label>
      ))}
    </fieldset>
  );
}

const startKind = (props: InvitePanelProps): InviteKind => {
  if (!props.team) return "client";
  if (!props.client) return "team";
  return props.initialKind ?? "team";
};

export function InvitePanel(props: InvitePanelProps) {
  const [kind, setKind] = useState<InviteKind>(() => startKind(props));
  const hasChoice = props.team !== null && props.client !== null;
  return (
    <div id="n1-invite">
      <Panel label={props.title}>
        <div className="n1-form">
          {hasChoice && <KindChoice kind={kind} onChange={setKind} />}
          {kind === "team" && props.team && <TeamInvite {...props.team} />}
          {kind === "client" && props.client && (
            <ClientInvite {...props.client} />
          )}
          <p className="muted">
            Ο σύνδεσμος της πρόσκλησης ισχύει 7 μέρες.
            {props.footnote ? ` ${props.footnote}` : ""}
          </p>
        </div>
      </Panel>
    </div>
  );
}
