// L1 (νέα εμφάνιση): η πραγματική λίστα της Διαχείρισης Γνώσης (knowledge_manage_list) στις γραμμές και στα φίλτρα
// του prototype (`screens/L1.tsx`). Καθαρές συναρτήσεις.

import type { BadgeTone } from "@/spaces/screens/shared";

import { audienceText, editHref, MANAGE_PATH } from "../helpers";
import { KIND_LABEL, STATUS_LABEL } from "../labels";
import type { ItemStatus, ManageItemRow } from "../view-schema";
import { athensDate, kindLetter } from "./a8-adapter";

export interface L1Row {
  id: string;
  href: string;
  letter: string;
  title: string;
  // «Άρθρο · Ενότητα · Κοινό: …»
  facts: string;
  // «ενημερώθηκε 03/11/2026 από …»
  updated: string;
  isImageOnly: boolean;
  status: string;
  tone: BadgeTone;
}

export const l1RowOf = (item: ManageItemRow): L1Row => ({
  id: item.id,
  href: editHref(item.id),
  letter: kindLetter(item.kind),
  title: item.title,
  facts: `${KIND_LABEL[item.kind]} · ${item.sectionName} · Κοινό: ${audienceText(item.audience)}`,
  updated: `ενημερώθηκε ${athensDate(item.updatedAt)}${item.updatedByName ? ` από ${item.updatedByName}` : ""}`,
  isImageOnly: item.textStatus === "image_only",
  status: STATUS_LABEL[item.status],
  tone: item.status === "draft" ? "waiting" : "strong",
});

// Η διεύθυνση της λίστας με τα φίλτρα της· οι κενές τιμές παραλείπονται.
export const manageHref = (
  params: Readonly<Record<string, string | null>>,
): string => {
  const query = new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => entry[1] !== null,
    ),
  ).toString();
  return query ? `${MANAGE_PATH}?${query}` : MANAGE_PATH;
};

export interface L1Filter {
  label: string;
  href: string;
  isCurrent: boolean;
}

// «όλα · πρόχειρα · δημοσιευμένα»· η Ενότητα που διάλεξε ο Χρήστης μένει.
export const l1Filters = (
  status: ItemStatus | null,
  sectionId: string | null,
): L1Filter[] =>
  (
    [
      { value: null, label: "όλα" },
      { value: "draft", label: "πρόχειρα" },
      { value: "published", label: "δημοσιευμένα" },
    ] as const
  ).map((option) => ({
    label: option.label,
    href: manageHref({ status: option.value, section: sectionId }),
    isCurrent: option.value === status,
  }));
