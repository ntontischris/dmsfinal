// Φίλτρα της λίστας Πελατών (B1) στην κοινή σειρά φίλτρων: Κατάσταση, γύρισμα αυτόν τον μήνα, Πακέτο.
// Ζουν στη διεύθυνση (?status=, ?noshoot=1, ?package=<όνομα> ή ?package=- για «χωρίς Πακέτο», μαζί με την αναζήτηση ?q=)
// και στενεύουν τις γραμμές που ήρθαν.

import type { FilterGroup } from "@/spaces/kit/filter-bar";
import { hrefOf } from "@/spaces/data/screens";

import type { ClientStatus } from "../types";
import { STATUS_LABELS, type B1Row } from "./b1-adapter";

export interface B1Filters {
  status: ClientStatus | null;
  isNoShoot: boolean;
  // Όνομα Πακέτου ενεργής Συμφωνίας, ή NO_PACKAGE για όσους δεν έχουν κανένα.
  pkg: string | null;
}

export interface B1Params {
  status?: string;
  noshoot?: string;
  package?: string;
}

export const NO_PACKAGE = "-";

// Κάθε Κατάσταση που βγάζει η βάση (authz.client_status), με τη σειρά των ετικετών της.
const STATUSES = Object.keys(STATUS_LABELS) as ClientStatus[];

const isStatus = (value: string | undefined): value is ClientStatus =>
  STATUSES.some((status) => status === value);

const pkgOf = (value: string | undefined): string | null => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? null : trimmed;
};

export const parseB1Filters = (params: B1Params): B1Filters => ({
  status: isStatus(params.status) ? params.status : null,
  isNoShoot: params.noshoot === "1",
  pkg: pkgOf(params.package),
});

export const hasB1Filters = (filters: B1Filters): boolean =>
  filters.status !== null || filters.isNoShoot || filters.pkg !== null;

export const b1Href = (query: string, filters: B1Filters): string =>
  hrefOf("B1", {
    q: query || undefined,
    status: filters.status ?? undefined,
    noshoot: filters.isNoShoot ? "1" : undefined,
    package: filters.pkg ?? undefined,
  });

// Η βάση δίνει τα Πακέτα των ενεργών Συμφωνιών ενωμένα με «, » (sales_client_overview.package_name).
export const packagesOf = (row: B1Row): string[] =>
  (row.packageName ?? "")
    .split(", ")
    .map((name) => name.trim())
    .filter((name) => name !== "");

const matchesPackage = (row: B1Row, pkg: string | null): boolean => {
  if (pkg === null) return true;
  const packages = packagesOf(row);
  return pkg === NO_PACKAGE ? packages.length === 0 : packages.includes(pkg);
};

const matches = (row: B1Row, filters: B1Filters): boolean =>
  (filters.status === null || row.status === STATUS_LABELS[filters.status]) &&
  (!filters.isNoShoot || !!row.month?.hasNoShoot) &&
  matchesPackage(row, filters.pkg);

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

interface GroupInput {
  rows: readonly B1Row[];
  query: string;
  filters: B1Filters;
}

const noShootGroup = ({ rows, query, filters }: GroupInput): FilterGroup => ({
  label: "Γύρισμα αυτόν τον μήνα",
  all: {
    label: "όλοι",
    href: b1Href(query, { ...filters, isNoShoot: false }),
    isCurrent: !filters.isNoShoot,
  },
  options: [
    {
      label: "Μόνο όσοι δεν έχουν γύρισμα αυτόν τον μήνα",
      href: b1Href(query, { ...filters, isNoShoot: true }),
      isCurrent: filters.isNoShoot,
      count: countWith(rows, filters, { isNoShoot: true }),
    },
  ],
});

// Κάθε Πακέτο που έχει κάποιος Πελάτης της λίστας (αλφαβητικά) και «χωρίς Πακέτο». Μόνο για όποιον βλέπει Συμφωνίες:
// αλλιώς η βάση δεν δίνει Πακέτα και το φίλτρο δεν θα έλεγε τίποτα.
const packageGroup = ({
  rows,
  query,
  filters,
}: GroupInput): FilterGroup | null => {
  if (!rows.some((row) => row.activeAgreements !== null)) return null;
  const names = [...new Set(rows.flatMap(packagesOf))].sort((a, b) =>
    a.localeCompare(b, "el"),
  );
  const option = (label: string, pkg: string) => ({
    label,
    href: b1Href(query, { ...filters, pkg }),
    isCurrent: filters.pkg === pkg,
    count: countWith(rows, filters, { pkg }),
  });
  return {
    label: "Πακέτο",
    all: {
      label: "όλοι",
      href: b1Href(query, { ...filters, pkg: null }),
      isCurrent: filters.pkg === null,
    },
    options: [
      ...names.map((name) => option(name, name)),
      option("Χωρίς Πακέτο", NO_PACKAGE),
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
  const pkg = packageGroup(input);
  return {
    filters: pkg
      ? [status, noShootGroup(input), pkg]
      : [status, noShootGroup(input)],
    clearHref: b1Href(query, { status: null, isNoShoot: false, pkg: null }),
  };
};
