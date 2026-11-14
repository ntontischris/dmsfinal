"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { requestClientSigningCode, signAsClient } from "../actions-client-sign";
import { SIGN_LABELS } from "../labels-public";
import type { Language } from "../types";
import { D5SignFlow } from "./d5-sign";

// «Υπογραφή» μέσα στην εφαρμογή (D2, Χρήστης πελάτη): η ίδια ροή με τον Σύνδεσμο (όνομα + «Αποδέχομαι» → κωδικός
// 6 ψηφίων), χωρίς token. Μετά την υπογραφή, ή αν η πρόταση έκλεισε στο μεταξύ, η σελίδα ξαναδιαβάζεται από τη βάση.
export function ClientSignAction({
  agreementId,
  language,
}: {
  agreementId: string;
  language: Language;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const t = SIGN_LABELS[language];
  if (!isOpen)
    return (
      <button
        type="button"
        className="button"
        data-primary="true"
        onClick={() => setIsOpen(true)}
      >
        {t.sign}
      </button>
    );
  return (
    <D5SignFlow
      requestCode={(name, accepted) =>
        requestClientSigningCode({ agreementId, name, accepted })
      }
      sign={(code) => signAsClient({ agreementId, code })}
      language={language}
      managerName={null}
      maskedEmail=""
      codeChannel="manual"
      onDead={() => router.refresh()}
      onCancel={() => setIsOpen(false)}
      onSigned={() => router.refresh()}
    />
  );
}
