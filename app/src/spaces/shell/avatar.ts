// Το avatar του μενού προφίλ: τα αρχικά του Χρήστη που είναι συνδεδεμένος, όχι του Ρόλου του.

// Κεφαλαία χωρίς τόνο: «Άρης Κωνσταντίνου» → «ΑΚ».
export const initialsOf = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleUpperCase("el");
