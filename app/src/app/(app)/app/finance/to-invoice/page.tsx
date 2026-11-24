import { BILLABLES_TITLE, SpacesToInvoice } from "@/modules/finance";

export const metadata = { title: BILLABLES_TITLE };

// I1: τι περιμένει τιμολόγηση, ανά Πελάτη (Χώροι). Εσωτερική υπενθύμιση, όχι οφειλή· η βάση αποφασίζει τι βλέπεις.
export default function ToInvoicePage() {
  return <SpacesToInvoice />;
}
