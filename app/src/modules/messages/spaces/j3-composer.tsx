"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type ChangeEvent } from "react";

import { sendMessage } from "../actions";
import { ATTACHMENT_ACCEPT, formatSize } from "../attachment-rules";
import { ATTACH_HINT } from "../labels";
import { BOOK_PATH, DELIVERABLES_PATH } from "../request-helpers";
import {
  useAttachmentUploads,
  type UploadItem,
} from "../use-attachment-uploads";
import type { RequestKind, ThreadProduction } from "../view-schema";
import { CLIENT_REQUEST_KINDS, j3SentNoticeOf } from "./j3-adapter";
import { JForm } from "./j2-form";

import "./j3.css";

interface J3ComposerProps {
  clientId: string;
  productions: readonly ThreadProduction[];
  recipient: string;
}

type Mode = "message" | "request";

const statusOf = (item: UploadItem): string =>
  item.status === "uploading"
    ? " · ανεβαίνει…"
    : item.status === "failed"
      ? " · δεν ανέβηκε"
      : "";

function ModeSwitch({
  mode,
  onMode,
}: {
  mode: Mode;
  onMode: (next: Mode) => void;
}) {
  const isRequest = mode === "request";
  return (
    <div className="j3-modes" role="group" aria-label="Τι θέλεις να κάνεις">
      <button
        type="button"
        className="button"
        aria-pressed={!isRequest}
        onClick={() => onMode("message")}
      >
        <span>
          {!isRequest && <span aria-hidden="true">✓ </span>}Στείλε μήνυμα
        </span>
        <small>π.χ. μια ερώτηση ή μια πληροφορία</small>
        <small>Σου απαντούν εδώ, στη συζήτηση.</small>
      </button>
      <button
        type="button"
        className="button"
        aria-pressed={isRequest}
        onClick={() => onMode("request")}
      >
        <span>
          {isRequest && <span aria-hidden="true">✓ </span>}Ζήτα κάτι να γίνει
        </span>
        <small>π.χ. νέο βίντεο ή γύρισμα</small>
        <small>
          Η ομάδα το παρακολουθεί μέχρι να γίνει· το βλέπεις στα «Αιτήματα».
        </small>
      </button>
    </div>
  );
}

function KindPicker({
  kind,
  onKind,
}: {
  kind: RequestKind;
  onKind: (next: RequestKind) => void;
}) {
  return (
    <div className="j3-field">
      {/* Όλα τα είδη φαίνονται μαζί, για να μην κρύβεται το «Γύρισμα» σε λίστα. */}
      <fieldset className="j3-kinds">
        <legend>Τι ζητάς;</legend>
        {CLIENT_REQUEST_KINDS.map((item) => (
          <label key={item.kind} className="j3-kind">
            <input
              type="radio"
              name="requestKind"
              value={item.kind}
              checked={kind === item.kind}
              onChange={() => onKind(item.kind)}
            />
            {item.label}
          </label>
        ))}
      </fieldset>
      {kind === "filming" && (
        <p className="note">
          Για νέο γύρισμα, πιο γρήγορα το κλείνεις μόνος σου:{" "}
          <Link href={BOOK_PATH}>Κλείσε νέο γύρισμα</Link>
        </p>
      )}
      {kind === "deliverable" && (
        <p className="muted">
          Για αλλαγή σε βίντεο που ήδη ενέκρινες, πάτα «Ζητώ αλλαγή» μέσα στο
          ίδιο το βίντεο.{" "}
          <Link href={DELIVERABLES_PATH}>Δες τα βίντεό σου</Link>
        </p>
      )}
    </div>
  );
}

// Ο συντάκτης του πελάτη (prototype `screens/j3-composer.tsx`): μήνυμα ή Αίτημα, ετικέτα από τις Παραγωγές του, συνημμένα.
// Στέλνει στο πραγματικό sendMessage· τα αρχεία ανεβαίνουν απευθείας στο Storage. Χωρίς Εσωτερικά και αναφορές.
export function J3Composer({
  clientId,
  productions,
  recipient,
}: J3ComposerProps) {
  const router = useRouter();
  const uploads = useAttachmentUploads();
  const resetUploads = uploads.reset;
  const [mode, setMode] = useState<Mode>("message");
  const [kind, setKind] = useState<RequestKind>("deliverable");
  const [productionId, setProductionId] = useState("");
  const [text, setText] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  // Το είδος της τελευταίας αποστολής, για την επιβεβαίωση· ref ώστε το onSuccess να μένει σταθερό.
  const isRequestRef = useRef(false);
  const isRequest = mode === "request";
  const pickMode = (next: Mode) => {
    isRequestRef.current = next === "request";
    setMode(next);
  };

  const handleSent = useCallback(() => {
    setSent(j3SentNoticeOf(isRequestRef.current, recipient));
    isRequestRef.current = false;
    setMode("message");
    setText("");
    setProductionId("");
    resetUploads();
    router.refresh();
  }, [router, resetUploads, recipient]);

  const attach = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0)
      void uploads.add(files, {
        clientId,
        productionId: productionId === "" ? null : productionId,
      });
  };

  const isEmpty = text.trim() === "" && uploads.paths.length === 0;
  return (
    <>
      <JForm
        action={sendMessage}
        className="card j3-composer"
        submitLabel={isRequest ? "Στείλε το αίτημα" : "Στείλε το μήνυμα"}
        pendingLabel="Αποστολή…"
        isDisabled={isEmpty || uploads.isUploading}
        onSuccess={handleSent}
      >
        <h2 className="card-title">Νέο μήνυμα</h2>
        <p className="j3-to">
          <span className="muted">Προς:</span> <strong>{recipient}</strong>
        </p>
        <ModeSwitch mode={mode} onMode={pickMode} />
        <input type="hidden" name="clientId" value={clientId} />
        {isRequest && <KindPicker kind={kind} onKind={setKind} />}
        <label className="j3-field">
          <span>{isRequest ? "Περίγραψε τι χρειάζεσαι" : "Το μήνυμά σου"}</span>
          <textarea
            className="input"
            name="body"
            maxLength={4000}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <label className="j3-field">
          <span>Αφορά συγκεκριμένη δουλειά; (προαιρετικό)</span>
          <select
            className="input"
            name="productionId"
            value={productionId}
            onChange={(event) => setProductionId(event.target.value)}
          >
            <option value="">Όχι, κάτι γενικό</option>
            {productions.map((production) => (
              <option key={production.id} value={production.id}>
                {production.title}
              </option>
            ))}
          </select>
          <small className="muted">
            Αν διαλέξεις δουλειά, η ομάδα βλέπει αμέσως σε ποια αναφέρεσαι.
            Αλλιώς το αφήνεις όπως είναι.
          </small>
        </label>
        <div className="j3-field">
          <label className="button j3-attach">
            Πρόσθεσε αρχείο
            <input
              type="file"
              multiple
              accept={ATTACHMENT_ACCEPT}
              onChange={attach}
            />
          </label>
          <p className="muted">{ATTACH_HINT}</p>
          {uploads.items.length > 0 && (
            <ul className="jfiles">
              {uploads.items.map((item) => (
                <li key={item.key}>
                  {item.name} ({formatSize(item.size)}
                  {statusOf(item)}){" "}
                  {item.path !== null && (
                    <input type="hidden" name="attachments" value={item.path} />
                  )}
                  <button
                    type="button"
                    onClick={() => uploads.remove(item.key)}
                    aria-label={`Αφαίρεση ${item.name}`}
                  >
                    Αφαίρεση
                  </button>
                </li>
              ))}
            </ul>
          )}
          {uploads.error && (
            <p className="note" role="alert">
              {uploads.error}
            </p>
          )}
        </div>
      </JForm>
      {sent !== null && (
        <p className="note" role="status">
          {sent}
        </p>
      )}
    </>
  );
}
