// P2 (νέα εμφάνιση): η πραγματική health_view στις γραμμές των καρτών του prototype (`screens/p2-*.tsx`).
// Καθαρές συναρτήσεις· τις αποφάσεις (κόκκινο, εντάξει) τις παίρνει το status.ts του module, όπως και στην παλιά εμφάνιση.

import type { BadgeTone } from "@/spaces/screens/shared";

import { AI, EVENTS, JOBS, SENDS, formatAt } from "../labels";
import type { HealthView } from "../schemas";
import {
  aiShare,
  eventsAreRed,
  googleVerdict,
  jobVerdict,
  jobsAreRed,
} from "../status";

export interface P2Badge {
  label: string;
  tone: BadgeTone | undefined;
}

export interface P2Job {
  id: string;
  name: string;
  sub: string;
  error: string | null;
  isLate: boolean;
  badge: P2Badge;
}

export interface P2Send {
  id: string;
  title: string;
  sub: string;
  // null: η αποστολή δεν ξαναστέλνεται (μόνο «Αγνόησε»).
  retryRef: string | null;
}

export interface P2Event {
  id: number;
  title: string;
  sub: string;
}

export interface P2Ai {
  isClosed: boolean;
  isRed: boolean;
  text: string;
  usedDollars: number;
  capDollars: number;
  rule: string;
}

export interface P2Model {
  attention: number;
  jobs: readonly P2Job[];
  isJobsRed: boolean;
  sends: readonly P2Send[];
  sendsTotal: number;
  sendsMore: string | null;
  google: {
    badge: P2Badge;
    isRed: boolean;
    reason: string;
    lastSync: string;
    queued: number;
  };
  events: readonly P2Event[];
  eventsWaiting: string | null;
  isEventsRed: boolean;
  ai: P2Ai;
}

const jobOf = (job: HealthView["jobs"][number]): P2Job => {
  const verdict = jobVerdict(job);
  return {
    id: job.job,
    name: job.label,
    sub: `${JOBS.lastRun}: ${formatAt(job.lastOkAt)} · ${JOBS.schedule}: ${job.schedule}`,
    error: job.lastError,
    isLate: job.state === "late",
    badge: { label: verdict.label, tone: verdict.tone },
  };
};

const sendOf = (send: HealthView["sends"]["items"][number]): P2Send => {
  const to =
    send.email && send.email !== send.recipient
      ? `${send.recipient ?? "—"} (${send.email})`
      : (send.recipient ?? "—");
  return {
    id: send.id,
    title: `«${send.what}» προς ${to}`,
    sub: `${formatAt(send.at)}${send.reason ? ` · ${SENDS.reason}: ${send.reason}` : ""}`,
    retryRef: send.retryRef,
  };
};

const eventOf = (event: HealthView["events"]["stuck"][number]): P2Event => ({
  id: event.id,
  title: event.what,
  sub: `${EVENTS.since} ${formatAt(event.at)} · ${EVENTS.attempts(event.attempts)}${event.reason ? ` · ${event.reason}` : ""}`,
});

const DOLLARS = new Intl.NumberFormat("el-GR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money = (micros: number): string =>
  `$${DOLLARS.format(micros / 1_000_000)}`;

const aiOf = (ai: HealthView["ai"]): P2Ai => {
  const percent = Math.round(aiShare(ai) * 100);
  return {
    isClosed: ai.capMicros <= 0,
    isRed: ai.alert,
    text: `${money(ai.spentMicros)} από ${money(ai.capMicros)} αυτόν τον μήνα (${percent}%).`,
    usedDollars: Math.round(ai.spentMicros / 1_000_000),
    capDollars: Math.round(ai.capMicros / 1_000_000),
    rule: AI.rule(ai.publicShare),
  };
};

export function p2ModelOf(view: HealthView): P2Model {
  const google = googleVerdict(view);
  return {
    attention: view.attention,
    jobs: view.jobs.map(jobOf),
    isJobsRed: jobsAreRed(view),
    sends: view.sends.items.map(sendOf),
    sendsTotal: view.sends.total,
    sendsMore:
      view.sends.total > view.sends.items.length
        ? SENDS.more(view.sends.items.length, view.sends.total)
        : null,
    google: {
      badge: { label: google.label, tone: google.tone },
      isRed: google.tone === "attention",
      reason: google.reason,
      lastSync: formatAt(view.google.lastSyncAt),
      queued: view.google.pendingWrites,
    },
    events: view.events.stuck.map(eventOf),
    eventsWaiting:
      view.events.waiting > 0 ? EVENTS.waiting(view.events.waiting) : null,
    isEventsRed: eventsAreRed(view),
    ai: aiOf(view.ai),
  };
}

// Ο τίτλος της μπάρας, με τη διατύπωση του prototype.
export const p2BannerTitle = (attention: number): string =>
  attention === 0
    ? "Όλα λειτουργούν"
    : attention === 1
      ? "1 θέλει προσοχή"
      : `${attention} θέλουν προσοχή`;
