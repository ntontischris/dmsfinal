"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

import { retryTodayCard } from "../actions";
import { CARD_FAILED_TEXT, RETRY_LABEL } from "../labels";
import type { CardData, TodayCard } from "../view-schema";
import { CardView } from "./card-view";

// Σφάλμα σε μία κάρτα: «Ξαναδοκίμασε» ξαναφορτώνει μόνο αυτή· οι άλλες δεν αγγίζονται.
export function CardRetry({ card }: { card: TodayCard }) {
  const [data, setData] = useState<CardData | null>(null);
  const [isGone, setIsGone] = useState(false);
  const [isPending, startTransition] = useTransition();
  if (isGone) return null;
  if (data) return <CardView card={card} data={data} />;
  const retry = () =>
    startTransition(async () => {
      const result = await retryTodayCard(card.code);
      if (!result.ok) return;
      if (result.data === null) setIsGone(true);
      else setData(result.data);
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
