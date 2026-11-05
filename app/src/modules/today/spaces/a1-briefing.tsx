import Link from "next/link";
import type { ReactNode } from "react";

import { StateNotice } from "@/spaces/screens/shared";

import { arrangeToday } from "../layout";
import { CUSTOMIZE_PATH } from "../labels";
import type { TodayCounts } from "../view-schema";
import { athensStamp } from "./a1-adapter";
import { briefOf } from "./a1-brief";
import { CardError, TodayCard } from "./a1-card";
import { rankDecisions } from "./a1-decisions";
import { leadOf } from "./a1-lead";
import { loadCards } from "./a1-load";
import {
  DecisionsPanel,
  MoneyPanel,
  OthersFold,
  ProgrammePanel,
} from "./a1-panels";
import { programmeOf } from "./a1-programme";
import { withoutRepeats } from "./a1-zones";

// Η Σήμερα της ομάδας ως ενημέρωση (#241): μία πρόταση, ό,τι περιμένει μόνο εμένα, το πρόγραμμα, τα χρήματα,
// και τα υπόλοιπα σε μία κλειστή γραμμή. Οι κρυφές κάρτες (Προσαρμογή) δεν φορτώνονται καθόλου (loadCards).
export async function TeamBriefing({
  counts,
  children,
}: {
  counts: TodayCounts;
  // Η Προσαρμογή, όταν είναι ανοιχτή: κάτω από την πρόταση, πάνω από τα κομμάτια.
  children?: ReactNode;
}) {
  const layout = arrangeToday(counts.cards);
  const loaded = await loadCards(counts.cards);
  const failed = new Set(
    loaded.filter((item) => item.failed).map((item) => item.built.card.id),
  );
  const groups = new Map(counts.cards.map((card) => [card.code, card.grp]));
  const brief = briefOf({
    built: loaded.map((item) => item.built),
    failed,
    groupOf: (code) => groups.get(code),
  });
  // Κάθε στοιχείο μία φορά: το ίδιο αίτημα σε δύο κάρτες απόφασης φαίνεται μόνο στην πρώτη.
  const ranked = rankDecisions(withoutRepeats(brief.decisions, null));
  const programme = brief.week
    ? programmeOf(brief.week.content.rows, athensStamp(new Date()))
    : null;
  const lead = leadOf({
    filming: programme && { day: programme.day, count: programme.slots.length },
    decisions:
      brief.hasDecisions && !brief.isDecisionsPartial ? ranked.total : null,
    overdue: brief.overdue,
  });
  return (
    <>
      {lead && <p className="a1-lead">{lead}</p>}
      {children}
      {layout.isAllHidden ? (
        <StateNotice kind="empty" title="Έκρυψες όλες τις κάρτες">
          Πάτα «Προσαρμογή» για να εμφανίσεις όσες θέλεις, ή{" "}
          <Link href={CUSTOMIZE_PATH}>γύρνα στην προεπιλογή</Link>.
        </StateNotice>
      ) : (
        <>
          {brief.healthAlert &&
            (failed.has(brief.healthAlert.card.id) ? (
              <CardError card={brief.healthAlert.card} retryHref="/app" />
            ) : (
              <TodayCard
                card={brief.healthAlert.card}
                content={brief.healthAlert.content}
              />
            ))}
          <div className="a1-top">
            {brief.hasDecisions && <DecisionsPanel ranked={ranked} />}
            {programme && brief.week && (
              <ProgrammePanel
                programme={programme}
                href={brief.week.content.allHref}
              />
            )}
          </div>
          {brief.money && <MoneyPanel content={brief.money.content} />}
          <OthersFold
            others={brief.others}
            quiet={brief.quiet}
            healthOk={brief.healthOk}
          />
        </>
      )}
    </>
  );
}
