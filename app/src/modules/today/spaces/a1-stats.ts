import type { StatProps } from "@/spaces/kit/panel";
import type { CardContent, CardDef } from "./a1-model";

interface BuiltCard {
  card: CardDef;
  content: CardContent;
}

const MAX_STATS = 3;

const urgentCount = (content: CardContent): number =>
  content.rows.filter((row) => row.isUrgent).length;

const hintOf = (urgent: number, isGentle: boolean): string => {
  if (isGentle) return "περιμένουν την απάντησή σου";
  if (urgent === 0) return "σε αναμονή";
  return urgent === 1 ? "1 επείγον" : `${urgent} επείγοντα`;
};

// Οι δείκτες της «Σήμερα»: οι ουρές με τα περισσότερα επείγοντα, μετά με τον μεγαλύτερο αριθμό.
// Κάρτες χωρίς αριθμό (ποσά, εβδομάδα, Υγεία) δεν μπαίνουν.
export function pickStats(built: readonly BuiltCard[]): readonly StatProps[] {
  return built
    .filter(
      ({ card, content }) =>
        card.kind === "action" && !content.isCountless && content.count > 0,
    )
    .sort(
      (a, b) =>
        urgentCount(b.content) - urgentCount(a.content) ||
        b.content.count - a.content.count,
    )
    .slice(0, MAX_STATS)
    .map(({ card, content }) => {
      const urgent = card.isGentle ? 0 : urgentCount(content);
      return {
        label: card.title,
        value: String(content.count),
        hint: hintOf(urgent, card.isGentle === true),
        tone: urgent > 0 ? ("attention" as const) : undefined,
        href: content.allHref,
      };
    });
}
