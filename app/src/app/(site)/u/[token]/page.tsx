import type { Metadata } from "next";

import { AuthPage } from "@/modules/access";
import {
  UNSUBSCRIBE_TEXT_EL,
  UNSUBSCRIBE_TEXT_EN,
  UNSUBSCRIBE_TITLE,
  SpacesUnsubscribeForm,
} from "@/modules/notifications";

// Διακοπή email ενός μη απαραίτητου Αυτοματισμού (#171, Α10). Δημόσια, χωρίς είσοδο, δίγλωσση.
// Η σελίδα δεν ρωτά τη βάση: ίδια για κάθε token (χωρίς oracle), οπότε δεν δείχνει ποτέ «ο σύνδεσμος δεν ισχύει».
// Η διακοπή γίνεται μόνο με το κουμπί (POST). Δεν ευρετηριάζεται, δεν στέλνει Referer και δεν αποθηκεύεται σε cache.
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
    <AuthPage title={UNSUBSCRIBE_TITLE}>
      <p lang="el">{UNSUBSCRIBE_TEXT_EL}</p>
      <p className="r-muted" lang="en">
        {UNSUBSCRIBE_TEXT_EN}
      </p>
      <SpacesUnsubscribeForm token={token} />
    </AuthPage>
  );
}
