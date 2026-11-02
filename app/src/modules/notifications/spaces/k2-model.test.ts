import { describe, expect, it } from "vitest";

import { SYSTEM_DEFAULTS } from "@/lib/email/system-defaults";

import type { SystemMessage } from "../automation-view-schema";
import { orDefault, valuesOf, whenEdited } from "./k2-model";

const message = (overrides: Partial<SystemMessage> = {}): SystemMessage => ({
  code: "invite",
  subjectEl: null,
  subjectEn: null,
  bodyEl: null,
  bodyEn: null,
  isEdited: false,
  updatedAt: "2026-09-15T07:30:00Z",
  updatedBy: null,
  variables: ["recipientName", "link"],
  required: ["link"],
  ...overrides,
});

describe("K2", () => {
  it("should show who changed the text and when, in Athens time", () => {
    expect(whenEdited(message({ isEdited: true, updatedBy: "Άννα" }))).toBe(
      "Άννα, 15/09/2026 10:30",
    );
  });

  it("should show nothing for the original text", () => {
    expect(whenEdited(message())).toBe("");
  });

  it("should fill the admin's empty fields with the code's original text", () => {
    const values = valuesOf(
      message({ bodyEl: "Δικό μου κείμενο {link}" }),
      SYSTEM_DEFAULTS.invite,
    );
    expect(values.bodyEl).toBe("Δικό μου κείμενο {link}");
    expect(values.subjectEl).toBe(SYSTEM_DEFAULTS.invite.subject.el);
  });

  it("should preview an emptied field as the original", () => {
    expect(orDefault("  ", "αρχικό")).toBe("αρχικό");
    expect(orDefault("νέο", "αρχικό")).toBe("νέο");
  });
});
