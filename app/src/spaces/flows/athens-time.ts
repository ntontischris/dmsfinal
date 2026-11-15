// Ώρα Αθήνας για την ουρά (καθαρό αρχείο): «από χθες», «Αύριο 09:00», «πριν από 3 ώρες».

const ZONE = "Europe/Athens";
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const wallFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const partOf = (parts: Intl.DateTimeFormatPart[], type: string): number =>
  Number(parts.find((part) => part.type === type)?.value);

// Η ώρα τοίχου της Αθήνας ως ms «σαν UTC».
const wallOf = (ms: number): number => {
  const parts = wallFormat.formatToParts(ms);
  return Date.UTC(
    partOf(parts, "year"),
    partOf(parts, "month") - 1,
    partOf(parts, "day"),
    partOf(parts, "hour"),
    partOf(parts, "minute"),
  );
};

const offsetAt = (ms: number): number =>
  wallOf(ms) - Math.floor(ms / MINUTE) * MINUTE;

// «ΕΕΕΕ-ΜΜ-ΗΗ» στην Αθήνα.
export const athensDay = (ms: number): string =>
  new Date(wallOf(ms)).toISOString().slice(0, 10);

// Η στιγμή (ms) που η Αθήνα δείχνει τη μέρα στις `hour`:00.
export const athensAt = (day: string, hour: number): number => {
  const [year, month, date] = day.split("-").map(Number);
  const wall = Date.UTC(year, month - 1, date, hour);
  return wall - offsetAt(wall - offsetAt(wall));
};

export const addDays = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY)
    .toISOString()
    .slice(0, 10);

// 0 = Κυριακή … 6 = Σάββατο.
const weekdayOf = (day: string): number =>
  new Date(`${day}T00:00:00Z`).getUTCDay();

export const startOfToday = (now: number): number =>
  athensAt(athensDay(now), 0);

export interface LaterOption {
  label: string;
  until: number;
}

// Οι έτοιμες ώρες του «Αργότερα».
export const laterOptions = (now: number): readonly LaterOption[] => {
  const today = athensDay(now);
  const toMonday = (8 - weekdayOf(today)) % 7 || 7;
  return [
    { label: "Σε 3 ώρες", until: now + 3 * 60 * MINUTE },
    { label: "Αύριο 09:00", until: athensAt(addDays(today, 1), 9) },
    { label: "Δευτέρα 09:00", until: athensAt(addDays(today, toMonday), 9) },
  ];
};

const plural = (count: number, one: string, many: string): string =>
  `πριν από ${count} ${count === 1 ? one : many}`;

// «πριν από 3 ώρες».
export const agoText = (since: number, now: number): string => {
  const minutes = Math.floor((now - since) / MINUTE);
  if (minutes < 1) return "μόλις τώρα";
  if (minutes < 60) return plural(minutes, "λεπτό", "λεπτά");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return plural(hours, "ώρα", "ώρες");
  return plural(Math.floor(hours / 24), "μέρα", "μέρες");
};

const dayFormat = new Intl.DateTimeFormat("el-GR", {
  timeZone: ZONE,
  weekday: "short",
  day: "numeric",
  month: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("el-GR", {
  timeZone: ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// «Δευ 16/11».
export const dayText = (iso: string): string =>
  dayFormat.format(Date.parse(iso));

// «Δευ 09:00».
export const untilText = (until: number): string => timeFormat.format(until);

// Η ώρα της απόδοσης στον server (μία φορά ανά αίτημα).
export const renderTime = (): number => Date.now();
