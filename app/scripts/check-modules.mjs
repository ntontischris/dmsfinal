import { fileURLToPath } from "node:url";

import { report, walk } from "./lib/walk.mjs";

// Όρια modules (ADR 0018): κάθε module ζει στο src/modules/<module>/ και οι άλλοι το βλέπουν
// μόνο από το index.ts του. Ένα import «@/modules/x/κάτι» επιτρέπεται μόνο μέσα στο ίδιο το x.
const IMPORT = /(?:import|export)[^"']*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

const moduleOf = (path) => path.match(/^src\/modules\/([^/]+)\//)?.[1] ?? null;

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
  report("check:modules", findModuleViolations(walk(root, [".ts", ".tsx"]).filter((f) => f.path.startsWith("src/"))));
}
