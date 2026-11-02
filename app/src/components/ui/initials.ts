// Τα αρχικά ενός ονόματος, κεφαλαία χωρίς τόνο: «Άρης Κωνσταντίνου» → «ΑΚ».
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
