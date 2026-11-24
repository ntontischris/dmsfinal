import type { ClientOption } from "./types";

// Τα στοιχεία ενός Πελάτη που χρειάζεται η επιλογή του στις φόρμες (από το sales_client_list).
export interface ClientSource {
  id: string;
  name: string;
  city: string;
  managerName: string | null;
  afm: string | null;
  contactEmail: string;
}

const keyOf = (name: string): string =>
  name.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("el").trim();

const clean = (value: string | null | undefined): string => (value ?? "").trim();

// Η τιμή ξεχωρίζει τον Πελάτη όταν υπάρχει και κανένας άλλος συνονόματος δεν την έχει.
const isUnique = (
  value: string,
  twins: readonly ClientSource[],
  read: (twin: ClientSource) => string | null | undefined,
): boolean =>
  value !== "" && twins.filter((twin) => clean(read(twin)) === value).length === 1;

const describedHintOf = (
  client: ClientSource,
  twins: readonly ClientSource[],
): string => {
  const afm = clean(client.afm);
  if (isUnique(afm, twins, (twin) => twin.afm)) return `ΑΦΜ ${afm}`;
  const city = clean(client.city);
  if (isUnique(city, twins, (twin) => twin.city)) return city;
  const email = clean(client.contactEmail);
  const extra = isUnique(email, twins, (twin) => twin.contactEmail)
    ? email
    : clean(client.managerName);
  return [city, extra].filter((part) => part !== "").join(" · ");
};

// Αν η περιγραφή βγει ίδια με άλλου συνονόματου (ή κενή), μένει ο σύντομος κωδικός, που είναι πάντα δικός του.
const hintOf = (
  client: ClientSource,
  twins: readonly ClientSource[],
): string => {
  const hint = describedHintOf(client, twins);
  const isShared = twins.some(
    (twin) => twin.id !== client.id && describedHintOf(twin, twins) === hint,
  );
  return hint === "" || isShared ? `κωδ. ${client.id.slice(0, 6)}` : hint;
};

// Πελάτες για τις φόρμες: όταν δύο έχουν το ίδιο όνομα, μια αχνή λέξη (ΑΦΜ, πόλη, email, μετά υπεύθυνος) τους ξεχωρίζει.
export const clientOptionsOf = (
  rows: readonly ClientSource[],
): ClientOption[] =>
  rows.map((client) => {
    const twins = rows.filter(
      (other) => keyOf(other.name) === keyOf(client.name),
    );
    return twins.length > 1
      ? { id: client.id, name: client.name, hint: hintOf(client, twins) }
      : { id: client.id, name: client.name };
  });
