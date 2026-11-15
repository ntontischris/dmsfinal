import Link from "next/link";
import type { ReactNode } from "react";

import { StateNotice } from "@/spaces/screens/shared";

import { arrangeToday } from "../layout";
import { CUSTOMIZE_PATH } from "../labels";
import {
  getTodayKpis,
  getTodayMoney,
  getTodayProgramme,
  getTodayTeam,
  getTodayVisit,
} from "../queries";
import type { ReadResult } from "../read";
import type { TodayCounts } from "../view-schema";
import { athensStamp } from "./a1-adapter";
import { briefOf } from "./a1-brief";
import { CardError, TodayCard } from "./a1-card";
import { rankDecisions } from "./a1-decisions";
import { newChipOf, newCountOf, withoutLater } from "./a1-later";
import { leadOf } from "./a1-lead";
import { KpiBrief } from "./a1-kpis-panel";
import { loadCards } from "./a1-load";
import { MoneyBrief } from "./a1-money-panel";
import {
  DecisionsPanel,
  MoneyPanel,
  OthersFold,
  ProgrammePanel,
} from "./a1-panels";
import { programmeDateOf, programmeOf, programmeRowsOf } from "./a1-programme";
import { TeamBrief } from "./a1-team-panel";
import { withoutRepeats } from "./a1-zones";

const MONEY_CARD = "overdue_invoices";
const WEEK_CARD = "week_filming";

// Ένα κομμάτι της ενημέρωσης που δεν φόρτωσε (ή δεν επιτρέπεται) απλώς λείπει· η σελίδα δεν σπάει.
async function partOf<T>(
  label: string,
  read: () => Promise<ReadResult<T | null>>,
): Promise<T | null> {
  try {
    const result = await read();
    return result.ok ? result.data : null;
  } catch (error) {
    console.error(`today briefing ${label}:`, error);
    return null;
  }
}

// Η Σήμερα της ομάδας ως ενημέρωση (#241): μία πρόταση, ό,τι περιμένει μόνο εμένα, το πρόγραμμα, τα χρήματα,
// και τα υπόλοιπα σε μία κλειστή γραμμή. Οι κρυφές κάρτες (Προσαρμογή) δεν φορτώνονται καθόλου (loadCards).
export async function TeamBriefing({
  counts,
  hello,
  children,
}: {
  counts: TodayCounts;
  // Ο χαιρετισμός, με το σήμα «N νέα από την τελευταία φορά» (Σ8) δίπλα στην ημερομηνία.
  hello: (newChip: string | null) => ReactNode;
  // Η Προσαρμογή, όταν είναι ανοιχτή: κάτω από την πρόταση, πάνω από τα κομμάτια.
  children?: ReactNode;
}) {
  const layout = arrangeToday(counts.cards);
  const stamp = athensStamp(new Date());
  // Τα κομμάτια ακολουθούν την Προσαρμογή: κρυφή κάρτα → ούτε το κομμάτι της.
  const shown = new Set(
    counts.cards.filter((card) => !card.hidden).map((card) => card.code),
  );
  // Οι δείκτες (d9) δεν είναι κάρτα: φαίνονται σε όποιον έχει το Δικαίωμα κάθε δείκτη (η βάση κρύβει τους υπόλοιπους).
  const [loaded, money, team, day, visit, kpis] = await Promise.all([
    loadCards(counts.cards),
    shown.has(MONEY_CARD) ? partOf("money", getTodayMoney) : null,
    partOf("team", getTodayTeam),
    shown.has(WEEK_CARD)
      ? partOf("programme", () =>
          getTodayProgramme(programmeDateOf(stamp).date),
        )
      : null,
    getTodayVisit(),
    partOf("kpis", getTodayKpis),
  ]);
  const failed = new Set(
    loaded.filter((item) => item.failed).map((item) => item.built.card.id),
  );
  const groups = new Map(counts.cards.map((card) => [card.code, card.grp]));
  const brief = briefOf({
    built: loaded.map((item) => item.built),
    failed,
    groupOf: (code) => groups.get(code),
    hasMoneyPanel: money !== null,
  });
  // Κάθε στοιχείο μία φορά: το ίδιο αίτημα σε δύο κάρτες απόφασης φαίνεται μόνο στην πρώτη. Όσα πήγαν «Αργότερα»
  // βγαίνουν από τη λίστα και από το πλήθος (Σ8).
  const decisions = withoutLater(
    withoutRepeats(brief.decisions, null),
    visit.snoozed,
  );
  const ranked = rankDecisions(decisions.cards);
  const newChip = newChipOf(newCountOf(decisions.cards, visit.seenAt));
  const programme = brief.week
    ? programmeOf(
        brief.week.content.rows,
        stamp,
        day ? programmeRowsOf(day) : null,
      )
    : null;
  const lead = leadOf({
    filming: programme && { day: programme.day, count: programme.slots.length },
    decisions:
      brief.hasDecisions && !brief.isDecisionsPartial ? ranked.total : null,
    overdue: brief.overdue,
    money: brief.money ? money : null,
  });
  return (
    <>
      {hello(newChip)}
      {lead && <p className="a1-lead">{lead}</p>}
      {children}
      {kpis && <KpiBrief kpis={kpis} />}
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
            {brief.hasDecisions && (
              <DecisionsPanel
                ranked={ranked}
                stamp={stamp}
                seenAt={visit.seenAt}
                later={decisions.later}
              />
            )}
            {programme && brief.week && (
              <ProgrammePanel
                programme={programme}
                href={brief.week.content.allHref}
              />
            )}
          </div>
          {(brief.money || team) && (
            <div className="a1-pair">
              {brief.money &&
                (money ? (
                  <MoneyBrief
                    money={money}
                    href={brief.money.content.allHref}
                  />
                ) : (
                  <MoneyPanel content={brief.money.content} />
                ))}
              {team && <TeamBrief team={team} />}
            </div>
          )}
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
