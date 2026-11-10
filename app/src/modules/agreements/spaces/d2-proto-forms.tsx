"use client";

// PROTOTYPE — throwaway, three simpler proposal pages via ?variant=.
// Οι γρήγορες φόρμες των παραλλαγών. Καμία νέα ενέργεια: κάθε φόρμα καλεί με τη σειρά τις υπάρχουσες
// (removeLine → addCatalogueLine, updateBasics → setRecipients). Όλα τα υπόλοιπα πεδία μένουν στις σημερινές φόρμες.

import { useState, type ReactNode } from "react";

import type { FormState } from "@/lib/form-state";

import {
  addCatalogueLine,
  removeLine,
  setRecipients,
  updateBasics,
} from "../actions-draft";
import type { AgreementDetail } from "../types";
import { D2Form, IdField, NumberInput } from "./d2-ui";
import { longDate, signatoryOf } from "./d2-proto-model";
import { endOfTerm } from "../helpers-parts";

const formOf = (entries: Record<string, string>): FormData => {
  const data = new FormData();
  Object.entries(entries).forEach(([key, value]) => data.set(key, value));
  return data;
};

// ───────────── Τι πουλάμε: κάρτες Πακέτων ─────────────

export interface PackageCard {
  itemId: string;
  name: string;
  line: string;
}

interface PickerProps {
  agreementId: string;
  packages: readonly PackageCard[];
  chosenIds: readonly string[];
  packageLineIds: readonly string[];
  canEdit: boolean;
}

// «Διάλεξε»: αν υπάρχει ήδη Πακέτο, το αφαιρεί και βάζει το νέο (δύο υπάρχουσες ενέργειες στη σειρά).
export function PackagePicker({
  agreementId,
  packages,
  chosenIds,
  packageLineIds,
  canEdit,
}: PickerProps) {
  const choose = async (previous: FormState, form: FormData) => {
    for (const lineId of packageLineIds) {
      const removed = await removeLine(previous, formOf({ lineId }));
      if (removed.error) return removed;
    }
    const added = await addCatalogueLine(previous, form);
    return added.error ? added : { notice: "Το Πακέτο μπήκε στην πρόταση." };
  };
  if (packages.length === 0)
    return (
      <p className="muted">
        Ο Κατάλογος δεν έχει Πακέτα για αυτό το είδος. Πρόσθεσε γραμμές από το
        «Αλλαγή γραμμών».
      </p>
    );
  return (
    <ul className="d2p-packages">
      {packages.map((p) => {
        const isChosen = chosenIds.includes(p.itemId);
        return (
          <li key={p.itemId} className="d2p-package" data-chosen={isChosen}>
            <strong>{p.name}</strong>
            <span className="muted">{p.line || "—"}</span>
            {isChosen ? (
              <span className="d2p-chosen">✓ στην πρόταση</span>
            ) : (
              canEdit && (
                <D2Form
                  action={choose}
                  submitLabel={
                    packageLineIds.length > 0 ? "Αλλαγή σε αυτό" : "Διάλεξε"
                  }
                  isPrimary={packageLineIds.length === 0}
                  className="btn-row"
                >
                  <IdField id={agreementId} />
                  <input type="hidden" name="itemId" value={p.itemId} />
                  <input type="hidden" name="quantity" value="1" />
                </D2Form>
              )
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ───────────── Πότε και σε ποιον ─────────────

const liveSentence = (
  isMonthly: boolean,
  isOnSignature: boolean,
  startOn: string,
  months: string,
): string | null => {
  const n = Number(months);
  if (!isMonthly || !Number.isInteger(n) || n < 1) return null;
  if (isOnSignature || startOn === "") return `${n} μήνες από την υπογραφή.`;
  return `${n} μήνες, ως ${longDate(endOfTerm(startOn, n))}.`;
};

const recipientsWith = (
  agreement: AgreementDetail,
  name: string,
  email: string,
): string => {
  const others = agreement.recipients
    .filter((r) => !r.isSignatory)
    .map((r) => ({ name: r.name, email: r.email, isSignatory: false }));
  const head = { name, email, isSignatory: true };
  return JSON.stringify([head, ...others]);
};

// Έναρξη, Διάρκεια, Υπογράφων σε μία φόρμα: updateBasics και μετά setRecipients (μόνο αν άλλαξε ο Υπογράφων).
export function QuickSchedule({
  agreement,
  submitLabel = "Αποθήκευση",
}: {
  agreement: AgreementDetail;
  submitLabel?: string;
}) {
  const isMonthly = agreement.kind === "monthly";
  const signatory = signatoryOf(agreement.recipients);
  const [isOnSignature, setIsOnSignature] = useState(
    agreement.startOn === null,
  );
  const [startOn, setStartOn] = useState(agreement.startOn ?? "");
  const [months, setMonths] = useState(
    agreement.durationMonths === null ? "" : String(agreement.durationMonths),
  );
  const save = async (previous: FormState, form: FormData) => {
    const basics = await updateBasics(previous, form);
    if (basics.error) return basics;
    const name = String(form.get("signatoryName") ?? "").trim();
    const email = String(form.get("signatoryEmail") ?? "").trim();
    const isSame =
      signatory !== null &&
      signatory.name === name &&
      signatory.email === email;
    if (isSame || (name === "" && email === "")) return basics;
    return setRecipients(
      previous,
      formOf({
        agreementId: agreement.id,
        recipients: recipientsWith(agreement, name, email),
      }),
    );
  };
  const preview = liveSentence(isMonthly, isOnSignature, startOn, months);
  return (
    <D2Form
      action={save}
      submitLabel={submitLabel}
      isPrimary
      className="stack d2p-quick"
    >
      <IdField id={agreement.id} />
      <input type="hidden" name="title" value={agreement.title || "Πρόταση"} />
      <input type="hidden" name="language" value={agreement.language} />
      <input type="hidden" name="validUntil" value={agreement.validUntil} />
      <div className="d2p-quick-row">
        <div className="field">
          <span>Ξεκινά</span>
          <span className="btn-row">
            <label>
              <input
                type="checkbox"
                name="startOnSignature"
                checked={isOnSignature}
                onChange={(e) => setIsOnSignature(e.target.checked)}
              />{" "}
              με την υπογραφή
            </label>
            {!isOnSignature && (
              <input
                className="input"
                type="date"
                name="startOn"
                aria-label="Έναρξη"
                value={startOn}
                onChange={(e) => setStartOn(e.target.value)}
              />
            )}
          </span>
        </div>
        {isMonthly && (
          <label className="field">
            <span>Για</span>
            <NumberInput
              name="durationMonths"
              label="Διάρκεια σε μήνες"
              value={months}
              onChange={setMonths}
              suffix="μήνες"
            />
          </label>
        )}
      </div>
      {preview && <p className="d2p-live">→ {preview}</p>}
      <div className="d2p-quick-row">
        <label className="field">
          <span>Υπογράφει</span>
          <input
            className="input"
            name="signatoryName"
            autoComplete="off"
            placeholder="Όνομα"
            defaultValue={signatory?.name ?? agreement.client.contactName}
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            name="signatoryEmail"
            autoComplete="off"
            placeholder="email@example.com"
            defaultValue={signatory?.email ?? agreement.client.contactEmail}
          />
        </label>
      </div>
    </D2Form>
  );
}

// ───────────── «αλλαγή» μέσα στο κείμενο (Γ) ─────────────

export function InlineEdit({
  children,
  editor,
  canEdit,
  label = "αλλαγή",
}: {
  children: ReactNode;
  editor: ReactNode;
  canEdit: boolean;
  label?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="d2p-inline" data-open={isOpen}>
      <div className="d2p-inline-text">
        {children}
        {canEdit && (
          <button
            type="button"
            className="d2p-change"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? "κλείσιμο" : label}
          </button>
        )}
      </div>
      {isOpen && <div className="d2p-inline-editor">{editor}</div>}
    </div>
  );
}

// ───────────── Τα τρία βήματα (Α) ─────────────

export interface StepItem {
  label: string;
  summary: string;
  isDone: boolean;
  hasOwnPrimary?: boolean; // το βήμα έχει ήδη το κύριο κουμπί του
  body: ReactNode;
}

export function Stepper({
  steps,
  initial,
}: {
  steps: readonly StepItem[];
  initial: number;
}) {
  const [current, setCurrent] = useState(initial);
  const step = steps[current];
  if (!step) return null;
  const next = steps[current + 1];
  return (
    <div className="d2p-stepper">
      <ol className="d2p-steps" aria-label="Βήματα της πρότασης">
        {steps.map((s, index) => (
          <li
            key={s.label}
            data-state={
              index === current ? "current" : s.isDone ? "done" : "todo"
            }
          >
            <button
              type="button"
              aria-current={index === current ? "step" : undefined}
              onClick={() => setCurrent(index)}
            >
              <span className="d2p-step-n">
                {s.isDone && index !== current ? "✓" : index + 1}
              </span>
              <span className="d2p-step-text">
                <strong>{s.label}</strong>
                <span className="muted">{s.summary}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <section className="card d2p-step-body" aria-label={step.label}>
        {step.body}
        <div className="d2p-step-nav">
          {current > 0 && (
            <button
              type="button"
              className="button"
              onClick={() => setCurrent(current - 1)}
            >
              ← Πίσω
            </button>
          )}
          {next && (
            <button
              type="button"
              className="button"
              data-primary={
                step.isDone && !step.hasOwnPrimary ? "true" : undefined
              }
              onClick={() => setCurrent(current + 1)}
            >
              Επόμενο: {next.label} →
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
