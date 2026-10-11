import { describe, expect, it } from "vitest";

import { overdueMessageFor } from "./deliver-overdue";

const ORIGIN = "https://dmsfinal-app.vercel.app";
const INVALID = "Μη έγκυρο περιεχόμενο ειδοποίησης";

const payload = { invoiceId: "inv-1", number: "B-1", dueDate: "2026-06-17", remaining: 740 };
const payment = { holder: "Εταιρεία Δοκιμής", bank: "Τράπεζα Δοκιμής", iban: "GR1601101250000000012300695" };

describe("overdueMessageFor", () => {
  it("should write the Greek subject and link to the ledger", () => {
    const message = overdueMessageFor({ to_name: "Πάνος", locale: "el", payload }, ORIGIN);

    expect(message).toMatchObject({ subject: "Ληξιπρόθεσμο τιμολόγιο B-1" });
    expect(typeof message === "string" ? "" : message.html).toContain(`${ORIGIN}/app/finance/ledger`);
  });

  it("should include the payment details only when the payload has them", () => {
    const withPayment = overdueMessageFor({ to_name: "Πάνος", locale: "el", payload: { ...payload, payment } }, ORIGIN);
    const without = overdueMessageFor({ to_name: "Πάνος", locale: "el", payload }, ORIGIN);

    expect(typeof withPayment === "string" ? "" : withPayment.text).toContain(payment.iban);
    expect(typeof without === "string" ? "" : without.text).not.toContain("IBAN");
  });

  it("should write the English subject for the en locale", () => {
    expect(overdueMessageFor({ to_name: "Panos", locale: "en", payload }, ORIGIN)).toMatchObject({
      subject: "Overdue invoice B-1",
    });
  });

  it("should reject a payload that does not match the schema", () => {
    expect(overdueMessageFor({ to_name: "Πάνος", locale: "el", payload: { number: "B-1" } }, ORIGIN)).toBe(INVALID);
  });
});
