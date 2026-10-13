import { NextResponse } from "next/server";
import { z } from "zod";

import { getImageLink } from "@/modules/knowledge";

interface RouteContext {
  params: Promise<{ id: string; name: string }>;
}

// Εικόνα μέσα σε Άρθρο: ίδιος έλεγχος ορατότητας με το Άρθρο (ή knowledge.manage για προεπισκόπηση), σύνδεσμος 60″.
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id, name } = await context.params;
  if (!z.uuid().safeParse(id).success)
    return new NextResponse(null, { status: 404, headers: NO_STORE });
  const link = await getImageLink(id, name);
  if (!link.ok)
    return new NextResponse(null, { status: link.status, headers: NO_STORE });
  const response = NextResponse.redirect(link.url, 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
