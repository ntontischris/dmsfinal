"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { serializeFormData } from "@/lib/form-changed";

// Δείχνει αν η φόρμα διαφέρει από τις αποθηκευμένες τιμές. Η βάση γράφεται στη φόρτωση και μετά από κάθε
// επιτυχία (`lastSaved`, η κατάσταση με το μήνυμα επιτυχίας), ώστε οι τρέχουσες τιμές να γίνουν οι νέες αποθηκευμένες.
// Μια αποτυχία δίνει `undefined` και δεν αγγίζει τη βάση, άρα το κουμπί μένει ορατό δίπλα στο λάθος.
export function useFormChanged(
  formRef: RefObject<HTMLFormElement | null>,
  lastSaved: unknown,
): boolean {
  const [isChanged, setIsChanged] = useState(false);
  const baselineRef = useRef("");

  useEffect(() => {
    const form = formRef.current;
    if (form) baselineRef.current = serializeFormData(new FormData(form));
  }, [formRef]);

  useEffect(() => {
    const form = formRef.current;
    if (!form || lastSaved === undefined) return;
    baselineRef.current = serializeFormData(new FormData(form));
    setIsChanged(false);
  }, [formRef, lastSaved]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const compare = () => {
      setIsChanged(serializeFormData(new FormData(form)) !== baselineRef.current);
    };
    // Το React γράφει τα κρυφά πεδία και τις προεπιλογές του reset μετά το γεγονός, γι' αυτό ελέγχουμε στο επόμενο tick.
    // Το «click» πιάνει τα κουμπιά που προσθέτουν ή αφαιρούν γραμμές (δόσεις, παραλήπτες, Παροχές) χωρίς input.
    const compareAfterUpdate = () => setTimeout(compare, 0);
    const events = ["input", "change", "reset", "click"] as const;
    events.forEach((name) => form.addEventListener(name, compareAfterUpdate));
    return () => events.forEach((name) => form.removeEventListener(name, compareAfterUpdate));
  }, [formRef]);

  return isChanged;
}
