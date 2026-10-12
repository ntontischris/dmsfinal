import { rendererOf, type CardViewProps } from "../cards";
import { GenericCard } from "./generic-card";

// Η κάρτα με τον δικό της renderer (cards/<ομάδα>.tsx) ή, αν δεν έχει, με τη γενική. Οι renderers είναι καθαρές
// συναρτήσεις χωρίς hooks, γι' αυτό καλούνται απευθείας.
export function CardView({ card, data }: CardViewProps) {
  const render = rendererOf(card.code) ?? GenericCard;
  return render({ card, data });
}
