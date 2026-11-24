// I8 του Χρήστη πελάτη: ένα δικό του Τιμολόγιο και το «Πώς πληρώνω». Καθαρές συναρτήσεις.

import type { ClientInvoice, PaymentInfo } from "../ledger-view-schema";

// Μόνο ό,τι υπάρχει στη δική του λίστα (client_invoices_view): Τιμολόγιο άλλου Πελάτη δεν βρίσκεται ποτέ.
export const ownInvoiceOf = (
  items: readonly ClientInvoice[],
  id: string,
): ClientInvoice | null => items.find((item) => item.id === id) ?? null;

// Ίδιος κανόνας με το φίλτρο «Ανεξόφλητα»: όχι πιστωτικά, με υπόλοιπο > 0.
export const needsPayment = (invoice: ClientInvoice): boolean =>
  invoice.kind !== "credit" && invoice.remaining > 0;

export interface ContactLink {
  label: string;
  value: string;
  href: string;
}

// Πώς επικοινωνεί ο πελάτης με την εταιρεία, όταν δεν υπάρχει λογαριασμός τραπέζης. Μόνο όσα έχουν συμπληρωθεί.
export const contactLinksOf = (
  company: PaymentInfo["company"],
): ContactLink[] => {
  const phone = company.phone.trim();
  const email = company.email.trim();
  return [
    ...(phone
      ? [
          {
            label: "Τηλέφωνο",
            value: phone,
            href: `tel:${phone.replace(/[^\d+]/g, "")}`,
          },
        ]
      : []),
    ...(email
      ? [{ label: "Email", value: email, href: `mailto:${email}` }]
      : []),
  ];
};

export interface PaymentReference {
  label: string;
  value: string;
  // Για το μήνυμα της αντιγραφής: «Αντιγράφηκε ο κωδικός πληρωμής.»
  what: string;
}

export const RF_LABEL = "Κωδικός πληρωμής (RF)";

// Τι γράφει ο πελάτης στην πληρωμή: ο κωδικός πληρωμής (RF) αν υπάρχει, αλλιώς ο αριθμός του Τιμολογίου ως αιτιολογία.
export const paymentReferenceOf = (
  invoice: Pick<ClientInvoice, "number" | "paymentRef">,
): PaymentReference => {
  const ref = invoice.paymentRef?.trim() ?? "";
  return ref
    ? { label: RF_LABEL, value: ref, what: "ο κωδικός πληρωμής" }
    : { label: "Αιτιολογία", value: invoice.number, what: "η αιτιολογία" };
};
