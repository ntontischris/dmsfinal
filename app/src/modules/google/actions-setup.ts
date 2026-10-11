"use server";

import { appOrigin } from "@/lib/app-origin";
import type { FormState } from "@/lib/form-state";
import { createGoogleCalendarApi, type GoogleCalendarApi } from "@/lib/google/client";
import { describeError } from "@/lib/google/describe-error";
import { readGoogleConfig } from "@/lib/google/config";
import { acquireWorker, readGoogleState, releaseWorker, setCalendar } from "@/lib/google/rpc";
import { runGoogleWorker } from "@/lib/google/worker";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/modules/access";

import { callRpc, finishWith, revalidateAppLayout, textOf } from "./action-support";
import { CALENDAR_NAME } from "./labels";
import { canManageGoogle } from "./permissions";
import { sharedWithSchema } from "./schemas";

// Ενέργειες που μιλούν στο Google ή γράφουν με το service role (ADR 0016). Το Δικαίωμα ελέγχεται πρώτα εδώ·
// οι RPC του worker δεν ελέγχουν συνεδρία, γι' αυτό η άδεια ελέγχεται εδώ και όχι μέσα στη βάση.
const NOT_ALLOWED: FormState = { error: "Δεν έχεις Δικαίωμα για αυτή την ενέργεια." };
const NOT_CONFIGURED: FormState = { error: "Λείπουν τα στοιχεία του λογαριασμού Google στο Vercel." };
const UNREACHABLE: FormState = { error: "Η βάση δεν απάντησε. Δοκίμασε ξανά." };
const BUSY: FormState = { error: "Ο συγχρονισμός τρέχει τώρα. Δοκίμασε ξανά σε λίγο." };
const CREATE_LEASE_SECONDS = 60;

async function withGoogle(
  work: (api: GoogleCalendarApi, admin: AdminClient) => Promise<FormState>,
): Promise<FormState> {
  const viewer = await getViewer();
  if (!canManageGoogle(viewer)) return NOT_ALLOWED;
  const config = readGoogleConfig();
  if (!config) return NOT_CONFIGURED;
  const admin = createAdminClient();
  if (!admin) return UNREACHABLE;
  return work(createGoogleCalendarApi(config), admin);
}

async function provisionCalendar(api: GoogleCalendarApi, sharedWith: string): Promise<string | null> {
  try {
    const calendarId = await api.createCalendar(CALENDAR_NAME);
    await api.shareCalendar(calendarId, sharedWith);
    return calendarId;
  } catch (error) {
    console.error("google setup", describeError(error));
    return null;
  }
}

// Μέσα στο κλείδωμα: ο έλεγχος «υπάρχει ήδη» και η αποθήκευση γίνονται ως ένα βήμα.
async function createUnderLease(api: GoogleCalendarApi, admin: AdminClient, sharedWith: string): Promise<FormState> {
  const state = await readGoogleState(admin).catch(() => null);
  if (!state) return UNREACHABLE;
  if (state.calendarId) return { error: "Υπάρχει ήδη ημερολόγιο." };
  const calendarId = await provisionCalendar(api, sharedWith);
  if (!calendarId) return { error: "Το ημερολόγιο δεν δημιουργήθηκε. Δοκίμασε ξανά." };
  const saved = await setCalendar(admin, calendarId, sharedWith).then(
    () => true,
    (error: unknown) => {
      console.error("google setup", describeError(error));
      return false;
    },
  );
  if (!saved) return { error: "Το ημερολόγιο φτιάχτηκε αλλά δεν αποθηκεύτηκε. Δοκίμασε ξανά." };
  const queued = await callRpc("google_resync_all", {});
  revalidateAppLayout();
  return finishWith(queued, "Το ημερολόγιο δημιουργήθηκε και μοιράστηκε.");
}

// Φτιάχνει το ημερολόγιο, το μοιράζει στο email που δίνει ο Ιδιοκτήτης και γράφει ό,τι υπάρχει ήδη στην ουρά.
// Κλειδώνει τον worker για τη διάρκεια: δύο ταυτόχρονες υποβολές δεν φτιάχνουν δύο ημερολόγια.
export async function createGoogleCalendar(_: FormState, form: FormData): Promise<FormState> {
  const parsed = sharedWithSchema.safeParse(textOf(form, "sharedWith"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Γράψε ένα έγκυρο email" };
  const sharedWith = parsed.data;
  return withGoogle(async (api, admin) => {
    if (!(await acquireWorker(admin, CREATE_LEASE_SECONDS))) return BUSY;
    try {
      return await createUnderLease(api, admin, sharedWith);
    } finally {
      await releaseWorker(admin).catch(() => console.error("google setup: το κλείδωμα δεν αφέθηκε"));
    }
  });
}

// Συγχρονισμός τώρα: τα βήματα της ουράς και ο αυξητικός συγχρονισμός, με όριο χρόνου για τη συνεδρία.
export async function runGoogleSyncNow(): Promise<FormState> {
  return withGoogle(async (api, admin) => {
    const summary = await runGoogleWorker(admin, api, { origin: appOrigin(), forcePull: true, budgetMs: 20_000 });
    revalidateAppLayout();
    if (summary.skipped === "busy") return BUSY;
    if (summary.skipped === "no-calendar") return { error: "Δεν υπάρχει ημερολόγιο ακόμα." };
    if (summary.pulled === "failed") return { error: "Ο συγχρονισμός απέτυχε. Δες το τελευταίο σφάλμα." };
    if (summary.pulled === "partial") return { notice: "Ο συγχρονισμός συνεχίζεται στον επόμενο γύρο." };
    return { notice: "Ο συγχρονισμός ολοκληρώθηκε." };
  });
}
