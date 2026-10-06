import Link from "next/link";

import { KYPSELI_ID, SALES_CLIENTS, findClient } from "@/data/sales";
import {
  clientInvitations,
  clientRoles,
  invitedByLabel,
  membershipsOfClient,
  teamCapsOf,
} from "@/data/team-access";
import { AnonymizeConfirm, GdprSection } from "@/screens/n2-gdpr";
import { InviteForm, PendingInvitations } from "@/screens/n2-invites";
import { MembersSection } from "@/screens/n2-members";
import { RemoveConfirm } from "@/screens/n2-remove";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./n2.css";

function ClientPicker({
  clientId,
  state,
}: {
  clientId: string;
  state?: string;
}) {
  return (
    <form className="card n2-picker" method="get" aria-label="Επιλογή Πελάτη">
      <label htmlFor="n2-client" className="muted">
        Πελάτης
      </label>
      <select
        id="n2-client"
        className="select"
        name="client"
        defaultValue={clientId}
      >
        {SALES_CLIENTS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {state && <input type="hidden" name="state" value={state} />}
      <button className="button" type="submit">
        Άνοιγμα
      </button>
    </form>
  );
}

export function N2({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = teamCapsOf(role);
  const client = findClient(query.client) ?? findClient(KYPSELI_ID);
  const header = (
    <StateSwitcher
      role={role}
      code="N2"
      state={state}
      keep={{ client: query.client }}
    />
  );
  if (!caps.canManageClientUsers) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τους Χρήστες πελάτη τους διαχειρίζονται όσοι έχουν «Προσκαλεί και
          αφαιρεί Χρήστες πελάτη» (Ιδιοκτήτης, Διαχείριση).
        </StateNotice>
      </>
    );
  }
  if (state === "error" || !client) {
    return (
      <>
        {header}
        <ErrorNotice what="τους Χρήστες πελάτη" />
      </>
    );
  }
  const isEmpty = state === "empty";
  const members = isEmpty ? [] : membershipsOfClient(client.id);
  const invitations = isEmpty ? [] : clientInvitations(client.id);
  const removing = members.find((m) => m.email === query.remove);
  return (
    <>
      {header}
      <ClientPicker clientId={client.id} state={query.state} />
      <p className="note">
        Σελίδα Πελάτη:{" "}
        <Link href={screenHref(role, "B2", { id: client.id })}>
          {client.name} (B2)
        </Link>
      </p>
      {removing && (
        <RemoveConfirm role={role} m={removing} isOwner={caps.isOwner} />
      )}
      {caps.isOwner && query.anon === "contact" && (
        <AnonymizeConfirm role={role} client={client} />
      )}
      <MembersSection
        role={role}
        members={members}
        isOwner={caps.isOwner}
      />
      <PendingInvitations invitations={invitations} labelOf={invitedByLabel} />
      <InviteForm
        title="Πρόσκληση Χρήστη πελάτη"
        roles={clientRoles()}
        clientName={client.name}
        footnote="Προεπιλογή Ρόλου πελάτη: «Πλήρης». Ο Υπογράφων της πρώτης υπογεγραμμένης Συμφωνίας προσκαλείται αυτόματα ως «Πλήρης»."
      />
      {caps.isOwner && (
        <GdprSection role={role} client={client} members={members} />
      )}
    </>
  );
}
