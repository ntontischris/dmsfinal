import { describe, expect, it } from "vitest";

import { cardFactory } from "../test-factories";
import { deliverablesStripOf } from "./h1-strip-model";

const ME = "44444444-4444-4444-8444-444444444444";
const OTHER = "55555555-5555-4555-8555-555555555555";

describe("τα τρία χοντρά της καρτέλας Παραδοτέα", () => {
  it("μετρά τα δικά μου, όσα καθυστερούν σε όλη την ουρά και όσα περιμένουν έλεγχο", () => {
    const strip = deliverablesStripOf({
      work: [
        cardFactory({ id: "a", assigneeId: ME, isLate: true }),
        cardFactory({ id: "b", assigneeId: OTHER, isLate: true }),
        cardFactory({ id: "c", assigneeId: ME }),
      ],
      review: [cardFactory({ id: "d" })],
      viewerId: ME,
    });
    expect(
      strip.map(({ label, value, href, tone }) => [label, value, href, tone]),
    ).toEqual([
      ["Δικά μου", "2", "/app/deliverables?who=me", undefined],
      ["Καθυστερούν", "2", "/app/deliverables?late=1", "attention"],
      ["Προς έλεγχο", "1", "/app/deliverables?view=review", "attention"],
    ]);
  });

  it("όποιος δεν ελέγχει δεν βλέπει την κάρτα ελέγχου· χωρίς θεατή τα δικά μου είναι 0", () => {
    const strip = deliverablesStripOf({
      work: [cardFactory({ id: "a", assigneeId: null })],
      review: null,
      viewerId: undefined,
    });
    expect(strip.map(({ label, value }) => [label, value])).toEqual([
      ["Δικά μου", "0"],
      ["Καθυστερούν", "0"],
    ]);
  });
});
