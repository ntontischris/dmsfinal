"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import {
  taskCreateSchema,
  taskEditSchema,
  taskPrioritySchema,
  taskRefSchema,
  taskStatusSchema,
} from "./task-schemas";

// Εργασίες Παραγωγής (#143): κάθε ενέργεια είναι ένα RPC της βάσης. Η βάση αποφασίζει Δικαίωμα και κατάσταση.

export async function addProductionTask(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = taskCreateSchema.safeParse(
    pick(form, ["productionId", "title", "assigneeId", "dueDate"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_task_add", {
    p_production: parsed.data.productionId,
    p_title: parsed.data.title,
    p_assignee: parsed.data.assigneeId,
    p_due: parsed.data.dueDate,
  });
  return finishWith(outcome, "Η Εργασία προστέθηκε.");
}

export async function updateProductionTask(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = taskEditSchema.safeParse(
    pick(form, ["taskId", "title", "assigneeId", "dueDate"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_task_update", {
    p_id: parsed.data.taskId,
    p_title: parsed.data.title,
    p_assignee: parsed.data.assigneeId,
    p_due: parsed.data.dueDate,
  });
  return finishWith(outcome, "Η Εργασία αποθηκεύτηκε.");
}

export async function deleteProductionTask(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = taskRefSchema.safeParse(pick(form, ["taskId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_task_delete", {
    p_id: parsed.data.taskId,
  });
  return finishWith(outcome, "Η Εργασία διαγράφηκε.");
}

const STATUS_NOTICES = {
  todo: "Η Εργασία ξανανοίγει.",
  doing: "Η Εργασία είναι σε εξέλιξη.",
  done: "Η Εργασία έγινε.",
} as const;

// Κατάσταση: την αλλάζει όποιος γράφει την Παραγωγή και ο ίδιος ο υπεύθυνος της Εργασίας (η βάση αποφασίζει).
export async function setProductionTaskStatus(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = taskStatusSchema.safeParse(pick(form, ["taskId", "status"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_task_set_status", {
    p_id: parsed.data.taskId,
    p_status: parsed.data.status,
  });
  return finishWith(outcome, STATUS_NOTICES[parsed.data.status]);
}

export async function setProductionTaskPriority(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = taskPrioritySchema.safeParse(pick(form, ["taskId", "priority"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_task_set_priority", {
    p_id: parsed.data.taskId,
    p_priority: parsed.data.priority,
  });
  return finishWith(outcome, "Η προτεραιότητα αποθηκεύτηκε.");
}
