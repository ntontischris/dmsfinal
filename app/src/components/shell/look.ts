// Η «εμφάνιση» του κελύφους: η παλιά (πλαϊνό μενού) ή η νέα (Χώροι). Η προεπιλογή ορίζεται ανά εγκατάσταση
// (DMS_DEFAULT_LOOK), και κάθε browser μπορεί να την αλλάξει με cookie.
// Καθαρό αρχείο, χωρίς next/headers, ώστε να το διαβάζει και ο διακόπτης στον browser.

export const LOOK_COOKIE = "dms-look";
export const SPACES_LOOK = "spaces";
export const CLASSIC_LOOK = "classic";

export type Look = "classic" | "spaces";

// Η προεπιλογή της εγκατάστασης: η νέα μόνο όταν η ρύθμιση λέει ακριβώς «spaces».
export const defaultLookOf = (setting: string | undefined): Look =>
  setting === SPACES_LOOK ? "spaces" : "classic";

// Ρητή επιλογή στο cookie κερδίζει· ό,τι άλλο (λείπει, άδειο, άγνωστο) παίρνει την προεπιλογή.
export const parseLook = (value: string | undefined, fallback: Look): Look => {
  if (value === SPACES_LOOK) return "spaces";
  if (value === CLASSIC_LOOK) return "classic";
  return fallback;
};
