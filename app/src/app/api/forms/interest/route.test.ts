import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ submitWebForm: vi.fn() }));

vi.mock("@/modules/sales", () => ({ submitWebForm: mocks.submitWebForm }));

import { POST } from "./route";

afterEach(() => {
  vi.clearAllMocks();
});

const post = (body: string, type: string) =>
  new NextRequest("https://app.example.test/api/forms/interest", {
    method: "POST",
    body,
    headers: {
      "content-type": type,
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
    },
  });

describe("POST /api/forms/interest", () => {
  it("should pass a JSON body and the first forwarded ip, and answer 200", async () => {
    mocks.submitWebForm.mockResolvedValue({ status: "ok" });
    const response = await POST(
      post('{"contact_name":"Νίκος"}', "application/json"),
    );
    expect(mocks.submitWebForm).toHaveBeenCalledWith(
      { contact_name: "Νίκος" },
      "203.0.113.7",
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
  });

  it("should read a classic form post", async () => {
    mocks.submitWebForm.mockResolvedValue({ status: "ok" });
    await POST(
      post(
        "contact_name=%CE%9D%CE%AF%CE%BA%CE%BF%CF%82&website=",
        "application/x-www-form-urlencoded",
      ),
    );
    expect(mocks.submitWebForm).toHaveBeenCalledWith(
      { contact_name: "Νίκος", website: "" },
      "203.0.113.7",
    );
  });

  it("should map invalid, rate limited and error to 400, 429 and 503", async () => {
    mocks.submitWebForm.mockResolvedValueOnce({
      status: "invalid",
      field: "contact_email",
    });
    const invalid = await POST(post("{}", "application/json"));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      ok: false,
      status: "invalid",
      field: "contact_email",
    });
    mocks.submitWebForm.mockResolvedValueOnce({ status: "rate_limited" });
    expect((await POST(post("{}", "application/json"))).status).toBe(429);
    mocks.submitWebForm.mockResolvedValueOnce({ status: "error" });
    expect((await POST(post("{}", "application/json"))).status).toBe(503);
  });

  it("should treat an unreadable body as empty input", async () => {
    mocks.submitWebForm.mockResolvedValue({ status: "invalid" });
    await POST(post("{oops", "application/json"));
    expect(mocks.submitWebForm).toHaveBeenCalledWith(null, "203.0.113.7");
  });
});
