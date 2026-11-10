"use client";

import { useState } from "react";

import { Badge } from "@/spaces/screens/shared";

import { respondToCrew } from "../actions-crew";
import type { E3Reply as Reply } from "./e3-model";
import { useRun } from "./e3-run";
import { responseTone } from "./e3-model";
import { LastDone } from "./e3-ui";

// Η απάντηση του μέλους μέσα στο E3 (όπως η σημερινή σελίδα· ίδια μορφή με την E6): «Επιβεβαιώνω» ή «Δεν μπορώ» με
// λόγο, στο πραγματικό filming_crew_respond. Το «δεν μπορώ» δεν αλλάζει το Γύρισμα.
export function E3Reply({
  filmingId,
  reply,
  myWord,
}: {
  filmingId: string;
  reply: Reply;
  myWord: string;
}) {
  const [reason, setReason] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const { run, isPending, result } = useRun();
  const respond = (response: "confirmed" | "declined", why = "") =>
    run(respondToCrew, { filmingId, response, reason: why }, () =>
      setIsAsking(false),
    );
  return (
    <div className="stack">
      <p>
        <Badge tone={reply.isAnswered ? responseTone(myWord) : "attention"}>
          {reply.isAnswered ? myWord : "Περιμένει απάντηση"}
        </Badge>{" "}
        {reply.version !== null && (
          <span className="muted">Έκδοση {reply.version}</span>
        )}
      </p>
      <div className="btn-row">
        {reply.canConfirm && (
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={() => respond("confirmed")}
            disabled={isPending}
          >
            Επιβεβαιώνω
          </button>
        )}
        {reply.canDecline && (
          <button
            type="button"
            className="button"
            data-danger="true"
            onClick={() => setIsAsking(true)}
          >
            Δεν μπορώ
          </button>
        )}
      </div>
      <LastDone log={result ? [result.text] : []} tone={result?.tone ?? "ok"} />
      {isAsking && (
        <div className="stack">
          <label className="stack">
            Λόγος (υποχρεωτικός)
            <textarea
              className="input"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-danger="true"
              disabled={!reason.trim() || isPending}
              onClick={() => respond("declined", reason.trim())}
            >
              Στέλνω «δεν μπορώ»
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setIsAsking(false)}
            >
              Άκυρο
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
