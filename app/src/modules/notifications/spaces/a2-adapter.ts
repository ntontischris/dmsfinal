// A2 (νέα εμφάνιση): οι πραγματικές Ειδοποιήσεις (notifications_page) και Προτιμήσεις (notification_prefs) στα σχήματα του
// prototype. Καθαρές συναρτήσεις.

import { CHANNEL_LABELS } from "../automation-labels";
import type { Pref } from "../automation-view-schema";
import { relativeTime } from "../helpers";
import type { NotificationItem } from "../view-schema";

export interface A2Item {
  id: string;
  title: string;
  sub: string;
  isRead: boolean;
}

export const a2ItemsOf = (
  items: readonly NotificationItem[],
  now: Date,
): A2Item[] =>
  items.map((item) => {
    const when = relativeTime(item.createdAt, now);
    return {
      id: item.id,
      title: item.title,
      sub: item.body ? `${when} · ${item.body}` : when,
      isRead: item.isRead,
    };
  });

export interface A2Pref {
  automationId: string;
  channel: string;
  // Το όνομα του «Λαμβάνω» για αναγνώστες οθόνης: Γεγονός · κανάλι (και αριθμός όταν το ίδιο κανάλι επαναλαμβάνεται).
  name: string;
  receive: boolean;
  canMute: boolean;
}

export interface A2PrefGroup {
  label: string;
  rows: A2Pref[];
}

// Ομαδοποίηση ανά Γεγονός, με τη σειρά που έρχονται.
export const a2PrefGroupsOf = (prefs: readonly Pref[]): A2PrefGroup[] => {
  const groups = prefs.reduce<Map<string, Pref[]>>(
    (acc, pref) =>
      acc.set(pref.eventLabel, [...(acc.get(pref.eventLabel) ?? []), pref]),
    new Map(),
  );
  return [...groups].map(([label, rows]) => ({
    label,
    rows: rows.map((pref, index) => {
      const channel = CHANNEL_LABELS[pref.channel];
      const repeat = rows
        .slice(0, index)
        .filter((row) => row.channel === pref.channel).length;
      return {
        automationId: pref.automationId,
        channel,
        name: `${label} · ${channel}${repeat > 0 ? ` ${repeat + 1}` : ""}`,
        receive: pref.receive,
        canMute: pref.canMute,
      };
    }),
  }));
};
