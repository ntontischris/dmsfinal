// Τα ανοιχτά ερωτήματα που δείχνει το πάνελ «Αποφάσεις εδώ».
// Το πάνελ μόνο δείχνει: η απόφαση γράφεται στο Blueprint και μετά το ερώτημα σβήνεται από εδώ.
// Κάθε ticket module προσθέτει τα ερωτήματα των κεφαλαίων του, με επιλογές και σύσταση.

export interface OpenDecision {
  id: string;
  question: string;
  options: readonly string[];
  recommendation?: string;
  source: { label: string; href: string };
  screens: readonly string[];
}

const BLUEPRINT =
  "https://github.com/ntontischris/dmsfinal/blob/main/docs/blueprint";
const CH8_QUESTIONS = {
  label: "Κεφ. 8, Ανοιχτά ερωτήματα",
  href: `${BLUEPRINT}/08-role-guides.md#-ανοιχτά-ερωτήματα`,
};

const ch8 = (
  number: number,
  question: string,
  screens: readonly string[],
): OpenDecision => ({
  id: `ch8-q${number}`,
  question,
  options: [],
  source: {
    label: `${CH8_QUESTIONS.label} #${number}`,
    href: CH8_QUESTIONS.href,
  },
  screens,
});

const chapter = (
  file: "01-backbone",
  label: string,
  number: number,
  question: string,
  options: readonly string[],
  recommendation: string,
  screens: readonly string[],
): OpenDecision => ({
  id: `${file}-q${number}`,
  question,
  options,
  recommendation,
  source: {
    label: `${label} #${number}`,
    href: `${BLUEPRINT}/03-processes/${file}.md#-ανοιχτά-ερωτήματα`,
  },
  screens,
});

const backbone = (
  number: number,
  question: string,
  options: readonly string[],
  recommendation: string,
  screens: readonly string[],
) =>
  chapter(
    "01-backbone",
    "Κεφ. 3.1 Ραχοκοκαλιά, Ανοιχτά ερωτήματα",
    number,
    question,
    options,
    recommendation,
    screens,
  );

export const OPEN_DECISIONS: readonly OpenDecision[] = [];

export const decisionsFor = (code: string): readonly OpenDecision[] =>
  OPEN_DECISIONS.filter((decision) => decision.screens.includes(code));
