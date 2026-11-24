"use client";

import { useState } from "react";

import { Badge, type BadgeTone } from "@/spaces/screens/shared";

import { saveFilmingDetails } from "../actions-details";
import { formatDateTime } from "../helpers-time";
import type {
  FilmingCard,
  FilmingGoogleState,
  FilmingTeamInfo,
} from "../types";
import { useRun } from "./e3-run";
import { LastDone } from "./e3-ui";
import { Box } from "./ml-parts";

// Στοιχεία χώρου (c9): ποιον βρίσκει το Συνεργείο στον χώρο, τηλέφωνο, πού ανεβαίνουν τα αρχεία, και αν το Γύρισμα
// γράφτηκε στο Google Calendar. Μόνο για την ομάδα (ο Πελάτης δεν παίρνει «team»).

const GOOGLE_LOOK: Readonly<
  Record<FilmingGoogleState, { label: string; tone?: BadgeTone }>
> = {
  off: { label: "Google: δεν έχει συνδεθεί", tone: "faded" },
  none: { label: "Google: δεν γράφεται", tone: "faded" },
  queued: { label: "Google: γράφεται τώρα", tone: "waiting" },
  error: { label: "Google: απέτυχε", tone: "attention" },
  synced: { label: "Google: γραμμένο", tone: "ok" },
};

function GoogleLine({ google }: { google: FilmingTeamInfo["google"] }) {
  const look = GOOGLE_LOOK[google.state];
  return (
    <div className="fl-box-body">
      <span>
        <Badge tone={look.tone}>{look.label}</Badge>
        {google.state === "synced" && google.at && (
          <span className="muted"> · {formatDateTime(google.at)}</span>
        )}
      </span>
      {google.state === "error" && (
        <p className="muted">
          Θα ξαναδοκιμάσει μόνο του. Αν συνεχίσει, δες τη σύνδεση στις Ρυθμίσεις
          → Google. {google.error ? `Μήνυμα: ${google.error}` : ""}
        </p>
      )}
    </div>
  );
}

function DetailsView({ details }: { details: FilmingTeamInfo["details"] }) {
  const isEmpty =
    !details.contactName && !details.contactPhone && !details.filesUrl;
  if (isEmpty) return <p className="muted">Δεν έχουν μπει στοιχεία χώρου.</p>;
  return (
    <dl className="ml-kv">
      {details.contactName && (
        <div>
          <dt>Επαφή στον χώρο</dt>
          <dd>{details.contactName}</dd>
        </div>
      )}
      {details.contactPhone && (
        <div>
          <dt>Τηλέφωνο</dt>
          <dd>
            <a href={`tel:${details.contactPhone.replace(/\s/g, "")}`}>
              {details.contactPhone}
            </a>
          </dd>
        </div>
      )}
      {details.filesUrl && (
        <div>
          <dt>Αρχεία</dt>
          <dd>
            <a href={details.filesUrl} target="_blank" rel="noreferrer">
              άνοιγμα φακέλου
            </a>
          </dd>
        </div>
      )}
    </dl>
  );
}

function DetailsForm({
  card,
  team,
  onClose,
}: {
  card: FilmingCard;
  team: FilmingTeamInfo;
  onClose: () => void;
}) {
  const [name, setName] = useState(team.details.contactName ?? "");
  const [phone, setPhone] = useState(team.details.contactPhone ?? "");
  const [url, setUrl] = useState(team.details.filesUrl ?? "");
  const { run, isPending, result } = useRun();
  const fields = {
    filmingId: card.id,
    contactName: name,
    contactPhone: phone,
    filesUrl: url,
  };
  return (
    <div className="ml-fields e3-form">
      <LastDone log={result ? [result.text] : []} tone={result?.tone ?? "ok"} />
      <label className="ml-field">
        <span>Επαφή στον χώρο</span>
        <input
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="ml-field">
        <span>Τηλέφωνο επαφής</span>
        <input
          type="tel"
          value={phone}
          maxLength={40}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <label className="ml-field">
        <span>Σύνδεσμος αρχείων (https://…)</span>
        <input
          type="url"
          value={url}
          maxLength={1000}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <div className="ml-actions">
        <button
          type="button"
          data-primary="true"
          disabled={isPending}
          onClick={() => run(saveFilmingDetails, fields, onClose)}
        >
          Αποθήκευση στοιχείων
        </button>
        <button type="button" onClick={onClose}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}

export function E3Details({ card }: { card: FilmingCard }) {
  const [isEditing, setIsEditing] = useState(false);
  const team = card.team;
  if (!team) return null;
  return (
    <Box title="Στοιχεία χώρου" hint="Επαφή, τηλέφωνο, αρχεία, Google">
      <GoogleLine google={team.google} />
      {isEditing ? (
        <DetailsForm
          card={card}
          team={team}
          onClose={() => setIsEditing(false)}
        />
      ) : (
        <>
          <DetailsView details={team.details} />
          {team.canEditDetails && (
            <div className="ml-quick fl-row">
              <button type="button" onClick={() => setIsEditing(true)}>
                Αλλαγή στοιχείων χώρου
              </button>
            </div>
          )}
        </>
      )}
    </Box>
  );
}
