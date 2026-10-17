import { retryStuckEvent } from "../actions";
import { ACTIONS_NOTE, EVENTS, formatAt, redNote } from "../labels";
import type { HealthView } from "../schemas";
import { eventsAreRed, sectionVerdict } from "../status";
import { ConfirmAction } from "./confirm-action";
import { HealthCard } from "./health-card";

// Τα Γεγονότα που κόλλησαν (5 αποτυχημένες προσπάθειες) με «Ξαναδοκίμασε», και όσα περιμένουν πάνω από 15′ (Γεγονός 53).
export function EventsCard({ view }: { view: HealthView }) {
  const { events } = view;
  const isRed = eventsAreRed(view);
  return (
    <HealthCard title={EVENTS.title} verdict={sectionVerdict(isRed)}>
      {events.stuck.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">{EVENTS.empty}</p>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {events.stuck.map((event) => (
            <li
              key={event.id}
              className="grid gap-1 border-t pt-2 first:border-t-0 first:pt-0"
              data-event={event.id}
            >
              <span>{event.what}</span>
              <span className="text-sm text-muted-foreground">
                {EVENTS.since} {formatAt(event.at)} ·{" "}
                {EVENTS.attempts(event.attempts)}
                {event.reason && ` · ${event.reason}`}
              </span>
              <div>
                <ConfirmAction
                  label={EVENTS.retry}
                  confirm={EVENTS.retryConfirm}
                  action={retryStuckEvent}
                  fields={{ id: String(event.id) }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {events.waiting > 0 && (
        <p className="m-0 text-sm">{EVENTS.waiting(events.waiting)}</p>
      )}
      {isRed && (
        <p className="m-0 text-sm text-muted-foreground">
          {ACTIONS_NOTE} {redNote(53)}
        </p>
      )}
    </HealthCard>
  );
}
