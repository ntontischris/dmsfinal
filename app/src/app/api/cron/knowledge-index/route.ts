import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isCronAuthorized } from "@/lib/email/outbox-trigger";
import { runKnowledgeIndex } from "@/lib/knowledge-index/worker";
import { createAdminClient } from "@/lib/supabase/admin";

// Η μνήμη του Βοηθού (#191): κάθε λεπτό (Vercel cron) ένας γύρος της ουράς, και μετά από κάθε αλλαγή στη Γνώση το σκούντημα
// (?item=<id> για ένα στοιχείο, ?kick=1 για έναν γύρο). Μόνο το cron του λεπτού γράφει στο job_runs (knowledge_index_mark):
// έναρξη και τέλος· κολλημένη ουρά μετρά ως σφάλμα, ώστε να φαίνεται στην Υγεία. Χωρίς AI: 200 με «skipped».
// Χωρίς CRON_SECRET: 500· με λάθος ή λείπον Bearer: 401.
export const maxDuration = 60;

async function mark(
  admin: SupabaseClient,
  ok: boolean | null,
  error: string | null,
): Promise<void> {
  const { error: rpcError } = await admin.rpc("knowledge_index_mark", {
    p_ok: ok,
    p_error: error,
  });
  if (rpcError) console.error("knowledge_index_mark", rpcError.message);
}

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
  const params = request.nextUrl.searchParams;
  const item = z.uuid().safeParse(params.get("item"));
  if (item.success)
    return NextResponse.json(
      await runKnowledgeIndex(admin, { itemId: item.data, limit: 1 }),
    );
  if (params.get("kick") === "1")
    return NextResponse.json(await runKnowledgeIndex(admin));
  await mark(admin, null, null);
  try {
    const summary = await runKnowledgeIndex(admin);
    await mark(admin, true, null);
    return NextResponse.json(summary);
  } catch (error) {
    await mark(
      admin,
      false,
      error instanceof Error ? error.message : "Η μνήμη του Βοηθού σταμάτησε",
    );
    throw error;
  }
}
