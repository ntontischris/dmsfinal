// PROTOTYPE του ticket «Οπτική κατεύθυνση» (#57): τρεις κατευθύνσεις πάνω στην Αρχική (R1)
// και στη Σελίδα Πελάτη (B2), εναλλαγή με ?variant=a|b|c. Μένει μόνο στο branch
// prototype/visual-directions· στο main περνά μόνο η κατεύθυνση που θα κλειδώσει.

export const DIRECTION_KEYS = ["a", "b", "c"] as const;

export type DirectionKey = (typeof DIRECTION_KEYS)[number];

export interface Direction {
  key: DirectionKey;
  name: string;
  traits: string;
}

export const DIRECTIONS: readonly Direction[] = [
  {
    key: "a",
    name: "Κινηματογραφικό",
    traits:
      "Αίθουσα προβολής: κάδρα 21:9, timecodes, μεγάλη τυπογραφία, αργή κίνηση",
  },
  {
    key: "b",
    name: "Ακρίβεια",
    traits: "Εργαλείο: πυκνό, λεπτές γραμμές, μικρά γράμματα, γρήγορη κίνηση",
  },
  {
    key: "c",
    name: "Τολμηρό στούντιο",
    traits:
      "Bento: χρωματιστά πλακίδια, στρογγυλές γωνίες, παιχνιδιάρικη κίνηση",
  },
];

export const DIRECTION_SCREENS = ["R1", "B2"] as const;

export type DirectionScreen = (typeof DIRECTION_SCREENS)[number];

export const isDirectionScreen = (code: string): code is DirectionScreen =>
  (DIRECTION_SCREENS as readonly string[]).includes(code);

export const findDirection = (key: string | null): Direction =>
  DIRECTIONS.find((direction) => direction.key === key) ?? DIRECTIONS[0];
