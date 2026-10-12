import { z } from "zod";

import {
  forbiddenInSubject,
  missingRequired,
  unknownVariables,
} from "@/lib/email/system-texts";

import {
  EVENT_CODE_PATTERN,
  timingFor,
  toWaitMinutes,
} from "./automation-helpers";
import { EVENT_KINDS, type EventKind } from "./automation-view-schema";

// Οι φόρμες της K1, της K2, των Αργιών και των Προτιμήσεων (#173). Τα πεδία έρχονται ως κείμενο. Η βάση ελέγχει ξανά
// τα πάντα· εδώ πιάνονται νωρίς τα λάθη με το ίδιο μήνυμα.

const text = (max: number, message: string) =>
  z.string().trim().max(max, message);

const optionalUuid = z.union([z.uuid(), z.literal("")]);

const MAX_WAIT_MINUTES = 525_600;

export interface AutomationFormContext {
  kind: EventKind;
  variables: readonly string[];
}

const automationFields = z.object({
  id: optionalUuid,
  eventType: z.string().regex(EVENT_CODE_PATTERN, "Διάλεξε Γεγονός"),
  channel: z.enum(["notification", "email"], {
    message: "Διάλεξε κανάλι: Ειδοποίηση ή email",
  }),
  recipientKind: z.enum(["relative", "permission", "users", "visitor"], {
    message: "Διάλεξε τρόπο παραληπτών",
  }),
  recipientRelative: z.string(),
  recipientPermission: z.string(),
  recipientUserIds: z.array(
    z.uuid({ message: "Οι παραλήπτες δεν είναι έγκυροι" }),
  ),
  offsetDays: z.string(),
  offsetDirection: z.enum(["before", "after"]).catch("before"),
  sendTime: z.string(),
  waitAmount: z.string(),
  waitUnit: z.enum(["minutes", "hours", "days"]).catch("days"),
  subjectEl: text(300, "Το θέμα έχει έως 300 χαρακτήρες"),
  subjectEn: text(300, "Το θέμα έχει έως 300 χαρακτήρες"),
  bodyEl: text(2000, "Το κείμενο έχει έως 2.000 χαρακτήρες").min(
    1,
    "Γράψε κείμενο στα ελληνικά",
  ),
  bodyEn: text(2000, "Το αγγλικό κείμενο έχει έως 2.000 χαρακτήρες"),
  isEssential: z.string(),
});

type AutomationFields = z.infer<typeof automationFields>;

const wholeNumber = (value: string): number | null =>
  /^\d{1,6}$/.test(value.trim()) ? Number(value.trim()) : null;

// Ο χρονισμός κατά το είδος: αμέσως / Χ μέρες πριν-μετά και ώρα / αναμονή Χ λεπτά-ώρες-μέρες. Λάθος → μήνυμα.
export function timingOf(
  kind: EventKind,
  v: Pick<
    AutomationFields,
    "offsetDays" | "offsetDirection" | "sendTime" | "waitAmount" | "waitUnit"
  >,
):
  | {
      timing: string;
      offsetDays: number | null;
      sendTime: string | null;
      waitMinutes: number | null;
    }
  | string {
  if (kind === "instant")
    return {
      timing: "immediate",
      offsetDays: null,
      sendTime: null,
      waitMinutes: null,
    };
  if (kind === "dated") {
    const days = wholeNumber(v.offsetDays);
    if (days === null || days > 365)
      return "Οι μέρες είναι ακέραιος από 0 έως 365";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.sendTime.trim()))
      return "Γράψε ώρα αποστολής (ΩΩ:ΛΛ)";
    const signed = v.offsetDirection === "before" ? -days : days;
    return {
      timing: "offset",
      offsetDays: signed === 0 ? 0 : signed,
      sendTime: v.sendTime.trim(),
      waitMinutes: null,
    };
  }
  const amount = wholeNumber(v.waitAmount);
  const minutes = amount === null ? null : toWaitMinutes(amount, v.waitUnit);
  if (minutes === null || minutes < 1 || minutes > MAX_WAIT_MINUTES)
    return "Η αναμονή είναι από 1 λεπτό έως 365 μέρες";
  return {
    timing: "wait",
    offsetDays: null,
    sendTime: null,
    waitMinutes: minutes,
  };
}

function recipientProblem(v: AutomationFields): string | null {
  if (v.recipientKind === "relative" && !v.recipientRelative)
    return "Διάλεξε παραλήπτη σε σχέση με το Γεγονός";
  if (v.recipientKind === "permission" && !v.recipientPermission)
    return "Διάλεξε Δικαίωμα";
  if (v.recipientKind === "users" && v.recipientUserIds.length === 0)
    return "Διάλεξε τουλάχιστον έναν Χρήστη";
  return null;
}

function textProblem(
  v: AutomationFields,
  variables: readonly string[],
): string | null {
  if (v.channel === "email" && !v.subjectEl)
    return "Το email θέλει θέμα στα ελληνικά";
  const all = [
    v.channel === "email" ? v.subjectEl : "",
    v.channel === "email" ? v.subjectEn : "",
    v.bodyEl,
    v.bodyEn,
  ].join(" ");
  const unknown = unknownVariables(all, variables)[0];
  if (unknown)
    return `Άγνωστη μεταβλητή {${unknown}}: διάλεξε από τη λίστα του Γεγονότος`;
  const inSubject =
    v.channel === "email"
      ? forbiddenInSubject([v.subjectEl, v.subjectEn].join(" "))[0]
      : undefined;
  return inSubject ? subjectMessage(inSubject) : null;
}

// Σύνδεσμος ή κωδικός στο θέμα: όπως το μήνυμα της βάσης.
const subjectMessage = (name: string): string =>
  `Το {${name}} δεν μπαίνει στο θέμα: βάλ' το στο κείμενο`;

export function automationFormSchema(context: AutomationFormContext) {
  return automationFields
    .superRefine((v, ctx) => {
      const timing = timingOf(context.kind, v);
      const problem =
        recipientProblem(v) ??
        (typeof timing === "string" ? timing : null) ??
        textProblem(v, context.variables);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    })
    .transform((v) => {
      const timing = timingOf(context.kind, v);
      const isEmail = v.channel === "email";
      return {
        ...(v.id ? { id: v.id } : { eventType: v.eventType }),
        channel: v.channel,
        recipientKind: v.recipientKind,
        recipientRelative:
          v.recipientKind === "relative" ? v.recipientRelative : "",
        recipientPermission:
          v.recipientKind === "permission" ? v.recipientPermission : "",
        recipientUserIds: v.recipientKind === "users" ? v.recipientUserIds : [],
        ...(typeof timing === "string"
          ? { timing: timingFor(context.kind) }
          : timing),
        subjectEl: isEmail ? v.subjectEl : "",
        subjectEn: isEmail ? v.subjectEn : "",
        bodyEl: v.bodyEl,
        bodyEn: v.bodyEn,
        isEssential: v.isEssential === "on",
      };
    });
}

export const eventKindSchema = z.enum(EVENT_KINDS);

export const idSchema = z.object({ id: z.uuid() });

export const enabledSchema = z.object({ id: z.uuid(), isEnabled: z.string() });

// K2: τα τέσσερα κείμενα ενός Μηνύματος συστήματος. Κενό = το προεπιλεγμένο.
export function systemMessageFormSchema(spec: {
  variables: readonly string[];
  required: readonly string[];
}) {
  return z
    .object({
      code: z.string().min(1),
      subjectEl: text(300, "Το θέμα έχει έως 300 χαρακτήρες"),
      subjectEn: text(300, "Το θέμα έχει έως 300 χαρακτήρες"),
      bodyEl: text(2000, "Το κείμενο έχει έως 2.000 χαρακτήρες"),
      bodyEn: text(2000, "Το κείμενο έχει έως 2.000 χαρακτήρες"),
    })
    .superRefine((v, ctx) => {
      const unknown = unknownVariables(
        [v.subjectEl, v.subjectEn, v.bodyEl, v.bodyEn].join(" "),
        spec.variables,
      )[0];
      if (unknown) {
        ctx.addIssue({
          code: "custom",
          message: `Άγνωστη μεταβλητή {${unknown}}: διάλεξε από τη λίστα του Μηνύματος`,
        });
        return;
      }
      const inSubject = forbiddenInSubject(
        [v.subjectEl, v.subjectEn].join(" "),
      )[0];
      if (inSubject) {
        ctx.addIssue({ code: "custom", message: subjectMessage(inSubject) });
        return;
      }
      const missing = [v.bodyEl, v.bodyEn]
        .filter(Boolean)
        .flatMap((body) => missingRequired(body, spec.required))[0];
      if (missing)
        ctx.addIssue({
          code: "custom",
          message: `Λείπει το {${missing}}: πρόσθεσέ το για να αποθηκευτεί`,
        });
    });
}

// Μία προσθήκη αργίας: όνομα, ημερομηνία και αν επαναλαμβάνεται κάθε χρόνο.
export const holidayAddSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Γράψε όνομα αργίας")
      .max(80, "Το όνομα έχει έως 80 χαρακτήρες"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Διάλεξε ημερομηνία"),
    yearly: z.string(),
  })
  .transform((v) => {
    const [, month, day] = v.date.split("-").map(Number);
    return v.yearly === "on"
      ? { name: v.name, month: month ?? 1, day: day ?? 1 }
      : { name: v.name, onDate: v.date };
  });

export const holidayToggleSchema = z.object({
  name: z.string().trim().min(1).max(80),
  isOn: z.string(),
});

export const prefFormSchema = z.object({
  automationId: z.uuid(),
  receive: z.string(),
});
