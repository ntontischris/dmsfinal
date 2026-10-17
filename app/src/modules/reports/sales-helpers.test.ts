import { describe, expect, it } from "vitest";

import {
  managerLabel,
  monthlyOrDash,
  opportunityHref,
  opportunityValue,
} from "./sales-helpers";

describe("opportunityHref", () => {
  it("should link a report row to its opportunity", () => {
    expect(opportunityHref("o-1")).toBe("/app/pipeline/o-1");
  });
});

describe("monthlyOrDash", () => {
  it("should show a dash without amounts", () => {
    expect(monthlyOrDash(null)).toBe("—");
  });

  it("should mark a monthly amount per month", () => {
    expect(monthlyOrDash(1000)).toMatch(/\/μήνα$/);
  });
});

describe("opportunityValue", () => {
  it("should say there is no proposal when the opportunity has no agreement", () => {
    expect(opportunityValue(null, null)).toBe("Χωρίς πρόταση");
  });

  it("should keep monthly and one-off values apart", () => {
    expect(opportunityValue("monthly", 500)).toMatch(/\/μήνα$/);
    expect(opportunityValue("one_off", 500)).not.toMatch(/μήνα/);
  });

  it("should hide the value without amounts but keep the kind", () => {
    expect(opportunityValue("one_off", null)).toBe("—");
  });
});

describe("managerLabel", () => {
  it("should name the queue when nobody manages the opportunity", () => {
    expect(managerLabel(null)).toBe("Χωρίς υπεύθυνο");
    expect(managerLabel("Άννα")).toBe("Άννα");
  });
});
