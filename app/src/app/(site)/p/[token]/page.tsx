import type { Metadata } from "next";

import { Notice } from "@/components/ui/notice";
import {
  LOAD_ERROR_LABEL,
  PublicProposalView,
  getPublicProposal,
} from "@/modules/agreements";

// D5 Σύνδεσμος πρότασης. Δημόσια και ανώνυμη: καμία ταυτότητα Χρήστη, κανένα στοιχείο της εφαρμογής.
// Δεν ευρετηριάζεται, δεν στέλνει Referer και δεν αποθηκεύεται σε cache: το token είναι το μυστικό.
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
  const result = await getPublicProposal(token);
  if (!result.ok)
    return (
      <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-6 sm:py-10">
        <Notice kind="error" title={LOAD_ERROR_LABEL} />
      </main>
    );
  const proposal = result.data;
  return (
    <main
      lang={proposal.status === "unknown" ? undefined : proposal.language}
      className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-6 sm:py-10 print:max-w-none print:p-0"
    >
      <PublicProposalView proposal={proposal} token={token} />
    </main>
  );
}
