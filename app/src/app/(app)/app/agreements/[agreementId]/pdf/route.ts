import { NextResponse } from "next/server";
import { z } from "zod";

import { getSignedAgreementPdf } from "@/modules/agreements";

interface RouteContext {
  params: Promise<{ agreementId: string }>;
}

// Το PDF της υπογεγραμμένης Συμφωνίας, για τον πελάτη και την ομάδα. Κάθε άρνηση φαίνεται ως «δεν βρέθηκε», όπως στο
// signed-file, για να μην υπάρχει oracle ύπαρξης.
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { agreementId } = await context.params;
  if (!z.uuid().safeParse(agreementId).success)
    return new NextResponse(null, { status: 404 });
  const pdf = await getSignedAgreementPdf(agreementId);
  if (!pdf.ok) return new NextResponse(null, { status: pdf.status });
  return new NextResponse(new Uint8Array(pdf.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdf.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
