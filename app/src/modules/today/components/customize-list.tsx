"use client";

import { Button } from "@/components/ui/button";

import { moved, toggled } from "../customize-model";
import type { TodayCard } from "../view-schema";

interface RowProps {
  card: TodayCard;
  isHidden: boolean;
  canUp: boolean;
  canDown: boolean;
  onMove: (step: -1 | 1) => void;
  onToggle: () => void;
}

function CustomizeRow({ card, isHidden, canUp, canDown, onMove, onToggle }: RowProps) {
  // Η Υγεία μένει πάντα πρώτη· μόνο κρύβεται ή εμφανίζεται.
  const isMovable = card.kind !== "health";
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-b-0">
      <span className={isHidden ? "text-muted-foreground line-through" : ""}>{card.label}</span>
      <span className="flex flex-wrap gap-1">
        {isMovable && (
          <>
            <Button size="sm" onClick={() => onMove(-1)} disabled={!canUp} aria-label={`${card.label} πιο πάνω`}>
              ↑
            </Button>
            <Button size="sm" onClick={() => onMove(1)} disabled={!canDown} aria-label={`${card.label} πιο κάτω`}>
              ↓
            </Button>
          </>
        )}
        <Button size="sm" onClick={onToggle} aria-label={`${isHidden ? "Εμφάνισε" : "Κρύψε"}: ${card.label}`}>
          {isHidden ? "Εμφάνισε" : "Κρύψε"}
        </Button>
      </span>
    </li>
  );
}

interface CustomizeListProps {
  cards: readonly TodayCard[];
  order: readonly string[];
  hidden: readonly string[];
  onOrder: (order: readonly string[]) => void;
  onHidden: (hidden: readonly string[]) => void;
}

// Η λίστα της Προσαρμογής και τα κρυφά πεδία της φόρμας (σειρά, κρυφές).
export function CustomizeList({ cards, order, hidden, onOrder, onHidden }: CustomizeListProps) {
  const byCode = new Map(cards.map((card) => [card.code, card]));
  const movable = order.filter((code) => byCode.get(code)?.kind !== "health");
  return (
    <>
      <ol className="m-0 list-none p-0">
        {order.map((code) => {
          const card = byCode.get(code);
          if (!card) return null;
          const index = movable.indexOf(code);
          return (
            <CustomizeRow
              key={code}
              card={card}
              isHidden={hidden.includes(code)}
              canUp={index > 0}
              canDown={index >= 0 && index < movable.length - 1}
              onMove={(step) => onOrder(moved(order, code, step))}
              onToggle={() => onHidden(toggled(hidden, code))}
            />
          );
        })}
      </ol>
      {order.map((code) => (
        <input key={code} type="hidden" name="order" value={code} />
      ))}
      {hidden.map((code) => (
        <input key={code} type="hidden" name="hidden" value={code} />
      ))}
    </>
  );
}
