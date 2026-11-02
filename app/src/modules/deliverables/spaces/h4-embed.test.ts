import { expect, test } from "vitest";

import { embedUrlOf } from "./h4-embed";

test("το link του Drive παίζει μέσα στην εφαρμογή, από τη σελίδα προβολής του", () => {
  expect(embedUrlOf("https://drive.google.com/file/d/abc_12-X/view")).toBe(
    "https://drive.google.com/file/d/abc_12-X/preview",
  );
  expect(
    embedUrlOf("https://drive.google.com/file/d/abc/view?usp=sharing"),
  ).toBe("https://drive.google.com/file/d/abc/preview");
});

test("Vimeo και YouTube παίζουν από τον δικό τους player", () => {
  expect(embedUrlOf("https://vimeo.com/123456")).toBe(
    "https://player.vimeo.com/video/123456",
  );
  expect(embedUrlOf("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
  );
  expect(embedUrlOf("https://youtu.be/dQw4w9WgXcQ")).toBe(
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
  );
});

test("ό,τι δεν αναγνωρίζεται δεν ενσωματώνεται", () => {
  expect(embedUrlOf("https://drive.google.com/drive/folders/xyz")).toBeNull();
  expect(embedUrlOf("όχι link")).toBeNull();
});
