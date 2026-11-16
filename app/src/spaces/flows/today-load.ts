import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";
import { parseAuditPage, type AuditItem } from "@/modules/audit";
import { getTodayCounts, loadCards, withoutRepeats } from "@/modules/today";

import { startOfToday } from "./athens-time";
import type { Parked } from "./parked";
import { parsePlaces } from "./place-schema";
import type { QueueRow } from "./queue-rows";
import { closedOf, type ClosedItem } from "./today-closed";
import { noticeRowsOf, parseNotices } from "./today-notices";
import { cardRowsOf, isCardRow } from "./today-rows";

// Οι κάρτες της Σήμερα και το «Τι έκλεισα σήμερα» για τη λίστα, στον server. Ό,τι αποτύχει απλώς λείπει (με σημείωση).

export interface TodayRows {
  cards: readonly QueueRow[];
  // Οι κάρτες που δεν φόρτωσαν: η λίστα το λέει, με σύνδεσμο στην ουρά τους.
  failed: readonly { title: string; href: string }[];
  // null: ο Χρήστης δεν βλέπει το Ίχνος, οπότε το πλήθος δεν είναι γνωστό.
  closed: readonly ClosedItem[] | null;
  // Τα κλειδιά του «Αργότερα» στη βάση· null = η βάση δεν απάντησε, οπότε μένει το «Αργότερα» του browser.
  snoozed: readonly string[] | null;
  // Οι μισοτελειωμένοι οδηγοί στον λογαριασμό· null = δεν διαβάστηκαν (μένει ο browser).
  places: readonly Parked[] | null;
  // Αδιάβαστες Ειδοποιήσεις, για το «Ενημερώσεις (N) →»· null = άγνωστο.
  unread: number | null;
}

const NO_ROWS: TodayRows = {
  cards: [],
  failed: [],
  closed: null,
  snoozed: null,
  places: null,
  unread: null,
};
// Σελίδες των 50 του Ίχνους: όσες χρειάζονται για μια μέρα, με όριο.
const MAX_PAGES = 4;

async function loadCardRows(now: number) {
  const counts = await getTodayCounts();
  if (!counts.ok || !counts.data) return { cards: [], failed: [], unread: null };
  const team = counts.data.cards.filter((card) => isCardRow(card.code));
  const loaded = await loadCards(team);
  const failed = loaded.filter((item) => item.failed);
  const built = withoutRepeats(
    loaded.filter((item) => !item.failed).map((item) => item.built),
    null,
  );
  return {
    unread: counts.data.unreadNotifications,
    cards: cardRowsOf(built, now),
    failed: failed.map(({ built: { card, content } }) => ({
      title: card.title,
      href: content.allHref,
    })),
  };
}

type Supabase = NonNullable<Awaited<ReturnType<typeof createSupabase>>>;

async function auditPage(
  supabase: Supabase,
  who: string,
  cursor: AuditItem | null,
) {
  const { data, error } = await supabase.rpc("audit_trail", {
    p_filters: { who, period: "7d" },
    p_before_at: cursor?.at ?? null,
    p_before_id: cursor?.id ?? null,
  });
  if (error) {
    if (error.code !== "42501") console.error("flows.closed:", error.message);
    return null;
  }
  return parseAuditPage(data);
}

// Οι δικές μου κινήσεις από τα μεσάνυχτα (Αθήνα), νεότερη πρώτη.
async function readMyDay(dayStart: number): Promise<AuditItem[] | null> {
  const supabase = await createSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const items: AuditItem[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const read = await auditPage(supabase, data.user.id, items.at(-1) ?? null);
    if (!read) return page === 0 ? null : items;
    items.push(...read.items);
    const last = read.items.at(-1);
    if (!read.hasMore || !last || Date.parse(last.at) < dayStart) break;
  }
  return items;
}

async function loadClosed(now: number): Promise<readonly ClosedItem[] | null> {
  const dayStart = startOfToday(now);
  try {
    const items = await readMyDay(dayStart);
    return items && closedOf(items, dayStart);
  } catch (error) {
    console.error("flows.closed:", error);
    return null;
  }
}

// Οι αδιάβαστες Ειδοποιήσεις του Χρήστη (οι 50 νεότερες)· σφάλμα = καμία γραμμή Ειδοποίησης.
async function loadNotices(supabase: Supabase | null) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("notifications_list", {
    p_filter: "unread",
    p_limit: 50,
  });
  if (error) {
    if (error.code !== "42501") console.error("flows.notices:", error.message);
    return [];
  }
  return parseNotices(data);
}

async function loadSnoozed(
  supabase: Supabase | null,
): Promise<readonly string[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("today_snoozed");
  if (error) {
    if (error.code !== "42501") console.error("flows.snoozed:", error.message);
    return null;
  }
  const parsed = z.array(z.string()).safeParse(data);
  return parsed.success ? parsed.data : null;
}

async function loadPlaces(
  supabase: Supabase | null,
): Promise<readonly Parked[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("today_places");
  if (error) {
    if (error.code !== "42501") console.error("flows.places:", error.message);
    return null;
  }
  return parsePlaces(data);
}

export async function loadTodayRows(now: number): Promise<TodayRows> {
  try {
    const supabase = await createSupabase();
    const [rows, closed, notices, snoozed, places] = await Promise.all([
      loadCardRows(now),
      loadClosed(now),
      loadNotices(supabase),
      loadSnoozed(supabase),
      loadPlaces(supabase),
    ]);
    const cards = [...rows.cards, ...noticeRowsOf(notices, rows.cards, now)];
    return { ...rows, cards, closed, snoozed, places };
  } catch (error) {
    console.error("flows.today:", error);
    return NO_ROWS;
  }
}
