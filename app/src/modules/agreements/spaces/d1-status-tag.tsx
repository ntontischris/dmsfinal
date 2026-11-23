import { explainStatus } from "@/spaces/data/glossary";
import { StatusHelp } from "@/spaces/screens/status-help";

// Η μικρή ετικέτα κατάστασης μιας γραμμής (D1, D4) στη μορφή των «Χρημάτων»· αν η λέξη είναι όρος του γλωσσαριού,
// δίπλα της μένει το «?» με την εξήγηση. waiting = περιμένει τον πελάτη, urgent = θέλει προσοχή.
export type TagTone = "waiting" | "urgent";

export function StatusTag({ label, tone }: { label: string; tone?: TagTone }) {
  const entries = explainStatus(label);
  return (
    <span className="d1l-tag">
      <span className="ml-tag" data-tone={tone}>
        {label}
      </span>
      {entries.length > 0 && <StatusHelp label={label} entries={entries} />}
    </span>
  );
}
