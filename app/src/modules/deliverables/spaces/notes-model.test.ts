import { describe, expect, it } from "vitest";

import type { DeliverableComment, DeliverableVersion } from "../types";
import {
  clientPreviewOf,
  openCountOf,
  seenLineOf,
  threadsOf,
} from "./notes-model";

const note = (overrides: Partial<DeliverableComment>): DeliverableComment => ({
  id: "n",
  body: "Σημείωση",
  atSeconds: null,
  isInternal: false,
  createdAt: "2026-11-20T10:00:00Z",
  authorName: null,
  parentId: null,
  resolvedAt: null,
  resolvedByName: null,
  seenBy: [],
  ...overrides,
});

const version = (
  overrides: Partial<DeliverableVersion>,
): DeliverableVersion => ({
  number: 1,
  url: "https://vimeo.com/1",
  host: "vimeo.com",
  state: "awaiting_client",
  note: null,
  reviewNote: null,
  createdAt: "2026-11-20T09:00:00Z",
  sentAt: "2026-11-20T09:30:00Z",
  answeredAt: null,
  answerNote: null,
  linkBroken: false,
  comments: [],
  ...overrides,
});

describe("threadsOf", () => {
  it("should order notes by video time, then notes without time by when they were written", () => {
    const threads = threadsOf([
      note({ id: "late", atSeconds: 90 }),
      note({ id: "free-new", createdAt: "2026-11-21T10:00:00Z" }),
      note({ id: "early", atSeconds: 5 }),
      note({ id: "free-old", createdAt: "2026-11-19T10:00:00Z" }),
    ]);
    expect(threads.map((thread) => thread.note.id)).toEqual([
      "early",
      "late",
      "free-old",
      "free-new",
    ]);
  });

  it("should put replies under their note, oldest first", () => {
    const threads = threadsOf([
      note({ id: "root", atSeconds: 12 }),
      note({ id: "r2", parentId: "root", createdAt: "2026-11-22T10:00:00Z" }),
      note({ id: "r1", parentId: "root", createdAt: "2026-11-21T10:00:00Z" }),
    ]);
    expect(threads).toHaveLength(1);
    expect(threads[0]?.replies.map((reply) => reply.id)).toEqual(["r1", "r2"]);
  });

  it("should keep a reply whose note is not visible as a note of its own", () => {
    const threads = threadsOf([note({ id: "orphan", parentId: "hidden" })]);
    expect(threads.map((thread) => thread.note.id)).toEqual(["orphan"]);
  });
});

describe("openCountOf and seenLineOf", () => {
  it("should count only notes that are not resolved", () => {
    const threads = threadsOf([
      note({ id: "a" }),
      note({ id: "b", resolvedAt: "2026-11-21T10:00:00Z" }),
    ]);
    expect(openCountOf(threads)).toBe(1);
  });

  it("should name who saw the note, or nothing when nobody did", () => {
    expect(seenLineOf(["Γιώργος", "Μαρία"])).toBe("Το είδε: Γιώργος, Μαρία");
    expect(seenLineOf([])).toBeNull();
  });
});

describe("clientPreviewOf", () => {
  it("should show only sent versions without internal notes", () => {
    const preview = clientPreviewOf([
      version({ number: 2, sentAt: null }),
      version({
        number: 1,
        comments: [
          note({ id: "seen" }),
          note({ id: "internal", isInternal: true }),
        ],
      }),
    ]);
    expect(preview.map((v) => v.number)).toEqual([1]);
    expect(preview[0]?.comments.map((c) => c.id)).toEqual(["seen"]);
  });
});
