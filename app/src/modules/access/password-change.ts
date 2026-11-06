import type { FormState } from "@/lib/form-state";

// Από πού αλλάζει ο κωδικός: «link» = συνεδρία από σύνδεσμο email (πρόσκληση, επαναφορά, είσοδος με email),
// «profile» = ο Χρήστης μπήκε με κωδικό και τον αλλάζει από το Προφίλ, άρα πρέπει να δώσει τον τωρινό.
export type PasswordContext = "link" | "profile";

// Ίδιος κανόνας με το Supabase Auth (Session.IsRecovery): οι συνεδρίες από otp, magic link ή επαναφορά δεν ζητούν
// τον τωρινό κωδικό. Το amr έρχεται από το επαληθευμένο token (getClaims), όχι από τη φόρμα.
const LINK_METHODS = new Set(["otp", "magiclink", "recovery"]);

type AmrClaim = readonly (string | { method: string })[] | undefined;

export const contextFromAmr = (amr: AmrClaim): PasswordContext =>
  (amr ?? []).some((entry) =>
    LINK_METHODS.has(typeof entry === "string" ? entry : entry.method),
  )
    ? "link"
    : "profile";

export const LINK_EXPIRED =
  "Ο σύνδεσμος έληξε ή η συνεδρία τελείωσε. Ζήτησε νέο σύνδεσμο.";

const SESSION_CODES = new Set([
  "session_not_found",
  "session_expired",
  "refresh_token_not_found",
  "refresh_token_already_used",
  "bad_jwt",
  "no_authorization",
  "user_not_found",
]);

const WEAK_REASONS: Readonly<Record<string, string>> = {
  length: "είναι πολύ μικρός",
  characters:
    "θέλει και άλλα είδη χαρακτήρων (π.χ. γράμματα, αριθμούς, σύμβολα)",
  pwned: "έχει εμφανιστεί σε γνωστή διαρροή κωδικών· διάλεξε άλλον",
};

const weakMessage = (reasons: readonly string[]): string => {
  const known = reasons.flatMap((reason) =>
    WEAK_REASONS[reason] ? [WEAK_REASONS[reason]] : [],
  );
  return known.length > 0
    ? `Ο νέος κωδικός δεν έγινε δεκτός: ${known.join("· ")}.`
    : "Ο νέος κωδικός δεν έγινε δεκτός ως αρκετά ισχυρός. Διάλεξε άλλον.";
};

export interface PasswordError {
  code?: string;
  name?: string;
  reasons?: readonly string[];
}

// Το σφάλμα του updateUser σε ειλικρινές μήνυμα. Μόνο η έληξη συνεδρίας λέει «ζήτησε νέο σύνδεσμο».
export function passwordChangeError(error: PasswordError): FormState {
  switch (error.code) {
    case "current_password_invalid":
      return { error: "Ο τωρινός κωδικός δεν είναι σωστός." };
    case "current_password_required":
      return { error: "Γράψε τον τωρινό σου κωδικό." };
    case "same_password":
      return {
        error: "Ο νέος κωδικός πρέπει να είναι διαφορετικός από τον τωρινό.",
      };
    case "weak_password":
      return { error: weakMessage(error.reasons ?? []) };
    case "reauthentication_needed":
    case "reauth_nonce_missing":
    case "reauthentication_not_valid":
      return {
        error:
          "Για ασφάλεια, η αλλαγή θέλει πρόσφατη επιβεβαίωση. Πάτησε «Στείλε μου σύνδεσμο αλλαγής» και άνοιξε τον σύνδεσμο από το email σου.",
      };
    case "over_request_rate_limit":
      return { error: "Πολλές προσπάθειες. Δοκίμασε ξανά σε λίγα λεπτά." };
  }
  if (
    (error.code && SESSION_CODES.has(error.code)) ||
    error.name === "AuthSessionMissingError"
  )
    return { error: LINK_EXPIRED };
  return { error: "Ο κωδικός δεν άλλαξε. Δοκίμασε ξανά σε λίγο." };
}
