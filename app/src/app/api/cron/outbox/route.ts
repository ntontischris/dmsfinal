import { NextResponse, type NextRequest } from "next/server";

import { appOrigin } from "@/lib/app-origin";
import { isCronAuthorized } from "@/lib/email/outbox-trigger";
import { runOutboxWorker } from "@/lib/email/worker";
import { generateBillables } from "@/lib/finance/billables-generate";
import { cleanExpiredAttachmentSlots } from "@/lib/messages/attachments-cleanup";
import { scanAutomations } from "@/lib/notifications/automations-scan";
import { processEvents } from "@/lib/notifications/events-process";
import { createAdminClient } from "@/lib/supabase/admin";

// Το κλείδωμα της ουράς (5 λεπτά) πρέπει να ξεπερνά αυτό το όριο, αλλιώς μια αργή παρτίδα ξαναστέλνεται.
export const maxDuration = 60;

// Ο εργάτης της ουράς email: κάθε λεπτό (Vercel cron) και μετά από κάθε εγγραφή (σκούντημα).
// Πρώτα τα Τιμολογητέα (#151), το καθάρισμα συνημμένων (#162), η ουρά Γεγονότων (#170) και ο έλεγχος χρονισμών (#172: υπενθυμίσεις,
// ληξιπρόθεσμα, σύνοψη Μηνυμάτων, Αργίες κ.λπ.)· σφάλμα τους δεν σταματά τον εργάτη.
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
  const billables = await generateBillables(admin);
  const attachments = await cleanExpiredAttachmentSlots(admin);
  // Τελευταίοι πριν τον worker: τα email «automation» φεύγουν στον ίδιο κύκλο (#170, #172).
  const events = await processEvents(admin);
  const timed = await scanAutomations(admin);
  const summary = await runOutboxWorker(admin, appOrigin());
  return NextResponse.json({
    ...summary,
    billables,
    attachments,
    events,
    timed,
  });
}
