"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { INITIAL_FORM_STATE } from "@/lib/form-state";

import { resetTodayPrefs, saveTodayPrefs } from "../actions";
import { moved, toggled } from "../customize-model";
import type { CardDef } from "./a1-model";

interface CustomizeProps {
  // Όλες οι κάρτες που επιτρέπουν τα Δικαιώματα, με τη σειρά του Χρήστη.
  available: readonly CardDef[];
  hiddenAtStart: readonly string[];
  isCustomized: boolean;
}

// «Προσαρμογή» (prototype `screens/a1-customize.tsx`): ο Χρήστης κρύβει ή εμφανίζει κάρτες και αλλάζει σειρά. Διαλέγει μόνο
// από όσες του επιτρέπουν τα Δικαιώματά του. Η επιλογή αποθηκεύεται στον λογαριασμό του με το «Τέλος», σε κάθε συσκευή.
// Η Υγεία μένει πάντα πρώτη· μόνο κρύβεται ή εμφανίζεται.
export function Customize({
  available,
  hiddenAtStart,
  isCustomized,
}: CustomizeProps) {
  const [shown, setShown] = useState<readonly string[]>(() =>
    available
      .filter((card) => !hiddenAtStart.includes(card.id))
      .map((card) => card.id),
  );
  const [state, action, isPending] = useActionState(
    saveTodayPrefs,
    INITIAL_FORM_STATE,
  );
  const hidden = available.filter((card) => !shown.includes(card.id));
  const ordered = [
    ...shown.flatMap((id) => available.filter((card) => card.id === id)),
    ...hidden,
  ];
  const isMovable = (card: CardDef) => card.kind !== "status";
  const movable = shown.filter((id) =>
    available.some((card) => card.id === id && isMovable(card)),
  );
  return (
    <section className="card a1-customize" aria-labelledby="a1-customize-title">
      <form action={action}>
        <header className="a1-card-head">
          <h2 id="a1-customize-title">Προσαρμογή της «Σήμερα»</h2>
          <span className="btn-row">
            {/* Κλείσιμο χωρίς αποθήκευση: η «Σήμερα» μένει όπως ήταν. */}
            <Link className="button" href="/app">
              Κλείσιμο
            </Link>
            <button
              className="button"
              data-primary="true"
              type="submit"
              disabled={isPending}
            >
              Τέλος
            </button>
          </span>
        </header>
        <p className="muted">
          Βλέπεις όσες κάρτες σου επιτρέπουν τα Δικαιώματά σου. Κρύψε όσες δεν
          θέλεις και άλλαξε τη σειρά. Η αλλαγή ισχύει μόνο για σένα. Μια κάρτα
          που κρύβεις δεν σταματά τις Ειδοποιήσεις της.
        </p>
        {state.error && (
          <p className="note" role="alert">
            {state.error}
          </p>
        )}
        <ol className="a1-custom-list">
          {ordered.map((card) => {
            const isShown = shown.includes(card.id);
            const index = movable.indexOf(card.id);
            return (
              <li key={card.id} data-shown={isShown}>
                <span className="a1-custom-title">
                  {card.title}{" "}
                  {card.source && (
                    <span className="muted">· {card.source}</span>
                  )}
                </span>
                <span className="btn-row">
                  {isMovable(card) ? (
                    <>
                      <button
                        type="button"
                        className="button"
                        disabled={!isShown || index <= 0}
                        onClick={() => setShown(moved(shown, card.id, -1))}
                        aria-label={`${card.title} πιο πάνω`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="button"
                        disabled={!isShown || index >= movable.length - 1}
                        onClick={() => setShown(moved(shown, card.id, 1))}
                        aria-label={`${card.title} πιο κάτω`}
                      >
                        ↓
                      </button>
                    </>
                  ) : (
                    <span className="muted">πάντα πρώτη</span>
                  )}
                  <button
                    type="button"
                    className="button"
                    onClick={() => setShown(toggled(shown, card.id))}
                  >
                    {isShown ? "Κρύψε" : "Εμφάνισε"}
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
        {ordered.map((card) => (
          <input key={card.id} type="hidden" name="order" value={card.id} />
        ))}
        {hidden.map((card) => (
          <input key={card.id} type="hidden" name="hidden" value={card.id} />
        ))}
      </form>
      {isCustomized && <ResetForm />}
    </section>
  );
}

function ResetForm() {
  const [state, action, isPending] = useActionState(
    resetTodayPrefs,
    INITIAL_FORM_STATE,
  );
  return (
    <form action={action}>
      <p>
        <button className="button" type="submit" disabled={isPending}>
          Επαναφορά προεπιλογής
        </button>
      </p>
      {state.error && (
        <p className="note" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
