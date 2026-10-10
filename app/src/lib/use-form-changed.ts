"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { serializeFormData } from "@/lib/form-changed";

// Δείχνει αν η φόρμα διαφέρει από τις αποθηκευμένες τιμές. Η βάση γράφεται στη φόρτωση και μετά από κάθε
// επιτυχία (όταν εμφανιστεί `rebaselineOn`), ώστε οι τρέχουσες τιμές να γίνουν οι νέες αποθηκευμένες.
// Μια αποτυχία δεν αλλάζει τη βάση, άρα το κουμπί μένει ορατό.
export function useFormChanged(
  formRef: RefObject<HTMLFormElement | null>,
  rebaselineOn: unknown,
): boolean {
  const [isChanged, setIsChanged] = useState(false);
  const baselineRef = useRef("");

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    baselineRef.current = serializeFormData(new FormData(form));
    setIsChanged(false);
  }, [formRef, rebaselineOn]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const refresh = () => {
      setIsChanged(serializeFormData(new FormData(form)) !== baselineRef.current);
    };
    // Το reset γράφει τις προεπιλεγμένες τιμές μετά το γεγονός, γι' αυτό ελέγχουμε στο επόμενο tick.
    const refreshAfterReset = () => setTimeout(refresh, 0);
    form.addEventListener("input", refresh);
    form.addEventListener("change", refresh);
    form.addEventListener("reset", refreshAfterReset);
    return () => {
      form.removeEventListener("input", refresh);
      form.removeEventListener("change", refresh);
      form.removeEventListener("reset", refreshAfterReset);
    };
  }, [formRef]);

  return isChanged;
}
