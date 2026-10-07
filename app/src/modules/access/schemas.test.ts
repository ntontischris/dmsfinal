import { describe, expect, it } from "vitest";

import { loginSchema, newPasswordSchema, safeNext } from "./schemas";

describe("safeNext", () => {
  it("κρατά μια διεύθυνση του συστήματος", () => {
    expect(safeNext("/app/kit?f=open")).toBe("/app/kit?f=open");
  });

  it("γυρίζει στο /app για εξωτερικές ή άγνωστες διευθύνσεις", () => {
    expect(safeNext("https://example.com")).toBe("/app");
    expect(safeNext("//example.com/app")).toBe("/app");
    expect(safeNext("/login")).toBe("/app");
    expect(safeNext(null)).toBe("/app");
  });
});

describe("κωδικός", () => {
  it("θέλει τουλάχιστον 10 χαρακτήρες", () => {
    expect(newPasswordSchema.safeParse({ password: "short", confirm: "short" }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: "μακρύς-κωδικός", confirm: "μακρύς-κωδικός" }).success).toBe(true);
  });

  it("θέλει τους δύο κωδικούς ίδιους", () => {
    expect(newPasswordSchema.safeParse({ password: "μακρύς-κωδικός", confirm: "άλλος-κωδικός!" }).success).toBe(false);
  });
});

describe("είσοδος", () => {
  it("θέλει έγκυρο email", () => {
    expect(loginSchema.safeParse({ email: "όχι-email", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "maria@example.com", password: "x" }).success).toBe(true);
  });
});
