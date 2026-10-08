"use server";

import { headers } from "next/headers";
import type { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import {
  changesSchema,
  declineSchema,
  requestCodeSchema,
  signSchema,
} from "./schemas";
import type { PublicResult } from "./types";
import { publicResultSchema } from "./view-schema";

// Οι ενέργειες του πελάτη στη D5. Ανώνυμες: μιλούν μόνο στα agreement_public_*, με token.
// Δεν είναι form actions (η ροή υπογραφής έχει δικά της βήματα στον browser) και δεν κάνουν
// revalidate ή redirect. Ποτέ exception: κάθε αποτυχία γίνεται {status}.
// Το token και ο κωδικός δεν καταγράφονται πουθενά, ούτε στα σφάλματα.

const FAILED: PublicResult = { status: "error" };
const MAX_IP = 64;
const MAX_AGENT = 300;

// Η διεύθυνση του επισκέπτη: η πρώτη τιμή του x-forwarded-for (πίσω από proxy), αλλιώς x-real-ip.
async function visitor(): Promise<{ ip: string; agent: string }> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || list.get("x-real-ip")?.trim() || "";
  return {
    ip: ip.slice(0, MAX_IP),
    agent: (list.get("user-agent") ?? "").slice(0, MAX_AGENT),
  };
}

async function callPublic(
  name: string,
  args: Record<string, unknown>,
): Promise<PublicResult> {
  const supabase = await createSupabase();
  if (!supabase) return FAILED;
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    console.error("agreements public", error.code);
    return FAILED;
  }
  const parsed = publicResultSchema.safeParse(data);
  if (parsed.success) return parsed.data;
  console.error("agreements public", "unreadable answer");
  return FAILED;
}

// Το λάθος φόρμας που ξέρει να πει ο πελάτης (όνομα, όροι, μήνυμα) γίνεται το αντίστοιχο status· τα υπόλοιπα «error».
const invalidInput = (
  error: z.ZodError,
  byField: Readonly<Record<string, PublicResult>>,
): PublicResult => {
  const field = error.issues[0]?.path[0];
  return (typeof field === "string" ? byField[field] : undefined) ?? FAILED;
};

export async function requestSigningCode(input: {
  token: string;
  name: string;
  accepted: boolean;
}): Promise<PublicResult> {
  const parsed = requestCodeSchema.safeParse(input);
  if (!parsed.success)
    return invalidInput(parsed.error, {
      name: { status: "invalid_name" },
      accepted: { status: "not_accepted" },
    });
  const { ip } = await visitor();
  return callPublic("agreement_public_request_code", {
    p_token: parsed.data.token,
    p_name: parsed.data.name,
    p_accepted: parsed.data.accepted,
    p_ip: ip,
  });
}

export async function signProposal(input: {
  token: string;
  code: string;
}): Promise<PublicResult> {
  const parsed = signSchema.safeParse(input);
  if (!parsed.success) return FAILED;
  const { ip, agent } = await visitor();
  return callPublic("agreement_public_sign", {
    p_token: parsed.data.token,
    p_code: parsed.data.code,
    p_ip: ip,
    p_user_agent: agent,
  });
}

export async function requestChanges(input: {
  token: string;
  message: string;
}): Promise<PublicResult> {
  const parsed = changesSchema.safeParse(input);
  if (!parsed.success)
    return invalidInput(parsed.error, {
      message: { status: "invalid_message" },
    });
  const { ip } = await visitor();
  return callPublic("agreement_public_request_changes", {
    p_token: parsed.data.token,
    p_message: parsed.data.message,
    p_ip: ip,
  });
}

export async function declineProposal(input: {
  token: string;
  reason: string;
}): Promise<PublicResult> {
  const parsed = declineSchema.safeParse(input);
  if (!parsed.success) return FAILED;
  const { ip } = await visitor();
  return callPublic("agreement_public_decline", {
    p_token: parsed.data.token,
    p_reason: parsed.data.reason,
    p_ip: ip,
  });
}
