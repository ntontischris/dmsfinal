import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

export const metadata = { title: "Σήμερα" };

// A1 Σήμερα: χτίζεται τελευταίο στη ραχοκοκαλιά, όταν υπάρχουν οι ουρές που δείχνει.
export default function TodayPage() {
  return (
    <>
      <ScreenHeader eyebrow="A1 · Σήμερα" title="Σήμερα" />
      <Notice kind="empty" title="Τίποτα ακόμα εδώ">
        <p className="m-0">
          Η «Σήμερα» γεμίζει όσο χτίζονται τα modules της ραχοκοκαλιάς.
        </p>
        <Link
          href="/app/kit"
          className={buttonVariants({ variant: "primary" })}
        >
          Δες το Kit
        </Link>
      </Notice>
    </>
  );
}
