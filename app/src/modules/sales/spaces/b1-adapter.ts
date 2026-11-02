// B1 (νέα εμφάνιση): οι πραγματικοί Πελάτες (sales_client_list) και η εικόνα τους (sales_client_overview) στις γραμμές του
// πίνακα του prototype. Καθαρές συναρτήσεις: ό,τι δεν βλέπει ο Χρήστης έρχεται null από τη βάση και η στήλη κρύβεται.

import { hrefOf } from "@/spaces/data/screens";
import { fmtMoney } from "@/spaces/screens/shared";

import { NO_MANAGER_LABEL } from "../labels";
import type {
  ClientOverview,
  ClientRow,
  ClientStatus,
  SalesCaps,
} from "../types";
import { monthGlance, type MonthGlance } from "./b1-month";
import {
  ownershipOf,
  type ListAccess,
  type OwnershipLabel,
} from "./b1-ownership";

export interface B1Row {
  id: string;
  href: string;
  name: string;
  city: string;
  // null όταν δεν φορτώθηκε η εικόνα του Πελάτη.
  status: string | null;
  owner: string;
  openOpportunities: number | null;
  packageName: string | null;
  activeAgreements: number | null;
  balance: string | null;
  isPossibleDuplicate: boolean;
  // Η οθόνη Συγχώνευσης, για το «Πιθανό διπλό».
  mergeHref: string;
  // Η πιο πρόσφατη Δραστηριότητα των Ευκαιριών του Πελάτη (ISO).
  lastContact: string | null;
  // Μηνιαίος Πελάτης: τι δόθηκε και τι έγινε αυτόν τον μήνα.
  month: MonthGlance | null;
  // Σε Πωλήσεις «όσα με αφορούν»: ετικέτα ιδιοκτησίας. Όταν ανήκει σε άλλον, εμφανίζεται μόνο το όνομα και ο Υπεύθυνος.
  ownership: OwnershipLabel | null;
  isTaken: boolean;
}

export const STATUS_LABELS: Readonly<Record<ClientStatus, string>> = {
  candidate: "Υποψήφιος",
  active: "Ενεργός",
  inactive: "Ανενεργός",
};

const accessOf = (row: ClientRow, caps: SalesCaps): ListAccess | null => {
  if (!row.canOpen) return "taken";
  if (caps.manageScope !== "mine") return null;
  return caps.userId !== null && row.managerId === caps.userId
    ? "owner"
    : "granted";
};

const balanceOf = (overview: ClientOverview | undefined): string | null =>
  overview?.balanceCents === null || overview?.balanceCents === undefined
    ? null
    : fmtMoney(overview.balanceCents / 100);

export const b1RowOf = (
  row: ClientRow,
  overview: ClientOverview | undefined,
  caps: SalesCaps,
): B1Row => {
  const access = accessOf(row, caps);
  return {
    id: row.id,
    href: hrefOf("B2", { id: row.id }),
    name: row.name,
    city: row.city,
    status: overview ? STATUS_LABELS[overview.status] : null,
    owner: row.managerName ?? NO_MANAGER_LABEL,
    openOpportunities: row.openOpportunities,
    packageName: overview?.packageName ?? null,
    activeAgreements: overview?.activeAgreements ?? null,
    balance: balanceOf(overview),
    isPossibleDuplicate: row.isPossibleDuplicate && caps.canMerge,
    mergeHref: hrefOf("B6"),
    lastContact: overview?.lastContact ?? null,
    month: overview
      ? monthGlance(overview.provisions, overview.nextFilming)
      : null,
    ownership: access === null ? null : ownershipOf(access, row.managerName),
    isTaken: access === "taken",
  };
};

// Μία ανάγνωση για όλους: η εικόνα κάθε Πελάτη βρίσκεται με το id του.
export const b1RowsOf = (
  rows: readonly ClientRow[],
  overviews: readonly ClientOverview[],
  caps: SalesCaps,
): B1Row[] => {
  const byId = new Map(
    overviews.map((overview) => [overview.clientId, overview]),
  );
  return rows.map((row) => b1RowOf(row, byId.get(row.id), caps));
};

export interface B1Columns {
  showOwner: boolean;
  showOpportunities: boolean;
  showAgreements: boolean;
  showBalance: boolean;
}

// Οι στήλες: ο Υπεύθυνος για όσους δουλεύουν Πελάτες (όχι μόνο ανάγνωση)· Ευκαιρίες, Συμφωνίες και Υπόλοιπο μόνο όταν η
// βάση τα έδωσε (ο Χρήστης έχει το Δικαίωμα).
export const b1ColumnsOf = (
  rows: readonly B1Row[],
  caps: SalesCaps,
): B1Columns => ({
  showOwner: caps.canManage,
  showOpportunities: rows.some((row) => row.openOpportunities !== null),
  showAgreements: rows.some((row) => row.activeAgreements !== null),
  showBalance: rows.some((row) => row.balance !== null),
});
