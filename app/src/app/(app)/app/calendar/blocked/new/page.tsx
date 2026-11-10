import { SpacesNewBlockedTime } from "@/modules/calendar";

export const metadata = { title: "Νέος κλεισμένος χρόνος" };

// A6: νέος κλεισμένος χρόνος. Μόνο η ομάδα· το άτομο αλλάζει μόνο όσοι «Κλείνουν χρόνο άλλων».
export default async function NewBlockedTimePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SpacesNewBlockedTime query={await searchParams} />;
}
