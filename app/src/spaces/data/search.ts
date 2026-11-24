// Τι βρίσκει η αναζήτηση (Ctrl+K): τις οθόνες των Χώρων του Χρήστη και τις ενέργειες του «+ Νέο».
// Ο σύντομος τίτλος φαίνεται· ο πλήρης μένει μόνο για το ταίριασμα. Από το prototype `data/search.ts`, χωρίς τα στοιχεία
// (Αναφορές, Παραδοτέα): η αναζήτηση εγγραφών έρχεται σε επόμενο βήμα.

import { newActionHref, newActionsFor } from "@/spaces/data/new-actions";
import {
  hrefFor,
  isCodeVisible,
  titleOf,
  type Allows,
} from "@/spaces/data/screens";
import { labelOf, spacesModel } from "@/spaces/data/spaces";

export interface SearchItem {
  label: string;
  // Πού ζει: ο Χώρος ή «Νέο».
  space: string;
  href: string;
  // Λέξεις που ψάχνονται χωρίς να φαίνονται.
  keywords?: string;
  // Τα «section» φαίνονται και χωρίς όρο αναζήτησης.
  kind: "section" | "item";
}

// Λέξεις που βρίσκουν μια οθόνη χωρίς να είναι ο τίτλος της (π.χ. «Τιμές» για τον Κατάλογο).
const EXTRA_WORDS: Readonly<Record<string, readonly string[]>> = {
  C1: ["Τιμές"],
};
const linkWordsOf = (code: string): readonly string[] =>
  EXTRA_WORDS[code] ?? [];

// Μόνο οθόνες με σταθερή διαδρομή: οι σελίδες ενός στοιχείου (π.χ. ένας Πελάτης) ανοίγουν από τη λίστα τους.
const sectionsOf = (allows: Allows): readonly SearchItem[] =>
  spacesModel(allows).spaces.flatMap((view) =>
    view.codes
      .filter(
        (code) =>
          isCodeVisible(code, allows) &&
          !hrefFor(code, allows).includes("{id}"),
      )
      .map((code) => ({
        label: labelOf(code),
        space: view.label,
        href: hrefFor(code, allows),
        keywords: [titleOf(code), ...linkWordsOf(code)].join(" "),
        kind: "section" as const,
      })),
  );

const actionsOf = (allows: Allows): readonly SearchItem[] =>
  newActionsFor(allows).map((action) => ({
    label: action.label,
    space: "Νέο",
    href: newActionHref(action, "1"),
    kind: "section" as const,
  }));

// Κάθε προορισμός μία φορά: η ενέργεια του «+ Νέο» που ανοίγει μια ενότητα δεν τη διπλασιάζει.
const uniqueByHref = (items: readonly SearchItem[]): readonly SearchItem[] =>
  items.filter(
    (item, index) =>
      items.findIndex((other) => other.href === item.href) === index,
  );

export const searchItemsFor = (allows: Allows): readonly SearchItem[] =>
  uniqueByHref([...sectionsOf(allows), ...actionsOf(allows)]);
