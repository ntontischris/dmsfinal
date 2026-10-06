import Link from "next/link";

import { SYSTEM_MESSAGES } from "@/data/notifications";
import { notificationCapsOf } from "@/data/notifications-access";
import { MessageEditor } from "@/screens/k2-editor";
import { MessageList } from "@/screens/k2-list";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./k2.css";

export function K2({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const keep = { message: query.message, invalid: query.invalid };
  const header = (
    <StateSwitcher role={role} code="K2" state={state} keep={keep} />
  );
  if (!notificationCapsOf(role).canManage) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τα Μηνύματα συστήματος τα διαχειρίζονται ο Ιδιοκτήτης και η
          Διαχείριση.
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="τα Μηνύματα συστήματος" />
      </>
    );
  }
  if (state === "empty") {
    return (
      <>
        {header}
        <StateNotice kind="empty" title="Δεν φορτώθηκαν τα Μηνύματα συστήματος">
          Είναι πάντα 5 και δεν προστίθενται ούτε διαγράφονται. Δοκίμασε ξανά σε
          λίγο.
        </StateNotice>
      </>
    );
  }
  return (
    <>
      {header}
      <Body role={role} query={query} />
    </>
  );
}

function Body({ role, query }: ScreenProps) {
  const message = SYSTEM_MESSAGES.find((m) => m.id === query.message);
  return (
    <>
      {query.message && !message && (
        <StateNotice kind="empty" title="Δεν υπάρχει αυτό το Μήνυμα">
          <Link href={screenHref(role, "K2", {})}>
            Όλα τα Μηνύματα συστήματος
          </Link>
        </StateNotice>
      )}
      {message ? (
        <MessageEditor
          role={role}
          message={message}
          isInvalid={query.invalid === "1"}
        />
      ) : (
        <MessageList role={role} messages={SYSTEM_MESSAGES} />
      )}
      <p className="note">
        Οι αυτόματες ειδοποιήσεις προς Χρήστες ρυθμίζονται στους{" "}
        <Link href={screenHref(role, "K1", {})}>Αυτοματισμούς</Link>.
      </p>
    </>
  );
}
