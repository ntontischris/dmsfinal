"use client";

import { useEffect, useState } from "react";

import { Notice } from "@/components/ui/notice";

import { checkSlotWarning } from "../actions-booking";

interface SlotWarningProps {
  date: string;
  time: string;
  hours: string;
  filmingId?: string;
}

const DEBOUNCE_MS = 300;

// Προειδοποίηση ώρας για την ομάδα καθώς γράφει μέρα, ώρα και διάρκεια. Δεν μπλοκάρει την υποβολή.
export function SlotWarning({ date, time, hours, filmingId }: SlotWarningProps) {
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const timer = setTimeout(() => {
      checkSlotWarning({ date, time, hours, filmingId }).then((result) => {
        if (isActive) setProblem(result.problem);
      });
    }, DEBOUNCE_MS);
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [date, time, hours, filmingId]);

  if (!problem) return null;
  return (
    <Notice kind="empty" title="Προσοχή στην ώρα">
      <p className="m-0">{problem}</p>
    </Notice>
  );
}
