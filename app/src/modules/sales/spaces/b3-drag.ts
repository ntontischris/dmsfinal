"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState, type DragEvent } from "react";

import { INITIAL_FORM_STATE } from "@/lib/form-state";

import { moveOpportunityStage } from "../actions-opportunities";
import type { BoardCard } from "./b3-adapter";

const CARD_TYPE = "text/x-opportunity";

// Σύρσιμο κάρτας σε άλλη Στήλη: η κάρτα πάει αμέσως εκεί και στέλνεται η ίδια ενέργεια με τη λίστα «Μετακίνηση σε Στάδιο».
// Αν η ενέργεια γυρίσει λάθος, η κάρτα γυρίζει πίσω και φαίνεται το μήνυμα.
export function useStageDrag() {
  const router = useRouter();
  const [moved, setMoved] = useState<Readonly<Record<string, string>>>({});
  const [overStage, setOverStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stageOf = (card: BoardCard): string => moved[card.id] ?? card.stageId;

  const cardProps = (card: BoardCard) =>
    card.canWork
      ? {
          draggable: true,
          onDragStart: (event: DragEvent) => {
            event.dataTransfer.setData(
              CARD_TYPE,
              `${card.id}|${stageOf(card)}`,
            );
            event.dataTransfer.effectAllowed = "move";
          },
        }
      : {};

  const drop = (stageId: string, payload: string) => {
    const [id, from] = payload.split("|");
    if (!id || from === stageId) return;
    setError(null);
    setMoved((prev) => ({ ...prev, [id]: stageId }));
    const form = new FormData();
    form.set("opportunityId", id);
    form.set("stageId", stageId);
    startTransition(async () => {
      const result = await moveOpportunityStage(INITIAL_FORM_STATE, form);
      if (!result.error) return router.refresh();
      setError(result.error);
      setMoved((prev) => ({ ...prev, [id]: from ?? stageId }));
    });
  };

  const columnProps = (stageId: string) => ({
    "data-drop-over": overStage === stageId || undefined,
    onDragOver: (event: DragEvent) => {
      if (!event.dataTransfer.types.includes(CARD_TYPE)) return;
      event.preventDefault();
      setOverStage(stageId);
    },
    onDragLeave: () => setOverStage((now) => (now === stageId ? null : now)),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setOverStage(null);
      drop(stageId, event.dataTransfer.getData(CARD_TYPE));
    },
  });

  return { stageOf, cardProps, columnProps, error };
}
