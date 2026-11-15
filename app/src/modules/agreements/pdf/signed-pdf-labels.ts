import { formatDate } from "../helpers";
import type { Language } from "../types";

// Τα κείμενα που έχει μόνο το PDF της υπογεγραμμένης Συμφωνίας· όλα τα άλλα έρχονται από το documentOf (D5).

export interface SignedPdfLabels {
  docTitle: string;
  signatureTitle: string;
  signedBy: (name: string, signedOn: string) => string;
  page: (current: number, total: number) => string;
}

const LABELS: Readonly<Record<Language, SignedPdfLabels>> = {
  el: {
    docTitle: "Υπογεγραμμένη Συμφωνία",
    signatureTitle: "Υπογραφή",
    signedBy: (name, signedOn) =>
      `Υπογράφηκε από ${name} στις ${formatDate(signedOn)}.`,
    page: (current, total) => `Σελίδα ${current} από ${total}`,
  },
  en: {
    docTitle: "Signed Agreement",
    signatureTitle: "Signature",
    signedBy: (name, signedOn) =>
      `Signed by ${name} on ${formatDate(signedOn)}.`,
    page: (current, total) => `Page ${current} of ${total}`,
  },
};

export const signedPdfLabels = (language: Language): SignedPdfLabels =>
  LABELS[language];

// Όνομα αρχείου μόνο με λατινικούς χαρακτήρες: κάθε browser το σώζει ίδιο.
export const signedPdfFileName = (agreementId: string): string =>
  `agreement-${agreementId.slice(0, 8)}-signed.pdf`;

// Κεφαλαία χωρίς τόνους, όπως γράφονται στα ελληνικά (το toUpperCase κρατά το «Ά»).
const TONOS = String.fromCharCode(0x0301);

export const capsOf = (text: string): string =>
  text.normalize("NFD").split(TONOS).join("").toUpperCase().normalize("NFC");
