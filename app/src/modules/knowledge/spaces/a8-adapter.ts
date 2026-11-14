// A8 (νέα εμφάνιση): η πραγματική Βιβλιοθήκη (knowledge_library) και η αναζήτηση (knowledge_search) στις ομάδες γραμμών
// του prototype (`screens/A8.tsx`). Καθαρές συναρτήσεις.

import { fmtDate } from "@/spaces/screens/shared";

import { itemHref } from "../helpers";
import { KIND_LABEL } from "../labels";
import type { ItemKind, Library, SearchResult } from "../view-schema";

export interface A8Row {
  id: string;
  href: string;
  // «Α» για Άρθρο, «Φ» για Αρχείο, όπως το τετραγωνάκι του prototype.
  letter: string;
  kindLabel: string;
  title: string;
  summary: string;
  // «Ενημερώθηκε 03/11/2026» στη Βιβλιοθήκη, «Ενότητα: …» στην αναζήτηση.
  extra: string;
}

export interface A8Group {
  id: string;
  title: string;
  blurb: string;
  rows: A8Row[];
}

const ATHENS_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Athens",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Η μέρα στην Αθήνα, ως «ηη/μμ/εεεε» (το fmtDate του prototype θέλει ISO ημερομηνία).
export const athensDate = (iso: string): string =>
  fmtDate(ATHENS_DAY.format(new Date(iso)));

export const kindLetter = (kind: ItemKind): string =>
  kind === "article" ? "Α" : "Φ";

interface RowSource {
  id: string;
  kind: ItemKind;
  title: string;
  summary: string;
}

const rowOf = (item: RowSource, extra: string): A8Row => ({
  id: item.id,
  href: itemHref(item.id),
  letter: kindLetter(item.kind),
  kindLabel: KIND_LABEL[item.kind],
  title: item.title,
  summary: item.summary,
  extra,
});

// Οι Ενότητες με τα στοιχεία τους· οι άδειες Ενότητες δεν φαίνονται (όπως το sectionsWithItems του prototype).
export const libraryGroups = (library: Library): A8Group[] =>
  library.sections
    .filter((section) => section.items.length > 0)
    .map((section) => ({
      id: section.id,
      title: section.name,
      blurb: section.description,
      rows: section.items.map((item) =>
        rowOf(item, `Ενημερώθηκε ${athensDate(item.updatedAt)}`),
      ),
    }));

// Μόνο η Ενότητα της διεύθυνσης (?section=), αν υπάρχει· αλλιώς όλες.
export const onlySection = (
  groups: readonly A8Group[],
  section: string | null,
): A8Group[] =>
  section ? groups.filter((group) => group.id === section) : [...groups];

// Τα αποτελέσματα της αναζήτησης ως μία ομάδα (η βάση τα ταξινομεί κατά συνάφεια).
export const searchGroups = (q: string, result: SearchResult): A8Group[] =>
  result.items.length === 0
    ? []
    : [
        {
          id: "search",
          title: `Αποτελέσματα για «${q}»`,
          blurb: "",
          rows: result.items.map((item) =>
            rowOf(item, `Ενότητα: ${item.sectionName}`),
          ),
        },
      ];
