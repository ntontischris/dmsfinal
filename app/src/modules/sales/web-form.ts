import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { supabaseConfig } from "@/lib/supabase/config";

// Η δημόσια φόρμα ενδιαφέροντος της Ιστοσελίδας (b4): έλεγχος με Zod, honeypot, και μετά η sales_web_form
// με το δημόσιο κλειδί, χωρίς συνεδρία και χωρίς service role. Το όριο ρυθμού το κρατά η βάση.

// Το «παγιδευμένο» πεδίο: κρυφό για τον άνθρωπο, το γεμίζουν τα bots.
export const HONEYPOT_FIELD = "website";

const text = (max: number) => z.string().trim().max(max);

export const webFormSchema = z.object({
  name: text(120).default(""),
  contact_name: text(120).min(1),
  contact_email: z.string().trim().toLowerCase().max(200).pipe(z.email()),
  contact_phone: text(40).default(""),
  message: text(2000).default(""),
  [HONEYPOT_FIELD]: z.string().max(500).default(""),
});

export type WebFormStatus = "ok" | "invalid" | "rate_limited" | "error";

export interface WebFormResult {
  status: WebFormStatus;
  field?: string;
}

const answerSchema = z.object({
  status: z.enum(["ok", "invalid", "rate_limited"]),
  field: z.string().optional(),
});

const invalidOf = (error: z.ZodError): WebFormResult => {
  const field = error.issues[0]?.path[0];
  return typeof field === "string"
    ? { status: "invalid", field }
    : { status: "invalid" };
};

async function callWebForm(
  form: Omit<z.infer<typeof webFormSchema>, typeof HONEYPOT_FIELD>,
  ip: string,
): Promise<WebFormResult> {
  const config = supabaseConfig();
  if (!config) return { status: "error" };
  const client = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.rpc("sales_web_form", {
    p_form: form,
    p_ip: ip,
  });
  if (error) {
    console.error("sales_web_form", error.code);
    return { status: "error" };
  }
  const parsed = answerSchema.safeParse(data);
  return parsed.success ? parsed.data : { status: "error" };
}

// Γεμάτο honeypot → «ok» χωρίς καταχώριση (το bot δεν μαθαίνει ότι κόπηκε).
export async function submitWebForm(
  input: unknown,
  ip: string,
): Promise<WebFormResult> {
  const parsed = webFormSchema.safeParse(input);
  if (!parsed.success) return invalidOf(parsed.error);
  const { [HONEYPOT_FIELD]: trap, ...form } = parsed.data;
  if (trap.trim() !== "") return { status: "ok" };
  try {
    return await callWebForm(form, ip.slice(0, 64));
  } catch (error) {
    console.error(
      "sales_web_form",
      error instanceof Error ? error.message : "unknown",
    );
    return { status: "error" };
  }
}
