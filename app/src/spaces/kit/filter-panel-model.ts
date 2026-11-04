// Φίλτρα σε μαλακές κάρτες: τα δεδομένα μιας ομάδας φίλτρων και οι καθαρές συναρτήσεις γύρω τους.
// Κάθε επιλογή είναι σύνδεσμος· η επιλογή ζει στη διεύθυνση.

export interface FilterOption {
  label: string;
  href: string;
  isCurrent: boolean;
  count?: number;
}

export interface FilterGroup {
  label: string;
  options: readonly FilterOption[];
  // Η επιλογή «όλοι/όλα»: όταν υπάρχει, η ομάδα είναι φίλτρο που βγαίνει με ✕.
  all?: FilterOption;
  isSearchable?: boolean;
}

export const optionsOf = (group: FilterGroup): readonly FilterOption[] =>
  group.all ? [group.all, ...group.options] : group.options;

export const currentOf = (group: FilterGroup): FilterOption | undefined =>
  optionsOf(group).find((option) => option.isCurrent) ?? group.all;

export const isSet = (group: FilterGroup): boolean =>
  group.all !== undefined && !group.all.isCurrent;

// Χωρίς τόνους και πεζά, με το τελικό ς ως σ: «ΚΑΦΕΣ» βρίσκεται και ως «καφεσ».
const foldOf = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("el")
    .replaceAll("ς", "σ");

export const matchesQuery = (label: string, query: string): boolean =>
  foldOf(label).includes(foldOf(query.trim()));
