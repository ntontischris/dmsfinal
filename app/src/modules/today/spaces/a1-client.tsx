import Link from "next/link";

import { can, type Viewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";

import "@/spaces/styles/deck.css";
import "./a1-deck.css";
import type { Built } from "./a1-adapter";
import { cardAnchorOf, urgentRowsOf } from "./a1-card";
import { initialsOf } from "./a1-deck-model";
import type { CardRow } from "./a1-model";

// Η Σήμερα του Πελάτη στο ύφος της ομάδας: μία σειρά καρτών-κάδρων (μία ανά κάρτα), που πηγαίνει στο κουτί της από κάτω.

const facesOfRows = (rows: readonly CardRow[]): readonly string[] =>
  [...new Set(rows.map((row) => initialsOf(row.label)).filter(Boolean))].slice(
    0,
    3,
  );

const countOf = ({ card, content }: Built): string =>
  card.kind === "info" || content.isCountless ? "·" : String(content.count);

function ClientReel({ item }: { item: Built }) {
  const { card, content } = item;
  const isUrgent = urgentRowsOf(card, content) > 0;
  return (
    <a
      className="money-reel"
      href={`#${cardAnchorOf(card)}`}
      data-urgent={isUrgent || undefined}
    >
      <span className="money-reel-vf" aria-hidden />
      <span className="money-reel-top">
        {isUrgent && <i className="money-rec">ΕΠΕΙΓΕΙ</i>}
      </span>
      <span className="money-reel-count" aria-hidden>
        {countOf(item)}
      </span>
      <span className="money-reel-title">{card.title}</span>
      <span className="money-reel-foot">
        <span className="money-faces" aria-hidden>
          {facesOfRows(content.rows).map((face) => (
            <span key={face}>{face}</span>
          ))}
        </span>
        <small>{content.summary ?? content.emptyText}</small>
      </span>
    </a>
  );
}

export function ClientDeck({ items }: { items: readonly Built[] }) {
  if (items.length === 0) return null;
  return (
    <nav className="money-deck today-deck" aria-label="Οι κάρτες της Σήμερα">
      {items.map((item) => (
        <ClientReel key={item.card.id} item={item} />
      ))}
    </nav>
  );
}

// Τα Τιμολόγια και η Καρτέλα, ένα πάτημα από την αρχική· μόνο για όποιον βλέπει τα Οικονομικά του Πελάτη.
export function ClientMoneyShelf({ viewer }: { viewer: Viewer }) {
  if (!can(viewer, "c.finance")) return null;
  return (
    <nav className="ml-shelf a1-shelf" aria-label="Τα οικονομικά σου">
      <Link href={hrefOf("I2")}>
        <span className="ml-mark" aria-hidden>
          €
        </span>
        <strong>Τιμολόγια</strong>
        <small>Τι έχεις πληρώσει και τι μένει</small>
      </Link>
      <Link href={hrefOf("I5")}>
        <span className="ml-mark" aria-hidden>
          ≡
        </span>
        <strong>Καρτέλα</strong>
        <small>Όλες οι κινήσεις σου με εμάς</small>
      </Link>
    </nav>
  );
}
