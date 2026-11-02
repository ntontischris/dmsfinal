// Η «εμφάνιση» του κελύφους: η παλιά (πλαϊνό μενού) μένει η προεπιλογή, η νέα (Χώροι) ανοίγει ανά browser με cookie.
// Καθαρό αρχείο, χωρίς next/headers, ώστε να το διαβάζει και ο διακόπτης στον browser.

export const LOOK_COOKIE = "dms-look";
export const SPACES_LOOK = "spaces";

export type Look = "classic" | "spaces";

// Ό,τι δεν είναι ακριβώς «spaces» (λείπει, άδειο, άγνωστο) σημαίνει την παλιά εμφάνιση.
export const parseLook = (value: string | undefined): Look =>
  value === SPACES_LOOK ? "spaces" : "classic";
