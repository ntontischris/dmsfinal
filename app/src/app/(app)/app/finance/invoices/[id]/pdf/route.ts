import { NextResponse } from "next/server";
import { z } from "zod";

import { getInvoicePdfLink } from "@/modules/finance";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Το PDF ενός Τιμολογίου: η βάση ελέγχει το Δικαίωμα (invoice_pdf_path), ο server φτιάχνει σύνδεσμο 60″ και κάνει redirect.
// Κάθε άρνηση φαίνεται ίδια με «δεν βρέθηκε» προς τα έξω, για να μην υπάρχει oracle ύπαρξης.
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });
  const link = await getInvoicePdfLink(id);
  if (!link.ok) return new NextResponse(null, { status: link.status === 403 ? 404 : link.status });
  return NextResponse.redirect(link.url, 307);
}
