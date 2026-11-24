import { z } from "zod";

// Τ4: η υπενθύμιση ληξιπρόθεσμου (invoice_reminder_preview) και οι υπενθυμίσεις ενός Τιμολογίου (invoice_reminders).

const recipientSchema = z.object({ name: z.string(), email: z.string() });

const reminderPreviewSchema = z.object({
  recipients: z.array(recipientSchema),
  subject: z.string(),
  body: z.string(),
  lastAt: z.string().nullable(),
  isEnabled: z.boolean(),
  recentAt: z.string().nullable(),
});

const reminderSchema = z.object({
  at: z.string(),
  manual: z.boolean(),
  byName: z.string().nullable(),
  recipients: z.number(),
});

export type ReminderPreview = z.infer<typeof reminderPreviewSchema>;
export type Reminder = z.infer<typeof reminderSchema>;

export const parseReminderPreview = (data: unknown): ReminderPreview =>
  reminderPreviewSchema.parse(data);
export const parseReminders = (data: unknown): Reminder[] =>
  z.array(reminderSchema).parse(data);
