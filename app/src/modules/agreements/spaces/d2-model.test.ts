import { describe, expect, it } from "vitest";

import type { AgreementDetail, Can, KindInfo } from "../types";
import {
  approvedRevisionOf,
  hoursText,
  lineDeviationsOf,
  lineProvisionsText,
  pathHint,
  usedKindsOf,
} from "./d2-model";

const can = (edit: boolean) => ({ edit }) as Can;

const kind = (id: string, label: string, unit: string): KindInfo => ({
  id,
  label,
  labelEn: label,
  unit,
  unitEn: unit,
  sort: 0,
  isRetired: false,
  revisionLimit: null,
});

describe("pathHint", () => {
  it("should explain a draft only to whoever edits it", () => {
    const base = {
      state: "proposal",
      path: "draft",
      validUntil: "2026-11-20",
    } as const;
    expect(pathHint({ ...base, can: can(true) })).toMatch(/^Σε σύνταξη/);
    expect(pathHint({ ...base, can: can(false) })).toBeNull();
  });

  it("should give the validity date when the proposal was sent", () => {
    expect(
      pathHint({
        state: "proposal",
        path: "sent",
        validUntil: "2026-11-20",
        can: can(false),
      }),
    ).toContain("20/11/2026");
  });

  it("should say a signed agreement does not change", () => {
    expect(
      pathHint({
        state: "active",
        path: "signed",
        validUntil: "2026-11-20",
        can: can(false),
      }),
    ).toBe("Η Συμφωνία έχει υπογραφεί και δεν αλλάζει.");
  });
});

describe("line helpers", () => {
  const kinds = [kind("k1", "Reel", "reels")];
  const line = {
    provisions: [{ kindId: "k1", quantity: 2, catalogQuantity: null }],
    quantity: 3,
    hoursShoot: 1.5,
    hoursEdit: null,
  };

  it("should multiply provisions by the line quantity", () => {
    expect(lineProvisionsText(line, kinds)).toBe("6 reels");
  });

  it("should show a dash for hours the viewer cannot see", () => {
    expect(hoursText(line)).toBe("1,5 / —");
  });

  it("should list only the kinds that appear in the lines", () => {
    const used = usedKindsOf({ lines: [line] } as unknown as AgreementDetail, [
      ...kinds,
      kind("k2", "Γύρισμα", "Γυρίσματα"),
    ]);
    expect(used).toEqual([{ id: "k1", unit: "reels" }]);
  });

  it("should pick the deviations of one line", () => {
    const deviations = [
      { key: "price:a" },
      { key: "price:b" },
    ] as AgreementDetail["deviations"];
    expect(lineDeviationsOf(deviations, "a")).toHaveLength(1);
  });
});

describe("approvedRevisionOf", () => {
  it("should return the newest approved revision", () => {
    const approval = (state: "approved" | "rejected") =>
      ({ state }) as NonNullable<
        AgreementDetail["revisions"][number]["approval"]
      >;
    const revisions = [
      { number: 1, approval: approval("approved") },
      { number: 2, approval: approval("rejected") },
      { number: 3, approval: null },
    ] as AgreementDetail["revisions"];
    expect(approvedRevisionOf({ revisions })).toBe(1);
    expect(approvedRevisionOf({ revisions: [] })).toBeNull();
  });
});
