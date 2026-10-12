import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

import { arrangeToday } from "../layout";
import {
  CUSTOMIZE_PATH,
  NOTIFICATIONS_PATH,
  TODAY_EYEBROW,
  TODAY_TITLE,
  unreadLine,
} from "../labels";
import { getTodayCounts } from "../queries";
import type { TodayCounts } from "../view-schema";
import { CardSlot } from "./card-slot";
import { Customize } from "./customize";
import { QuietLine } from "./quiet-line";

function TodayCards({ counts }: { counts: TodayCounts }) {
  const layout = arrangeToday(counts.cards);
  if (layout.isAllHidden)
    return (
      <Notice kind="empty" title="Έκρυψες όλες τις κάρτες">
        <p className="m-0">
          Πάτα «Προσαρμογή» για να εμφανίσεις όσες θέλεις, ή «Επαναφορά προεπιλογής» για να γυρίσουν όλες.
        </p>
      </Notice>
    );
  return (
    <>
      {layout.isAllClear && (
        <Notice kind="empty" title="Όλα καθαρά">
          <p className="m-0">Δεν σε περιμένει τίποτα. Ό,τι νέο έρθει θα εμφανιστεί εδώ.</p>
        </Notice>
      )}
      {layout.visible.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {layout.visible.map((card) => (
            <CardSlot key={card.code} card={card} />
          ))}
        </div>
      )}
      <QuietLine cards={layout.quiet} />
    </>
  );
}

// A1 «Σήμερα»: πρώτα τα πλήθη (ένα γρήγορο RPC), μετά κάθε ορατή κάρτα φορτώνει χωριστά.
export async function TodayScreen({ isCustomizing }: { isCustomizing: boolean }) {
  const counts = await getTodayCounts();
  const header = (
    <ScreenHeader eyebrow={TODAY_EYEBROW} title={TODAY_TITLE}>
      {counts.ok && counts.data && !isCustomizing && (
        <Link href={CUSTOMIZE_PATH} className={buttonVariants({ variant: "default" })}>
          Προσαρμογή
        </Link>
      )}
    </ScreenHeader>
  );
  if (!counts.ok)
    return (
      <>
        {header}
        <Notice kind="error" title="Δεν φόρτωσε η «Σήμερα»">
          <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
        </Notice>
      </>
    );
  if (!counts.data)
    return (
      <>
        {header}
        <Notice kind="empty" title="Δεν έχεις ακόμα πρόσβαση">
          <p className="m-0">Ο λογαριασμός σου δεν ανήκει ακόμα σε ομάδα ή σε Πελάτη.</p>
        </Notice>
      </>
    );
  return (
    <>
      {header}
      <div className="grid gap-4">
        {counts.data.unreadNotifications > 0 && (
          <p className="m-0">
            <Link href={NOTIFICATIONS_PATH}>{unreadLine(counts.data.unreadNotifications)}</Link>
          </p>
        )}
        {isCustomizing && <Customize cards={counts.data.cards} isCustomized={counts.data.isCustomized} />}
        <TodayCards counts={counts.data} />
      </div>
    </>
  );
}
