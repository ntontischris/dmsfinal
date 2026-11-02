"use client";

import { useState } from "react";

import type { PersonKind } from "../schemas";
import { AnonymizeConfirm } from "./gdpr-anonymize";

interface AnonymizeInlineProps {
  subjectKind: PersonKind;
  subjectId: string;
  name: string;
}

// Ν8 στη B2: πρώτα το κουμπί, μετά η επιβεβαίωση με το όνομα στη θέση του (δύο βήματα, όπως η κλασική).
export function AnonymizeInline({
  subjectKind,
  subjectId,
  name,
}: AnonymizeInlineProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  if (!isConfirming)
    return (
      <button
        type="button"
        className="button"
        data-danger
        onClick={() => setIsConfirming(true)}
      >
        Ανωνυμοποίηση
      </button>
    );
  return (
    <AnonymizeConfirm
      subjectKind={subjectKind}
      subjectId={subjectId}
      name={name}
      onCancel={() => setIsConfirming(false)}
    />
  );
}
