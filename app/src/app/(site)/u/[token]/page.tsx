import type { Metadata } from "next";

import {
  UNSUBSCRIBE_TEXT_EL,
  UNSUBSCRIBE_TEXT_EN,
  UNSUBSCRIBE_TITLE,
  UnsubscribeForm,
} from "@/modules/notifications";

// Διακοπή email ενός μη απαραίτητου Αυτοματισμού (#171, Α10). Δημόσια, χωρίς είσοδο, δίγλωσση.
// Η σελίδα δεν ρωτά τη βάση: ίδια για κάθε token (χωρίς oracle). Η διακοπή γίνεται μόνο με το κουμπί (POST).
// Δεν ευρετηριάζεται, δεν στέλνει Referer και δεν αποθηκεύεται σε cache: το token είναι το μυστικό.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: UNSUBSCRIBE_TITLE },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="mx-auto grid w-full max-w-xl gap-4 px-4 py-10">
      <h1 className="m-0 text-xl font-semibold">{UNSUBSCRIBE_TITLE}</h1>
      <p className="m-0" lang="el">
        {UNSUBSCRIBE_TEXT_EL}
      </p>
      <p className="m-0 text-muted-foreground" lang="en">
        {UNSUBSCRIBE_TEXT_EN}
      </p>
      <UnsubscribeForm token={token} />
    </main>
  );
}
