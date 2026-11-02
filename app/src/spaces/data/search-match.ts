// Ταίριασμα της αναζήτησης (Ctrl+K): χωρίς τόνους και κεφαλαία, με αρχή λέξης, και ο πληθυντικός βρίσκει τον ενικό.
// Χωριστό αρχείο από τα αποτελέσματα, για να μη φορτώνει ο browser όλα τα δεδομένα.

// Μικρές λέξεις που δεν κρίνουν τίποτα («τζίρος ανά πελάτη»).
const SKIP = new Set(["ανα", "και", "του", "της", "των", "για", "στο", "στη", "στα", "με", "σε"]);

const normalize = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("el")
    .replace(/ς/g, "σ");

const wordsOf = (text: string): readonly string[] =>
  normalize(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

// Η ρίζα: κόβεται η κατάληξη, ώστε «εισπραξη» → «εισπρα» να βρίσκει «εισπραξεις».
const stemOf = (word: string): string => {
  if (word.length >= 7) return word.slice(0, -2);
  if (word.length >= 5) return word.slice(0, -1);
  return word;
};

export const matchesSearch = (text: string, term: string): boolean => {
  const words = wordsOf(text);
  return wordsOf(term)
    .filter((word) => !SKIP.has(word))
    .map(stemOf)
    .every((stem) => words.some((word) => word.startsWith(stem)));
};
