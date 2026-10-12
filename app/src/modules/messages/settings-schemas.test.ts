import { describe, expect, it } from "vitest";

import {
  messageSettingsFormSchema,
  messageSettingsViewSchema,
} from "./settings-schemas";

const valid = { editMinutes: "20", requestOpenDays: "3" };

describe("messageSettingsFormSchema", () => {
  it("should turn the form text into numbers", () => {
    expect(messageSettingsFormSchema.parse(valid)).toEqual({
      editMinutes: 20,
      requestOpenDays: 3,
    });
  });

  it("should accept the limits and reject values outside them", () => {
    expect(
      messageSettingsFormSchema.safeParse({
        ...valid,
        editMinutes: "1440",
        requestOpenDays: "60",
      }).success,
    ).toBe(true);
    expect(
      messageSettingsFormSchema.safeParse({ ...valid, editMinutes: "0" })
        .success,
    ).toBe(false);
    expect(
      messageSettingsFormSchema.safeParse({ ...valid, editMinutes: "1441" })
        .success,
    ).toBe(false);
    expect(
      messageSettingsFormSchema.safeParse({ ...valid, requestOpenDays: "61" })
        .success,
    ).toBe(false);
  });

  it("should reject empty, decimal and non-numeric text", () => {
    expect(
      messageSettingsFormSchema.safeParse({ ...valid, editMinutes: "" })
        .success,
    ).toBe(false);
    expect(
      messageSettingsFormSchema.safeParse({ ...valid, editMinutes: "1.5" })
        .success,
    ).toBe(false);
    expect(
      messageSettingsFormSchema.safeParse({ ...valid, editMinutes: "abc" })
        .success,
    ).toBe(false);
  });
});

describe("messageSettingsViewSchema", () => {
  it("should read the database JSON", () => {
    expect(
      messageSettingsViewSchema.parse({
        editMinutes: 15,
        requestOpenDays: 3,
      }),
    ).toEqual({
      editMinutes: 15,
      requestOpenDays: 3,
    });
  });
});
