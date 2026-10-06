// Τι βλέπει και τι μπορεί ο κάθε ρόλος στο module «3 Συμφωνίες».
// Πηγή: 01-roles-and-permissions.md (Βλέπει Συμφωνίες, Συντάσσει προτάσεις, Παρεκκλίνει από τον Κατάλογο, Λύει Συμφωνία)
// και 08-role-guides.md (D1–D5). Το «Διαχειρίζεται κόστος» το έχει αρχικά μόνο ο Ιδιοκτήτης (ADR 0017).

import { AGREEMENTS, type AgreementRecord } from "@/data/agreements";
import type { RoleId } from "@/data/roles";
import { KYPSELI_ID, SALES_USER_ID, findClient } from "@/data/sales";

export interface AgreementCaps {
  canSee: boolean;
  isScoped: boolean;
  isClient: boolean;
  isReadOnly: boolean;
  canCompose: boolean;
  canDeviate: boolean;
  canDissolve: boolean;
  canRecordOutsideSignature: boolean;
  canSeeCost: boolean;
  canManageCost: boolean;
}

export const agreementCapsOf = (role: RoleId): AgreementCaps => {
  const isAdminLike = role === "owner" || role === "admin";
  const isSales = role === "sales";
  return {
    canSee:
      isAdminLike || isSales || role === "accountant" || role === "client",
    isScoped: isSales,
    isClient: role === "client",
    isReadOnly: role === "accountant" || role === "client",
    canCompose: isAdminLike || isSales,
    canDeviate: isAdminLike,
    canDissolve: isAdminLike,
    canRecordOutsideSignature: isAdminLike,
    canSeeCost: isAdminLike,
    canManageCost: role === "owner",
  };
};

// Οι Πωλήσεις βλέπουν ό,τι τους αφορά: Συμφωνίες των Πελατών τους ή όσες βγήκαν από δική τους Ευκαιρία.
const isMine = (agreement: AgreementRecord): boolean =>
  agreement.ownerId === SALES_USER_ID ||
  findClient(agreement.clientId)?.ownerId === SALES_USER_ID;

// Ο πελάτης βλέπει τις Συμφωνίες του και τις προτάσεις που του έχουν σταλεί, όπως στον Σύνδεσμο.
// Σύνταξη, Έγκριση και χαμένες προτάσεις είναι εσωτερικά.
const isVisibleToClient = (agreement: AgreementRecord): boolean =>
  agreement.clientId === KYPSELI_ID &&
  (agreement.state !== "πρόταση" || agreement.path === "Εστάλη");

export const visibleAgreements = (role: RoleId): readonly AgreementRecord[] => {
  const caps = agreementCapsOf(role);
  if (!caps.canSee) return [];
  if (caps.isClient) return AGREEMENTS.filter(isVisibleToClient);
  return caps.isScoped ? AGREEMENTS.filter(isMine) : AGREEMENTS;
};

export const canOpenAgreement = (
  role: RoleId,
  agreement: AgreementRecord,
): boolean =>
  visibleAgreements(role).some((visible) => visible.id === agreement.id);
