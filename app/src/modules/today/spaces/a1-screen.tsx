import Link from "next/link";

import { getViewer, type Viewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { fmtDate } from "@/spaces/screens/shared";

import { arrangeToday } from "../layout";
import { CUSTOMIZE_PATH } from "../labels";
import { getTodayCounts } from "../queries";
import type { TodayCounts } from "../view-schema";
import { athensStamp, cardDefOf, type Built } from "./a1-adapter";
import { CardError, QuietCards, TodayCard } from "./a1-card";
import { ClientDeck, ClientMoneyShelf } from "./a1-client";
import { Customize } from "./a1-customize";
import { TeamBriefing } from "./a1-briefing";
import { TodayNotice } from "./a1-lines";
import { loadCards } from "./a1-load";
import { greetingAt, vocativeOf, type CardDef } from "./a1-model";
import { weekdayOf } from "./a1-programme";
import { withoutRepeats, zonesOf } from "./a1-zones";

import "./a1.css";

// Το μικρό όνομα του Χρήστη ομάδας, στην κλητική.
const nameOf = (viewer: Viewer): string =>
  viewer.status === "signed-in" && viewer.team
    ? vocativeOf(viewer.team.name.split(" ")[0] ?? "")
    : "";

// Η ομάδα βλέπει τη Σήμερα ως ενημέρωση (#241)· ο Πελάτης κρατά τις κάρτες του όπως ήταν.
const isTeamOf = (viewer: Viewer): boolean =>
  viewer.status === "signed-in" && viewer.team !== null;

// Η σειρά που φαίνονται στη σελίδα, ώστε να μένει η πρώτη εμφάνιση κάθε στοιχείου.
const zonesInOrder = (items: readonly Built[]): readonly Built[] => {
  const zones = zonesOf(items);
  return [
    ...zones.status,
    ...zones.urgent,
    ...zones.waiting,
    ...zones.info,
    ...zones.more,
  ];
};

function Hello({
  viewer,
  unread,
  isEditing,
  newChip = null,
}: {
  viewer: Viewer;
  unread: number;
  isEditing: boolean;
  // «N νέα από την τελευταία φορά» (#241 Σ8), μόνο για την ομάδα.
  newChip?: string | null;
}) {
  const stamp = athensStamp(new Date());
  const name = nameOf(viewer);
  return (
    <section className="a1-hello">
      <p>
        {greetingAt(stamp)}
        {name ? `, ${name}` : ""}{" "}
        <span className="muted">
          · {weekdayOf(stamp.slice(0, 10))} {fmtDate(stamp)},{" "}
          {stamp.slice(11, 16)}
        </span>
        {newChip && <span className="a1-new-chip">{newChip}</span>}
      </p>
      <div className="ml-quick">
        <Link href={hrefOf("A2")}>
          {unread === 0
            ? "Καμία νέα Ειδοποίηση"
            : unread === 1
              ? "1 νέα Ειδοποίηση →"
              : `${unread} νέες Ειδοποιήσεις →`}
        </Link>
        {!isEditing && <Link href={CUSTOMIZE_PATH}>Προσαρμογή</Link>}
      </div>
    </section>
  );
}

// Το κουτί κάθε κάρτας· η χαλασμένη κάρτα γίνεται μία γραμμή με «Ξαναδοκίμασε».
function CardBox({ item, isFailed }: { item: Built; isFailed: boolean }) {
  return isFailed ? (
    <div className="ml-list">
      <CardError card={item.card} retryHref="/app" />
    </div>
  ) : (
    <TodayCard card={item.card} content={item.content} />
  );
}

const cardBoxesOf = (items: readonly Built[], failed: ReadonlySet<string>) =>
  items.map((item) => (
    <CardBox
      key={item.card.id}
      item={item}
      isFailed={failed.has(item.card.id)}
    />
  ));

async function TodayCards({
  counts,
  viewer,
}: {
  counts: TodayCounts;
  viewer: Viewer;
}) {
  const layout = arrangeToday(counts.cards);
  const loaded = await loadCards(counts.cards);
  const failed = new Set(
    loaded.filter((item) => item.failed).map((item) => item.built.card.id),
  );
  const built = loaded.map((item) => item.built);
  const quiet = built.filter(
    ({ card, content }) =>
      !failed.has(card.id) &&
      card.kind === "action" &&
      content.count === 0 &&
      !content.teamRows?.length,
  );
  // Κάθε στοιχείο μία φορά: οι ίδιες γραμμές δεν ξαναφαίνονται σε δεύτερη κάρτα.
  const visible = withoutRepeats(
    zonesInOrder(built.filter((item) => !quiet.includes(item))),
    null,
  );
  const zones = zonesOf(visible);
  const main = visible.filter((item) => !zones.more.includes(item));
  return (
    <>
      {layout.isAllClear && (
        <TodayNotice kind="empty" title="Όλα καθαρά">
          Δεν σε περιμένει τίποτα. Ό,τι νέο έρθει θα εμφανιστεί εδώ, στη σειρά
          που διάλεξες.
        </TodayNotice>
      )}
      {layout.isAllHidden ? (
        <TodayNotice kind="empty" title="Έκρυψες όλες τις κάρτες">
          Πάτα «Προσαρμογή» για να εμφανίσεις όσες θέλεις, ή{" "}
          <Link href={CUSTOMIZE_PATH}>γύρνα στην προεπιλογή</Link>.
        </TodayNotice>
      ) : (
        <>
          <ClientDeck items={main.filter(({ card }) => !failed.has(card.id))} />
          <div className="a1-boxes">{cardBoxesOf(main, failed)}</div>
          {zones.more.length > 0 && (
            <details className="ml-box a1-more">
              <summary className="ml-box-title">
                Περισσότερα (
                {zones.more.map(({ card }) => card.title).join(", ")})
              </summary>
              <div className="a1-boxes">{cardBoxesOf(zones.more, failed)}</div>
            </details>
          )}
        </>
      )}
      <QuietCards
        cards={quiet.map(({ card }) => card)}
        hrefOf={(card: CardDef) =>
          quiet.find((item) => item.card.id === card.id)?.content.allHref ??
          "/app"
        }
      />
      <ClientMoneyShelf viewer={viewer} />
    </>
  );
}

// A1 «Σήμερα» στη νέα εμφάνιση (prototype `screens/A1.tsx`): η αρχική σελίδα κάθε Χρήστη, με τις πραγματικές κάρτες της
// βάσης (μόνο όσες επιτρέπουν τα Δικαιώματα, με τη σειρά των Προτιμήσεών του). Για την ομάδα ενημέρωση, για τον Πελάτη κάρτες.
export async function SpacesToday({
  isCustomizing,
  group,
}: {
  isCustomizing: boolean;
  group?: string;
}) {
  const [viewer, counts] = await Promise.all([getViewer(), getTodayCounts()]);
  if (!counts.ok)
    return (
      <div data-spaces>
        <TodayNotice kind="error" title="Δεν φορτώθηκε: η «Σήμερα»">
          Κάτι πήγε στραβά στον διακομιστή. Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε
          λίγο.
        </TodayNotice>
      </div>
    );
  if (!counts.data)
    return (
      <div data-spaces>
        <TodayNotice kind="denied" title="Δεν έχεις ακόμα πρόσβαση">
          Ο λογαριασμός σου δεν ανήκει ακόμα σε ομάδα ή σε Πελάτη.
        </TodayNotice>
      </div>
    );
  const customize = isCustomizing && (
    <Customize
      available={counts.data.cards.map(cardDefOf)}
      hiddenAtStart={counts.data.cards
        .filter((card) => card.hidden)
        .map((card) => card.code)}
      isCustomized={counts.data.isCustomized}
    />
  );
  const unread = counts.data.unreadNotifications;
  return (
    <div data-spaces>
      {isTeamOf(viewer) ? (
        <TeamBriefing
          counts={counts.data}
          group={group}
          hello={(newChip) => (
            <Hello
              viewer={viewer}
              unread={unread}
              isEditing={isCustomizing}
              newChip={newChip}
            />
          )}
        >
          {customize}
        </TeamBriefing>
      ) : (
        <>
          <Hello viewer={viewer} unread={unread} isEditing={isCustomizing} />
          {customize}
          <TodayCards counts={counts.data} viewer={viewer} />
        </>
      )}
    </div>
  );
}
