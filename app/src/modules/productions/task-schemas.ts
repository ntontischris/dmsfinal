import { z } from "zod";

import { TASK_PRIORITIES, TASK_STATUSES } from "./types";

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

// Κατάσταση και προτεραιότητα: μόνο οι γνωστές τιμές.
export const taskStatusSchema = z.object({
  taskId: z.uuid(),
  status: z.enum(TASK_STATUSES, "Άγνωστη κατάσταση Εργασίας."),
});

export const taskPrioritySchema = z.object({
  taskId: z.uuid(),
  priority: z.enum(TASK_PRIORITIES, "Άγνωστη προτεραιότητα."),
});

// Στάδια Παραγωγής: όνομα 1–60 χαρακτήρες· νέο Στάδιο χωρίς id.
export const stageSaveSchema = z.object({
  stageId: z.union([z.literal(""), z.uuid()]).transform((value) => (value === "" ? null : value)),
  label: z.string().trim().min(1, "Γράψε όνομα για το Στάδιο.").max(60, "Το όνομα είναι μέχρι 60 χαρακτήρες."),
});

export const stageMoveSchema = z.object({
  stageId: z.uuid(),
  step: z.enum(["-1", "1"]).transform(Number),
});

export const stageActiveSchema = z.object({
  stageId: z.uuid(),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

// Το Στάδιο μιας Παραγωγής· κενό = «Χωρίς Στάδιο».
export const productionStageSchema = z.object({
  productionId: z.uuid(),
  stageId: z.union([z.literal(""), z.uuid()]).transform((value) => (value === "" ? null : value)),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskEditInput = z.infer<typeof taskEditSchema>;
