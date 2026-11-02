"use server";

import { can, getViewer, isOwner, type Viewer } from "@/modules/access";
import { searchAgreements } from "@/modules/agreements";
import { searchDeliverables } from "@/modules/deliverables";
import { searchInvoices } from "@/modules/finance";
import { searchFilmings } from "@/modules/filming";
import { searchProductions } from "@/modules/productions";
import { searchClients } from "@/modules/sales";
import {
  RECORD_LIMIT,
  groupsOf,
  termSchema,
  visibleKinds,
  type KindResult,
  type RecordGroup,
  type RecordHit,
  type RecordKind,
} from "@/spaces/data/search-records-model";

type Search = (
  term: string,
  limit: number,
) => Promise<{ ok: true; data: RecordHit[] } | { ok: false }>;

const SEARCHES: Readonly<Record<RecordKind, Search>> = {
  clients: searchClients,
  productions: searchProductions,
  filmings: searchFilmings,
  deliverables: searchDeliverables,
  invoices: searchInvoices,
  agreements: searchAgreements,
};

// Ίδιος κανόνας με το κέλυφος (layout): «owner», «team», «client» ή Δικαίωμα.
const allowsOf =
  (viewer: Viewer) =>
  (requirement: string): boolean => {
    if (viewer.status !== "signed-in") return false;
    if (requirement === "owner") return isOwner(viewer);
    if (requirement === "team") return viewer.team !== null;
    if (requirement === "client") return viewer.team === null;
    return can(viewer, requirement);
  };

// Ένα είδος που σπάει δεν χαλά τα άλλα: απλώς λείπει από τα αποτελέσματα.
const runKind = async (kind: RecordKind, term: string): Promise<KindResult> => {
  try {
    const found = await SEARCHES[kind](term, RECORD_LIMIT);
    return { kind, hits: found.ok ? found.data : null };
  } catch (error) {
    console.error(`searchRecords ${kind}:`, error);
    return { kind, hits: null };
  }
};

// Ctrl+K: οι εγγραφές που βλέπει ο Χρήστης (η βάση κρίνει), ανά είδος, μόνο για είδη των Χώρων του.
export async function searchRecords(
  input: unknown,
): Promise<readonly RecordGroup[]> {
  const term = termSchema.safeParse(input);
  if (!term.success) return [];
  const viewer = await getViewer();
  if (viewer.status !== "signed-in") return [];
  const kinds = visibleKinds(allowsOf(viewer));
  const results = await Promise.all(
    kinds.map((kind) => runKind(kind, term.data)),
  );
  return groupsOf(results);
}
