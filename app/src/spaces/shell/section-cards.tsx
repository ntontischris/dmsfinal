"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  screenCodeOf,
  spaceOf,
  tabOf,
  type ScreenLink,
  type SpacesModel,
  type SpaceView,
} from "@/spaces/data/spaces";
import { NavPending } from "@/spaces/shell/nav-pending";
import {
  useCardNumbers,
  type CardNumber,
} from "@/spaces/shell/section-numbers";

interface SectionCardsProps {
  model: SpacesModel;
}

// Οι σελίδες ενός θέματος ως κάρτες: πρώτα οι λίστες του, μετά ό,τι άλλο έχει (π.χ. αναφορές).
const cardsOf = (view: SpaceView): readonly ScreenLink[] => [
  ...view.tabs,
  ...view.more,
];

// Οι κάρτες του θέματος πάνω από τη λίστα, ίδιες με τις κάρτες της «Σήμερα»: από εδώ διαλέγεις σελίδα, όχι από
// το μενού. Μόνο στις λίστες του θέματος· στη σελίδα ενός στοιχείου μένει η διαδρομή «Θέμα / …» για επιστροφή.
export function SectionCards({ model }: SectionCardsProps) {
  const code = screenCodeOf(usePathname(), model);
  const view = spaceOf(code, model);
  if (!code || !view) return null;
  const cards = cardsOf(view);
  const active = cards.find(
    (card) => card.code === code || card.code === tabOf(code),
  );
  if (cards.length < 2 || !active) return null;
  return <Deck label={view.label} cards={cards} activeCode={active.code} />;
}

interface DeckProps {
  label: string;
  cards: readonly ScreenLink[];
  activeCode: string;
}

function Deck({ label, cards, activeCode }: DeckProps) {
  const numbers = useCardNumbers();
  return (
    <nav className="money-deck" aria-label={label} data-spaces>
      {cards.map((card, index) => (
        <Card
          key={card.code}
          card={card}
          index={index}
          number={numbers[card.code]}
          isActive={card.code === activeCode}
        />
      ))}
    </nav>
  );
}

interface CardProps {
  card: ScreenLink;
  index: number;
  number: CardNumber | undefined;
  isActive: boolean;
}

// Χωρίς αριθμό (ακόμα φορτώνει ή δεν τον δικαιούται ο θεατής) η θέση του μένει κενή: μια σκέτη τελεία έμοιαζε με σφάλμα.
function Card({ card, index, number, isActive }: CardProps) {
  return (
    <Link
      href={card.href}
      className="money-reel"
      data-urgent={number?.isUrgent ? "" : undefined}
      aria-current={isActive ? "page" : undefined}
      aria-label={card.label}
      scroll={false}
    >
      <span className="money-reel-vf" aria-hidden />
      <span className="money-reel-top" aria-hidden>
        {String(index + 1).padStart(2, "0")}
        {number?.isUrgent && <i className="money-rec">ΚΑΘΥΣΤΕΡΕΙ</i>}
      </span>
      <span className="money-reel-count" aria-hidden>
        {number?.count}
      </span>
      <strong className="money-reel-title">{card.label}</strong>
      <span className="money-reel-foot">
        {number && <small>{number.hint}</small>}
      </span>
      <NavPending />
    </Link>
  );
}
