import { NextResponse } from "next/server";
import { z } from "zod";

import { getFileLink } from "@/modules/knowledge";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Λήψη Αρχείου της Γνώσης: η βάση ελέγχει ορατότητα (knowledge_file_path), ο server φτιάχνει σύνδεσμο 60″ και κάνει redirect.
// Κάθε άρνηση φαίνεται ίδια με «δεν βρέθηκε», για να μην υπάρχει oracle ύπαρξης.
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success)
    return new NextResponse(null, { status: 404, headers: NO_STORE });
  const link = await getFileLink(id);
  if (!link.ok)
    return new NextResponse(null, { status: link.status, headers: NO_STORE });
  const response = NextResponse.redirect(link.url, 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
