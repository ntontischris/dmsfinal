import { NextResponse } from "next/server";
import { z } from "zod";

import { getSignedFileLink } from "@/modules/agreements";

interface RouteContext {
  params: Promise<{ agreementId: string }>;
}

// Το υπογεγραμμένο αρχείο μιας Συμφωνίας: η βάση ελέγχει ότι ο Χρήστης τη βλέπει (agreement_signed_file_path), ο server
// φτιάχνει σύνδεσμο 60″ και κάνει redirect. Κάθε άρνηση φαίνεται ως «δεν βρέθηκε», για να μην υπάρχει oracle ύπαρξης.
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { agreementId } = await context.params;
  if (!z.uuid().safeParse(agreementId).success)
    return new NextResponse(null, { status: 404 });
  const link = await getSignedFileLink(agreementId);
  if (!link.ok) return new NextResponse(null, { status: link.status });
  const response = NextResponse.redirect(link.url, 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
