import { z } from "zod";

// Είσοδος επίδειξης: κουμπιά «Δες ως…» στην Είσοδο, για να δει ένας επισκέπτης τις οθόνες κάθε Ρόλου χωρίς κωδικό.
// Ανάβει μόνο όταν το Vercel έχει DEMO_LOGINS και DEMO_LOGIN_PASSWORD· χωρίς αυτά δεν φαίνεται τίποτα.
// Οι λογαριασμοί είναι κανονικοί Χρήστες (με πρόσκληση). Τα email και ο κωδικός μένουν στον server.

export interface DemoLogin {
  label: string;
  email: string;
}

type Env = Readonly<Record<string, string | undefined>>;

const demoLoginsSchema = z
  .array(z.object({ label: z.string().trim().min(1), email: z.email() }))
  .max(12);

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export function readDemoLogins(env: Env = process.env): DemoLogin[] {
  const raw = env.DEMO_LOGINS;
  if (!raw || !env.DEMO_LOGIN_PASSWORD) return [];
  const parsed = demoLoginsSchema.safeParse(parseJson(raw));
  if (!parsed.success) {
    console.error("DEMO_LOGINS", "μη έγκυρη μορφή");
    return [];
  }
  return parsed.data;
}

export const demoLabels = (env: Env = process.env): string[] =>
  readDemoLogins(env).map((login) => login.label);
