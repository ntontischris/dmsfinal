// Ώρα της Αθήνας: η φόρμα δίνει ημερομηνία και ώρα τοιχου της Αθήνας, η βάση παίρνει στιγμή (timestamptz).
// Καθαρές συναρτήσεις, χωρίς βάση και χωρίς Χρήστη.

const ATHENS = "Europe/Athens";

const athensFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: ATHENS,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// Η διαφορά της Αθήνας από το UTC (σε λεπτά) τη στιγμή που δίνεται.
const athensOffsetMinutes = (instant: number): number => {
  const parts = Object.fromEntries(
    athensFormat
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value]),
  );
  const wall = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (wall - Math.floor(instant / 1000) * 1000) / 60_000;
};

// «2026-10-09» και «14:30» της Αθήνας → ISO στιγμή (UTC). Η δεύτερη διόρθωση πιάνει την αλλαγή της ώρας.
export const athensToIso = (date: string, time: string): string => {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const firstGuess = wall - athensOffsetMinutes(wall) * 60_000;
  return new Date(
    wall - athensOffsetMinutes(firstGuess) * 60_000,
  ).toISOString();
};

// Η ημέρα της Αθήνας μιας στιγμής, ως «ΕΕΕΕ-ΜΜ-ΗΗ».
export const athensDate = (instant: Date | string): string => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ATHENS,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

// Ώρα της Αθήνας μιας στιγμής, ως «ΩΩ:ΛΛ» (για τις φόρμες επεξεργασίας).
export const athensTime = (instant: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: ATHENS,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));

// Ημερομηνία και ώρα για εμφάνιση, σε Ώρα Ελλάδας.
export const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat("el-GR", {
    timeZone: ATHENS,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

// Η ημερομηνία μόνη της (π.χ. για τις επιλογές της φόρμας).
export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("el-GR", {
    timeZone: ATHENS,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));

// Ώρες με ελληνικό κόμμα: 2 → «2», 2.5 → «2,5».
export const formatHours = (hours: number): string =>
  String(hours).replace(".", ",");
