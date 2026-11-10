import { RECEIPTS_TITLE, SpacesReceipts } from "@/modules/finance";

export const metadata = { title: RECEIPTS_TITLE };

// I4: οι Εισπράξεις (Χώροι). Η λίστα θέλει «Βλέπει Οικονομικά» και «Βλέπει ποσά»· η καταχώρηση και η διόρθωση «Καταχωρεί Εισπράξεις».
// Η βάση ελέγχει κάθε RPC· εδώ μόνο φαίνεται ό,τι δικαιούται ο θεατής.
export default function ReceiptsPage() {
  return <SpacesReceipts />;
}
