// Η Προσαρμογή ως καθαρές συναρτήσεις: μετακίνηση και εμφάνιση/απόκρυψη, χωρίς να αλλάζει ο πίνακας που δόθηκε.

export const moved = (
  codes: readonly string[],
  code: string,
  step: -1 | 1,
): readonly string[] => {
  const from = codes.indexOf(code);
  const to = from + step;
  if (from < 0 || to < 0 || to >= codes.length) return codes;
  return codes.map((other, index) =>
    index === from ? codes[to] : index === to ? code : other,
  );
};

export const toggled = (
  codes: readonly string[],
  code: string,
): readonly string[] =>
  codes.includes(code)
    ? codes.filter((other) => other !== code)
    : [...codes, code];
