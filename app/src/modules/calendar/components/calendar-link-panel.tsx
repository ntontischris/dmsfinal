"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

import {
  renewCalendarLink,
  revokeCalendarLink,
  type LinkState,
} from "../actions-link";

// Ο σύνδεσμος ημερολογίου: το token φαίνεται μία φορά, μετά τη δημιουργία ή την ανανέωση, και μόνο στη μνήμη της σελίδας.
// Δεν μπαίνει στο URL ούτε σε logs· όταν φύγει η σελίδα, χάνεται (μένει το hash στη βάση).

interface LinkPanelProps {
  exists: boolean;
  createdLabel: string | null;
}

type Confirming = "renew" | "revoke" | null;

const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

function LinkAddress({ url }: { url: string }) {
  const [isCopied, setIsCopied] = useState(false);
  return (
    <div className="grid gap-2">
      <code className="block overflow-x-auto rounded-sm border bg-muted px-2 py-1.5 text-xs">
        {url}
      </code>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={async () => setIsCopied(await copyText(url))}
        >
          {isCopied ? "Αντιγράφηκε" : "Αντιγραφή"}
        </Button>
      </div>
      <p className="m-0 text-sm text-muted-foreground">
        Ο σύνδεσμος φαίνεται μόνο τώρα. Αν τον χάσεις, ανανέωσέ τον.
      </p>
      <details className="text-sm text-muted-foreground">
        <summary>Προσθήκη ημερολογίου από URL</summary>
        <p className="m-0 pt-2">
          Google Calendar: Άλλα ημερολόγια › Από URL, και επικόλλησε τον
          σύνδεσμο. iPhone: Ρυθμίσεις › Ημερολόγιο › Λογαριασμοί › Προσθήκη
          συνδρομητικού ημερολογίου.
        </p>
      </details>
    </div>
  );
}

function ConfirmStep({
  confirming,
  onConfirm,
  onCancel,
  isPending,
}: {
  confirming: Exclude<Confirming, null>;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const isRenew = confirming === "renew";
  return (
    <div className="grid gap-2" role="alert">
      <p className="m-0 text-sm">
        {isRenew
          ? "Ο παλιός σύνδεσμος σταματά αμέσως. Θα χρειαστεί να τον ξαναπροσθέσεις στο κινητό."
          : "Ο σύνδεσμος σταματά αμέσως."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="danger"
          onClick={onConfirm}
          disabled={isPending}
        >
          {isRenew ? "Ανανέωση τώρα" : "Κατάργηση τώρα"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Άκυρο
        </Button>
      </div>
    </div>
  );
}

export function CalendarLinkPanel({ exists, createdLabel }: LinkPanelProps) {
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
    <Panel label="Σύνδεσμος ημερολογίου">
      <div className="grid gap-3 text-sm">
        <p className="m-0 text-muted-foreground">
          Ένα αρχείο .ics μόνο για ανάγνωση, για το κινητό ή για το Google
          Calendar.
        </p>
        {url ? (
          <LinkAddress url={url} />
        ) : (
          <p className="m-0">
            {exists
              ? `Δημιουργήθηκε στις ${createdLabel ?? "—"}.`
              : "Δεν έχεις σύνδεσμο ακόμα."}
          </p>
        )}
        {confirming ? (
          <ConfirmStep
            confirming={confirming}
            isPending={isPending}
            onConfirm={confirming === "renew" ? handleRenew : handleRevoke}
            onCancel={() => setConfirming(null)}
          />
        ) : (
          <LinkActions
            exists={exists}
            isPending={isPending}
            onCreate={handleRenew}
            onAsk={setConfirming}
          />
        )}
        {error && (
          <p role="alert" className="m-0 text-destructive">
            {error}
          </p>
        )}
      </div>
    </Panel>
  );
}

function LinkActions({
  exists,
  isPending,
  onCreate,
  onAsk,
}: {
  exists: boolean;
  isPending: boolean;
  onCreate: () => void;
  onAsk: (confirming: Exclude<Confirming, null>) => void;
}) {
  if (!exists) {
    return (
      <div>
        <Button
          type="button"
          variant="primary"
          onClick={onCreate}
          disabled={isPending}
        >
          {isPending ? "Δημιουργία…" : "Δημιουργία συνδέσμου"}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="default"
        onClick={() => onAsk("renew")}
        disabled={isPending}
      >
        Ανανέωση συνδέσμου
      </Button>
      <Button
        type="button"
        variant="danger"
        onClick={() => onAsk("revoke")}
        disabled={isPending}
      >
        Κατάργηση συνδέσμου
      </Button>
    </div>
  );
}
