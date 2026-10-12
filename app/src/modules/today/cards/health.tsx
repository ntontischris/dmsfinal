import { READINESS } from "@/modules/settings";

import { GenericCard } from "../components/generic-card";
import type { CardRenderers, CardViewProps } from "./types";

// Ετοιμότητα: η βάση στέλνει μόνο τους κωδικούς των βημάτων· οι ετικέτες είναι του module Ρυθμίσεις (O7).
function ReadinessCard({ card, data }: CardViewProps) {
  const items = data.items.map((item) => ({
    ...item,
    title: READINESS[item.id]?.label ?? item.title,
    subtitle: READINESS[item.id]?.who ?? item.subtitle,
  }));
  return GenericCard({ card, data: { ...data, items } });
}

// Κάρτες της ομάδας «Υγεία και Ετοιμότητα». Κάθε κάρτα που θέλει δική της εμφάνιση προστίθεται εδώ (code → renderer)·
// όσες δεν είναι εδώ τις δείχνει η γενική κάρτα.
export const HEALTH_CARDS: CardRenderers = {
  readiness: ReadinessCard,
};
