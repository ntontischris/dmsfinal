import Link from "next/link";

import {
  COMMON_VARIABLES,
  EVENT_GROUPS,
  automationsOf,
  type AppEvent,
} from "@/data/notifications";
import type { RoleId } from "@/data/roles";
import { AutomationCard } from "@/screens/k1-card";
import { HolidayList } from "@/screens/k1-holidays";
import { Badge, StateNotice, screenHref } from "@/screens/shared";

import "./k1.css";


function Variables({ event }: { event: AppEvent }) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>Μεταβλητές</h2>
      </div>
      <p className="muted">
        Γράφονται σε άγκιστρα και είναι ίδιες στα ελληνικά και στα αγγλικά
        κείμενα. Μια άγνωστη μεταβλητή δεν αποθηκεύεται. Το {"{ποσό}"} φεύγει ως
        «—» σε όσους δεν βλέπουν ποσά.
      </p>
      <div className="k1-vars">
        {[...COMMON_VARIABLES, ...event.variables].map((v) => (
          <code key={v}>{`{${v}}`}</code>
        ))}
      </div>
    </section>
  );
}

function EventHeader({ role, event }: { role: RoleId; event: AppEvent }) {
  const group = EVENT_GROUPS.find((g) => g.id === event.groupId);
  return (
    <section className="card">
      <div className="card-title">
        <h2>
          {event.id}. {event.title}
        </h2>
        <Link
          className="button"
          href={screenHref(role, "K1", { group: event.groupId })}
        >
          Πίσω στον κατάλογο
        </Link>
      </div>
      <dl className="dl">
        <dt>Ομάδα</dt>
        <dd>
          {group?.letter}. {group?.title}
        </dd>
        <dt>Είδος</dt>
        <dd>{event.kind}</dd>
        <dt>Μία περίπτωση</dt>
        <dd>{event.caseOf}</dd>
      </dl>
      {event.isCostOnly && (
        <p className="note">
          Γεγονός κόστους: οι παραλήπτες είναι κλειδωμένοι, μόνο όσοι βλέπουν
          κόστος και κερδοφορία.
        </p>
      )}
      {event.groupId === "health" && (
        <p className="note">
          Τα Γεγονότα Υγείας στέλνουν Ειδοποίηση και email σε όσους «Βλέπουν
          Υγεία συστήματος».
        </p>
      )}
    </section>
  );
}

interface EventPageProps {
  role: RoleId;
  event: AppEvent;
  isEmpty: boolean;
  isInvalid: boolean;
}

export function EventPage({ role, event, isEmpty, isInvalid }: EventPageProps) {
  const autos = isEmpty ? [] : automationsOf(event.id);
  const errorId = isInvalid ? autos[0]?.id : undefined;
  return (
    <>
      <EventHeader role={role} event={event} />
      <Variables event={event} />
      {event.id === 42 && <HolidayList />}
      {autos.length === 0 && (
        <StateNotice kind="empty" title="Αυτό το Γεγονός δεν έχει Αυτοματισμό">
          <button className="button" data-primary="true" type="button">
            Προσθήκη Αυτοματισμού
          </button>
        </StateNotice>
      )}
      {autos.map((a) => (
        <AutomationCard
          key={a.id}
          automation={a}
          event={event}
          hasError={a.id === errorId}
        />
      ))}
      <div className="btn-row">
        <button className="button" data-primary="true" type="button">
          Προσθήκη Αυτοματισμού
        </button>
        <button className="button" type="button">
          Επαναφορά αρχικών
        </button>
        {autos.some((a) => !a.isInitial) && (
          <Badge>έχει προσθήκες Διαχείρισης</Badge>
        )}
      </div>
      <p className="note">
        Η «Επαναφορά αρχικών» φέρνει πίσω τους αρχικούς Αυτοματισμούς αυτού του
        Γεγονότος (και τα κείμενά τους).
      </p>
    </>
  );
}
