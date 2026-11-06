"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";

import {
  renewCalendarLink,
  revokeCalendarLink,
  type LinkState,
} from "../actions-link";

// «Στο κινητό σου» από το prototype (`screens/a5-link.tsx`), με τον πραγματικό σύνδεσμο: το token φαίνεται μία φορά,
// μετά τη δημιουργία ή την ανανέωση, και μόνο στη μνήμη της σελίδας (μένει το hash στη βάση).

interface CalendarLinkCardProps {
  exists: boolean;
  createdLabel: string | null;
  isClient: boolean;
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
    <details>
      <summary>Πώς το βάζω στο κινητό</summary>
      <h4>iPhone</h4>
      <ol className="a3-steps">
        <li>Ρυθμίσεις › Ημερολόγιο › Λογαριασμοί › Προσθήκη λογαριασμού</li>
        <li>Άλλο › «Προσθήκη ημερολογίου συνδρομής»</li>
        <li>Επικόλλησε τον σύνδεσμο.</li>
      </ol>
      <h4>Google</h4>
      <ol className="a3-steps">
        <li>
          Στον υπολογιστή: calendar.google.com › «Άλλα ημερολόγια» › «+» › «Από
          URL» › επικόλλησε τον σύνδεσμο.
        </li>
        <li>
          Στο Android, στην εφαρμογή: Ρυθμίσεις › το ημερολόγιο ›
          «Συγχρονισμός».
        </li>
      </ol>
      <p className="note">
        Το Google ενημερώνεται κάθε λίγες ώρες, όχι αμέσως.
      </p>
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
      <div className="a5-url">
        <code>{url}</code>
        <button type="button" className="button" onClick={handleCopy}>
          {isCopied ? "Αντιγράφηκε" : "Αντιγραφή"}
        </button>
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
    <div className="stack" role="alert">
      <p className="note">
        {isRenew
          ? "Ο παλιός σύνδεσμος σταματά αμέσως. Θα χρειαστεί να τον ξαναπροσθέσεις στο κινητό."
          : "Ο σύνδεσμος σταματά αμέσως."}
      </p>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-danger="true"
          disabled={isPending}
          onClick={onConfirm}
        >
          {isRenew ? "Ανανέωση τώρα" : "Κατάργηση τώρα"}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Άκυρο
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
      <button
        type="button"
        className="button"
        data-primary="true"
        disabled={isPending}
        onClick={onCreate}
      >
        {isPending ? "Δημιουργία…" : "Δημιουργία συνδέσμου"}
      </button>
    );
  return (
    <div className="btn-row">
      <button
        type="button"
        className="button"
        disabled={isPending}
        onClick={() => onAsk("renew")}
      >
        Ανανέωση συνδέσμου
      </button>
      <button
        type="button"
        className="button"
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
    <Panel label="Στο κινητό σου">
      <p className="muted">Σύνδεσμος ημερολογίου (μόνο για εσένα)</p>
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
        <p className="a6-error" role="alert">
          {error}
        </p>
      )}
      <h3>Τι περιέχει</h3>
      <RowList>
        {(isClient ? CLIENT_CONTENT : TEAM_CONTENT).map((text) => (
          <ListRow
            key={text}
            title={<span className="a5-plain">{text}</span>}
          />
        ))}
      </RowList>
      <Instructions />
      <p className="note">
        Μόνο ανάγνωση. Παύει να λειτουργεί αν απενεργοποιηθεί ο λογαριασμός σου.
      </p>
    </Panel>
  );
}
