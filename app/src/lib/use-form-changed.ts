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
    const compare = () => {
      setIsChanged(serializeFormData(new FormData(form)) !== baselineRef.current);
    };
    // Το React γράφει τα κρυφά πεδία και τις προεπιλογές του reset μετά το γεγονός, γι' αυτό ελέγχουμε στο επόμενο tick.
    const compareAfterUpdate = () => setTimeout(compare, 0);
    form.addEventListener("input", compareAfterUpdate);
    form.addEventListener("change", compareAfterUpdate);
    form.addEventListener("reset", compareAfterUpdate);
    return () => {
      form.removeEventListener("input", compareAfterUpdate);
      form.removeEventListener("change", compareAfterUpdate);
      form.removeEventListener("reset", compareAfterUpdate);
    };
  }, [formRef]);

  return isChanged;
}
