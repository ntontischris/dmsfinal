// A1: οι κάρτες με αποφάσεις που περιμένουν (Υγεία, ετοιμότητα, εγκρίσεις, διαγραφές, χωρίς υπεύθυνο).

import { ACCESS_REQUESTS } from "@/data/access-requests";
import { pendingApprovals } from "@/data/agreements";
import { calendarCapsOf } from "@/data/calendar-access";
import { FILMINGS } from "@/data/filming";
import {
  clientNameOf,
  filmingCapsOf,
  pendingApprovalFilmings,
} from "@/data/filming-access";
import { FAILED_SENDS, JOBS } from "@/data/health";
import { READINESS_LINES } from "@/data/readiness";
import { capsOf, unassignedOpportunities } from "@/data/sales-access";
import { settingsCapsOf } from "@/data/settings-access";
import { deletionItems } from "@/screens/a7-model";
import type { CardDef } from "@/screens/a1-model";
import { fmtDate, screenHref as href } from "@/screens/shared";

export const healthCard: CardDef = {
  id: "health",
  title: "Υγεία συστήματος",
  source: "P2",
  kind: "status",
  isFor: (role) => settingsCapsOf(role).seesHealth,
  build: (role) => {
    const rows = [
      ...JOBS.filter((job) => job.failed).map((job) => ({
        label: `Απέτυχε: ${job.name}`,
        meta: job.lastRun,
        href: href(role, "P2", { view: "down" }),
        isUrgent: true,
      })),
      ...FAILED_SENDS.map((send) => ({
        label: `Δεν στάλθηκε: ${send.what}`,
        meta: send.to,
        href: href(role, "K3", { tab: "failed" }),
        isUrgent: true,
      })),
    ];
    return {
      count: rows.length,
      rows,
      allHref: href(role, "P2", {}),
      emptyText: "Όλα λειτουργούν.",
    };
  },
};

export const readinessCard: CardDef = {
  id: "readiness",
  title: "Έλεγχος ετοιμότητας",
  source: "O7",
  kind: "action",
  isFor: (role) => settingsCapsOf(role).canManageSettings,
  build: (role) => {
    const pending = READINESS_LINES.filter((line) => !line.isReady);
    return {
      count: pending.length,
      summary:
        "Μένουν πριν από το «Άνοιγμα σε πελάτες». Η κάρτα φεύγει μόλις γίνει.",
      rows: pending.map((line) => ({
        label: line.what,
        meta: line.who,
        href: href(role, line.screen ?? "O7", {}),
      })),
      allHref: href(role, "O7", {}),
      emptyText: "Όλα έτοιμα για το άνοιγμα.",
    };
  },
};

export const proposalApprovalsCard: CardDef = {
  id: "proposal-approvals",
  title: "Προτάσεις προς έγκριση",
  source: "D4",
  kind: "action",
  needsTeam: true,
  isFor: (role) => capsOf(role).canApprove,
  build: (role) => {
    const items = pendingApprovals();
    return {
      count: items.length,
      rows: items.map((agreement) => ({
        label: agreement.title,
        meta: "με Παρέκκλιση",
        href: href(role, "D2", { id: agreement.id }),
      })),
      allHref: href(role, "D4", {}),
      emptyText: "Καμία πρόταση δεν περιμένει έγκριση.",
    };
  },
};

const OPEN = new Set(["αναμένει έγκριση", "προγραμματισμένο"]);

export const filmingApprovalsCard: CardDef = {
  id: "filming-approvals",
  title: "Γυρίσματα προς έγκριση",
  source: "E2",
  kind: "action",
  isFor: (role) => filmingCapsOf(role).canApprove,
  build: (role) => {
    const bookings = pendingApprovalFilmings().map((f) => ({
      label: `${clientNameOf(f)}: κράτηση`,
      meta: `${fmtDate(f.date)}, ${f.start}`,
      href: href(role, "E3", { id: f.id }),
    }));
    const cancels = FILMINGS.filter(
      (f) => f.cancelRequest && OPEN.has(f.state),
    ).map((f) => ({
      label: `${clientNameOf(f)}: ζητά ακύρωση`,
      meta: `${fmtDate(f.date)}, ${f.start}`,
      href: href(role, "E3", { id: f.id }),
    }));
    return {
      count: bookings.length + cancels.length,
      summary: `${bookings.length} κρατήσεις · ${cancels.length} αιτήματα ακύρωσης`,
      rows: [...bookings, ...cancels],
      allHref: href(role, "E2", {}),
      emptyText: "Καμία κράτηση ή ακύρωση σε αναμονή.",
    };
  },
};

export const deletionsCard: CardDef = {
  id: "google-deletions",
  title: "Διαγραφές από το Google",
  source: "A7",
  kind: "action",
  isFor: (role) => calendarCapsOf(role).canResolveDeletions,
  build: (role) => {
    const { pending } = deletionItems(role);
    return {
      count: pending.length,
      rows: pending.map((item) => ({
        label: `${item.clientName}, ${item.when}`,
        meta: item.deadlineLabel,
        href: href(role, "A7", {}),
        isUrgent: item.hoursLeft < 12,
      })),
      allHref: href(role, "A7", {}),
      emptyText: "Καμία διαγραφή προς απόφαση.",
    };
  },
};

export const unassignedCard: CardDef = {
  id: "unassigned",
  title: "Χωρίς υπεύθυνο",
  source: "B5",
  kind: "action",
  needsTeam: true,
  isFor: (role) => capsOf(role).canReassign,
  build: (role) => {
    const opportunities = unassignedOpportunities();
    return {
      count: opportunities.length + ACCESS_REQUESTS.length,
      summary: `${opportunities.length} Ευκαιρίες · ${ACCESS_REQUESTS.length} Αιτήματα πρόσβασης`,
      rows: opportunities.map((o) => ({
        label: o.title,
        meta: `Πηγή: ${o.source}`,
        href: href(role, "B5", {}),
      })),
      allHref: href(role, "B5", {}),
      emptyText: "Όλα έχουν υπεύθυνο.",
    };
  },
};
