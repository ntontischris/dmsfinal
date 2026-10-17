import { describe, expect, it } from "vitest";

import { monitorUrl } from "./monitor";

describe("monitorUrl", () => {
  it("should say the external check is set up only with an https address", () => {
    expect(monitorUrl({})).toBeNull();
    expect(monitorUrl({ HEALTH_MONITOR_URL: "  " })).toBeNull();
    expect(monitorUrl({ HEALTH_MONITOR_URL: "http://example.com" })).toBeNull();
    expect(monitorUrl({ HEALTH_MONITOR_URL: "not a url" })).toBeNull();
    expect(
      monitorUrl({
        HEALTH_MONITOR_URL: "https://uptime.example.com/monitors/1",
      }),
    ).toBe("https://uptime.example.com/monitors/1");
  });
});
