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
  // Ο σταθμός: κωδικός οθόνης, ή "queue" για αναμονή (γραμμή ουράς, όχι σελίδα).
  station: string;
  area: string;
  // Η διαδρομή της οθόνης του σταθμού όταν χρειάζεται id (π.χ. /app/filming/<id>): αν είμαστε ήδη εκεί, μένουμε.
  stays?: RegExp;
  // Η αποθήκευση του σταθμού στέλνει εδώ χωρίς τη θέση· ο οδηγός συνεχίζει στο επόμενο βήμα.
  landsOn?: RegExp;
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
    done: "Το γύρισμα κλείστηκε: είναι στο Ημερολόγιο με ομάδα και εξοπλισμό, και κάθε μέλος της ομάδας το βλέπει στα «Τα Γυρίσματά μου».",
    steps: [
      {
        question: "Για ποιον Πελάτη είναι το γύρισμα;",
        preset:
          "Ο Πελάτης που άνοιξες τελευταίος — μόνο όσοι έχουν Συμφωνία με ανοιχτή Περίοδο.",
        hidden:
          "Εσωτερική Παραγωγή χωρίς Πελάτη· Πελάτες χωρίς ενεργή Συμφωνία.",
        station: "B1",
        area: "Πελάτες",
      },
      {
        question: "Ποια μέρα και ώρα;",
        preset:
          "Η πρώτη ελεύθερη μέρα μέσα στο ωράριο, με τοποθεσία τη διεύθυνση του Πελάτη.",
        hidden: "Συμφωνία και είδος γυρίσματος, άλλη τοποθεσία, σημείωση.",
        station: "E4",
        area: "Παραγωγή",
        landsOn: FILMING_PAGE,
      },
      {
        question: "Ποιοι πάνε;",
        preset:
          "Το πρότυπο Συνεργείου του είδους, με τους ελεύθερους εκείνη τη μέρα πρώτους.",
        hidden:
          "Προσθήκη ή αφαίρεση μέλους· ποιος έχει ρεπό ή άδεια (μόνο προειδοποίηση).",
        station: "E1",
        area: "Παραγωγή",
        stays: FILMING_PAGE,
      },
      {
        question: "Τι εξοπλισμό παίρνουν;",
        preset:
          "Το πρότυπο εξοπλισμού του είδους, δεσμευμένο αυτόματα για τη μέρα.",
        hidden:
          "Αλλαγή ανά αντικείμενο· οι ελλείψεις φαίνονται κόκκινες μόνο όταν υπάρχουν.",
        station: "E1",
        area: "Παραγωγή",
        stays: FILMING_PAGE,
      },
      {
        question: "⏳ Η ομάδα απαντά αν μπορεί",
        preset:
          "Μόλις απαντήσουν, η δουλειά ξαναβγαίνει στο «Τι πρέπει να κάνω τώρα».",
        station: "queue",
        area: "Σήμερα",
      },
      {
        question: "Το βλέπει η ομάδα στο Ημερολόγιο;",
        preset:
          "Ναι — το γύρισμα είναι στο Ημερολόγιο και στα «Τα Γυρίσματά μου» κάθε μέλους.",
        hidden: "Σύνδεση με Google Ημερολόγιο.",
        station: "A5",
        area: "Σήμερα",
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

const withPlace = (path: string, flow: Flow, step: number): string => {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("job", flow.id);
  params.set("step", String(step));
  return `${base}?${params.toString()}`;
};

// Πού ανοίγει το βήμα: στην οθόνη του σταθμού, ή στην τρέχουσα αν είναι ήδη η σωστή (π.χ. το Γύρισμα που μόλις κλείστηκε).
export const stepHref = (flow: Flow, step: number, pathname = ""): string => {
  const target = flow.steps[step - 1];
  if (!target || isWait(target)) return withPlace("/app", flow, step);
  const path = target.stays?.test(pathname) ? pathname : hrefOf(target.station);
  return withPlace(path, flow, step);
};

// Το επόμενο βήμα μετά από αναμονή: η γραμμή ουράς ανοίγει εκεί.
export const nextAfter = (flow: Flow, step: number): number =>
  Math.min(step + 1, flow.steps.length);

export const isLast = (flow: Flow, step: number): boolean =>
  step === flow.steps.length;
