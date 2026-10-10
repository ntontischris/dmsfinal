import { describe, expect, it } from "vitest";

import { isCronAuthorized } from "./outbox-trigger";

describe("isCronAuthorized", () => {
  it("δέχεται το σωστό Bearer του CRON_SECRET", () => {
    expect(isCronAuthorized("Bearer s3cret-value", "s3cret-value")).toBe(true);
  });

  it("απορρίπτει λάθος ή λείπον μυστικό", () => {
    expect(isCronAuthorized("Bearer other", "s3cret-value")).toBe(false);
    expect(isCronAuthorized(null, "s3cret-value")).toBe(false);
  });

  it("απορρίπτει όλα όταν δεν έχει οριστεί CRON_SECRET", () => {
    expect(isCronAuthorized("Bearer ", undefined)).toBe(false);
  });
});
