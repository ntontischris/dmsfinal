import { hrefOf } from "@/spaces/data/screens";
import { fmtDate, fmtMoney } from "@/spaces/screens/shared";

import type {
  ClientAgreementCard,
  ClientPeriod,
  ClientProvision,
} from "../client-view-schema";
import { formatMonth } from "../helpers";
import { KIND_LABELS } from "../labels";
import type { AgreementState, ProposalDocument } from "../types";

// Η όψη πελάτη της D1/D2 (prototype `screens/d1-client-cards.tsx`, `d2-client-summary.tsx`, `d2-history.tsx` με isClient):
// λόγια πελάτη, χωρίς εσωτερικά βήματα («Αναμένει Έγκριση») και χωρίς «Ευκαιρία», «Παροχή», «Περίοδος».

interface StateInput {
  state: AgreementState;
  startOn: string | null;
}

// Η κατάσταση με λόγια πελάτη.
export const clientStatusOf = ({ state, startOn }: StateInput): string => {
  if (state === "proposal") return "Πρόταση: περιμένει την υπογραφή σας";
  if (state === "signed")
    return startOn
      ? `Υπογεγραμμένη, ξεκινά ${fmtDate(startOn)}`
      : "Υπογεγραμμένη";
  if (state === "active") return "Ενεργή";
  if (state === "expired") return "Έληξε";
  return "Λύθηκε";
};

// «1.000 € / μήνα» ή «800 € εφάπαξ», από το καθαρό του εγγράφου.
export const clientAmountOf = (
  card: Pick<ClientAgreementCard, "net" | "kind">,
): string | null =>
  card.net === null
    ? null
    : `${fmtMoney(card.net)} ${card.kind === "monthly" ? "/ μήνα" : "εφάπαξ"}`;

const unitWord = (p: Pick<ClientProvision, "unit">): string =>
  p.unit.toLocaleLowerCase("el");

// «3 reels» / «1 reel»: ό,τι απομένει.
const leftLabel = (p: ClientProvision): string =>
  `${p.balance} ${p.balance === 1 ? p.label : p.unit}`;

// «μένει 1» / «μένουν 3».
const leftWords = (p: ClientProvision): string =>
  p.balance === 1 ? "μένει 1" : `μένουν ${p.balance}`;

// «reels: δόθηκαν 4 (+1 από τον προηγούμενο μήνα), έγινε 1, 1 κλεισμένο, μένουν 3».
export const balanceWordsOf = (p: ClientProvision): string => {
  const carried =
    p.carried > 0 ? ` (+${p.carried} από τον προηγούμενο μήνα)` : "";
  const done = p.used === 1 ? "έγινε 1" : `έγιναν ${p.used}`;
  const reserved =
    p.reserved === 0
      ? ""
      : p.reserved === 1
        ? ", 1 κλεισμένο"
        : `, ${p.reserved} κλεισμένα`;
  return `${unitWord(p)}: δόθηκαν ${p.given}${carried}, ${done}${reserved}, ${leftWords(p)}`;
};

export interface ClientCardView {
  id: string;
  href: string;
  title: string;
  status: string;
  isProposal: boolean;
  kind: string;
  amount: string | null;
  validUntil: string | null;
  // Ο μήνας που τρέχει και ό,τι απομένει (μόνο ενεργή Συμφωνία με μήνα σε εξέλιξη).
  current: { label: string; remaining: string } | null;
  cta: string;
}

const currentOf = (card: ClientAgreementCard): ClientCardView["current"] =>
  card.state === "active" && card.current
    ? {
        label: formatMonth(card.current.starts),
        remaining: card.current.provisions.map(leftLabel).join(" · ") || "—",
      }
    : null;

export const clientCardOf = (card: ClientAgreementCard): ClientCardView => {
  const isProposal = card.state === "proposal";
  return {
    id: card.id,
    href: hrefOf("D2", { id: card.id }),
    title: card.title,
    status: clientStatusOf(card),
    isProposal,
    kind: KIND_LABELS[card.kind],
    amount: clientAmountOf(card),
    validUntil: isProposal && card.validUntil ? fmtDate(card.validUntil) : null,
    current: currentOf(card),
    cta: isProposal ? "Δες και υπόγραψε" : "Δες το πακέτο και τους όρους",
  };
};

// «4 reels, 2 γυρίσματα»: τι περιλαμβάνει, από το έγγραφο, τα περισσότερα πρώτα.
export const offerOf = (document: ProposalDocument): string =>
  [...document.provisionTotals]
    .sort((a, b) => b.quantity - a.quantity)
    .map((p) => `${p.quantity} ${unitWord(p)}`)
    .join(", ");

const MONTH_STATE: Readonly<Record<ClientPeriod["state"], string>> = {
  closed: "έκλεισε",
  current: "τρέχει",
  next: "επόμενος",
};

export interface ClientPeriodRow {
  n: number;
  label: string;
  dates: string;
  isPartial: boolean;
  isCurrent: boolean;
  amount: string | null;
  state: string;
  balances: string[];
}

export const clientPeriodRowOf = (period: ClientPeriod): ClientPeriodRow => ({
  n: period.n,
  label: formatMonth(period.starts),
  dates: `${fmtDate(period.starts)} – ${fmtDate(period.ends)}`,
  isPartial: period.isPartial,
  isCurrent: period.state === "current",
  amount: period.amount === null ? null : fmtMoney(period.amount),
  state: MONTH_STATE[period.state],
  balances: period.provisions.map(balanceWordsOf),
});
