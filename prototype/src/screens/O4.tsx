import Link from "next/link";

import { O4Holidays } from "@/screens/o4-holidays";
import { O4Hours } from "@/screens/o4-hours";
import { O4Google, O4Rules } from "@/screens/o4-rules";
import { SettingsFrame } from "@/screens/o-shared";
import { screenHref, type ScreenProps } from "@/screens/shared";

import "./o4.css";

const PARTS = [
  { id: "rules", label: "Κανόνες" },
  { id: "hours", label: "Ωράριο και Χωρητικότητα" },
  { id: "holidays", label: "Αργίες" },
  { id: "google", label: "Ημερολόγιο Google" },
] as const;

type PartId = (typeof PARTS)[number]["id"];

const parsePart = (value: string | undefined): PartId =>
  PARTS.find((part) => part.id === value)?.id ?? "rules";

// O4 «Ρυθμίσεις: Γυρίσματα»: Διαχείριση και Ιδιοκτήτης. Τέσσερα μέρη με ?part=.
export function O4({ role, query }: ScreenProps) {
  const part = parsePart(query.part);
  return (
    <SettingsFrame
      role={role}
      query={query}
      code="O4"
      what="τις Ρυθμίσεις Γυρισμάτων"
    >
      {() => (
        <div className="o4">
          <nav
            className="tabs o4-parts"
            aria-label="Μέρη των Ρυθμίσεων Γυρισμάτων"
          >
            {PARTS.map((item) => (
              <Link
                key={item.id}
                className="tab"
                href={screenHref(role, "O4", {
                  state: query.state,
                  part: item.id === "rules" ? undefined : item.id,
                })}
                aria-current={item.id === part ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {part === "rules" && <O4Rules role={role} query={query} />}
          {part === "hours" && <O4Hours role={role} query={query} />}
          {part === "holidays" && <O4Holidays role={role} query={query} />}
          {part === "google" && <O4Google role={role} query={query} />}
        </div>
      )}
    </SettingsFrame>
  );
}
