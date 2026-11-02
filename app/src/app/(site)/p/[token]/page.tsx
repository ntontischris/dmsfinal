import type { Metadata } from "next";

import { SpacesProposalLink } from "@/modules/agreements";

// D5 Σύνδεσμος πρότασης. Δημόσια και ανώνυμη: καμία ταυτότητα Χρήστη, κανένα στοιχείο της εφαρμογής.
// Δεν ευρετηριάζεται, δεν στέλνει Referer και δεν αποθηκεύεται σε cache: το token είναι το μυστικό.
// Δεν έχει εναλλαγή εμφάνισης: όλοι βλέπουν την οθόνη του prototype (Χώροι).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Πρόταση" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ProposalLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SpacesProposalLink token={token} />;
}
