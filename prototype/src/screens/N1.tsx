import Link from "next/link";

import { actorOf, findTeamUser, teamCapsOf } from "@/data/team-access";
import { UserDetail } from "@/screens/n1-detail";
import { GdprRequests } from "@/screens/n1-gdpr";
import { InvitationList, InviteForm } from "@/screens/n1-invite";
import { UserList } from "@/screens/n1-list";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./n1.css";

export function N1({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const keep = { ...query, state: undefined };
  const header = (
    <StateSwitcher role={role} code="N1" state={state} keep={keep} />
  );
  const actor = actorOf(role);
  if (!teamCapsOf(role).canManageTeam || !actor) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Την Ομάδα τη διαχειρίζονται όσοι έχουν «Προσκαλεί και απενεργοποιεί
          Χρήστες ομάδας» (Ιδιοκτήτης, Διαχείριση).
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="την Ομάδα" />
      </>
    );
  }
  const isOwner = role === "owner";
  if (query.user) {
    const target = findTeamUser(query.user);
    return (
      <>
        {header}
        {target ? (
          <UserDetail
            role={role}
            actor={actor}
            target={target}
            confirm={query.confirm}
          />
        ) : (
          <StateNotice kind="empty" title="Δεν βρέθηκε ο Χρήστης">
            <Link href={screenHref(role, "N1", {})}>
              Πίσω στους Χρήστες ομάδας
            </Link>
          </StateNotice>
        )}
      </>
    );
  }
  return (
    <>
      {header}
      {state === "empty" ? (
        <StateNotice kind="empty" title="Είσαι ακόμα μόνος στην ομάδα">
          Προσκάλεσε τον πρώτο Χρήστη ομάδας παρακάτω: διαλέγεις Ρόλους και του
          στέλνεται σύνδεσμος που ισχύει 7 μέρες.
        </StateNotice>
      ) : (
        <>
          <UserList role={role} query={keep} actorId={actor.id} />
          <InvitationList />
        </>
      )}
      <InviteForm role={role} actor={actor} />
      {isOwner && state !== "empty" && <GdprRequests />}
      {isOwner && (
        <p className="note">
          Τι κάνει κάθε Ρόλος (Δικαιώματα, Εύρος, νέοι Ρόλοι) αλλάζει στη{" "}
          <Link href={screenHref(role, "N4", {})}>
            Ρόλοι και Δικαιώματα (N4)
          </Link>
          .
        </p>
      )}
    </>
  );
}
