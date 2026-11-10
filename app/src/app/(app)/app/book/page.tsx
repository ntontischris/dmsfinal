import { SpacesBooking, bookingSelectionSchema } from "@/modules/filming";

export const metadata = { title: "Κράτηση" };

// E5: ο Πελάτης κλείνει Γύρισμα ή μετατίθεται. Η επιλογή είναι στο URL· η βάση ελέγχει κάθε βήμα.
export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SpacesBooking selection={bookingSelectionSchema.parse(await searchParams)} />;
}
