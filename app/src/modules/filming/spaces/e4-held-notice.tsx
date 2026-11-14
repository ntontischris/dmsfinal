"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { FormState } from "@/lib/form-state";

import type { HeldProduction } from "./e4-held";

// Η επανάνοιξη της Παραγωγής (από το module Παραγωγές, μέσω της σελίδας): θέλει λόγο, δίνεται έτοιμος.
export type E4ReopenAction = (
  state: FormState,
  form: FormData,
) => Promise<FormState>;

const REOPEN_REASON = "Νέο Γύρισμα";

// Μία γραμμή για την Παραγωγή που δεν δέχεται Γυρίσματα, με τη λύση μέσα στον οδηγό: η Παραδομένη ξανανοίγει
// με ένα πάτημα· η ακυρωμένη δεν ξανανοίγει, οπότε μένει άλλη μέρα.
export function E4HeldNotice({
  production,
  reopen,
}: {
  production: HeldProduction;
  reopen: E4ReopenAction | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const handleReopen = () => {
    if (!reopen) return;
    const form = new FormData();
    form.set("productionId", production.id);
    form.set("reason", REOPEN_REASON);
    startTransition(async () => {
      const result = await reopen({}, form);
      setError(result.error ?? null);
      if (!result.error) router.refresh();
    });
  };
  if (production.state === "cancelled")
    return (
      <p className="e-warn" role="alert">
        Η Παραγωγή «{production.title}» ακυρώθηκε και δεν δέχεται νέα Γυρίσματα.
        Διάλεξε μέρα σε άλλη Περίοδο.
      </p>
    );
  return (
    <div className="e-warn" role="alert">
      <p>
        Η Παραγωγή «{production.title}» είναι Παραδομένη, γι&apos; αυτό δεν
        δέχεται νέα Γυρίσματα αυτή τη μέρα.
      </p>
      {reopen && (
        <div className="btn-row">
          <button
            type="button"
            className="button"
            disabled={isPending}
            onClick={handleReopen}
          >
            {isPending ? "Ξανανοίγει…" : "Ξανάνοιξε την Παραγωγή"}
          </button>
        </div>
      )}
      {error && <p>{error}</p>}
    </div>
  );
}
