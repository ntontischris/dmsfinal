import { GOOGLE_TIME_ZONE } from "./client";
import type { GoogleEventBody, QueuedEvent } from "./schemas";

// Από το γεγονός της ουράς στο σώμα του Google. Η περιγραφή παίρνει τη διεύθυνση της εφαρμογής μπροστά από τη διαδρομή.
export function toGoogleEventBody(event: QueuedEvent, origin: string): GoogleEventBody {
  const when = event.allDay
    ? { start: { date: event.start }, end: { date: event.end } }
    : {
        start: { dateTime: event.start, timeZone: GOOGLE_TIME_ZONE },
        end: { dateTime: event.end, timeZone: GOOGLE_TIME_ZONE },
      };
  return {
    summary: event.summary,
    description: event.description ? `${origin}${event.description}` : "",
    location: event.location,
    transparency: "opaque",
    ...when,
  };
}
