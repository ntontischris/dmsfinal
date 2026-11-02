import { Blocks } from "./_specimens/blocks";
import { Controls } from "./_specimens/controls";
import { ScreenHeader } from "@/components/shell/screen-header";

export const metadata = { title: "Kit" };

const SECTIONS: readonly [string, string][] = [
  ["buttons", "Κουμπιά"],
  ["fields", "Πεδία"],
  ["filters", "Φίλτρα"],
  ["tabs", "Καρτέλες"],
  ["badges", "Σήματα"],
  ["stats", "Δείκτες"],
  ["panel", "Πάνελ"],
  ["rows", "Λίστες"],
  ["table", "Πίνακας"],
  ["inspector", "Πλαϊνή στήλη"],
  ["timeline", "Timeline"],
  ["steps", "Βήματα"],
  ["states", "Καταστάσεις"],
];

// Το Kit «Μοντάζ» στην πραγματική εφαρμογή: κάθε component σε ζωντανό δείγμα. Αναφορά: Blueprint κεφ. 10.
export default async function KitPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f } = await searchParams;
  return (
    <>
      <ScreenHeader eyebrow="Kit · «Μοντάζ»" title="Ένα σύστημα, μέσα κι έξω" />
      <nav
        aria-label="Περιεχόμενα"
        className="flex flex-wrap gap-x-3 gap-y-1 border-y py-3 text-sm"
      >
        {SECTIONS.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="text-muted-foreground no-underline hover:text-foreground"
          >
            {label}
          </a>
        ))}
      </nav>
      <Controls filter={f ?? "open"} />
      <Blocks />
    </>
  );
}
