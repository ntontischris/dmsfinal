// E6 (νέα εμφάνιση): τα Γυρίσματά μου (filming_mine_view) και το τελευταίο Δελτίο (filming_sheet_view) στο σχήμα του
// prototype. Καθαρές συναρτήσεις.

import { athensDate, athensTime, formatDate } from "../helpers-time";
import { NO_CLIENT_LABEL } from "../labels";
import type { SheetView } from "../sheet-types";
import type { MineEntry } from "../types";
import type { E1Filming, StatusLook } from "./e1-groups";
import { statusLook } from "./e1-groups";
import { e1FilmingOf } from "./e1-adapter";
import { RESPONSE_WORDS } from "./e3-model";

const HOUR_MS = 3_600_000;

// «21/09/2026 10:00–13:00» σε ώρα Αθήνας.
export const mineWhen = (startsAt: string, hours: number): string =>
  `${formatDate(startsAt)} ${athensTime(startsAt)}–${athensTime(
    new Date(Date.parse(startsAt) + hours * HOUR_MS).toISOString(),
  )}`;

// Περιμένει απάντηση όταν υπάρχει Δελτίο και το μέλος δεν έχει απαντήσει στην τρέχουσα έκδοση.
export const awaitsAnswer = (entry: MineEntry): boolean =>
  entry.sheetVersion !== null && entry.myVersion !== entry.sheetVersion;

export const asFilming = (entry: MineEntry): E1Filming =>
  e1FilmingOf({
    id: entry.id,
    startsAt: entry.startsAt,
    hours: entry.hours,
    state: entry.state,
    client: entry.client,
    production: entry.production,
    crew: null,
    signals: {
      equipmentConflict: false,
      isExtra: false,
      cancelRequest: false,
      crewDeclined: false,
      slotProblem: null,
      pendingReschedule: null,
    },
  });

export interface E6Sheet {
  filmingId: string;
  clientName: string;
  where: string;
  when: string;
  version: number;
  change: string | null;
  sentAt: string;
  crew: readonly { name: string; isMe: boolean }[];
  equipment: readonly string[];
  shotList: readonly string[];
  crewNote: string | null;
  state: StatusLook;
  myResponse: string;
  myReason: string | null;
  awaitsAnswer: boolean;
}

// Το Δελτίο όπως στάλθηκε (στιγμιότυπο της έκδοσης) και η απάντηση του μέλους. Χωρίς έκδοση = null.
export const e6SheetOf = (
  entry: MineEntry,
  sheet: SheetView | null,
  viewerId: string,
  nowMs: number,
): E6Sheet | null => {
  const latest = sheet?.latest;
  const current = sheet?.current;
  if (!latest || !current) return null;
  return {
    filmingId: entry.id,
    clientName: latest.client ?? NO_CLIENT_LABEL,
    where: latest.location ?? "—",
    when: mineWhen(latest.startsAt, latest.hours),
    version: current.version,
    change: current.change,
    sentAt: formatDate(current.issuedAt),
    crew: latest.crew.map((member) => ({
      name: member.name,
      isMe: member.userId === viewerId,
    })),
    equipment: latest.equipment.map((item) => item.name),
    shotList: latest.shots.map((shot) => shot.text),
    crewNote: latest.crewNote,
    state: statusLook(asFilming(entry), nowMs),
    myResponse: RESPONSE_WORDS[entry.myResponse],
    myReason: entry.myReason,
    awaitsAnswer: awaitsAnswer(entry),
  };
};

export const dayOf = (entry: MineEntry): string => athensDate(entry.startsAt);
