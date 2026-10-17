import { AI_MODELS } from "@/lib/ai/config";
import { PROVIDER_KEY_ENV, providerOf } from "@/lib/ai/available";
import type { AiProvider } from "@/lib/ai/config";
import { pingGoogleCalendar } from "@/lib/google/client";
import { readGoogleConfig } from "@/lib/google/config";
import { describeError } from "@/lib/google/describe-error";

import type { CheckableId } from "./connections";
import { usesFakeProviders } from "./environment";

// «Έλεγχος τώρα» (Ν9): μία φθηνή ζωντανή κλήση ανά πάροχο. Resend: η λίστα domains. Google: το ημερολόγιο. AI: η λίστα
// μοντέλων κάθε παρόχου που χρησιμοποιεί ο κώδικας. Το αποτέλεσμα έχει μόνο πάροχο και κωδικό, ποτέ κλειδί, URL ή σώμα.

type Env = Readonly<Record<string, string | undefined>>;

export type CheckOutcome = { isOk: true } | { isOk: false; error: string };

export interface CheckContext {
  env?: Env;
  fetchImpl?: typeof fetch;
  calendarId?: string | null;
}

const TIMEOUT_MS = 10_000;
const OK: CheckOutcome = { isOk: true };
const fail = (error: string): CheckOutcome => ({ isOk: false, error });

const networkError = (provider: string, error: unknown): CheckOutcome =>
  fail(
    error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
      ? `${provider}: λήξη χρόνου`
      : `${provider}: σφάλμα δικτύου`,
  );

async function get(
  fetchImpl: typeof fetch,
  url: string,
  headers: Record<string, string>,
): Promise<Response> {
  return fetchImpl(url, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

// Ένα κλειδί «μόνο αποστολή» του Resend δεν διαβάζει domains (401 restricted_api_key), αλλά αποδεικνύει ότι το κλειδί ισχύει.
async function checkResend(
  env: Env,
  fetchImpl: typeof fetch,
): Promise<CheckOutcome> {
  const key = env.RESEND_API_KEY;
  if (!key) return fail("Λείπει το RESEND_API_KEY");
  try {
    const response = await get(fetchImpl, "https://api.resend.com/domains", {
      Authorization: `Bearer ${key}`,
    });
    if (response.ok) return OK;
    const body = (await response.json().catch(() => ({}))) as {
      name?: unknown;
    };
    return body.name === "restricted_api_key"
      ? OK
      : fail(`Resend ${response.status}`);
  } catch (error) {
    return networkError("Resend", error);
  }
}

const MODEL_LISTS: Readonly<
  Record<
    AiProvider,
    (key: string) => { url: string; headers: Record<string, string> }
  >
> = {
  openai: (key) => ({
    url: "https://api.openai.com/v1/models",
    headers: { Authorization: `Bearer ${key}` },
  }),
  anthropic: (key) => ({
    url: "https://api.anthropic.com/v1/models",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
  }),
  google: (key) => ({
    url: "https://generativelanguage.googleapis.com/v1beta/models",
    headers: { "x-goog-api-key": key },
  }),
};

const PROVIDER_NAMES: Readonly<Record<AiProvider, string>> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google AI",
};

export const usedAiProviders = (): AiProvider[] => [
  ...new Set([providerOf(AI_MODELS.chat), providerOf(AI_MODELS.embedding)]),
];

async function checkAiProvider(
  provider: AiProvider,
  env: Env,
  fetchImpl: typeof fetch,
): Promise<CheckOutcome> {
  const name = PROVIDER_NAMES[provider];
  const key = env[PROVIDER_KEY_ENV[provider]];
  if (!key) return fail(`Λείπει το ${PROVIDER_KEY_ENV[provider]}`);
  try {
    const request = MODEL_LISTS[provider](key);
    const response = await get(fetchImpl, request.url, request.headers);
    return response.ok ? OK : fail(`${name} ${response.status}`);
  } catch (error) {
    return networkError(name, error);
  }
}

async function checkAi(
  env: Env,
  fetchImpl: typeof fetch,
): Promise<CheckOutcome> {
  for (const provider of usedAiProviders()) {
    const outcome = await checkAiProvider(provider, env, fetchImpl);
    if (!outcome.isOk) return outcome;
  }
  return OK;
}

async function checkGoogle(
  env: Env,
  calendarId: string | null,
): Promise<CheckOutcome> {
  const config = readGoogleConfig(env);
  if (!config) return fail("Λείπουν τα στοιχεία του λογαριασμού Google");
  try {
    await pingGoogleCalendar(config, calendarId);
    return OK;
  } catch (error) {
    return fail(describeError(error));
  }
}

export async function runLiveCheck(
  id: CheckableId,
  context: CheckContext = {},
): Promise<CheckOutcome> {
  const env = context.env ?? process.env;
  if (usesFakeProviders(env)) return OK;
  const fetchImpl = context.fetchImpl ?? fetch;
  if (id === "email") return checkResend(env, fetchImpl);
  if (id === "ai") return checkAi(env, fetchImpl);
  return checkGoogle(env, context.calendarId ?? null);
}
