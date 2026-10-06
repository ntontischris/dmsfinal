"use client";

import { useState } from "react";

import Link from "next/link";

import { ReasonForm } from "@/screens/h2-forms";
import { whoLabel, type PanelProps } from "@/screens/h2-model";
import { decideCharge, decideRequest } from "@/screens/h2-reducers-money";
import { fmtDate } from "@/screens/shared";

export function H2Charge({ ctx, live, update }: PanelProps) {
  const [isAsking, setIsAsking] = useState(false);
  const { charge } = live;
  if (!charge || !ctx.caps.canWork) return null;
  const { decided } = charge;
  return (
    <section className="card">
      <div className="card-title">
        <h2>Απόφαση χρέωσης</h2>
        <span className="muted">γύρος {charge.round}</span>
      </div>
      <p>
        Ο γύρος {charge.round} ζητήθηκε στις {fmtDate(charge.askedAt)} πέρα από
        το Όριο αλλαγών. Η δουλειά δεν σταμάτησε.
      </p>
      {decided ? (
        <p className="note">
          {decided.choice === "χρεώνεται"
            ? "Χρεώνεται: γεννήθηκε Τιμολογητέο «έξτρα αναθεώρηση»."
            : `Χωρίς χρέωση: ${decided.reason ?? ""}.`}{" "}
          Αποφάσισε ο/η {whoLabel(decided.by)} στις {fmtDate(decided.when)}.
        </p>
      ) : !ctx.caps.canSeeAmounts ? (
        <p className="note">
          Η χρέωση του γύρου αποφασίζεται από όποιον βλέπει ποσά.
        </p>
      ) : (
        <div className="stack">
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-primary
              onClick={() => update((l) => decideCharge(l, ctx, "χρεώνεται"))}
            >
              Χρεώνεται
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setIsAsking(true)}
            >
              Χωρίς χρέωση
            </button>
          </div>
          {isAsking && (
            <ReasonForm
              label="Λόγος (υποχρεωτικός)"
              confirmLabel="Χωρίς χρέωση"
              onConfirm={(reason) => {
                update((l) => decideCharge(l, ctx, "χωρίς χρέωση", reason));
                setIsAsking(false);
              }}
              onClose={() => setIsAsking(false)}
            />
          )}
        </div>
      )}
    </section>
  );
}

export function H2Requests({ ctx, live, update }: PanelProps) {
  if (live.requests.length === 0) return null;
  return (
    <section className="card">
      <div className="card-title">
        <h2>Αιτήματα αλλαγής μετά την έγκριση</h2>
      </div>
      <ul className="list">
        {live.requests.map((r) => (
          <li key={r.id} className="h2-comment">
            <strong>{whoLabel(r.by)}</strong>{" "}
            <span className="muted">{fmtDate(r.when)}</span>
            <p>{r.text}</p>
            {r.decided ? (
              <p className="note">
                Απόφαση: {r.decided.choice} ({whoLabel(r.decided.by)},{" "}
                {fmtDate(r.decided.when)}). Η έγκριση και ό,τι γέννησε μένουν.
              </p>
            ) : (
              <RequestChoices id={r.id} {...{ ctx, live, update }} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RequestChoices({ id, ctx, update }: PanelProps & { id: string }) {
  if (!ctx.canDecideRequests)
    return (
      <p className="note">
        Το αίτημα το εξετάζει ο Υπεύθυνος Παραγωγής ή η Διαχείριση.
      </p>
    );
  const pick = (choice: "δεκτό ως γύρος" | "χρεώνεται" | "νέο Παραδοτέο") =>
    update((l) => decideRequest(l, ctx, id, choice));
  return (
    <div className="btn-row">
      <button
        type="button"
        className="button"
        onClick={() => pick("δεκτό ως γύρος")}
      >
        Δεκτό ως γύρος
      </button>
      <button
        type="button"
        className="button"
        onClick={() => pick("νέο Παραδοτέο")}
      >
        Νέο Παραδοτέο
      </button>
      {ctx.caps.canSeeAmounts && (
        <button
          type="button"
          className="button"
          onClick={() => pick("χρεώνεται")}
        >
          Χρεώνεται
        </button>
      )}
      <Link className="muted" href={ctx.newDeliverableHref}>
        (άνοιγμα φόρμας νέου Παραδοτέου)
      </Link>
    </div>
  );
}
