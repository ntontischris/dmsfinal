import { SpacesExpenses } from "@/modules/costs";

export const metadata = { title: "Έξοδα και Κόστος ώρας" };

// I6 Έξοδα και Κόστος ώρας (Χώροι).
export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
    <SpacesExpenses
      month={typeof query.month === "string" ? query.month : undefined}
    />
  );
}
