import type { SupabaseClient } from "@supabase/supabase-js";

import { confirmLink } from "./auth-hook";

// Σύνδεσμος για Χρήστη που ήδη προσκλήθηκε ή προστίθεται (ο worker τον στέλνει με δικό μας email).
// Πρώτα «πρόσκληση» (δημιουργεί τον λογαριασμό αν λείπει)· αν υπάρχει ήδη, «σύνδεσμος εισόδου».
// Ο Χρήστης που μπαίνει μέσω πρόσκλησης περνά από το set-password (το κάνει το /auth/confirm).

export type AccessLinkType = "invite" | "magiclink";

export interface AccessLinkInput {
  origin: string;
  email: string;
  name: string;
  locale: string;
  preferMagic?: boolean;
  metadata?: Record<string, string>;
}

export type AccessLinkResult =
  | { ok: true; link: string; userId: string; type: AccessLinkType; existing: boolean }
  | { ok: false; error: string };

const alreadyRegistered = (error: { code?: string; status?: number }): boolean =>
  error.code === "email_exists" || error.status === 422;

async function generate(
  admin: SupabaseClient,
  type: AccessLinkType,
  input: AccessLinkInput,
) {
  const metadata = type === "invite" ? { name: input.name, locale: input.locale, ...input.metadata } : undefined;
  return admin.auth.admin.generateLink({
    type,
    email: input.email,
    options: metadata ? { data: metadata } : undefined,
  });
}

export async function accessLinkFor(admin: SupabaseClient, input: AccessLinkInput): Promise<AccessLinkResult> {
  const requested: AccessLinkType = input.preferMagic ? "magiclink" : "invite";
  let type = requested;
  let result = await generate(admin, type, input);
  if (result.error && type === "invite" && alreadyRegistered(result.error)) {
    type = "magiclink";
    result = await generate(admin, type, input);
  }
  const hashed = result.data?.properties?.hashed_token;
  const userId = result.data?.user?.id;
  if (result.error || !hashed || !userId) {
    console.error("accessLinkFor", result.error?.code ?? "χωρίς κωδικό");
    return { ok: false, error: "Ο σύνδεσμος δεν δημιουργήθηκε" };
  }
  return { ok: true, link: confirmLink(input.origin, hashed, type), userId, type, existing: type === "magiclink" };
}
