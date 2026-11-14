import "server-only";

import { getViewer } from "@/modules/access";
import { readLogoFile } from "@/modules/settings";

import { agreementCaps } from "./helpers";
import { signedPdfFileName } from "./pdf/signed-pdf-labels";
import type { SignedPdfInput } from "./pdf/signed-pdf";
import { getAgreement, getProposalPreview } from "./queries-agreements";
import { getClientAgreement } from "./queries-client";

export type SignedPdf =
  | { ok: true; bytes: Uint8Array; fileName: string }
  | { ok: false; status: 404 | 500 };

type SignedPdfData = Omit<SignedPdfInput, "logo">;
type Source = { ok: true; input: SignedPdfData | null } | { ok: false };

// Ο Χρήστης πελάτη: μόνο δική του Συμφωνία που έχει υπογραφεί (η βάση κρίνει c.agreements και Πελάτη).
async function clientSource(agreementId: string): Promise<Source> {
  const view = await getClientAgreement(agreementId);
  if (!view.ok) return { ok: false };
  const agreement = view.data;
  if (!agreement?.document || !agreement.signature)
    return { ok: true, input: null };
  return {
    ok: true,
    input: {
      document: agreement.document,
      language: agreement.language,
      signedName: agreement.signature.signedName,
      signedOn: agreement.signature.signedOn,
    },
  };
}

// Η ομάδα: η Συμφωνία που βλέπει, αφού υπογραφεί· το έγγραφο έχει τιμές, άρα θέλει «Βλέπει ποσά».
async function teamSource(agreementId: string): Promise<Source> {
  const [detail, document] = await Promise.all([
    getAgreement(agreementId),
    getProposalPreview(agreementId),
  ]);
  if (!detail.ok || !document.ok) return { ok: false };
  const signature = detail.data?.signature;
  if (!detail.data || !document.data || !signature)
    return { ok: true, input: null };
  return {
    ok: true,
    input: {
      document: document.data,
      language: detail.data.language,
      signedName: signature.signedName,
      signedOn: signature.signedOn,
    },
  };
}

// Το PDF της υπογεγραμμένης Συμφωνίας. Κάθε άρνηση (άγνωστη, ξένη, χωρίς υπογραφή, χωρίς ποσά) φαίνεται ως 404.
export async function getSignedAgreementPdf(
  agreementId: string,
): Promise<SignedPdf> {
  const caps = agreementCaps(await getViewer());
  if (!caps.isClient && !caps.canSeeAmounts) return { ok: false, status: 404 };
  const source = caps.isClient
    ? await clientSource(agreementId)
    : await teamSource(agreementId);
  if (!source.ok) return { ok: false, status: 500 };
  if (!source.input) return { ok: false, status: 404 };
  // Η βιβλιοθήκη PDF φορτώνεται μόνο όταν ζητηθεί PDF, όχι σε κάθε σελίδα που διαβάζει Συμφωνίες.
  try {
    // Το λογότυπο είναι το τωρινό της Εταιρείας (null αν δεν ανέβηκε ή δεν διαβάστηκε: τότε μπαίνει του brand).
    const [{ renderSignedPdf }, logo] = await Promise.all([
      import("./pdf/signed-pdf"),
      readLogoFile(),
    ]);
    return {
      ok: true,
      bytes: await renderSignedPdf({ ...source.input, logo }),
      fileName: signedPdfFileName(agreementId),
    };
  } catch (error) {
    console.error("getSignedAgreementPdf", error);
    return { ok: false, status: 500 };
  }
}
