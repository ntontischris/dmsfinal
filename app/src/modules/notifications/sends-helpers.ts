import { can, type Viewer } from "@/modules/access";

import { KIND_LABELS, SOURCE_AUTOMATION } from "./sends-labels";
import type { ClientSend } from "./sends-schema";

// Καθαρά βοηθητικά του Ιστορικού αποστολών (K3, #174): καρτέλα, φίλτρα, «Παλαιότερα», ετικέτες, Δικαιώματα.

export const SENDS_PATH = "/app/settings/sends";

export type SendsTab = "sent" | "scheduled" | "failed";
export type SendsChannel = "notification" | "email";

export interface SendsCursor {
  at: string;
  id: string;
}

export interface SendsQuery {
  tab: SendsTab;
  channel: SendsChannel | null;
  client: string | null;
  cursor: SendsCursor | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Τα id της βάσης: a<αριθμός>, o<uuid>, l<uuid>, u<md5>.
const SEND_ID = /^[aolu][0-9a-f-]{1,64}$/i;

export const parseSendsTab = (value: string | undefined): SendsTab =>
  value === "scheduled" || value === "failed" ? value : "sent";

export const parseSendsChannel = (
  value: string | undefined,
): SendsChannel | null =>
  value === "notification" || value === "email" ? value : null;

export const parseSendsClient = (value: string | undefined): string | null =>
  value && UUID.test(value) ? value : null;

// Μόνο έγκυρη στιγμή ISO μαζί με έγκυρο id, αλλιώς null (πρώτη σελίδα).
export const parseSendsCursor = (
  at: string | undefined,
  id: string | undefined,
): SendsCursor | null =>
  at &&
  id &&
  /^\d{4}-\d{2}-\d{2}T/.test(at) &&
  !Number.isNaN(Date.parse(at)) &&
  SEND_ID.test(id)
    ? { at, id }
    : null;

export const sendsHref = (query: SendsQuery): string => {
  const params = new URLSearchParams();
  if (query.tab !== "sent") params.set("tab", query.tab);
  if (query.channel) params.set("channel", query.channel);
  if (query.client) params.set("client", query.client);
  if (query.cursor) {
    params.set("before", query.cursor.at);
    params.set("beforeId", query.cursor.id);
  }
  const search = params.toString();
  return search ? `${SENDS_PATH}?${search}` : SENDS_PATH;
};

// «Τι»: το Γεγονός του Αυτοματισμού ή το είδος του Μηνύματος συστήματος.
export const whatOf = (send: ClientSend): string =>
  send.eventLabel ??
  (send.kind ? (KIND_LABELS[send.kind] ?? send.kind) : SOURCE_AUTOMATION);

const athensWhen = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// «01/02/2026, 12:00» σε ώρα Ελλάδας.
export const formatWhen = (iso: string): string => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? "" : athensWhen.format(new Date(time));
};

export interface SendsCaps {
  canView: boolean;
  canRetry: boolean;
}

// Ίδιο με τη βάση: K3 με «Διαχειρίζεται Αυτοματισμούς» ή «Βλέπει Υγεία συστήματος»· «Ξαναστείλε» μόνο με το πρώτο.
export const sendsCaps = (viewer: Viewer): SendsCaps => ({
  canView: can(viewer, "automations.manage") || can(viewer, "health.view"),
  canRetry: can(viewer, "automations.manage"),
});

// Η καρτέλα «Αποστολές» του Πελάτη: όπως το K3, ή ο Υπεύθυνος του Πελάτη. Η βάση ελέγχει και ότι βλέπει τον Πελάτη.
export const canSeeClientSends = (
  viewer: Viewer,
  managerId: string | null,
): boolean =>
  viewer.status === "signed-in" &&
  viewer.team !== null &&
  (sendsCaps(viewer).canView ||
    (managerId !== null && managerId === viewer.userId));
