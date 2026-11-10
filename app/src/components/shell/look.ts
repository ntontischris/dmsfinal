// Η «εμφάνιση» του κελύφους: η νέα (Χώροι) είναι η προεπιλογή· η παλιά (πλαϊνό μενού) μένει προσωρινά, ώσπου να φύγει τελείως.
// Καθαρό αρχείο, χωρίς next/headers, ώστε να το διαβάζει και ο διακόπτης στον browser.

export const LOOK_COOKIE = "dms-look";
export const SPACES_LOOK = "spaces";
export const CLASSIC_LOOK = "classic";

export type Look = "classic" | "spaces";

// Ρητή τιμή στο cookie κερδίζει· ό,τι άλλο (λείπει, άδειο, άγνωστο) παίρνει την προεπιλογή.
export const parseLook = (
  value: string | undefined,
  fallback: Look = "spaces",
): Look => {
  if (value === SPACES_LOOK) return "spaces";
  if (value === CLASSIC_LOOK) return "classic";
  return fallback;
};

// Η προεπιλογή του server: τα παλιά e2e τρέχουν με DMS_DEFAULT_LOOK=classic μέχρι να περάσουν στους Χώρους.
export const defaultLookOf = (env: string | undefined): Look =>
  env === CLASSIC_LOOK ? "classic" : "spaces";
