import Link from "next/link";

import { memberName } from "@/data/calendar";
import { FICTIONAL_CLIENT } from "@/data/fictional-client";
import { PERSON_OF_ROLE } from "@/data/filming";
import { TODAY } from "@/data/finance-access";
import { inboxOf } from "@/data/notifications-access";
import type { RoleId } from "@/data/roles";
import { CardError, QuietCards, TodayCard } from "@/screens/a1-card";
import { CARD_CATALOGUE } from "@/screens/a1-catalogue";
import { Customize } from "@/screens/a1-customize";
import {
  availableCards,
  chosenCards,
  parseLayout,
  type CardContent,
  type CardDef,
} from "@/screens/a1-model";
import { pickStats } from "@/screens/a1-stats";
import { StatGrid } from "@/kit/panel";
import { unreadCount } from "@/screens/a2-model";
import {
  StateNotice,
  StateSwitcher,
  fmtDate,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./a1.css";

const nameOf = (role: RoleId): string => {
  if (role === "client")
    return FICTIONAL_CLIENT.users[0]?.name.split(" ")[0] ?? "";
  const id = PERSON_OF_ROLE[role];
  return id ? memberName(id).split(" ")[0] : "";
};

const emptied = (content: CardContent): CardContent => ({
  ...content,
  count: 0,
  rows: [],
});

// A1 «Σήμερα»: η αρχική σελίδα κάθε Χρήστη. Κάρτες από τις ουρές του, κάθε μία φορτώνει χωριστά.
export function A1({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const isSolo = role === "owner" && query.solo === "1";
  const isEditing = query.edit === "1";
  const keep = { cards: query.cards, solo: query.solo };
  const hrefWith = (cards: string | undefined, editing: boolean) =>
    screenHref(role, "A1", {
      ...keep,
      state: query.state,
      cards,
      edit: editing ? "1" : undefined,
    });

  const available = availableCards(CARD_CATALOGUE, role, isSolo);
  const layout = parseLayout(query.cards);
  const chosen = chosenCards(available, layout);
  const built = chosen.map((card) => {
    const content = card.build(role);
    return { card, content: state === "empty" ? emptied(content) : content };
  });
  const failedId = state === "error" ? built[0]?.card.id : undefined;
  const quiet = built.filter(
    ({ card, content }) =>
      card.id !== failedId && card.kind === "action" && content.count === 0,
  );
  const visible = built.filter((item) => !quiet.includes(item));
  const stats = pickStats(visible.filter(({ card }) => card.id !== failedId));
  const unread = state === "empty" ? 0 : unreadCount(inboxOf(role));
  const isAllClear = visible.every(
    ({ card, content }) => card.kind !== "action" && content.count === 0,
  );

  return (
    <>
      <StateSwitcher role={role} code="A1" state={state} keep={keep} />
      {role === "owner" && (
        <nav className="sw" aria-label="Ομάδα">
          <span>Ομάδα:</span>
          <Link
            href={screenHref(role, "A1", {
              ...keep,
              solo: undefined,
              state: query.state,
            })}
            aria-current={!isSolo}
          >
            με ομάδα
          </Link>
          <span>· </span>
          <Link
            href={screenHref(role, "A1", {
              ...keep,
              solo: "1",
              state: query.state,
            })}
            aria-current={isSolo}
          >
            μόνος Ιδιοκτήτης
          </Link>
        </nav>
      )}
      <section className="a1-hello">
        <div>
          <p className="eyebrow">{fmtDate(TODAY)}</p>
          <h2>Καλημέρα{nameOf(role) ? `, ${nameOf(role)}` : ""}</h2>
        </div>
        <div className="btn-row">
          <Link href={screenHref(role, "A2", {})}>
            {unread === 0
              ? "Καμία νέα Ειδοποίηση"
              : unread === 1
                ? "1 νέα Ειδοποίηση →"
                : `${unread} νέες Ειδοποιήσεις →`}
          </Link>
          {!isEditing && (
            <Link className="button" href={hrefWith(query.cards, true)}>
              Προσαρμογή
            </Link>
          )}
        </div>
      </section>

      {isEditing && (
        <Customize
          available={available}
          shown={chosen.map((card) => card.id)}
          isDefault={layout === null}
          hrefWith={hrefWith}
        />
      )}

      {state === "empty" && isAllClear && (
        <StateNotice kind="empty" title="Όλα καθαρά">
          Δεν σε περιμένει τίποτα. Ό,τι νέο έρθει θα εμφανιστεί εδώ, στη σειρά
          που διάλεξες.
        </StateNotice>
      )}

      {stats.length > 0 && (
        <div className="a1-stats">
          <StatGrid items={stats} />
        </div>
      )}

      {chosen.length === 0 ? (
        <StateNotice kind="empty" title="Έκρυψες όλες τις κάρτες">
          Πάτα «Προσαρμογή» για να εμφανίσεις όσες θέλεις, ή{" "}
          <Link href={hrefWith(undefined, false)}>γύρνα στην προεπιλογή</Link>.
        </StateNotice>
      ) : (
        <div className="a1-grid">
          {visible.map(({ card, content }) =>
            card.id === failedId ? (
              <CardError
                key={card.id}
                card={card}
                retryHref={screenHref(role, "A1", keep)}
              />
            ) : (
              <TodayCard key={card.id} card={card} content={content} />
            ),
          )}
        </div>
      )}
      <QuietCards
        cards={quiet.map(({ card }) => card)}
        hrefOf={(card: CardDef) => card.build(role).allHref}
      />
    </>
  );
}
