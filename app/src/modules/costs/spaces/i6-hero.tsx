import type { ReactNode } from "react";

import { fmtMoney } from "@/spaces/screens/shared";

import { fmtMonth, fmtRate, rateOf } from "./i6-model";

// Η κεφαλίδα της I6 στην εμφάνιση των «Χρημάτων» (ml-hero): το Κόστος ώρας μεγάλο, το Σύνολο εξόδων και οι
// Παραγωγικές ώρες ως μικρά στοιχεία, και η μία «Αποθήκευση» δεξιά.

export const I6_INTRO =
  "Τι κοστίζει η εταιρεία κάθε μήνα και πόσο βγαίνει η ώρα. Διάλεξε μήνα· ο νέος ξεκινά ως αντίγραφο του προηγούμενου και κλείνει μόνος του όταν τελειώσει.";

interface ShellProps {
  notes?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}

// Το κέλυφος της κεφαλίδας: τίτλος, μία γραμμή «τι κάνω εδώ;» και ό,τι δείχνει ο μήνας. Ο μήνας διαλέγεται στα φίλτρα
// από πάνω· το h1 το γράφει η σελίδα («Έξοδα»), εδώ h2.
export function I6HeroShell({ notes, children, actions }: ShellProps) {
  return (
    <header className="ml-hero i6-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        €/h
      </span>
      <div>
        <h2>Έξοδα και Κόστος ώρας</h2>
        <p>{I6_INTRO}</p>
        {children}
        {notes}
      </div>
      {actions && <div className="ml-quick i6-save">{actions}</div>}
    </header>
  );
}

interface FactsProps {
  month: string;
  total: number;
  hours: number;
}

// Το Κόστος ώρας του μήνα μεγάλο και από κάτω τα δύο στοιχεία που το βγάζουν (οι ώρες αλλάζουν στο κουτί τους).
export function I6Facts({ month, total, hours }: FactsProps) {
  return (
    <>
      <p className="ml-hero-amount" data-open="true">
        {fmtRate(rateOf(total, hours))}
        <small>Κόστος ώρας · {fmtMonth(month)}</small>
      </p>
      <p className="i6-facts">
        <span>
          Σύνολο εξόδων <strong>{fmtMoney(total)}</strong>
        </span>
        <span>
          Παραγωγικές ώρες <strong>{hours}</strong>
        </span>
      </p>
    </>
  );
}
