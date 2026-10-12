"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Panel } from "@/components/ui/panel";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { useFormChanged } from "@/lib/use-form-changed";

import { resetTodayPrefs, saveTodayPrefs } from "../actions";
import type { TodayCard } from "../view-schema";
import { CustomizeList } from "./customize-list";

interface CustomizeProps {
  cards: readonly TodayCard[];
  isCustomized: boolean;
}

function ResetForm() {
  const [state, action, isPending] = useActionState(resetTodayPrefs, INITIAL_FORM_STATE);
  return (
    <form action={action} className="mt-3 grid gap-2">
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
  const [order, setOrder] = useState<readonly string[]>(() => cards.map((card) => card.code));
  const [hidden, setHidden] = useState<readonly string[]>(() =>
    cards.filter((card) => card.hidden).map((card) => card.code),
  );
  const [state, action, isPending] = useActionState(saveTodayPrefs, INITIAL_FORM_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const isChanged = useFormChanged(formRef, state.notice ? state : undefined);
  return (
    <Panel label="Προσαρμογή της «Σήμερα»">
      <p className="m-0 text-sm text-muted-foreground">
        Κρύψε όσες κάρτες δεν θέλεις και άλλαξε τη σειρά. Η αλλαγή ισχύει μόνο για σένα, σε κάθε συσκευή. Μια κάρτα
        που κρύβεις δεν σταματά τις Ειδοποιήσεις της.
      </p>
      <form ref={formRef} action={action} className="mt-3 grid gap-3">
        <CustomizeList cards={cards} order={order} hidden={hidden} onOrder={setOrder} onHidden={setHidden} />
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
      {isCustomized && <ResetForm />}
    </Panel>
  );
}
