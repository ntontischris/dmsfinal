import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { GenericCard } from "../components/generic-card";
import type { CardRenderers, CardViewProps } from "./types";

const BOOK_PATH = "/app/book";

// Τα επόμενα Γυρίσματα, με «Κλείσε Γύρισμα». Η κάρτα υπάρχει μόνο για όποιον έχει c.book (το ελέγχει η βάση).
function ClientFilmingCard({ card, data }: CardViewProps) {
  return (
    <div className="grid content-start gap-2">
      {GenericCard({ card, data })}
      <Link href={BOOK_PATH} className={buttonVariants({ variant: "primary" })}>
        Κλείσε Γύρισμα
      </Link>
    </div>
  );
}

// Κάρτες της ομάδας «Ο Χρήστης πελάτη». Κάθε κάρτα που θέλει δική της εμφάνιση προστίθεται εδώ (code → renderer)·
// όσες δεν είναι εδώ τις δείχνει η γενική κάρτα.
export const CLIENT_CARDS: CardRenderers = {
  client_filming: ClientFilmingCard,
};
