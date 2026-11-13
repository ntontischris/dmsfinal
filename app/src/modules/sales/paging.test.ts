import { describe, expect, it } from "vitest";

import { CHUNK, MAX_CHUNKS, collectChunks, collectPages } from "./paging";
import type { ReadResult } from "./read";

const ok = <T>(data: T[]): Promise<ReadResult<T[]>> =>
  Promise.resolve({ ok: true, data });

describe("collectPages", () => {
  it("διαβάζει σελίδες μέχρι να έρθει μισή", async () => {
    const offsets: number[] = [];
    const result = await collectPages((offset, limit) => {
      offsets.push(offset);
      return ok(
        Array.from({ length: offset < 200 ? limit : 7 }, (_, i) => offset + i),
      );
    });
    expect(offsets).toEqual([0, CHUNK, 2 * CHUNK]);
    expect(result.ok && result.data.length).toBe(2 * CHUNK + 7);
  });

  it("σταματά στο όριο ασφαλείας", async () => {
    let calls = 0;
    await collectPages((_, limit) => {
      calls += 1;
      return ok(Array.from({ length: limit }, () => 1));
    });
    expect(calls).toBe(MAX_CHUNKS);
  });

  it("αποτυχία σε μία σελίδα = αποτυχία όλης", async () => {
    const result = await collectPages((offset, limit) =>
      offset === 0
        ? ok(Array.from({ length: limit }, () => 1))
        : Promise.resolve({ ok: false }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("collectChunks", () => {
  it("χωρίζει τα ids σε κομμάτια των 100 και τα ενώνει", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `c${i}`);
    const sizes: number[] = [];
    const result = await collectChunks(ids, (chunk) => {
      sizes.push(chunk.length);
      return ok([...chunk]);
    });
    expect(sizes).toEqual([100, 100, 50]);
    expect(result.ok && result.data).toEqual(ids);
  });

  it("κενή λίστα = καμία κλήση", async () => {
    expect(await collectChunks([], () => ok([1]))).toEqual({
      ok: true,
      data: [],
    });
  });
});
