// Ποια Παραγωγή προτείνεται χωρίς να τη διαλέξει κανείς (οδηγός «Απαντώ σε Πελάτες»): η ετικέτα της απάντησης και η
// Παραγωγή του νέου Παραδοτέου όταν το Αίτημα δεν έχει ετικέτα. Καθαρό αρχείο: το διαβάζει και ο browser.

interface TaggedMessage {
  authorKind: "team" | "client";
  productionId: string | null;
  request: { state: string } | null;
}

interface NamedProduction {
  id: string;
  title: string;
}

// Οι Παραγωγές με αλφαβητική σειρά, για κάθε λίστα επιλογής.
export const sortedProductions = <P extends NamedProduction>(
  productions: readonly P[],
): P[] => [...productions].sort((a, b) => a.title.localeCompare(b.title, "el"));

const lastProductionOf = (
  messages: readonly TaggedMessage[],
  allowed: ReadonlySet<string>,
  isWanted: (message: TaggedMessage) => boolean,
): string | null =>
  [...messages]
    .reverse()
    .find(
      (message) =>
        isWanted(message) &&
        message.productionId !== null &&
        allowed.has(message.productionId),
    )?.productionId ?? null;

// Η Παραγωγή του τελευταίου μηνύματος του Πελάτη με ετικέτα, αλλιώς του τελευταίου Αιτήματος με ετικέτα.
export const lastTagOf = (
  messages: readonly TaggedMessage[],
  productions: readonly NamedProduction[],
): string | null => {
  const allowed = new Set(productions.map((p) => p.id));
  return (
    lastProductionOf(messages, allowed, (m) => m.authorKind === "client") ??
    lastProductionOf(messages, allowed, (m) => m.request !== null)
  );
};

// Η Παραγωγή που προτείνεται για νέο Παραδοτέο από Αίτημα χωρίς ετικέτα: η τελευταία ετικέτα, αλλιώς η πρώτη αλφαβητικά.
export const suggestedProductionOf = (
  messages: readonly TaggedMessage[],
  productions: readonly NamedProduction[],
): string | null =>
  lastTagOf(messages, productions) ?? sortedProductions(productions)[0]?.id ?? null;

// Η ετικέτα της απάντησης: το φίλτρο της Συνομιλίας αν υπάρχει, αλλιώς η τελευταία ετικέτα· αλλιώς «χωρίς ετικέτα»
// όπου επιτρέπεται, ή η πρώτη Παραγωγή αλφαβητικά.
export const replyTagOf = (
  thread: {
    messages: readonly TaggedMessage[];
    productions: readonly NamedProduction[];
    canWriteUntagged: boolean;
  },
  wanted: string | undefined,
): string => {
  const { messages, productions, canWriteUntagged } = thread;
  if (wanted !== undefined && productions.some((p) => p.id === wanted))
    return wanted;
  const last = lastTagOf(messages, productions);
  if (last !== null) return last;
  return canWriteUntagged ? "" : (sortedProductions(productions)[0]?.id ?? "");
};
