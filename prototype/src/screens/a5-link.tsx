"use client";

import { useState } from "react";

import {
  CALENDAR_LINK_OF,
  calendarLinkUrl,
  type CalendarLink,
} from "@/data/calendar";
import { CALENDAR_TODAY } from "@/data/calendar-access";
import { fmtDate } from "@/screens/shared";

interface CalendarLinkCardProps {
  // Το κλειδί του Χρήστη στο CALENDAR_LINK_OF: id μέλους ή «client-maria».
  ownerKey: string;
  isClient: boolean;
}

const TEAM_CONTENT = [
  "Τα Γυρίσματα όπου είσαι στο Συνεργείο",
  "Ο Κλεισμένος χρόνος σου",
  "Οι προθεσμίες όσων σου έχουν ανατεθεί",
];

const CLIENT_CONTENT = [
  "Μόνο τα Γυρίσματα του Πελάτη σου",
  "Χωρίς προθεσμίες και εσωτερικές σημειώσεις",
];

const newToken = (): string => Math.random().toString(36).slice(2, 10);

function Instructions() {
  return (
    <details>
      <summary>Πώς το προσθέτω</summary>
      <p className="note">
        <strong>Google Calendar:</strong> Άλλα ημερολόγια › Από URL, και
        επικόλλησε τον σύνδεσμο.
      </p>
      <p className="note">
        <strong>iPhone:</strong> Ρυθμίσεις › Ημερολόγιο › Λογαριασμοί › Προσθήκη
        συνδρομητικού ημερολογίου.
      </p>
    </details>
  );
}

interface RenewProps {
  isConfirming: boolean;
  onAsk: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function Renew({ isConfirming, onAsk, onConfirm, onCancel }: RenewProps) {
  if (!isConfirming) {
    return (
      <button type="button" className="button" onClick={onAsk}>
        Ανανέωση συνδέσμου
      </button>
    );
  }
  return (
    <div className="stack" role="alert">
      <p className="note">
        Ο παλιός σύνδεσμος σταματά αμέσως. Θα χρειαστεί να τον ξαναπροσθέσεις
        στο κινητό.
      </p>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-danger="true"
          onClick={onConfirm}
        >
          Ανανέωση τώρα
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}

export function CalendarLinkCard({
  ownerKey,
  isClient,
}: CalendarLinkCardProps) {
  const [link, setLink] = useState<CalendarLink>(CALENDAR_LINK_OF[ownerKey]);
  const [isCopied, setIsCopied] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const url = calendarLinkUrl(link.token);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  };
  const handleRenew = () => {
    setLink({ token: newToken(), renewedAt: CALENDAR_TODAY });
    setIsConfirming(false);
    setIsCopied(false);
  };

  return (
    <section className="card a5-link">
      <div className="card-title">
        <h2>Στο κινητό σου</h2>
      </div>
      <p className="muted">Σύνδεσμος ημερολογίου (μόνο για εσένα)</p>
      <div className="a5-url">
        <code>{url}</code>
        <button type="button" className="button" onClick={handleCopy}>
          {isCopied ? "Αντιγράφηκε" : "Αντιγραφή"}
        </button>
      </div>
      <p className="muted">Τελευταία ανανέωση: {fmtDate(link.renewedAt)}</p>
      <Renew
        isConfirming={isConfirming}
        onAsk={() => setIsConfirming(true)}
        onConfirm={handleRenew}
        onCancel={() => setIsConfirming(false)}
      />
      <h3>Τι περιέχει</h3>
      <ul className="list">
        {(isClient ? CLIENT_CONTENT : TEAM_CONTENT).map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <Instructions />
      <p className="note">
        Μόνο ανάγνωση. Παύει να λειτουργεί αν απενεργοποιηθεί ο λογαριασμός σου.
        Η ίδια κάρτα υπάρχει στο Προφίλ (A3).
      </p>
    </section>
  );
}
