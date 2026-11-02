import Link from "next/link";
import type { ReactNode } from "react";

import { getViewer, type Viewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice, fmtDate } from "@/spaces/screens/shared";
import { Strip } from "@/spaces/shell/strip";

import { arrangeToday } from "../layout";
import { CUSTOMIZE_PATH } from "../labels";
import { getTodayCounts } from "../queries";
import type { TodayCounts } from "../view-schema";
import { athensStamp, cardDefOf, weekGlance, type Built } from "./a1-adapter";
import { CardError, QuietCards, TodayCard } from "./a1-card";
import { Customize } from "./a1-customize";
import { loadCards } from "./a1-load";
import { greetingAt, vocativeOf, type CardDef } from "./a1-model";
import { besideNow, nowOf } from "./a1-now";
import { pickStats } from "./a1-stats";
import { splitUrgent, withoutRepeats, zonesOf } from "./a1-zones";

import "./a1.css";

const WEEKDAYS_LONG = [
  "Κυριακή",
  "Δευτέρα",
  "Τρίτη",
  "Τετάρτη",
  "Πέμπτη",
  "Παρασκευή",
  "Σάββατο",
] as const;

const weekdayOf = (date: string): string =>
  WEEKDAYS_LONG[new Date(`${date}T12:00Z`).getUTCDay()];

// Το μικρό όνομα του Χρήστη ομάδας, στην κλητική.
const nameOf = (viewer: Viewer): string =>
  viewer.status === "signed-in" && viewer.team
    ? vocativeOf(viewer.team.name.split(" ")[0] ?? "")
    : "";

const ZONE_TITLES = {
  urgent: "Επείγοντα",
  waiting: "Σε αναμονή",
  info: "Για ενημέρωση",
} as const;

// Οι κάρτες σε ζώνες: πρώτα ό,τι καίει, μετά ό,τι περιμένει, μετά η ενημέρωση· τα τεχνικά κλειστά.
function ZonedCards({
  items,
  renderCard,
}: {
  items: readonly Built[];
  renderCard: (item: Built) => ReactNode;
}) {
  const zones = zonesOf(items);
  const hasActions = zones.urgent.length + zones.waiting.length > 0;
  const urgent = splitUrgent(zones.urgent);
  return (
    <>
      {zones.urgent.length > 0 && (
        <section className="a1-zone" data-zone="urgent">
          <h2 className="a1-zone-title">{ZONE_TITLES.urgent}</h2>
          <div className="a1-grid">{urgent.shown.map(renderCard)}</div>
          {urgent.rest.length > 0 && (
            <details className="a1-fold">
              <summary className="a1-zone-title">
                Κι άλλα επείγοντα{" "}
                <span className="muted">({urgent.rest.length})</span>
              </summary>
              <div className="a1-grid">{urgent.rest.map(renderCard)}</div>
            </details>
          )}
        </section>
      )}
      {(["waiting", "info"] as const).map(
        (zone) =>
          zones[zone].length > 0 && (
            <details
              key={zone}
              className="a1-zone a1-fold"
              data-zone={zone}
              open={zone === "waiting" || !hasActions}
            >
              <summary className="a1-zone-title">
                {ZONE_TITLES[zone]}{" "}
                <span className="muted">({zones[zone].length})</span>
              </summary>
              <div className="a1-grid">{zones[zone].map(renderCard)}</div>
            </details>
          ),
      )}
      {zones.more.length > 0 && (
        <details className="a1-zone a1-more">
          <summary className="a1-zone-title">
            Περισσότερα{" "}
            <span className="muted">
              ({zones.more.map(({ card }) => card.title).join(", ")})
            </span>
          </summary>
          <div className="a1-grid">{zones.more.map(renderCard)}</div>
        </details>
      )}
    </>
  );
}

// Η σειρά που φαίνονται στη σελίδα, ώστε να μένει η πρώτη εμφάνιση κάθε στοιχείου.
const zonesInOrder = (items: readonly Built[]): readonly Built[] => {
  const zones = zonesOf(items);
  return [...zones.urgent, ...zones.waiting, ...zones.info, ...zones.more];
};

function Hello({
  viewer,
  unread,
  isEditing,
}: {
  viewer: Viewer;
  unread: number;
  isEditing: boolean;
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
      </p>
      <div className="btn-row">
        <Link href={hrefOf("A2")}>
          {unread === 0
            ? "Καμία νέα Ειδοποίηση"
            : unread === 1
              ? "1 νέα Ειδοποίηση →"
              : `${unread} νέες Ειδοποιήσεις →`}
        </Link>
        {!isEditing && (
          <Link className="button" href={CUSTOMIZE_PATH}>
            Προσαρμογή
          </Link>
        )}
      </div>
    </section>
  );
}

async function TodayCards({ counts }: { counts: TodayCounts }) {
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
  const shown = built.filter((item) => !quiet.includes(item));
  const now = nowOf(shown.filter(({ card }) => !failed.has(card.id)));
  const stats = pickStats(besideNow(shown, now));
  // Κάθε στοιχείο μία φορά: ούτε το Τώρα ούτε οι ίδιες γραμμές σε δεύτερη κάρτα.
  const visible = withoutRepeats(
    zonesInOrder(shown),
    now && { href: now.href, label: now.title },
  );
  // Το κουμπί της κάρτας που έγινε Τώρα μένει δίπλα στο Τώρα, αφού η κάρτα δεν ξαναφαίνεται.
  const nowCta = now
    ? shown.find(({ card }) => card.id === now.cardId)?.content.cta
    : undefined;
  const week = weekGlance(counts.cards);
  return (
    <>
      {layout.isAllClear && (
        <StateNotice kind="empty" title="Όλα καθαρά">
          Δεν σε περιμένει τίποτα. Ό,τι νέο έρθει θα εμφανιστεί εδώ, στη σειρά
          που διάλεξες.
        </StateNotice>
      )}
      <div className="a1-strip" data-money-first={false}>
        <Strip stats={stats} now={now} />
        {nowCta && (
          <p className="a1-now-extra">
            <a className="button" href={nowCta.href}>
              {nowCta.label} →
            </a>
          </p>
        )}
      </div>
      {week.length > 0 && (
        <p className="a1-week">
          <strong>Η εβδομάδα:</strong>{" "}
          {week.map((part, index) => (
            <span key={part.label}>
              {index > 0 && " · "}
              <Link href={part.href}>{part.label}</Link>
            </span>
          ))}
        </p>
      )}
      {layout.isAllHidden ? (
        <StateNotice kind="empty" title="Έκρυψες όλες τις κάρτες">
          Πάτα «Προσαρμογή» για να εμφανίσεις όσες θέλεις, ή{" "}
          <Link href={CUSTOMIZE_PATH}>γύρνα στην προεπιλογή</Link>.
        </StateNotice>
      ) : (
        <ZonedCards
          items={visible}
          renderCard={({ card, content }) =>
            failed.has(card.id) ? (
              <CardError key={card.id} card={card} retryHref="/app" />
            ) : (
              <TodayCard key={card.id} card={card} content={content} />
            )
          }
        />
      )}
      <QuietCards
        cards={quiet.map(({ card }) => card)}
        hrefOf={(card: CardDef) =>
          quiet.find((item) => item.card.id === card.id)?.content.allHref ??
          "/app"
        }
      />
    </>
  );
}

// A1 «Σήμερα» στη νέα εμφάνιση (prototype `screens/A1.tsx`): η αρχική σελίδα κάθε Χρήστη, με τις πραγματικές κάρτες της
// βάσης (μόνο όσες επιτρέπουν τα Δικαιώματα, με τη σειρά των Προτιμήσεών του).
export async function SpacesToday({
  isCustomizing,
}: {
  isCustomizing: boolean;
}) {
  const [viewer, counts] = await Promise.all([getViewer(), getTodayCounts()]);
  if (!counts.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="η «Σήμερα»" />
      </div>
    );
  if (!counts.data)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Δεν έχεις ακόμα πρόσβαση">
          Ο λογαριασμός σου δεν ανήκει ακόμα σε ομάδα ή σε Πελάτη.
        </StateNotice>
      </div>
    );
  return (
    <div data-spaces>
      <Hello
        viewer={viewer}
        unread={counts.data.unreadNotifications}
        isEditing={isCustomizing}
      />
      {isCustomizing && (
        <Customize
          available={counts.data.cards.map(cardDefOf)}
          hiddenAtStart={counts.data.cards
            .filter((card) => card.hidden)
            .map((card) => card.code)}
          isCustomized={counts.data.isCustomized}
        />
      )}
      <TodayCards counts={counts.data} />
    </div>
  );
}
