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
import type {
  TodayCounts,
  TodayKpis,
  TodayMoney,
  TodayTeam,
} from "../view-schema";
import { athensStamp, type Built } from "./a1-adapter";
import { briefOf } from "./a1-brief";
import { rankDecisions } from "./a1-decisions";
import { isNewSince, newChipOf, withoutLater } from "./a1-later";
import { leadOf } from "./a1-lead";
import { listOf, remainingOf } from "./a1-list";
import { TodayList, TopLine } from "./a1-list-view";
import { KpiBrief } from "./a1-kpis-panel";
import { loadCards } from "./a1-load";
import { MoneyBrief } from "./a1-money-panel";
import { MoneyPanel, ProgrammePanel } from "./a1-panels";
import {
  programmeDateOf,
  programmeOf,
  programmeRowsOf,
  type Programme,
} from "./a1-programme";
import { TeamBrief } from "./a1-team-panel";
import { companyStateOf, toInvoiceCentsOf, toplineOf } from "./a1-topline";
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

interface PanelsProps {
  kpis: TodayKpis | null;
  programme: { data: Programme; href: string } | null;
  money: { data: TodayMoney | null; card: Built } | null;
  team: TodayTeam | null;
}

// Τα πάνελ της ενημέρωσης (Δείκτες, Πρόγραμμα, Χρήματα, Η ομάδα): μέσα στη γραμμή κορυφής, κλειστά από προεπιλογή.
function TodayPanels({ kpis, programme, money, team }: PanelsProps) {
  return (
    <>
      {kpis && <KpiBrief kpis={kpis} />}
      {programme && (
        <ProgrammePanel programme={programme.data} href={programme.href} />
      )}
      {(money || team) && (
        <div className="a1-pair">
          {money &&
            (money.data ? (
              <MoneyBrief
                money={money.data}
                href={money.card.content.allHref}
              />
            ) : (
              <MoneyPanel content={money.card.content} />
            ))}
          {team && <TeamBrief team={team} />}
        </div>
      )}
    </>
  );
}

// Η Σήμερα της ομάδας ως ενημέρωση (#241): μία πρόταση, και από κάτω η λίστα σε 7 ομάδες με γραμμή κορυφής.
// Οι κρυφές κάρτες (Προσαρμογή) δεν φορτώνονται καθόλου (loadCards).
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
  const shownCodes = counts.cards
    .filter((card) => !card.hidden)
    .map((card) => card.code);
  const shown = new Set(shownCodes);
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
  // Οι γραμμές που πήγαν «Αργότερα» (Σ8) βγαίνουν από κάθε κάρτα: από τη λίστα, το πλήθος και την κορυφή.
  const unsnoozed = withoutLater(
    loaded.map((item) => item.built),
    visit.snoozed,
  );
  const brief = briefOf({
    built: unsnoozed.cards,
    failed,
    groupOf: (code) => groups.get(code),
    hasMoneyPanel: money !== null,
  });
  const ranked = rankDecisions(withoutRepeats(brief.decisions, null));
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
  const list = listOf({ built: unsnoozed.cards, failed, stamp });
  // Το σήμα «νέα» μετράει τις γραμμές που φαίνονται, όχι όλες τις φορτωμένες.
  const newChip = newChipOf(
    list
      .flatMap((group) => group.lines)
      .filter((line) => isNewSince(line.row, visit.seenAt)).length,
  );
  const topline = toplineOf({
    remaining: remainingOf(list),
    overdueCents: money?.overdueCents ?? null,
    toInvoiceCents: toInvoiceCentsOf(list),
    canSeeAmounts: money !== null,
  });
  const panels = (
    <TodayPanels
      kpis={kpis}
      programme={
        programme && brief.week
          ? { data: programme, href: brief.week.content.allHref }
          : null
      }
      money={brief.money ? { data: money, card: brief.money } : null}
      team={team}
    />
  );
  return (
    <>
      {hello(newChip)}
      {lead && <p className="a1-lead">{lead}</p>}
      {children}
      {layout.isAllHidden ? (
        <>
          <TopLine topline={topline} panels={panels} />
          <StateNotice kind="empty" title="Έκρυψες όλες τις κάρτες">
            Πάτα «Προσαρμογή» για να εμφανίσεις όσες θέλεις, ή{" "}
            <Link href={CUSTOMIZE_PATH}>γύρνα στην προεπιλογή</Link>.
          </StateNotice>
        </>
      ) : (
        <TodayList
          topline={topline}
          panels={panels}
          groups={list}
          cards={loaded.map((item) => item.built.card)}
          seenAt={visit.seenAt}
          later={unsnoozed.later}
          stamp={stamp}
          company={companyStateOf(unsnoozed.cards, list)}
        />
      )}
    </>
  );
}
