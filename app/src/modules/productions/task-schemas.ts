import { z } from "zod";

// Εργασίες Παραγωγής (G2): έλεγχος στο όριο του server. Η βάση ελέγχει ξανά· εδώ φαίνονται τα λάθη πριν φύγει το αίτημα.

const TITLE_MESSAGE = "Γράψε τίτλο για την Εργασία.";

const taskTitle = z
  .string()
  .trim()
  .min(1, TITLE_MESSAGE)
  .max(200, "Ο τίτλος είναι μέχρι 200 χαρακτήρες.");

// «Χωρίς υπεύθυνο» και «χωρίς προθεσμία» έρχονται ως κενή τιμή και γίνονται null.
const optionalUuid = z
  .union([z.literal(""), z.uuid()])
  .transform((value) => (value === "" ? null : value));

const optionalDate = z
  .union([z.literal(""), z.iso.date("Η προθεσμία θέλει ημερομηνία.")])
  .transform((value) => (value === "" ? null : value));

const taskFields = {
  title: taskTitle,
  assigneeId: optionalUuid,
  dueDate: optionalDate,
};

export const taskCreateSchema = z.object({
  productionId: z.uuid(),
  ...taskFields,
});

export const taskEditSchema = z.object({
  taskId: z.uuid(),
  ...taskFields,
});

export const taskRefSchema = z.object({ taskId: z.uuid() });

// Το checkbox στέλνει «true» ή «false»· ό,τι άλλο δεν περνά.
export const taskToggleSchema = z.object({
  taskId: z.uuid(),
  done: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskEditInput = z.infer<typeof taskEditSchema>;
