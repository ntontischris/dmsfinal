import type { CrewMember, EquipmentLine } from "../types";
import type { E3Balance } from "./e3-model";

// Η μία γραμμή σύνοψης κάθε κλειστού κουτιού της σελίδας Γυρίσματος.
export interface BoxSummary {
  text: string;
  isAlert: boolean;
}

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

const RESPONSE_PARTS: readonly [CrewMember["response"], string][] = [
  ["confirmed", "επιβεβαιώνουν"],
  ["pending", "αναμένει"],
  ["declined", "δεν μπορεί"],
];

export const crewSummary = (crew: readonly CrewMember[]): BoxSummary => {
  if (crew.length === 0) return { text: "Κανείς ακόμα", isAlert: true };
  const parts = RESPONSE_PARTS.map(([response, word]) => ({
    count: crew.filter((member) => member.response === response).length,
    word,
  }))
    .filter(({ count }) => count > 0)
    .map(({ count, word }) => `${count} ${word}`);
  return {
    text: [plural(crew.length, "άτομο", "άτομα"), ...parts].join(" · "),
    isAlert: crew.some((member) => member.response === "declined"),
  };
};

const needsCare = (line: EquipmentLine): boolean =>
  line.conflict || line.status !== "available";

export const equipmentSummary = (
  lines: readonly EquipmentLine[],
): BoxSummary => {
  if (lines.length === 0) return { text: "Τίποτα δεσμευμένο", isAlert: false };
  const careCount = lines.filter(needsCare).length;
  const count = plural(lines.length, "κομμάτι", "κομμάτια");
  return {
    text: careCount > 0 ? `${count} · ${careCount} θέλει προσοχή` : count,
    isAlert: careCount > 0,
  };
};

export const balanceSummary = (balance: E3Balance | null): BoxSummary =>
  balance === null
    ? { text: "Χωρίς Παροχή", isAlert: false }
    : {
        text: `${balance.left} από ${balance.total} υπόλοιπα`,
        isAlert: balance.left <= 0,
      };

interface RecordCounts {
  sheetVersion: number | null;
  historyCount: number;
  noteCount: number;
}

export const recordSummary = ({
  sheetVersion,
  historyCount,
  noteCount,
}: RecordCounts): string =>
  [
    sheetVersion === null ? "Χωρίς Δελτίο" : `Δελτίο έκδοση ${sheetVersion}`,
    historyCount > 0 ? plural(historyCount, "κίνηση", "κινήσεις") : null,
    noteCount > 0
      ? plural(noteCount, "σημείωση", "σημειώσεις")
      : "καμία σημείωση",
  ]
    .filter((part) => part !== null)
    .join(" · ");
