"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { setMessageTag } from "../actions";
import { CREATE_DELIVERABLE_NEEDS_TAG } from "../request-labels";
import type { ThreadProduction } from "../view-schema";
import { JForm } from "./j2-form";

// «Νέο Παραδοτέο» χωρίς ετικέτα Παραγωγής: το λέμε από πριν και η ετικέτα μπαίνει εδώ, στο ίδιο πλαίσιο.
export function TagFirst({
  messageId,
  productions,
}: {
  messageId: string;
  productions: readonly ThreadProduction[];
}) {
  const router = useRouter();
  const handleTagged = useCallback(() => router.refresh(), [router]);
  if (productions.length === 0)
    return <p className="note">{CREATE_DELIVERABLE_NEEDS_TAG}</p>;
  return (
    <JForm action={setMessageTag} className="toolbar" onSuccess={handleTagged}>
      <input type="hidden" name="id" value={messageId} />
      <p className="note">
        Για Παραδοτέο χρειάζεται πρώτα ετικέτα Παραγωγής: διάλεξέ την εδώ και
        θα εμφανιστεί το «Δημιουργία Παραδοτέου».
      </p>
      <label className="toolbar">
        <span>Ετικέτα Παραγωγής</span>
        <select
          className="input"
          name="productionId"
          defaultValue=""
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="" disabled>
            Διάλεξε Παραγωγή…
          </option>
          {productions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
    </JForm>
  );
}

// «Άλλο» Αίτημα: συχνά ζητά αντίγραφο Τιμολογίου ή απόδειξης. Λέμε πού είναι και τι δεν υπάρχει.
export function OtherRequestHelp({ clientId }: { clientId: string }) {
  return (
    <p className="note">
      Αν ζητά αντίγραφο Τιμολογίου ή απόδειξης: τα Τιμολόγια του Πελάτη είναι
      στα{" "}
      <Link href={`/app/finance/invoices?client=${clientId}`}>
        Οικονομικά → Τιμολόγια
      </Link>
      . Η εφαρμογή δεν φτιάχνει αρχείο απόδειξης· επισύναψε το αρχείο στην
      απάντηση ή πάτα «Ολοκληρώθηκε» με σχόλιο.
    </p>
  );
}
