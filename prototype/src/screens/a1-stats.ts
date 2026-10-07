import type { StatProps } from "@/kit/panel";
import type { CardContent, CardDef } from "@/screens/a1-model";

interface BuiltCard {
  card: CardDef;
  content: CardContent;
}

const MAX_STATS = 4;

const urgentCount = (content: CardContent): number =>
  content.rows.filter((row) => row.isUrgent).length;

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
      const urgent = urgentCount(content);
      return {
        label: card.title,
        value: String(content.count),
        hint: urgent > 0 ? `${urgent} επείγοντα` : "σε αναμονή",
        tone: urgent > 0 ? ("attention" as const) : undefined,
        href: content.allHref,
      };
    });
}
