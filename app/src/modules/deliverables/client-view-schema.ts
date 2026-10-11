import { z } from "zod";

import { CLIENT_STATES } from "./client-types";

// Σχήμα των JSON των RPC της όψης πελάτη (client_deliverables_view, client_deliverable_view).
// Ό,τι δεν ταιριάζει σπάει εδώ και δεν φτάνει στην οθόνη.

const clientState = z.enum(CLIENT_STATES);

const clientCardSchema = z.object({
  id: z.string(),
  productionId: z.string(),
  title: z.string(),
  kind: z.string(),
  state: clientState,
  roundsUsed: z.number().int().nonnegative(),
  roundsLimit: z.number().int().nonnegative().nullable(),
  waitingSince: z.string().nullable(),
});

const provisionSchema = z.object({
  kind: z.string(),
  used: z.number(),
  remaining: z.number(),
  total: z.number(),
});

const periodSchema = z.object({
  periodId: z.string().nullable(),
  periodLabel: z.string(),
  provisions: z.array(provisionSchema),
  deliverables: z.array(clientCardSchema),
});

export const clientDeliverablesViewSchema = z.object({
  periods: z.array(periodSchema),
  awaitingYou: z.array(clientCardSchema),
});

const clientCommentSchema = z.object({
  id: z.string(),
  body: z.string(),
  atSeconds: z.number().int().nullable(),
  authorName: z.string().nullable(),
  createdAt: z.string(),
});

const clientVersionSchema = z.object({
  number: z.number().int().positive(),
  url: z.string(),
  host: z.string(),
  sentAt: z.string(),
  state: z.string(),
  answeredByName: z.string().nullable(),
  answeredAt: z.string().nullable(),
  answerNote: z.string().nullable(),
  linkBroken: z.boolean(),
  comments: z.array(clientCommentSchema),
});

const clientCanSchema = z.object({
  answer: z.boolean(),
  comment: z.boolean(),
  reportLink: z.boolean(),
  requestChange: z.boolean(),
});

export const clientDeliverableDetailSchema = z.object({
  id: z.string(),
  productionId: z.string(),
  title: z.string(),
  production: z.string(),
  kind: z.string(),
  state: clientState,
  roundsUsed: z.number().int().nonnegative(),
  roundsLimit: z.number().int().nonnegative().nullable(),
  overLimit: z.boolean(),
  versions: z.array(clientVersionSchema),
  finalFilesUrl: z.string().nullable(),
  openRequest: z
    .object({ id: z.string(), body: z.string(), createdAt: z.string() })
    .nullable(),
  can: clientCanSchema,
});
