import { NextResponse, type NextRequest } from "next/server";

import { readLogoFile } from "@/modules/settings";

// e1: το λογότυπο της εταιρείας για τη μπάρα της εφαρμογής και για τα email (γι' αυτό χωρίς σύνδεση).
// Χωρίς λογότυπο, ή αν το αρχείο δεν διαβάζεται, στέλνει στο προεπιλεγμένο /logo-email.png.
export const dynamic = "force-dynamic";

const FALLBACK = "/logo-email.png";

export async function GET(request: NextRequest): Promise<Response> {
  const logo = await readLogoFile();
  if (logo === null)
    return NextResponse.redirect(new URL(FALLBACK, request.url), 307);
  return new Response(new Uint8Array(logo.bytes), {
    headers: {
      "content-type": logo.type,
      "cache-control": "public, max-age=300",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'",
    },
  });
}
