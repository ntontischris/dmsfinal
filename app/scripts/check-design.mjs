import { fileURLToPath } from "node:url";

import { report, walk } from "./lib/walk.mjs";

// Kit (Blueprint κεφ. 10): τα χρώματα ζουν μόνο στα tokens του globals.css.
// Απαγορεύονται χρώματα γραμμένα με το χέρι και η παλέτα του Tailwind (π.χ. bg-red-500).
const TOKENS_FILE = "src/app/globals.css";
const RULES = [
  [/#[0-9a-fA-F]{3,8}\b(?![\w-])/, "χρώμα hex"],
  [/\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/, "χρώμα με συνάρτηση"],
  [/\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|shadow|decoration|divide|accent|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/, "χρώμα της παλέτας Tailwind"],
  [/\b(?:bg|text|border)-(?:white|black)\b/, "λευκό/μαύρο εκτός tokens"],
];

export function findDesignViolations(files) {
  const violations = [];
  for (const file of files) {
    if (file.path === TOKENS_FILE) continue;
    file.text.split("\n").forEach((line, index) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      for (const [pattern, what] of RULES)
        if (pattern.test(line)) violations.push(`${file.path}:${index + 1}: ${what}: ${line.trim()}`);
    });
  }
  return violations;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  report("check:design", findDesignViolations(walk(root, [".ts", ".tsx", ".css"]).filter((f) => f.path.startsWith("src/"))));
}
