// Φίλτρα της καρτέλας «Τι στάλθηκε» στη Σελίδα Πελάτη: Κατάσταση και Κανάλι, όπως στο Ιστορικό αποστολών (K3).
// Ζουν στη διεύθυνση της καρτέλας (?tab=dispatches&state=…&channel=…). Χωρίς «Πελάτης»: η καρτέλα είναι ενός Πελάτη.

import type { FilterGroup } from "@/spaces/kit/filter-panel";
import { hrefOf } from "@/spaces/data/screens";

import { parseSendsChannel, type SendsChannel } from "../sends-helpers";
import {
  CHANNEL_LABELS,
  FILTER_CHANNEL,
  FILTER_CHANNEL_ALL,
} from "../sends-labels";

export type ClientSendsState = "all" | "sent" | "failed";

export interface ClientSendsFilter {
  state: ClientSendsState;
  channel: SendsChannel | null;
}

export interface ClientSendsParams {
  state?: string;
  channel?: string;
}

const STATES = ["sent", "failed"] as const;
const STATE_NAMES: Readonly<Record<(typeof STATES)[number], string>> = {
  sent: "Στάλθηκαν",
  failed: "Απέτυχαν",
};
const CHANNELS = ["notification", "email"] as const;

export const parseClientSendsFilter = (
  params: ClientSendsParams,
): ClientSendsFilter => ({
  state:
    params.state === "sent" || params.state === "failed" ? params.state : "all",
  channel: parseSendsChannel(params.channel),
});

export const isClientSendsFiltered = (filter: ClientSendsFilter): boolean =>
  filter.state !== "all" || filter.channel !== null;

export const clientSendsHref = (
  clientId: string,
  filter: ClientSendsFilter,
): string =>
  hrefOf("B2", {
    id: clientId,
    tab: "dispatches",
    state: filter.state === "all" ? undefined : filter.state,
    channel: filter.channel ?? undefined,
  });

export const clientSendsGroups = (
  clientId: string,
  filter: ClientSendsFilter,
) => {
  const href = (change: Partial<ClientSendsFilter>) =>
    clientSendsHref(clientId, { ...filter, ...change });
  const state: FilterGroup = {
    label: "Κατάσταση",
    all: {
      label: "όλες",
      href: href({ state: "all" }),
      isCurrent: filter.state === "all",
    },
    options: STATES.map((value) => ({
      label: STATE_NAMES[value],
      href: href({ state: value }),
      isCurrent: filter.state === value,
    })),
  };
  const channel: FilterGroup = {
    label: FILTER_CHANNEL,
    all: {
      label: FILTER_CHANNEL_ALL,
      href: href({ channel: null }),
      isCurrent: filter.channel === null,
    },
    options: CHANNELS.map((value) => ({
      label: CHANNEL_LABELS[value],
      href: href({ channel: value }),
      isCurrent: filter.channel === value,
    })),
  };
  return {
    filters: [state, channel],
    clearHref: clientSendsHref(clientId, { state: "all", channel: null }),
  };
};
