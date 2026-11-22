import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { getViewer } from "@/modules/access";
import { allowsOf } from "@/spaces/data/allows";
import { spacesModel, type ScreenLink } from "@/spaces/data/spaces";
import { fmtMoney } from "@/spaces/screens/shared";

import { getBillables } from "../billables-queries";
import { financeCaps } from "../caps";
import { getInvoices } from "../invoices-queries";

import "./money-deck.css";
import "./money-lines.css";

type Tone = "peri" | "yellow" | "text";

interface Reel {
  tone: Tone;
  count: string;
  hint: string;
  faces?: readonly string[];
  isUrgent?: boolean;
}

interface Numbers {
  toInvoice: { clients: readonly string[]; total: number } | null;
  unpaid: { count: number; total: number; overdue: number } | null;
}

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

// Οι αριθμοί μόνο για όποιον βλέπει ποσά· οι υπόλοιποι βλέπουν τις κάρτες χωρίς αριθμούς.
async function loadNumbers(canView: boolean): Promise<Numbers> {
  if (!canView) return { toInvoice: null, unpaid: null };
  const [billables, invoices] = await Promise.all([
    getBillables(),
    getInvoices("unpaid"),
  ]);
  return {
    toInvoice: billables.ok
      ? {
          clients: billables.data.clients.map((client) => client.clientName),
          total: billables.data.total,
        }
      : null,
    unpaid: invoices.ok
      ? {
          count: invoices.data.totals.unpaidCount,
          total: invoices.data.totals.unpaid,
          overdue: invoices.data.totals.overdueCount,
        }
      : null,
  };
}

const toInvoiceReel = (toInvoice: Numbers["toInvoice"]): Reel =>
  toInvoice
    ? {
        tone: "peri",
        count: String(toInvoice.clients.length),
        hint:
          toInvoice.clients.length > 0
            ? `${fmtMoney(toInvoice.total)} περιμένουν`
            : "όλα τιμολογημένα",
        faces: toInvoice.clients.slice(0, 3).map(initialsOf),
      }
    : { tone: "peri", count: "·", hint: "ό,τι περιμένει τιμολόγηση" };

const invoicesReel = (unpaid: Numbers["unpaid"]): Reel =>
  unpaid
    ? {
        tone: "peri",
        count: String(unpaid.count),
        hint:
          unpaid.count > 0
            ? `${fmtMoney(unpaid.total)} μας χρωστούν`
            : "κανείς δεν χρωστά",
        isUrgent: unpaid.overdue > 0,
      }
    : { tone: "peri", count: "·", hint: "τα τιμολόγιά μας" };

const reelOf = (code: string, numbers: Numbers): Reel => {
  if (code === "I1") return toInvoiceReel(numbers.toInvoice);
  if (code === "I2") return invoicesReel(numbers.unpaid);
  if (code === "I4") return { tone: "text", count: "+", hint: "ήρθε πληρωμή" };
  return { tone: "yellow", count: "€", hint: "μία φορά τον μήνα" };
};

interface MoneyDeckProps {
  active: string;
}

// Οι καρτέλες των «Χρημάτων» ως μεγάλες κάρτες-κάδρα (prototype `dms/xrimata`), με αληθινούς αριθμούς.
// Είναι η πλοήγηση του Χώρου: ίδια ονόματα και aria-current με τις καρτέλες, για να μη χαθεί καμία οθόνη.
export async function MoneyDeck({ active }: MoneyDeckProps) {
  const viewer = await getViewer();
  const view = spacesModel(allowsOf(viewer)).spaces.find(
    (space) => space.id === "money",
  );
  if (!view) return null;
  const numbers = await loadNumbers(financeCaps(viewer).canView);
  const receipts = view.tabs.find((tab) => tab.code === "I4");
  return (
    <>
      <div className="ml-head">
        <p>Διάλεξε κάρτα. Ό,τι καίει, βγαίνει πρώτο μέσα της.</p>
        {receipts && (
          <Link className="ml-cta" href={receipts.href}>
            + Νέα είσπραξη
          </Link>
        )}
      </div>
      <nav className="money-deck" aria-label={view.label}>
        {view.tabs.map((tab, index) => (
          <ReelLink
            key={tab.code}
            tab={tab}
            index={index}
            reel={reelOf(tab.code, numbers)}
            isActive={tab.code === active}
          />
        ))}
      </nav>
      <Shelf links={view.more} />
    </>
  );
}

// Το ράφι «Ο μήνας» του prototype: τα εργαλεία του μήνα (ήδη στα «Εργαλεία»), εδώ ορατά κάτω από τις κάρτες.
const SHELF: readonly { code: string; mark: string; label: string; sub: string }[] = [
  { code: "M1", mark: "≡", label: "Ο μήνας με μια ματιά", sub: "τζίρος, εισπράξεις, έξοδα" },
  { code: "I7", mark: "%", label: "Κέρδος ανά Παραγωγή", sub: "τι έμεινε από κάθε δουλειά" },
  { code: "M2", mark: "↧", label: "Πακέτο λογιστή", sub: "εξαγωγή για τον λογιστή" },
  { code: "I5", mark: "☰", label: "Καρτέλα Πελάτη", sub: "κινήσεις και υπόλοιπο" },
];

function Shelf({ links }: { links: readonly ScreenLink[] }) {
  const entries = SHELF.flatMap((entry) => {
    const link = links.find((candidate) => candidate.code === entry.code);
    return link ? [{ ...entry, href: link.href }] : [];
  });
  if (entries.length === 0) return null;
  return (
    <nav className="ml-shelf" aria-label="Ο μήνας">
      {entries.map((entry) => (
        <Link key={entry.code} href={entry.href}>
          <span className="ml-mark" aria-hidden>
            {entry.mark}
          </span>
          <strong>{entry.label}</strong>
          <small>{entry.sub}</small>
        </Link>
      ))}
    </nav>
  );
}

interface ReelLinkProps {
  tab: ScreenLink;
  index: number;
  reel: Reel;
  isActive: boolean;
}

function ReelLink({ tab, index, reel, isActive }: ReelLinkProps) {
  return (
    <Link
      href={tab.href}
      className="money-reel"
      data-tone={reel.tone}
      data-urgent={reel.isUrgent ? "" : undefined}
      aria-current={isActive ? "page" : undefined}
      aria-label={tab.label}
      scroll={false}
    >
      <span className="money-reel-vf" aria-hidden />
      <span className="money-reel-top" aria-hidden>
        {String(index + 1).padStart(2, "0")}
        {reel.isUrgent && <i className="money-rec">ΚΑΘΥΣΤΕΡΕΙ</i>}
      </span>
      <span className="money-reel-count" aria-hidden>
        {reel.count}
      </span>
      <strong className="money-reel-title">{tab.label}</strong>
      <span className="money-reel-foot">
        {reel.faces && reel.faces.length > 0 && (
          <span className="money-faces" aria-hidden>
            {reel.faces.map((face, at) => (
              <span key={at}>{face}</span>
            ))}
          </span>
        )}
        <small>{reel.hint}</small>
      </span>
    </Link>
  );
}

interface WithMoneyDeckProps {
  active: string;
  children: ReactNode;
}

// Οι κάρτες πάνω από την οθόνη· όσο φορτώνουν οι αριθμοί, ένα ήσυχο κάδρο στο ίδιο ύψος (η οθόνη δεν περιμένει).
export function WithMoneyDeck({ active, children }: WithMoneyDeckProps) {
  return (
    <>
      <Suspense
        fallback={<div className="money-deck money-deck-wait" aria-hidden />}
      >
        <MoneyDeck active={active} />
      </Suspense>
      {children}
    </>
  );
}
