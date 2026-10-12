"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Panel } from "@/components/ui/panel";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { useFormChanged } from "@/lib/use-form-changed";

import { resetTodayPrefs, saveTodayPrefs } from "../actions";
import { moved, toggled } from "../customize-model";
import type { TodayCard } from "../view-schema";

interface CustomizeProps {
  cards: readonly TodayCard[];
  isCustomized: boolean;
}

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

function ResetForm() {
  const [state, action, isPending] = useActionState(resetTodayPrefs, INITIAL_FORM_STATE);
  return (
    <form action={action} className="grid gap-2">
      <Button type="submit" variant="ghost" disabled={isPending}>
        Επαναφορά προεπιλογής
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

// «Προσαρμογή»: κρύβεις ή εμφανίζεις κάρτες και αλλάζεις σειρά, μόνο ανάμεσα σε όσες σου επιτρέπουν τα Δικαιώματα.
// Η επιλογή αποθηκεύεται στον λογαριασμό σου.
export function Customize({ cards, isCustomized }: CustomizeProps) {
  const [order, setOrder] = useState(() => cards.map((card) => card.code));
  const [hidden, setHidden] = useState(() => cards.filter((card) => card.hidden).map((card) => card.code));
  const [state, action, isPending] = useActionState(saveTodayPrefs, INITIAL_FORM_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const isChanged = useFormChanged(formRef, state.notice ? state : undefined);
  const byCode = new Map(cards.map((card) => [card.code, card]));
  const movable = order.filter((code) => byCode.get(code)?.kind !== "health");
  return (
    <div>
      <Panel label="Προσαρμογή της «Σήμερα»">
        <p className="m-0 text-sm text-muted-foreground">
          Κρύψε όσες κάρτες δεν θέλεις και άλλαξε τη σειρά. Η αλλαγή ισχύει μόνο για σένα, σε κάθε συσκευή. Μια κάρτα
          που κρύβεις δεν σταματά τις Ειδοποιήσεις της.
        </p>
        <form ref={formRef} action={action} className="mt-3 grid gap-3">
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
                  onMove={(step) => setOrder((codes) => [...moved(codes, code, step)])}
                  onToggle={() => setHidden((codes) => [...toggled(codes, code)])}
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
          <div className="flex flex-wrap gap-2">
            {isChanged && (
              <Button type="submit" variant="primary" disabled={isPending}>
                Αποθήκευση
              </Button>
            )}
            <Link href="/app" className={buttonVariants({ variant: "default" })}>
              Κλείσιμο
            </Link>
          </div>
          <FormMessage state={state} />
        </form>
        {isCustomized && (
          <div className="mt-3">
            <ResetForm />
          </div>
        )}
      </Panel>
    </div>
  );
}
