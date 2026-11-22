import { SpacesExpenses } from "@/modules/costs";
import { WithMoneyDeck } from "@/modules/finance";

export const metadata = { title: "Έξοδα και Κόστος ώρας" };

// I6 Έξοδα και Κόστος ώρας (Χώροι).
export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
    <WithMoneyDeck active="I6">
      <SpacesExpenses
        month={typeof query.month === "string" ? query.month : undefined}
      />
    </WithMoneyDeck>
  );
}
