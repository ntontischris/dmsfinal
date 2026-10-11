import type { GoogleConfig } from "./config";
import { getAccessToken } from "./token";
import {
  calendarCreatedSchema,
  eventWriteSchema,
  listPageSchema,
  watchSchema,
  type GoogleEventBody,
  type GoogleEventWrite,
  type GoogleListPage,
  type GoogleWatch,
} from "./schemas";

// Ο πελάτης του Google Calendar API: fetch και σταθερά URL, χωρίς νέα εξάρτηση. Κάθε κλήση έχει όριο χρόνου.
// Τα μηνύματα σφάλματος δεν έχουν URL (μέσα του είναι το id του ημερολογίου) ούτε token.
const API = "https://www.googleapis.com/calendar/v3";
const CHANNEL_STOP_URL = `${API}/channels/stop`;
const REQUEST_TIMEOUT_MS = 10_000;
export const GOOGLE_TIME_ZONE = "Europe/Athens";

export class GoogleApiError extends Error {
  constructor(readonly status: number) {
    super(`google ${status}`);
    this.name = "GoogleApiError";
  }
}

export interface GoogleCalendarApi {
  createCalendar(summary: string): Promise<string>;
  shareCalendar(calendarId: string, email: string): Promise<void>;
  insertEvent(calendarId: string, body: GoogleEventBody): Promise<GoogleEventWrite>;
  patchEvent(calendarId: string, eventId: string, body: GoogleEventBody): Promise<GoogleEventWrite>;
  deleteEvent(calendarId: string, eventId: string): Promise<void>;
  listChanges(query: ChangesQuery): Promise<GoogleListPage>;
  watchEvents(input: WatchInput): Promise<GoogleWatch>;
  stopChannel(input: { id: string; resourceId: string }): Promise<void>;
}

export interface ChangesQuery {
  calendarId: string;
  syncToken?: string;
  pageToken?: string;
}

export interface WatchInput {
  calendarId: string;
  address: string;
  token: string;
  id: string;
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function callGoogle(config: GoogleConfig, method: Method, url: string, body?: unknown): Promise<unknown> {
  const token = await getAccessToken(config);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new GoogleApiError(response.status);
  return response.status === 204 ? null : response.json();
}

const calendarPath = (calendarId: string): string => `${API}/calendars/${encodeURIComponent(calendarId)}`;

const eventsPath = (calendarId: string, eventId?: string): string =>
  `${calendarPath(calendarId)}/events${eventId ? `/${encodeURIComponent(eventId)}` : ""}`;

// Τα γεγονότα που γράφουμε δεν στέλνουν ειδοποιήσεις σε καλεσμένους (sendUpdates=none).
const NO_NOTIFY = "sendUpdates=none";

export function createGoogleCalendarApi(config: GoogleConfig): GoogleCalendarApi {
  const call = (method: Method, url: string, body?: unknown) => callGoogle(config, method, url, body);
  return {
    async createCalendar(summary) {
      const created = calendarCreatedSchema.parse(
        await call("POST", `${API}/calendars`, { summary, timeZone: GOOGLE_TIME_ZONE }),
      );
      return created.id;
    },
    async shareCalendar(calendarId, email) {
      await call("POST", `${calendarPath(calendarId)}/acl?sendNotifications=true`, {
        role: "writer",
        scope: { type: "user", value: email },
      });
    },
    async insertEvent(calendarId, body) {
      return eventWriteSchema.parse(await call("POST", `${eventsPath(calendarId)}?${NO_NOTIFY}`, body));
    },
    async patchEvent(calendarId, eventId, body) {
      return eventWriteSchema.parse(await call("PATCH", `${eventsPath(calendarId, eventId)}?${NO_NOTIFY}`, body));
    },
    async deleteEvent(calendarId, eventId) {
      await call("DELETE", `${eventsPath(calendarId, eventId)}?${NO_NOTIFY}`).catch((error: unknown) => {
        if (error instanceof GoogleApiError && (error.status === 404 || error.status === 410)) return null;
        throw error;
      });
    },
    async listChanges(query) {
      return listPageSchema.parse(await call("GET", changesUrl(query)));
    },
    async watchEvents(input) {
      const body = { id: input.id, type: "web_hook", address: input.address, token: input.token };
      return watchSchema.parse(await call("POST", `${eventsPath(input.calendarId)}/watch`, body));
    },
    async stopChannel(input) {
      await call("POST", CHANNEL_STOP_URL, input);
    },
  };
}

// Ο αυξητικός συγχρονισμός (syncToken) ή η πλήρης ανάγνωση (χωρίς όριο ημερομηνίας, ώστε να έρθει nextSyncToken).
// Τα επαναλαμβανόμενα μένουν «master» (singleEvents=false)· η διαγραφή έρχεται ως status cancelled.
export function changesUrl(query: ChangesQuery): string {
  const params = new URLSearchParams({ singleEvents: "false", showDeleted: "true", maxResults: "250" });
  if (query.syncToken) params.set("syncToken", query.syncToken);
  if (query.pageToken) params.set("pageToken", query.pageToken);
  return `${eventsPath(query.calendarId)}?${params.toString()}`;
}
