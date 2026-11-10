import { SpacesBlockedKinds } from "@/modules/calendar";
import { SpacesFilmingSettings } from "@/modules/filming";
import { SpacesGoogleRules } from "@/modules/google";

export const metadata = { title: "Ρυθμίσεις · Γυρίσματα" };

// Ρυθμίσεις › Γυρίσματα: οι Κανόνες του Γ7. Τη σελίδα τη βλέπει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις».
export default async function FilmingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ part?: string }>;
}) {
  const { part } = await searchParams;
  return (
    <SpacesFilmingSettings
      part={part}
      google={<SpacesGoogleRules />}
      calendar={<SpacesBlockedKinds />}
    />
  );
}
