"use client";

import { useState } from "react";

interface AccessRequestProps {
  ownerName: string | null;
}

// Μικρή φόρμα αιτήματος πρόσβασης, μόνο στη μνήμη (prototype).
export function AccessRequest({ ownerName }: AccessRequestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [topic, setTopic] = useState("");
  const [comment, setComment] = useState("");

  if (isSent) {
    return (
      <p className="note" role="status">
        Στάλθηκε· θα ενημερωθείς.
      </p>
    );
  }
  if (!isOpen) {
    return (
      <button
        type="button"
        className="button"
        data-primary="true"
        onClick={() => setIsOpen(true)}
      >
        Αίτημα πρόσβασης
      </button>
    );
  }
  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        setIsSent(true);
      }}
    >
      <input
        className="input"
        placeholder="Τι αφορά η Ευκαιρία;"
        aria-label="Τι αφορά η Ευκαιρία"
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
      />
      <textarea
        className="input"
        rows={2}
        placeholder="Σχόλιο προς τη Διαχείριση"
        aria-label="Σχόλιο"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      <div className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary="true"
          disabled={topic.trim() === ""}
        >
          Αποστολή αιτήματος
        </button>
        <button type="button" className="button" onClick={() => setIsOpen(false)}>
          Άκυρο
        </button>
      </div>
      {ownerName && (
        <span className="muted">
          Ο/Η {ownerName} ενημερώνεται μόνο μετά την απόφαση της Διαχείρισης.
        </span>
      )}
    </form>
  );
}
