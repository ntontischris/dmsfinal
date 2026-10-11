"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import {
  taskCreateSchema,
  taskEditSchema,
  taskRefSchema,
  taskToggleSchema,
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

export async function toggleProductionTask(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = taskToggleSchema.safeParse(pick(form, ["taskId", "done"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_task_toggle", {
    p_id: parsed.data.taskId,
    p_done: parsed.data.done,
  });
  return finishWith(outcome, parsed.data.done ? "Η Εργασία έγινε." : "Η Εργασία ξανανοίγει.");
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
