"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { detailsSchema } from "./schemas";

// Στοιχεία χώρου του Γυρίσματος (c9): επαφή στον χώρο, τηλέφωνο, σύνδεσμος αρχείων. Αλλάζουν και μετά το «έγινε».
export async function saveFilmingDetails(_: FormState, form: FormData): Promise<FormState> {
  const parsed = detailsSchema.safeParse(
    pick(form, ["filmingId", "contactName", "contactPhone", "filesUrl"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { filmingId, contactName, contactPhone, filesUrl } = parsed.data;
  const outcome = await callRpc("filming_details_save", {
    p_id: filmingId,
    p_contact_name: contactName,
    p_contact_phone: contactPhone,
    p_files_url: filesUrl,
  });
  return finishWith(outcome, "Τα στοιχεία χώρου αποθηκεύτηκαν.");
}
