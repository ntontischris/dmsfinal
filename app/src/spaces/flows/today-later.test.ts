import { describe, expect, it } from "vitest";

import {
  dbKeyOf,
  dbKeysOfRows,
  hiddenRowKeys,
  isDbKey,
  laterFromDb,
  nextMorning,
} from "./today-later";

// 2026-11-15 10:00 Αθήνας (UTC+2).
const NOW = Date.parse("2026-11-15T08:00:00Z");
const LATER = NOW + 3_600_000;

describe("dbKeyOf", () => {
  it("should map a guide key to flow:<job> with the chosen time", () => {
    expect(dbKeyOf("apanto-se-pelates", LATER)).toBe(
      `flow:apanto-se-pelates@${LATER}`,
    );
  });

  it("should keep a card key as it is", () => {
    expect(dbKeyOf("decide_requests:abc-1", LATER)).toBe(
      `decide_requests:abc-1@${LATER}`,
    );
  });

  it("should fit the database key for every kind of row", () => {
    [
      "apanto-se-pelates",
      "egkrino-gyrismata",
      "money_overdue:9b2c1d3e-0000-4000-8000-000000000001",
      "notice:/app/proposals/9b2c1d3e-0000-4000-8000-000000000001",
    ].forEach((key) => expect(isDbKey(dbKeyOf(key, LATER))).toBe(true));
  });
});

describe("laterFromDb", () => {
  it("should read back the row key and time", () => {
    const db = laterFromDb([dbKeyOf("apanto-se-pelates", LATER)], NOW);
    expect(db.later).toEqual({ "apanto-se-pelates": LATER });
  });

  it("should give an old key without time the next 08:00", () => {
    const db = laterFromDb(["decide_requests:r1"], NOW);
    expect(db.later["decide_requests:r1"]).toBe(nextMorning(NOW));
    expect(nextMorning(NOW)).toBe(Date.parse("2026-11-16T06:00:00Z"));
  });

  it("should keep the latest time and every key of a row", () => {
    const keys = [dbKeyOf("x:1", LATER), dbKeyOf("x:1", LATER + 1000)];
    const db = laterFromDb(keys, NOW);
    expect(db.later["x:1"]).toBe(LATER + 1000);
    expect(dbKeysOfRows(db, ["x:1", "y:2"])).toEqual(keys);
  });
});

describe("hiddenRowKeys", () => {
  it("should hide only rows whose time has not come", () => {
    const keys = [dbKeyOf("x:1", LATER), dbKeyOf("y:2", NOW - 1000)];
    expect(hiddenRowKeys(keys, NOW)).toEqual(["x:1"]);
  });
});
