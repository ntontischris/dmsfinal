"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { findBlockedConflicts } from "../actions-blocked";
import type { ConflictLine } from "../types";
import { conflictFieldsOf, type Draft } from "./a6-model";

// Η προειδοποίηση του prototype (`screens/a6-form.tsx` ConflictWarning): το ρεπό πέφτει πάνω σε Γύρισμα όπου το άτομο
// είναι στο Συνεργείο. Μόνο προειδοποίηση· η αποθήκευση μένει ανοιχτή. Η βάση ρωτιέται λίγο μετά την τελευταία αλλαγή.

const WAIT_MS = 400;

interface Found {
  key: string;
  lines: readonly ConflictLine[];
}

// Το κλειδί είναι τα πεδία ως query string: σταθερό από render σε render και ξαναγίνεται FormData χωρίς απώλειες.
const formDataOf = (key: string): FormData => {
  const form = new FormData();
  new URLSearchParams(key).forEach((value, name) => form.set(name, value));
  return form;
};

// Οι γραμμές φαίνονται μόνο για τα πεδία που ισχύουν τώρα· παλιά απάντηση για άλλη μέρα δεν δείχνεται.
export function useConflicts(draft: Draft): readonly ConflictLine[] {
  const [found, setFound] = useState<Found>({ key: "", lines: [] });
  const fields = conflictFieldsOf(draft);
  const key = fields ? new URLSearchParams(fields).toString() : "";

  useEffect(() => {
    if (key === "") return;
    let isCurrent = true;
    const ask = async () => {
      const lines = await findBlockedConflicts(formDataOf(key));
      if (isCurrent) setFound({ key, lines });
    };
    const timer = setTimeout(() => {
      ask().catch((error: unknown) => console.error("useConflicts", error));
    }, WAIT_MS);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [key]);

  return key !== "" && found.key === key ? found.lines : [];
}

export function ConflictWarning({
  lines,
  personName,
  isSelf,
}: {
  lines: readonly ConflictLine[];
  personName: string | null;
  isSelf: boolean;
}) {
  if (lines.length === 0) return null;
  const who = personName ?? "Το άτομο";
  return (
    <div className="a6-warn" role="status">
      {lines.map((line) => (
        <p key={line.id}>
          {isSelf
            ? `Είσαι στο Συνεργείο του Γυρίσματος «${line.title}», ${line.when}. Το ρεπό ή η άδεια δεν σε βγάζει από το Συνεργείο· αν δεν μπορείς, δήλωσε «δεν μπορώ» στο Γύρισμα.`
            : `${who} είναι στο Συνεργείο του Γυρίσματος «${line.title}», ${line.when}. Το ρεπό ή η άδεια δεν βγάζει το άτομο από το Συνεργείο· αν χρειάζεται, άλλαξε το Συνεργείο στο Γύρισμα.`}{" "}
          <Link href={line.href}>Άνοιγμα Γυρίσματος</Link>
        </p>
      ))}
    </div>
  );
}
