"use server";

import { clientRequestCodeSchema, clientSignSchema } from "./schemas";
import { callSignRpc, FAILED, visitor } from "./sign-rpc";
import type { PublicResult } from "./types";

// Η υπογραφή του Χρήστη πελάτη μέσα στην εφαρμογή (D2). Η βάση κρίνει τα πάντα: Δικαίωμα (c.agreements + c.sign),
// Πελάτη και ότι το email του Χρήστη είναι του Υπογράφοντα. Ίδια βήματα και ίδια όρια κωδικού με τον Σύνδεσμο.

export async function requestClientSigningCode(input: {
  agreementId: string;
  name: string;
  accepted: boolean;
}): Promise<PublicResult> {
  const parsed = clientRequestCodeSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "name") return { status: "invalid_name" };
    if (field === "accepted") return { status: "not_accepted" };
    return FAILED;
  }
  const { ip } = await visitor();
  return callSignRpc("agreement_client_request_code", {
    p_agreement: parsed.data.agreementId,
    p_name: parsed.data.name,
    p_accepted: parsed.data.accepted,
    p_ip: ip,
  });
}

export async function signAsClient(input: {
  agreementId: string;
  code: string;
}): Promise<PublicResult> {
  const parsed = clientSignSchema.safeParse(input);
  if (!parsed.success) return FAILED;
  const { ip, agent } = await visitor();
  return callSignRpc("agreement_client_sign", {
    p_agreement: parsed.data.agreementId,
    p_code: parsed.data.code,
    p_ip: ip,
    p_user_agent: agent,
  });
}
