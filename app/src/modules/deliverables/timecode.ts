// Ο χρόνος ενός σχολίου γράφεται με το χέρι ως mm:ss (Π5). Εδώ μετατρέπεται σε δευτερόλεπτα και ξανά πίσω.

const TIMECODE = /^(\d{1,2}):([0-5]\d)$/;
const MAX_SECONDS = 86399; // η βάση δέχεται έως 23:59:59

// Κενό κείμενο = χωρίς χρόνο (null). Μη έγκυρη μορφή = undefined, ώστε η φόρμα να γράψει μήνυμα.
export const parseTimecode = (text: string): number | null | undefined => {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const match = trimmed.match(TIMECODE);
  if (!match) return undefined;
  const seconds = Number(match[1]) * 60 + Number(match[2]);
  return seconds <= MAX_SECONDS ? seconds : undefined;
};

export const formatTimecode = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
};
