"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  renewCalendarLink,
  revokeCalendarLink,
  type LinkState,
} from "../actions-link";

import "../../finance/spaces/money-lines.css";
import "./a5-link.css";

// «Στο κινητό σου» από το prototype (`screens/a5-link.tsx`), με τον πραγματικό σύνδεσμο: το token φαίνεται μία φορά,
// μετά τη δημιουργία ή την ανανέωση, και μόνο στη μνήμη της σελίδας (μένει το hash στη βάση).

interface CalendarLinkCardProps {
  exists: boolean;
  createdLabel: string | null;
  isClient: boolean;
  // Στο Προφίλ (A3) κλειστό κουτί όπως τα υπόλοιπα· στο Ημερολόγιο (A5) ανοιχτό.
  isOpen?: boolean;
}

type Confirming = "renew" | "revoke" | null;

// Ό,τι δίνει το calendar_feed (authz.calendar_events): ίδιος κανόνας με τη λίστα Γυρισμάτων, χωρίς όσα αρνήθηκες,
// συν τον δικό σου κλεισμένο χρόνο, από 30 μέρες πίσω ως 180 μπροστά. Προθεσμίες Παραδοτέων δεν μπαίνουν.
const TEAM_CONTENT = [
  "Γυρίσματα όπου είσαι στο Συνεργείο ή υπεύθυνος (όλα, αν ο Ρόλος σου βλέπει όλα τα Γυρίσματα)",
  "Ο δικός σου κλεισμένος χρόνος (ρεπό, άδειες)",
  "Από 30 μέρες πίσω ως 6 μήνες μπροστά",
];

const CLIENT_CONTENT = [
  "Μόνο τα Γυρίσματα του Πελάτη σου",
  "Χωρίς εσωτερικές σημειώσεις",
  "Από 30 μέρες πίσω ως 6 μήνες μπροστά",
];

function Instructions() {
  return (
    <details className="a5-link-how">
      <summary>Πώς το βάζω στο κινητό</summary>
      <h4>iPhone</h4>
      <ol className="a5-link-steps">
        <li>Ρυθμίσεις › Ημερολόγιο › Λογαριασμοί › Προσθήκη λογαριασμού</li>
        <li>Άλλο › «Προσθήκη ημερολογίου συνδρομής»</li>
        <li>Επικόλλησε τον σύνδεσμο.</li>
      </ol>
      <h4>Google</h4>
      <ol className="a5-link-steps">
        <li>
          Στον υπολογιστή: calendar.google.com › «Άλλα ημερολόγια» › «+» › «Από
          URL» › επικόλλησε τον σύνδεσμο.
        </li>
        <li>
          Στο Android, στην εφαρμογή: Ρυθμίσεις › το ημερολόγιο ›
          «Συγχρονισμός».
        </li>
      </ol>
      <small className="a5-link-note">
        Το Google ενημερώνεται κάθε λίγες ώρες, όχι αμέσως.
      </small>
    </details>
  );
}

function Address({ url }: { url: string }) {
  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  };
  return (
    <>
      <div className="a5-link-url">
        <code>{url}</code>
        <span className="ml-quick">
          <button type="button" onClick={handleCopy}>
            {isCopied ? "Αντιγράφηκε" : "Αντιγραφή"}
          </button>
        </span>
      </div>
      <p className="muted">
        Ο σύνδεσμος φαίνεται μόνο τώρα. Αν τον χάσεις, ανανέωσέ τον.
      </p>
    </>
  );
}

interface ConfirmProps {
  confirming: Exclude<Confirming, null>;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function Confirm({ confirming, isPending, onConfirm, onCancel }: ConfirmProps) {
  const isRenew = confirming === "renew";
  return (
    <div className="a5-link-confirm" role="alert">
      <small className="a5-link-note" data-warn="true">
        {isRenew
          ? "Ο παλιός σύνδεσμος σταματά αμέσως. Θα χρειαστεί να τον ξαναπροσθέσεις στο κινητό."
          : "Ο σύνδεσμος σταματά αμέσως."}
      </small>
      <div className="ml-actions">
        <button type="button" onClick={onCancel}>
          Άκυρο
        </button>
        <button
          type="button"
          data-danger="true"
          disabled={isPending}
          onClick={onConfirm}
        >
          {isRenew ? "Ανανέωση τώρα" : "Κατάργηση τώρα"}
        </button>
      </div>
    </div>
  );
}

interface ActionsProps {
  exists: boolean;
  isPending: boolean;
  onCreate: () => void;
  onAsk: (confirming: Exclude<Confirming, null>) => void;
}

function Actions({ exists, isPending, onCreate, onAsk }: ActionsProps) {
  if (!exists)
    return (
      <div className="ml-actions">
        <button
          type="button"
          data-primary="true"
          disabled={isPending}
          onClick={onCreate}
        >
          {isPending ? "Δημιουργία…" : "Δημιουργία συνδέσμου"}
        </button>
      </div>
    );
  return (
    <div className="ml-actions">
      <button type="button" disabled={isPending} onClick={() => onAsk("renew")}>
        Ανανέωση συνδέσμου
      </button>
      <button
        type="button"
        data-danger="true"
        disabled={isPending}
        onClick={() => onAsk("revoke")}
      >
        Κατάργηση συνδέσμου
      </button>
    </div>
  );
}

export function CalendarLinkCard({
  exists,
  createdLabel,
  isClient,
  isOpen = true,
}: CalendarLinkCardProps) {
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const finish = (result: LinkState, onDone: () => void) => {
    setConfirming(null);
    setError(result.error ?? null);
    if (!result.error) onDone();
    router.refresh();
  };
  const handleRenew = () =>
    startTransition(async () => {
      const result = await renewCalendarLink();
      finish(result, () => setUrl(result.url ?? null));
    });
  const handleRevoke = () =>
    startTransition(async () => {
      const result = await revokeCalendarLink();
      finish(result, () => setUrl(null));
    });

  return (
    <section>
      <details className="ml-box" open={isOpen}>
        <summary>
          <h2 className="ml-box-title">Στο κινητό σου</h2>
          <small>Σύνδεσμος ημερολογίου (μόνο για εσένα)</small>
        </summary>
        <div className="a5-link-body">
          {url ? (
            <Address url={url} />
          ) : (
            <p className="muted">
              {exists
                ? `Δημιουργήθηκε στις ${createdLabel ?? "—"}.`
                : "Δεν έχεις σύνδεσμο ακόμα."}
            </p>
          )}
          {confirming ? (
            <Confirm
              confirming={confirming}
              isPending={isPending}
              onConfirm={confirming === "renew" ? handleRenew : handleRevoke}
              onCancel={() => setConfirming(null)}
            />
          ) : (
            <Actions
              exists={exists}
              isPending={isPending}
              onCreate={handleRenew}
              onAsk={setConfirming}
            />
          )}
          {error && (
            <small className="a5-link-note" data-warn="true" role="alert">
              {error}
            </small>
          )}
          <h3>Τι περιέχει</h3>
          <ul className="a5-link-list">
            {(isClient ? CLIENT_CONTENT : TEAM_CONTENT).map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
          <Instructions />
          <small className="a5-link-note">
            Μόνο ανάγνωση. Παύει να λειτουργεί αν απενεργοποιηθεί ο λογαριασμός
            σου.
          </small>
        </div>
      </details>
    </section>
  );
}
