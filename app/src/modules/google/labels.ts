import type { DeleteHours, NewEventRule } from "./types";

export const NEW_EVENT_LABELS: Record<NewEventRule, string> = {
  blocked: "Κλεισμένος χρόνος της ομάδας",
  none: "Τίποτα",
};

export const DELETE_HOURS_LABELS: Record<`${DeleteHours}`, string> = {
  "12": "12 ώρες",
  "24": "24 ώρες",
  "48": "48 ώρες",
};

export const CALENDAR_NAME = "Devre Media · Γυρίσματα";
