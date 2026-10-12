import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { buildAuthEmail, parseAuthHookPayload } from "./auth-hook";
import { SYSTEM_DEFAULTS } from "./system-defaults";
import {
  SYSTEM_MESSAGE_CODES,
  SYSTEM_SPECS,
  chooseText,
  customizeParts,
  fillTemplate,
  missingRequired,
  unknownVariables,
  type SystemTexts,
} from "./system-texts";
import {
  clearSystemTextsCache,
  readSystemTextsQuick,
  toSystemTexts,
} from "./system-texts-read";

const texts = (over: Partial<SystemTexts>): SystemTexts => ({
  subjectEl: null,
  subjectEn: null,
  bodyEl: null,
  bodyEn: null,
  ...over,
});

describe("chooseText", () => {
  it("should keep the recipient language when nothing was changed", () => {
    expect(chooseText("en", undefined)).toEqual({
      locale: "en",
      subject: null,
      body: null,
    });
  });

  it("should send the Greek text to an English recipient when only Greek was written", () => {
    expect(chooseText("en", texts({ bodyEl: "Γεια" }))).toEqual({
      locale: "el",
      subject: null,
      body: "Γεια",
    });
  });

  it("should use the English text when the admin wrote one", () => {
    expect(
      chooseText("en", texts({ bodyEl: "Γεια", subjectEn: "Hi" })),
    ).toEqual({ locale: "en", subject: "Hi", body: null });
  });
});

describe("fillTemplate and customizeParts", () => {
  const base = {
    heading: "Κώδικας",
    subject: "Devre Media · Κώδικας",
    paragraphs: ["Κείμενο κώδικα"],
  };

  it("should replace known variables and drop unknown ones", () => {
    expect(
      fillTemplate("Γεια {recipientName} {άλλο} {missing}", {
        recipientName: "Μαρία",
      }),
    ).toBe("Γεια Μαρία {άλλο}");
  });

  it("should keep the code text when the admin text is empty", () => {
    expect(customizeParts(base, { subject: "  ", body: null }, {})).toEqual(
      base,
    );
  });

  it("should use the admin subject as heading on one line and split paragraphs on blank lines", () => {
    const parts = customizeParts(
      base,
      { subject: "Γεια\n{recipientName}", body: "Α\n\nΒ {recipientName}" },
      { recipientName: "Νίκος" },
    );
    expect(parts).toEqual({
      heading: "Γεια Νίκος",
      subject: "Γεια Νίκος",
      paragraphs: ["Α", "Β Νίκος"],
    });
  });
});

describe("variable checks", () => {
  it("should find unknown and missing required variables", () => {
    expect(
      unknownVariables(
        "{code} {link} {foo}",
        SYSTEM_SPECS.signing_code.variables,
      ),
    ).toEqual(["link", "foo"]);
    expect(
      missingRequired("Ο κωδικός", SYSTEM_SPECS.signing_code.required),
    ).toEqual(["code"]);
    expect(
      missingRequired("Ο κωδικός {code}", SYSTEM_SPECS.signing_code.required),
    ).toEqual([]);
  });

  it("should write every default text only with the variables of its message", () => {
    for (const code of SYSTEM_MESSAGE_CODES) {
      const all = Object.values(SYSTEM_DEFAULTS[code].subject)
        .concat(Object.values(SYSTEM_DEFAULTS[code].body))
        .join(" ");
      expect(unknownVariables(all, SYSTEM_SPECS[code].variables)).toEqual([]);
      expect(
        missingRequired(
          SYSTEM_DEFAULTS[code].body.el,
          SYSTEM_SPECS[code].required,
        ),
      ).toEqual([]);
    }
  });
});

describe("reading the admin texts", () => {
  it("should keep only known codes", () => {
    const rows = [
      {
        code: "invite",
        subject_el: "Γεια",
        subject_en: null,
        body_el: null,
        body_en: null,
      },
      {
        code: "άλλο",
        subject_el: "x",
        subject_en: null,
        body_el: null,
        body_en: null,
      },
    ];
    expect(toSystemTexts(rows)).toEqual({
      invite: texts({ subjectEl: "Γεια" }),
    });
    expect(toSystemTexts("όχι λίστα")).toEqual({});
  });

  it("should give up after the timeout and send the code text", async () => {
    clearSystemTextsCache();
    const slow = {
      from: () => ({ select: () => new Promise(() => undefined) }),
    } as unknown as SupabaseClient;
    await expect(readSystemTextsQuick(slow, Date.now(), 5)).resolves.toEqual(
      {},
    );
  });
});

describe("buildAuthEmail with admin texts", () => {
  const parsed = parseAuthHookPayload({
    user: {
      email: "maria@example.com",
      user_metadata: { name: "Μαρία", locale: "en" },
    },
    email_data: {
      token_hash: "abc",
      email_action_type: "magiclink",
      redirect_to: "",
    },
  });

  it("should send the admin subject and keep the button with the link", () => {
    if (!parsed.success) throw new Error("σώμα μη έγκυρο στο τεστ");
    const email = buildAuthEmail(parsed.data, "https://dms.example.com", {
      magic_link: texts({ subjectEl: "Είσοδος για {recipientName}" }),
    });
    expect(email?.message.subject).toBe("Είσοδος για Μαρία");
    expect(email?.message.text).toContain(
      "https://dms.example.com/auth/confirm?token_hash=abc&type=magiclink",
    );
    expect(email?.message.html).toContain('lang="el"');
  });
});
