// Κείμενα του εγγράφου πρότασης στις δύο γλώσσες του Πελάτη. Οι περιγραφές γραμμών μένουν όπως είναι στα δεδομένα.

import type {
  MilestoneTrigger,
  Renewal,
  UnusedProvisions,
} from "@/data/agreements";

export type DocLanguage = "el" | "en";
export type DeadLinkKind =
  "expired" | "revoked" | "superseded" | "signed" | "closed";

export interface DocLabels {
  company: string;
  proposalFor: string;
  revision: (n: number) => string;
  validUntil: string;
  linesTitle: string;
  description: string;
  provisions: string;
  quantity: string;
  amount: string;
  perMonth: string;
  priceTitle: string;
  monthlyPrice: string;
  discount: (percent: number, months: number) => string;
  discountedPrice: string;
  start: string;
  onSignature: string;
  duration: (months: number) => string;
  endAfter: (months: number) => string;
  proRata: string;
  end: string;
  total: string;
  instalments: string;
  trigger: (trigger: MilestoneTrigger, date?: string) => string;
  plusVat: string;
  vat: (percent: number) => string;
  totalWithVat: string;
  termsTitle: string;
  payment: (days: number) => string;
  grace: (days: number) => string;
  unused: Record<UnusedProvisions, string>;
  renewal: Record<Renewal, string>;
  filmingTitle: string;
  notice: (days: number) => string;
  cancel: (hours: number) => string;
  lateCancel: (burns: boolean) => string;
  noShow: (burns: boolean) => string;
  revisionLimit: (rounds: number, kind: string) => string;
  dissolution: (days: number, fee: string | null) => string;
  pdf: string;
}

export const DOC_LABELS: Readonly<Record<DocLanguage, DocLabels>> = {
  el: {
    company: "Στούντιο Παραγωγής",
    proposalFor: "Πρόταση προς",
    revision: (n) => `Αναθεώρηση ${n}`,
    validUntil: "Ισχύει ως",
    linesTitle: "Τι περιλαμβάνει",
    description: "Περιγραφή",
    provisions: "Παροχές",
    quantity: "Ποσότητα",
    amount: "Ποσό",
    perMonth: " / μήνα",
    priceTitle: "Τιμή",
    monthlyPrice: "Τιμή ανά μήνα",
    discount: (p, m) => `−${p}% τους ${m} πρώτους μήνες`,
    discountedPrice: "Τιμή τους πρώτους μήνες",
    start: "Έναρξη",
    onSignature: "με την υπογραφή",
    duration: (m) => `Διάρκεια ${m} μήνες`,
    endAfter: (m) => `${m} μήνες μετά`,
    proRata:
      "Η χρέωση γίνεται ανά ημερολογιακό μήνα. Αν η έναρξη δεν είναι 1η του μήνα, ο πρώτος και ο τελευταίος μήνας χρεώνονται αναλογικά με τις μέρες· ο πρώτος δίνει ολόκληρες τις Παροχές του μήνα.",
    end: "Λήξη",
    total: "Σύνολο",
    instalments: "Πληρωμή σε δόσεις",
    trigger: (t, date) =>
      ({
        υπογραφή: "με την υπογραφή",
        ημερομηνία: `στις ${date ?? "—"}`,
        "Γύρισμα έγινε": "όταν γίνει το Γύρισμα",
        "Παραγωγή παραδόθηκε": "με την παράδοση",
      })[t],
    plusVat: "πλέον ΦΠΑ",
    vat: (p) => `ΦΠΑ ${p}%`,
    totalWithVat: "Σύνολο με ΦΠΑ",
    termsTitle: "Όροι",
    payment: (d) => `Πληρωμή μέσα σε ${d} μέρες από το τιμολόγιο.`,
    grace: (d) =>
      `Η δουλειά κάθε μήνα μπορεί να παραδοθεί ως ${d} μέρες μετά το τέλος του (Περίοδος χάριτος).`,
    unused: {
      χάνονται: "Ό,τι δεν χρησιμοποιηθεί μέσα στον μήνα χάνεται.",
      "επόμενη Περίοδο":
        "Ό,τι δεν χρησιμοποιηθεί περνά στον επόμενο μήνα, μόνο σε αυτόν.",
      μαζεύονται:
        "Ό,τι δεν χρησιμοποιηθεί μένει διαθέσιμο ως τη λήξη της συμφωνίας.",
    },
    renewal: {
      "νέα Ευκαιρία":
        "Στη λήξη δεν ανανεώνεται αυτόματα· θα σας στείλουμε νέα πρόταση.",
      "αυτόματη συνέχιση":
        "Στη λήξη συνεχίζει αυτόματα με τους ίδιους όρους, εκτός αν μας ειδοποιήσετε.",
    },
    filmingTitle: "Πολιτική Γυρισμάτων",
    notice: (d) => `Κλείνετε Γύρισμα τουλάχιστον ${d} μέρες πριν.`,
    cancel: (h) => `Ακύρωση χωρίς χρέωση ως ${h} ώρες πριν.`,
    lateCancel: (burns) =>
      burns
        ? "Πιο αργή ακύρωση μετρά ως Γύρισμα που έγινε."
        : "Πιο αργή ακύρωση δεν χρεώνεται Γύρισμα.",
    noShow: (burns) =>
      burns
        ? "Αν το Γύρισμα δεν γίνει εξαιτίας σας, μετρά ως Γύρισμα που έγινε."
        : "Αν το Γύρισμα δεν γίνει εξαιτίας σας, δεν χρεώνεται.",
    revisionLimit: (r, kind) => `${r} γύροι αλλαγών ανά ${kind}.`,
    dissolution: (d, fee) =>
      `${d > 0 ? `Λύση με ειδοποίηση ${d} ημερών` : "Λύση χωρίς ειδοποίηση"}, ${fee ? `με χρέωση ${fee}` : "χωρίς χρέωση λύσης"}.`,
    pdf: "Κατέβασμα PDF",
  },
  en: {
    company: "Production Studio",
    proposalFor: "Proposal for",
    revision: (n) => `Revision ${n}`,
    validUntil: "Valid until",
    linesTitle: "What is included",
    description: "Description",
    provisions: "Deliverables",
    quantity: "Quantity",
    amount: "Amount",
    perMonth: " / month",
    priceTitle: "Price",
    monthlyPrice: "Price per month",
    discount: (p, m) => `−${p}% for the first ${m} months`,
    discountedPrice: "Price for the first months",
    start: "Start",
    onSignature: "on signature",
    duration: (m) => `Duration ${m} months`,
    endAfter: (m) => `${m} months later`,
    proRata:
      "Billing follows calendar months. If the start is not the 1st of the month, the first and last months are charged pro rata by days; the first month still includes the full month's deliverables.",
    end: "End",
    total: "Total",
    instalments: "Payment in instalments",
    trigger: (t, date) =>
      ({
        υπογραφή: "on signature",
        ημερομηνία: `on ${date ?? "—"}`,
        "Γύρισμα έγινε": "when the shoot is done",
        "Παραγωγή παραδόθηκε": "on delivery",
      })[t],
    plusVat: "plus VAT",
    vat: (p) => `VAT ${p}%`,
    totalWithVat: "Total incl. VAT",
    termsTitle: "Terms",
    payment: (d) => `Payment within ${d} days of the invoice.`,
    grace: (d) =>
      `Each month's work may be delivered up to ${d} days after the month ends (grace period).`,
    unused: {
      χάνονται: "Anything not used within the month is lost.",
      "επόμενη Περίοδο":
        "Anything not used carries over to the next month only.",
      μαζεύονται: "Anything not used stays available until the agreement ends.",
    },
    renewal: {
      "νέα Ευκαιρία":
        "It does not renew automatically; we will send you a new proposal.",
      "αυτόματη συνέχιση":
        "It continues automatically on the same terms unless you tell us otherwise.",
    },
    filmingTitle: "Shoot policy",
    notice: (d) => `Book a shoot at least ${d} days ahead.`,
    cancel: (h) => `Free cancellation up to ${h} hours before.`,
    lateCancel: (burns) =>
      burns
        ? "A later cancellation counts as a completed shoot."
        : "A later cancellation is not charged as a shoot.",
    noShow: (burns) =>
      burns
        ? "If the shoot does not happen because of you, it counts as completed."
        : "If the shoot does not happen because of you, it is not charged.",
    revisionLimit: (r, kind) => `${r} rounds of changes per ${kind}.`,
    dissolution: (d, fee) =>
      `${d > 0 ? `Termination with ${d} days' notice` : "Termination without notice"}, ${fee ? `with a fee of ${fee}` : "with no termination fee"}.`,
    pdf: "Download PDF",
  },
};

export interface ActionLabels {
  sign: string;
  requestChanges: string;
  reject: string;
  fullName: string;
  accept: string;
  sendCode: string;
  codeSent: (email: string) => string;
  code: string;
  confirm: string;
  cancel: string;
  signed: string;
  signedRecord: string;
  changesPrompt: string;
  send: string;
  changesSent: string;
  rejectReason: string;
  rejectConfirm: string;
  rejected: string;
  onlySignatory: (name: string) => string;
  preview: string;
}

export const ACTION_LABELS: Readonly<Record<DocLanguage, ActionLabels>> = {
  el: {
    sign: "Υπογραφή",
    requestChanges: "Θέλω αλλαγές",
    reject: "Απόρριψη",
    fullName: "Ονοματεπώνυμο",
    accept: "Αποδέχομαι τους όρους",
    sendCode: "Στείλε μου κωδικό",
    codeSent: (email) => `Στείλαμε 6ψήφιο κωδικό στο ${email}.`,
    code: "Κωδικός 6 ψηφίων",
    confirm: "Επιβεβαίωση",
    cancel: "Άκυρο",
    signed:
      "Υπογράφηκε. Θα λάβετε email με το PDF και πρόσκληση στον λογαριασμό σας.",
    signedRecord:
      "Καταγράφηκαν η ώρα και η διεύθυνση σύνδεσης. Το PDF κλείδωσε και δεν αλλάζει πια.",
    changesPrompt: "Τι θέλετε να αλλάξει;",
    send: "Αποστολή",
    changesSent: "Στάλθηκε στην ομάδα. Η πρόταση μένει ανοιχτή.",
    rejectReason: "Λόγος (προαιρετικά)",
    rejectConfirm: "Ναι, απορρίπτω την πρόταση",
    rejected: "Η πρόταση απορρίφθηκε.",
    onlySignatory: (name) =>
      `Υπογράφει μόνο ο/η ${name}. Μπορείτε να ζητήσετε αλλαγές.`,
    preview: "Προεπισκόπηση: έτσι θα τη δει ο πελάτης",
  },
  en: {
    sign: "Sign",
    requestChanges: "Request changes",
    reject: "Decline",
    fullName: "Full name",
    accept: "I accept the terms",
    sendCode: "Send me a code",
    codeSent: (email) => `We sent a 6-digit code to ${email}.`,
    code: "6-digit code",
    confirm: "Confirm",
    cancel: "Cancel",
    signed:
      "Signed. You will receive an email with the PDF and an invitation to your account.",
    signedRecord:
      "The time and connection address were recorded. The PDF is now locked.",
    changesPrompt: "What would you like changed?",
    send: "Send",
    changesSent: "Sent to the team. The proposal stays open.",
    rejectReason: "Reason (optional)",
    rejectConfirm: "Yes, decline the proposal",
    rejected: "The proposal was declined.",
    onlySignatory: (name) => `Only ${name} can sign. You can request changes.`,
    preview: "Preview: this is how the client will see it",
  },
};

export interface DeadLinkLabels {
  title: (kind: DeadLinkKind, date: string) => string;
  contact: (owner: string) => string;
}

export const DEAD_LINK_LABELS: Readonly<Record<DocLanguage, DeadLinkLabels>> = {
  el: {
    title: (kind, date) =>
      ({
        expired: `Η πρόταση έληξε στις ${date}`,
        revoked: "Ο σύνδεσμος ανακλήθηκε",
        superseded:
          "Υπάρχει νεότερη έκδοση της πρότασης· θα λάβετε νέο σύνδεσμο",
        signed: `Η πρόταση έχει ήδη υπογραφεί${date ? ` στις ${date}` : ""}· τη βρίσκετε στον λογαριασμό σας`,
        closed: "Η πρόταση δεν είναι πια ανοιχτή",
      })[kind],
    contact: (owner) => `Επικοινωνήστε με ${owner}.`,
  },
  en: {
    title: (kind, date) =>
      ({
        expired: `This proposal expired on ${date}`,
        revoked: "This link was revoked",
        superseded:
          "There is a newer version of this proposal; you will receive a new link",
        signed: `This proposal was already signed${date ? ` on ${date}` : ""}; you can find it in your account`,
        closed: "This proposal is no longer open",
      })[kind],
    contact: (owner) => `Please contact ${owner}.`,
  },
};
