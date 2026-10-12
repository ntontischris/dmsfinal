"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import {
  AUTOMATION_ADDED,
  AUTOMATION_SAVED,
  DELETED,
  ENABLED_OFF,
  ENABLED_ON,
  HOLIDAY_SAVED,
} from "./automation-labels";
import {
  automationFormSchema,
  enabledSchema,
  eventKindSchema,
  holidayAddSchema,
  holidayToggleSchema,
  idSchema,
} from "./automation-schemas";
import { parseHolidays, type AddedHoliday } from "./automation-view-schema";

// Ενέργειες της K1 (#173). Μία κλήση RPC η καθεμία· η βάση ελέγχει Δικαίωμα και κανόνες και γράφει Ίχνος.

const AUTOMATION_KEYS = [
  "id",
  "eventType",
  "channel",
  "recipientKind",
  "recipientRelative",
  "recipientPermission",
  "offsetDays",
  "offsetDirection",
  "sendTime",
  "waitAmount",
  "waitUnit",
  "subjectEl",
  "subjectEn",
  "bodyEl",
  "bodyEn",
  "isEssential",
] as const;

export async function saveAutomation(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const kind = eventKindSchema.safeParse(form.get("eventKind"));
  if (!kind.success) return { error: "Διάλεξε Γεγονός" };
  const variables = String(form.get("variables") ?? "")
    .split(",")
    .filter(Boolean);
  const parsed = automationFormSchema({ kind: kind.data, variables }).safeParse(
    {
      ...pick(form, AUTOMATION_KEYS),
      recipientUserIds: form.getAll("recipientUserIds").map(String),
    },
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("automation_save", { p: parsed.data });
  return finishWith(
    outcome,
    "id" in parsed.data ? AUTOMATION_SAVED : AUTOMATION_ADDED,
  );
}

export async function setAutomationEnabled(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = enabledSchema.safeParse(pick(form, ["id", "isEnabled"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const isOn = parsed.data.isEnabled === "on";
  const outcome = await callRpc("automation_set_enabled", {
    p_id: parsed.data.id,
    p_on: isOn,
  });
  return finishWith(outcome, isOn ? ENABLED_ON : ENABLED_OFF);
}

export async function deleteAutomation(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = idSchema.safeParse(pick(form, ["id"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("automation_delete", { p_id: parsed.data.id });
  return finishWith(outcome, DELETED);
}

// ───────────── Αργίες ─────────────

const asInput = (holiday: AddedHoliday) =>
  holiday.onDate
    ? { name: holiday.name, onDate: holiday.onDate }
    : { name: holiday.name, month: holiday.month, day: holiday.day };

async function currentHolidays() {
  const outcome = await callRpc("holiday_greetings_get", {});
  if (!outcome.ok) return outcome;
  return { ok: true as const, data: parseHolidays(outcome.data) };
}

export async function toggleHoliday(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = holidayToggleSchema.safeParse(pick(form, ["name", "isOn"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const current = await currentHolidays();
  if (!current.ok) return current.state;
  const others = current.data.removed.filter(
    (name) => name !== parsed.data.name,
  );
  const removed =
    parsed.data.isOn === "on" ? others : [...others, parsed.data.name];
  return finishWith(
    await callRpc("holiday_greetings_update", { p: { removed } }),
    HOLIDAY_SAVED,
  );
}

export async function addHoliday(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = holidayAddSchema.safeParse(
    pick(form, ["name", "date", "yearly"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const current = await currentHolidays();
  if (!current.ok) return current.state;
  const added = [...current.data.added.map(asInput), parsed.data];
  return finishWith(
    await callRpc("holiday_greetings_update", { p: { added } }),
    HOLIDAY_SAVED,
  );
}

export async function removeHoliday(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = idSchema.safeParse(pick(form, ["id"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const current = await currentHolidays();
  if (!current.ok) return current.state;
  const added = current.data.added
    .filter((holiday) => holiday.id !== parsed.data.id)
    .map(asInput);
  return finishWith(
    await callRpc("holiday_greetings_update", { p: { added } }),
    HOLIDAY_SAVED,
  );
}
