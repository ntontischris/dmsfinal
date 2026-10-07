import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SKIP = new Set(["node_modules", ".next", ".git", ".vercel", "coverage", "dist"]);

// Όλα τα αρχεία κάτω από έναν φάκελο, με σχετική διαδρομή (πάντα με /) και περιεχόμενο.
export function walk(root, extensions) {
  const out = [];
  const visit = (dir) => {
    for (const name of readdirSync(dir)) {
      if (SKIP.has(name)) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) visit(full);
      else if (!extensions || extensions.some((ext) => name.endsWith(ext)))
        out.push({ path: relative(root, full).split(sep).join("/"), text: readFileSync(full, "utf8") });
    }
  };
  visit(root);
  return out;
}

// Τυπώνει τα ευρήματα και τερματίζει με σφάλμα αν υπάρχουν.
export function report(name, violations) {
  if (violations.length === 0) {
    console.log(`${name}: εντάξει`);
    return;
  }
  for (const v of violations) console.error(`${name}: ${v}`);
  process.exit(1);
}
