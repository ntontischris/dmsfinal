import type { Language } from "./types";

// Κείμενα υπογραφής και φορμών του πελάτη (D5). Εξάγονται από το labels-public.ts.

export const LOAD_ERROR_LABEL = "Δεν φόρτωσε· δοκίμασε ξανά σε λίγο.";

export interface SignLabels {
  sign: string;
  requestChanges: string;
  reject: string;
  fullName: string;
  accept: string;
  continue: string;
  codeStepManual: (manager: string | null) => string;
  codeStepEmail: (maskedEmail: string) => string;
  code: string;
  confirm: string;
  cancel: string;
  signed: string;
  signedRecord: string;
  signedLocked: string;
  signedInvite: string;
  changesPrompt: string;
  send: string;
  changesSent: string;
  rejectReason: string;
  rejectConfirm: string;
  rejected: string;
  onlySignatory: (name: string) => string;
  print: string;
  wrongCode: (attemptsLeft: number) => string;
  locked: string;
  codeExpired: string;
  rateLimited: (seconds: number | null) => string;
  tooManyRequests: (seconds: number | null) => string;
  invalidName: string;
  codeInvalid: string;
  notAccepted: string;
  invalidMessage: string;
  notSignatory: string;
  error: string;
}

const SIGN_EL: SignLabels = {
  sign: "Υπογραφή",
  requestChanges: "Θέλω αλλαγές",
  reject: "Απόρριψη",
  fullName: "Ονοματεπώνυμο",
  accept: "Αποδέχομαι τους όρους",
  continue: "Συνέχεια",
  codeStepManual: (manager) =>
    `Θα σας δώσουμε τον εξαψήφιο κωδικό τηλεφωνικά, στον αριθμό που έχουμε για εσάς, ή θα σας τον πει ${manager ?? "κάποιος από την ομάδα μας"}.`,
  codeStepEmail: (email) => `Στείλαμε εξαψήφιο κωδικό στο ${email}.`,
  code: "Κωδικός 6 ψηφίων",
  confirm: "Επιβεβαίωση",
  cancel: "Άκυρο",
  signed:
    "Υπογράφηκε. Η υπογραφή σας καταγράφηκε και η ομάδα μας θα σας στείλει το αντίγραφο.",
  signedRecord: "Καταγράφηκαν η ώρα και η διεύθυνση σύνδεσης.",
  signedLocked: "Η πρόταση κλείδωσε και δεν αλλάζει πια.",
  signedInvite: "Θα επικοινωνήσουμε για την πρόσκληση στον λογαριασμό σας.",
  changesPrompt: "Τι θέλετε να αλλάξει;",
  send: "Αποστολή",
  changesSent: "Στάλθηκε στην ομάδα. Η πρόταση μένει ανοιχτή.",
  rejectReason: "Λόγος (προαιρετικά)",
  rejectConfirm: "Ναι, απορρίπτω την πρόταση",
  rejected: "Η πρόταση απορρίφθηκε.",
  onlySignatory: (name) =>
    `Υπογράφει μόνο ο/η ${name}. Μπορείτε να ζητήσετε αλλαγές.`,
  print: "Εκτύπωση / Αποθήκευση ως PDF",
  wrongCode: (n) => `Ο κωδικός δεν είναι σωστός. Απομένουν ${n} προσπάθειες.`,
  locked: "Έγιναν πολλές προσπάθειες. Ζητήστε νέο κωδικό σε λίγο.",
  codeExpired: "Ο κωδικός έληξε. Ζητήστε νέο.",
  rateLimited: (s) =>
    s === null
      ? "Περιμένετε λίγο για νέο κωδικό."
      : `Περιμένετε ${s} δευτερόλεπτα για νέο κωδικό.`,
  tooManyRequests: (s) =>
    s === null
      ? "Πολλά αιτήματα. Δοκιμάστε ξανά σε λίγο."
      : `Πολλά αιτήματα. Δοκιμάστε ξανά σε ${s} δευτερόλεπτα.`,
  invalidName: "Γράψτε το ονοματεπώνυμό σας.",
  codeInvalid: "Ο κωδικός έχει ακριβώς 6 ψηφία.",
  notAccepted: "Για να υπογράψετε, αποδεχτείτε τους όρους.",
  invalidMessage: "Γράψτε το μήνυμά σας (έως 2000 χαρακτήρες).",
  notSignatory: "Υπογράφει μόνο ο Υπογράφων αυτής της πρότασης.",
  error: "Κάτι πήγε στραβά. Δοκιμάστε ξανά.",
};

const SIGN_EN: SignLabels = {
  sign: "Sign",
  requestChanges: "Request changes",
  reject: "Decline",
  fullName: "Full name",
  accept: "I accept the terms",
  continue: "Continue",
  codeStepManual: (manager) =>
    `We will give you the six-digit code by phone, on the number we have for you, or ${manager ?? "someone from our team"} will tell you.`,
  codeStepEmail: (email) => `We sent a six-digit code to ${email}.`,
  code: "6-digit code",
  confirm: "Confirm",
  cancel: "Cancel",
  signed:
    "Signed. Your signature was recorded and our team will send you the copy.",
  signedRecord: "The time and connection address were recorded.",
  signedLocked: "The proposal is now locked.",
  signedInvite: "We will be in touch about your account invitation.",
  changesPrompt: "What would you like changed?",
  send: "Send",
  changesSent: "Sent to the team. The proposal stays open.",
  rejectReason: "Reason (optional)",
  rejectConfirm: "Yes, decline the proposal",
  rejected: "The proposal was declined.",
  onlySignatory: (name) => `Only ${name} can sign. You can request changes.`,
  print: "Print / Save as PDF",
  wrongCode: (n) => `The code is not correct. ${n} attempts left.`,
  locked: "Too many attempts. Please request a new code in a moment.",
  codeExpired: "The code has expired. Please request a new one.",
  rateLimited: (s) =>
    s === null
      ? "Please wait a moment for a new code."
      : `Please wait ${s} seconds for a new code.`,
  tooManyRequests: (s) =>
    s === null
      ? "Too many requests. Please try again shortly."
      : `Too many requests. Please try again in ${s} seconds.`,
  invalidName: "Please enter your full name.",
  codeInvalid: "The code is exactly 6 digits.",
  notAccepted: "To sign, please accept the terms.",
  invalidMessage: "Please write your message (up to 2000 characters).",
  notSignatory: "Only the signatory of this proposal can sign.",
  error: "Something went wrong. Please try again.",
};

export const SIGN_LABELS: Readonly<Record<Language, SignLabels>> = {
  el: SIGN_EL,
  en: SIGN_EN,
};
