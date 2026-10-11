import { NextResponse } from "next/server";
import { z } from "zod";

import { getAttachmentLink } from "@/modules/messages";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Λήψη συνημμένου Μηνύματος: η βάση ελέγχει ορατότητα (message_attachment_path), ο server φτιάχνει σύνδεσμο 60″ και κάνει redirect.
// Κάθε άρνηση φαίνεται ίδια με «δεν βρέθηκε», για να μην υπάρχει oracle ύπαρξης.
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });
  const link = await getAttachmentLink(id);
  if (!link.ok) return new NextResponse(null, { status: link.status });
  const response = NextResponse.redirect(link.url, 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
