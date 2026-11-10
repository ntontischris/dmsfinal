import { SpacesMine } from "@/modules/filming";

export const metadata = { title: "Τα Γυρίσματά μου" };

// E6: τα ανοιχτά Γυρίσματα όπου είσαι στο Συνεργείο. Επιβεβαιώνεις ή δηλώνεις «δεν μπορώ».
export default async function MinePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { id } = await searchParams;
  return <SpacesMine id={typeof id === "string" ? id : undefined} />;
}
