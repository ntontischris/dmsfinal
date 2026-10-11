"use client";

import { useEffect, useState } from "react";

import { previewReceipt, type PreviewResult } from "../actions";

const DEBOUNCE_MS = 300;

// Η προεπισκόπηση «Θα εξοφλήσει» ενημερώνεται μετά από μικρή παύση στην πληκτρολόγηση.
// Η παλιά απάντηση πετιέται αν έχει έρθει νεότερη είσοδος.
export function useReceiptPreview(clientId: string, amount: string): PreviewResult | null {
  const [result, setResult] = useState<PreviewResult | null>(null);

  useEffect(() => {
    if (clientId === "" || amount === "") return;
    let isCurrent = true;
    const load = async () => {
      const next = await previewReceipt({ clientId, amount });
      if (isCurrent) setResult(next);
    };
    const timer = setTimeout(() => void load(), DEBOUNCE_MS);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [clientId, amount]);

  return clientId === "" || amount === "" ? null : result;
}
