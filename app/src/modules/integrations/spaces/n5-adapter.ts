// N5 (νέα εμφάνιση): η πραγματική κατάσταση συνδέσεων και το μητρώο συνδρομών στις μορφές των καρτών του prototype.
// Καθαρές συναρτήσεις· καμία τιμή κλειδιού δεν περνά από εδώ (ούτε από το status.ts).

import type { BadgeTone } from "@/spaces/screens/shared";

import type {
  ConnectionId,
  ConnectionState,
  ConnectionStatus,
} from "../connections";
import {
  CONNECTION_TEXTS,
  STATE_LABELS,
  formatAt,
  formatDay,
  formatMoney,
  formatUsage,
  usageRatio,
} from "../labels";
import type { Subscription, SubscriptionsView } from "../schemas";

// Οι τόνοι του prototype: λειτουργεί = strong, προσοχή / δεν λειτουργεί = attention, δεν έχει στηθεί = ουδέτερο.
const STATUS_TONE: Readonly<Record<ConnectionState, BadgeTone | undefined>> = {
  ok: "strong",
  warning: "attention",
  down: "attention",
  not_set_up: undefined,
};

export interface N5Fact {
  label: string;
  value: string;
}

export interface N5Usage {
  label: string;
  text: string;
  ratio: number;
  used: number;
  limit: number;
}

export interface N5Card {
  id: ConnectionId;
  name: string;
  purpose: string;
  developerOnly: string;
  status: string;
  tone: BadgeTone | undefined;
  isDown: boolean;
  isNotSetUp: boolean;
  // Γιατί δεν λειτουργεί / τι προσέχει (ή κενό).
  warning: string | null;
  facts: readonly N5Fact[];
  usage: N5Usage | null;
  isCheckable: boolean;
}

const lastCheckOf = (item: ConnectionStatus): N5Fact[] =>
  item.lastCheck
    ? [
        {
          label: "Τελευταίος έλεγχος",
          value: `${formatAt(item.lastCheck.at)} · ${
            item.lastCheck.isOk
              ? "απάντησε"
              : `απέτυχε (${item.lastCheck.error ?? "—"})`
          }`,
        },
      ]
    : [];

export const n5CardOf = (item: ConnectionStatus): N5Card => {
  const text = CONNECTION_TEXTS[item.id];
  return {
    id: item.id,
    name: text.name,
    purpose: text.purpose,
    developerOnly: text.developerOnly,
    status: STATE_LABELS[item.state],
    tone: STATUS_TONE[item.state],
    isDown: item.state === "down",
    isNotSetUp: item.state === "not_set_up",
    warning: item.reason || null,
    facts: [
      ...lastCheckOf(item),
      ...item.models.map((model) => ({
        label: `Μοντέλο: ${model.label}`,
        value: model.id,
      })),
    ],
    usage: item.usage
      ? {
          label: item.usage.label,
          text: formatUsage(item.usage),
          ratio: usageRatio(item.usage),
          used: item.usage.used,
          limit: item.usage.limit,
        }
      : null,
    isCheckable: item.isCheckable,
  };
};

export const lastOkOf = (item: ConnectionStatus): string =>
  formatAt(item.lastSuccessAt);

export interface N5SubRow {
  id: string;
  provider: string;
  sub: string;
  amount: string;
  link: string | null;
}

const orDash = (value: string): string => value || "—";

export const n5SubRowOf = (sub: Subscription): N5SubRow => ({
  id: sub.id,
  provider: sub.provider,
  sub: `${orDash(sub.covers)} · Πλάνο: ${orDash(sub.plan)} · Λογαριασμός: ${orDash(sub.account)} · Πληρώνει: ${orDash(sub.paidBy)} · Ανανέωση: ${formatDay(sub.renewsOn)}`,
  amount: formatMoney(sub.monthlyCost, sub.currency),
  link: sub.link || null,
});

export interface N5Total {
  currency: string;
  amount: string;
}

// Τα σύνολα ανά νόμισμα έρχονται από τη βάση· δεν αθροίζονται μεταξύ τους.
export const n5TotalsOf = (
  totals: SubscriptionsView["totals"],
): readonly N5Total[] =>
  totals.map((total) => ({
    currency: total.currency,
    amount: formatMoney(total.total, total.currency),
  }));
