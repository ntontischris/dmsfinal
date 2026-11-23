import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { getViewer } from "@/modules/access";
import { allowsOf } from "@/spaces/data/allows";
import { spacesModel, type ScreenLink } from "@/spaces/data/spaces";
import { fmtMoney } from "@/spaces/screens/shared";

import { salesCaps } from "../helpers";
import {
  loadClientsNumbers,
  type ClientsNumbers,
} from "./clients-deck-numbers";

import "../../finance/spaces/money-deck.css";
import "../../finance/spaces/money-lines.css";
import "./clients-deck.css";

interface Reel {
  tone: "peri" | "yellow" | "text";
  count: string;
  hint: string;
  isUrgent?: boolean;
}

const clientsReel = (clients: ClientsNumbers["clients"]): Reel =>
  clients
    ? {
        tone: "peri",
        count: String(clients.active),
        hint:
          clients.burning > 0
            ? `${clients.burning} επόμενα βήματα καίνε`
            : "ενεργοί · κανένα βήμα δεν καίει",
        isUrgent: clients.overdue > 0,
      }
    : { tone: "peri", count: "·", hint: "όλοι οι Πελάτες" };

const pipelineReel = (pipeline: ClientsNumbers["pipeline"]): Reel =>
  pipeline
    ? {
        tone: "peri",
        count: String(pipeline.open),
        hint:
          pipeline.total !== null
            ? `${fmtMoney(pipeline.total)} ανοιχτή αξία`
            : "ανοιχτές Ευκαιρίες",
      }
    : { tone: "peri", count: "·", hint: "οι Ευκαιρίες ανά Στάδιο" };

const agreementsHint = (
  agreements: NonNullable<ClientsNumbers["agreements"]>,
): string => {
  if (agreements.waiting === 0) return "καμία πρόταση δεν περιμένει";
  if (agreements.total !== null)
    return `${fmtMoney(agreements.total)} περιμένουν ναι`;
  return agreements.approval > 0
    ? `${agreements.approval} θέλουν Έγκριση`
    : "προτάσεις στον Πελάτη";
};

const agreementsReel = (agreements: ClientsNumbers["agreements"]): Reel =>
  agreements
    ? {
        tone: "yellow",
        count: String(agreements.waiting),
        hint: agreementsHint(agreements),
      }
    : { tone: "yellow", count: "·", hint: "προτάσεις και υπογραφές" };

const catalogueReel = (catalogue: ClientsNumbers["catalogue"]): Reel =>
  catalogue
    ? {
        tone: "text",
        count: String(catalogue.packages + catalogue.services),
        hint: `${catalogue.packages} Πακέτα · ${catalogue.services} Υπηρεσίες`,
      }
    : { tone: "text", count: "·", hint: "Πακέτα και Υπηρεσίες" };

const reelOf = (code: string, numbers: ClientsNumbers): Reel => {
  if (code === "B1") return clientsReel(numbers.clients);
  if (code === "B3") return pipelineReel(numbers.pipeline);
  if (code === "D1") return agreementsReel(numbers.agreements);
  return catalogueReel(numbers.catalogue);
};

interface ClientsDeckProps {
  active: string;
}

// Οι καρτέλες του Χώρου «Πελάτες» ως μεγάλες κάρτες-κάδρα (όπως τα «Χρήματα»), με αληθινούς αριθμούς.
// Είναι η πλοήγηση του Χώρου: ίδια ονόματα και aria-current με τις καρτέλες, για να μη χαθεί καμία οθόνη.
export async function ClientsDeck({ active }: ClientsDeckProps) {
  const viewer = await getViewer();
  const view = spacesModel(allowsOf(viewer)).spaces.find(
    (space) => space.id === "clients",
  );
  if (!view) return null;
  const numbers = await loadClientsNumbers(viewer);
  const clients = view.tabs.find((tab) => tab.code === "B1");
  return (
    <>
      <div className="ml-head">
        <p>Διάλεξε κάρτα. Ό,τι καίει, βγαίνει πρώτο μέσα της.</p>
        {clients && salesCaps(viewer).canManage && (
          <Link className="ml-cta" href={`${clients.href}?new=1`}>
            + Νέος Πελάτης / Ευκαιρία
          </Link>
        )}
      </div>
      <nav className="money-deck clients-deck" aria-label={view.label}>
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
    </>
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
        <small>{reel.hint}</small>
      </span>
    </Link>
  );
}

interface WithClientsDeckProps {
  active: string;
  children: ReactNode;
}

// Οι κάρτες πάνω από την οθόνη· όσο φορτώνουν οι αριθμοί, ένα ήσυχο κάδρο στο ίδιο ύψος (η οθόνη δεν περιμένει).
export function WithClientsDeck({ active, children }: WithClientsDeckProps) {
  return (
    <>
      <Suspense
        fallback={<div className="money-deck money-deck-wait" aria-hidden />}
      >
        <ClientsDeck active={active} />
      </Suspense>
      {children}
    </>
  );
}
