import { Notice } from "@/components/ui/notice";

import { getSheet } from "../queries-sheet";
import type { FilmingCard } from "../types";

import { SheetPanel } from "./sheet-panel";

interface SheetSectionProps {
  card: FilmingCard;
  viewerId: string | null;
}

// Φορτώνει το Δελτίο της σελίδας E3. Μόνο όποιος βλέπει το Συνεργείο ή είναι μέλος του· ο πελάτης δεν βλέπει τίποτα.
export async function SheetSection({ card, viewerId }: SheetSectionProps) {
  if (card.sheet === null && !card.viewerCan.crew) return null;
  const result = await getSheet(card.id);
  if (!result.ok)
    return (
      <Notice kind="error" title="Το Δελτίο δεν φορτώθηκε">
        <p className="m-0">Δοκίμασε να ανανεώσεις τη σελίδα.</p>
      </Notice>
    );
  if (result.data === null) return null;
  const isOpen = card.state === "pending" || card.state === "scheduled";
  return (
    <SheetPanel
      filmingId={card.id}
      sheet={result.data}
      crew={card.crew}
      viewerId={viewerId}
      canRespond={isOpen}
    />
  );
}
