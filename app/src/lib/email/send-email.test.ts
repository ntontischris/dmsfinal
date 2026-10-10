import { afterEach, describe, expect, it, vi } from "vitest";

import {
  decideDelivery,
  isAllowedRecipient,
  readEmailEnv,
  sendEmail,
  type EmailEnv,
} from "./send-email";

const env = (overrides: Partial<EmailEnv> = {}): EmailEnv => ({
  apiKey: "",
  from: "Devre Media <noreply@devremedia.com>",
  allowedDomains: [],
  isLocal: true,
  isPreview: false,
  ...overrides,
});

const message = {
  to: "maria@example.com",
  toName: "Μαρία",
  subject: "Θέμα",
  html: "<p>x</p>",
  text: "x",
};

const okFetch = () =>
  vi.fn(
    async () => new Response(JSON.stringify({ id: "re_123" }), { status: 200 }),
  ) as unknown as typeof fetch;

afterEach(() => vi.restoreAllMocks());

describe("isAllowedRecipient", () => {
  it("δέχεται οποιονδήποτε όταν η λίστα είναι κενή", () => {
    expect(isAllowedRecipient("a@anywhere.org", [])).toBe(true);
  });

  it("δέχεται μόνο τα domains της λίστας", () => {
    expect(isAllowedRecipient("a@devremedia.com", ["devremedia.com"])).toBe(
      true,
    );
    expect(isAllowedRecipient("a@gmail.com", ["devremedia.com"])).toBe(false);
  });
});

describe("readEmailEnv", () => {
  it("διαβάζει τη λίστα domains χωρίς κενά και κεφαλαία", () => {
    const parsed = readEmailEnv({
      EMAIL_ALLOWED_DOMAINS: " DevreMedia.com , example.com ",
    });
    expect(parsed.allowedDomains).toEqual(["devremedia.com", "example.com"]);
  });

  it("είναι τοπικό μόνο όταν λείπει το VERCEL", () => {
    expect(readEmailEnv({}).isLocal).toBe(true);
    expect(
      readEmailEnv({ VERCEL: "1", VERCEL_ENV: "production" }).isLocal,
    ).toBe(false);
  });

  it("βάζει τον προεπιλεγμένο αποστολέα όταν λείπει το RESEND_FROM_EMAIL", () => {
    expect(readEmailEnv({}).from).toBe("Devre Media <noreply@devremedia.com>");
  });
});

describe("decideDelivery", () => {
  it("γράφει «suppressed» χωρίς να καλέσει τον πάροχο όταν ο παραλήπτης είναι εκτός λίστας", async () => {
    const fetchImpl = okFetch();
    const outcome = await sendEmail(message, {
      env: env({ apiKey: "k", allowedDomains: ["devremedia.com"] }),
      fetchImpl,
    });
    expect(outcome.status).toBe("suppressed");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("δίνει «local» χωρίς κλειδί μόνο τοπικά", () => {
    expect(decideDelivery(message, env())).toEqual({
      status: "sent",
      providerId: "local",
      error: "",
    });
  });

  it("αποτυγχάνει χωρίς κλειδί έξω από τοπικό περιβάλλον", () => {
    expect(decideDelivery(message, env({ isLocal: false }))?.status).toBe(
      "failed",
    );
  });

  it("σε Preview θέλει λίστα domains", () => {
    expect(
      decideDelivery(
        message,
        env({ isLocal: false, apiKey: "k", isPreview: true }),
      ),
    ).toMatchObject({ status: "failed" });
    expect(
      decideDelivery(
        message,
        env({ apiKey: "k", isPreview: true, allowedDomains: ["devremedia.com"] }),
      ),
    ).toMatchObject({
      status: "suppressed",
    });
  });

  it("δεν αποφασίζει τίποτα όταν υπάρχει κλειδί και ο παραλήπτης επιτρέπεται", () => {
    expect(decideDelivery(message, env({ apiKey: "k" }))).toBeNull();
  });
});

describe("sendEmail", () => {
  it("στέλνει στο Resend με το κλειδί και επιστρέφει τον κωδικό του παρόχου", async () => {
    const fetchImpl = okFetch();
    const outcome = await sendEmail(message, {
      env: env({ apiKey: "k" }),
      fetchImpl,
    });
    expect(outcome).toEqual({
      status: "sent",
      providerId: "re_123",
      error: "",
    });
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toMatchObject({ Authorization: "Bearer k" });
    expect(JSON.parse(String(init.body))).toMatchObject({
      to: ["Μαρία <maria@example.com>"],
      subject: "Θέμα",
    });
  });

  it("δίνει «failed» με τον κωδικό της απάντησης, χωρίς το σώμα της", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("secret body", { status: 422 }),
    ) as unknown as typeof fetch;
    const outcome = await sendEmail(message, {
      env: env({ apiKey: "k" }),
      fetchImpl,
    });
    expect(outcome).toEqual({
      status: "failed",
      providerId: "",
      error: "Resend 422",
    });
  });

  it("δίνει «failed» όταν πέφτει το δίκτυο", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(
      (await sendEmail(message, { env: env({ apiKey: "k" }), fetchImpl }))
        .status,
    ).toBe("failed");
  });
});
