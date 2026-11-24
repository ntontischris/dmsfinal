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
  return (
    <nav className="money-deck" aria-label={view.label} data-spaces>
      {cards.map((card, index) => (
        <Link
          key={card.code}
          href={card.href}
          className="money-reel"
          aria-current={card.code === active.code ? "page" : undefined}
          scroll={false}
        >
          <span className="money-reel-vf" aria-hidden />
          <span className="money-reel-top" aria-hidden>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="money-reel-count" aria-hidden>
            {String(index + 1)}
          </span>
          <strong className="money-reel-title">{card.label}</strong>
          <NavPending />
        </Link>
      ))}
    </nav>
  );
}
