import type { LinkHost, Version, VersionState } from "@/data/deliverables";
import {
  TODAY,
  whoLabel,
  type H2Context,
  type Live,
  type PersonOption,
} from "@/screens/h2-model";

export const logLine = (
  live: Live,
  who: string,
  what: string,
  notify?: string,
): Live => ({
  ...live,
  log: [...live.log, { when: TODAY, who, what, notify }],
});

const mapVersion = (
  live: Live,
  number: number,
  change: (v: Version) => Version,
): Live => ({
  ...live,
  versions: live.versions.map((v) => (v.number === number ? change(v) : v)),
});

// Όταν μια νέα Έκδοση φτάνει στον πελάτη, η προηγούμενη που περίμενε γίνεται «αντικαταστάθηκε».
const supersede = (versions: readonly Version[], except: number): Version[] =>
  versions.map((v) =>
    v.state === "αναμένει πελάτη" && v.number !== except
      ? { ...v, state: "αντικαταστάθηκε" as const }
      : v,
  );

export const setAssignee = (
  live: Live,
  ctx: H2Context,
  person: PersonOption,
): Live =>
  logLine(
    { ...live, assigneeId: person.id },
    ctx.meId,
    `Νέος Ανατεθειμένος: ${person.name}`,
    `ο ${person.name} (νέος Ανατεθειμένος)`,
  );

export const setDeadline = (live: Live, ctx: H2Context, date: string): Live =>
  logLine(
    { ...live, deadline: date || null },
    ctx.meId,
    date
      ? `Άλλαξε η προθεσμία σε ${date}`
      : "Αφαιρέθηκε η ημερομηνία προθεσμίας",
  );

export const addVersion = (
  live: Live,
  ctx: H2Context,
  link: string,
  host: LinkHost,
): Live => {
  const number = Math.max(0, ...live.versions.map((v) => v.number)) + 1;
  const inReview =
    ctx.isInternalProduction || (ctx.internalReview && !ctx.caps.canReview);
  const state: VersionState = inReview
    ? "αναμένει εσωτερικό έλεγχο"
    : "αναμένει πελάτη";
  const version: Version = {
    number,
    link,
    host,
    addedBy: ctx.meId,
    addedAt: TODAY,
    state,
    review: ctx.caps.canReview ? { by: ctx.meId, when: TODAY } : undefined,
    sentAt: inReview ? undefined : TODAY,
    comments: [],
  };
  const base = inReview ? live.versions : supersede(live.versions, number);
  return logLine(
    {
      ...live,
      versions: [...base, version],
      state: inReview ? live.state : "αναμένει πελάτη",
    },
    ctx.meId,
    `Νέα Έκδοση v${number} (${host})`,
    inReview
      ? "όσοι Ελέγχουν Παραδοτέα (αναμένει εσωτερικό έλεγχο)"
      : "ο πελάτης (email)",
  );
};

export const sendVersion = (
  live: Live,
  ctx: H2Context,
  number: number,
): Live => {
  const superseded: Live = {
    ...live,
    versions: supersede(live.versions, number),
    state: "αναμένει πελάτη",
  };
  return logLine(
    mapVersion(superseded, number, (v) => ({
      ...v,
      state: "αναμένει πελάτη",
      sentAt: TODAY,
      review: { by: ctx.meId, when: TODAY },
    })),
    ctx.meId,
    `Έστειλε στον πελάτη την v${number}`,
    "ο πελάτης (email)",
  );
};

export const returnVersion = (
  live: Live,
  ctx: H2Context,
  number: number,
  note: string,
): Live =>
  logLine(
    mapVersion(live, number, (v) => ({
      ...v,
      state: "επιστράφηκε από έλεγχο",
      review: { by: ctx.meId, when: TODAY, note },
    })),
    ctx.meId,
    `Επέστρεψε την v${number} από τον έλεγχο: ${note}`,
    `ο ${whoLabel(live.assigneeId)} (Ανατεθειμένος· ξαναμπαίνει στο «Για μένα»)`,
  );

export const approveVersion = (
  live: Live,
  ctx: H2Context,
  number: number,
): Live =>
  logLine(
    mapVersion(
      { ...live, state: "εγκρίθηκε", approvedAt: TODAY },
      number,
      (v) => ({
        ...v,
        state: "εγκρίθηκε",
        review: { by: ctx.meId, when: TODAY },
      }),
    ),
    ctx.meId,
    `Ενέκρινε οριστικά την v${number} (Εσωτερική Παραγωγή)`,
    "ο Υπεύθυνος Παραγωγής",
  );

export const fixLink = (
  live: Live,
  ctx: H2Context,
  link: string,
  host: LinkHost,
): Live => {
  const last = live.versions.at(-1);
  if (!last) return live;
  return logLine(
    mapVersion(live, last.number, (v) => ({
      ...v,
      link,
      host,
      linkFixedAt: TODAY,
    })),
    ctx.meId,
    `link διορθώθηκε στην v${last.number}`,
    "κανείς· οι μέρες αναμονής δεν σταματούν",
  );
};

export const addComment = (
  live: Live,
  ctx: H2Context,
  number: number,
  comment: { text: string; at?: number; isInternal: boolean },
): Live =>
  logLine(
    mapVersion(live, number, (v) => ({
      ...v,
      comments: [
        ...v.comments,
        {
          id: `c-new-${v.comments.length + 1}`,
          who: ctx.meId,
          isClient: false,
          when: TODAY,
          ...comment,
        },
      ],
    })),
    ctx.meId,
    `Σχόλιο στην v${number}${comment.isInternal ? " (εσωτερικό)" : ""}`,
    comment.isInternal ? "κανείς· ο πελάτης δεν το βλέπει" : undefined,
  );

export const setFinalFiles = (live: Live, ctx: H2Context, link: string): Live =>
  logLine(
    { ...live, finalFiles: link },
    ctx.meId,
    "Όρισε άλλο link για τα Τελικά αρχεία",
  );

export const cancelDeliverable = (
  live: Live,
  ctx: H2Context,
  reason: string,
  provision: "καταναλώθηκε" | "επιστρέφει",
): Live =>
  logLine(
    { ...live, state: "ακυρώθηκε", cancellation: { reason, provision } },
    ctx.meId,
    `Ακύρωσε το Παραδοτέο: ${reason} (η Παροχή ${provision})`,
    "ο Ανατεθειμένος",
  );
