"use client";

import { useState, type ReactNode } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

import { inviteClientUser, inviteTeamUser } from "../invitation-actions";
import type { RoleOption } from "../role-choices";
import type { PickerRole } from "./n1-adapter";
import { InviteMessage, ReactivateOffer } from "./n1-invite";
import { RolePicker } from "./n1-roles";
import { Hero, Step } from "./n-parts";

import "./n1.css";

// Η μία «Πρόσκληση» (a2): άνθρωπος της ομάδας ή άνθρωπος Πελάτη, με όποιον Ρόλο μπορείς να δώσεις, σε αριθμημένα
// βήματα (όπως η I3). Την ίδια φόρμα ανοίγουν το «+ Νέο», η σελίδα «Πρόσκληση» (N6) και οι Χρήστες του Πελάτη (N2).

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
  // Στη N6 ο τίτλος είναι το h1 της σελίδας· αλλού (N2) τίτλος τμήματος.
  isPage?: boolean;
}

const KIND_LABELS: Record<InviteKind, string> = {
  team: "Άνθρωπο της ομάδας",
  client: "Άνθρωπο Πελάτη",
};

const SEND_HINT = "Ο σύνδεσμος της πρόσκλησης ισχύει 7 μέρες";

function NameEmail() {
  return (
    <div className="ml-fields">
      <label className="ml-field">
        <span>Ονοματεπώνυμο</span>
        <input
          className="input"
          name="name"
          required
          maxLength={120}
          autoComplete="off"
          placeholder="π.χ. Χαρά Τσολάκη"
        />
      </label>
      <label className="ml-field">
        <span>Email</span>
        <input
          className="input"
          type="email"
          name="email"
          required
          autoComplete="off"
          placeholder="π.χ. chara@example.com"
        />
      </label>
    </div>
  );
}

function LocaleField() {
  return (
    <div className="ml-fields">
      <label className="ml-field">
        <span>Γλώσσα πρόσκλησης</span>
        <select className="input" name="locale" defaultValue="el">
          <option value="el">Ελληνικά</option>
          <option value="en">English</option>
        </select>
      </label>
    </div>
  );
}

function SubmitRow(props: {
  isPending: boolean;
  isDisabled: boolean;
  message: ReactNode;
}) {
  return (
    <div className="ml-actions">
      {props.message}
      <button
        type="submit"
        data-primary="true"
        disabled={props.isPending || props.isDisabled}
      >
        {props.isPending ? "Αποστολή…" : "Αποστολή πρόσκλησης"}
      </button>
    </div>
  );
}

function TeamInvite({
  roles,
  isOwner,
  first,
}: TeamInviteOptions & { first: number }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(inviteTeamUser, {
    resetOnSuccess: true,
  });
  const grantable = roles.filter((role) => role.reason === null);
  return (
    <>
      <form ref={formRef} onSubmit={onSubmit} className="n-steps">
        <Step no={first} title="Στοιχεία" hint="Όνομα και email του ανθρώπου">
          <NameEmail />
          <p className="muted" role="note">
            Αν το email ανήκει σε απενεργοποιημένο Χρήστη ομάδας, δεν στέλνεται
            πρόσκληση: προτείνεται Επανενεργοποίηση.
          </p>
        </Step>
        <Step no={first + 1} title="Ρόλοι" hint="Τι θα βλέπει και τι θα κάνει">
          <RolePicker roles={grantable} idPrefix="n1-inv" selected={[]} />
          <p className="muted" role="note">
            Δίνεις μόνο Ρόλους που δεν ξεπερνούν τα δικά σου Δικαιώματα· τον
            Ρόλο Ιδιοκτήτης τον δίνει μόνο ο Ιδιοκτήτης.{" "}
            {isOwner
              ? "Όταν άλλος (π.χ. η Διαχείριση) προσκαλεί ή αλλάζει Ρόλους, παίρνεις Ειδοποίηση («Αλλαγή πρόσβασης ομάδας»)."
              : "Ο Ιδιοκτήτης παίρνει Ειδοποίηση για κάθε πρόσκληση ή αλλαγή Ρόλων που κάνεις («Αλλαγή πρόσβασης ομάδας»)."}
          </p>
        </Step>
        <Step no={first + 2} title="Αποστολή" hint={SEND_HINT}>
          <LocaleField />
          <SubmitRow
            isPending={isPending}
            isDisabled={grantable.length === 0}
            message={<InviteMessage state={state} />}
          />
        </Step>
      </form>
      {state.data && (
        <ReactivateOffer key={state.data.userId} user={state.data} />
      )}
    </>
  );
}

function ClientPicker({ clients, presetClientId }: ClientInviteOptions) {
  const preset = clients.find((client) => client.id === presetClientId);
  if (preset)
    return (
      <>
        <input type="hidden" name="clientId" value={preset.id} />
        <p className="muted" role="note">
          Ο Χρήστης μπαίνει στον Πελάτη «{preset.name}».
        </p>
      </>
    );
  return (
    <div className="ml-fields">
      <label className="ml-field">
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
    </div>
  );
}

function ClientInvite(options: ClientInviteOptions & { first: number }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(
    inviteClientUser,
    { resetOnSuccess: true },
  );
  return (
    <form ref={formRef} onSubmit={onSubmit} className="n-steps">
      <Step no={options.first} title="Στοιχεία" hint="Πελάτης, όνομα και email">
        <ClientPicker {...options} />
        <NameEmail />
        <p className="muted" role="note">
          Αν το email είναι ήδη Χρήστης πελάτη άλλου Πελάτη, δεν φτιάχνεται νέος
          λογαριασμός: προστίθεται εδώ και παίρνει email «προστέθηκες».
        </p>
      </Step>
      <Step
        no={options.first + 1}
        title="Ρόλος"
        hint="Τι βλέπει μέσα στον Πελάτη"
      >
        <div className="ml-fields">
          <label className="ml-field">
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
        </div>
      </Step>
      <Step no={options.first + 2} title="Αποστολή" hint={SEND_HINT}>
        <LocaleField />
        <SubmitRow
          isPending={isPending}
          isDisabled={options.clients.length === 0}
          message={<InviteMessage state={state} />}
        />
      </Step>
    </form>
  );
}

function KindChoice(props: {
  kind: InviteKind;
  onChange: (kind: InviteKind) => void;
}) {
  return (
    <Step no={1} title="Ποιον προσκαλείς" hint="Ομάδα ή Πελάτη">
      <fieldset className="n-choice">
        <legend className="n-sr-only">Ποιον προσκαλείς</legend>
        {(Object.keys(KIND_LABELS) as InviteKind[]).map((kind) => (
          <label key={kind}>
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
    </Step>
  );
}

const startKind = (props: InvitePanelProps): InviteKind => {
  if (!props.team) return "client";
  if (!props.client) return "team";
  return props.initialKind ?? "team";
};

function PanelTitle({ title, isPage }: { title: string; isPage?: boolean }) {
  if (!isPage) return <h2 className="ml-box-title">{title}</h2>;
  return (
    <Hero
      mono="+"
      tag="Νέος Χρήστης"
      title={title}
      lead="Ο άνθρωπος παίρνει email με σύνδεσμο και μπαίνει με τον Ρόλο που διαλέγεις."
      isDetail
    />
  );
}

export function InvitePanel(props: InvitePanelProps) {
  const [kind, setKind] = useState<InviteKind>(() => startKind(props));
  const hasChoice = props.team !== null && props.client !== null;
  const first = hasChoice ? 2 : 1;
  return (
    <section id="n1-invite" className="n-steps">
      <PanelTitle title={props.title} isPage={props.isPage} />
      {hasChoice && <KindChoice kind={kind} onChange={setKind} />}
      {kind === "team" && props.team && (
        <TeamInvite {...props.team} first={first} />
      )}
      {kind === "client" && props.client && (
        <ClientInvite {...props.client} first={first} />
      )}
      {props.footnote && (
        <p className="muted" role="note">
          {props.footnote}
        </p>
      )}
    </section>
  );
}
