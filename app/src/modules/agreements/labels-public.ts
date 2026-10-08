import type {
  Language,
  LinkStatus,
  MilestoneTrigger,
  Renewal,
  UnusedProvisions,
} from "./types";

// Τα κείμενα που βλέπει ο πελάτης (έγγραφο πρότασης, υπογραφή, νεκρός Σύνδεσμος), στις δύο γλώσσες.
// Δεν υπάρχουν εδώ ώρες, κόστος ή Παρεκκλίσεις: το έγγραφο δεν τα περιέχει ποτέ.
// Ό,τι έχει {όνομα} ανάμεσα σε αγκύλες συμπληρώνεται με fillTemplate().

export type DeadLinkKind = Exclude<LinkStatus, "active"> | "unknown";

export const fillTemplate = (
  template: string,
  values: Readonly<Record<string, string>>,
): string =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");

export interface DocLabels {
  proposalFor: string;
  revision: (n: number) => string;
  validUntil: string;
  linesTitle: string;
  description: string;
  provisions: string;
  quantity: string;
  amount: string;
  perMonth: string;
  includedTitle: string;
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
  trigger: (trigger: MilestoneTrigger, date: string | null) => string;
  plusVat: string;
  vat: (percent: number) => string;
  totalWithVat: string;
  termsTitle: string;
  payment: (days: number) => string;
  grace: (days: number) => string;
  unused: Readonly<Record<UnusedProvisions, string>>;
  renewal: Readonly<Record<Renewal, string>>;
  filmingTitle: string;
  notice: (hours: number) => string;
  cancel: (hours: number) => string;
  lateCancel: (burns: boolean) => string;
  noShow: (burns: boolean) => string;
  revisionTitle: string;
  revisionLimit: (rounds: number, kind: string) => string;
  dissolution: (days: number, fee: string | null) => string;
  legalLine: (taxId: string, taxOffice: string, gemi: string) => string;
  preview: string;
}

const EL: DocLabels = {
  proposalFor: "Πρόταση προς",
  revision: (n) => `Αναθεώρηση ${n}`,
  validUntil: "Ισχύει ως",
  linesTitle: "Τι περιλαμβάνει",
  description: "Περιγραφή",
  provisions: "Παροχές",
  quantity: "Ποσότητα",
  amount: "Ποσό",
  perMonth: " / μήνα",
  includedTitle: "Παροχές ανά Περίοδο",
  priceTitle: "Τιμή",
  monthlyPrice: "Τιμή ανά μήνα",
  discount: (p, m) => `−${p}% τους ${m} πρώτους μήνες`,
  discountedPrice: "Τιμή τους πρώτους μήνες",
  start: "Έναρξη",
  onSignature: "με την υπογραφή",
  duration: (m) => `Διάρκεια ${m} μήνες`,
  endAfter: (m) => `${m} μήνες μετά`,
  proRata:
    "Η χρέωση γίνεται ανά ημερολογιακό μήνα. Αν η έναρξη δεν είναι 1η του μήνα, ο πρώτος και ο τελευταίος μήνας χρεώνονται αναλογικά με τις μέρες· ο πρώτος δίνει ολόκληρες τις Παροχές του μήνα, ο τελευταίος δεν δίνει νέες Παροχές.",
  end: "Λήξη",
  total: "Σύνολο",
  instalments: "Πληρωμή σε δόσεις",
  trigger: (t, date) =>
    ({
      signature: "με την υπογραφή",
      date: `στις ${date ?? "—"}`,
      filming_done: "όταν γίνει το Γύρισμα",
      delivered: "με την παράδοση",
    })[t],
  plusVat: "πλέον ΦΠΑ",
  vat: (p) => `ΦΠΑ ${p}%`,
  totalWithVat: "Σύνολο με ΦΠΑ",
  termsTitle: "Όροι",
  payment: (d) => `Πληρωμή μέσα σε ${d} μέρες από το τιμολόγιο.`,
  grace: (d) =>
    `Η δουλειά κάθε μήνα μπορεί να παραδοθεί ως ${d} μέρες μετά το τέλος του (Περίοδος χάριτος).`,
  unused: {
    lost: "Ό,τι δεν χρησιμοποιηθεί μέσα στον μήνα χάνεται.",
    next_period:
      "Ό,τι δεν χρησιμοποιηθεί περνά στον επόμενο μήνα, μόνο σε αυτόν.",
    accumulate:
      "Ό,τι δεν χρησιμοποιηθεί μένει διαθέσιμο ως τη λήξη της συμφωνίας.",
  },
  renewal: {
    new_opportunity:
      "Στη λήξη δεν ανανεώνεται αυτόματα· θα σας στείλουμε νέα πρόταση.",
    auto: "Στη λήξη συνεχίζει αυτόματα με τους ίδιους όρους, εκτός αν μας ειδοποιήσετε.",
  },
  filmingTitle: "Πολιτική Γυρισμάτων",
  notice: (h) => `Κλείνετε Γύρισμα τουλάχιστον ${h} ώρες πριν.`,
  cancel: (h) => `Ακύρωση χωρίς χρέωση ως ${h} ώρες πριν.`,
  lateCancel: (burns) =>
    burns
      ? "Πιο αργή ακύρωση μετρά ως Γύρισμα που έγινε."
      : "Πιο αργή ακύρωση δεν χρεώνεται Γύρισμα.",
  noShow: (burns) =>
    burns
      ? "Αν το Γύρισμα δεν γίνει εξαιτίας σας, μετρά ως Γύρισμα που έγινε."
      : "Αν το Γύρισμα δεν γίνει εξαιτίας σας, δεν χρεώνεται.",
  revisionTitle: "Όριο αλλαγών",
  revisionLimit: (r, kind) => `${r} γύροι αλλαγών ανά ${kind}.`,
  dissolution: (d, fee) =>
    `${d > 0 ? `Λύση με ειδοποίηση ${d} ημερών` : "Λύση χωρίς ειδοποίηση"}, ${fee ? `με χρέωση ${fee}` : "χωρίς χρέωση λύσης"}.`,
  legalLine: (taxId, taxOffice, gemi) =>
    [
      taxId && `ΑΦΜ ${taxId}`,
      taxOffice && `ΔΟΥ ${taxOffice}`,
      gemi && `ΓΕΜΗ ${gemi}`,
    ]
      .filter(Boolean)
      .join(" · "),
  preview: "Προεπισκόπηση: έτσι θα τη δει ο πελάτης",
};

const EN: DocLabels = {
  proposalFor: "Proposal for",
  revision: (n) => `Revision ${n}`,
  validUntil: "Valid until",
  linesTitle: "What is included",
  description: "Description",
  provisions: "Deliverables",
  quantity: "Quantity",
  amount: "Amount",
  perMonth: " / month",
  includedTitle: "Deliverables per period",
  priceTitle: "Price",
  monthlyPrice: "Price per month",
  discount: (p, m) => `−${p}% for the first ${m} months`,
  discountedPrice: "Price for the first months",
  start: "Start",
  onSignature: "on signature",
  duration: (m) => `Duration ${m} months`,
  endAfter: (m) => `${m} months later`,
  proRata:
    "Billing follows calendar months. If the start is not the 1st of the month, the first and last months are charged pro rata by days; the first month still includes the full month's deliverables, the last month adds no new deliverables.",
  end: "End",
  total: "Total",
  instalments: "Payment in instalments",
  trigger: (t, date) =>
    ({
      signature: "on signature",
      date: `on ${date ?? "—"}`,
      filming_done: "when the shoot is done",
      delivered: "on delivery",
    })[t],
  plusVat: "plus VAT",
  vat: (p) => `VAT ${p}%`,
  totalWithVat: "Total incl. VAT",
  termsTitle: "Terms",
  payment: (d) => `Payment within ${d} days of the invoice.`,
  grace: (d) =>
    `Each month's work may be delivered up to ${d} days after the month ends (grace period).`,
  unused: {
    lost: "Anything not used within the month is lost.",
    next_period: "Anything not used carries over to the next month only.",
    accumulate: "Anything not used stays available until the agreement ends.",
  },
  renewal: {
    new_opportunity:
      "It does not renew automatically; we will send you a new proposal.",
    auto: "It continues automatically on the same terms unless you tell us otherwise.",
  },
  filmingTitle: "Shoot policy",
  notice: (h) => `Book a shoot at least ${h} hours ahead.`,
  cancel: (h) => `Free cancellation up to ${h} hours before.`,
  lateCancel: (burns) =>
    burns
      ? "A later cancellation counts as a completed shoot."
      : "A later cancellation is not charged as a shoot.",
  noShow: (burns) =>
    burns
      ? "If the shoot does not happen because of you, it counts as completed."
      : "If the shoot does not happen because of you, it is not charged.",
  revisionTitle: "Change rounds",
  revisionLimit: (r, kind) => `${r} rounds of changes per ${kind}.`,
  dissolution: (d, fee) =>
    `${d > 0 ? `Termination with ${d} days' notice` : "Termination without notice"}, ${fee ? `with a fee of ${fee}` : "with no termination fee"}.`,
  legalLine: (taxId, taxOffice, gemi) =>
    [
      taxId && `VAT ID ${taxId}`,
      taxOffice && `Tax office ${taxOffice}`,
      gemi && `GEMI ${gemi}`,
    ]
      .filter(Boolean)
      .join(" · "),
  preview: "Preview: this is how the client will see it",
};

export const DOC_LABELS: Readonly<Record<Language, DocLabels>> = {
  el: EL,
  en: EN,
};

// Νεκροί Σύνδεσμοι: ο τίτλος (η έκπτωση «έληξε» θέλει {date}) και η γραμμή επικοινωνίας (θέλει {who}).
export const DEAD_LINK_LABELS: Readonly<
  Record<Language, Readonly<Record<DeadLinkKind, string>>>
> = {
  el: {
    expired: "Η πρόταση έληξε στις {date}",
    revoked: "Ο σύνδεσμος ανακλήθηκε",
    superseded: "Υπάρχει νεότερη έκδοση της πρότασης· θα λάβετε νέο σύνδεσμο",
    signed: "Η πρόταση έχει ήδη υπογραφεί",
    closed: "Η πρόταση δεν είναι πια ανοιχτή",
    unknown: "Ο σύνδεσμος δεν βρέθηκε",
  },
  en: {
    expired: "This proposal expired on {date}",
    revoked: "This link was revoked",
    superseded:
      "There is a newer version of this proposal; you will receive a new link",
    signed: "This proposal has already been signed",
    closed: "This proposal is no longer open",
    unknown: "This link was not found",
  },
};

export const DEAD_LINK_CONTACT: Readonly<Record<Language, string>> = {
  el: "Επικοινωνήστε με {who}.",
  en: "Please contact {who}.",
};

export { LOAD_ERROR_LABEL, SIGN_LABELS, type SignLabels } from "./labels-public-parts";
