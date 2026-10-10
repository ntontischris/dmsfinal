import { describe, expect, it } from "vitest";

import { missingWhenNotFound } from "./read";

const resolving = (error: { code?: string; message: string } | null) =>
  Promise.resolve({ data: error ? null : { id: "x" }, error });

describe("missingWhenNotFound", () => {
  it("should turn a permission denial into a missing row without an error", async () => {
    const result = await missingWhenNotFound(
      resolving({ code: "42501", message: "Δεν έχεις Δικαίωμα" }),
    );
    expect(result).toEqual({ data: null, error: null });
  });

  it("should turn a not-found raise into a missing row without an error", async () => {
    const result = await missingWhenNotFound(
      resolving({ code: "P0001", message: "Ο κλεισμένος χρόνος δεν βρέθηκε" }),
    );
    expect(result).toEqual({ data: null, error: null });
  });

  it("should keep other database errors so they are logged", async () => {
    const error = { code: "XX000", message: "boom" };
    expect(await missingWhenNotFound(resolving(error))).toEqual({
      data: null,
      error,
    });
  });

  it("should pass a found row through untouched", async () => {
    expect(await missingWhenNotFound(resolving(null))).toEqual({
      data: { id: "x" },
      error: null,
    });
  });
});
