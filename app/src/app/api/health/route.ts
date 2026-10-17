import { NextResponse } from "next/server";

import { isSystemHealthy } from "@/modules/health";

// Ο δημόσιος έλεγχος (#215, Υ8) για την εξωτερική υπηρεσία (Better Stack): 200 όταν η βάση απαντά και η ουρά έτρεξε μέσα
// στα 10′, αλλιώς 503. Χωρίς cache και χωρίς κανένα δεδομένο πέρα από το ok· χωρίς service role.
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

async function respond(): Promise<NextResponse> {
  const ok = await isSystemHealthy();
  return NextResponse.json(
    { ok },
    { status: ok ? 200 : 503, headers: NO_STORE },
  );
}

export async function GET(): Promise<NextResponse> {
  return respond();
}

export async function HEAD(): Promise<NextResponse> {
  const response = await respond();
  return new NextResponse(null, { status: response.status, headers: NO_STORE });
}
