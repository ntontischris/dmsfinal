"use client";

import { useState } from "react";

import type { ClientVersionView } from "@/screens/h3-model";
import { fmtDate } from "@/screens/shared";

interface PlayerProps {
  version: ClientVersionView;
  canReportBroken: boolean;
  hasReported: boolean;
  onReportBroken: () => void;
}

// Placeholder πλαίσιο: το σύστημα δεν κρατά αρχεία, δείχνει μόνο το link.
export function H4Player({
  version,
  canReportBroken,
  hasReported,
  onReportBroken,
}: PlayerProps) {
  const [isOpened, setIsOpened] = useState(false);
  return (
    <section className="card">
      <div className="card-title">
        <h2>Έκδοση v{version.number}</h2>
        <span className="muted">{version.host}</span>
      </div>
      <div className="h34-player">
        <span className="muted">Player (prototype)</span>
        <span className="h34-link">{version.link}</span>
        <div className="btn-row">
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={() => setIsOpened(true)}
          >
            Άνοιγμα
          </button>
          {canReportBroken && (
            <button
              type="button"
              className="button"
              disabled={hasReported}
              onClick={onReportBroken}
            >
              Το link δεν ανοίγει
            </button>
          )}
        </div>
        {isOpened && (
          <span className="muted">
            (prototype: εδώ θα άνοιγε το link σε νέα καρτέλα)
          </span>
        )}
        {hasReported && (
          <p className="h34-memo">
            Ενημερώσαμε την ομάδα. Θα σου στείλει διορθωμένο link.
          </p>
        )}
        {version.linkFixedAt && (
          <span className="muted">
            Το link διορθώθηκε από την ομάδα στις{" "}
            {fmtDate(version.linkFixedAt)}.
          </span>
        )}
      </div>
    </section>
  );
}
