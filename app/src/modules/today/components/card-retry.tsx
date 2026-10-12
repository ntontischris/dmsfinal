"use client";

import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

import { retryTodayCard } from "../actions";
import { CARD_FAILED_TEXT, RETRY_LABEL } from "../labels";
import type { TodayCard } from "../view-schema";

// Σφάλμα σε μία κάρτα: «Ξαναδοκίμασε» ξαναφορτώνει μόνο αυτή· οι άλλες δεν αγγίζονται. Η κάρτα έρχεται έτοιμη από τον server.
export function CardRetry({ card }: { card: TodayCard }) {
  const [view, setView] = useState<{ node: ReactNode } | null>(null);
  const [isPending, startTransition] = useTransition();
  if (view) return view.node;
  const retry = () =>
    startTransition(async () => {
      const node = await retryTodayCard(card);
      if (node !== undefined) setView({ node });
    });
  return (
    <div role="alert">
      <Panel label={card.label} aside="σφάλμα">
        <p className="m-0 text-sm text-muted-foreground">{CARD_FAILED_TEXT}</p>
        <p className="m-0 mt-3">
          <Button onClick={retry} disabled={isPending}>
            {RETRY_LABEL}
          </Button>
        </p>
      </Panel>
    </div>
  );
}
