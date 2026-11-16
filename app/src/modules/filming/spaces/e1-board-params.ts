import { z } from "zod";

import { hrefOf } from "@/spaces/data/screens";
import type { FilterGroup } from "@/spaces/kit/filter-bar";

import type { NamedRef } from "../types";
import type { BoardFilters } from "./e1-board-model";

// Η κατάσταση της E1 ζει στη διεύθυνση: Πίνακας ή Λίστα, και τα φίλτρα του Πίνακα.

const isoDate = z.iso.date();

export const boardParamsSchema = z.object({
  view: z.enum(["board", "list"]).catch("board"),
  client: z.uuid().optional().catch(undefined),
  crew: z.uuid().optional().catch(undefined),
  period: z.enum(["all", "week", "month", "range"]).catch("all"),
  from: isoDate.optional().catch(undefined),
  to: isoDate.optional().catch(undefined),
  care: z.literal("1").optional().catch(undefined),
});

export type BoardParams = z.infer<typeof boardParamsSchema>;

const RANGE_DAYS = 30;

const plusDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

export const rangeOf = (params: BoardParams, today: string) => ({
  from: params.from ?? today,
  to: params.to ?? plusDays(params.from ?? today, RANGE_DAYS),
});

export const boardFiltersOf = (
  params: BoardParams,
  today: string,
): BoardFilters => ({
  clientId: params.client ?? null,
  crewUserId: params.crew ?? null,
  period:
    params.period === "range"
      ? { kind: "range", ...rangeOf(params, today) }
      : { kind: params.period },
  isCareOnly: params.care === "1",
});

export const boardHref = (
  params: BoardParams,
  patch: Partial<Record<keyof BoardParams, string | undefined>>,
): string => {
  const next = { ...params, ...patch };
  return hrefOf("E1", {
    view: next.view === "board" ? undefined : next.view,
    client: next.client,
    crew: next.crew,
    period: next.period === "all" ? undefined : next.period,
    from: next.period === "range" ? next.from : undefined,
    to: next.period === "range" ? next.to : undefined,
    care: next.care,
  });
};

const PERIODS = [
  ["week", "Αυτή την εβδομάδα"],
  ["month", "Αυτόν τον μήνα"],
  ["range", "Από–έως…"],
] as const;

interface FilterSources {
  clients: readonly NamedRef[];
  // null για τον Χρήστη πελάτη (δεν βλέπει Συνεργείο).
  crew: readonly NamedRef[] | null;
  viewerId: string | null;
}

const clientGroup = (
  params: BoardParams,
  clients: readonly NamedRef[],
): FilterGroup => ({
  label: "Πελάτης",
  isSearchable: clients.length > 8,
  all: {
    label: "Όλοι",
    href: boardHref(params, { client: undefined }),
    isCurrent: !params.client,
  },
  options: clients.map((client) => ({
    label: client.name,
    href: boardHref(params, { client: client.id }),
    isCurrent: params.client === client.id,
  })),
});

const crewGroup = (
  params: BoardParams,
  crew: readonly NamedRef[],
  viewerId: string | null,
): FilterGroup => ({
  label: "Ποιος πάει",
  isSearchable: crew.length > 8,
  all: {
    label: "Όλοι",
    href: boardHref(params, { crew: undefined }),
    isCurrent: !params.crew,
  },
  options: [
    ...(viewerId
      ? [
          {
            label: "Μόνο τα δικά μου",
            href: boardHref(params, { crew: viewerId }),
            isCurrent: params.crew === viewerId,
          },
        ]
      : []),
    ...crew
      .filter((member) => member.id !== viewerId)
      .map((member) => ({
        label: member.name,
        href: boardHref(params, { crew: member.id }),
        isCurrent: params.crew === member.id,
      })),
  ],
});

const periodGroup = (params: BoardParams): FilterGroup => ({
  label: "Περίοδος",
  all: {
    label: "Όλες",
    href: boardHref(params, { period: "all" }),
    isCurrent: params.period === "all",
  },
  options: PERIODS.map(([id, label]) => ({
    label,
    href: boardHref(params, { period: id }),
    isCurrent: params.period === id,
  })),
});

const careGroup = (params: BoardParams): FilterGroup => ({
  label: "Θέλει προσοχή",
  all: {
    label: "Όλα",
    href: boardHref(params, { care: undefined }),
    isCurrent: !params.care,
  },
  options: [
    {
      label: "Μόνο όσα θέλουν προσοχή",
      href: boardHref(params, { care: "1" }),
      isCurrent: params.care === "1",
    },
  ],
});

export const boardFilterGroups = (
  params: BoardParams,
  { clients, crew, viewerId }: FilterSources,
): readonly FilterGroup[] => [
  ...(crew === null
    ? []
    : [clientGroup(params, clients), crewGroup(params, crew, viewerId)]),
  periodGroup(params),
  careGroup(params),
];
