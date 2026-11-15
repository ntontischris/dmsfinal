import { describe, expect, it } from "vitest";

import { clientRequestCodeSchema, clientSignSchema } from "./schemas";

const ID = "11111111-1111-4111-8111-111111111111";

describe("υπογραφή μέσα στην εφαρμογή (b11)", () => {
  it("clientRequestCodeSchema: δέχεται Συμφωνία, όνομα και «Αποδέχομαι»", () => {
    expect(
      clientRequestCodeSchema.safeParse({
        agreementId: ID,
        name: "Κώστας Υπογράφων",
        accepted: true,
      }).success,
    ).toBe(true);
  });

  it("clientRequestCodeSchema: χωρίς «Αποδέχομαι» ή όνομα απορρίπτεται", () => {
    const failsOn = (input: Record<string, unknown>) =>
      clientRequestCodeSchema.safeParse(input).error?.issues[0]?.path[0];
    expect(failsOn({ agreementId: ID, name: "Κ", accepted: false })).toBe(
      "accepted",
    );
    expect(failsOn({ agreementId: ID, name: "  ", accepted: true })).toBe(
      "name",
    );
    expect(
      failsOn({ agreementId: ID, name: "x".repeat(121), accepted: true }),
    ).toBe("name");
  });

  it("δεν δέχεται token ή άκυρο id στη θέση της Συμφωνίας", () => {
    expect(
      clientRequestCodeSchema.safeParse({
        agreementId: "a".repeat(64),
        name: "Κ",
        accepted: true,
      }).success,
    ).toBe(false);
    expect(
      clientSignSchema.safeParse({ agreementId: "x", code: "123456" }).success,
    ).toBe(false);
  });

  it("clientSignSchema: ακριβώς 6 ψηφία", () => {
    const ok = (code: string) =>
      clientSignSchema.safeParse({ agreementId: ID, code }).success;
    expect(ok("481920")).toBe(true);
    expect(ok("48192")).toBe(false);
    expect(ok("4819201")).toBe(false);
    expect(ok("48 920")).toBe(false);
  });
});
