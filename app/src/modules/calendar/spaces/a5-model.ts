// A5 (νέα εμφάνιση): οι πραγματικές μέρες του Ημερολογίου (buildCalendarDays) στα στοιχεία του prototype (`screens/a5-*`).
// Καθαρές συναρτήσεις. Ό,τι δεν έχει πηγή στη βάση (φόρτος ανά άτομο) δεν εμφανίζεται.

import { hrefOf } from "@/spaces/data/screens";

import type { CalendarDay } from "../calendar-days";
import { kindToneOf, type KindColor } from "../kind-style";
import { dayStatusLabel } from "../labels";
import type { BlockedKind } from "../types";
import type { LayerKey } from "../url-state";

export type A5Kind =
  | "filming"
  | "blocked"
  | "busy"
  | "nextStep"
  | "deadline"
  | "closed"
  | "day";

export interface A5Item {
  id: string;
  kind: A5Kind;
  date: string;
  from: string | null;
  to: string | null;
  title: string;
  detail: string | null;
  // Το Είδος κλεισμένου χρόνου (π.χ. «Ραντεβού»), ως σήμανση δίπλα στον τίτλο· αλλιώς null.
  mark: string | null;
  // Σχέδιο «3B»: το χρώμα (κλειδί παλέτας) του Είδους κλεισμένου χρόνου και το εικονίδιο μπροστά από τον τίτλο.
  tone: KindColor | null;
  icon: string | null;
  // «αναμένει έγκριση» για Γύρισμα που περιμένει, η κατάσταση της μέρας για τον Πελάτη· αλλιώς null.
  status: string | null;
  href: string | null;
}

export const PENDING_STATUS = "αναμένει έγκριση";

// Τα σταθερά εικονίδια του σχεδίου για ό,τι δεν είναι Είδος κλεισμένου χρόνου (το Είδος έχει το δικό του, από τις Ρυθμίσεις).
const FIXED_ICONS: Readonly<Partial<Record<A5Kind, string>>> = {
  filming: "🎬",
  nextStep: "➜",
  deadline: "⏱",
};
const ALL_DAY = "όλη μέρα";

const WEEKDAYS_LONG = [
  "Κυριακή",
  "Δευτέρα",
  "Τρίτη",
  "Τετάρτη",
  "Πέμπτη",
  "Παρασκευή",
  "Σάββατο",
] as const;

export const fmtShort = (iso: string): string =>
  `${iso.slice(8)}/${iso.slice(5, 7)}`;

export const fmtLong = (iso: string): string =>
  `${WEEKDAYS_LONG[new Date(`${iso}T12:00:00Z`).getUTCDay()] ?? ""} ${fmtShort(iso)}`;

// «09:00–11:30» → από/έως· «όλη μέρα» → χωρίς ώρα.
const spanOf = (time: string): { from: string | null; to: string | null } => {
  if (time === ALL_DAY) return { from: null, to: null };
  const [from = "", to = ""] = time.split("–");
  return { from: from || null, to: to || null };
};

// Η κατάσταση της μέρας: για την ομάδα «κλειστή»/αργία, για τον Πελάτη ελεύθερη/γεμάτη/κλειστή (η ελεύθερη ανοίγει Κράτηση).
const dayItemOf = (
  day: CalendarDay,
  isTeam: boolean,
  canBook: boolean,
): A5Item | null => {
  const label = dayStatusLabel(day.status, day.holidayName, isTeam);
  if (label === null) return null;
  return {
    id: `day-${day.date}`,
    kind: isTeam ? "closed" : "day",
    date: day.date,
    from: null,
    to: null,
    title: label,
    detail: null,
    mark: null,
    tone: null,
    icon: null,
    status: isTeam ? null : label.toLocaleLowerCase("el"),
    href:
      !isTeam && day.status === "free" && canBook
        ? `/app/book?day=${day.date}`
        : null,
  };
};

export const a5ItemsOf = (
  days: readonly CalendarDay[],
  isTeam: boolean,
  canBook: boolean,
): A5Item[] =>
  days.flatMap((day) => {
    const status = dayItemOf(day, isTeam, canBook);
    const entries = day.entries.map((entry): A5Item => ({
      id: `${entry.key}-${day.date}`,
      kind: entry.kind,
      date: day.date,
      ...spanOf(entry.time),
      title: entry.title,
      detail: entry.detail,
      mark: entry.mark,
      tone: entry.tone,
      icon: entry.icon ?? FIXED_ICONS[entry.kind] ?? null,
      status: entry.isPending ? PENDING_STATUS : null,
      href: entry.href,
    }));
    return status ? [status, ...entries] : entries;
  });

// Η κατάσταση της μέρας δεν μετρά ως «κάτι αυτή την περίοδο».
export const hasEvents = (items: readonly A5Item[]): boolean =>
  items.some((item) => item.kind !== "closed" && item.kind !== "day");

// Τα Γυρίσματα πρώτα στη μέρα, μετά τα υπόλοιπα.
export const filmingsFirst = (items: readonly A5Item[]): A5Item[] => [
  ...items.filter((item) => item.kind === "filming"),
  ...items.filter((item) => item.kind !== "filming"),
];

export const groupByDate = (
  items: readonly A5Item[],
): readonly (readonly [string, readonly A5Item[]])[] =>
  [...new Set(items.map((item) => item.date))].map((date) => [
    date,
    items.filter((item) => item.date === date),
  ]);

export interface LayerOption {
  key: LayerKey;
  label: string;
}

const LAYER_LABELS: Readonly<Record<LayerKey, string>> = {
  filmings: "Γυρίσματα",
  blocked: "Ρεπό, άδειες",
  nextSteps: "Επόμενα βήματα",
  deadlines: "Προθεσμίες",
  busy: "Ομάδα",
};

export interface LayerAccess {
  // Βλέπει Ευκαιρίες (Πελάτες και Πωλήσεις) / Παραδοτέα· αλλιώς η στρώση θα ήταν πάντα άδεια.
  seesNextSteps: boolean;
  seesDeadlines: boolean;
  // Το «Ομάδα» (απασχολημένος) φαίνεται μόνο όταν υπάρχει κάτι να δείξει, όπως στη σημερινή οθόνη.
  hasBusy: boolean;
}

export const layerOptions = (access: LayerAccess): LayerOption[] =>
  (
    [
      "filmings",
      "blocked",
      ...(access.seesNextSteps ? (["nextSteps"] as const) : []),
      ...(access.seesDeadlines ? (["deadlines"] as const) : []),
      ...(access.hasBusy ? (["busy"] as const) : []),
    ] as const
  ).map((key) => ({ key, label: LAYER_LABELS[key] }));

export const toggledLayers = (
  active: readonly LayerKey[],
  key: LayerKey,
): LayerKey[] =>
  active.includes(key)
    ? active.filter((layer) => layer !== key)
    : [...active, key];

// Η γραμμή του κλειστού μενού φίλτρων: το άτομο (αν υπάρχει φίλτρο ατόμου) και «όλα» ή «N κρυμμένα».
export const filtersSummary = (
  options: readonly LayerOption[],
  active: readonly LayerKey[],
  person: string | null = null,
): string => {
  const hidden = options.filter(
    (option) => !active.includes(option.key),
  ).length;
  const layers = hidden === 0 ? "όλα" : `${hidden} κρυμμένα`;
  return person ? `${person} · ${layers}` : layers;
};

export interface QuickAdd {
  id: string;
  label: string;
  tone: KindColor | null;
  href: string;
}

// Σχέδιο «3B»: ένα κουμπί «+ <Είδος>» ανά ενεργό Είδος, που ανοίγει τη φόρμα A6 με το Είδος ήδη διαλεγμένο.
export const quickAddsOf = (
  kinds: readonly BlockedKind[],
  date: string,
): QuickAdd[] =>
  kinds
    .filter((kind) => !kind.retired)
    .map((kind) => ({
      id: kind.id,
      label: `+ ${kind.label}`,
      tone: kindToneOf(kind.color),
      href: hrefOf("A6", { date, kind: kind.id }),
    }));
