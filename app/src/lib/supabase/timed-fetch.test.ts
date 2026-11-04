import { describe, expect, it } from "vitest";

import { callNameOf } from "./timed-fetch";

describe("callNameOf", () => {
  it("should name an RPC without its arguments", () => {
    expect(
      callNameOf(
        "https://x.supabase.co/rest/v1/rpc/sales_client_list?p_query=Παπαδόπουλος",
      ),
    ).toBe("rest:rpc/sales_client_list");
  });

  it("should name an Auth call", () => {
    expect(callNameOf("https://x.supabase.co/auth/v1/user")).toBe("auth:user");
  });

  it("should name a table read without its filters", () => {
    expect(
      callNameOf("https://x.supabase.co/rest/v1/team_users?user_id=eq.1"),
    ).toBe("rest:team_users");
  });
});
