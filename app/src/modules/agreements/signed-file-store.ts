import "server-only";

import type { FormState } from "@/lib/form-state";

import { callRpc, refreshAgreements } from "./action-support";
import { removeSignedFile, uploadSignedFile } from "./agreement-files";
import {
  SIGNED_FILE_MESSAGE,
  hasFileSignature,
  isSignedFileOk,
  signedFileExtension,
} from "./lifecycle-schema";

// Το υπογεγραμμένο αρχείο (b12): η βάση δίνει θέση (με έλεγχο Δικαιώματος) → ανέβασμα με service role → καταχώριση.
// Αν η καταχώριση αποτύχει, το νέο αρχείο σβήνεται· αν πέτυχε αντικατάσταση, σβήνεται το παλιό.

export const hasFile = (value: unknown): boolean =>
  value instanceof File && value.size > 0;

async function readChecked(
  file: unknown,
): Promise<{ bytes: Buffer; ext: string; file: File } | null> {
  if (!isSignedFileOk(file)) return null;
  const ext = signedFileExtension(file.type);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (ext === null || !hasFileSignature(bytes, ext)) return null;
  return { bytes, ext, file };
}

export async function storeSignedFile(
  agreementId: string,
  value: unknown,
): Promise<FormState> {
  const checked = await readChecked(value);
  if (checked === null) return { error: SIGNED_FILE_MESSAGE };
  const slot = await callRpc("agreement_signed_file_slot", {
    p_agreement: agreementId,
    p_ext: checked.ext,
  });
  if (!slot.ok) return slot.state;
  const path = String(slot.data);
  const stored = await uploadSignedFile({
    path,
    bytes: checked.bytes,
    type: checked.file.type,
  });
  if (!stored.ok) return { error: stored.error };
  const attached = await callRpc("agreement_signed_file_attach", {
    p_agreement: agreementId,
    p_path: path,
    p_name: checked.file.name,
    p_type: checked.file.type,
    p_size: checked.file.size,
  });
  if (!attached.ok) {
    await removeSignedFile(path);
    return attached.state;
  }
  if (typeof attached.data === "string") await removeSignedFile(attached.data);
  refreshAgreements();
  return { notice: "Το υπογεγραμμένο αρχείο αποθηκεύτηκε." };
}
