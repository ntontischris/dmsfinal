// A1: οι κάρτες της δουλειάς μου (Παραδοτέα, Μηνύματα, Πωλήσεις, Οικονομικά, Γνώση, η εβδομάδα).

import {
  deadlineOf,
  deliverableCapsOf,
  pendingCharges,
  queueOf,
} from "@/data/deliverables-access";
import { clientNameOf, filmingCapsOf, visibleFilmings } from "@/data/filming-access";
import { allStandings, financeCapsOf } from "@/data/finance-access";
import { knowledgeCapsOf, unansweredIn } from "@/data/knowledge-access";
import {
  conversationsOf,
  messageCapsOf,
  requestsOf,
} from "@/data/messages-access";
import {
  isOverrun,
  needsHours,
  productionCapsOf,
  visibleProductions,
} from "@/data/productions-access";
import { findClient } from "@/data/sales";
import { capsOf, isForgotten, visibleOpportunities } from "@/data/sales-access";
import { daysTo, dueLabel, type CardDef } from "@/screens/a1-model";
import { billingGroups, groupsCount, groupsTotal } from "@/screens/i1-model";
import { visibleMentions } from "@/screens/j1-model";
import { fmtDate, fmtMoney, screenHref as href } from "@/screens/shared";

const isTeam = (role: string) => role !== "client" && role !== "visitor";

export const myDeliverablesCard: CardDef = {
  id: "deliverables-mine",
  title: "Παραδοτέα για μένα",
  source: "H1",
  kind: "action",
  isFor: (role) => deliverableCapsOf(role).canWork,
  build: (role) => {
    const items = queueOf(role, "για μένα");
    return {
      count: items.length,
      summary: "κατά προθεσμία",
      rows: items.map((d) => {
        const deadline = deadlineOf(d).date;
        return {
          label: d.title,
          meta: deadline ? dueLabel(deadline) : "χωρίς προθεσμία",
          href: href(role, "H2", { id: d.id }),
          isUrgent: !!deadline && daysTo(deadline) <= 1,
        };
      }),
      allHref: href(role, "H1", {}),
      emptyText: "Τίποτα για σένα αυτή τη στιγμή.",
    };
  },
};

export const reviewCard: CardDef = {
  id: "deliverables-review",
  title: "Εκδόσεις προς έλεγχο",
  source: "H1",
  kind: "action",
  isFor: (role) => deliverableCapsOf(role).canReview,
  build: (role) => {
    const items = queueOf(role, "προς έλεγχο");
    return {
      count: items.length,
      rows: items.map((d) => ({
        label: d.title,
        meta: d.latest ? `Έκδοση ${d.latest.version}` : undefined,
        href: href(role, "H2", { id: d.id }),
      })),
      allHref: href(role, "H1", { view: "προς έλεγχο" }),
      emptyText: "Καμία Έκδοση δεν περιμένει έλεγχο.",
    };
  },
};

export const chargesCard: CardDef = {
  id: "round-charges",
  title: "Γύροι πέρα από το όριο",
  source: "H1",
  kind: "action",
  isFor: (role) => deliverableCapsOf(role).canSeeAmounts,
  build: (role) => {
    const items = pendingCharges(role);
    return {
      count: items.length,
      summary: "χρεώνεται ή όχι; Η δουλειά δεν περιμένει",
      rows: items.map((d) => ({
        label: d.title,
        meta: `${d.rounds.used}/${d.rounds.limit} γύροι`,
        href: href(role, "H2", { id: d.id }),
      })),
      allHref: href(role, "H1", {}),
      emptyText: "Καμία χρέωση γύρου προς απόφαση.",
    };
  },
};

export const requestsCard: CardDef = {
  id: "requests",
  title: "Αιτήματα και @αναφορές",
  source: "J1",
  kind: "action",
  isFor: (role) => isTeam(role) && messageCapsOf(role).canSee,
  build: (role) => {
    const requests = requestsOf(role, "για μένα").map((m) => ({
      label: `Αίτημα: ${m.text}`,
      meta: findClient(m.clientId)?.name,
      href: href(role, "J2", { client: m.clientId, message: m.id }),
    }));
    const mentions = visibleMentions(role).map((m) => ({
      label: `@αναφορά: ${m.text}`,
      meta: findClient(m.clientId)?.name,
      href: href(role, "J2", { client: m.clientId, message: m.id }),
    }));
    return {
      count: requests.length + mentions.length,
      summary: `${requests.length} Αιτήματα για μένα · ${mentions.length} @αναφορές`,
      rows: [...requests, ...mentions],
      allHref: href(role, "J1", { tab: "requests" }),
      emptyText: "Κανένα Αίτημα ή @αναφορά για σένα.",
    };
  },
};

export const unreadCard: CardDef = {
  id: "unread",
  title: "Αδιάβαστα Μηνύματα",
  source: "J1",
  kind: "action",
  isFor: (role) => isTeam(role) && messageCapsOf(role).canSee,
  build: (role) => {
    const rows = conversationsOf(role).filter((row) => row.unread > 0);
    return {
      count: rows.reduce((sum, row) => sum + row.unread, 0),
      summary: `σε ${rows.length} ${rows.length === 1 ? "Συνομιλία" : "Συνομιλίες"}`,
      rows: rows.map((row) => ({
        label: row.client.name,
        meta: `${row.unread} νέα`,
        href: href(role, "J2", { client: row.client.id }),
      })),
      allHref: href(role, "J1", {}),
      emptyText: "Όλα διαβασμένα.",
    };
  },
};

export const forgottenCard: CardDef = {
  id: "next-steps",
  title: "Επόμενα βήματα που έληξαν",
  source: "B3",
  kind: "action",
  isFor: (role) => capsOf(role).canManage,
  build: (role) => {
    const items = visibleOpportunities(role).filter(isForgotten);
    return {
      count: items.length,
      rows: items.map((o) => ({
        label: `${findClient(o.clientId)?.name ?? ""}: ${o.nextStep?.text ?? o.title}`,
        meta: o.nextStep ? dueLabel(o.nextStep.due) : undefined,
        href: href(role, "B4", { id: o.id }),
        isUrgent: true,
      })),
      allHref: href(role, "B3", {}),
      emptyText: "Κανένα Επόμενο βήμα δεν έληξε.",
    };
  },
};

const EXPIRING_DAYS = 7;

export const proposalsCard: CardDef = {
  id: "proposals",
  title: "Προτάσεις σε εξέλιξη",
  source: "B3",
  kind: "action",
  isFor: (role) => capsOf(role).canManage,
  build: (role) => {
    const sent = visibleOpportunities(role).filter(
      (o) => o.outcome === "Ανοιχτή" && o.proposal?.path === "Εστάλη",
    );
    const rows = sent.flatMap((o) => {
      const proposal = o.proposal!;
      const isExpiring = daysTo(proposal.validUntil) <= EXPIRING_DAYS;
      const isOpened = proposal.recipients.some((r) => r.opened);
      if (!isExpiring && !isOpened) return [];
      return [
        {
          label: `${findClient(o.clientId)?.name ?? ""}: ${proposal.title}`,
          meta: [
            isOpened && "την άνοιξε ο πελάτης",
            isExpiring && dueLabel(proposal.validUntil),
          ]
            .filter(Boolean)
            .join(" · "),
          href: href(role, "B4", { id: o.id }),
          isUrgent: isExpiring,
        },
      ];
    });
    return {
      count: rows.length,
      summary: `λήγουν σε ${EXPIRING_DAYS} μέρες ή τις άνοιξε ο πελάτης`,
      rows,
      allHref: href(role, "B3", {}),
      emptyText: "Καμία πρόταση δεν θέλει κίνηση.",
    };
  },
};

export const toInvoiceCard: CardDef = {
  id: "to-invoice",
  title: "Προς τιμολόγηση",
  source: "I1",
  kind: "action",
  isFor: (role) => financeCapsOf(role).canSee && isTeam(role),
  build: (role) => {
    const groups = billingGroups();
    return {
      count: groupsCount(groups),
      summary: `${fmtMoney(groupsTotal(groups))} καθαρά, σε ${groups.length} Πελάτες`,
      rows: groups.map((g) => ({
        label: g.client.name,
        meta: `${fmtMoney(g.total)} · το παλαιότερο ${g.oldestAge} μέρες`,
        href: href(role, "I1", {}),
        isUrgent: g.oldestAge >= 14,
      })),
      allHref: href(role, "I1", {}),
      emptyText: "Τίποτα προς τιμολόγηση.",
    };
  },
};

export const overdueCard: CardDef = {
  id: "overdue",
  title: "Ληξιπρόθεσμα Τιμολόγια",
  source: "I2",
  kind: "action",
  isFor: (role) => financeCapsOf(role).canSee && isTeam(role),
  build: (role) => {
    const items = allStandings().filter((s) => s.status === "ληξιπρόθεσμο");
    const total = items.reduce((sum, s) => sum + s.remaining, 0);
    return {
      count: items.length,
      summary: `${fmtMoney(total)} υπόλοιπο`,
      rows: items.map((s) => ({
        label: `${findClient(s.invoice.clientId)?.name ?? ""}, ${s.invoice.number}`,
        meta: `${fmtMoney(s.remaining)} · ${s.invoice.dueDate ? dueLabel(s.invoice.dueDate) : ""}`,
        href: href(role, "I5", { client: s.invoice.clientId }),
        isUrgent: true,
      })),
      allHref: href(role, "I2", { filter: "ληξιπρόθεσμα" }),
      emptyText: "Κανένα ληξιπρόθεσμο.",
    };
  },
};

export const hoursCard: CardDef = {
  id: "hours",
  title: "Ώρες και Υπέρβαση κόστους",
  source: "G3",
  kind: "action",
  isFor: (role) => productionCapsOf(role).canSeeCost,
  build: (role) => {
    const productions = visibleProductions(role);
    const overrun = productions.filter(isOverrun);
    const hours = productions.filter((p) => needsHours(p) && !isOverrun(p));
    const rows = [
      ...overrun.map((p) => ({
        label: `Υπέρβαση: ${p.title}`,
        href: href(role, "G3", { id: p.id }),
        isUrgent: true,
      })),
      ...hours.map((p) => ({
        label: `Θέλει Πραγματικές ώρες: ${p.title}`,
        href: href(role, "G3", { id: p.id }),
      })),
    ];
    return {
      count: rows.length,
      rows,
      allHref: href(role, "G1", { view: "hours" }),
      emptyText: "Όλες οι παραδομένες έχουν ώρες.",
    };
  },
};

export const unansweredCard: CardDef = {
  id: "unanswered",
  title: "Αναπάντητες ερωτήσεις Βοηθού",
  source: "L3",
  kind: "action",
  isFor: (role) => knowledgeCapsOf(role).canManage,
  build: (role) => {
    const items = unansweredIn("ανοιχτή");
    return {
      count: items.length,
      rows: items.map((u) => ({
        label: u.question,
        meta: u.timesAsked > 1 ? `ρωτήθηκε ${u.timesAsked} φορές` : undefined,
        href: href(role, "L3", {}),
      })),
      allHref: href(role, "L3", {}),
      emptyText: "Καμία αναπάντητη ερώτηση.",
    };
  },
};

const LIVE = new Set(["αναμένει έγκριση", "προγραμματισμένο"]);

export const weekFilmingsCard: CardDef = {
  id: "week-filmings",
  title: "Γυρίσματα της εβδομάδας",
  source: "E1",
  kind: "info",
  isFor: (role) => isTeam(role) && filmingCapsOf(role).canSee,
  build: (role) => {
    const items = [...visibleFilmings(role)]
      .filter(
        (f) => LIVE.has(f.state) && daysTo(f.date) >= 0 && daysTo(f.date) < 7,
      )
      .sort((a, b) =>
        `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`),
      );
    return {
      count: items.length,
      rows: items.map((f) => ({
        label: f.location.startsWith(clientNameOf(f))
          ? f.location
          : `${clientNameOf(f)}, ${f.location}`,
        meta: `${fmtDate(f.date)}, ${f.start}${f.state === "αναμένει έγκριση" ? " · αναμένει έγκριση" : ""}`,
        href: href(role, "E3", { id: f.id }),
      })),
      allHref: href(role, "A5", {}),
      emptyText: "Κανένα Γύρισμα τις επόμενες 7 μέρες.",
    };
  },
};
