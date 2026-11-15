import { describe, expect, it } from "vitest";

import { filmingFromRequestHref } from "./guide-signal";

const BASE = "/app/filming/new?fromRequest=m1&client=c1";

describe("filmingFromRequestHref", () => {
  it("should open the filming form inside the filming guide and come back to the reply", () => {
    const href = filmingFromRequestHref(BASE, {
      pathname: "/app/messages/c1",
      search: new URLSearchParams("job=apanto-se-pelates&step=2"),
    });
    const query = new URLSearchParams(href.split("?")[1]);
    expect(query.get("fromRequest")).toBe("m1");
    expect(query.get("job")).toBe("stino-gyrisma");
    expect(query.get("step")).toBe("2");
    expect(query.get("from")).toBe(
      "/app/messages/c1?job=apanto-se-pelates&step=3",
    );
  });

  it("should leave the link as it was outside the guide", () => {
    expect(
      filmingFromRequestHref(BASE, {
        pathname: "/app/messages/c1",
        search: new URLSearchParams(""),
      }),
    ).toBe(BASE);
  });
});
