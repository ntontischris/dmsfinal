"use client";

import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";
import { Panel } from "@/spaces/kit/panel";

import { reportBrokenLink } from "../actions-client";
import type { ClientVersion } from "../client-types";
import { embedUrlOf } from "./h4-embed";

interface PlayerProps {
  deliverableId: string;
  version: ClientVersion;
  canReportBroken: boolean;
}

interface ScreenProps {
  embed: string;
  title: string;
  onPlay: () => void;
}

// Ο player φορτώνει μόλις πατήσεις «Παίξε»: λιγότερα δεδομένα στο κινητό.
function Screen({ embed, title, onPlay }: ScreenProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  if (isPlaying)
    return (
      <div className="h34-screen">
        <iframe
          src={embed}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  return (
    <button
      type="button"
      className="h34-screen h34-poster"
      onClick={() => {
        setIsPlaying(true);
        onPlay();
      }}
      aria-label={`Παίξε το βίντεο: ${title}`}
    >
      <span className="h34-play" aria-hidden="true">
        ▶
      </span>
      <span>Παίξε το βίντεο</span>
    </button>
  );
}

// «Δεν παίζει το βίντεο;» = η πραγματική αναφορά «Το link δεν ανοίγει» (μία φορά ανά Έκδοση).
function ReportButton({
  deliverableId,
  versionNumber,
  isReported,
}: {
  deliverableId: string;
  versionNumber: number;
  isReported: boolean;
}) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(reportBrokenLink);
  return (
    <form ref={formRef} style={{ display: "contents" }} onSubmit={onSubmit}>
      <input type="hidden" name="deliverableId" value={deliverableId} />
      <input type="hidden" name="versionNumber" value={versionNumber} />
      <button
        type="submit"
        className="button"
        disabled={isReported || isPending}
      >
        Δεν παίζει το βίντεο;
      </button>
      {state.error && (
        <span className="h34-error" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

// Το βίντεο παίζει μέσα στην εφαρμογή· το σύστημα δεν κρατά αρχεία, μόνο τον σύνδεσμο.
// Αν ο player δεν φαίνεται (π.χ. στο κινητό), το «Δες το βίντεο» είναι το εμφανές κουμπί από κάτω.
export function H4Player({
  deliverableId,
  version,
  canReportBroken,
}: PlayerProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const embed = embedUrlOf(version.url);
  const title = `Έκδοση v${version.number}`;
  return (
    <Panel label={title}>
      <div className="h34-player">
        {embed && (
          <Screen
            key={version.number}
            embed={embed}
            title={title}
            onPlay={() => setHasStarted(true)}
          />
        )}
        {embed && hasStarted && (
          <p className="muted">
            Δεν βλέπεις το βίντεο εδώ; Πάτα «Δες το βίντεο σε νέα καρτέλα».
          </p>
        )}
        <div className="btn-row">
          <a
            className="button"
            data-primary={!embed || hasStarted ? "true" : undefined}
            href={version.url}
            target="_blank"
            rel="noreferrer"
          >
            Δες το βίντεο σε νέα καρτέλα <span aria-hidden="true">↗</span>
          </a>
          {canReportBroken && (
            <ReportButton
              deliverableId={deliverableId}
              versionNumber={version.number}
              isReported={version.linkBroken}
            />
          )}
        </div>
        {version.linkBroken && (
          <p className="h34-memo" role="status">
            Ενημερώσαμε την ομάδα. Θα σου στείλει διορθωμένο link.
          </p>
        )}
      </div>
    </Panel>
  );
}
