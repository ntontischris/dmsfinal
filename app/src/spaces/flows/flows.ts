// Οδηγοί (flow-studio, prototype στο proto/flows): μία δουλειά = βήματα με μία ερώτηση το καθένα, που επισκέπτονται τις
// υπάρχουσες οθόνες (σταθμούς). Η θέση ζει στο URL (?job=&step=), ώστε να κρατιέται σε μετακίνηση Χώρου και σε reload.
// Καθαρό αρχείο: το διαβάζει και ο browser. Πηγή: docs/flows/<job>/flow.md.

import { hrefOf } from "@/spaces/data/screens";

export interface FlowStep {
  question: string;
  // Τι είναι ήδη συμπληρωμένο (από δεδομένα της εφαρμογής).
  preset: string;
  // Τι μένει πίσω από το «Περισσότερα».
  hidden?: string;
  // Ο σταθμός: κωδικός οθόνης, ή "queue" για αναμονή (σελίδα του οδηγού στη Σήμερα, μετά γραμμή ουράς).
  station: string;
  area: string;
  // Η διαδρομή της οθόνης του σταθμού όταν χρειάζεται id (π.χ. /app/filming/<id>): αν είμαστε ήδη εκεί, μένουμε.
  stays?: RegExp;
  // Η αποθήκευση του σταθμού στέλνει εδώ χωρίς τη θέση· ο οδηγός συνεχίζει στο επόμενο βήμα.
  landsOn?: RegExp;
  // Το βήμα διαλέγει Πελάτη μέσα στον οδηγό· η επιλογή περνά στο επόμενο βήμα ως ?client=.
  picksClient?: boolean;
  // Το κύριο κουμπί του οδηγού υποβάλλει τη φόρμα του σταθμού (μία αποθήκευση, όχι «Επόμενο» χωρίς αποθήκευση).
  submits?: { form: string; label: string };
  // Ο σταθμός ανοίγει στη μέρα του γυρίσματος (?date=), αν ο οδηγός την ξέρει.
  opensOnDate?: boolean;
}

export interface Flow {
  id: string;
  name: string;
  area: string;
  done: string;
  steps: readonly FlowStep[];
}

const FILMING_PAGE =
  /^\/app\/filming\/(?!new$|queue$|mine$|crew-templates$)[^/]+$/;

export const FLOWS: readonly Flow[] = [
  {
    id: "stino-gyrisma",
    name: "Στήνω γύρισμα",
    area: "Παραγωγή",
    done: "Το γύρισμα μπήκε στο Ημερολόγιο με ομάδα και εξοπλισμό, και κάθε μέλος το βλέπει στα «Τα Γυρίσματά μου»· οι απαντήσεις της ομάδας θα φανούν στο «Τι πρέπει να κάνω τώρα».",
    steps: [
      {
        question: "Για ποιον Πελάτη είναι το γύρισμα;",
        preset:
          "Μόνο Πελάτες με Συμφωνία σε ανοιχτή Περίοδο, με το Πακέτο τους. Ένα πάτημα διαλέγει.",
        hidden:
          "Εσωτερική Παραγωγή χωρίς Πελάτη· Πελάτες χωρίς ενεργή Συμφωνία.",
        station: "B1",
        area: "Πελάτες",
        picksClient: true,
      },
      {
        question: "Ποια μέρα και ώρα;",
        preset:
          "Ο Πελάτης που διάλεξες, η πρώτη εργάσιμη μέρα μέσα στο ωράριο και τοποθεσία η διεύθυνση του Πελάτη. Έλεγξε και πάτα «Δημιουργία Γυρίσματος».",
        hidden: "Συμφωνία και είδος γυρίσματος, άλλη τοποθεσία, σημείωση.",
        station: "E4",
        area: "Παραγωγή",
        landsOn: FILMING_PAGE,
        submits: { form: "e4-form", label: "Δημιουργία Γυρίσματος" },
      },
      {
        question: "Ποιοι πάνε και με τι;",
        preset:
          "Τα πρότυπα Συνεργείου και Εξοπλισμού του είδους γεμίζουν και τα δύο. Ό,τι συγκρούεται φαίνεται κόκκινο, με το όνομα και τον λόγο.",
        hidden:
          "Προσθήκη ή αφαίρεση μέλους ή αντικειμένου· ποιος έχει ρεπό ή άδεια (μόνο προειδοποίηση).",
        station: "E1",
        area: "Παραγωγή",
        stays: FILMING_PAGE,
      },
      {
        question: "⏳ Η ομάδα απαντά αν μπορεί",
        preset:
          "Περιμένουμε να απαντήσει η ομάδα αν μπορεί. Η δουλειά μένει στο «Τι πρέπει να κάνω τώρα» και συνεχίζει από εκεί στο Ημερολόγιο.",
        station: "queue",
        area: "Σήμερα",
      },
      {
        question: "Το βλέπει η ομάδα στο Ημερολόγιο;",
        preset: "Το Ημερολόγιο ανοίγει στην εβδομάδα του γυρίσματος.",
        hidden: "Σύνδεση με Google Ημερολόγιο.",
        station: "A5",
        area: "Σήμερα",
        opensOnDate: true,
      },
    ],
  },
];

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

export const isWait = (step: FlowStep): boolean => step.station === "queue";

// Προσθέτει παραμέτρους σε έναν σύνδεσμο, κρατώντας όσες είχε.
export const withQuery = (
  href: string,
  extra: Readonly<Record<string, string>>,
): string => {
  const [base, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  Object.entries(extra).forEach(([key, value]) => params.set(key, value));
  return `${base}?${params.toString()}`;
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
  if (target.landsOn?.test(at.pathname))
    return stepHref(flow, step + 1, { pathname: at.pathname });
  if (isStationPath(target, at.pathname))
    return withPlace(
      at.search ? `${at.pathname}?${at.search}` : at.pathname,
      flow,
      step,
    );
  return null;
};

// Το επόμενο βήμα μετά από αναμονή: η γραμμή ουράς ανοίγει εκεί.
export const nextAfter = (flow: Flow, step: number): number =>
  Math.min(step + 1, flow.steps.length);

export const isLast = (flow: Flow, step: number): boolean =>
  step === flow.steps.length;

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
