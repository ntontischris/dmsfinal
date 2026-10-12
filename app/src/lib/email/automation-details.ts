import { z } from "zod";

import { itemUrl } from "./deliver-completion";
import { localizeChange } from "./deliver-sheet";
import { pick, type Locale } from "./locale";
import { productionDeliveredDetails } from "./templates/completion-messages";
import { deliverableVersionDetails } from "./templates/deliverable-messages";
import { invoiceRegisteredDetails } from "./templates/invoice-messages";
import { requestClosedDetails } from "./templates/message-messages";
import {
  crewDeclinedDetails,
  sheetIssuedDetails,
} from "./templates/sheet-messages";
import {
  decisionDetails,
  decisionTitle,
  type DecisionInput,
} from "./templates/system-messages";

// Το σταθερό «μπλοκ λεπτομερειών» ανά Γεγονός κάτω από το κείμενο του Αυτοματισμού (#171, Α6). Τα δεδομένα τα γράφει ο
// επεξεργαστής της ουράς (authz.ev_email_details, camelCase) και οι παράγραφοι είναι ίδιες με τα σημερινά templates.

const isoInstant = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)));
const id = z.string().min(1);

const decidedSchema = z.object({
  kind: z.literal("filming.decided"),
  filmingId: id,
  decision: z.enum(["approved", "rejected", "reschedule_rejected"]),
  startsAt: isoInstant,
  hours: z.number().positive(),
  reason: z.string().nullish(),
});

const rescheduledSchema = z.object({
  kind: z.literal("filming.rescheduled"),
  filmingId: id,
  startsAt: isoInstant,
  hours: z.number().positive(),
  previousStartsAt: isoInstant.nullish(),
});

const sheetSchema = z.object({
  kind: z.literal("filming.sheet_issued"),
  filmingId: id,
  version: z.number().int().positive(),
  startsAt: isoInstant,
  hours: z.number().positive(),
  location: z.string().nullish(),
  production: z.string().nullish(),
  change: z.string().nullish(),
});

const declinedSchema = z.object({
  kind: z.literal("filming.crew_declined"),
  filmingId: id,
  member: z.string().nullish(),
  reason: z.string().nullish(),
  startsAt: isoInstant,
  production: z.string(),
});

const versionSchema = z.object({
  kind: z.literal("deliverable.version_sent"),
  deliverableId: id,
  title: z.string(),
  production: z.string(),
  version: z.number().int().positive(),
  roundsUsed: z.number().int().nonnegative(),
  roundsLimit: z.number().int().nonnegative().nullish(),
});

const deliveredSchema = z.object({
  kind: z.literal("production.delivered"),
  productionId: id,
  title: z.string(),
  deliverables: z.array(
    z.object({
      title: z.string(),
      finalFilesUrl: z.string().nullish(),
      url: z.string().nullish(),
    }),
  ),
});

export const invoiceDetailsSchema = z.object({
  kind: z.literal("invoice.registered"),
  invoiceId: id,
  docKind: z.enum(["invoice", "receipt", "credit"]),
  number: z.string().min(1),
  issueDate: z.string().min(1),
  dueDate: z.string().nullish(),
  total: z.number(),
  pdfPath: z.string().regex(/^pending\/[0-9a-f-]{36}\.pdf$/),
});

const closedSchema = z.object({
  kind: z.literal("request.closed"),
  clientName: z.string(),
  requestKind: z.enum(["deliverable", "filming", "other"]),
  outcome: z.enum(["done", "rejected"]),
  reply: z.string().nullish(),
  comment: z.string().nullish(),
  link: z
    .string()
    .regex(/^https:\/\/\S+$/)
    .nullish(),
  deliverableId: id.nullish(),
});

export const automationDetailsSchema = z.discriminatedUnion("kind", [
  decidedSchema,
  rescheduledSchema,
  sheetSchema,
  declinedSchema,
  versionSchema,
  deliveredSchema,
  invoiceDetailsSchema,
  closedSchema,
]);

export type AutomationDetails = z.infer<typeof automationDetailsSchema>;

export interface DetailsContext {
  locale: Locale;
  origin: string;
  name: string;
}

type FilmingDetails =
  z.infer<typeof decidedSchema> | z.infer<typeof rescheduledSchema>;

// Απόφαση ή μετάθεση: οι παράγραφοι του σημερινού email απόφασης (η απόρριψη μετάθεσης είναι απόφαση μετάθεσης).
function filmingParagraphs(
  details: FilmingDetails,
  context: DetailsContext,
): string[] {
  const isDecided = details.kind === "filming.decided";
  const input: DecisionInput = {
    ...context,
    kind:
      isDecided && details.decision !== "reschedule_rejected"
        ? "filming_decision"
        : "reschedule_decision",
    decision:
      isDecided && details.decision !== "approved" ? "rejected" : "approved",
    filmingId: details.filmingId,
    startsAt: details.startsAt,
    hours: details.hours,
    previousStartsAt: isDecided ? null : (details.previousStartsAt ?? null),
    reason: isDecided ? (details.reason ?? null) : null,
  };
  const title = isDecided ? [`${decisionTitle(input)}.`] : [];
  return [...title, ...decisionDetails(input)];
}

function filmingTeamParagraphs(
  details: z.infer<typeof sheetSchema> | z.infer<typeof declinedSchema>,
  context: DetailsContext,
): string[] {
  if (details.kind === "filming.sheet_issued") {
    return sheetIssuedDetails({
      ...context,
      filmingId: details.filmingId,
      version: details.version,
      startsAt: details.startsAt,
      hours: details.hours,
      location: details.location ?? null,
      production: details.production ?? "",
      change: details.change
        ? localizeChange(context.locale, details.change)
        : null,
    });
  }
  return crewDeclinedDetails({
    ...context,
    filmingId: details.filmingId,
    member:
      details.member ?? pick(context.locale, "Ένα μέλος", "A crew member"),
    reason: details.reason ?? null,
    startsAt: details.startsAt,
    production: details.production,
  });
}

// Οι παράγραφοι του μπλοκ, στη γλώσσα του παραλήπτη.
export function detailParagraphs(
  details: AutomationDetails,
  context: DetailsContext,
): string[] {
  switch (details.kind) {
    case "filming.decided":
    case "filming.rescheduled":
      return filmingParagraphs(details, context);
    case "filming.sheet_issued":
    case "filming.crew_declined":
      return filmingTeamParagraphs(details, context);
    case "deliverable.version_sent":
      return deliverableVersionDetails({
        ...details,
        ...context,
        roundsLimit: details.roundsLimit ?? null,
      });
    case "production.delivered":
      return productionDeliveredDetails({
        ...context,
        productionId: details.productionId,
        productionTitle: details.title,
        deliverables: details.deliverables.map((item) => ({
          title: item.title,
          url: itemUrl(item),
        })),
      });
    case "invoice.registered":
      return invoiceRegisteredDetails({
        ...details,
        ...context,
        kind: details.docKind,
        dueDate: details.dueDate ?? null,
      });
    case "request.closed":
      return requestClosedDetails({
        ...context,
        clientName: details.clientName,
        kind: details.requestKind,
        outcome: details.outcome,
        reply: details.reply ?? null,
        comment: details.comment ?? null,
        link: details.link ?? null,
        deliverableId: details.deliverableId ?? null,
      });
  }
}
