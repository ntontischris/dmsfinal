import { afterEach, describe, expect, it, vi } from "vitest";

import { filmingFromRequestHref, withSignal } from "./guide-signal";

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

describe("withSignal", () => {
  const listen = () => {
    const target = new EventTarget();
    const heard: string[] = [];
    target.addEventListener("flows:outcome", (event) =>
      heard.push(String((event as CustomEvent).detail)),
    );
    vi.stubGlobal("window", target);
    return heard;
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should tell the guide once the save succeeded", async () => {
    const heard = listen();
    const action = withSignal(async () => ({ notice: "Έγινε" }), "worked");
    const result = await action({}, new FormData());
    expect(result).toEqual({ notice: "Έγινε" });
    expect(heard).toEqual(["worked"]);
  });

  it("should stay silent when the save failed", async () => {
    const heard = listen();
    const action = withSignal(async () => ({ error: "Όχι" }), "rejected");
    await action({}, new FormData());
    expect(heard).toEqual([]);
  });
});
