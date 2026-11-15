import "server-only";

import { headers } from "next/headers";

import { createSupabase } from "@/lib/supabase/server";

import type { PublicResult } from "./types";
import { publicResultSchema } from "./view-schema";

// Κοινά της υπογραφής για τον Σύνδεσμο (D5, ανώνυμα) και για τον Χρήστη πελάτη μέσα στην εφαρμογή (D2).
// Ποτέ exception: κάθε αποτυχία γίνεται {status: "error"}. Ούτε token ούτε κωδικός γράφονται στα σφάλματα.

export const FAILED: PublicResult = { status: "error" };
const MAX_IP = 64;
const MAX_AGENT = 300;

// Η διεύθυνση του επισκέπτη: η πρώτη τιμή του x-forwarded-for (πίσω από proxy), αλλιώς x-real-ip.
export async function visitor(): Promise<{ ip: string; agent: string }> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || list.get("x-real-ip")?.trim() || "";
  return {
    ip: ip.slice(0, MAX_IP),
    agent: (list.get("user-agent") ?? "").slice(0, MAX_AGENT),
  };
}

export async function callSignRpc(
  name: string,
  args: Record<string, unknown>,
): Promise<PublicResult> {
  const supabase = await createSupabase();
  if (!supabase) return FAILED;
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    console.error("agreements sign", name, error.code);
    return FAILED;
  }
  const parsed = publicResultSchema.safeParse(data);
  if (parsed.success) return parsed.data;
  console.error("agreements sign", name, "unreadable answer");
  return FAILED;
}
