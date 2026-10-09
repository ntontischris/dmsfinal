import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildAuthEmail, parseAuthHookPayload } from "@/lib/email/auth-hook";
import { verifyStandardWebhook } from "@/lib/email/standard-webhooks";
import { sendEmail } from "@/lib/email/send-email";
import { recordEmailLog } from "@/lib/email/log";

// Send Email Hook της Supabase (ADR 0016): η Supabase φτιάχνει το token, εμείς στέλνουμε το email.
// Απάντηση: 200 {} σε επιτυχία· 401 σε λάθος υπογραφή· 500 σε αποτυχία αποστολής (η Supabase δείχνει σφάλμα).
export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "hook not configured" }, { status: 500 });

  const body = await request.text();
  const verdict = verifyStandardWebhook({
    id: request.headers.get("webhook-id"),
    timestamp: request.headers.get("webhook-timestamp"),
    signature: request.headers.get("webhook-signature"),
    body,
    secret,
    nowSeconds: Math.floor(Date.now() / 1000),
  });
  if (!verdict.ok) {
    console.error("send-email hook", verdict.reason);
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const parsed = parseAuthHookPayload(safeJson(body));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

  const origin = new URL(request.url).origin;
  const email = buildAuthEmail(parsed.data, origin);
  if (!email) return NextResponse.json({ error: "unsupported email type" }, { status: 400 });

  const outcome = await sendEmail({ to: email.to, toName: email.toName, ...email.message });
  await recordEmailLog(createAdminClient(), {
    kind: email.type,
    toEmail: email.to,
    subject: email.message.subject,
    outcome,
  });
  if (outcome.status === "failed") {
    return NextResponse.json({ error: { http_code: 500, message: "Η αποστολή email απέτυχε." } }, { status: 500 });
  }
  return NextResponse.json({});
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
