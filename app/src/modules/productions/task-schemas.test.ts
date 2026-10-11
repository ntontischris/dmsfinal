import { describe, expect, it } from "vitest";

import { taskCreateSchema, taskToggleSchema } from "./task-schemas";

const PRODUCTION_ID = "7d1f2a3e-4b5c-4d6e-8f70-123456789abc";
const TASK_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1234567890ab";

describe("taskCreateSchema", () => {
  it("should trim the title and turn empty optional fields into null", () => {
    const parsed = taskCreateSchema.safeParse({
      productionId: PRODUCTION_ID,
      title: "  Μοντάζ  ",
      assigneeId: "",
      dueDate: "",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.title).toBe("Μοντάζ");
    expect(parsed.success && parsed.data.assigneeId).toBeNull();
    expect(parsed.success && parsed.data.dueDate).toBeNull();
  });

  it("should refuse a title that is only spaces", () => {
    const parsed = taskCreateSchema.safeParse({
      productionId: PRODUCTION_ID,
      title: "   ",
      assigneeId: "",
      dueDate: "",
    });

    expect(parsed.success).toBe(false);
  });

  it("should refuse a title longer than 200 characters", () => {
    const parsed = taskCreateSchema.safeParse({
      productionId: PRODUCTION_ID,
      title: "α".repeat(201),
      assigneeId: "",
      dueDate: "",
    });

    expect(parsed.success).toBe(false);
  });

  it("should refuse a due date that is not a calendar date", () => {
    const parsed = taskCreateSchema.safeParse({
      productionId: PRODUCTION_ID,
      title: "Μοντάζ",
      assigneeId: "",
      dueDate: "31/12/2027",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("taskToggleSchema", () => {
  it("should read the checkbox value as a boolean", () => {
    const parsed = taskToggleSchema.safeParse({
      taskId: TASK_ID,
      done: "true",
    });

    expect(parsed.success && parsed.data.done).toBe(true);
  });

  it("should refuse any value other than true or false", () => {
    expect(
      taskToggleSchema.safeParse({ taskId: TASK_ID, done: "yes" }).success,
    ).toBe(false);
  });
});
