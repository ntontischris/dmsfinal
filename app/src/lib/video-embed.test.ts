import { describe, expect, test } from "vitest";

import {
  isReadyMessage,
  isVideoLink,
  listenMessages,
  seekMessages,
  timeFromMessage,
  tracksTime,
  videoEmbedOf,
} from "./video-embed";

describe("videoEmbedOf", () => {
  test("το link του Drive παίζει μέσα στην εφαρμογή, από τη σελίδα προβολής του", () => {
    expect(
      videoEmbedOf("https://drive.google.com/file/d/abc_12-X/view"),
    ).toEqual({
      provider: "drive",
      src: "https://drive.google.com/file/d/abc_12-X/preview",
    });
    expect(
      videoEmbedOf("https://drive.google.com/file/d/abc/view?usp=sharing")?.src,
    ).toBe("https://drive.google.com/file/d/abc/preview");
  });

  test("Vimeo παίζει από τον δικό του player, και ξεκινά από το δευτερόλεπτο που ζητάμε", () => {
    expect(videoEmbedOf("https://vimeo.com/123456")?.src).toBe(
      "https://player.vimeo.com/video/123456",
    );
    expect(
      videoEmbedOf("https://vimeo.com/video/123456", {
        autoplay: true,
        startAt: 42.7,
      })?.src,
    ).toBe("https://player.vimeo.com/video/123456?autoplay=1#t=42s");
  });

  test("YouTube δέχεται watch, youtu.be, shorts και live, με κανάλι χρόνου", () => {
    const expected = "https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1";
    expect(
      videoEmbedOf("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.src,
    ).toBe(expected);
    expect(videoEmbedOf("https://youtu.be/dQw4w9WgXcQ")?.src).toBe(expected);
    expect(
      videoEmbedOf("https://www.youtube.com/shorts/dQw4w9WgXcQ")?.src,
    ).toBe(expected);
    expect(videoEmbedOf("https://youtube.com/live/dQw4w9WgXcQ")?.src).toBe(
      expected,
    );
    expect(
      videoEmbedOf("https://youtu.be/dQw4w9WgXcQ", {
        origin: "https://app.example",
        autoplay: true,
        startAt: 65,
      })?.src,
    ).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&origin=https%3A%2F%2Fapp.example&autoplay=1&start=65",
    );
  });

  test("ό,τι δεν αναγνωρίζεται δεν ενσωματώνεται", () => {
    expect(
      videoEmbedOf("https://drive.google.com/drive/folders/xyz"),
    ).toBeNull();
    expect(videoEmbedOf("https://example.com/video.mp4")).toBeNull();
    expect(videoEmbedOf("όχι link")).toBeNull();
    expect(isVideoLink("https://vimeo.com/1")).toBe(true);
    expect(isVideoLink("https://example.com")).toBe(false);
  });
});

describe("κανάλι χρόνου", () => {
  test("μόνο YouTube και Vimeo λένε τον χρόνο", () => {
    expect(tracksTime("youtube")).toBe(true);
    expect(tracksTime("vimeo")).toBe(true);
    expect(tracksTime("drive")).toBe(false);
    expect(listenMessages("drive")).toEqual([]);
    expect(seekMessages("drive", 10)).toEqual([]);
  });

  test("ο χρόνος διαβάζεται από τα μηνύματα του κάθε player", () => {
    expect(
      timeFromMessage(
        "youtube",
        JSON.stringify({ event: "infoDelivery", info: { currentTime: 12.5 } }),
      ),
    ).toBe(12.5);
    expect(
      timeFromMessage(
        "youtube",
        JSON.stringify({ event: "infoDelivery", info: { volume: 3 } }),
      ),
    ).toBeNull();
    expect(
      timeFromMessage(
        "vimeo",
        JSON.stringify({ event: "timeupdate", data: { seconds: 7 } }),
      ),
    ).toBe(7);
    expect(
      timeFromMessage("vimeo", { event: "timeupdate", data: { seconds: 8 } }),
    ).toBe(8);
    expect(timeFromMessage("vimeo", "όχι json")).toBeNull();
    expect(isReadyMessage("vimeo", JSON.stringify({ event: "ready" }))).toBe(
      true,
    );
    expect(isReadyMessage("youtube", JSON.stringify({ event: "ready" }))).toBe(
      false,
    );
  });

  test("το «πήγαινε στο» δεν πάει σε αρνητικό χρόνο", () => {
    expect(seekMessages("youtube", -3)[0]).toBe(
      JSON.stringify({ event: "command", func: "seekTo", args: [0, true] }),
    );
    expect(seekMessages("vimeo", 30)).toEqual([
      JSON.stringify({ method: "setCurrentTime", value: 30 }),
      JSON.stringify({ method: "play" }),
    ]);
  });
});
