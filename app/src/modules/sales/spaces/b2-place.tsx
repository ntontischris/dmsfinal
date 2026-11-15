"use client";

import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

import { updateClientPlace } from "../actions-client-care";
import type { ClientDetail } from "../types";

interface ClientPlaceProps {
  client: ClientDetail;
  canEdit: boolean;
}

// Αναζήτηση στον χάρτη: ένα κλικ από τη Διεύθυνση στις οδηγίες για το γύρισμα.
const mapHref = (place: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

function PlaceLine({ label, value }: { label: string; value: string }) {
  if (value === "") return null;
  return (
    <span style={{ display: "block" }}>
      {label}:{" "}
      <a href={mapHref(value)} target="_blank" rel="noreferrer">
        {value}
      </a>
    </span>
  );
}

// Διεύθυνση και Χώρος γυρίσματος του Πελάτη (b7), με αλλαγή επί τόπου όπως το Κύριο πρόσωπο.
export function ClientPlace({ client, canEdit }: ClientPlaceProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(updateClientPlace);
  const [handled, setHandled] = useState(state);

  // Επιτυχία από τη βάση: η φόρμα κλείνει (ενημέρωση κατά το render, όχι effect).
  if (state !== handled) {
    setHandled(state);
    if (state.notice) setIsEditing(false);
  }

  if (isEditing)
    return (
      <form ref={formRef} className="stack" onSubmit={onSubmit}>
        <input type="hidden" name="clientId" value={client.id} />
        <label className="field">
          <span>Διεύθυνση</span>
          <input
            className="input"
            name="address"
            maxLength={300}
            defaultValue={client.address}
          />
        </label>
        <label className="field">
          <span>Χώρος γυρίσματος (αν διαφέρει)</span>
          <input
            className="input"
            name="filmingLocation"
            maxLength={300}
            defaultValue={client.filmingLocation}
          />
        </label>
        {state.error && (
          <p className="note" role="alert">
            {state.error}
          </p>
        )}
        <span className="btn-row">
          <button
            type="submit"
            className="button"
            data-primary="true"
            disabled={isPending}
          >
            Αποθήκευση
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setIsEditing(false)}
          >
            Άκυρο
          </button>
        </span>
      </form>
    );

  const isEmpty = client.address === "" && client.filmingLocation === "";
  return (
    <>
      {isEmpty && "—"}
      <PlaceLine label="Έδρα" value={client.address} />
      <PlaceLine label="Γύρισμα" value={client.filmingLocation} />
      {canEdit && (
        <button
          type="button"
          className="button"
          onClick={() => setIsEditing(true)}
        >
          {isEmpty ? "Πρόσθεσε διεύθυνση" : "Αλλαγή διεύθυνσης"}
        </button>
      )}
    </>
  );
}
