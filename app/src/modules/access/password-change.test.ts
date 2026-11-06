import { describe, expect, it } from "vitest";

import { contextFromAmr, LINK_EXPIRED, passwordChangeError } from "./password-change";

describe("πλαίσιο αλλαγής κωδικού", () => {
  it("η συνεδρία από σύνδεσμο email (otp, magic link, επαναφορά) δεν ζητά τον τωρινό κωδικό", () => {
    expect(contextFromAmr([{ method: "otp" }])).toBe("link");
    expect(contextFromAmr([{ method: "recovery" }])).toBe("link");
    expect(contextFromAmr(["magiclink"])).toBe("link");
  });

  it("η είσοδος με κωδικό ζητά τον τωρινό", () => {
    expect(contextFromAmr([{ method: "password" }])).toBe("profile");
    expect(contextFromAmr(undefined)).toBe("profile");
  });
});

describe("μήνυμα σφάλματος αλλαγής κωδικού", () => {
  it("λάθος τωρινός κωδικός", () => {
    expect(passwordChangeError({ code: "current_password_invalid" }).error).toBe(
      "Ο τωρινός κωδικός δεν είναι σωστός.",
    );
  });

  it("ίδιος με τον τωρινό", () => {
    expect(passwordChangeError({ code: "same_password" }).error).toBe(
      "Ο νέος κωδικός πρέπει να είναι διαφορετικός από τον τωρινό.",
    );
  });

  it("αδύναμος κωδικός: λέει τους λόγους", () => {
    const message = passwordChangeError({ code: "weak_password", reasons: ["pwned"] }).error;
    expect(message).toContain("διαρροή");
  });

  it("θέλει πρόσφατη επιβεβαίωση: δείχνει τον σύνδεσμο αλλαγής", () => {
    expect(passwordChangeError({ code: "reauthentication_needed" }).error).toContain(
      "Στείλε μου σύνδεσμο αλλαγής",
    );
  });

  it("μόνο η χαμένη συνεδρία λέει ότι έληξε ο σύνδεσμος", () => {
    expect(passwordChangeError({ code: "session_not_found" }).error).toBe(LINK_EXPIRED);
    expect(passwordChangeError({ name: "AuthSessionMissingError" }).error).toBe(LINK_EXPIRED);
    expect(passwordChangeError({ code: "current_password_invalid" }).error).not.toBe(LINK_EXPIRED);
    expect(passwordChangeError({ code: "unexpected_failure" }).error).not.toBe(LINK_EXPIRED);
  });
});
