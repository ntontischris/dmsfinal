import { SpacesNewRole } from "@/modules/access";

export const metadata = { title: "Νέος Ρόλος" };

// N4 Νέος Ρόλος, ομάδας ή πελάτη. Το είδος έρχεται από το κουμπί που πατήθηκε και δεν αλλάζει μετά.
export default async function NewRolePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; from?: string }>;
}) {
  const { kind, from } = await searchParams;
  return (
    <SpacesNewRole
      kind={typeof kind === "string" ? kind : undefined}
      from={typeof from === "string" ? from : undefined}
    />
  );
}
