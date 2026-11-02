"use client";

import { useState } from "react";

// Αντιγραφή στο πρόχειρο, με μήνυμα δίπλα στο κουμπί (prototype `screens/i5-pay.tsx`).
export function CopyButton({ value, what }: { value: string; what: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`Αντιγράφηκε ${what}.`);
    } catch {
      setMessage(
        `Δεν έγινε αντιγραφή· επίλεξε ${what} και αντίγραψε με το χέρι.`,
      );
    }
  };
  return (
    <>
      <button type="button" className="button" onClick={handleClick}>
        Αντιγραφή
      </button>
      <span
        className="feedback-msg"
        data-tone="ok"
        data-shown={message !== null}
        role="status"
        aria-live="polite"
      >
        {message}
      </span>
    </>
  );
}
