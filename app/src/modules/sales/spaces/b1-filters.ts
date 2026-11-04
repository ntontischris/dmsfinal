// Φίλτρα της λίστας Πελατών (B1) στο κοινό πάνελ φίλτρων: Κατάσταση, γύρισμα αυτόν τον μήνα, μηνιαίο πακέτο.
// Ζουν στη διεύθυνση (?status=, ?noshoot=1, ?monthly=1, μαζί με την αναζήτηση ?q=) και στενεύουν τις γραμμές που ήρθαν.

import type { FilterGroup } from "@/spaces/kit/filter-panel";
import { hrefOf } from "@/spaces/data/screens";

import type { ClientStatus } from "../types";
import { STATUS_LABELS, type B1Row } from "./b1-adapter";

export interface B1Filters {
  status: ClientStatus | null;
  isNoShoot: boolean;
  isMonthly: boolean;
}

export interface B1Params {
  status?: string;
  noshoot?: string;
  monthly?: string;
}

// Κάθε Κατάσταση που βγάζει η βάση (authz.client_status), με τη σειρά των ετικετών της.
const STATUSES = Object.keys(STATUS_LABELS) as ClientStatus[];

const isStatus = (value: string | undefined): value is ClientStatus =>
  STATUSES.some((status) => status === value);

export const parseB1Filters = (params: B1Params): B1Filters => ({
  status: isStatus(params.status) ? params.status : null,
  isNoShoot: params.noshoot === "1",
  isMonthly: params.monthly === "1",
});

export const hasB1Filters = (filters: B1Filters): boolean =>
  filters.status !== null || filters.isNoShoot || filters.isMonthly;

export const b1Href = (query: string, filters: B1Filters): string =>
  hrefOf("B1", {
    q: query || undefined,
    status: filters.status ?? undefined,
    noshoot: filters.isNoShoot ? "1" : undefined,
    monthly: filters.isMonthly ? "1" : undefined,
  });

const matches = (row: B1Row, filters: B1Filters): boolean =>
  (filters.status === null || row.status === STATUS_LABELS[filters.status]) &&
  (!filters.isNoShoot || !!row.month?.hasNoShoot) &&
  (!filters.isMonthly || row.month !== null);

export const applyB1Filters = (
  rows: readonly B1Row[],
  filters: B1Filters,
): B1Row[] => rows.filter((row) => matches(row, filters));

// Ο αριθμός δίπλα σε κάθε επιλογή: πόσες γραμμές θα έμεναν αν τη διάλεγες, με τα άλλα φίλτρα όπως είναι.
const countWith = (
  rows: readonly B1Row[],
  filters: B1Filters,
  change: Partial<B1Filters>,
): number => applyB1Filters(rows, { ...filters, ...change }).length;

const toggleGroup = (
  label: string,
  optionLabel: string,
  key: "isNoShoot" | "isMonthly",
  input: { rows: readonly B1Row[]; query: string; filters: B1Filters },
): FilterGroup => {
  const { rows, query, filters } = input;
  return {
    label,
    all: {
      label: "όλοι",
      href: b1Href(query, { ...filters, [key]: false }),
      isCurrent: !filters[key],
    },
    options: [
      {
        label: optionLabel,
        href: b1Href(query, { ...filters, [key]: true }),
        isCurrent: filters[key],
        count: countWith(rows, filters, { [key]: true }),
      },
    ],
  };
};

export const b1FilterGroups = (
  rows: readonly B1Row[],
  query: string,
  filters: B1Filters,
) => {
  const status: FilterGroup = {
    label: "Κατάσταση",
    all: {
      label: "όλες",
      href: b1Href(query, { ...filters, status: null }),
      isCurrent: filters.status === null,
    },
    options: STATUSES.map((code) => ({
      label: STATUS_LABELS[code],
      href: b1Href(query, { ...filters, status: code }),
      isCurrent: filters.status === code,
      count: countWith(rows, filters, { status: code }),
    })),
  };
  const input = { rows, query, filters };
  return {
    filters: [
      status,
      toggleGroup(
        "Γύρισμα αυτόν τον μήνα",
        "Μόνο όσοι δεν έχουν γύρισμα αυτόν τον μήνα",
        "isNoShoot",
        input,
      ),
      toggleGroup(
        "Μηνιαίο πακέτο",
        "Μόνο με μηνιαίο πακέτο",
        "isMonthly",
        input,
      ),
    ],
    clearHref: b1Href(query, {
      status: null,
      isNoShoot: false,
      isMonthly: false,
    }),
  };
};
