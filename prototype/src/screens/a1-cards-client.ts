// A1: οι κάρτες του Χρήστη πελάτη. Δείχνουν μόνο τον επιλεγμένο Πελάτη και ποτέ τίποτα εσωτερικό.

import { AGREEMENTS } from "@/data/agreements";
import { provisionKind } from "@/data/catalogue";
import { waitingForClient } from "@/data/deliverables-access";
import { reservedShoots, visibleFilmings } from "@/data/filming-access";
import { balanceOf, overdueOf } from "@/data/finance-access";
import { requestsOf } from "@/data/messages-access";
import { KYPSELI_ID } from "@/data/sales";
import { daysTo, type CardDef } from "@/screens/a1-model";
import { fmtDate, fmtMoney, screenHref as href } from "@/screens/shared";

const isClient = (role: string) => role === "client";

export const clientWaitingCard: CardDef = {
  id: "client-waiting",
  title: "Περιμένουν εσένα",
  source: "H3",
  kind: "action",
  isFor: isClient,
  build: (role) => {
    const items = waitingForClient(role);
    return {
      count: items.length,
      summary: "νέες Εκδόσεις για έγκριση ή σχόλια",
      rows: items.map((d) => ({
        label: d.title,
        meta: d.latest ? `Έκδοση ${d.latest.version}` : undefined,
        href: href(role, "H4", { id: d.id }),
      })),
      allHref: href(role, "H3", {}),
      emptyText: "Δεν περιμένει τίποτα την απάντησή σου.",
    };
  },
};

export const clientBalanceCard: CardDef = {
  id: "client-balance",
  title: "Τι χρωστάς",
  source: "I5",
  kind: "action",
  isFor: isClient,
  build: (role) => {
    const balance = balanceOf(KYPSELI_ID);
    const overdue = overdueOf(KYPSELI_ID);
    return {
      count: balance > 0 ? 1 : 0,
      isCountless: true,
      summary:
        overdue > 0
          ? `${fmtMoney(balance)}, από τα οποία ${fmtMoney(overdue)} ληξιπρόθεσμα`
          : `${fmtMoney(balance)} υπόλοιπο`,
      rows: [],
      allHref: href(role, "I5", { client: KYPSELI_ID }),
      emptyText: "Δεν χρωστάς τίποτα.",
    };
  },
};

export const clientRequestsCard: CardDef = {
  id: "client-requests",
  title: "Τα ανοιχτά Αιτήματά σου",
  source: "J3",
  kind: "action",
  isFor: isClient,
  build: (role) => {
    const items = requestsOf(role, "όλα τα ανοιχτά");
    return {
      count: items.length,
      rows: items.map((m) => ({
        label: m.text,
        meta: `από ${fmtDate(m.request.declaredAt.slice(0, 10))}`,
        href: href(role, "J3", { tab: "requests" }),
      })),
      allHref: href(role, "J3", { tab: "requests" }),
      emptyText: "Κανένα ανοιχτό Αίτημα.",
    };
  },
};

const UPCOMING = new Set(["αναμένει έγκριση", "προγραμματισμένο"]);

export const clientFilmingsCard: CardDef = {
  id: "client-filmings",
  title: "Τα επόμενα Γυρίσματα",
  source: "E1",
  kind: "info",
  isFor: isClient,
  build: (role) => {
    const items = [...visibleFilmings(role)]
      .filter((f) => UPCOMING.has(f.state) && daysTo(f.date) >= 0)
      .sort((a, b) =>
        `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`),
      );
    return {
      count: items.length,
      rows: items.map((f) => ({
        label: f.location,
        meta: `${fmtDate(f.date)}, ${f.start}${f.state === "αναμένει έγκριση" ? " · αναμένει έγκριση" : ""}`,
        href: href(role, "E3", { id: f.id }),
      })),
      allHref: href(role, "E1", {}),
      emptyText: "Κανένα κλεισμένο Γύρισμα.",
      cta: { label: "Κλείσε Γύρισμα", href: href(role, "E5", {}) },
    };
  },
};

export const clientProvisionsCard: CardDef = {
  id: "client-provisions",
  title: "Οι Παροχές του μήνα",
  source: "D2",
  kind: "info",
  isFor: isClient,
  build: (role) => {
    const agreement = AGREEMENTS.find(
      (a) =>
        a.clientId === KYPSELI_ID &&
        a.state === "ενεργή" &&
        a.kind === "μηνιαία",
    );
    const period = agreement?.periods.find((p) => p.state === "τρέχουσα");
    const rows = (period?.provisions ?? []).map((p) => {
      const reserved =
        p.kindId === "shoot" && agreement
          ? reservedShoots(agreement.id, period?.label)
          : 0;
      const left = p.given + p.carried - p.used - reserved;
      return {
        label: `${provisionKind(p.kindId).name}: μένουν ${left}`,
        meta: `από ${p.given + p.carried} αυτόν τον μήνα${reserved > 0 ? `, ${reserved} δεσμευμένο` : ""}`,
        href: href(role, "D2", { id: agreement?.id }),
      };
    });
    return {
      count: rows.length,
      summary: period
        ? `${period.label}, ως ${fmtDate(period.ends)}`
        : undefined,
      rows,
      allHref: href(role, "D2", { id: agreement?.id }),
      emptyText: "Δεν υπάρχει τρέχουσα Περίοδος.",
    };
  },
};
