import { describe, expect, it } from "vitest";

import type { Parked } from "./parked";
import type { QueueRow } from "./queue-rows";
import {
  doneOf,
  firstAfter,
  openHrefOf,
  roundCounterOf,
  shownOf,
  withoutXekino,
  withResumed,
  withRoundKeys,
  xekinoPlaceOf,
} from "./xekino-rows";

const row = (key: string, over: Partial<QueueRow> = {}): QueueRow => ({
  key,
  title: key,
  sub: "",
  area: "Χρήματα",
  href: "/app/finance/to-invoice",
  since: 0,
  hasSince: false,
  amountCents: null,
  isNew: false,
  parked: null,
  ...over,
});

const place = (job: string, over: Partial<Parked> = {}): Parked => ({
  job,
  step: 2,
  reason: "exit",
  at: 1,
  ...over,
});

describe("openHrefOf", () => {
  it("should open a card row at its station with the step 2 bar", () => {
    expect(openHrefOf(row("to_invoice:p1"))).toBe(
      "/app/finance/to-invoice?job=xekino-ti-mera&step=2&item=to_invoice%3Ap1",
    );
  });

  it("should open a guide row in its own guide that returns to the list", () => {
    const href = openHrefOf(
      row("apanto-se-pelates", {
        href: "/app/messages?job=apanto-se-pelates&step=1",
      }),
    );
    expect(new URL(href, "http://x").searchParams.get("from")).toBe(
      "/app?job=xekino-ti-mera&step=1",
    );
    expect(href).toContain("job=apanto-se-pelates");
  });
});

describe("shownOf", () => {
  it("should show five rows in total, yesterday first, the rest behind «Περισσότερα»", () => {
    const shown = shownOf({
      fromYesterday: [row("y1"), row("y2"), row("y3")],
      today: [row("t1"), row("t2"), row("t3"), row("t4")],
    });
    expect(shown.fromYesterday.map((item) => item.key)).toEqual([
      "y1",
      "y2",
      "y3",
    ]);
    expect(shown.today.map((item) => item.key)).toEqual(["t1", "t2"]);
    expect(shown.rest.map((item) => item.key)).toEqual(["t3", "t4"]);
  });

  it("should keep more than five from yesterday behind «Περισσότερα» too", () => {
    const yesterday = ["a", "b", "c", "d", "e", "f"].map((key) => row(key));
    const shown = shownOf({ fromYesterday: yesterday, today: [row("t")] });
    expect(shown.fromYesterday).toHaveLength(5);
    expect(shown.today).toHaveLength(0);
    expect(shown.rest.map((item) => item.key)).toEqual(["f", "t"]);
  });
});

describe("resume and highlight", () => {
  it("should put the row I had open first, with «Συνέχισε»", () => {
    const rows = withResumed([row("a"), row("b")], "b");
    expect(rows.map((item) => item.title)).toEqual(["Συνέχισε · b", "a"]);
    expect(withResumed([row("a")], "gone")).toEqual([row("a")]);
  });

  it("should highlight the first row other than the one I just left", () => {
    expect(firstAfter([row("a"), row("b")], "a")?.key).toBe("b");
    expect(firstAfter([row("a")], null)?.key).toBe("a");
    expect(firstAfter([row("a")], "a")).toBeNull();
  });

  it("should keep its own place out of the guide rows", () => {
    const parked = [
      place("xekino-ti-mera", { item: "k" }),
      place("stino-gyrisma"),
    ];
    expect(xekinoPlaceOf(parked)?.item).toBe("k");
    expect(withoutXekino(parked).map((item) => item.job)).toEqual([
      "stino-gyrisma",
    ]);
  });
});

describe("round counter", () => {
  it("should count the rows at opening plus those that arrived since", () => {
    const first = withRoundKeys(null, ["a", "b"], "2026-11-16");
    const later = withRoundKeys(first, ["b", "c"], "2026-11-16");
    expect(roundCounterOf(later, "b")).toBe("Γραμμή 2 από 3");
    expect(roundCounterOf(later, "x")).toBeNull();
  });

  it("should start a new round on a new day", () => {
    const old = withRoundKeys(null, ["a"], "2026-11-15");
    expect(withRoundKeys(old, ["b"], "2026-11-16").keys).toEqual(["b"]);
  });
});

describe("doneOf", () => {
  it("should say «Έγινε ήδη» when the row was gone at the first read", () => {
    expect(doneOf("a", [["b"]])).toEqual({
      wasDoneBefore: true,
      isDone: false,
    });
  });

  it("should mark the row done once it leaves the list", () => {
    expect(doneOf("a", [["a"], ["a"]]).isDone).toBe(false);
    expect(doneOf("a", [["a"], []]).isDone).toBe(true);
  });

  it("should not judge notice rows or before the first read", () => {
    expect(doneOf("notice:x", [[]])).toEqual({
      wasDoneBefore: false,
      isDone: false,
    });
    expect(doneOf("a", [])).toEqual({ wasDoneBefore: false, isDone: false });
  });
});
