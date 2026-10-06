import Link from "next/link";

import { findEvent } from "@/data/notifications";
import { notificationCapsOf } from "@/data/notifications-access";
import { EventPage } from "@/screens/k1-event";
import { Catalogue, K1Filters } from "@/screens/k1-list";
import { parseEventId, parseGroup, parseOnly } from "@/screens/k1-model";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./k1.css";

export function K1({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const header = (
    <StateSwitcher
      role={role}
      code="K1"
      state={state}
      keep={{
        event: query.event,
        group: query.group,
        only: query.only,
        invalid: query.invalid,
      }}
    />
  );
  if (!notificationCapsOf(role).canManage) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τους Αυτοματισμούς τους διαχειρίζονται ο Ιδιοκτήτης και η Διαχείριση.
          Τις δικές σου ειδοποιήσεις τις ρυθμίζεις από τις{" "}
          <Link href={screenHref(role, "A2", { tab: "prefs" })}>
            Προτιμήσεις
          </Link>
          .
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="τους Αυτοματισμούς" />
      </>
    );
  }
  return (
    <>
      {header}
      <Body role={role} query={query} isEmpty={state === "empty"} />
      <p className="note">
        Κανένας δεν ειδοποιείται για ό,τι έκανε ο ίδιος. Ένα νέο Γεγονός
        χρειάζεται προγραμματιστή· εδώ αλλάζεις μόνο Αυτοματισμούς και κείμενα.
        Κάθε αλλαγή γράφεται στο Ίχνος ενεργειών (ποιος, πότε, τι).
      </p>
    </>
  );
}

interface BodyProps extends ScreenProps {
  isEmpty: boolean;
}

function Body({ role, query, isEmpty }: BodyProps) {
  if (query.event === undefined) {
    return (
      <>
        <K1Filters
          role={role}
          group={parseGroup(query.group)}
          only={parseOnly(query.only)}
          state={query.state}
        />
        <Catalogue
          role={role}
          group={parseGroup(query.group)}
          only={parseOnly(query.only)}
          isEmpty={isEmpty}
        />
      </>
    );
  }
  const id = parseEventId(query.event);
  const event = id === undefined ? undefined : findEvent(id);
  if (!event) {
    return (
      <StateNotice kind="empty" title="Δεν υπάρχει αυτό το Γεγονός">
        <Link href={screenHref(role, "K1", {})}>Πίσω στον κατάλογο</Link>
      </StateNotice>
    );
  }
  return (
    <EventPage
      role={role}
      event={event}
      isEmpty={isEmpty}
      isInvalid={query.invalid === "1"}
    />
  );
}
