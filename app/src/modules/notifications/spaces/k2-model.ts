import type { SystemDefault } from "@/lib/email/system-defaults";

import type { SystemMessage } from "../automation-view-schema";

// K2 (νέα εμφάνιση): καθαρές συναρτήσεις του prototype (`screens/k2-model.ts`) πάνω στα πραγματικά Μηνύματα συστήματος.

export interface TextValues {
  subjectEl: string;
  subjectEn: string;
  bodyEl: string;
  bodyEn: string;
}

const athens = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Athens",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// «Άννα, 15/09/2026 10:30» σε ώρα Ελλάδας· κενό όταν το κείμενο είναι το αρχικό.
export const whenEdited = (message: SystemMessage): string => {
  if (!message.isEdited) return "";
  const time = Date.parse(message.updatedAt);
  if (Number.isNaN(time)) return message.updatedBy ?? "—";
  const parts = Object.fromEntries(
    athens.formatToParts(new Date(time)).map((part) => [part.type, part.value]),
  );
  const when = `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
  return `${message.updatedBy ?? "—"}, ${when}`;
};

// Κάθε πεδίο χωρίς κείμενο του admin (null) δείχνει το αρχικό του κώδικα.
export const valuesOf = (
  message: SystemMessage,
  defaults: SystemDefault,
): TextValues => ({
  subjectEl: message.subjectEl ?? defaults.subject.el,
  subjectEn: message.subjectEn ?? defaults.subject.en,
  bodyEl: message.bodyEl ?? defaults.body.el,
  bodyEn: message.bodyEn ?? defaults.body.en,
});

// Κενό πεδίο = το αρχικό του κώδικα, όπως θα φύγει.
export const orDefault = (value: string, fallback: string): string =>
  value.trim() ? value : fallback;
