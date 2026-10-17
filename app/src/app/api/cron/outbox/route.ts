import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { appOrigin } from "@/lib/app-origin";
import { isCronAuthorized } from "@/lib/email/outbox-trigger";
import { runOutboxWorker } from "@/lib/email/worker";
import { generateBillables } from "@/lib/finance/billables-generate";
import { cleanExpiredAttachmentSlots } from "@/lib/messages/attachments-cleanup";
import { scanAutomations } from "@/lib/notifications/automations-scan";
import { processEvents } from "@/lib/notifications/events-process";
import {
  checkHealth,
  cleanSends,
  markJobEnd,
  markJobStart,
  markSteps,
} from "@/lib/notifications/health";
import { createAdminClient } from "@/lib/supabase/admin";

// Το κλείδωμα της ουράς (5 λεπτά) πρέπει να ξεπερνά αυτό το όριο, αλλιώς μια αργή παρτίδα ξαναστέλνεται.
export const maxDuration = 60;

// Ο εργάτης της ουράς email: κάθε λεπτό (Vercel cron) και μετά από κάθε εγγραφή (σκούντημα).
// Πρώτα τα Τιμολογητέα (#151), το καθάρισμα συνημμένων (#162), η ουρά Γεγονότων (#170) και ο έλεγχος χρονισμών (#172: υπενθυμίσεις,
// ληξιπρόθεσμα, σύνοψη Μηνυμάτων, Αργίες κ.λπ.)· σφάλμα τους δεν σταματά τον εργάτη. Ο έλεγχος χρονισμών δεν τρέχει στο σκούντημα
// (?kick=1), μόνο στο cron του λεπτού. Το ίδιο και η Υγεία (#174): έναρξη/τέλος στο job_runs, έλεγχος του cron Google, των
// κολλημένων Γεγονότων και του συγχρονισμού, και ο καθαρισμός 12 μηνών του Ιστορικού αποστολών (μία φορά τη μέρα). Η εκτέλεση
// είναι αποτυχημένη μόνο αν σηκώσει σφάλμα· ένα βήμα που επιστρέφει { error } φαίνεται στην απάντηση και, από το #215, ως
// σφάλμα της δικής του εργασίας στο job_runs (Τιμολογητέα, Γεγονότα, έλεγχος χρονισμών, καθαρισμός).
// Χωρίς CRON_SECRET στο περιβάλλον: 500· με λάθος ή λείπον Bearer: 401.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json({ error: "cron not configured" }, { status: 500 });
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin)
    return NextResponse.json(
      { error: "service role missing" },
      { status: 500 },
    );
  const isKick = request.nextUrl.searchParams.get("kick") === "1";
  if (isKick) return NextResponse.json(await runSteps(admin, true));
  await markJobStart(admin, "outbox");
  try {
    const steps = await runSteps(admin, false);
    await markJobEnd(admin, "outbox", null);
    return NextResponse.json(steps);
  } catch (error) {
    await markJobEnd(
      admin,
      "outbox",
      error instanceof Error ? error.message : "Η εργασία της ουράς σταμάτησε",
    );
    throw error;
  }
}

// Τα βήματα ενός κύκλου. Στο σκούντημα (isKick) μόνο η ουρά: χωρίς έλεγχο χρονισμών, Υγείας και καθαρισμό.
async function runSteps(admin: SupabaseClient, isKick: boolean) {
  const skipped = { skipped: true };
  const health = isKick ? skipped : await checkHealth(admin, "outbox");
  const billables = await generateBillables(admin);
  const attachments = await cleanExpiredAttachmentSlots(admin);
  // Τελευταίοι πριν τον worker: τα email «automation» φεύγουν στον ίδιο κύκλο (#170, #172).
  const events = await processEvents(admin);
  const timed = isKick ? skipped : await scanAutomations(admin);
  const summary = await runOutboxWorker(admin, appOrigin());
  const cleanup = isKick ? skipped : await cleanSends(admin);
  // Κάθε βήμα γράφει στο job_runs πότε έτρεξε (#215), μόνο στο cron του λεπτού.
  if (!isKick) await markSteps(admin, { billables, events, timed, cleanup });
  return { ...summary, billables, attachments, events, timed, health, cleanup };
}
