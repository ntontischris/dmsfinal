"use client";

import { useKeptForm } from "@/lib/use-kept-form";

import { setInvoicePaymentRef } from "../actions-corrections";
import { Field, FormFeedback } from "./i3-fields";

import "./i13.css";

// Κωδικός πληρωμής (RF) στη σελίδα του Τιμολογίου: κλειστή γραμμή με την τιμή ή «—», ένα πεδίο και μία αποθήκευση.
// Κενό πεδίο = καθάρισμα. Ο πελάτης τον βλέπει στο «Πώς πληρώνω».
export function PaymentRefBox(props: {
  invoiceId: string;
  paymentRef: string | null;
  canEdit: boolean;
}) {
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(setInvoicePaymentRef);
  return (
    <section>
      <details className="ml-box">
        <summary>
          <h2 className="ml-box-title">Κωδικός πληρωμής (RF)</h2>
          <small>{props.paymentRef ?? "—"}</small>
        </summary>
        <div>
          {props.canEdit ? (
            <form ref={formRef} onSubmit={onSubmit}>
              <input type="hidden" name="id" value={props.invoiceId} />
              <Field label="Κωδικός πληρωμής (RF)">
                <input
                  className="input"
                  name="paymentRef"
                  defaultValue={props.paymentRef ?? ""}
                  maxLength={35}
                  autoComplete="off"
                />
              </Field>
              <p className="muted">
                Τον βλέπει ο Πελάτης στο «Πώς πληρώνω». Άφησέ τον κενό για να
                φύγει.
              </p>
              <p>
                <button type="submit" className="button" disabled={isPending}>
                  {isPending ? "Αποθηκεύεται…" : "Αποθήκευση"}
                </button>{" "}
                <FormFeedback error={state.error} notice={state.notice} />
              </p>
            </form>
          ) : (
            <p className="muted">
              {props.paymentRef ?? "Δεν έχει γραφτεί κωδικός πληρωμής."}
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
