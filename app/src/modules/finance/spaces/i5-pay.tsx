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
      <span className="ml-quick">
        <button type="button" onClick={handleClick}>
          Αντιγραφή
        </button>
      </span>
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
