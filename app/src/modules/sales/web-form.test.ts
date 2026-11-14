import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/supabase/config", () => ({
  supabaseConfig: () => ({ url: "https://db.example.test", key: "public" }),
}));

import { submitWebForm } from "./web-form";

const valid = {
  name: " Καφέ Αστέρι ",
  contact_name: "Νίκος",
  contact_email: " Nikos@Asteri.example.gr ",
  message: "Θέλουμε βίντεο",
};

describe("submitWebForm", () => {
  beforeEach(() => mocks.rpc.mockReset());

  test("should send the trimmed form and the visitor ip to the database", async () => {
    mocks.rpc.mockResolvedValue({ data: { status: "ok" }, error: null });
    expect(await submitWebForm(valid, "203.0.113.7")).toEqual({ status: "ok" });
    expect(mocks.rpc).toHaveBeenCalledWith("sales_web_form", {
      p_form: {
        name: "Καφέ Αστέρι",
        contact_name: "Νίκος",
        contact_email: "nikos@asteri.example.gr",
        contact_phone: "",
        message: "Θέλουμε βίντεο",
      },
      p_ip: "203.0.113.7",
    });
  });

  test("should answer ok without writing anything when the honeypot is filled", async () => {
    expect(
      await submitWebForm({ ...valid, website: "http://spam" }, "1.1.1.1"),
    ).toEqual({ status: "ok" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  test("should name the wrong field and not call the database", async () => {
    expect(
      await submitWebForm({ ...valid, contact_email: "όχι" }, "1.1.1.1"),
    ).toEqual({ status: "invalid", field: "contact_email" });
    expect(await submitWebForm(null, "1.1.1.1")).toEqual({ status: "invalid" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  test("should pass on the rate limit and hide database errors", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: { status: "rate_limited" },
      error: null,
    });
    expect(await submitWebForm(valid, "1.1.1.1")).toEqual({
      status: "rate_limited",
    });
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "42501", message: "x" },
    });
    expect(await submitWebForm(valid, "1.1.1.1")).toEqual({ status: "error" });
  });
});
