// I7 (νέα εμφάνιση): το διάστημα που διαβάζει η Κερδοφορία. Καθαρή συνάρτηση.

// Ο πρώτος μήνας (YYYY-MM-01) ενός διαστήματος `count` μηνών που τελειώνει στον `current` (μέσα και οι δύο).
export const firstMonthOf = (current: string, count: number): string => {
  const [year, month] = current.split("-").map(Number);
  const index = (year ?? 0) * 12 + (month ?? 1) - 1 - (count - 1);
  const m = (index % 12) + 1;
  return `${Math.floor(index / 12)}-${String(m).padStart(2, "0")}-01`;
};
