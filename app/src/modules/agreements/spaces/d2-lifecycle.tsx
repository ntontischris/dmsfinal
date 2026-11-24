"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { hrefOf } from "@/spaces/data/screens";

import {
  attachSignedFile,
  cancelDissolution,
  dissolveAgreement,
  renewAgreement,
  setContinuation,
} from "../actions-lifecycle";
import { formatDate } from "../helpers";
import type { Lifecycle } from "../lifecycle-schema";
import { D2Form, D2Scope, IdField } from "./d2-ui";

// Λήξη και συνέχεια μιας υπογεγραμμένης Συμφωνίας (b8, b9, b12): Λύση, «Χωρίς συνέχιση», ανανέωση και υπογεγραμμένο
// αρχείο. Ζει στο hero της D2, δίπλα στις ενέργειες· τι φαίνεται το λέει το `can` της βάσης.

const DAY_MS = 86_400_000;

const addDays = (iso: string, days: number): string =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

const by = (name: string | null): string => (name ? ` · ${name}` : "");

// Ένα κουμπί που ανοίγει τη φόρμα του από κάτω· το «Άκυρο» την ξανακλείνει.
function Toggle({ label, children }: { label: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!isOpen)
    return (
      <span className="ml-quick">
        <button type="button" onClick={() => setIsOpen(true)}>
          {label}
        </button>
      </span>
    );
  return (
    <fieldset className="d2-form">
      <legend>{label}</legend>
      {children}
      <span className="ml-quick">
        <button type="button" onClick={() => setIsOpen(false)}>
          Άκυρο
        </button>
      </span>
    </fieldset>
  );
}

interface PanelProps {
  agreementId: string;
  lifecycle: Lifecycle;
  today: string;
}

function DissolveForm({ agreementId, lifecycle, today }: PanelProps) {
  return (
    <Toggle label="Λύση">
      <D2Form
        action={dissolveAgreement}
        submitLabel="Καταχώριση Λύσης"
        isDanger
      >
        <IdField id={agreementId} />
        <label className="stack">
          <span className="muted">Ημερομηνία Λύσης</span>
          <input
            className="input"
            type="date"
            name="on"
            defaultValue={addDays(today, lifecycle.noticeDays ?? 0)}
            min={today}
          />
        </label>
        <label className="stack">
          <span className="muted">Λόγος Λύσης</span>
          <textarea className="input" name="reason" rows={2} maxLength={500} />
        </label>
        <span className="muted">
          Οι Περίοδοι μετά τη Λύση και οι Παραγωγές τους που δεν ξεκίνησαν
          ακυρώνονται. Ως τη Λύση μπορείς να την ακυρώσεις.
        </span>
      </D2Form>
    </Toggle>
  );
}

function StopForm({ agreementId }: { agreementId: string }) {
  return (
    <Toggle label="Χωρίς συνέχιση">
      <D2Form action={setContinuation} submitLabel="Δεν συνεχίζει μετά τη Λήξη">
        <IdField id={agreementId} />
        <input type="hidden" name="continue" value="no" />
        <label className="stack">
          <span className="muted">Σημείωση (προαιρετικό)</span>
          <input className="input" name="note" maxLength={500} />
        </label>
        <span className="muted">
          Η Συμφωνία τελειώνει στη Λήξη: δεν συνεχίζει μόνη της και δεν ανοίγει
          Ευκαιρία ανανέωσης.
        </span>
      </D2Form>
    </Toggle>
  );
}

function FileForm({
  agreementId,
  hasFile,
}: {
  agreementId: string;
  hasFile: boolean;
}) {
  return (
    <Toggle
      label={hasFile ? "Αντικατάσταση αρχείου" : "Ανέβασμα υπογεγραμμένου"}
    >
      <D2Form action={attachSignedFile} submitLabel="Ανέβασμα">
        <IdField id={agreementId} />
        <label className="stack">
          <span className="muted">Υπογεγραμμένο αρχείο</span>
          <input
            className="input"
            type="file"
            name="signedFile"
            accept="application/pdf,image/jpeg,image/png"
            required
          />
        </label>
        <span className="muted">PDF, JPG ή PNG, έως 4 MB.</span>
      </D2Form>
    </Toggle>
  );
}

function StatusLines({ agreementId, lifecycle }: PanelProps) {
  const { dissolution, noContinuation, signedFile } = lifecycle;
  return (
    <>
      {dissolution && (
        <p className="note" role="note">
          Λύση στις {formatDate(dissolution.on)}
          {dissolution.reason ? ` · ${dissolution.reason}` : ""}
          {by(dissolution.byName)}
        </p>
      )}
      {noContinuation && (
        <p className="note" role="note">
          Χωρίς συνέχιση: τελειώνει στη Λήξη
          {noContinuation.note ? ` · ${noContinuation.note}` : ""}
          {by(noContinuation.byName)}
        </p>
      )}
      {lifecycle.renewals.map((renewal) => (
        <p key={renewal.opportunityId} className="row">
          <span className="muted">Ευκαιρία ανανέωσης:</span>
          <Link href={hrefOf("B4", { id: renewal.opportunityId })}>
            {renewal.opportunityTitle}
          </Link>
          {renewal.agreementId && (
            <Link href={hrefOf("D2", { id: renewal.agreementId })}>
              Νέα πρόταση
            </Link>
          )}
        </p>
      ))}
      {signedFile && (
        <p className="row">
          <span className="muted">Υπογεγραμμένο αρχείο:</span>
          <a href={`/app/agreements/${agreementId}/signed-file`}>
            {signedFile.name}
          </a>
        </p>
      )}
    </>
  );
}

const isWorthShowing = (lifecycle: Lifecycle): boolean =>
  lifecycle.dissolution !== null ||
  lifecycle.noContinuation !== null ||
  lifecycle.renewals.length > 0 ||
  lifecycle.signedFile !== null ||
  Object.values(lifecycle.can).some(Boolean);

export function LifecyclePanel(props: PanelProps) {
  const { agreementId, lifecycle } = props;
  const { can } = lifecycle;
  if (!isWorthShowing(lifecycle)) return null;
  return (
    <section className="d2-life">
      <h2 className="d2-life-title">Λήξη και συνέχεια</h2>
      <D2Scope>
        <div className="stack">
          <StatusLines {...props} />
          <div className="ml-quick d2-life-actions">
            {can.renew && (
              <D2Form
                action={renewAgreement}
                submitLabel="Ανανέωση τώρα"
                className="ml-quick"
              >
                <IdField id={agreementId} />
              </D2Form>
            )}
            {can.cancelDissolution && (
              <D2Form
                action={cancelDissolution}
                submitLabel="Ακύρωση Λύσης"
                className="ml-quick"
              >
                <IdField id={agreementId} />
              </D2Form>
            )}
            {can.setContinuation && lifecycle.noContinuation !== null && (
              <D2Form
                action={setContinuation}
                submitLabel="Συνεχίζει κανονικά"
                className="ml-quick"
              >
                <IdField id={agreementId} />
                <input type="hidden" name="continue" value="yes" />
                <input type="hidden" name="note" value="" />
              </D2Form>
            )}
            {can.setContinuation && lifecycle.noContinuation === null && (
              <StopForm agreementId={agreementId} />
            )}
            {can.dissolve && <DissolveForm {...props} />}
            {/* Νέο αρχείο → νέο key: η φόρμα κλείνει μόνη της μετά το ανέβασμα. */}
            {can.attachFile && (
              <FileForm
                key={lifecycle.signedFile?.uploadedAt ?? "none"}
                agreementId={agreementId}
                hasFile={lifecycle.signedFile !== null}
              />
            )}
          </div>
        </div>
      </D2Scope>
    </section>
  );
}
