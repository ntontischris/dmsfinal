import { NextResponse, type NextRequest } from "next/server";

import { submitWebForm, type WebFormResult } from "@/modules/sales";

// Η δημόσια φόρμα ενδιαφέροντος της Ιστοσελίδας (b4). Δέχεται JSON ή κλασική φόρμα· τεκμηρίωση: docs/web-form.md.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

const STATUS_CODE: Readonly<Record<WebFormResult["status"], number>> = {
  ok: 200,
  invalid: 400,
  rate_limited: 429,
  error: 503,
};

// Η διεύθυνση του επισκέπτη: η πρώτη τιμή του x-forwarded-for (πίσω από proxy), αλλιώς x-real-ip.
const visitorIp = (request: NextRequest): string =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  request.headers.get("x-real-ip")?.trim() ||
  "";

async function bodyOf(request: NextRequest): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) return await request.json();
    if (
      type.includes("application/x-www-form-urlencoded") ||
      type.includes("multipart/form-data")
    ) {
      const form = await request.formData();
      return Object.fromEntries(
        [...form.entries()].filter(([, value]) => typeof value === "string"),
      );
    }
  } catch {
    return null;
  }
  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const result = await submitWebForm(await bodyOf(request), visitorIp(request));
  return NextResponse.json(
    { ok: result.status === "ok", status: result.status, field: result.field },
    { status: STATUS_CODE[result.status], headers: NO_STORE },
  );
}
