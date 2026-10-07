import { fileURLToPath } from "node:url";

import { report, walk } from "./lib/walk.mjs";

// Το repo είναι public (κεφ. 7): κανένα κλειδί δεν μπαίνει ποτέ στον κώδικα. Ελέγχει όλο το repo.
const PATTERNS = [
  [/eyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/, "JWT (π.χ. κλειδί Supabase)"],
  [/\bsb_(?:secret|publishable)_[\w-]{16,}/, "κλειδί Supabase"],
  [/\bsk_(?:live|test)_[\w]{16,}/, "κλειδί Stripe"],
  [/\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/, "κλειδί Resend"],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, "token GitHub"],
  [/\bAKIA[0-9A-Z]{16}\b/, "κλειδί AWS"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "ιδιωτικό κλειδί"],
  [/\bvck_[A-Za-z0-9]{20,}/, "κλειδί Vercel"],
];
const TEXT = [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".css", ".html", ".yml", ".yaml", ".sql", ".toml", ".txt", ".example"];

export function findSecrets(files) {
  const found = [];
  for (const file of files) {
    if (file.path.endsWith("pnpm-lock.yaml")) continue;
    file.text.split("\n").forEach((line, index) => {
      for (const [pattern, what] of PATTERNS) if (pattern.test(line)) found.push(`${file.path}:${index + 1}: ${what}`);
    });
  }
  return found;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repo = fileURLToPath(new URL("../..", import.meta.url));
  report("check:secrets", findSecrets(walk(repo, TEXT)));
}
