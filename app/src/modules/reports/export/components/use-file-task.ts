"use client";

import { useState, useTransition } from "react";

import type { FormState } from "@/lib/form-state";

import { EXPORT_FAILED } from "../labels";

// Μία εργασία «φτιάξε και κατέβασε αρχείο» με κατάσταση: σε εξέλιξη, λάθος ή μήνυμα επιτυχίας.
// Η εργασία επιστρέφει { error } ή { notice }· ό,τι πετάξει γίνεται το γενικό μήνυμα λάθους.
export function useFileTask() {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>({});
  const run = (task: () => Promise<FormState>) =>
    startTransition(async () => {
      setState({});
      try {
        setState(await task());
      } catch (error) {
        console.error("export", error);
        setState({ error: EXPORT_FAILED });
      }
    });
  return { isPending, state, run };
}
