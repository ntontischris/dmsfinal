import type { ClientOption } from "./types";

// Τα στοιχεία ενός Πελάτη που χρειάζεται η επιλογή του στις φόρμες (από το sales_client_list).
export interface ClientSource {
  id: string;
  name: string;
  city: string;
  managerName: string | null;
}

const keyOf = (name: string): string =>
  name.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("el").trim();

const hintOf = (
  client: ClientSource,
  twins: readonly ClientSource[],
): string => {
  const city = client.city.trim();
  const isCityEnough =
    city !== "" &&
    twins.filter((twin) => twin.city.trim() === city).length === 1;
  if (isCityEnough) return city;
  const parts = [city, client.managerName ?? ""].filter((part) => part !== "");
  return parts.length > 0 ? parts.join(" · ") : `κωδ. ${client.id.slice(0, 6)}`;
};

// Πελάτες για τις φόρμες: όταν δύο έχουν το ίδιο όνομα, μια αχνή λέξη (πόλη, μετά υπεύθυνος) τους ξεχωρίζει.
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
