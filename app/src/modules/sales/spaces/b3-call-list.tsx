import Link from "next/link";

import type { BoardCard } from "./b3-adapter";
import type { BoardFilter } from "./b3-filters";
import { initialsOf, lastContactText } from "./b3-line-text";

const EMPTY_TEXT: Readonly<Record<Exclude<BoardFilter, "all">, string>> = {
  week: "Κανένα Επόμενο βήμα μέσα στις επόμενες 7 μέρες.",
  forgotten: "Κανένα τηλέφωνο δεν χρωστάς. Όλα στην ώρα τους.",
  quiet: "Με όλες τις ανοιχτές Ευκαιρίες μίλησες πρόσφατα.",
};

function CallLine({ card, today }: { card: BoardCard; today: string }) {
  return (
    <li className="ml-line" data-urgent={card.isForgotten || undefined}>
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(card.clientName)}
      </span>
      <span className="ml-main">
        {card.overdue && <span className="ml-tag">έπρεπε {card.overdue}</span>}
        <strong>{card.clientName}</strong>
        <small>
          <Link href={card.href}>{card.title}</Link>
        </small>
        <small>
          {card.nextStep ?? "Χωρίς Επόμενο βήμα"} ·{" "}
          {lastContactText(card.lastContact, today)}
        </small>
      </span>
      {card.amount && <span className="ml-amount">{card.amount}</span>}
    </li>
  );
}

// Με φίλτρο: λίστα αντί για στήλες (και στο κινητό), ώστε να ξέρεις ποιον παίρνεις πρώτο. Το τηλέφωνο του Πελάτη
// δεν έρχεται με το Pipeline· η Ευκαιρία ανοίγει με ένα πάτημα.
export function CallList({
  cards,
  filter,
  today,
}: {
  cards: readonly BoardCard[];
  filter: Exclude<BoardFilter, "all">;
  today: string;
}) {
  if (cards.length === 0) return <p className="muted">{EMPTY_TEXT[filter]}</p>;
  const sorted = cards.toSorted((a, b) =>
    (a.nextStepDue ?? "9999").localeCompare(b.nextStepDue ?? "9999"),
  );
  return (
    <section className="b3-calls">
      <h2 className="ml-box-title">Πάρε τηλέφωνο</h2>
      <ul className="ml-list">
        {sorted.map((card) => (
          <CallLine key={card.id} card={card} today={today} />
        ))}
      </ul>
    </section>
  );
}
