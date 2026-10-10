import { describe, expect, it } from "vitest";

import { serializeFormData } from "./form-changed";

function formDataOf(entries: Array<[string, string]>): FormData {
  const data = new FormData();
  for (const [name, value] of entries) data.append(name, value);
  return data;
}

describe("serializeFormData", () => {
  it("δίνει το ίδιο κείμενο για ίδιες τιμές, ανεξάρτητα από τη σειρά των πεδίων", () => {
    const first = serializeFormData(formDataOf([["name", "Άννα"], ["city", "Αθήνα"]]));
    const second = serializeFormData(formDataOf([["city", "Αθήνα"], ["name", "Άννα"]]));
    expect(first).toBe(second);
  });

  it("δίνει διαφορετικό κείμενο όταν αλλάζει μία τιμή", () => {
    const saved = serializeFormData(formDataOf([["rate", "10"]]));
    const edited = serializeFormData(formDataOf([["rate", "12"]]));
    expect(edited).not.toBe(saved);
  });

  it("μετράει ως αλλαγή το checkbox που ξετσεκάρεται", () => {
    const checked = serializeFormData(formDataOf([["active", "on"]]));
    const unchecked = serializeFormData(formDataOf([]));
    expect(unchecked).not.toBe(checked);
  });

  it("μετράει ως αλλαγή την προσθήκη ή αφαίρεση επιλογής σε πολλαπλή επιλογή", () => {
    const saved = serializeFormData(formDataOf([["roles", "a"], ["roles", "b"]]));
    const edited = serializeFormData(formDataOf([["roles", "a"]]));
    expect(edited).not.toBe(saved);
  });

  it("αγνοεί τη σειρά των τιμών σε πολλαπλή επιλογή", () => {
    const first = serializeFormData(formDataOf([["roles", "a"], ["roles", "b"]]));
    const second = serializeFormData(formDataOf([["roles", "b"], ["roles", "a"]]));
    expect(first).toBe(second);
  });

  it("χρησιμοποιεί το όνομα αρχείου για πεδία αρχείου", () => {
    const withFile = new FormData();
    withFile.append("logo", new File(["x"], "logo.png", { type: "image/png" }));
    const other = new FormData();
    other.append("logo", new File(["y"], "other.png", { type: "image/png" }));
    expect(serializeFormData(withFile)).not.toBe(serializeFormData(other));
  });
});
