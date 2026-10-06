import { personName } from "@/data/filming";
import type { SystemMessage } from "@/data/notifications";
import { fmtDate } from "@/screens/shared";

export const PREVIEW_VALUES: Readonly<Record<string, string>> = {
  παραλήπτης: "Μαρία Παπαδάκη",
  πελάτης: "Κυψέλη Καφέ",
  εταιρεία: "Studio Δείγμα",
  σύνδεσμος: "https://dms.example.com/l/k7x2p",
  προσκαλών: "Άννα",
  κωδικός: "482 913",
  πρόταση: "Π-2026-014",
  λήξη: "30/09/2026",
  αποστολέας: "Άννα",
};

export const fillVariables = (text: string): string =>
  text.replace(
    /\{([^}]+)\}/g,
    (whole, name: string) => PREVIEW_VALUES[name] ?? whole,
  );

export const stripVariable = (text: string, name: string): string =>
  text.split(`{${name}}`).join("");

export const whenEdited = (message: SystemMessage): string => {
  if (!message.isEdited || !message.editedAt) return "";
  const [date, time] = message.editedAt.split("T");
  const who = message.editedBy ? personName(message.editedBy) : "—";
  return `${who}, ${fmtDate(date)} ${time}`;
};
