// Φανταστικά δεδομένα του module «6 Ημερολόγιο»: προθεσμίες, Εταιρικό ημερολόγιο Google, διαγραφές προς επιβεβαίωση, Σύνδεσμοι ημερολογίου.
// Τα Γυρίσματα και ο Κλεισμένος χρόνος ζουν στο filming.ts: το Ημερολόγιο είναι όψη, όχι πηγή (ADR 0005).
// Repo public: μόνο επινοημένα ονόματα και διευθύνσεις.

import {
  CREW_PEOPLE,
  PERSON_OF_ROLE,
  findProduction,
  type CrewPerson,
} from "@/data/filming";
import { DELIVERABLES } from "@/data/productions";
import type { RoleId } from "@/data/roles";

// Όλα τα μέλη της ομάδας με Βασικά (Κλεισμένος χρόνος, Σύνδεσμος). Ο Λογιστής δεν μπαίνει σε Συνεργείο.
export const TEAM_MEMBERS: readonly CrewPerson[] = [
  ...CREW_PEOPLE,
  {
    id: "eleni",
    name: "Ελένη Ρήγα",
    roleLabel: "Λογιστής",
    skill: "",
  },
];

export const MEMBER_OF_ROLE: Readonly<Partial<Record<RoleId, string>>> = {
  ...PERSON_OF_ROLE,
  accountant: "eleni",
};

export const memberName = (id: string): string =>
  TEAM_MEMBERS.find((member) => member.id === id)?.name ?? "—";

// Προθεσμίες Παραδοτέων: μόνο ό,τι χρειάζεται το Ημερολόγιο. Το module «Παραδοτέα» τις στήνει πλήρως.
export interface Deadline {
  id: string;
  title: string;
  clientId: string;
  date: string;
  assigneeId: string;
}

// Παράγονται από τα ανοιχτά Παραδοτέα (productions.ts): το id είναι του Παραδοτέου, ώστε ο σύνδεσμος H2 να το ανοίγει.
export const DEADLINES: readonly Deadline[] = DELIVERABLES.filter(
  (deliverable) => deliverable.state === "σε εργασία",
).map((deliverable) => ({
  id: deliverable.id,
  title: deliverable.title,
  clientId: findProduction(deliverable.productionId)?.clientId ?? "",
  date: deliverable.deadline,
  assigneeId: deliverable.assigneeId,
}));

// Εταιρικό ημερολόγιο: μία σύνδεση με λογαριασμό-ρομπότ (κεφ. 6).
export const COMPANY_CALENDAR = {
  name: "Delta Films — Εταιρικό",
  lastSync: "2026-09-20T10:38",
  // Στο παράδειγμα «Google εκτός»: αλλαγές του DMS που περιμένουν να γραφτούν, με επανάληψη.
  outage: {
    since: "2026-09-20T10:40",
    pendingWrites: [
      "Νέο Γύρισμα: Καφέ Αθηνά, Παρ 02/10 11:00",
      "Κλεισμένος χρόνος: Άννα Δημητρίου, Τετ 23/09 11:00",
      "Νέο Γύρισμα: Κυψέλη Καφέ, Πέμ 24/09 10:00",
    ],
    alertAfterHours: 1,
  },
} as const;

// Διαγραφές Γυρισμάτων στο Google που περιμένουν επιβεβαίωση στο DMS (A7).
export type DeletionStatus =
  "αναμένει" | "επανήλθε" | "επανήλθε αυτόματα" | "επιβεβαιώθηκε";

export interface GoogleDeletion {
  id: string;
  filmingId: string;
  deletedBy: string;
  deletedAt: string;
  status: DeletionStatus;
  resolvedBy?: string;
  resolvedAt?: string;
  reason?: string;
}

export const DELETION_HOURS = 24;

export const GOOGLE_DELETIONS: readonly GoogleDeletion[] = [
  {
    id: "gd-kinisi-0921",
    filmingId: "f-kinisi-0921",
    deletedBy: "dimitris",
    deletedAt: "2026-09-20T09:30",
    status: "αναμένει",
  },
  {
    id: "gd-kypseli-0924",
    filmingId: "f-kypseli-0924",
    deletedBy: "giorgos",
    deletedAt: "2026-09-20T10:15",
    status: "αναμένει",
  },
  {
    id: "gd-kypseli-1002",
    filmingId: "f-kypseli-1002",
    deletedBy: "giorgos",
    deletedAt: "2026-09-17T20:10",
    status: "επανήλθε αυτόματα",
    resolvedAt: "2026-09-18T20:10",
  },
  {
    id: "gd-kinisi-0912",
    filmingId: "f-kinisi-0912",
    deletedBy: "dimitris",
    deletedAt: "2026-09-10T16:05",
    status: "επιβεβαιώθηκε",
    resolvedBy: "dimitris",
    resolvedAt: "2026-09-10T16:07",
    reason: "Κλειστά για ανακαίνιση εκείνο το Σάββατο.",
  },
];

// Τι ήρθε πρόσφατα από το Google και τι έκανε το DMS (A5, για όσους έχουν το Αμφίδρομο).
export interface GoogleChange {
  id: string;
  when: string;
  by: string;
  kind: "μετακίνηση πέρασε" | "μετακίνηση απορρίφθηκε" | "νέο γεγονός";
  text: string;
  filmingId?: string;
  blockedId?: string;
}

export const GOOGLE_CHANGES: readonly GoogleChange[] = [
  {
    id: "gc-1",
    when: "2026-09-20T08:50",
    by: "dimitris",
    kind: "μετακίνηση απορρίφθηκε",
    text: "Κυψέλη Καφέ, Παρ 02/10: η μετακίνηση στις 08:00 επανήλθε στις 09:00. Λόγος: οι 08:00 είναι εκτός Ωραρίου κρατήσεων (Δευ–Παρ 09:00–19:00).",
    filmingId: "f-kypseli-1002",
  },
  {
    id: "gc-2",
    when: "2026-09-19T17:20",
    by: "dimitris",
    kind: "νέο γεγονός",
    text: "«Συνάντηση με προμηθευτή», Τρι 22/09 15:00–16:30: έγινε Κλεισμένος χρόνος για Γιώργο Μαυρίδη και Δημήτρη Ιωάννου (προσκεκλημένοι).",
    blockedId: "bt-giorgos-0922",
  },
  {
    id: "gc-3",
    when: "2026-09-16T12:05",
    by: "giorgos",
    kind: "μετακίνηση πέρασε",
    text: "Γυμναστήριο Κίνηση, Παρ 18/09: από 09:00 σε 10:00. Ενημερώθηκαν το Συνεργείο και ο πελάτης.",
    filmingId: "f-kinisi-0918",
  },
];

// Σύνδεσμος ημερολογίου: ένας ανά Χρήστη, μόνο ανάγνωση. Η ανανέωση ακυρώνει τον παλιό.
export interface CalendarLink {
  token: string;
  renewedAt: string;
}

export const CALENDAR_LINK_OF: Readonly<Record<string, CalendarLink>> = {
  giorgos: { token: "k7Qm2xRb", renewedAt: "2026-09-01" },
  dimitris: { token: "p3Vn8sLd", renewedAt: "2026-09-01" },
  aris: { token: "t9Hc4wEz", renewedAt: "2026-09-14" },
  sofia: { token: "m5Ja6yUf", renewedAt: "2026-09-01" },
  anna: { token: "r2Lx7qNg", renewedAt: "2026-09-02" },
  eleni: { token: "w8Bd3kTs", renewedAt: "2026-09-05" },
  "client-maria": { token: "c4Pe9hWv", renewedAt: "2026-09-03" },
};

export const calendarLinkUrl = (token: string): string =>
  `https://deltafilms.example/cal/${token}.ics`;
