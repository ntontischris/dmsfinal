// Οδηγοί (flow-studio, prototype στο proto/flows): μία δουλειά = βήματα με μία ερώτηση το καθένα, που επισκέπτονται τις
// υπάρχουσες οθόνες (σταθμούς). Η θέση ζει στο URL (?job=&step=), ώστε να κρατιέται σε μετακίνηση Χώρου και σε reload.
// Καθαρό αρχείο: το διαβάζει και ο browser. Πηγή: docs/flows/<job>/flow.md.

import { hrefOf } from "@/spaces/data/screens";

import { FLOWS, type Flow, type FlowStep, type Need } from "./flow-registry";

export {
  CREW_STEP,
  FILMING_PAGE,
  FLOWS,
  THREAD_PAGE,
  type Flow,
  type FlowChoice,
  type FlowLink,
  type FlowStep,
  type Need,
} from "./flow-registry";

export interface FilmingCounts {
  crew: number;
  equipment: number;
}

export const flowOf = (id: string | null | undefined): Flow | undefined =>
  FLOWS.find((flow) => flow.id === id);

// Το βήμα από το URL (1-based), μέσα στα όρια· ό,τι άκυρο → 1.
export const parseStep = (
  raw: string | null | undefined,
  flow: Flow,
): number => {
  const step = Number(raw);
  return Number.isInteger(step) && step >= 1 && step <= flow.steps.length
    ? step
    : 1;
};

// Το URL είναι στο βήμα που διαλέγει Πελάτη μέσα στον οδηγό: η σελίδα από κάτω δεν δείχνει τη δική της λίστα,
// ώστε κανένας σύνδεσμός της να μη βγάζει από τον οδηγό.
export const isPickingClient = (
  job: string | string[] | undefined,
  step: string | string[] | undefined,
): boolean => {
  const flow = typeof job === "string" ? flowOf(job) : undefined;
  if (!flow) return false;
  const raw = typeof step === "string" ? step : undefined;
  return flow.steps[parseStep(raw, flow) - 1]?.picksClient === true;
};

export const isWait = (step: FlowStep): boolean => step.station === "queue";

// Η διαδρομή χωρίς παραμέτρους και #σημείο.
export const pathOf = (href: string): string => href.split(/[?#]/)[0];

// Προσθέτει παραμέτρους σε έναν σύνδεσμο, κρατώντας όσες είχε και το #σημείο του (π.χ. το Μήνυμα του Αιτήματος).
export const withQuery = (
  href: string,
  extra: Readonly<Record<string, string>>,
): string => {
  const [rest, hash] = href.split("#");
  const [base, query = ""] = rest.split("?");
  const params = new URLSearchParams(query);
  Object.entries(extra).forEach(([key, value]) => params.set(key, value));
  return `${base}?${params.toString()}${hash === undefined ? "" : `#${hash}`}`;
};

const withPlace = (path: string, flow: Flow, step: number): string =>
  withQuery(path, { job: flow.id, step: String(step) });

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface StepAt {
  // Η τρέχουσα διαδρομή: αν είναι ήδη η σωστή οθόνη του σταθμού, μένουμε εκεί.
  pathname?: string;
  // Η μέρα του γυρίσματος («ΕΕΕΕ-ΜΜ-ΗΗ»), για σταθμό που ανοίγει σε μέρα.
  date?: string | null;
}

// Πού ανοίγει το βήμα: στην οθόνη του σταθμού, ή στην τρέχουσα αν είναι ήδη η σωστή (π.χ. το Γύρισμα που μόλις κλείστηκε).
export const stepHref = (
  flow: Flow,
  step: number,
  { pathname = "", date = null }: StepAt = {},
): string => {
  const target = flow.steps[step - 1];
  if (!target || isWait(target)) return withPlace("/app", flow, step);
  const path = target.stays?.test(pathname) ? pathname : hrefOf(target.station);
  const dated =
    target.opensOnDate && date && ISO_DAY.test(date)
      ? withQuery(path, { date })
      : path;
  return withPlace(dated, flow, step);
};

export interface NewFilmingEntry {
  // Το URL έχει ήδη θέση οδηγού (?job=).
  hasJob: boolean;
  // Αίτημα Μηνύματος ή Κλεισμένος χρόνος προσυμπληρώνει τη φόρμα: μένει έξω από τον οδηγό (βάζει όμως τα Πρότυπα).
  isPrefilled: boolean;
  clientId: string | null;
}

// Κάθε άλλο «Νέο Γύρισμα» (+ Νέο, Γυρίσματα, Ημερολόγιο, σελίδα Πελάτη) μπαίνει στον οδηγό «Στήνω γύρισμα»: με Πελάτη
// στο βήμα της φόρμας, αλλιώς στο βήμα 1. null = η φόρμα ανοίγει όπως είναι.
export const newFilmingEntryOf = ({
  hasJob,
  isPrefilled,
  clientId,
}: NewFilmingEntry): string | null => {
  const flow = flowOf("stino-gyrisma");
  if (hasJob || isPrefilled || !flow) return null;
  if (!clientId) return stepHref(flow, 1);
  const formStep = flow.steps.findIndex((step) => step.station === "E4") + 1;
  return withQuery(stepHref(flow, formStep), { client: clientId });
};

// Η διαδρομή του σταθμού ενός βήματος ταιριάζει με την τρέχουσα; (η αναμονή δεν έχει σταθμό-σελίδα)
const isStationPath = (target: FlowStep, pathname: string): boolean =>
  !isWait(target) &&
  (target.stays?.test(pathname) ??
    hrefOf(target.station).split("?")[0] === pathname);

// Το URL έχασε τη θέση (αποθήκευση που ανακατευθύνει, αλλαγή εβδομάδας στο Ημερολόγιο): πού ξαναμπαίνει ο οδηγός.
// Μετά την αποθήκευση του σταθμού → επόμενο βήμα· στην ίδια οθόνη → ίδιο βήμα, με τις παραμέτρους της οθόνης. Αλλιώς null.
export const resumeHref = (
  flow: Flow,
  step: number,
  at: { pathname: string; search: string },
): string | null => {
  const target = flow.steps[step - 1];
  if (!target) return null;
  const forward = forwardOf(flow, step);
  if (forward !== null && target.landsOn?.test(at.pathname))
    return stepHref(flow, forward, { pathname: at.pathname });
  if (isStationPath(target, at.pathname))
    return withPlace(
      at.search ? `${at.pathname}?${at.search}` : at.pathname,
      flow,
      step,
    );
  return null;
};

const NEED_LABEL: Readonly<Record<Need, string>> = {
  crew: "Συνεργείο",
  equipment: "Εξοπλισμός",
};

// Τι λείπει από το Γύρισμα· χωρίς αριθμούς (η σελίδα δεν τους έδωσε) λείπουν όλα, ώστε να μη περνά κανείς χωρίς έλεγχο.
export const missingOf = (
  needs: readonly Need[] = [],
  counts: FilmingCounts | null,
): readonly Need[] =>
  counts === null ? needs : needs.filter((need) => counts[need] < 1);

// «Λείπει: Συνεργείο, Εξοπλισμός», ή null όταν δεν λείπει τίποτα.
export const missingLine = (missing: readonly Need[]): string | null =>
  missing.length > 0
    ? `Λείπει: ${missing.map((need) => NEED_LABEL[need]).join(", ")}`
    : null;

// Το βήμα που ζητά ομάδα και εξοπλισμό (για το «Πίσω στο βήμα 3» του τέλους).
export const requiringStep = (flow: Flow): number =>
  flow.steps.findIndex((step) => (step.requires?.length ?? 0) > 0) + 1;

// Στο τέλος: τι λείπει από όσα ζήτησε η δουλειά, μόνο αν οι αριθμοί είναι γνωστοί (αλλιώς τίποτα).
export const missingAtEnd = (
  flow: Flow,
  counts: FilmingCounts | null,
): readonly Need[] =>
  counts === null
    ? []
    : missingOf(flow.steps[requiringStep(flow) - 1]?.requires, counts);

// Το επόμενο βήμα μετά από αναμονή: η γραμμή ουράς ανοίγει εκεί.
export const nextAfter = (flow: Flow, step: number): number =>
  Math.min(step + 1, flow.steps.length);

// Το βήμα του «Επόμενο»: το `then` του, αλλιώς το επόμενο που δεν ανοίγει μόνο από επιλογή· null = τέλος.
export const nextOf = (flow: Flow, step: number): number | null => {
  const then = flow.steps[step - 1]?.then;
  if (then !== undefined) return then;
  const later = flow.steps.findIndex(
    (item, index) => index >= step && item.isBranch !== true,
  );
  return later === -1 ? null : later + 1;
};

// Μετά την αποθήκευση του σταθμού: το επόμενο βήμα, ή η κύρια επιλογή όταν όλα τα επόμενα ανοίγουν από επιλογή.
export const forwardOf = (flow: Flow, step: number): number | null =>
  nextOf(flow, step) ?? flow.steps[step - 1]?.choices?.[0]?.to ?? null;

const leadsTo = (flow: Flow, from: number, to: number): boolean =>
  nextOf(flow, from) === to ||
  (flow.steps[from - 1]?.choices?.some((choice) => choice.to === to) ?? false);

// Το πλησιέστερο προηγούμενο βήμα που δεν ανοίγει μόνο από επιλογή (κλάδος).
const plainBefore = (flow: Flow, step: number): number => {
  const index = flow.steps
    .slice(0, step - 1)
    .findLastIndex((item) => item.isBranch !== true);
  return index === -1 ? 1 : index + 1;
};

// Το «Πίσω»: το πρώτο προηγούμενο βήμα που οδηγεί εδώ, αλλιώς το πλησιέστερο απλό βήμα· null στο βήμα 1.
export const prevOf = (flow: Flow, step: number): number | null => {
  if (step <= 1) return null;
  const from = flow.steps.findIndex(
    (_, index) => index + 1 < step && leadsTo(flow, index + 1, step),
  );
  return from === -1 ? plainBefore(flow, step) : from + 1;
};

// Ο οδηγός που γυρνά στο βήμα 1 δεν έχει τελευταίο βήμα: τελειώνει όταν αδειάσει η ουρά του.
export const isLast = (flow: Flow, step: number): boolean =>
  flow.isLoop !== true && nextOf(flow, step) === null;

// «2α», «⏳3» από το flow.md, αλλιώς η θέση.
export const markOf = (flow: Flow, step: number): string =>
  flow.steps[step - 1]?.mark ?? String(step);

const depthOfMark = (mark: string): number =>
  Number(mark.replace(/\D/g, "")) || 1;

// Για το «Βήμα n από N» και τον μετρητή: πόσο βαθιά είναι το βήμα και πόσα βήματα έχει η πιο μακριά διαδρομή.
export const depthOf = (flow: Flow, step: number): number =>
  depthOfMark(markOf(flow, step));

export const totalOf = (flow: Flow): number =>
  Math.max(...flow.steps.map((_, index) => depthOf(flow, index + 1)));

export interface FlowClient {
  id: string;
  name: string;
  // Τα Πακέτα (τίτλοι Συμφωνιών) του Πελάτη, ενωμένα.
  packages: string;
}

// Μία γραμμή ανά Πελάτη, με τη σειρά που ήρθαν οι Συμφωνίες.
export const clientRowsOf = (
  agreements: readonly { title: string; client: { id: string; name: string } }[],
): FlowClient[] =>
  [...Map.groupBy(agreements, (item) => item.client.id).values()].map(
    (group) => ({
      id: group[0].client.id,
      name: group[0].client.name,
      packages: [...new Set(group.map((item) => item.title))].join(" · "),
    }),
  );

// Οι αριθμοί που δίνει η σελίδα του Γυρίσματος («μέλη,αντικείμενα»)· ό,τι άκυρο → null (άγνωστοι).
export const parseCounts = (raw: string): FilmingCounts | null => {
  const [crew, equipment] = raw.split(",").map((part) => (part === "" ? NaN : Number(part)));
  return Number.isInteger(crew) && Number.isInteger(equipment)
    ? { crew, equipment }
    : null;
};

// Βήμα με «Ξεκίνα από τον πιο παλιό»: η γραμμή που περιμένει πιο πολύ ανοίγει κατευθείαν εκεί που στέλνει ο σταθμός
// (π.χ. η Συνομιλία του), στο βήμα που λέει το είδος της (FlowStep.opens), αλλιώς στο επόμενο. null = δεν ταιριάζει.
export const oldestHref = (
  flow: Flow,
  step: number,
  href: string | undefined,
  kind?: string,
): string | null => {
  const target = flow.steps[step - 1];
  const opened = kind === undefined ? undefined : target?.opens?.[kind];
  const forward = opened ?? forwardOf(flow, step);
  if (!href || !target?.landsOn || forward === null) return null;
  return target.landsOn.test(pathOf(href))
    ? withPlace(href, flow, forward)
    : null;
};

// Το κείμενο του κύριου κουμπιού όταν δεν υποβάλλει φόρμα ούτε δείχνει επιλογές.
export const primaryLabelOf = (
  flow: Flow,
  step: number,
  isFinished: boolean,
): string => {
  const current = flow.steps[step - 1];
  if (isFinished) return "Τέλος";
  if (current && isWait(current)) return "Εντάξει, περιμένω";
  return flow.isLoop && nextOf(flow, step) === 1
    ? (flow.nextLabel ?? "Επόμενο")
    : "Επόμενο";
};
