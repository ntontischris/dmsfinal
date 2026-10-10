import { posix } from "node:path";
import { fileURLToPath } from "node:url";

import { report, walk } from "./lib/walk.mjs";

// Όρια modules (ADR 0018): κάθε module ζει στο src/modules/<module>/ και οι άλλοι το βλέπουν
// μόνο από το index.ts του. Ένα import «@/modules/x/κάτι» επιτρέπεται μόνο μέσα στο ίδιο το x.
const IMPORT = /(?:import|export)[^"']*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

const moduleOf = (path) => path.match(/^src\/modules\/([^/]+)\//)?.[1] ?? null;

// Το service role (`@/lib/supabase/admin`) μπαίνει μόνο στα αρχεία που το έχουν ανάγκη (ADR 0016, ADR 0018):
// τα routes του hook και του cron, τα deliver της ουράς, και οι ενέργειες πρόσβασης που χρειάζονται `auth.admin`.
// Ελέγχεται με την πραγματική διαδρομή (σχετικά imports, χωρίς επέκταση) και απορρίπτει dynamic import χωρίς σταθερή διαδρομή.
const ADMIN_MODULE = "src/lib/supabase/admin";
const ADMIN_FILES = new Set([
  "src/app/api/hooks/send-email/route.ts",
  "src/app/api/cron/outbox/route.ts",
  "src/lib/email/deliver-outbox.ts",
  "src/lib/email/deliver-agreement.ts",
  "src/modules/access/provision.ts",
  "src/modules/access/client-user-actions.ts",
  "src/modules/access/team-actions.ts",
]);
// Τα `import type` δεν φτάνουν ποτέ στο κώδικα που τρέχει, άρα δεν μετράνε.
const SPECIFIER = /(?:import|export)(?!\s+type\s)[^"']*?from\s*["']([^"']+)["']|(?:import|require)\(\s*["']([^"']+)["']\s*\)/g;
const DYNAMIC_NON_LITERAL = /import\(\s*(?!["'])/;

// Η διαδρομή ενός import σε σχέση με το αρχείο του, χωρίς επέκταση. Null για πακέτα (π.χ. «next/server»).
export function resolveImport(fromPath, spec) {
  const target = spec.startsWith("@/") ? `src/${spec.slice(2)}` : spec.startsWith(".") ? posix.join(posix.dirname(fromPath), spec) : null;
  return target === null ? null : posix.normalize(target).replace(/\.(ts|tsx|mjs|js)$/, "");
}

const specifiersOf = (text) => [...text.matchAll(SPECIFIER)].map((match) => match[1] ?? match[2]);

export function findAdminViolations(files) {
  const violations = [];
  for (const file of files) {
    if (DYNAMIC_NON_LITERAL.test(file.text)) violations.push(`${file.path}: import() με μη σταθερή διαδρομή`);
    const reachesAdmin = specifiersOf(file.text).some((spec) => resolveImport(file.path, spec) === ADMIN_MODULE);
    if (reachesAdmin && !ADMIN_FILES.has(file.path)) violations.push(`${file.path}: «@/lib/supabase/admin» (μόνο στα επιτρεπόμενα αρχεία)`);
  }
  return violations;
}

export function findModuleViolations(files) {
  const violations = [];
  for (const file of files) {
    const own = moduleOf(file.path);
    for (const match of file.text.matchAll(IMPORT)) {
      const spec = match[1] ?? match[2];
      const deep = spec.match(/^@\/modules\/([^/]+)\/.+/);
      if (deep && deep[1] !== own) violations.push(`${file.path}: «${spec}» (μόνο «@/modules/${deep[1]}»)`);
      if (own && spec.startsWith("..") && /(^|\/)\.\.\/\.\.\//.test(spec))
        violations.push(`${file.path}: «${spec}» (σχετικό import έξω από το module)`);
    }
  }
  return violations;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const sources = walk(root, [".ts", ".tsx"]).filter((f) => f.path.startsWith("src/"));
  report("check:modules", [...findModuleViolations(sources), ...findAdminViolations(sources)]);
}
